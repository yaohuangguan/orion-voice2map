import dagre from 'dagre';
import { Node, Edge, Position } from 'reactflow';
import { MindMapNode, MindMapData } from '../types';

const nodeWidth = 220;
const nodeHeight = 80;

const CATEGORY_COLORS: Record<string, string> = {
  idea: '#e0e7ff',   // Indigo 100
  task: '#dcfce7',   // Green 100
  question: '#ffedd5', // Orange 100
  fact: '#f1f5f9',   // Slate 100
};

// Helper to flatten the recursive JSON into Nodes and Edges
const flattenTree = (
  node: MindMapNode, 
  nodes: Node[] = [], 
  edges: Edge[] = [], 
  parentId: string | null = null
) => {
  
  const bgColor = node.style?.backgroundColor || CATEGORY_COLORS[node.category || 'idea'] || '#ffffff';

  const currentNode: Node = {
    id: node.id,
    position: { x: 0, y: 0 }, 
    type: 'custom', 
    data: { 
      label: node.label, 
      details: node.details,
      category: node.category,
      links: node.links,
      style: { ...node.style, backgroundColor: bgColor },
      createdAt: node.createdAt
    },
  };

  nodes.push(currentNode);

  if (parentId) {
    edges.push({
      id: `e${parentId}-${node.id}`,
      source: parentId,
      target: node.id,
      type: 'smoothstep',
      animated: true,
      style: { stroke: '#94a3b8', strokeWidth: 2 },
    });
  }

  if (node.children) {
    node.children.forEach((child) => {
      flattenTree(child, nodes, edges, node.id);
    });
  }

  return { nodes, edges };
};

// --- Radial Layout Algorithm ---
const applyRadialLayout = (nodes: Node[], edges: Edge[], rootId: string) => {
    const root = nodes.find(n => n.id === rootId);
    if (!root) return nodes;

    const adjacency: Record<string, string[]> = {};
    edges.forEach(e => {
        if (!adjacency[e.source]) adjacency[e.source] = [];
        adjacency[e.source].push(e.target);
    });

    const setPosition = (nodeId: string, depth: number, startAngle: number, endAngle: number) => {
        const node = nodes.find(n => n.id === nodeId);
        if (!node) return;

        const radius = depth * 350; // Radius increment
        // Center the angle
        const angle = (startAngle + endAngle) / 2;
        
        // Root at 0,0
        if (depth === 0) {
            node.position = { x: 0, y: 0 };
        } else {
            node.position = {
                x: radius * Math.cos(angle) - nodeWidth / 2,
                y: radius * Math.sin(angle) - nodeHeight / 2
            };
        }

        const children = adjacency[nodeId] || [];
        if (children.length > 0) {
            const angleStep = (endAngle - startAngle) / children.length;
            children.forEach((childId, index) => {
                setPosition(
                    childId, 
                    depth + 1, 
                    startAngle + index * angleStep, 
                    startAngle + (index + 1) * angleStep
                );
            });
        }
    };

    setPosition(rootId, 0, 0, 2 * Math.PI);
    return nodes;
};


export const getLayoutedElements = (
  data: MindMapData,
  layoutType: 'LR' | 'TB' | 'Radial' = 'LR'
): { nodes: Node[]; edges: Edge[] } => {
  const { nodes, edges } = flattenTree(data.root);
  const rootId = data.root.id;

  if (layoutType === 'Radial') {
      const radialNodes = applyRadialLayout(nodes, edges, rootId);
      return { nodes: radialNodes, edges };
  }

  // Dagre Layout (Hierarchical)
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({ rankdir: layoutType });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const isHorizontal = layoutType === 'LR';

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      targetPosition: isHorizontal ? Position.Left : Position.Top,
      sourcePosition: isHorizontal ? Position.Right : Position.Bottom,
      position: {
        x: nodeWithPosition.x - nodeWidth / 2,
        y: nodeWithPosition.y - nodeHeight / 2,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
};

export const reconstructTreeFromFlow = (nodes: Node[], edges: Edge[], originalRootId: string): MindMapData | null => {
  const nodeMap = new Map<string, MindMapNode>();
  
  // Create all MindMapNodes
  nodes.forEach(n => {
    nodeMap.set(n.id, {
      id: n.id,
      label: n.data.label,
      details: n.data.details,
      category: n.data.category,
      links: n.data.links,
      style: n.data.style,
      createdAt: n.data.createdAt,
      children: []
    });
  });

  const root = nodeMap.get(originalRootId);
  // Fallback if original root deleted: find node with no incoming edges
  if (!root) {
      const targets = new Set(edges.map(e => e.target));
      const potentialRoot = nodes.find(n => !targets.has(n.id));
      if (potentialRoot) {
          return { root: nodeMap.get(potentialRoot.id)! };
      }
      return null;
  }

  // Build hierarchy
  edges.forEach(e => {
    const parent = nodeMap.get(e.source);
    const child = nodeMap.get(e.target);
    if (parent && child) {
       parent.children = parent.children || [];
       parent.children.push(child);
    }
  });

  return { root };
};
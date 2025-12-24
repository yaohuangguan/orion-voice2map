export interface MindMapData {
  root: MindMapNode;
}

export type NodeCategory = 'idea' | 'task' | 'question' | 'fact';

export interface MindMapNode {
  id: string; // unique identifier
  label: string;
  details?: string;
  category?: NodeCategory;
  children?: MindMapNode[];
  links?: { title: string; url: string }[];
  // Visual & Metadata
  style?: {
    backgroundColor?: string;
    shape?: 'rounded' | 'square' | 'circle';
    fontSize?: 'sm' | 'md' | 'lg';
    fontFamily?: 'sans' | 'serif' | 'mono';
  };
  createdAt?: number;
}

// Flattened node for React Flow
export interface FlowNode {
  id: string;
  position: { x: number; y: number };
  data: { 
    label: string; 
    details?: string;
    category?: NodeCategory;
    links?: { title: string; url: string }[];
    style?: { 
        backgroundColor?: string; 
        shape?: 'rounded' | 'square' | 'circle';
        fontSize?: 'sm' | 'md' | 'lg';
        fontFamily?: 'sans' | 'serif' | 'mono';
    };
    createdAt?: number;
    // Callbacks for interactivity
    onDataChange?: (id: string, patch: any) => void;
    onAddChild?: (parentId: string) => void;
    onDelete?: (id: string) => void;
    onEnrichSearch?: (id: string, label: string) => Promise<void>;
    onEnrichMaps?: (id: string, label: string) => Promise<void>;
  };
  type?: string;
}

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  type?: string;
  animated?: boolean;
}

export type ProcessingStatus = 'idle' | 'recording' | 'processing' | 'success' | 'error';

export interface HistoryItem {
  id: string;
  timestamp: number;
  data: MindMapData;
  previewLabel: string;
}
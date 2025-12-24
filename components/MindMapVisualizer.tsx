import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
  ConnectionLineType,
  ReactFlowProvider,
  useReactFlow,
  Panel,
} from 'reactflow';
import CustomNode from './CustomNode';
import { getLayoutedElements, reconstructTreeFromFlow } from '../utils/graphLayout';
import { MindMapData, FlowNode } from '../types';
import { enrichWithGoogleSearch, enrichWithGoogleMaps } from '../services/geminiService';
import { Language, translations } from '../utils/translations';
import { downloadImage, generateMarkdown, generateMermaid, downloadFile } from '../utils/fileUtils';

interface MindMapVisualizerProps {
  data: MindMapData | null;
  language: Language;
  onExportImage: () => void;
  onExportMarkdown: () => void;
  onSave: (data: MindMapData) => void;
}

export const MindMapVisualizer: React.FC<MindMapVisualizerProps> = (props) => {
    return (
        <ReactFlowProvider>
            <MindMapVisualizerContent {...props} />
        </ReactFlowProvider>
    )
}

const MindMapVisualizerContent: React.FC<MindMapVisualizerProps> = ({ data, language, onSave }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [layoutType, setLayoutType] = useState<'LR' | 'TB' | 'Radial'>('LR');
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  const { fitView } = useReactFlow();
  const flowWrapperRef = useRef<HTMLDivElement>(null);
  
  // Keep track of the root ID to help reconstruction
  const rootIdRef = useRef<string | null>(data?.root.id || null);

  const t = translations[language];

  // --- Unified Handler ---
  
  const onDataChange = useCallback((id: string, patch: Partial<FlowNode['data']>) => {
    setNodes((nds) => nds.map((n) => {
      if (n.id === id) {
        return { 
          ...n, 
          data: { ...n.data, ...patch } 
        };
      }
      return n;
    }));
  }, [setNodes]);

  const onDeleteNode = useCallback((id: string) => {
      setNodes((nds) => nds.filter((n) => n.id !== id));
      setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
  }, [setNodes, setEdges]);

  const onEnrichSearch = useCallback(async (id: string, label: string) => {
      try {
          const result = await enrichWithGoogleSearch(label);
          setNodes((nds) => nds.map((n) => {
              if (n.id === id) {
                  const existingDetails = n.data.details ? n.data.details + '\n\n' : '';
                  const existingLinks = n.data.links || [];
                  return { 
                      ...n, 
                      data: { 
                          ...n.data, 
                          details: existingDetails + "[Search]: " + result.text,
                          links: [...existingLinks, ...result.links]
                      } 
                  };
              }
              return n;
          }));
      } catch (error) {
          alert("Failed to fetch search data. Please check API Key configuration.");
      }
  }, [setNodes]);

  const onEnrichMaps = useCallback(async (id: string, label: string) => {
    try {
        let location = undefined;
        try {
            const pos = await new Promise<GeolocationPosition>((resolve, reject) => 
                navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 })
            );
            location = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        } catch (e) {
            console.warn("Geolocation denied or failed, searching globally.");
        }

        const result = await enrichWithGoogleMaps(label, location);
        setNodes((nds) => nds.map((n) => {
            if (n.id === id) {
                const existingDetails = n.data.details ? n.data.details + '\n\n' : '';
                const existingLinks = n.data.links || [];
                return { 
                    ...n, 
                    data: { 
                        ...n.data, 
                        details: existingDetails + "[Maps]: " + result.text,
                        links: [...existingLinks, ...result.links]
                    } 
                };
            }
            return n;
        }));
    } catch (error) {
        alert("Failed to fetch maps data.");
    }
}, [setNodes]);

  const onAddChild = useCallback((parentId: string) => {
      const newId = crypto.randomUUID();
      const newNode: Node = {
          id: newId,
          type: 'custom',
          position: { x: 0, y: 0 },
          data: { 
              label: 'New Idea', 
              category: 'idea',
              createdAt: Date.now(),
          }
      };

      const newEdge: Edge = {
          id: `e${parentId}-${newId}`,
          source: parentId,
          target: newId,
          type: 'smoothstep',
          animated: true,
          style: { stroke: '#94a3b8', strokeWidth: 2 },
      };

      setNodes((nds) => [...nds, newNode]);
      setEdges((eds) => [...eds, newEdge]);
  }, [setNodes, setEdges]);


  // Helper to attach handlers
  const attachHandlers = useCallback((nodesList: Node[]) => {
      return nodesList.map(n => ({
        ...n,
        data: {
          ...n.data,
          language,
          onDataChange: onDataChange, // Unified update handler
          onDelete: onDeleteNode,
          onAddChild: onAddChild,
          onEnrichSearch: onEnrichSearch,
          onEnrichMaps: onEnrichMaps
        }
      }));
  }, [language, onDataChange, onDeleteNode, onAddChild, onEnrichSearch, onEnrichMaps]);


  // Load Data & Layout
  useEffect(() => {
    if (data) {
      rootIdRef.current = data.root.id;
      const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(data, layoutType);
      
      // Attach handlers IMMEDIATELY to avoid race conditions
      setNodes(attachHandlers(layoutedNodes));
      setEdges(layoutedEdges);
      setTimeout(() => fitView(), 100);
    }
  }, [data, layoutType, attachHandlers, setNodes, setEdges, fitView]);

  // Keep handlers up to date when dependencies change (e.g. language)
  useEffect(() => {
    setNodes(nds => attachHandlers(nds));
  }, [attachHandlers, setNodes]);


  // Search Effect
  useEffect(() => {
    setNodes((nds) =>
      nds.map((node) => {
        if (!searchTerm) return { ...node, selected: false, style: { ...node.style, opacity: 1 } };
        const match = node.data.label.toLowerCase().includes(searchTerm.toLowerCase()) || node.data.details?.toLowerCase().includes(searchTerm.toLowerCase());
        return { ...node, style: { ...node.style, opacity: match ? 1 : 0.2 }, selected: match };
      })
    );
  }, [searchTerm, setNodes]);

  const nodeTypes = useMemo(() => ({ custom: CustomNode }), []); 

  // --- Export & Save Logic using Current State ---
  const getCurrentData = () => {
      if (!rootIdRef.current) return data;
      return reconstructTreeFromFlow(nodes, edges, rootIdRef.current) || data;
  };

  const handleSave = () => {
      const currentData = getCurrentData();
      if (currentData) {
          onSave(currentData);
          setShowSaveSuccess(true);
          setTimeout(() => setShowSaveSuccess(false), 2000);
      }
  }

  const handleExportImage = () => {
    if (flowWrapperRef.current) {
        const flowElement = flowWrapperRef.current.querySelector('.react-flow__viewport') as HTMLElement;
        const target = flowElement || flowWrapperRef.current;
        downloadImage(target, `mindmap_${Date.now()}.png`);
    }
  };

  const handleExportMermaid = () => {
      const currentData = getCurrentData();
      if (currentData) {
          const code = generateMermaid(currentData);
          downloadFile(code, `mindmap_${Date.now()}.mmd`, 'text/plain');
      }
  };

  const handleExportMarkdown = () => {
      const currentData = getCurrentData();
      if (currentData) {
          const md = generateMarkdown(currentData);
          downloadFile(md, `mindmap_${Date.now()}.md`, 'text/markdown');
      }
  };
  
  const handleExportJSON = () => {
      const currentData = getCurrentData();
      if (currentData) {
          downloadFile(JSON.stringify(currentData, null, 2), `mindmap_${Date.now()}.json`, 'application/json');
      }
  };

  if (!data) return null;

  return (
    <div className="w-full h-full bg-slate-50 relative group" ref={flowWrapperRef}>
      
      {/* Search Bar */}
      <Panel position="top-left" className="m-4 mt-20 z-10 w-64 pointer-events-auto">
         <div className="relative">
            <input 
                type="text" 
                placeholder={t.search_placeholder}
                className="w-full pl-9 pr-4 py-2 bg-white/90 backdrop-blur border border-slate-200 rounded-full shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
            <svg className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
         </div>
      </Panel>

      {/* Controls Container */}
      <Panel position="top-right" className="m-4 mt-20 z-10 flex flex-col items-end gap-2 pointer-events-auto">
        
        {/* Layout Switcher */}
        <div className="bg-white/90 backdrop-blur rounded-lg shadow-sm border border-slate-200 p-1 flex text-xs">
            <button 
                onClick={() => setLayoutType('LR')} 
                className={`px-2 py-1.5 rounded-md ${layoutType === 'LR' ? 'bg-indigo-100 text-indigo-700 font-medium' : 'text-slate-600 hover:bg-slate-50'}`}
                title={t.layout_lr}
            >
                H
            </button>
            <button 
                onClick={() => setLayoutType('TB')} 
                className={`px-2 py-1.5 rounded-md ${layoutType === 'TB' ? 'bg-indigo-100 text-indigo-700 font-medium' : 'text-slate-600 hover:bg-slate-50'}`}
                title={t.layout_tb}
            >
                V
            </button>
            <button 
                onClick={() => setLayoutType('Radial')} 
                className={`px-2 py-1.5 rounded-md ${layoutType === 'Radial' ? 'bg-indigo-100 text-indigo-700 font-medium' : 'text-slate-600 hover:bg-slate-50'}`}
                title={t.layout_radial}
            >
                R
            </button>
        </div>

        {/* Action Buttons Row */}
        <div className="flex gap-2">
            
            {/* Save Button */}
            <button 
                onClick={handleSave}
                className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 text-white rounded-lg shadow-md hover:bg-indigo-700 transition-colors"
                title={t.save}
            >
                {showSaveSuccess ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
                )}
                <span className="text-xs font-medium hidden sm:inline">{showSaveSuccess ? t.saved : t.save}</span>
            </button>

            {/* Quick Mermaid Export Button */}
            <button 
                onClick={handleExportMermaid}
                className="flex items-center justify-center p-2 bg-white/90 backdrop-blur rounded-lg shadow-sm border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-indigo-600 transition-colors"
                title={t.export_code}
            >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
            </button>

            {/* Export Dropdown */}
            <div className="relative group">
                <button className="flex items-center gap-2 px-3 py-2 bg-white/90 backdrop-blur rounded-lg shadow-sm border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    {t.export}
                </button>
                <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-xl border border-slate-100 py-1 hidden group-hover:block z-20">
                    <button onClick={handleExportImage} className="w-full text-left px-4 py-2 text-xs hover:bg-slate-50 text-slate-700">{t.export_img}</button>
                    <button onClick={handleExportMermaid} className="w-full text-left px-4 py-2 text-xs hover:bg-slate-50 text-slate-700">{t.export_code}</button>
                    <button onClick={handleExportMarkdown} className="w-full text-left px-4 py-2 text-xs hover:bg-slate-50 text-slate-700">{t.export_md}</button>
                    <button onClick={handleExportJSON} className="w-full text-left px-4 py-2 text-xs hover:bg-slate-50 text-slate-700">{t.export_json}</button>
                </div>
            </div>
        </div>
      </Panel>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        className="bg-slate-50"
        minZoom={0.1}
        maxZoom={4}
      >
        <Background color="#cbd5e1" gap={16} size={1} />
        <Controls className="bg-white border-slate-200 shadow-md text-slate-700" />
        <MiniMap nodeColor={(n) => n.data.style?.backgroundColor || '#cbd5e1'} className="border border-slate-200 shadow-sm rounded-lg overflow-hidden" />
      </ReactFlow>
    </div>
  );
};
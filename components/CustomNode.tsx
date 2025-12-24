import React, { memo, useState, useRef, useEffect } from 'react';
import { Handle, Position, NodeProps, NodeToolbar } from 'reactflow';
import { translations, Language } from '../utils/translations';

const colors = [
  '#e0e7ff', // Indigo
  '#dcfce7', // Green
  '#ffedd5', // Orange
  '#fee2e2', // Red
  '#f1f5f9', // Slate
];

const shapes = [
  { id: 'rounded', label: 'Rounded' },
  { id: 'square', label: 'Square' },
  { id: 'circle', label: 'Circle' },
];

const fontSizes = [
  { id: 'sm', label: 'A-', sizeClass: 'text-xs' },
  { id: 'md', label: 'A', sizeClass: 'text-sm' },
  { id: 'lg', label: 'A+', sizeClass: 'text-base' },
];

const fontFamilies = [
  { id: 'sans', label: 'Sans', class: 'font-sans' },
  { id: 'serif', label: 'Serif', class: 'font-serif' },
  { id: 'mono', label: 'Mono', class: 'font-mono' },
];

const CustomNode = ({ data, selected, id }: NodeProps) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editLabel, setEditLabel] = useState(data.label);
  const [editDetails, setEditDetails] = useState(data.details || '');
  
  const lang: Language = data.language || 'zh';
  const t = translations[lang];
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync edit state when external data changes
  useEffect(() => {
    setEditLabel(data.label);
    setEditDetails(data.details || '');
  }, [data.label, data.details]);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
        inputRef.current.focus();
    }
  }, [isEditing]);

  const updateStyle = (patch: any) => {
     data.onDataChange?.(id, { style: { ...data.style, ...patch } });
  };

  const handleEditSubmit = () => {
    setIsEditing(false);
    data.onDataChange?.(id, { label: editLabel, details: editDetails });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        handleEditSubmit();
    }
  };

  const handleAddChild = () => data.onAddChild?.(id);
  const handleDelete = () => { if (confirm(t.delete + "?")) data.onDelete?.(id); };

  const handleEnrichSearch = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    try { await data.onEnrichSearch?.(id, data.label); } 
    finally { setIsProcessing(false); }
  };

  const handleEnrichMaps = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    try { await data.onEnrichMaps?.(id, data.label); }
    finally { setIsProcessing(false); }
  };

  // Styles calculation
  const shapeStyle = data.style?.shape === 'circle' ? 'rounded-full aspect-square flex flex-col justify-center items-center p-6' : 
                     data.style?.shape === 'square' ? 'rounded-none' : 
                     'rounded-xl';
  
  const fontSizeClass = data.style?.fontSize === 'lg' ? 'text-lg' :
                        data.style?.fontSize === 'sm' ? 'text-xs' : 'text-sm';
  
  const fontFamilyClass = data.style?.fontFamily === 'serif' ? 'font-serif' :
                          data.style?.fontFamily === 'mono' ? 'font-mono' : 'font-sans';

  return (
    <>
      <NodeToolbar isVisible={selected} position={Position.Top} className="flex flex-col gap-2 bg-white p-2.5 rounded-xl shadow-xl border border-slate-200 min-w-[220px]">
        
        {/* Row 1: Colors */}
        <div className="flex justify-between items-center">
            <div className="flex gap-1.5">
                {colors.map((c) => (
                    <button
                    key={c}
                    className={`w-5 h-5 rounded-full border border-slate-200 transition-transform ${data.style?.backgroundColor === c ? 'scale-110 ring-2 ring-indigo-300' : 'hover:scale-110'}`}
                    style={{ backgroundColor: c }}
                    onClick={() => updateStyle({ backgroundColor: c })}
                    title="Change Color"
                    />
                ))}
            </div>
        </div>

        <div className="h-[1px] bg-slate-100 w-full"></div>

        {/* Row 2: Typography & Shape */}
        <div className="flex justify-between items-center gap-2">
             <div className="flex gap-1 bg-slate-50 p-1 rounded-lg">
                {fontSizes.map(f => (
                    <button key={f.id} onClick={() => updateStyle({ fontSize: f.id })} className={`w-6 h-6 text-[10px] font-bold rounded ${data.style?.fontSize === f.id ? 'bg-white shadow text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}>
                        {f.label}
                    </button>
                ))}
            </div>
            <div className="w-[1px] h-6 bg-slate-100"></div>
            <div className="flex gap-1">
                 {shapes.map(s => (
                    <button key={s.id} onClick={() => updateStyle({ shape: s.id })} className={`w-6 h-6 text-[10px] rounded flex items-center justify-center ${data.style?.shape === s.id ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' : 'text-slate-400 hover:bg-slate-50'}`} title={s.label}>
                       {s.id === 'circle' ? '○' : s.id === 'square' ? '□' : '▢'}
                    </button>
                 ))}
            </div>
        </div>
        
        {/* Row 3: Font Family */}
        <div className="flex gap-1 bg-slate-50 p-1 rounded-lg w-full">
            {fontFamilies.map(f => (
                <button key={f.id} onClick={() => updateStyle({ fontFamily: f.id })} className={`flex-1 py-1 text-[10px] rounded ${data.style?.fontFamily === f.id ? 'bg-white shadow text-indigo-600' : 'text-slate-400'} ${f.class}`}>
                    {f.label}
                </button>
            ))}
        </div>

        <div className="h-[1px] bg-slate-100 w-full"></div>

        {/* Row 4: Actions */}
        <div className="flex justify-between items-center">
            <div className="flex gap-1">
                <button onClick={() => setIsEditing(true)} className="p-1.5 hover:bg-slate-100 rounded text-slate-600 transition-colors" title={t.edit_label}>
                   <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                </button>
                <button onClick={handleAddChild} className="p-1.5 hover:bg-slate-100 rounded text-slate-600 transition-colors" title={t.add_child}>
                   <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                </button>
                <button onClick={handleDelete} className="p-1.5 hover:bg-red-50 rounded text-red-500 transition-colors" title={t.delete}>
                   <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
            </div>
            
            <div className="flex gap-1 border-l border-slate-200 pl-2">
                <button onClick={handleEnrichSearch} disabled={isProcessing} className={`p-1.5 hover:bg-blue-50 rounded text-blue-500 transition-colors ${isProcessing ? 'animate-spin' : ''}`} title={t.search_google}>
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .533 5.333.533 12S5.867 24 12.48 24c3.44 0 6.013-1.133 8.053-3.24 2.107-2.187 2.753-5.24 2.753-7.76 0-.76-.053-1.467-.173-2.08H12.48z"/></svg>
                </button>
                <button onClick={handleEnrichMaps} disabled={isProcessing} className={`p-1.5 hover:bg-green-50 rounded text-green-500 transition-colors ${isProcessing ? 'animate-spin' : ''}`} title={t.search_maps}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                </button>
            </div>
        </div>

      </NodeToolbar>

      <div 
        className={`px-4 py-3 shadow-md border border-slate-300 min-w-[150px] max-w-[250px] text-center transition-all duration-300 relative group/node ${shapeStyle} ${fontFamilyClass}`}
        style={{ 
          backgroundColor: data.style?.backgroundColor || '#fff',
        }}
        onDoubleClick={(e) => {
            e.stopPropagation();
            setIsEditing(true);
        }}
      >
        <Handle type="target" position={Position.Left} className="!bg-slate-400 !w-2 !h-2" />
        
        {isEditing ? (
            <div className="flex flex-col gap-2 w-full min-w-[140px]">
                <input 
                    ref={inputRef}
                    value={editLabel}
                    onChange={(e) => setEditLabel(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="w-full text-center font-semibold text-slate-800 bg-white/50 border border-indigo-200 rounded px-1 outline-none focus:ring-2 focus:ring-indigo-400 text-sm"
                    placeholder="Label"
                />
                <textarea 
                    value={editDetails}
                    onChange={(e) => setEditDetails(e.target.value)}
                    className="w-full text-center text-xs text-slate-600 bg-white/50 border border-indigo-200 rounded px-1 outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
                    rows={2}
                    placeholder="Details..."
                    onKeyDown={(e) => { if(e.key === 'Enter' && e.shiftKey) handleEditSubmit(); }}
                />
                <button onMouseDown={handleEditSubmit} className="bg-indigo-500 text-white text-[10px] py-1 rounded hover:bg-indigo-600">Save</button>
            </div>
        ) : (
            <>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 opacity-70">
                {data.category || 'Node'}
                </div>
                
                <div className={`font-semibold text-slate-800 break-words leading-tight ${fontSizeClass}`}>
                {data.label}
                </div>
                
                {data.details && (
                <div className="mt-1.5 pt-1.5 border-t border-slate-400/20 text-xs text-slate-600 italic">
                    {data.details}
                </div>
                )}
            </>
        )}

        {/* External Links */}
        {data.links && data.links.length > 0 && (
            <div className="mt-2 flex flex-col gap-1 w-full items-center">
                {data.links.map((link: any, idx: number) => (
                    <a key={idx} href={link.url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-600 hover:underline bg-white/50 px-1 rounded flex items-center justify-center gap-1 max-w-full">
                        <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                        <span className="truncate">{link.title}</span>
                    </a>
                ))}
            </div>
        )}

        {!isEditing && data.createdAt && (
            <div className={`absolute right-0 text-[9px] text-slate-400 w-full text-right pr-2 transition-opacity opacity-0 group-hover/node:opacity-100 ${data.style?.shape === 'circle' ? 'bottom-2' : '-bottom-4'}`}>
                {new Date(data.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
            </div>
        )}

        <Handle type="source" position={Position.Right} className="!bg-slate-400 !w-2 !h-2" />
      </div>
    </>
  );
};

export default memo(CustomNode);
import React, { useEffect, useState } from 'react';
import { HistoryItem, MindMapData } from '../types';
import { getSavedMaps, deleteMap } from '../utils/fileUtils';
import { translations } from '../utils/translations';

interface HistoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onRestore: (data: MindMapData) => void;
}

export const HistoryPanel: React.FC<HistoryPanelProps> = ({ isOpen, onClose, onRestore }) => {
  const [maps, setMaps] = useState<HistoryItem[]>([]);

  const loadMaps = () => {
    setMaps(getSavedMaps());
  };

  useEffect(() => {
    if (isOpen) {
      loadMaps();
    }
  }, [isOpen]);

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this map?")) {
      deleteMap(id);
      loadMaps();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="absolute top-0 right-0 h-full w-80 bg-white/95 backdrop-blur-md shadow-2xl z-30 flex flex-col border-l border-slate-200 transform transition-transform duration-300">
      
      <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-indigo-50/50">
        <h2 className="font-semibold text-slate-800 flex items-center gap-2">
          <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
          My Maps
        </h2>
        <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded-full text-slate-500 transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {maps.length === 0 ? (
          <div className="text-center text-slate-400 mt-10 text-sm">
            No maps saved yet.<br/>Generate a map to get started.
          </div>
        ) : (
          maps.map((item) => (
            <div 
              key={item.id}
              onClick={() => { onRestore(item.data); onClose(); }}
              className="p-3 bg-white rounded-xl border border-slate-100 shadow-sm hover:shadow-md hover:border-indigo-200 cursor-pointer transition-all group relative"
            >
              <div className="flex justify-between items-start mb-1 pr-6">
                <span className="font-medium text-slate-800 text-sm truncate w-full">{item.previewLabel}</span>
              </div>
              <div className="text-xs text-slate-400 font-mono">
                {new Date(item.timestamp).toLocaleString()}
              </div>
              
              <button 
                onClick={(e) => handleDelete(e, item.id)}
                className="absolute top-2 right-2 p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                title="Delete Map"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </button>
            </div>
          ))
        )}
      </div>

      <div className="p-4 bg-slate-50 border-t border-slate-200 text-xs text-slate-400 text-center">
        Maps are stored locally in your browser.
      </div>
    </div>
  );
};
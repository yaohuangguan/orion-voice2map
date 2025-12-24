import { MindMapData, MindMapNode, HistoryItem } from '../types';
import { toPng } from 'html-to-image';

const HISTORY_KEY = 'voicemap_history';

// --- Export Logic ---

export const generateMarkdown = (data: MindMapData): string => {
  let md = `# ${data.root.label}\n\n`;
  if (data.root.details) md += `> ${data.root.details}\n\n`;

  const processNode = (node: MindMapNode, depth: number) => {
    // Indent using tabs or 2 spaces. Notion prefers standard markdown lists.
    const indent = '\t'.repeat(depth);
    let line = `${indent}- ${node.label}`;
    if (node.details) line += ` _(${node.details})_`;
    md += `${line}\n`;

    if (node.children) {
      node.children.forEach(child => processNode(child, depth + 1));
    }
  };

  if (data.root.children) {
    data.root.children.forEach(child => processNode(child, 0));
  }
  return md;
};

export const generateMermaid = (data: MindMapData): string => {
  let mermaid = `mindmap\n  root((${data.root.label}))\n`;
  
  const processNode = (node: MindMapNode, depth: number) => {
    const indent = '    '.repeat(depth);
    // Simple sanitization for mermaid text
    const label = node.label.replace(/[()]/g, ''); 
    mermaid += `${indent}${label}\n`;
    
    if (node.children) {
      node.children.forEach(child => processNode(child, depth + 1));
    }
  };

  if (data.root.children) {
    data.root.children.forEach(child => processNode(child, 1));
  }
  return mermaid;
};

export const downloadFile = (content: string, filename: string, type: string) => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const downloadImage = async (element: HTMLElement, filename: string) => {
  try {
    const dataUrl = await toPng(element, { backgroundColor: '#f8fafc' });
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } catch (err) {
    console.error("Failed to export image", err);
    alert("Could not export image. Browser security settings might restrict this action.");
  }
};

// --- Storage Logic (My Maps) ---

export const saveMap = (data: MindMapData) => {
  try {
    const historyJSON = localStorage.getItem(HISTORY_KEY);
    const history: HistoryItem[] = historyJSON ? JSON.parse(historyJSON) : [];
    
    // Check if this map (by root ID) already exists
    const existingIndex = history.findIndex(item => item.data.root.id === data.root.id);

    if (existingIndex >= 0) {
      // Update existing
      history[existingIndex] = {
        ...history[existingIndex],
        timestamp: Date.now(),
        data: data,
        previewLabel: data.root.label || 'Untitled Map'
      };
    } else {
      // Create new
      const newItem: HistoryItem = {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        data,
        previewLabel: data.root.label || 'Untitled Map'
      };
      // Add to front
      history.unshift(newItem);
    }

    // Keep last 50 items
    const newHistory = history.slice(0, 50);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
  } catch (e) {
    console.error("Failed to save map", e);
  }
};

export const deleteMap = (id: string) => {
  try {
    const historyJSON = localStorage.getItem(HISTORY_KEY);
    if (!historyJSON) return;
    const history: HistoryItem[] = JSON.parse(historyJSON);
    const newHistory = history.filter(item => item.id !== id);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
  } catch (e) {
    console.error("Failed to delete map", e);
  }
};

export const getSavedMaps = (): HistoryItem[] => {
  try {
    const historyJSON = localStorage.getItem(HISTORY_KEY);
    return historyJSON ? JSON.parse(historyJSON) : [];
  } catch (e) {
    return [];
  }
};

// --- Share / URL Logic ---

// Simple encoding for URL sharing (Base64 with UTF-8 support)
export const encodeStateToUrl = (data: MindMapData): string => {
  const json = JSON.stringify(data);
  // specific utf8 handling for base64
  return btoa(encodeURIComponent(json).replace(/%([0-9A-F]{2})/g,
      (match, p1) => String.fromCharCode(parseInt(p1, 16))
  ));
};

export const decodeStateFromUrl = (hash: string): MindMapData | null => {
  try {
    const cleanHash = hash.replace(/^#/, '');
    if (!cleanHash) return null;
    
    const json = decodeURIComponent(Array.prototype.map.call(atob(cleanHash), (c: string) => {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));

    return JSON.parse(json);
  } catch (e) {
    console.error("Failed to decode URL state", e);
    return null;
  }
};
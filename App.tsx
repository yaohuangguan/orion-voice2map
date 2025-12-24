import React, { useState, useEffect } from 'react';
import { AudioRecorder } from './components/AudioRecorder';
import { MindMapVisualizer } from './components/MindMapVisualizer';
import { HistoryPanel } from './components/HistoryPanel';
import { AuthModal } from './components/AuthModal';
import { generateMindMapFromAudio } from './services/geminiService';
import { MindMapData, ProcessingStatus } from './types';
import { saveMap, encodeStateToUrl, decodeStateFromUrl } from './utils/fileUtils';
import { translations, Language } from './utils/translations';
import { User, AuthResponse, logoutUser } from './services/authService';

const USAGE_KEY = 'voicemap_usage_count';
const TOKEN_KEY = 'voicemap_token';
const USER_KEY = 'voicemap_user';

export default function App() {
  const [status, setStatus] = useState<ProcessingStatus>('idle');
  const [mapData, setMapData] = useState<MindMapData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isSharing, setIsSharing] = useState(false); 
  const [language, setLanguage] = useState<Language>('zh');
  
  // Auth State
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [authForced, setAuthForced] = useState(false);
  const [usageCount, setUsageCount] = useState(0);

  const t = translations[language];

  // Initialization
  useEffect(() => {
    // 1. Load URL State
    const hash = window.location.hash;
    if (hash) {
      const decoded = decodeStateFromUrl(hash);
      if (decoded) {
        setMapData(decoded);
        setStatus('success');
      }
    }

    // 2. Load Auth State
    const storedToken = localStorage.getItem(TOKEN_KEY);
    const storedUser = localStorage.getItem(USER_KEY);
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }

    // 3. Load Usage Count
    const count = parseInt(localStorage.getItem(USAGE_KEY) || '0', 10);
    setUsageCount(count);

  }, []);

  const handleAuthSuccess = (response: AuthResponse) => {
    setUser(response.user);
    setToken(response.token);
    localStorage.setItem(TOKEN_KEY, response.token);
    localStorage.setItem(USER_KEY, JSON.stringify(response.user));
  };

  const handleLogout = () => {
    if (token) logoutUser(token);
    setUser(null);
    setToken(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  };

  const handleRecordingComplete = async (blob: Blob) => {
    // Check Limits
    if (!user && usageCount >= 1) {
      setAuthMode('signup');
      setAuthForced(true); // User must interact with modal
      setIsAuthOpen(true);
      setError(t.limit_reached_desc);
      return;
    }

    setStatus('processing');
    setError(null);
    try {
      const data = await generateMindMapFromAudio(blob);
      setMapData(data);
      setStatus('success');
      saveMap(data); // Auto-save new maps
      
      // Increment Usage if Guest
      if (!user) {
        const newCount = usageCount + 1;
        setUsageCount(newCount);
        localStorage.setItem(USAGE_KEY, newCount.toString());
      }

      try {
        window.history.pushState("", document.title, window.location.pathname + window.location.search);
      } catch (e) {
        window.location.hash = "";
      }
    } catch (err: any) {
      console.error(err);
      setStatus('error');
      setError(err.message || 'Failed to generate mind map. Please try again.');
    }
  };

  const handleSaveMap = (data: MindMapData) => {
      saveMap(data);
  };

  const handleRestore = (data: MindMapData) => {
    setMapData(data);
    setStatus('success');
  };

  const handleShare = async () => {
    if (!mapData) return;
    const hash = encodeStateToUrl(mapData);
    const baseUrl = window.location.href.split('#')[0];
    const url = `${baseUrl}#${hash}`;
    try {
      await navigator.clipboard.writeText(url);
      window.location.hash = hash;
      setIsSharing(true);
      setTimeout(() => setIsSharing(false), 2000);
    } catch (e) {
      console.error("Failed to copy", e);
      alert("Could not copy automatically. The URL has been updated, please copy it from the address bar.");
      window.location.hash = hash;
    }
  };

  const reset = () => {
    setStatus('idle');
    setMapData(null);
    setError(null);
    try {
      window.history.pushState("", document.title, window.location.pathname + window.location.search);
    } catch (e) {
       window.location.hash = "";
    }
  };

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'en' ? 'zh' : 'en');
  };

  return (
    <div className="flex h-screen w-screen bg-slate-50 overflow-hidden relative font-sans">
      
      {/* Background Gradients */}
      <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-indigo-50 to-transparent pointer-events-none z-0"></div>

      {/* --- Main Content --- */}
      <main className="flex-1 h-full z-0 relative flex flex-col">
        
        {/* Top Bar / Header */}
        <div className="absolute top-0 left-0 w-full z-20 p-4 flex justify-between items-start pointer-events-none">
            {/* Left: Brand (Only show in map view to avoid cluttering landing) */}
            <div className={`pointer-events-auto transition-opacity duration-500 ${mapData ? 'opacity-100' : 'opacity-0'}`}>
                <h1 className="text-xl font-bold text-slate-800 tracking-tight">{t.app_title}</h1>
            </div>

            {/* Right: Controls */}
            <div className="flex flex-col items-end gap-2 pointer-events-auto">
               <div className="flex items-center gap-2">
                    {/* Live Indicator */}
                    {mapData && (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-green-100 text-green-700 rounded-full text-xs font-medium animate-pulse border border-green-200 shadow-sm hidden md:flex">
                            <span className="w-2 h-2 rounded-full bg-green-500"></span>
                            {t.live_session}
                        </div>
                    )}
                    
                    {/* Language Toggle */}
                    <button 
                       onClick={toggleLanguage}
                       className="px-3 py-1.5 bg-white text-slate-600 rounded-full shadow-sm hover:bg-slate-50 border border-slate-200 text-xs font-medium"
                    >
                       {language === 'en' ? '中文' : 'English'}
                    </button>

                    {/* History Button */}
                    <button 
                        onClick={() => setIsHistoryOpen(true)}
                        className="p-2 bg-white text-slate-600 rounded-full shadow-sm hover:bg-slate-50 border border-slate-200"
                        title={t.history}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                    </button>

                    {/* User / Auth Button */}
                    {user ? (
                        <div className="relative group">
                             <button className="flex items-center gap-2 px-3 py-1.5 bg-white text-indigo-600 rounded-full shadow-sm border border-indigo-100 text-xs font-medium hover:bg-indigo-50">
                                <span>{user.displayName}</span>
                             </button>
                             <div className="absolute right-0 top-full mt-1 w-32 bg-white rounded-xl shadow-xl border border-slate-100 py-1 hidden group-hover:block z-50">
                                 <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-xs hover:bg-slate-50 text-red-600">{t.logout}</button>
                             </div>
                        </div>
                    ) : (
                         <button 
                           onClick={() => {
                               setAuthMode('login');
                               setAuthForced(false);
                               setIsAuthOpen(true);
                           }}
                           className="px-4 py-1.5 bg-indigo-600 text-white rounded-full shadow-md hover:bg-indigo-700 text-xs font-medium transition-colors"
                        >
                           {t.login} / {t.signup}
                        </button>
                    )}
               </div>
               
               {/* Guest Limit Indicator */}
               {!user && (
                 <div className="text-[10px] text-slate-400 bg-white/50 backdrop-blur px-2 py-0.5 rounded-full border border-slate-100">
                    {usageCount >= 1 ? t.guest_usage : t.guest_usage_avail}
                 </div>
               )}
            </div>
        </div>

        {/* Visualizer (Only visible when mapData exists) */}
        {mapData ? (
            <MindMapVisualizer 
                data={mapData} 
                language={language}
                onExportImage={() => {}} // Handled inside Visualizer via ref
                onExportMarkdown={() => {}}
                onSave={handleSaveMap}
            />
        ) : (
            // --- LANDING PAGE ---
            <div className="flex-1 flex flex-col items-center justify-center overflow-y-auto z-10 p-6">
                <div className="max-w-4xl w-full flex flex-col items-center gap-12 pt-10">
                    
                    {/* Hero Section */}
                    <div className="text-center space-y-6">
                        <div className="inline-block p-3 bg-indigo-100 rounded-2xl mb-2">
                             <svg className="w-10 h-10 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                        </div>
                        <h1 className="text-5xl md:text-6xl font-extrabold text-slate-800 tracking-tight leading-tight">
                            {t.app_title}
                        </h1>
                        <p className="text-lg md:text-xl text-slate-500 max-w-2xl mx-auto leading-relaxed">
                            {t.subtitle}
                        </p>
                        
                        {/* Auth Promo Banner */}
                        {!user && (
                            <div className="inline-block cursor-pointer hover:scale-105 transition-transform" onClick={() => { setAuthMode('signup'); setIsAuthOpen(true); }}>
                                <span className="px-3 py-1 bg-gradient-to-r from-orange-400 to-pink-500 text-white text-xs font-bold rounded-full shadow-lg">
                                    ✨ {t.limit_banner}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Action Area */}
                    <div className="w-full max-w-md bg-white rounded-3xl p-8 shadow-xl border border-indigo-50 flex flex-col items-center">
                         <AudioRecorder 
                            onRecordingComplete={handleRecordingComplete} 
                            status={status} 
                            language={language}
                        />
                         {error && (
                            <div className="mt-4 w-full px-4 py-2 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100 flex items-center justify-center animate-pulse">
                               <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                               {error}
                            </div>
                         )}
                    </div>

                    {/* How it works Grid */}
                    <div className="w-full grid md:grid-cols-3 gap-6">
                        <div className="bg-white/80 p-6 rounded-2xl border border-slate-200 hover:shadow-lg transition-shadow">
                            <div className="text-2xl mb-3">🎤</div>
                            <h3 className="font-bold text-slate-800 mb-2">{t.step_1_title}</h3>
                            <p className="text-slate-500 text-sm leading-relaxed">{t.step_1_desc}</p>
                        </div>
                        <div className="bg-white/80 p-6 rounded-2xl border border-slate-200 hover:shadow-lg transition-shadow">
                             <div className="text-2xl mb-3">🧠</div>
                            <h3 className="font-bold text-slate-800 mb-2">{t.step_2_title}</h3>
                            <p className="text-slate-500 text-sm leading-relaxed">{t.step_2_desc}</p>
                        </div>
                        <div className="bg-white/80 p-6 rounded-2xl border border-slate-200 hover:shadow-lg transition-shadow">
                             <div className="text-2xl mb-3">🗺️</div>
                            <h3 className="font-bold text-slate-800 mb-2">{t.step_3_title}</h3>
                            <p className="text-slate-500 text-sm leading-relaxed">{t.step_3_desc}</p>
                        </div>
                    </div>

                     {/* Use Cases */}
                     <div className="w-full flex flex-wrap justify-center gap-3">
                         {[t.case_1, t.case_2, t.case_3, t.case_4].map((txt, i) => (
                             <span key={i} className="px-4 py-2 bg-slate-100 rounded-full text-sm text-slate-600 border border-slate-200 font-medium">
                                 {txt}
                             </span>
                         ))}
                     </div>

                </div>
            </div>
        )}
      </main>

      <HistoryPanel 
        isOpen={isHistoryOpen} 
        onClose={() => setIsHistoryOpen(false)} 
        onRestore={handleRestore} 
      />

      <AuthModal 
        isOpen={isAuthOpen}
        onClose={() => { if(!authForced) setIsAuthOpen(false); }}
        onSuccess={handleAuthSuccess}
        language={language}
        initialMode={authMode}
        forced={authForced}
      />

      {/* Floating Action Bar (Only visible when map exists) */}
      {mapData && (
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-20">
             <div className="glass-panel rounded-2xl p-2 shadow-2xl shadow-indigo-100/50 flex items-center gap-2">
                 {/* New Map / Reset */}
                 <button 
                  onClick={reset}
                  className="flex flex-col items-center justify-center p-2 rounded-xl hover:bg-slate-100/50 text-slate-600 transition-colors w-16"
                  title={t.new_map}
                >
                   <div className="p-2 rounded-full bg-slate-100 text-slate-500 mb-1">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                   </div>
                   <span className="text-[10px] font-medium truncate w-full text-center">{t.new_map}</span>
                </button>
                
                {/* Divider */}
                <div className="w-[1px] h-10 bg-slate-200 mx-1"></div>

                 {/* Audio Recorder Mini */}
                 <div className="scale-75 origin-bottom">
                    <AudioRecorder 
                        onRecordingComplete={handleRecordingComplete} 
                        status={status} 
                        language={language}
                        mini={true}
                    />
                 </div>

                 {/* Divider */}
                 <div className="w-[1px] h-10 bg-slate-200 mx-1"></div>

                 {/* Share */}
                 <button 
                  onClick={handleShare}
                  className="flex flex-col items-center justify-center p-2 rounded-xl hover:bg-slate-100/50 text-slate-600 transition-colors w-16"
                  title={t.share}
                >
                   <div className={`p-2 rounded-full ${isSharing ? 'bg-green-100 text-green-600' : 'bg-indigo-50 text-indigo-600'} mb-1 transition-colors`}>
                      {isSharing ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                      )}
                   </div>
                   <span className="text-[10px] font-medium truncate w-full text-center">{isSharing ? t.copied : t.invite}</span>
                </button>
             </div>
          </div>
      )}

    </div>
  );
}
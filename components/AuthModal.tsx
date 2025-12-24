import React, { useState } from 'react';
import { loginUser, registerUser, AuthResponse } from '../services/authService';
import { translations, Language } from '../utils/translations';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (auth: AuthResponse) => void;
  language: Language;
  initialMode?: 'login' | 'signup';
  forced?: boolean; // If true, cannot close without action (used for limits)
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess, language, initialMode = 'login', forced = false }) => {
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const t = translations[language];

  // Form States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [passwordConf, setPasswordConf] = useState('');
  const [phone, setPhone] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      let response;
      if (mode === 'signup') {
        response = await registerUser({
          displayName,
          email,
          password,
          passwordConf,
          phone
        });
      } else {
        response = await loginUser({
          email, // Backend accepts email or phone here
          password
        });
      }
      onSuccess(response);
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setMode(mode === 'login' ? 'signup' : 'login');
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" 
        onClick={!forced ? onClose : undefined}
      ></div>

      {/* Modal Content */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 bg-indigo-50 border-b border-indigo-100 flex justify-between items-center">
            <div>
                <h2 className="text-xl font-bold text-slate-800">{mode === 'login' ? t.login : t.signup}</h2>
                <p className="text-xs text-slate-500 mt-1">{t.auth_desc}</p>
            </div>
            {!forced && (
                <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            )}
        </div>

        {/* Form */}
        <div className="p-6">
            {error && (
                <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100 flex items-start">
                    <svg className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <span>{error}</span>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                
                {mode === 'signup' && (
                    <div>
                        <input 
                            type="text" 
                            required 
                            placeholder={t.name_placeholder}
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                        />
                    </div>
                )}

                <div>
                    <input 
                        type="text" 
                        required 
                        placeholder={t.email_placeholder}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                    />
                </div>
                
                {mode === 'signup' && (
                    <div>
                        <input 
                            type="text" 
                            placeholder={t.phone_optional}
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                        />
                    </div>
                )}

                <div>
                    <input 
                        type="password" 
                        required 
                        placeholder={t.password_placeholder}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                    />
                </div>

                {mode === 'signup' && (
                    <div>
                        <input 
                            type="password" 
                            required 
                            placeholder={t.confirm_password}
                            value={passwordConf}
                            onChange={(e) => setPasswordConf(e.target.value)}
                            className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                        />
                    </div>
                )}

                <button 
                    type="submit" 
                    disabled={loading}
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium shadow-md hover:shadow-lg transition-all disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center"
                >
                    {loading ? (
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    ) : (
                        t.submit
                    )}
                </button>
            </form>

            <div className="mt-4 text-center">
                <button 
                    onClick={toggleMode}
                    className="text-sm text-indigo-600 hover:text-indigo-800 hover:underline"
                >
                    {mode === 'login' ? t.switching_to_signup : t.switching_to_login}
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

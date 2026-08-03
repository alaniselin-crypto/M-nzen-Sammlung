import React, { useState } from 'react';
import { 
  X, 
  Mail, 
  Lock, 
  LogIn, 
  UserPlus, 
  Cloud, 
  CloudCheck, 
  LogOut, 
  AlertCircle, 
  CheckCircle2,
  ShieldCheck,
  Smartphone,
  Globe
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSyncLocalData?: () => void;
  hasLocalCoinsCount?: number;
}

export const AuthModal: React.FC<AuthModalProps> = ({ 
  isOpen, 
  onClose,
  onSyncLocalData,
  hasLocalCoinsCount = 0
}) => {
  const { user, loginWithEmail, registerWithEmail, loginWithGoogle, logout } = useAuth();
  
  const [isRegisterMode, setIsRegisterMode] = useState<boolean>(true);
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!email || !password) {
      setErrorMsg('Bitte geben Sie Ihre E-Mail-Adresse und ein Passwort ein.');
      return;
    }

    if (isRegisterMode && password !== confirmPassword) {
      setErrorMsg('Die eingegebenen Passwörter stimmen nicht überein.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Das Passwort muss mindestens 6 Zeichen lang sein.');
      return;
    }

    setIsLoading(true);

    try {
      if (isRegisterMode) {
        await registerWithEmail(email, password);
        setSuccessMsg('Registrierung erfolgreich! Ihre Daten werden jetzt im Netzwerk synchronisiert.');
      } else {
        await loginWithEmail(email, password);
        setSuccessMsg('Erfolgreich angemeldet!');
      }

      if (onSyncLocalData) {
        onSyncLocalData();
      }

      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      console.error('Auth error:', err);
      let msg = 'Ein Fehler ist aufgetreten.';
      if (err.code === 'auth/email-already-in-use') {
        msg = 'Diese E-Mail-Adresse wird bereits verwendet. Bitte melden Sie sich an.';
      } else if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        msg = 'Ungültige E-Mail-Adresse oder Passwort.';
      } else if (err.code === 'auth/user-not-found') {
        msg = 'Kein Konto mit dieser E-Mail gefunden. Bitte registrieren Sie sich zuerst.';
      } else if (err.code === 'auth/invalid-email') {
        msg = 'Ungültiges E-Mail-Format.';
      }
      setErrorMsg(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    setIsLoading(true);
    try {
      await loginWithGoogle();
      setSuccessMsg('Erfolgreich mit Google angemeldet!');
      if (onSyncLocalData) {
        onSyncLocalData();
      }
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      console.error('Google Auth Error:', err);
      setErrorMsg('Google-Anmeldung fehlgeschlagen oder abgebrochen.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    setIsLoading(true);
    try {
      await logout();
      setSuccessMsg('Erfolgreich abgemeldet.');
      setTimeout(() => {
        onClose();
      }, 800);
    } catch (err) {
      setErrorMsg('Abmeldung fehlgeschlagen.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#181a22] border border-amber-500/30 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col text-slate-100">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#121318]">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-serif font-bold text-slate-100">
                {user ? 'Cloud-Konto & Synchronisation' : (isRegisterMode ? 'Kostenlos Registrieren' : 'Anmelden')}
              </h2>
              <p className="text-xs text-slate-400">
                {user ? 'Ihre Münzsammlung ist sicher im Netz gespeichert.' : 'Nutzen Sie Numisma auf allen Geräten & im Restaurant.'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[80vh]">

          {/* User Already Logged In */}
          {user ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 space-y-2">
                <div className="flex items-center space-x-2 font-semibold text-sm">
                  <CloudCheck className="w-5 h-5 text-emerald-400 shrink-0" />
                  <span>Cloud-Konto aktiv & verbunden</span>
                </div>
                <p className="text-xs text-emerald-200/80 leading-relaxed">
                  Angemeldet als: <strong className="text-emerald-100 font-mono">{user.email || user.displayName || user.uid}</strong>
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 space-y-2">
                <div className="flex items-center space-x-2 font-medium text-amber-300">
                  <Smartphone className="w-4 h-4 shrink-0" />
                  <span>Zugriff von überall (Restaurant, Handy, Laptop)</span>
                </div>
                <p className="text-slate-400 leading-relaxed">
                  Ihre Münzen & Banknoten werden in Echtzeit in der gesicherten Firebase Cloud-Datenbank gespeichert. Ändern Sie Daten auf dem Smartphone, sind sie direkt auf allen Geräten verfügbar.
                </p>
              </div>

              {hasLocalCoinsCount > 0 && onSyncLocalData && (
                <button
                  onClick={onSyncLocalData}
                  className="w-full py-2.5 px-4 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold flex items-center justify-center space-x-2 transition-colors cursor-pointer"
                >
                  <Cloud className="w-4 h-4" />
                  <span>Lokale Daten ({hasLocalCoinsCount} Stück) jetzt in Cloud übertragen</span>
                </button>
              )}

              <button
                onClick={handleLogout}
                disabled={isLoading}
                className="w-full py-2.5 px-4 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold flex items-center justify-center space-x-2 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Abmelden</span>
              </button>
            </div>
          ) : (
            /* Login / Register Form */
            <div className="space-y-4">

              {/* Mode Toggle Tabs */}
              <div className="flex rounded-xl bg-slate-900 p-1 border border-slate-800">
                <button
                  type="button"
                  onClick={() => { setIsRegisterMode(true); setErrorMsg(''); }}
                  className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center space-x-1.5 ${
                    isRegisterMode 
                      ? 'bg-amber-500 text-slate-950 shadow-md' 
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Registrieren (Neu)</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setIsRegisterMode(false); setErrorMsg(''); }}
                  className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center space-x-1.5 ${
                    !isRegisterMode 
                      ? 'bg-amber-500 text-slate-950 shadow-md' 
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Anmelden</span>
                </button>
              </div>

              {/* Information Banner */}
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200/90 leading-relaxed flex items-start space-x-2.5">
                <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <strong>100% Kostenlos:</strong> Erstellen Sie in wenigen Sekunden ein Passwort-Konto. Ihre Daten stehen Ihnen direkt im Restaurant, auf Bussen oder Unterwegs auf Ihrem Smartphone zur Verfügung!
                </div>
              </div>

              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {successMsg && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    E-Mail Adresse
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="ihre.email@beispiel.ch"
                      required
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Passwort
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      minLength={6}
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
                    />
                  </div>
                </div>

                {isRegisterMode && (
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Passwort bestätigen
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        minLength={6}
                        className="w-full pl-9 pr-3 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
                      />
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-bold shadow-lg shadow-amber-950/40 flex items-center justify-center space-x-2 transition-all cursor-pointer mt-2"
                >
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  ) : isRegisterMode ? (
                    <>
                      <UserPlus className="w-4 h-4" />
                      <span>Jetzt Kostenlos Registrieren</span>
                    </>
                  ) : (
                    <>
                      <LogIn className="w-4 h-4" />
                      <span>Anmelden</span>
                    </>
                  )}
                </button>
              </form>

              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-slate-800"></div>
                <span className="flex-shrink mx-3 text-[10px] uppercase font-semibold text-slate-500">
                  Oder
                </span>
                <div className="flex-grow border-t border-slate-800"></div>
              </div>

              {/* Google Sign In */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700/80 text-xs font-semibold flex items-center justify-center space-x-2 transition-colors cursor-pointer"
              >
                <Globe className="w-4 h-4 text-blue-400" />
                <span>Mit Google-Konto anmelden</span>
              </button>

            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-[#121318] text-center text-[11px] text-slate-500">
          Numisma Cloud-Sync • Gesichert via Google Firebase Firestore
        </div>

      </div>
    </div>
  );
};

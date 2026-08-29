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
  Globe,
  Eye,
  EyeOff,
  Sparkles,
  Trash2
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
  const { user, loginWithEmail, registerWithEmail, resetPassword, loginWithGoogle, logout, deleteAccount } = useAuth();
  
  const [isRegisterMode, setIsRegisterMode] = useState<boolean>(true);
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [canAutoRegister, setCanAutoRegister] = useState<boolean>(false);
  const [canAutoLogin, setCanAutoLogin] = useState<boolean>(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState<boolean>(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState<string>('');
  const [deletePassword, setDeletePassword] = useState<string>('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setCanAutoRegister(false);
    setCanAutoLogin(false);

    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail || !password) {
      setErrorMsg('Bitte geben Sie Ihre E-Mail-Adresse und ein Passwort ein.');
      return;
    }

    const effectiveConfirm = (isRegisterMode && !confirmPassword) ? password : confirmPassword;

    if (isRegisterMode && password !== effectiveConfirm) {
      setErrorMsg('Die eingegebenen Passwörter stimmen nicht überein. Tippen Sie auf das Augensymbol, um das Passwort anzuzeigen.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Das Passwort muss mindestens 6 Zeichen lang sein.');
      return;
    }

    setIsLoading(true);

    try {
      if (isRegisterMode) {
        await registerWithEmail(trimmedEmail, password);
        setSuccessMsg('Registrierung erfolgreich! Ihre Münzsammlung ist jetzt sicher in der Cloud.');
      } else {
        await loginWithEmail(trimmedEmail, password);
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
        msg = 'Diese E-Mail-Adresse ist bereits registriert!';
        setCanAutoLogin(true);
      } else if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        if (isRegisterMode) {
          msg = 'Registrierung fehlgeschlagen. Bitte überprüfen Sie Ihre Eingaben.';
        } else {
          msg = 'Anmeldung fehlgeschlagen. Falsches Passwort oder das Konto existiert noch nicht.';
          setCanAutoRegister(true);
        }
      } else if (err.code === 'auth/user-not-found') {
        msg = 'Kein Konto mit dieser E-Mail gefunden.';
        setCanAutoRegister(true);
      } else if (err.code === 'auth/invalid-email') {
        msg = 'Ungültiges E-Mail-Format.';
      } else if (err.code === 'auth/operation-not-allowed') {
        msg = 'E-Mail/Passwort-Anmeldung ist im Firebase-Backend deaktiviert.';
      } else if (err.code === 'auth/weak-password') {
        msg = 'Das Passwort ist zu schwach (mindestens 6 Zeichen).';
      } else if (err.code === 'auth/too-many-requests') {
        msg = 'Zu viele Versuche. Bitte warten Sie kurz.';
      } else {
        msg = `Fehler: ${err.code || err.message || 'Unbekannt'}.`;
      }
      setErrorMsg(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickRegister = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    setIsLoading(true);
    const trimmedEmail = email.trim().toLowerCase();
    try {
      await registerWithEmail(trimmedEmail, password);
      setSuccessMsg('Konto erfolgreich erstellt! Sie sind nun angemeldet.');
      if (onSyncLocalData) onSyncLocalData();
      setTimeout(() => onClose(), 1200);
    } catch (err: any) {
      setErrorMsg(`Registrierung fehlgeschlagen: ${err.message || 'Unbekannter Fehler'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickLogin = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    setIsLoading(true);
    const trimmedEmail = email.trim().toLowerCase();
    try {
      await loginWithEmail(trimmedEmail, password);
      setSuccessMsg('Erfolgreich angemeldet!');
      if (onSyncLocalData) onSyncLocalData();
      setTimeout(() => onClose(), 1200);
    } catch (err: any) {
      setErrorMsg(`Anmeldung fehlgeschlagen: Falsches Passwort für ${trimmedEmail}.`);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      setErrorMsg('Bitte geben Sie zuerst Ihre E-Mail-Adresse oben ein.');
      return;
    }
    setIsLoading(true);
    try {
      await resetPassword(trimmedEmail);
      setSuccessMsg(`Passwort-Zurücksetzungs-E-Mail wurde an ${trimmedEmail} gesendet! Bitte prüfen Sie auch Ihren Spam-Ordner.`);
    } catch (err: any) {
      console.error('Password reset error:', err);
      setErrorMsg('Fehler beim Senden der Rücksetzungs-E-Mail: ' + (err.message || 'Unbekannt'));
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
      const errorCode = typeof err?.code === 'string' ? err.code : 'unknown';
      const errorMessage = typeof err?.message === 'string' ? err.message : 'Unbekannter Fehler';
      console.error('Google Auth Error:', errorCode, errorMessage);
      setErrorMsg(`Google-Anmeldung fehlgeschlagen (${errorCode}): ${errorMessage}`);
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

  const handleDeleteAccount = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    setIsLoading(true);
    try {
      await deleteAccount(deletePassword || undefined);
      setShowDeleteConfirmation(false);
      setDeleteConfirmation('');
      setDeletePassword('');
      setSuccessMsg('Ihr Konto und alle zugehörigen Cloud-Daten wurden dauerhaft gelöscht.');
      setTimeout(() => onClose(), 1600);
    } catch (err: any) {
      const code = typeof err?.code === 'string' ? err.code : err?.message;
      if (code === 'auth/password-required') {
        setErrorMsg('Bitte geben Sie zur Bestätigung Ihr aktuelles Passwort ein.');
      } else if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        setErrorMsg('Die erneute Anmeldung ist fehlgeschlagen. Bitte prüfen Sie Ihr Passwort und versuchen Sie es erneut.');
      } else if (code === 'auth/requires-recent-login') {
        setErrorMsg('Aus Sicherheitsgründen ist eine erneute Anmeldung erforderlich. Bitte melden Sie sich ab, wieder an und versuchen Sie die Kontolöschung erneut.');
      } else if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        setErrorMsg('Die erneute Anmeldung wurde abgebrochen. Ihr Konto wurde nicht gelöscht.');
      } else {
        setErrorMsg('Das Konto konnte nicht vollständig gelöscht werden. Bitte versuchen Sie es erneut.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#181a22] border border-amber-500/30 rounded-2xl w-full max-w-md max-h-[calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-2rem)] shadow-2xl overflow-hidden flex flex-col text-slate-100">
        
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
                {user ? 'Ihre Münzsammlung ist sicher im Netz gespeichert.' : 'Nutzen Sie inumis.app auf allen Ihren Geräten.'}
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
        <div className="p-6 space-y-5 overflow-y-auto flex-1 min-h-0">

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

              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <button
                onClick={handleLogout}
                disabled={isLoading}
                className="w-full py-2.5 px-4 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold flex items-center justify-center space-x-2 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Abmelden</span>
              </button>

              {!showDeleteConfirmation ? (
                <button
                  type="button"
                  onClick={() => {
                    setErrorMsg('');
                    setShowDeleteConfirmation(true);
                  }}
                  disabled={isLoading}
                  className="w-full py-2.5 px-4 rounded-xl bg-rose-950/40 hover:bg-rose-950/60 text-rose-300 border border-rose-800/60 text-xs font-bold flex items-center justify-center space-x-2 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Konto löschen</span>
                </button>
              ) : (
                <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-700/60 space-y-3">
                  <div className="text-xs text-rose-200 leading-relaxed">
                    <strong>Diese Aktion ist endgültig.</strong> Ihr Benutzerkonto sowie alle Münzen, Banknoten, Einstellungen und Synchronisationsdaten in der Cloud werden dauerhaft gelöscht. Geben Sie zur Bestätigung <strong>LÖSCHEN</strong> ein.
                  </div>
                  <input
                    type="text"
                    value={deleteConfirmation}
                    onChange={(event) => setDeleteConfirmation(event.target.value)}
                    placeholder="LÖSCHEN"
                    autoComplete="off"
                    className="w-full px-3 py-2.5 bg-slate-950 border border-rose-800/70 rounded-xl text-base sm:text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-rose-500"
                  />
                  {user.providerIds.includes('password') && (
                    <input
                      type="password"
                      value={deletePassword}
                      onChange={(event) => setDeletePassword(event.target.value)}
                      placeholder="Aktuelles Passwort"
                      autoComplete="current-password"
                      className="w-full px-3 py-2.5 bg-slate-950 border border-rose-800/70 rounded-xl text-base sm:text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-rose-500"
                    />
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowDeleteConfirmation(false);
                        setDeleteConfirmation('');
                        setDeletePassword('');
                      }}
                      disabled={isLoading}
                      className="py-2.5 px-3 rounded-xl bg-slate-800 text-slate-200 border border-slate-700 text-xs font-semibold"
                    >
                      Abbrechen
                    </button>
                    <button
                      type="button"
                      onClick={handleDeleteAccount}
                      disabled={isLoading || deleteConfirmation !== 'LÖSCHEN' || (user.providerIds.includes('password') && !deletePassword)}
                      className="py-2.5 px-3 rounded-xl bg-rose-600 disabled:bg-rose-950 disabled:text-rose-500 text-white border border-rose-500 text-xs font-bold"
                    >
                      Endgültig löschen
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Login / Register Form */
            <div className="space-y-4">

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

              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-slate-800"></div>
                <span className="flex-shrink mx-3 text-[10px] uppercase font-semibold text-slate-500">
                  Oder
                </span>
                <div className="flex-grow border-t border-slate-800"></div>
              </div>

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
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs space-y-2">
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                  {canAutoRegister && (
                    <button
                      type="button"
                      onClick={handleQuickRegister}
                      disabled={isLoading}
                      className="w-full mt-1.5 py-2 px-3 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-semibold text-xs flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Konto jetzt neu registrieren mit diesen Daten</span>
                    </button>
                  )}
                  {canAutoLogin && (
                    <button
                      type="button"
                      onClick={handleQuickLogin}
                      disabled={isLoading}
                      className="w-full mt-1.5 py-2 px-3 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-semibold text-xs flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
                    >
                      <LogIn className="w-3.5 h-3.5" />
                      <span>Mit diesem Passwort anmelden</span>
                    </button>
                  )}
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
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-medium text-slate-300">
                      Passwort
                    </label>
                    {!isRegisterMode && (
                      <button
                        type="button"
                        onClick={handlePasswordReset}
                        disabled={isLoading}
                        className="text-[11px] text-amber-400 hover:text-amber-300 underline transition-colors cursor-pointer"
                      >
                        Passwort vergessen?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      minLength={6}
                      className="w-full pl-9 pr-10 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 p-1 text-slate-400 hover:text-slate-200 transition-colors"
                      title={showPassword ? 'Passwort verbergen' : 'Passwort anzeigen'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {isRegisterMode && (
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Passwort bestätigen (optional)
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="•••••••• (oder leer lassen)"
                        minLength={6}
                        className="w-full pl-9 pr-10 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-2.5 p-1 text-slate-400 hover:text-slate-200 transition-colors"
                        title={showConfirmPassword ? 'Passwort verbergen' : 'Passwort anzeigen'}
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
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

            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-[#121318] text-center text-[11px] text-slate-500">
          inumis.app Cloud-Sync • Gesichert via Google Firebase Firestore
        </div>

      </div>
    </div>
  );
};

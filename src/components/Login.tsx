import React, { useState, useEffect } from 'react';
import { User, AppSettings } from '../types';
import { 
  Lock as LockIcon, 
  AlertCircle, 
  ChevronDown, 
  User as UserIcon, 
  Sparkles,
  Wifi,
  WifiOff,
  Activity,
  Info,
  RefreshCw,
  CheckCircle2,
  X
} from 'lucide-react';

interface LoginProps {
  onLogin: (u: User) => void;
  users: User[];
  settings?: AppSettings;
  serverOnline?: boolean;
}

export default function Login({ onLogin, users, settings, serverOnline }: LoginProps) {
  const [username, setUsername] = useState('');
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  
  // Welcome Modal states
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [validatedUser, setValidatedUser] = useState<User | null>(null);

  // Network Troubleshoot states
  const [isBrowserOnline, setIsBrowserOnline] = useState(navigator.onLine);
  const [showTroubleshoot, setShowTroubleshoot] = useState(false);
  const [isPinging, setIsPinging] = useState(false);
  const [pingStatus, setPingStatus] = useState<'SUCCESS' | 'FAILED' | null>(null);

  useEffect(() => {
    const handleOnline = () => setIsBrowserOnline(true);
    const handleOffline = () => setIsBrowserOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleTestPing = async () => {
    setIsPinging(true);
    setPingStatus(null);
    try {
      const res = await fetch(`/api/health?t=${Date.now()}`);
      if (res.ok) {
        setPingStatus('SUCCESS');
      } else {
        setPingStatus('FAILED');
      }
    } catch {
      setPingStatus('FAILED');
    } finally {
      setIsPinging(false);
    }
  };

  const isWelcomeEnabled = settings?.welcomeMessageEnabled ?? true;
  const hasWelcomeText = settings && settings.welcomeMessageText !== undefined 
    ? settings.welcomeMessageText.trim().length > 0 
    : true; // Default fallback is active if settings is not initialized yet

  const finalWelcomeText = settings && settings.welcomeMessageText !== undefined
    ? settings.welcomeMessageText.trim()
    : 'QUE CETTE JOURNEE SOIT COURONNER DE SUCCES CE MESSAGE EST EDITER PAR L ADMIN';

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError('');

    if (!username.trim()) {
      setError("Saisissez votre nom d'utilisateur.");
      return;
    }
    if (pin.length !== 6) {
      setError("Le code PIN doit faire 6 chiffres.");
      return;
    }

    // Match search case-insensitive to be friendly, but precise
    const user = users.find(
      u => u.name.toLowerCase().trim() === username.toLowerCase().trim() && u.pin === pin
    );

    if (user) {
      if (user.isActive === false) {
        setError("Ce compte a été suspendu.");
        setPin('');
        return;
      }

      setValidatedUser(user);
      
      // If welcome message is checked and not blanked/cleared
      if (isWelcomeEnabled && hasWelcomeText) {
        setShowWelcomeModal(true);
      } else {
        onLogin(user);
      }
    } else {
      setError("Nom d'utilisateur ou PIN incorrect.");
      setPin('');
    }
  };

  const handleWelcomeConfirm = () => {
    if (validatedUser) {
      onLogin(validatedUser);
    }
    setShowWelcomeModal(false);
  };

  const addNumber = (num: string) => {
    if (pin.length < 6) {
      const newPin = pin + num;
      setPin(newPin);
      setError('');
      
      if (newPin.length === 6) {
        // Automatically check if username is filled
        if (username.trim()) {
          setTimeout(() => {
            const user = users.find(
              u => u.name.toLowerCase().trim() === username.toLowerCase().trim() && u.pin === newPin
            );
            if (user) {
              if (user.isActive === false) {
                setError("Compte Suspendu.");
                setPin('');
                return;
              }
              setValidatedUser(user);
              if (isWelcomeEnabled && hasWelcomeText) {
                setShowWelcomeModal(true);
              } else {
                onLogin(user);
              }
            } else {
              setError("Nom d'utilisateur ou PIN incorrect.");
              setPin('');
            }
          }, 150);
        }
      }
    }
  };

  const removeNumber = () => {
    setPin(prev => prev.slice(0, -1));
    setError('');
  };

  // Filter active users to list in suggestion dropdown
  const activeUsers = users.filter(u => u.isActive !== false);

  const displayOnline = serverOnline ?? isBrowserOnline;

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col items-center justify-start p-4 md:p-8 font-sans tracking-tight focus:outline-none overflow-y-auto py-12 md:py-24 relative">
      
      {/* Sleek, ultra-compact luxury card */}
      <div className="w-full max-w-sm bg-white border border-neutral-200/80 overflow-hidden flex-shrink-0 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.1)]">
        
        <div className="bg-white text-black pt-8 md:pt-12 pb-6 md:pb-10 px-6 md:px-8 text-center border-b border-neutral-100 flex flex-col items-center">
           {settings?.logoUrl ? (
             <img src={settings.logoUrl} alt="Logo" className="max-h-24 md:max-h-32 w-auto object-contain mb-4" referrerPolicy="no-referrer" />
           ) : null}
           
           {/* Store Name - Hidden completely if explicitly erased by admin to "" */}
           {settings?.storeName !== "" && (
             <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tighter break-all text-neutral-900 leading-none">
               {settings?.storeName ?? 'ZARA'}
             </h1>
           )}

           {/* Store Address - Hidden completely if explicitly erased by admin to "" */}
           {settings?.storeAddress !== "" && (
             <p className="font-semibold text-[8px] md:text-[9px] tracking-[0.25em] text-neutral-400 uppercase mt-2 mb-4 md:mb-6 text-center max-w-[200px] leading-normal line-clamp-2">
               {settings?.storeAddress ?? 'ZARA GALLERY • Ouagadougou'}
             </p>
           )}
           
           {/* Authentification Sécurisée - Hidden completely if both storeName and storeAddress are empty strings "" */}
           {!(settings?.storeName === "" && settings?.storeAddress === "") && (
             <h2 className="text-neutral-500 font-black tracking-[0.15em] text-[8px] uppercase flex justify-center items-center gap-2 opacity-90">
               AUTHENTIFICATION SÉCURISÉE
             </h2>
           )}
        </div>

        <form onSubmit={handleSubmit} className="px-6 md:px-8 pt-6">
          {/* Username Input / Selection */}
          <div className="mb-4 relative">
            <label className="block text-[8px] font-black uppercase tracking-widest text-neutral-400 mb-1.5 font-mono">
              NOM D'UTILISATEUR
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">
                <UserIcon className="w-3.5 h-3.5" />
              </span>
              <input
                type="text"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setError('');
                }}
                onFocus={() => setShowUserDropdown(true)}
                placeholder="Saisissez ou choisissez votre nom"
                className="w-full pl-9 pr-8 py-3 bg-white border border-neutral-200 text-xs font-black uppercase tracking-wider outline-none focus:border-black transition-all"
              />
              <button
                type="button"
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-black"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>

            {/* Micro autocomplete list */}
            {showUserDropdown && (
              <div className="absolute top-full left-0 right-0 bg-white border border-neutral-200 shadow-xl z-50 mt-1 max-h-40 overflow-y-auto">
                {activeUsers.map(u => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => {
                      setUsername(u.name);
                      setShowUserDropdown(false);
                      setError('');
                    }}
                    className="w-full text-left p-3 hover:bg-neutral-50 border-b border-neutral-100 last:border-0 text-[10px] font-black uppercase tracking-wider text-neutral-700 flex justify-between items-center"
                  >
                    <span>{u.name}</span>
                    <span className="text-[7px] text-neutral-400 bg-neutral-100 px-1.5 py-0.5 rounded-sm">{u.role}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </form>

        <div className="px-6 md:px-8 pb-4 bg-neutral-50/60 border-b border-neutral-100">
          <label className="block text-[8px] font-black uppercase tracking-widest text-neutral-400 mb-2 font-mono text-center">
            CODE DE SÉCURITÉ (6 CHIFFRES)
          </label>
          <div className="flex justify-center gap-1.5 md:gap-2 relative">
            {[0, 1, 2, 3, 4, 5].map(i => (
              <div key={i} className={`w-8 h-10 md:w-10 md:h-12 rounded-none flex items-center justify-center text-lg md:text-xl font-bold transition-all duration-300 ${pin[i] ? 'bg-black text-white scale-102' : 'bg-white border border-neutral-200 text-transparent'}`}>
                {pin[i] ? '•' : ''}
              </div>
            ))}
          </div>
          <div className="h-4 mt-2 flex items-center justify-center">
              {error && (
                <p className="text-red-600 text-[9px] font-bold uppercase tracking-widest flex items-center animate-in zoom-in duration-200">
                  <AlertCircle className="w-2.5 h-2.5 mr-1" /> {error}
                </p>
              )}
          </div>
        </div>

        <div className="p-6 md:p-8">
          <div className="grid grid-cols-3 gap-2 md:gap-3">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
              <button 
                key={num} 
                onClick={() => addNumber(num.toString())}
                className="bg-white hover:bg-neutral-900 hover:text-white text-black font-semibold text-lg h-12 md:h-14 rounded-none transition-all border border-neutral-200 active:scale-95 shadow-sm flex items-center justify-center cursor-pointer"
              >
                {num}
              </button>
            ))}
            <button 
              onClick={removeNumber}
              className="bg-neutral-100 hover:bg-neutral-200 text-neutral-600 font-bold text-[8px] md:text-[9px] h-12 md:h-14 rounded-none transition-all uppercase tracking-widest active:scale-95 flex items-center justify-center cursor-pointer"
            >
              Retour
            </button>
            <button 
              onClick={() => addNumber('0')}
              className="bg-white hover:bg-neutral-900 hover:text-white text-black font-semibold text-lg h-12 md:h-14 rounded-none transition-all border border-neutral-200 active:scale-95 shadow-sm flex items-center justify-center cursor-pointer"
            >
              0
            </button>
            <button 
              onClick={() => handleSubmit()}
              disabled={pin.length !== 6 || !username.trim()}
              className="bg-black hover:bg-neutral-800 disabled:bg-neutral-100 disabled:text-neutral-400 disabled:border-neutral-200 text-white font-bold text-[9px] md:text-[10px] h-12 md:h-14 rounded-none transition-all uppercase tracking-widest active:scale-95 border border-black cursor-pointer"
            >
              Entrer
            </button>
          </div>
        </div>

        <div className="bg-neutral-50 py-4 text-center border-t border-neutral-100 flex flex-col gap-1.5 justify-center text-[8px] font-mono text-neutral-400">
           <span className="text-[7px] tracking-[0.2em] font-sans text-neutral-300 font-bold">TERMINAL POS V4.2</span>
           
           {/* Beautiful micro-connectivity monitor on the card itself */}
           <div className="flex items-center justify-center gap-1.5 pt-0.5">
             <div className={`w-1.5 h-1.5 rounded-full ${displayOnline ? 'bg-emerald-500 animate-pulse' : 'bg-red-500 animate-pulse'}`} />
             <span className={`text-[8px] font-black uppercase tracking-widest ${displayOnline ? 'text-emerald-600' : 'text-red-500'}`}>
               {displayOnline ? 'SERVEUR EN LIGNE' : 'MODE HORS-LIGNE'}
             </span>
             <button 
               type="button" 
               onClick={() => setShowTroubleshoot(true)}
               className="ml-1.5 underline hover:text-neutral-600 text-[8px] font-bold tracking-widest uppercase cursor-pointer"
             >
               Diagnostics 💡
             </button>
           </div>
        </div>

      </div>

      {/* Luxury Welcome Modal Popup */}
      {showWelcomeModal && validatedUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white border-2 border-black p-8 max-w-md w-full text-center shadow-2xl relative animate-in zoom-in duration-300">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-black text-amber-400 rounded-full flex items-center justify-center">
                <Sparkles className="w-8 h-8 animate-pulse text-amber-400" />
              </div>
            </div>
            
            <h3 className="text-[10px] font-black tracking-[0.3em] uppercase text-neutral-400 font-mono mb-1">
              Rapport de Connexion
            </h3>
            
            <h2 className="text-2xl font-black uppercase text-black mb-4 tracking-tight">
              BIENVENUE, {validatedUser.name} !
            </h2>

            {/* CONDITIONAL GREY CONTAINER (Disappears fully if welcomeMessageText was cleared/empty) */}
            {hasWelcomeText && finalWelcomeText ? (
              <div className="bg-neutral-50 border border-neutral-100 p-5 mb-6">
                <p className="text-[11px] font-bold text-neutral-800 uppercase tracking-wider leading-relaxed italic">
                  "{finalWelcomeText}"
                </p>
              </div>
            ) : null}

            <div className="border-t border-neutral-100 pt-4 mb-6 flex justify-around text-left">
              <div>
                <p className="text-[8px] font-bold text-neutral-400 uppercase font-mono">Détenteur</p>
                <p className="text-[10px] font-black uppercase text-black">{validatedUser.name}</p>
              </div>
              <div>
                <p className="text-[8px] font-bold text-neutral-400 uppercase font-mono">Habilitation</p>
                <span className="bg-black text-white px-2 py-0.5 text-[8px] font-black rounded-xs uppercase tracking-wider">{validatedUser.role}</span>
              </div>
            </div>

            <button
              onClick={handleWelcomeConfirm}
              className="w-full bg-black text-white py-3.5 font-black uppercase text-xs tracking-widest hover:bg-neutral-900 transition-all active:scale-[0.98]"
            >
              Accéder à l'interface
            </button>
          </div>
        </div>
      )}

      {/* Collapsible Connection troubleshooting dialog popup */}
      {showTroubleshoot && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 text-white rounded-none p-6 md:p-8 max-w-lg w-full shadow-2xl relative animate-in slide-in-from-bottom duration-300">
            <button 
              onClick={() => setShowTroubleshoot(false)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-white transition-all"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-5 border-b border-neutral-800 pb-4">
              <div className={`p-2 rounded ${displayOnline ? 'bg-emerald-950 text-emerald-400' : 'bg-red-950 text-red-400'}`}>
                {displayOnline ? <Wifi className="w-6 h-6 animate-pulse" /> : <WifiOff className="w-6 h-6 animate-bounce" />}
              </div>
              <div>
                <h3 className="text-xs font-black tracking-[0.2em] uppercase text-neutral-400">Assistant de Connectivité</h3>
                <h2 className="text-lg font-black uppercase text-white tracking-tight">
                  {displayOnline ? 'Système Connecté au Réseau' : 'Diagnostic de Panne Internet'}
                </h2>
              </div>
            </div>

            <div className="space-y-4 text-xs">
              <div className="bg-black/50 p-4 border border-neutral-800 rounded space-y-2">
                <span className="text-[9px] font-black tracking-widest text-neutral-500 uppercase block">Statut Actuel :</span>
                <div className="grid grid-cols-2 gap-2 font-mono text-[10px] uppercase">
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${isBrowserOnline ? 'bg-emerald-400' : 'bg-red-500'}`} />
                    <span>Navigateur: {isBrowserOnline ? 'EN LIGNE' : 'HORS-LIGNE'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${serverOnline ? 'bg-emerald-400' : 'bg-red-500'}`} />
                    <span>Serveur SQL: {serverOnline ? 'CONNECTÉ' : 'DÉCONNECTÉ'}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-bold text-amber-400 uppercase tracking-widest text-[9px]">
                  💡 SOLUTIONS &amp; PROPOSITIONS EN CAS DE PROBLÈME :
                </h4>
                
                <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                  <div className="flex gap-2.5 items-start">
                    <div className="w-5 h-5 bg-neutral-800 rounded flex items-center justify-center font-bold text-[10px] shrink-0 text-white mt-0.5">1</div>
                    <p className="text-neutral-300 leading-relaxed">
                      <strong className="text-white uppercase tracking-wider">Vérifiez le Routeur Wi-Fi / Données Mobiles</strong><br />
                      Assurez-vous que votre appareil est correctement connecté au Wi-Fi de la boutique ou dispose d'un forfait internet 4G/5G actif.
                    </p>
                  </div>

                  <div className="flex gap-2.5 items-start">
                    <div className="w-5 h-5 bg-neutral-800 rounded flex items-center justify-center font-bold text-[10px] shrink-0 text-white mt-0.5">2</div>
                    <p className="text-neutral-300 leading-relaxed">
                      <strong className="text-white uppercase tracking-wider">Fonctionnalité en Cache Local Double Sécurisé</strong><br />
                      L'application intègre une architecture résiliente ! Si le serveur est injoignable, <strong>toutes vos opérations actuelles continuent de fonctionner sans interruption</strong> en local. Les tickets se synchroniseront automatiquement dès reprise du réseau.
                    </p>
                  </div>

                  <div className="flex gap-2.5 items-start">
                    <div className="w-5 h-5 bg-neutral-800 rounded flex items-center justify-center font-bold text-[10px] shrink-0 text-white mt-0.5">3</div>
                    <p className="text-neutral-300 leading-relaxed">
                      <strong className="text-white uppercase tracking-wider">Désactivation de la Synergie MariaDB</strong><br />
                      Si la connexion internet est lente mais pas totalement coupée, les pings SQL peuvent ralentir l'interface. <strong className="text-white">L'administrateur peut décocher "Synchronisation Relationnelle SQL"</strong> dans l'onglet <strong>Gestion Équipe</strong> pour stabiliser l'application.
                    </p>
                  </div>

                  <div className="flex gap-2.5 items-start">
                    <div className="w-5 h-5 bg-neutral-800 rounded flex items-center justify-center font-bold text-[10px] shrink-0 text-white mt-0.5">4</div>
                    <p className="text-neutral-300 leading-relaxed">
                      <strong className="text-white uppercase tracking-wider">Rafraîchir après reconnexion physique</strong><br />
                      Après avoir rebranché votre connexion, utilisez notre utilitaire de ping ou rechargez complètement la page.
                    </p>
                  </div>
                </div>
              </div>

              <div className="border-t border-neutral-800 pt-4 flex gap-4">
                <button
                  type="button"
                  onClick={handleTestPing}
                  disabled={isPinging}
                  className="flex-1 bg-white hover:bg-neutral-200 text-black py-2.5 font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isPinging ? 'animate-spin' : ''}`} />
                  {isPinging ? 'Test en cours...' : 'Tester le Serveur'}
                </button>

                <button
                  type="button"
                  onClick={() => setShowTroubleshoot(false)}
                  className="bg-neutral-800 hover:bg-neutral-700 text-neutral-300 px-5 py-2.5 font-black uppercase text-[10px] tracking-widest transition-all cursor-pointer"
                >
                  Fermer
                </button>
              </div>

              {pingStatus && (
                <div className={`p-3 border text-center font-mono text-[10px] uppercase animate-in zoom-in duration-200 ${
                  pingStatus === 'SUCCESS' 
                    ? 'bg-emerald-950/40 border-emerald-800 text-emerald-400' 
                    : 'bg-red-950/40 border-red-900 text-red-400'
                }`}>
                  {pingStatus === 'SUCCESS' 
                    ? '✓ Succès : Connexion avec le serveur rétablie !' 
                    : '✗ Échec : Le serveur reste injoignable.'}
                </div>
              )}

            </div>
          </div>
        </div>
      )}

    </div>
  );
}


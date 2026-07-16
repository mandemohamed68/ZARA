import React, { useState, useEffect, useRef } from 'react';
import { ShoppingCart, Package, BarChart3, Users, Store, LogOut, Wifi, WifiOff, Boxes, X, RefreshCw } from 'lucide-react';
import POS from './components/POS';
import Inventory from './components/Inventory';
import Dashboard from './components/Dashboard';
import Login from './components/Login';
import CashManagement from './components/CashManagement';
import TeamManagement from './components/TeamManagement';
import AuditLog from './components/AuditLog';
import PromotionManager from './components/PromotionManager';
import CRM from './components/CRM';
import Chat from './components/Chat';
import SalesHistory from './components/SalesHistory';
import WholesaleManager from './components/WholesaleManager';
import { INITIAL_PRODUCTS, USERS, INITIAL_PROMOTIONS, INITIAL_CUSTOMERS, INITIAL_SETTINGS } from './data';
import { Product, Order, User, CashMovement, AuditLogEntry, Customer, Promotion, ProductMovement, ChatMessage, PendingTicket, AppSettings, CashRegisterSession, UserPermissions } from './types';
import { Wholesaler, WholesaleOrder } from './types_wholesale';
import { ShieldCheck, Image as ImageIcon, Users2, MessageSquare, Lock as LockIcon, ReceiptText, Sun, Moon } from 'lucide-react';
import { motion } from 'motion/react';

const INITIAL_WHOLESALERS: Wholesaler[] = [
  { id: 'GROS-1', name: 'Omar Sy', companyName: 'Dakar Fripes Gros', phone: '+221 77 555 11 22', email: 'omar@grosfripes.sn', address: 'Grand Yoff, Dakar', balance: 0, creditLimit: 5000000, createdAt: new Date().toISOString() },
  { id: 'GROS-2', name: 'Alou Diallo', companyName: 'Diallo Frères Import', phone: '+221 70 444 33 22', email: 'contact@diallobros.com', address: 'Marché HLM, Dakar', balance: 1450000, creditLimit: 8000000, createdAt: new Date().toISOString() },
];

const ensureSuperAdmin = (loadedUsers: User[]): User[] => {
  const hasSuperAdmin = loadedUsers.some(u => u.name === 'Mande Mohamed');
  if (hasSuperAdmin) {
    return loadedUsers.map(u => u.name === 'Mande Mohamed' ? { ...u, pin: '270786', role: 'ADMIN', isActive: true } : u);
  }
  return [
    { id: '1', name: 'Mande Mohamed', pin: '270786', role: 'ADMIN', isActive: true, avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150' },
    ...loadedUsers.filter(u => u.id !== '1')
  ];
};

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('pos');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState<'IDLE' | 'SYNCING' | 'SAVED'>('IDLE');
  const [serverOnline, setServerOnline] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [showMainTroubleshoot, setShowMainTroubleshoot] = useState(false);
  const [isPinging, setIsPinging] = useState(false);
  const [pingStatus, setPingStatus] = useState<'SUCCESS' | 'FAILED' | null>(null);
  const [isBrowserOnline, setIsBrowserOnline] = useState(navigator.onLine);
  
  // App State
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [orders, setOrders] = useState<Order[]>([]);
  const [users, setUsers] = useState<User[]>(USERS);
  const [cashMovements, setCashMovements] = useState<CashMovement[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [customers, setCustomers] = useState<Customer[]>(INITIAL_CUSTOMERS);
  const [promotions, setPromotions] = useState<Promotion[]>(INITIAL_PROMOTIONS);
  const [stockMovements, setStockMovements] = useState<ProductMovement[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pendingTickets, setPendingTickets] = useState<PendingTicket[]>([]);
  const [settings, setSettings] = useState<AppSettings>(INITIAL_SETTINGS);

  // Cash Register Sessions State
  const [currentSession, setCurrentSession] = useState<CashRegisterSession | null>(null);
  const [sessionsHistory, setSessionsHistory] = useState<CashRegisterSession[]>([]);

  // B2B Wholesale state
  const [wholesalers, setWholesalers] = useState<Wholesaler[]>(INITIAL_WHOLESALERS);
  const [wholesaleOrders, setWholesaleOrders] = useState<WholesaleOrder[]>([]);

  // Real-time synchronization state
  const [lastUpdatedTime, setLastUpdatedTime] = useState<string | null>(null);

  // Timer for debounced save
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialMount = useRef(true);

  // --- LOCAL SERVER SYNC LOGIC ---

  // Initial load from server
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(`/api/data?t=${Date.now()}`, { cache: 'no-store' });
        if (response.ok) {
          const data = await response.json();
          if (data.lastUpdated) setLastUpdatedTime(data.lastUpdated);
          if (data.products) setProducts(data.products);
          if (data.orders) setOrders(data.orders);
          
          let fetchedUsers = ensureSuperAdmin(data.users ? data.users.map((u: any) => ({ ...u, isActive: u.isActive !== false })) : USERS);
          setUsers(fetchedUsers);
          
          const savedUserId = sessionStorage.getItem('zg_logged_in_user');
          if (savedUserId) {
            const user = fetchedUsers.find((u: any) => u.id === savedUserId);
            if (user) setCurrentUser(user);
          }

          if (data.cashMovements) setCashMovements(data.cashMovements);
          if (data.auditLogs) setAuditLogs(data.auditLogs);
          if (data.customers) setCustomers(data.customers);
          if (data.promotions) setPromotions(data.promotions);
          if (data.stockMovements) setStockMovements(data.stockMovements);
          
          // Initial messages load
          try {
            const mRes = await fetch('/api/messages');
            if (mRes.ok) {
              const mData = await mRes.json();
              setMessages(mData);
            }
          } catch (e) {
            console.error('Error loading initial messages:', e);
          }

          if (data.pendingTickets) setPendingTickets(data.pendingTickets);
          if (data.settings) setSettings({ ...INITIAL_SETTINGS, ...data.settings });
          if (data.wholesalers) setWholesalers(data.wholesalers);
          if (data.wholesaleOrders) setWholesaleOrders(data.wholesaleOrders);
          if (data.currentSession !== undefined) setCurrentSession(data.currentSession);
          if (data.sessionsHistory) setSessionsHistory(data.sessionsHistory);
          setServerOnline(true);
        } else {
          loadFromLocal();
        }
      } catch (err) {
        setServerOnline(false);
        loadFromLocal();
      } finally {
        setIsInitialized(true);
      }
    };

    fetchData();
  }, []);

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
        setServerOnline(true);
      } else {
        setPingStatus('FAILED');
        setServerOnline(false);
      }
    } catch {
      setPingStatus('FAILED');
      setServerOnline(false);
    } finally {
      setIsPinging(false);
    }
  };

  const loadFromLocal = () => {
    const saved = localStorage.getItem('zg_local_cache');
    if (saved) {
      const data = JSON.parse(saved);
      if (data.lastUpdated) setLastUpdatedTime(data.lastUpdated);
      setProducts(data.products || INITIAL_PRODUCTS);
      setOrders(data.orders || []);
      
      let fetchedUsers = ensureSuperAdmin((data.users || USERS).map((u: any) => ({ ...u, isActive: u.isActive !== false })));
      setUsers(fetchedUsers);
      
      const savedUserId = sessionStorage.getItem('zg_logged_in_user');
      if (savedUserId) {
        const user = fetchedUsers.find((u: any) => u.id === savedUserId);
        if (user) setCurrentUser(user);
      }

      setCashMovements(data.cashMovements || []);
      setAuditLogs(data.auditLogs || []);
      setCustomers(data.customers || INITIAL_CUSTOMERS);
      setPromotions(data.promotions || INITIAL_PROMOTIONS);
      setStockMovements(data.stockMovements || []);
      setMessages(data.messages || []);
      setPendingTickets(data.pendingTickets || []);
      setSettings(data.settings ? { ...INITIAL_SETTINGS, ...data.settings } : INITIAL_SETTINGS);
      setWholesalers(data.wholesalers || INITIAL_WHOLESALERS);
      setWholesaleOrders(data.wholesaleOrders || []);
      setCurrentSession(data.currentSession || null);
      setSessionsHistory(data.sessionsHistory || []);
    }
  };

  // Debounced save
  useEffect(() => {
    if (!isInitialized) return;
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

    saveTimeoutRef.current = setTimeout(async () => {
      const nowStr = new Date().toISOString();
      setLastUpdatedTime(nowStr);

      // EXCLUDE messages from the general POS/Settings save block to prevent write race-conditions
      const dataToSave = {
        products, orders, users, cashMovements, auditLogs, 
        customers, promotions, stockMovements,
        pendingTickets, settings, wholesalers, wholesaleOrders,
        currentSession, sessionsHistory,
        lastUpdated: nowStr
      };

      localStorage.setItem('zg_local_cache', JSON.stringify(dataToSave));

      setIsSyncing('SYNCING');
      try {
        const res = await fetch('/api/data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dataToSave)
        });
        setServerOnline(res.ok);
      } catch (err) {
        setServerOnline(false);
      } finally {
        setIsSyncing('SAVED');
        setTimeout(() => setIsSyncing('IDLE'), 2000);
      }
    }, 500);

    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [products, orders, users, cashMovements, auditLogs, customers, promotions, stockMovements, pendingTickets, settings, wholesalers, wholesaleOrders, currentSession, sessionsHistory, isInitialized]);

  // Real-time Core Data poller: Polls server every 3 seconds to sync browser sessions instantly
  useEffect(() => {
    if (!isInitialized) return;

    let timerId: NodeJS.Timeout;

    const pollCoreData = async () => {
      // Do not poll if we are currently saving to avoid race conditions or overwriting unsaved states
      if (isSyncing === 'SYNCING') return;

      try {
        const res = await fetch(`/api/data?t=${Date.now()}`, { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          // Check if server data is newer or has a different lastUpdated string
          if (data.lastUpdated && data.lastUpdated !== lastUpdatedTime) {
            setLastUpdatedTime(data.lastUpdated);
            if (data.products) setProducts(data.products);
            if (data.orders) setOrders(data.orders);
            if (data.cashMovements) setCashMovements(data.cashMovements);
            if (data.auditLogs) setAuditLogs(data.auditLogs);
            if (data.customers) setCustomers(data.customers);
            if (data.promotions) setPromotions(data.promotions);
            if (data.stockMovements) setStockMovements(data.stockMovements);
            if (data.pendingTickets) setPendingTickets(data.pendingTickets);
            if (data.settings) setSettings({ ...INITIAL_SETTINGS, ...data.settings });
            if (data.wholesalers) setWholesalers(data.wholesalers);
            if (data.wholesaleOrders) setWholesaleOrders(data.wholesaleOrders);
            if (data.currentSession !== undefined) setCurrentSession(data.currentSession);
            if (data.sessionsHistory) setSessionsHistory(data.sessionsHistory);
            
            let fetchedUsers = ensureSuperAdmin(data.users ? data.users.map((u: any) => ({ ...u, isActive: u.isActive !== false })) : USERS);
            setUsers(fetchedUsers);
            setServerOnline(true);
          }
        }
      } catch (err) {
        console.error('Error polling core state updates:', err);
      }
    };

    timerId = setInterval(pollCoreData, 3000);

    return () => clearInterval(timerId);
  }, [isInitialized, isSyncing, lastUpdatedTime]);

  // Real-time Chat poller: Polls messages independently every 4 seconds
  useEffect(() => {
    let timerId: NodeJS.Timeout;

    const pollMessages = async () => {
      try {
        const res = await fetch('/api/messages?t=' + Date.now());
        if (res.ok) {
          const fetchedMsgs = await res.json();
          // Deep compare before setting state to prevent infinite react-render triggers
          if (JSON.stringify(fetchedMsgs) !== JSON.stringify(messages)) {
            setMessages(fetchedMsgs);
          }
        }
      } catch (err) {
        console.error('Error polling chat messages:', err);
      }
    };

    pollMessages();
    timerId = setInterval(pollMessages, 4000);

    return () => clearInterval(timerId);
  }, [messages]);

  // Security: Immediate logout for suspended users
  useEffect(() => {
    if (currentUser) {
      const activeState = users.find(u => u.id === currentUser.id);
      if (activeState && activeState.isActive === false) {
        sessionStorage.removeItem('zg_logged_in_user');
        setCurrentUser(null);
        alert("🔒 SESSION VERROUILLÉE : Votre compte d'accès Zara a été suspendu par la Direction.");
      }
    }
  }, [users, currentUser]);

  // Payment Window Auto-Lock logic
  useEffect(() => {
    const checkPaymentWindow = () => {
      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      
      let shouldBeLocked = settings.manualLock;

      if (settings.autoLockEnabled) {
        const isWithinWindow = currentTime >= settings.openingTime && currentTime < settings.closingTime;
        if (!isWithinWindow) {
          shouldBeLocked = true;
        }
      }

      if (shouldBeLocked !== settings.isPaymentLocked) {
        setSettings(prev => ({ ...prev, isPaymentLocked: shouldBeLocked }));
        addAuditLog(shouldBeLocked ? 'PAYMENT_LOCKED' : 'PAYMENT_UNLOCKED', 
          shouldBeLocked 
            ? `Les paiements ont été verrouillés ${settings.manualLock ? 'manuellement' : 'automatiquement'} à ${currentTime}.` 
            : `Le système de paiement est maintenant ouvert.`
        );
      }
    };

    checkPaymentWindow();
    const interval = setInterval(checkPaymentWindow, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [settings.openingTime, settings.closingTime, settings.autoLockEnabled, settings.manualLock, settings.isPaymentLocked]);

  // Dynamic style injector for customizations
  useEffect(() => {
    let styleEl = document.getElementById('dynamic-theme-style');
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'dynamic-theme-style';
      document.head.appendChild(styleEl);
    }

    const tColor = settings.themeColor || 'black';
    const isDark = !!settings.darkModeEnabled;

    const colors: Record<string, { primary: string; hover: string; text: string }> = {
      black: { primary: '#000000', hover: '#1e1b18', text: '#ffffff' },
      emerald: { primary: '#059669', hover: '#047857', text: '#ffffff' },
      indigo: { primary: '#4f46e5', hover: '#4338ca', text: '#ffffff' },
      rose: { primary: '#e11d48', hover: '#be123c', text: '#ffffff' },
      amber: { primary: '#d97706', hover: '#b45309', text: '#ffffff' },
      blue: { primary: '#2563eb', hover: '#1d4ed8', text: '#ffffff' },
    };

    const activeColor = colors[tColor] || colors.black;

    let css = `
      :root {
        --primary-accent: ${activeColor.primary};
        --primary-accent-hover: ${activeColor.hover};
        --primary-accent-text: ${activeColor.text};
      }
    `;

    css += `
      /* ACCENT COLOR OVERRIDES */
      .bg-indigo-600, .bg-emerald-600, .bg-emerald-700, .bg-emerald-950, .bg-black {
        background-color: var(--primary-accent) !important;
        color: var(--primary-accent-text) !important;
      }
      .hover\\:bg-emerald-700:hover, .hover\\:bg-black:hover, .hover\\:bg-neutral-900:hover, .hover\\:bg-emerald-800:hover {
        background-color: var(--primary-accent-hover) !important;
      }
      .text-emerald-600, .text-emerald-500, .text-emerald-700 {
        color: var(--primary-accent) !important;
      }
      .border-emerald-600, .border-emerald-500, .border-black {
        border-color: var(--primary-accent) !important;
      }
      .focus\\:border-emerald-600:focus, .focus\\:border-black:focus, .focus\\:border-neutral-900:focus {
        border-color: var(--primary-accent) !important;
      }
    `;

    if (isDark) {
      css += `
        /* MODE NUIT OVERRIDES */
        body {
          background-color: #0c0a09 !important; /* Stone 950 */
          color: #f5f5f4 !important; /* Stone 100 */
        }
        
        .bg-white, .bg-neutral-50, .bg-slate-50, .bg-gray-50, .bg-stone-50 {
          background-color: #1c1917 !important; /* Stone 900 */
          color: #f5f5f4 !important;
        }

        .bg-neutral-100, .bg-stone-100, .bg-gray-100, .bg-neutral-50\\/50 {
          background-color: #292524 !important; /* Stone 800 */
          color: #f5f5f4 !important;
        }

        .border-neutral-200, .border-neutral-100, .border-gray-200, .border-stone-200, .border-stone-100 {
          border-color: #44403c !important; /* Stone 700 */
        }

        .border-neutral-900, .border-neutral-800, .border-stone-800 {
          border-color: #44403c !important;
        }

        .text-neutral-900, .text-neutral-800, .text-black, .text-neutral-700 {
          color: #fafaf9 !important; /* Stone 50 */
        }

        .text-neutral-500, .text-neutral-600, .text-gray-500 {
          color: #a8a29e !important; /* Stone 400 */
        }

        .text-neutral-400 {
          color: #78716c !important; /* Stone 500 */
        }

        input, select, textarea {
          background-color: #292524 !important;
          color: #ffffff !important;
          border-color: #44403c !important;
        }
        
        input::placeholder {
          color: #78716c !important;
        }

        .hover\\:bg-neutral-50:hover, .hover\\:bg-neutral-100:hover, .hover\\:bg-stone-50:hover {
          background-color: #292524 !important;
        }

        th {
          background-color: #1a1716 !important;
          color: #fafaf9 !important;
          border-color: #44403c !important;
        }
        
        td {
          border-color: #44403c !important;
        }

        .shadow-sm, .shadow-md, .shadow-lg, .shadow-xl {
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.5), 0 4px 6px -2px rgba(0, 0, 0, 0.4) !important;
        }

        .bg-neutral-900, .bg-neutral-950 {
          background-color: #12100f !important;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #44403c !important;
        }
      `;
    }

    styleEl.innerHTML = css;

    // Also toggle a html / body dark class in case some elements use tailwind dark: selectors
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings.themeColor, settings.darkModeEnabled]);

  const addAuditLog = (action: string, details: string, severity: AuditLogEntry['severity'] = 'INFO') => {
    const newLog: AuditLogEntry = {
      id: `LOG-${Date.now()}`,
      timestamp: new Date().toISOString(),
      user: currentUser?.name || 'System',
      action,
      details,
      severity
    };
    setAuditLogs(prev => [newLog, ...prev]);
  };

  const trackStockMovement = (productId: string, variantId: string, type: ProductMovement['type'], quantity: number, reason: string) => {
    const newMovement: ProductMovement = {
      id: `MOV-${Date.now()}`,
      productId,
      variantId,
      type,
      quantity,
      reason,
      date: new Date().toISOString(),
      user: currentUser?.name || 'System'
    };
    setStockMovements(prev => [newMovement, ...prev]);
  };

  const handleCompleteOrder = (order: Order, updatedProducts: Product[]) => {
    setOrders(prev => [order, ...prev]);
    setProducts(updatedProducts);
    
    // Update Loyalty Points and Total Spent if customer is selected
    if (order.customer) {
      setCustomers(prev => prev.map(c => {
        if (c.id === order.customer?.id) {
          // 1 point for every 5000 FCFA spent (adjusted logic for "considerable purchase")
          const earnedPoints = Math.floor(order.total / 5000);
          const finalPoints = Math.max(1, earnedPoints); // Ensure at least 1 point for any valid sale
          return {
            ...c,
            loyaltyPoints: (c.loyaltyPoints || 0) + finalPoints,
            totalSpent: (c.totalSpent || 0) + order.total,
            lastPurchaseDate: new Date().toISOString()
          };
        }
        return c;
      }));
    }
    
    order.items.forEach(item => {
      trackStockMovement(item.product.id, item.variant.id, 'SALE', -item.quantity, `Vente Order #${order.id}`);
    });

    addAuditLog('SALE_COMPLETED', `Vente #${order.id} complétée par ${order.cashier}. Total: ${order.total} F CFA.`);
  };

  const handleLogout = () => {
    addAuditLog('USER_LOGOUT', `Déconnexion de ${currentUser?.name}`);
    sessionStorage.removeItem('zg_logged_in_user');
    setCurrentUser(null);
    setActiveTab('pos');
  };

  if (!isInitialized) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-black text-white font-mono text-sm tracking-widest relative overflow-hidden">
        <div className="absolute inset-0 bg-neutral-900 opacity-50" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/stardust.png")' }}></div>
        <div className="z-10 flex flex-col items-center animate-pulse">
           <div className="text-3xl font-black tracking-[0.4em] mb-4">ZARA</div>
           <div className="text-[10px] text-neutral-400">CHARGEMENT DU SYSTÈME ZARA POS...</div>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <Login onLogin={(user) => { 
      setCurrentUser(user);
      sessionStorage.setItem('zg_logged_in_user', user.id);
      addAuditLog('USER_LOGIN', `Connexion de ${user.name} (${user.role})`);
    }} users={users} settings={settings} serverOnline={serverOnline} />;
  }

  const isAdmin = currentUser.role === 'ADMIN';
  const isManager = currentUser.role === 'MANAGER' || isAdmin;

  const hasAppAccess = (permKey: keyof UserPermissions, isAllowedByRoleFallback: boolean) => {
    if (!currentUser) return false;
    if (currentUser.role === 'ADMIN') return true;
    if (currentUser.permissions && currentUser.permissions[permKey] !== undefined) {
      return currentUser.permissions[permKey];
    }
    return isAllowedByRoleFallback;
  };

  // Function wrapper to satisfy React's requirement for updating state from props if needed
  const setProductsFromInventory = (newProducts: React.SetStateAction<Product[]>) => {
    if (typeof newProducts === 'function') {
      setProducts(prev => newProducts(prev));
    } else {
      setProducts(newProducts);
    }
  };

  const setUsersFromTeam = (newUsers: User[]) => setUsers(newUsers);
  const setCashMovementsFromCash = (newMovements: CashMovement[] | ((prev: CashMovement[]) => CashMovement[])) => setCashMovements(newMovements);
  const setCustomersFromCRM = (newCustomers: Customer[]) => setCustomers(newCustomers);
  const setPromotionsFromManager = (newPromotions: Promotion[]) => setPromotions(newPromotions);
  const setSettingsFromTeam = (newSettings: AppSettings) => setSettings(newSettings);

  const downloadDatabase = () => {
    const dataToSave = {
      products, orders, users, cashMovements, auditLogs, 
      customers, promotions, stockMovements, messages,
      pendingTickets, settings,
      lastUpdated: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(dataToSave, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `zara_backup_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    addAuditLog('DATABASE_BACKUP', `Une copie de sauvegarde de la base de données a été téléchargée par ${currentUser?.name}`);
  };
  const setMessagesFromChat = (newMessages: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => {
    let resolved: ChatMessage[] = [];
    if (typeof newMessages === 'function') {
      setMessages(prev => {
        resolved = newMessages(prev);
        const lastMsg = resolved[resolved.length - 1];
        if (lastMsg && (!prev.length || prev[prev.length - 1].id !== lastMsg.id)) {
          postMessageToServer(lastMsg);
        }
        return resolved;
      });
    } else {
      resolved = newMessages;
      setMessages(newMessages);
      const lastMsg = resolved[resolved.length - 1];
      if (lastMsg && (!messages.length || messages[messages.length - 1].id !== lastMsg.id)) {
        postMessageToServer(lastMsg);
      }
    }
  };

  const postMessageToServer = (msg: ChatMessage) => {
    fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(msg)
    }).catch(err => console.error('Error sending intercom message:', err));
  };

  return (
    <div className="flex h-screen bg-neutral-100 font-sans tracking-tight overflow-hidden text-neutral-900 selection:bg-neutral-200">
      
      {/* Sidebar Navigation - Luxury Noir */}
      <aside className="w-20 lg:w-72 bg-black border-r border-neutral-900 flex flex-col print:hidden transition-all duration-300 z-50">
        <div className="h-24 flex items-center justify-center lg:justify-start lg:px-8 border-b border-neutral-900 text-white">
          <div className="hidden lg:flex items-center gap-3 text-left">
            {settings?.logoUrl ? (
              <img src={settings.logoUrl} alt="Logo" className="max-h-12 w-auto object-contain rounded" referrerPolicy="no-referrer" />
            ) : null}
            <div>
              <span className="font-black text-2xl tracking-tighter text-white uppercase leading-none block">{settings?.storeName?.split(' ')[0] || 'ZARA'}</span>
              <span className="font-semibold text-[10px] tracking-[0.3em] text-neutral-500 uppercase leading-none mt-1 block">{settings?.storeName?.split(' ').slice(1).join(' ') || 'GALLERY'}</span>
            </div>
          </div>
          <div className="lg:hidden font-black text-2xl tracking-tighter text-white">
            {settings?.logoUrl ? (
              <img src={settings.logoUrl} alt="Z" className="w-10 h-10 object-contain rounded" referrerPolicy="no-referrer" />
            ) : "Z"}
          </div>
        </div>
        
        {/* User Session Info */}
        <div className="px-4 lg:px-6 py-6 border-b border-neutral-900 flex flex-col items-center lg:items-start gap-4">
           <div className="hidden lg:block w-full">
             <p className="text-neutral-500 text-[10px] uppercase font-bold tracking-widest mb-1">Employé Actif</p>
             <p className="text-white font-medium truncate tracking-tight w-full" title={currentUser.name}>{currentUser.name}</p>
             <p className="text-zinc-500 text-[9px] mt-0.5 font-black tracking-widest uppercase">{currentUser.role} </p>
           </div>
           
           <div className="flex items-center gap-2 w-full justify-center lg:justify-start">
             <button 
               id="theme-toggle"
               onClick={() => {
                 setSettings(prev => ({
                   ...prev,
                   darkModeEnabled: !prev.darkModeEnabled
                 }));
                 addAuditLog(
                   settings?.darkModeEnabled ? 'MODE_NUIT_DESACTIVE' : 'MODE_NUIT_ACTIVE',
                   `Mode Nuit Haute Retenue ${settings?.darkModeEnabled ? 'désactivé' : 'activé'} manuellement.`
                 );
               }} 
               className={`p-3 rounded-lg transition-colors border flex items-center justify-center ${settings?.darkModeEnabled ? 'bg-amber-950/40 text-amber-500 border-amber-900/50 hover:bg-amber-900/65' : 'bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white border-neutral-800'}`}
               title={settings?.darkModeEnabled ? "Activer Mode Jour" : "Activer Mode Nuit Haute Retenue"}
             >
               {settings?.darkModeEnabled ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
             </button>
             <button 
               id="chat-toggle"
               onClick={() => setIsChatOpen(true)} 
               className="p-3 bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white rounded-lg transition-colors border border-neutral-800 relative flex items-center justify-center"
             >
               <MessageSquare className="w-4 h-4" />
               <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
             </button>
             <button 
               id="logout-btn"
               onClick={handleLogout} 
               className="p-3 bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white rounded-lg transition-colors border border-neutral-800 flex items-center justify-center lg:ml-auto" 
               title="Quitter Session"
             >
               <LogOut className="w-4 h-4" />
             </button>
           </div>
        </div>

        <nav className="flex-1 py-8 flex flex-col gap-1.5 px-3 lg:px-5 overflow-y-auto hide-scrollbar">
          <NavItem id="pos" icon={<ShoppingCart />} label="Vente / Caisse" active={activeTab === 'pos'} onClick={() => setActiveTab('pos')} />
          <NavItem id="history" icon={<ReceiptText />} label="Historique Ventes" active={activeTab === 'history'} onClick={() => setActiveTab('history')} />
          <NavItem id="cash" icon={<Store />} label="Gestion de Caisse" active={activeTab === 'cash'} onClick={() => setActiveTab('cash')} />
          {/* GROS / B2B SECTION */}
          {hasAppAccess('canViewWholesale', isManager) && (
            <>
              <div className="my-3 border-t border-neutral-900 mx-3 opacity-30"></div>
              <p className="hidden lg:block px-4 text-[9px] font-black text-neutral-600 uppercase tracking-[0.2em] mb-1">Gros / B2B</p>
              <NavItem id="wholesale" icon={<Boxes />} label="Espace Grossistes" active={activeTab === 'wholesale'} onClick={() => setActiveTab('wholesale')} />
            </>
          )}

          {/* INVENTAIRE SECTION */}
          {hasAppAccess('canViewInventory', isManager) && (
            <>
              <div className="my-3 border-t border-neutral-900 mx-3 opacity-30"></div>
              <p className="hidden lg:block px-4 text-[9px] font-black text-neutral-600 uppercase tracking-[0.2em] mb-1">Inventaire</p>
              <NavItem id="inventory" icon={<Package />} label="Articles & Stocks" active={activeTab === 'inventory'} onClick={() => setActiveTab('inventory')} />
            </>
          )}

          {/* DIRECTION SECTION */}
          {(hasAppAccess('canViewStats', isManager) || hasAppAccess('canViewCRM', isManager)) && (
            <>
              <div className="my-3 border-t border-neutral-900 mx-3 opacity-30"></div>
              <p className="hidden lg:block px-4 text-[9px] font-black text-neutral-600 uppercase tracking-[0.2em] mb-1">Direction</p>
              {hasAppAccess('canViewStats', isManager) && (
                <NavItem id="dashboard" icon={<BarChart3 />} label="Statistiques" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
              )}
              {hasAppAccess('canViewCRM', isManager) && (
                <NavItem id="crm" icon={<Users2 />} label="Fidélité Clients" active={activeTab === 'crm'} onClick={() => setActiveTab('crm')} />
              )}
            </>
          )}

          {/* PARAMÈTRES / CONFIGURATION SECTION */}
          {(hasAppAccess('canViewPromotions', isAdmin) || hasAppAccess('canViewUsers', isAdmin) || hasAppAccess('canViewAudit', isAdmin)) && (
            <>
              <div className="my-3 border-t border-neutral-900 mx-3 opacity-30"></div>
              <p className="hidden lg:block px-4 text-[9px] font-black text-neutral-600 uppercase tracking-[0.2em] mb-1">Paramètres</p>
              {hasAppAccess('canViewPromotions', isAdmin) && (
                <NavItem id="promotions" icon={<ImageIcon />} label="Promotions" active={activeTab === 'promotions'} onClick={() => setActiveTab('promotions')} />
              )}
              {hasAppAccess('canViewUsers', isAdmin) && (
                <NavItem id="users" icon={<Users />} label="Gestion Équipe" active={activeTab === 'users'} onClick={() => setActiveTab('users')} />
              )}
              {hasAppAccess('canViewAudit', isAdmin) && (
                <NavItem id="audit" icon={<ShieldCheck />} label="Journal d'Audit" active={activeTab === 'audit'} onClick={() => setActiveTab('audit')} />
              )}
            </>
          )}
          
          <div className="mt-auto pt-6 px-1 lg:px-2">
             <button 
                onClick={handleLogout}
                className="w-full flex items-center justify-center lg:justify-start px-4 py-3 bg-red-950/30 hover:bg-red-600 border border-red-900/50 hover:border-red-500 text-red-500 hover:text-white rounded-lg transition-all duration-200 group"
             >
                <LogOut className="w-4 h-4 transition-transform group-hover:scale-110" />
                <span className="ml-4 text-[11px] hidden lg:block uppercase tracking-[0.2em] font-black">Retour au Login</span>
             </button>
          </div>
        </nav>
        
        <div className="p-5 hidden lg:block animate-in slide-in-from-bottom duration-300">
          <div 
            onClick={() => setShowMainTroubleshoot(true)}
            title="Cliquez pour les diagnostics de connexion..."
            className="bg-neutral-950 border border-neutral-900 hover:border-neutral-700 p-3 text-[9px] text-neutral-500 hover:text-neutral-300 uppercase tracking-widest text-center flex flex-col gap-2 cursor-pointer transition-all active:scale-[0.98]"
          >
             <div className="flex items-center justify-center gap-2">
               {serverOnline ? <Wifi className="w-3 h-3 text-green-500" /> : <WifiOff className="w-3 h-3 text-red-500 animate-pulse" />}
               <span className={`${serverOnline ? 'text-green-500' : 'text-red-500'} font-black`}>
                 {serverOnline ? 'SYNC OK' : 'LOCAL CACHE (OFFLINE)'}
               </span>
               {isSyncing === 'SYNCING' && <div className="w-1 h-1 bg-white rounded-full animate-ping"></div>}
             </div>
             <span className="underline text-[8px] tracking-[0.1em] text-neutral-400 hover:text-white font-mono flex items-center justify-center gap-1">Aide Connexion 💡</span>
             <span>© 2026 ZARA GALLERY</span>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-white relative">
        <div className={`absolute top-4 right-4 z-[999] px-4 py-2 border rounded shadow-md font-bold uppercase tracking-widest text-[9px] transition-all duration-300 ${isSyncing === 'SYNCING' ? 'bg-amber-100 border-amber-300 text-amber-800 opacity-100 translate-y-0' : (isSyncing === 'SAVED' ? 'bg-emerald-100 border-emerald-300 text-emerald-800 opacity-100 translate-y-0' : 'bg-emerald-100 border-emerald-300 text-emerald-800 opacity-0 -translate-y-4 pointer-events-none')}`}>
           {isSyncing === 'SYNCING' ? 'Enregistrement en cours...' : 'Modifications sauvegardées'}
        </div>

        <motion.div 
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="flex-1 flex flex-col h-full overflow-hidden"
        >
        {activeTab === 'pos' && (
          <POS 
            products={products} 
            currentUser={currentUser!} 
            onCompleteOrder={handleCompleteOrder} 
            promotions={promotions} 
            customers={customers} 
            addAuditLog={addAuditLog} 
            pendingTickets={pendingTickets} 
            setPendingTickets={setPendingTickets} 
            setCustomers={setCustomersFromCRM}
            isPaymentLocked={settings.isPaymentLocked}
            onLogout={handleLogout}
            currentSession={currentSession}
            isCashSessionRequired={settings.isCashSessionRequired}
            settings={settings}
            onOpenSession={(startingFloat) => {
              const newSession: CashRegisterSession = {
                id: `SESS-${Date.now()}`,
                openerId: currentUser?.name || 'Inconnu',
                openedAt: new Date().toISOString(),
                status: 'OPEN',
                expectedCash: startingFloat
              };
              setCurrentSession(newSession);

              // Create cash movement for initial starting cash
              const openingMovement: CashMovement = {
                id: `MOV-${Date.now()}`,
                type: 'IN',
                amount: startingFloat,
                reason: 'Ouverture de Caisse - Fond de caisse initial',
                date: new Date().toISOString(),
                user: currentUser?.name || 'Inconnu'
              };
              setCashMovements(prev => [openingMovement, ...prev]);
              addAuditLog('SESSION_OPENED', `Session de caisse ouverte par ${currentUser?.name || 'Inconnu'}. Fond de caisse initial: ${startingFloat} F CFA.`);
            }}
          />
        )}
        {activeTab === 'inventory' && hasAppAccess('canViewInventory', isManager) && <Inventory products={products} setProducts={setProductsFromInventory} movements={stockMovements} trackMovement={trackStockMovement} settings={settings} />}
        {activeTab === 'wholesale' && hasAppAccess('canViewWholesale', isManager) && (
          <WholesaleManager 
            products={products}
            setProducts={setProductsFromInventory}
            wholesaleOrders={wholesaleOrders}
            setWholesaleOrders={setWholesaleOrders}
            wholesalers={wholesalers}
            setWholesalers={setWholesalers}
            trackMovement={trackStockMovement}
            addAuditLog={addAuditLog}
            currentUser={currentUser!}
            isPaymentLocked={settings.isPaymentLocked}
            isCashSessionRequired={settings.isCashSessionRequired}
            currentSession={currentSession}
            settings={settings}
          />
        )}
        {activeTab === 'dashboard' && hasAppAccess('canViewStats', isManager) && (
          <Dashboard 
            orders={orders} 
            wholesaleOrders={wholesaleOrders} 
            wholesalers={wholesalers} 
            cashMovements={cashMovements}
            settings={settings}
          />
        )}
        {activeTab === 'cash' && (
          <CashManagement 
            movements={cashMovements} 
            setMovements={setCashMovementsFromCash} 
            currentUser={currentUser!} 
            orders={orders}
            wholesaleOrders={wholesaleOrders}
            currentSession={currentSession}
            setCurrentSession={setCurrentSession}
            sessionsHistory={sessionsHistory}
            setSessionsHistory={setSessionsHistory}
            addAuditLog={addAuditLog}
            isCashSessionRequired={settings.isCashSessionRequired}
            settings={settings}
          />
        )}
        {activeTab === 'users' && hasAppAccess('canViewUsers', isAdmin) && (
          <TeamManagement 
            users={users} 
            setUsers={setUsersFromTeam} 
            currentUser={currentUser} 
            settings={settings} 
            setSettings={setSettingsFromTeam} 
            onDownloadBackup={downloadDatabase}
            products={products}
            setProducts={setProducts}
            orders={orders}
            setOrders={setOrders}
            customers={customers}
            setCustomers={setCustomers}
            promotions={promotions}
            setPromotions={setPromotions}
            cashMovements={cashMovements}
            setCashMovements={setCashMovements}
            auditLogs={auditLogs}
            setAuditLogs={setAuditLogs}
            stockMovements={stockMovements}
            setStockMovements={setStockMovements}
            wholesalers={wholesalers}
            setWholesalers={setWholesalers}
            wholesaleOrders={wholesaleOrders}
            setWholesaleOrders={setWholesaleOrders}
            currentSession={currentSession}
            setCurrentSession={setCurrentSession}
            sessionsHistory={sessionsHistory}
            setSessionsHistory={setSessionsHistory}
            messages={messages}
            setMessages={setMessages}
            pendingTickets={pendingTickets}
            setPendingTickets={setPendingTickets}
          />
        )}
        {activeTab === 'crm' && hasAppAccess('canViewCRM', isManager) && <CRM customers={customers} setCustomers={setCustomersFromCRM} orders={orders} settings={settings} />}
        {activeTab === 'promotions' && hasAppAccess('canViewPromotions', isAdmin) && <PromotionManager promotions={promotions} setPromotions={setPromotionsFromManager} settings={settings} />}
        {activeTab === 'audit' && hasAppAccess('canViewAudit', isAdmin) && <AuditLog logs={auditLogs} />}
        {activeTab === 'history' && <SalesHistory orders={orders} wholesaleOrders={wholesaleOrders} wholesalers={wholesalers} currentUser={currentUser} users={users} settings={settings} />}
        </motion.div>
        
        <Chat isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} messages={messages} setMessages={setMessagesFromChat} currentUser={currentUser} users={users} />

        {/* Collapsible Connection troubleshooting dialog popup inside App */}
        {showMainTroubleshoot && (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-[9999] flex items-center justify-center p-4">
            <div className="bg-neutral-900 border border-neutral-800 text-white rounded-none p-6 md:p-8 max-w-lg w-full shadow-2xl relative animate-in slide-in-from-bottom duration-300">
              <button 
                onClick={() => setShowMainTroubleshoot(false)}
                className="absolute top-4 right-4 text-neutral-400 hover:text-white transition-all"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 mb-5 border-b border-neutral-800 pb-4">
                <div className={`p-2 rounded ${serverOnline ? 'bg-emerald-950 text-emerald-400' : 'bg-red-950 text-red-400'}`}>
                  {serverOnline ? <Wifi className="w-6 h-6 animate-pulse" /> : <WifiOff className="w-6 h-6 animate-bounce" />}
                </div>
                <div>
                  <h3 className="text-xs font-black tracking-[0.2em] uppercase text-neutral-400">Assistant de Connectivité</h3>
                  <h2 className="text-lg font-black uppercase text-white tracking-tight">
                    {serverOnline ? 'Système Connecté au Réseau' : 'Diagnostic de Panne Internet'}
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
                        <strong className="text-white uppercase tracking-wider">Vérifiez le Routeur Wi-Fi de la Boutique</strong><br />
                        Assurez-vous que votre périphérique (PC ou Tablette) est bien connecté au bon point d'accès Wi-Fi et que d'autres sites web sont accessibles.
                      </p>
                    </div>

                    <div className="flex gap-2.5 items-start">
                      <div className="w-5 h-5 bg-neutral-800 rounded flex items-center justify-center font-bold text-[10px] shrink-0 text-white mt-0.5">2</div>
                      <p className="text-neutral-300 leading-relaxed">
                        <strong className="text-white uppercase tracking-wider">Fonctionnalité en Cache Local Double Sécurisé</strong><br />
                        Toutes vos ventes et actions s'enregistrent en instantané localement grâce au stockage interne. Vos reçus, clients, et mouvements de caisse sont à l'abri et se synchroniseront automatiquement dès retour d'internet.
                      </p>
                    </div>

                    <div className="flex gap-2.5 items-start">
                      <div className="w-5 h-5 bg-neutral-800 rounded flex items-center justify-center font-bold text-[10px] shrink-0 text-white mt-0.5">3</div>
                      <p className="text-neutral-300 leading-relaxed">
                        <strong className="text-white uppercase tracking-wider">Désactivation de la Synergie MariaDB</strong><br />
                        Si la base de données distante est lente, accédez à la section <strong className="text-white">Gestion Équipe (Onglet Paramètres)</strong> pour désactiver l'écriture directe SQL et travailler en cache local rapide.
                      </p>
                    </div>

                    <div className="flex gap-2.5 items-start">
                      <div className="w-5 h-5 bg-neutral-800 rounded flex items-center justify-center font-bold text-[10px] shrink-0 text-white mt-0.5">4</div>
                      <p className="text-neutral-300 leading-relaxed">
                        <strong className="text-white uppercase tracking-wider">Faire un test de Reconnexion</strong><br />
                        Vous pouvez relancer manuellement un test de communication avec le serveur principal en cliquant ci-dessous.
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
                    {isPinging ? 'Test en cours...' : 'Tester la Liaison'}
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowMainTroubleshoot(false)}
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
                      ? '✓ Succès : Liaison serveur raccordée !' 
                      : '✗ Échec : Le serveur est injoignable.'}
                  </div>
                )}

              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function NavItem({ id, icon, label, active, onClick }: { id: string, icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-center lg:justify-start w-full px-4 py-3 rounded-lg transition-all duration-200 group relative ${
        active 
          ? 'bg-white text-black shadow-lg shadow-black/5' 
          : 'text-neutral-500 hover:bg-neutral-900 hover:text-white'
      }`}
    >
      {active && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-2 bg-black rounded-r-full hidden lg:block"></div>}
      <div className={`w-4 h-4 transition-transform ${active ? 'scale-110' : 'group-hover:scale-110'}`}>{icon}</div>
      <span className={`ml-4 text-[11px] hidden lg:block uppercase tracking-[0.2em] font-black ${active ? 'text-black' : ''}`}>{label}</span>
    </button>
  );
}

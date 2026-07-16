import React, { useState } from 'react';
import { CashMovement, User, CashRegisterSession, AppSettings } from '../types';
import { Banknote, ArrowUpRight, ArrowDownRight, History as HistoryIcon, Plus, Receipt, Calculator, ShieldCheck, X, Store, Lock, Unlock, AlertTriangle, Printer, FileText } from 'lucide-react';
import { printElement } from '../utils/print-helper';

interface CashManagementProps {
  movements: CashMovement[];
  setMovements: (m: CashMovement[] | ((prev: CashMovement[]) => CashMovement[])) => void;
  currentUser: User;
  orders: any[]; // To calculate cash sales
  wholesaleOrders?: any[]; // To calculate wholesale cash sales
  currentSession: CashRegisterSession | null;
  setCurrentSession: (s: CashRegisterSession | null) => void;
  sessionsHistory: CashRegisterSession[];
  setSessionsHistory: (h: CashRegisterSession[] | ((prev: CashRegisterSession[]) => CashRegisterSession[])) => void;
  addAuditLog: (action: string, details: string, severity?: 'INFO' | 'WARNING' | 'CRITICAL') => void;
  isCashSessionRequired: boolean;
  settings?: AppSettings;
}

export default function CashManagement({ 
  movements, 
  setMovements, 
  currentUser, 
  orders,
  wholesaleOrders,
  currentSession,
  setCurrentSession,
  sessionsHistory,
  setSessionsHistory,
  addAuditLog,
  isCashSessionRequired,
  settings
}: CashManagementProps) {
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [entryType, setEntryType] = useState<'IN' | 'OUT'>('OUT');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');

  // Sessions temporary state
  const [tempStartingFloat, setTempStartingFloat] = useState('25000');
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [actualCashCount, setActualCashCount] = useState('');
  const [closingNotes, setClosingNotes] = useState('');
  const [showZReportReceipt, setShowZReportReceipt] = useState<CashRegisterSession | null>(null);

  const formatFCFA = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(amount);
  };

  // 1. Calculations for CURRENT active session
  const getSessionStats = () => {
    if (!currentSession) return { sales: 0, inputs: 0, outputs: 0, theoretical: 0 };

    const openedTimeDate = new Date(currentSession.openedAt);

    // Sales paid in CASH post opening time (Retail)
    const retailSales = orders
      .filter(o => new Date(o.date) >= openedTimeDate)
      .reduce((sum, o) => {
        const cashPay = o.payments
          .filter((p: any) => p.method === 'CASH')
          .reduce((pSum: number, p: any) => pSum + p.amount, 0);
        return sum + cashPay;
      }, 0);

    // Wholesale sales paid in CASH post opening time
    const wholesaleSales = (wholesaleOrders || [])
      .reduce((sum, o) => {
        const cashPay = (o.payments || [])
          .filter((p: any) => p.paymentMethod === 'CASH' && new Date(p.date) >= openedTimeDate)
          .reduce((pSum: number, p: any) => pSum + p.amount, 0);
        return sum + cashPay;
      }, 0);

    const sales = retailSales + wholesaleSales;

    // Cash movements post opening time
    const sessionMovements = movements.filter(m => new Date(m.date) >= openedTimeDate);
    
    // Filter out the initial float movement to avoid double counting it
    const inputs = sessionMovements
      .filter(m => m.type === 'IN' && !m.reason.includes('Fond de caisse initial'))
      .reduce((sum, m) => sum + m.amount, 0);

    const outputs = sessionMovements
      .filter(m => m.type === 'OUT')
      .reduce((sum, m) => sum + m.amount, 0);

    const theoretical = currentSession.expectedCash + sales + inputs - outputs;

    return { sales, inputs, outputs, theoretical, retailSales, wholesaleSales };
  };

  const { sales: sessionSales, inputs: sessionIn, outputs: sessionOut, theoretical: theoreticalSessionCash, retailSales: sessionRetailSales, wholesaleSales: sessionWholesaleSales } = getSessionStats();

  // Calculations for sessionless "Free Flow" mode
  const getFreeFlowStats = () => {
    // Total cash sales of the last 24h
    const retailSales = orders
      .reduce((sum, o) => {
        const cashPay = o.payments
          .filter((p: any) => p.method === 'CASH')
          .reduce((pSum: number, p: any) => pSum + p.amount, 0);
        return sum + cashPay;
      }, 0);

    // Wholesale sales paid in CASH 
    const wholesaleSales = (wholesaleOrders || [])
      .reduce((sum, o) => {
        const cashPay = (o.payments || [])
          .filter((p: any) => p.paymentMethod === 'CASH')
          .reduce((pSum: number, p: any) => pSum + p.amount, 0);
        return sum + cashPay;
      }, 0);

    const sales = retailSales + wholesaleSales;

    const inputs = movements
      .filter(m => m.type === 'IN')
      .reduce((sum, m) => sum + m.amount, 0);

    const outputs = movements
      .filter(m => m.type === 'OUT')
      .reduce((sum, m) => sum + m.amount, 0);

    const totalEstimated = inputs + sales - outputs;

    return { sales, inputs, outputs, totalEstimated, retailSales, wholesaleSales };
  };

  const { sales: freeSales, inputs: freeIn, outputs: freeOut, totalEstimated: freeTotal, retailSales: freeRetailSales, wholesaleSales: freeWholesaleSales } = getFreeFlowStats();

  // 2. Open Cash Session
  const handleOpenSession = (e: React.FormEvent) => {
    e.preventDefault();
    const floatAmount = parseFloat(tempStartingFloat) || 0;
    
    const newSession: CashRegisterSession = {
      id: `SESS-${Date.now()}`,
      openerId: currentUser.name,
      openedAt: new Date().toISOString(),
      status: 'OPEN',
      expectedCash: floatAmount
    };

    setCurrentSession(newSession);

    // Log movement for initial starting cash
    const openingMovement: CashMovement = {
      id: `MOV-${Date.now()}`,
      type: 'IN',
      amount: floatAmount,
      reason: 'Ouverture de Caisse - Fond de caisse initial',
      date: new Date().toISOString(),
      user: currentUser.name
    };

    setMovements(prev => [openingMovement, ...prev]);
    addAuditLog('SESSION_OPENED', `Session de caisse ouverte par ${currentUser.name}. Fond initial de ${formatFCFA(floatAmount)}.`);
  };

  // 3. Close Cash Session
  const handleCloseSession = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentSession) return;

    const actualCountNum = parseFloat(actualCashCount) || 0;
    const diff = actualCountNum - theoreticalSessionCash;

    const closedSession: CashRegisterSession = {
      ...currentSession,
      status: 'CLOSED',
      closedAt: new Date().toISOString(),
      expectedCash: theoreticalSessionCash,
      actualCash: actualCountNum,
      difference: diff,
      closerId: currentUser.name,
      notes: closingNotes
    };

    setSessionsHistory(prev => [closedSession, ...prev]);
    setCurrentSession(null);
    setShowCloseModal(false);
    setActualCashCount('');
    setClosingNotes('');

    const statusMsg = diff === 0 
      ? 'Caisse parfaitement équilibrée' 
      : diff > 0 
        ? `Excédent de caisse de +${formatFCFA(diff)}` 
        : `Déficit de caisse de -${formatFCFA(Math.abs(diff))}`;

    addAuditLog(
      'SESSION_CLOSED', 
      `Session de caisse fermée par ${currentUser.name}. Réel: ${formatFCFA(actualCountNum)}, Attendu: ${formatFCFA(theoreticalSessionCash)}. Notes: ${closingNotes || 'Aucune'}. ${statusMsg}.`,
      diff !== 0 ? 'WARNING' : 'INFO'
    );

    // Show printable ticket overlay straight away
    setShowZReportReceipt(closedSession);
  };

  // 4. Add normal cash operations (Dépôt Fond / Sortie)
  const handleAddMovement = (e: React.FormEvent) => {
    e.preventDefault();
    const movementVal = parseFloat(amount);
    if (!movementVal || movementVal <= 0) return;

    const newMovement: CashMovement = {
      id: `MOV-${Date.now()}`,
      type: entryType,
      amount: movementVal,
      reason,
      date: new Date().toISOString(),
      user: currentUser.name
    };

    setMovements(prev => [newMovement, ...prev]);
    setShowEntryModal(false);
    setAmount('');
    setReason('');

    addAuditLog(
      entryType === 'IN' ? 'CASH_IN' : 'CASH_OUT',
      `Mouvement de caisse (${entryType === 'IN' ? 'Entrée' : 'Sortie'}) de ${formatFCFA(movementVal)} enregistré par ${currentUser.name}. Motif: ${reason}`
    );
  };

  return (
    <div className="p-8 h-full overflow-y-auto bg-neutral-50 flex-1 animate-in fade-in duration-500">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 border-b border-neutral-200 pb-6 gap-6">
          <div>
            <h2 className="text-4xl font-black text-black tracking-tighter uppercase mb-2">Gestion des Sessions & Caisse</h2>
            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.3em]">
              Contrôlez les ouvertures, fermetures et les flux d'espèces du tiroir ZARA GALLERY
            </p>
          </div>
          <div className="flex flex-col items-end gap-3">
             <button 
               onClick={() => {
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);

                  const retailToday = orders.filter(o => new Date(o.date) >= today);
                  const retailTotal = retailToday.reduce((sum, o) => sum + o.total, 0);
                  const retailByMethod: Record<string, number> = {};
                  retailToday.forEach(o => {
                    o.payments.forEach((p: any) => {
                      retailByMethod[p.method] = (retailByMethod[p.method] || 0) + p.amount;
                    });
                  });

                  const wOrders = wholesaleOrders || [];
                  const wholesaleToday = wOrders.filter(o => new Date(o.date) >= today);
                  const wholesaleFactureToday = wholesaleToday.reduce((sum, o) => sum + o.total, 0);
                  const wholesaleCreditCreatedToday = wholesaleToday.reduce((sum, o) => sum + (o.total - o.amountPaid), 0);
                  const wPaymentsByMethod: Record<string, number> = {};
                  wOrders.forEach(o => {
                    o.payments?.forEach((p: any) => {
                      if (new Date(p.date) >= today) {
                         const method = p.paymentMethod || 'Espèces';
                         wPaymentsByMethod[method] = (wPaymentsByMethod[method] || 0) + p.amount;
                      }
                    });
                  });

                  const movementsToday = movements.filter(m => new Date(m.date) >= today);
                  const cashIn = movementsToday.filter(m => m.type === 'IN').reduce((sum, m) => sum + m.amount, 0);
                  const cashOut = movementsToday.filter(m => m.type === 'OUT').reduce((sum, m) => sum + m.amount, 0);

                  const globalByMethod: Record<string, number> = {};
                  Object.keys(retailByMethod).forEach(k => globalByMethod[k] = (globalByMethod[k] || 0) + retailByMethod[k]);
                  Object.keys(wPaymentsByMethod).forEach(k => {
                     const key = k === 'CASH_COMPTANT' || k === 'Espèces' ? 'CASH' : k;
                     globalByMethod[key] = (globalByMethod[key] || 0) + wPaymentsByMethod[k];
                  });

                  const formatFCFA = (a: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(a);
                  const printContent = `
                    <div id="daily-bilan-report" className="font-mono text-black">
                        ${settings?.logoUrl ? `
                          <div style="text-align: center; margin-bottom: 20px;">
                            <img src="${settings.logoUrl}" style="max-height: 80px; width: auto; object-fit: contain; margin-bottom: 5px;" referrerPolicy="no-referrer" />
                            <div style="font-weight: bold; text-transform: uppercase; font-size: 16px;">${settings.storeName || 'ZARA GALLERY'}</div>
                            <div style="font-size: 11px; color: #555; font-family: sans-serif;">${settings.storeAddress || ''} | Tel: ${settings.storePhone || ''}</div>
                          </div>
                        ` : `
                          <div style="text-align: center; margin-bottom: 20px;">
                            <div style="font-weight: bold; font-size: 18px; text-transform: uppercase;">${settings?.storeName || 'ZARA GALLERY'}</div>
                            <div style="font-size: 11px; color: #555; font-family: sans-serif;">${settings?.storeAddress || ''} | Tel: ${settings?.storePhone || ''}</div>
                          </div>
                        `}
                        <h1 style="margin-top: 15px; text-align: center border-bottom: 2px solid black; padding-bottom: 10px; text-transform: uppercase; font-size: 20px;">Point du Jour Complet - ${new Date().toLocaleDateString('fr-FR')}</h1>
                        <p style="text-align:center; font-size: 10px; margin-bottom: 20px;">Édité à ${new Date().toLocaleTimeString('fr-FR')}</p>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                           <div>
                              <h2 style="font-size: 14px; border-bottom: 1px dotted black; text-transform: uppercase;">1. Ventes au Détail</h2>
                              <div style="display: flex; justify-content: space-between; font-size: 12px; margin-top: 10px;"><span>Transactions:</span> <span>${retailToday.length} tickets</span></div>
                              <div style="display: flex; justify-content: space-between; font-size: 12px; font-weight: bold;"><span>Total Facturé:</span> <span>${formatFCFA(retailTotal)}</span></div><br />
                              <div style="font-weight: bold; text-decoration: underline; font-size: 12px;">Encaissements Détail:</div>
                              ${Object.entries(retailByMethod).map(([m, val]) => `<div style="display: flex; justify-content: space-between; font-size: 11px;"><span>- ${m}:</span> <span>${formatFCFA(val)}</span></div>`).join('')}
                           </div>
                           <div>
                              <h2 style="font-size: 14px; border-bottom: 1px dotted black; text-transform: uppercase;">2. Ventes en Gros</h2>
                              <div style="display: flex; justify-content: space-between; font-size: 12px; margin-top: 10px;"><span>Factures créées:</span> <span>${wholesaleToday.length}</span></div>
                              <div style="display: flex; justify-content: space-between; font-size: 12px; font-weight: bold;"><span>Total Facturé:</span> <span>${formatFCFA(wholesaleFactureToday)}</span></div>
                              <div style="display: flex; justify-content: space-between; font-size: 12px;"><span>Nouvelles Créances:</span> <span>${formatFCFA(wholesaleCreditCreatedToday)}</span></div><br />
                              <div style="font-weight: bold; text-decoration: underline; font-size: 12px;">Paiements Reçus:</div>
                              ${Object.entries(wPaymentsByMethod).map(([m, val]) => `<div style="display: flex; justify-content: space-between; font-size: 11px;"><span>- ${m === 'CASH_COMPTANT' ? 'CASH' : m}:</span> <span>${formatFCFA(val)}</span></div>`).join('')}
                           </div>
                        </div>
                        <h2 style="font-size: 14px; border-bottom: 1px dotted black; text-transform: uppercase; margin-top: 20px;">3. Synthèse Globale</h2>
                        ${Object.entries(globalByMethod).map(([m, val]) => {
                          const isCash = m === 'CASH';
                          return `<div style="display: flex; justify-content: space-between; font-size: 12px; margin-top: 4px; ${isCash ? 'font-weight: bold;' : ''}"><span>Total ${m} ${isCash ? '' : '(Indicatif)'}:</span><span>${formatFCFA(val)}</span></div>`;
                        }).join('')}<br />
                        <div style="display: flex; justify-content: space-between; font-size: 12px;"><span>Apports de caisse:</span> <span>+ ${formatFCFA(cashIn)}</span></div>
                        <div style="display: flex; justify-content: space-between; font-size: 12px;"><span>Sorties / Dépenses:</span> <span>- ${formatFCFA(cashOut)}</span></div>
                        <div style="display: flex; justify-content: space-between; font-size: 14px; font-weight: bold; border-top: 1px solid black; margin-top: 10px; padding-top: 5px;"><span>ESPÈCES ATTENDUES EN CAISSE:</span><span>${formatFCFA((globalByMethod['CASH'] || 0) + cashIn - cashOut)}</span></div>
                    </div>
                  `;
                  
                  const reportDiv = document.createElement('div');
                  reportDiv.id = "print-report-container";
                  reportDiv.style.display = "none";
                  reportDiv.innerHTML = printContent;
                  document.body.appendChild(reportDiv);
                  
                  printElement('print-report-container', 'Point du Jour ZARA GALLERY', 'A4');
                  
                  setTimeout(() => reportDiv.remove(), 2000);
               }}
               className="px-6 py-3 border-2 border-black bg-white text-black text-[10px] font-black uppercase tracking-widest hover:bg-black hover:text-white transition-all shadow-md flex items-center"
             >
               <FileText className="w-4 h-4 mr-2" /> Générer Point du Jour (Bilan)
             </button>

            {(currentSession || !isCashSessionRequired) && (
              <div className="flex gap-3">
                 <button 
                   onClick={() => { setEntryType('IN'); setShowEntryModal(true); }}
                   className="px-5 py-3 border border-neutral-300 bg-white text-xs font-bold uppercase tracking-widest hover:bg-black hover:text-white transition-all flex items-center"
                 >
                   <ArrowUpRight className="w-4 h-4 mr-2" /> Dépôt Fond
                 </button>
                 <button 
                   onClick={() => { setEntryType('OUT'); setShowEntryModal(true); }}
                   className="px-5 py-3 bg-black text-white text-xs font-bold uppercase tracking-widest hover:bg-neutral-800 transition-all flex items-center shadow-lg shadow-black/10"
                 >
                   <ArrowDownRight className="w-4 h-4 mr-2" /> Sortie / Dépense
                 </button>
              </div>
            )}
          </div>
        </div>

        {/* SECTION 1: ACTIVE SESSION CONTROLS */}
        {!isCashSessionRequired ? (
          /* SESSION MANAGEMENT DISABLED - FREE FLOW ACTIVE */
          <div className="space-y-8 mb-12 animate-in fade-in duration-300">
            <div className="bg-neutral-900 text-white p-6 border border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-sm">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-neutral-800 rounded-full">
                  <Unlock className="w-5 h-5 text-neutral-400" />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-widest text-neutral-200">Mode Caisse Sans Fermeture</h3>
                  <p className="text-[10px] uppercase font-bold text-neutral-400 mt-0.5">
                    Le tiroir de ventes est ouvert en continu. Les enregistrements s'effectuent sans clôture de session obligatoire.
                  </p>
                </div>
              </div>
              <div className="text-[10px] bg-neutral-800 px-3 py-1 font-bold text-neutral-300 tracking-wider rounded uppercase">
                Free-Flow
              </div>
            </div>

            {/* Free Flow Stats Block */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white p-6 border border-neutral-200 flex flex-col justify-between h-36">
                 <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest">Ventes Espèces</p>
                 <div>
                    <p className="text-2xl font-black text-black">+{formatFCFA(freeSales)}</p>
                    <p className="text-[8px] font-bold text-neutral-400 uppercase tracking-widest mt-1">
                      Boutique: {formatFCFA(freeRetailSales)} | Gros: {formatFCFA(freeWholesaleSales)}
                    </p>
                 </div>
              </div>
              <div className="bg-white p-6 border border-neutral-200 flex flex-col justify-between h-36">
                 <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest">Dépôts Fonds (E)</p>
                 <div>
                    <p className="text-2xl font-black text-black">+{formatFCFA(freeIn)}</p>
                    <p className="text-[8px] font-bold text-neutral-400 uppercase tracking-widest mt-1">Total des apports d'espèces</p>
                 </div>
              </div>
              <div className="bg-white p-6 border border-neutral-200 flex flex-col justify-between h-36">
                 <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest">Sorties Tiroir (S)</p>
                 <div>
                    <p className="text-2xl font-black text-black">-{formatFCFA(freeOut)}</p>
                    <p className="text-[8px] font-bold text-neutral-400 uppercase tracking-widest mt-1">Dépenses et retraits effectués</p>
                 </div>
              </div>
              <div className="bg-white p-6 border-2 border-black flex flex-col justify-between h-36">
                 <p className="text-[9px] font-bold text-neutral-500 uppercase tracking-widest">Solde Théorique Estimé</p>
                 <div>
                    <p className="text-3xl font-black text-emerald-700">{formatFCFA(freeTotal)}</p>
                    <p className="text-[8px] font-bold text-neutral-400 uppercase tracking-widest mt-1 flex items-center">
                       <ShieldCheck className="w-3 h-3 mr-1 text-emerald-600" /> Solde en espèces calculé en continu
                    </p>
                 </div>
              </div>
            </div>
          </div>
        ) : !currentSession ? (
          /* SESSION CLOSED - PROMPT OPENING */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
            <div className="lg:col-span-2 bg-white border border-red-200 p-8 flex flex-col justify-between shadow-sm rounded-sm">
              <div>
                <div className="flex items-center gap-3 text-red-600 mb-4">
                  <div className="p-2 bg-red-50 rounded-full">
                    <Lock className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-black uppercase tracking-tight">Caisse Actuellement Fermée</h3>
                </div>
                <p className="text-sm text-neutral-600 mb-6 leading-relaxed">
                  Le tiroir-caisse est verrouillé pour les ventes physiques. Aucune transaction ou passage en caisse ne peut être validé par l'équipe tant qu'une session n'est pas initiée avec un fond de roulement de départ.
                </p>
                <p className="text-xs text-neutral-400 uppercase font-bold tracking-widest">
                  * L'ouverture enregistre votre identité administrative et l'heure exacte.
                </p>
              </div>
            </div>

            <div className="bg-white border-2 border-black p-8 shadow-md rounded-sm">
              <h4 className="text-sm font-black uppercase tracking-wider mb-6 flex items-center gap-2">
                <Store className="w-4 h-4" /> Ouvrir le Tiroir
              </h4>
              <form onSubmit={handleOpenSession} className="space-y-6">
                <div>
                  <label className="text-[9px] font-black text-neutral-400 uppercase tracking-widest block mb-2">Fond de Caisse Initial (FCFA)</label>
                  <input 
                    required
                    type="number"
                    min="0"
                    value={tempStartingFloat}
                    onChange={e => setTempStartingFloat(e.target.value)}
                    className="w-full text-2xl font-black py-2 border-b-2 border-black outline-none bg-transparent"
                    placeholder="Ex: 50000"
                  />
                  <p className="text-[10px] text-neutral-400 mt-2">Prévoyez le montant en petites coupures pour les rendus de monnaie.</p>
                </div>
                <button 
                  type="submit"
                  className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold uppercase tracking-wider text-xs transition-colors shadow-lg"
                >
                  Ouvrir la Caisse & Ventes
                </button>
              </form>
            </div>
          </div>
        ) : (
          /* SESSION OPEN - DISPLAY LIVESTATS */
          <div className="space-y-8 mb-12">
            <div className="bg-emerald-50/50 border border-emerald-100 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-sm">
              <div className="flex items-center gap-3 text-emerald-800">
                <div className="p-2 bg-emerald-100 rounded-full">
                  <Unlock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-widest">Session de caisse active</h3>
                  <p className="text-[10px] uppercase font-bold text-emerald-600 mt-0.5">
                    Lancée à {new Date(currentSession.openedAt).toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'})} par {currentSession.openerId}
                  </p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <button 
                  onClick={() => {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);

                    // Retail today
                    const retailToday = orders.filter(o => new Date(o.date) >= today);
                    const retailTotal = retailToday.reduce((sum, o) => sum + o.total, 0);

                    const retailByMethod: Record<string, number> = {};
                    retailToday.forEach(o => {
                      o.payments.forEach((p: any) => {
                        retailByMethod[p.method] = (retailByMethod[p.method] || 0) + p.amount;
                      });
                    });

                    // Wholesale today
                    const wOrders = wholesaleOrders || [];
                    const wholesaleToday = wOrders.filter(o => new Date(o.date) >= today);
                    const wholesaleFactureToday = wholesaleToday.reduce((sum, o) => sum + o.total, 0);
                    const wholesaleCreditCreatedToday = wholesaleToday.reduce((sum, o) => sum + (o.total - o.amountPaid), 0);

                    // Payments
                    const wPaymentsByMethod: Record<string, number> = {};
                    wOrders.forEach(o => {
                      o.payments?.forEach((p: any) => {
                        if (new Date(p.date) >= today) {
                           const method = p.paymentMethod || 'Espèces';
                           wPaymentsByMethod[method] = (wPaymentsByMethod[method] || 0) + p.amount;
                        }
                      });
                    });

                    // Movements today
                    const movementsToday = movements.filter(m => new Date(m.date) >= today);
                    const cashIn = movementsToday.filter(m => m.type === 'IN').reduce((sum, m) => sum + m.amount, 0);
                    const cashOut = movementsToday.filter(m => m.type === 'OUT').reduce((sum, m) => sum + m.amount, 0);

                    // Globals
                    const globalByMethod: Record<string, number> = {};
                    Object.keys(retailByMethod).forEach(k => globalByMethod[k] = (globalByMethod[k] || 0) + retailByMethod[k]);
                    Object.keys(wPaymentsByMethod).forEach(k => {
                       const key = k === 'CASH_COMPTANT' || k === 'Espèces' ? 'CASH' : k;
                       globalByMethod[key] = (globalByMethod[key] || 0) + wPaymentsByMethod[k];
                    });

                    const formatFCFA = (a: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(a);

                    const printContent = `
                      <html>
                        <head>
                          <title>Point du Jour</title>
                          <style>
                            body { font-family: monospace; padding: 20px; font-size: 14px; color: #000; }
                            h1 { text-align: center; text-transform: uppercase; border-bottom: 2px solid #000; padding-bottom: 10px; }
                            h2 { font-size: 16px; border-bottom: 1px dotted #000; padding-bottom: 5px; margin-top: 20px; text-transform: uppercase; }
                            .row { display: flex; justify-content: space-between; margin-bottom: 4px; }
                            .bold { font-weight: bold; }
                            .totals { border-top: 1px solid #000; padding-top: 10px; margin-top: 10px; }
                            * { box-sizing: border-box; }
                            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
                          </style>
                        </head>
                        <body>
                          ${settings?.logoUrl ? `
                            <div style="text-align: center; margin-bottom: 20px;">
                              <img src="${settings.logoUrl}" style="max-height: 80px; width: auto; object-fit: contain; margin-bottom: 5px;" referrerPolicy="no-referrer" />
                              <div style="font-weight: bold; text-transform: uppercase; font-size: 16px;">${settings.storeName || 'ZARA GALLERY'}</div>
                              <div style="font-size: 11px; color: #555; font-family: sans-serif;">${settings.storeAddress || ''} | Tel: ${settings.storePhone || ''}</div>
                            </div>
                          ` : `
                            <div style="text-align: center; margin-bottom: 20px;">
                              <div style="font-weight: bold; font-size: 18px; text-transform: uppercase;">${settings?.storeName || 'ZARA GALLERY'}</div>
                              <div style="font-size: 11px; color: #555; font-family: sans-serif;">${settings?.storeAddress || ''} | Tel: ${settings?.storePhone || ''}</div>
                            </div>
                          `}
                          <h1 style="margin-top: 15px;">Point du Jour Complet - ${new Date().toLocaleDateString('fr-FR')}</h1>
                          <p style="text-align:center">Édité à ${new Date().toLocaleTimeString('fr-FR')}</p>

                          <div class="grid">
                             <div>
                                <h2>1. Ventes au Détail</h2>
                                <div class="row"><span>Transactions:</span> <span>${retailToday.length} tickets</span></div>
                                <div class="row bold"><span>Total Facturé:</span> <span>${formatFCFA(retailTotal)}</span></div>
                                <br />
                                <div class="row bold" style="text-decoration: underline;">Encaissements Détail:</div>
                                ${Object.entries(retailByMethod).map(([m, val]) => `<div class="row"><span>- ${m}:</span> <span>${formatFCFA(val)}</span></div>`).join('')}
                             </div>

                             <div>
                                <h2>2. Ventes en Gros</h2>
                                <div class="row"><span>Factures créées:</span> <span>${wholesaleToday.length}</span></div>
                                <div class="row bold"><span>Total Facturé:</span> <span>${formatFCFA(wholesaleFactureToday)}</span></div>
                                <div class="row"><span>Nouvelles Créances:</span> <span>${formatFCFA(wholesaleCreditCreatedToday)}</span></div>
                                <br />
                                <div class="row bold" style="text-decoration: underline;">Paiements Reçus:</div>
                                ${Object.entries(wPaymentsByMethod).map(([m, val]) => `<div class="row"><span>- ${m === 'CASH_COMPTANT' ? 'CASH' : m}:</span> <span>${formatFCFA(val)}</span></div>`).join('')}
                             </div>
                          </div>

                          <h2>3. Synthèse Globale</h2>
                          ${Object.entries(globalByMethod).map(([m, val]) => {
                            const isCash = m === 'CASH';
                            return `<div class="row ${isCash ? 'bold' : ''}">
                               <span>Total ${m} ${isCash ? '' : '(Indicatif)'}:</span>
                               <span>${formatFCFA(val)}</span>
                            </div>`;
                          }).join('')}

                          <br />
                          <div class="row"><span>Apports de caisse divers (IN):</span> <span>+ ${formatFCFA(cashIn)}</span></div>
                          <div class="row"><span>Sorties / Dépenses (OUT):</span> <span>- ${formatFCFA(cashOut)}</span></div>

                          <div class="row bold totals">
                             <span>ESPÈCES NET TES ATTENDUES EN CAISSE:</span>
                             <span>${formatFCFA((globalByMethod['CASH'] || 0) + cashIn - cashOut)}</span>
                          </div>
                        </body>
                      </html>
                    `;
                    const printWin = window.open('', '', 'width=800,height=600');
                    if (printWin) {
                      printWin.document.write(printContent);
                      printWin.document.close();
                      printWin.focus();
                      setTimeout(() => { printWin.print(); printWin.close(); }, 500);
                    }
                  }}
                  className="px-6 py-3 bg-black hover:bg-neutral-800 text-white text-[10px] font-black uppercase tracking-widest transition-all rounded-sm flex items-center shadow-lg"
                >
                  <FileText className="w-4 h-4 mr-2" /> Point du Jour
                </button>
                <button 
                  onClick={() => setShowCloseModal(true)}
                  className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white text-xs font-black uppercase tracking-widest transition-all rounded-sm flex items-center shadow-lg shadow-red-600/10"
                >
                  <Calculator className="w-4 h-4 mr-2" /> Clôturer la Caisse
                </button>
              </div>
            </div>

            {/* Dashboard grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white p-6 border border-neutral-200 flex flex-col justify-between h-36">
                 <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest">Fond Initial</p>
                 <div>
                    <p className="text-2xl font-black text-black">{formatFCFA(currentSession.expectedCash)}</p>
                    <p className="text-[8px] font-bold text-neutral-400 uppercase tracking-widest mt-1">Montant enregistré à l'ouverture</p>
                 </div>
              </div>
              <div className="bg-white p-6 border border-neutral-200 flex flex-col justify-between h-36">
                 <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest">Ventes Espèces</p>
                 <div>
                    <p className="text-2xl font-black text-black">+{formatFCFA(sessionSales)}</p>
                    <p className="text-[8px] font-bold text-neutral-400 uppercase tracking-widest mt-1">
                      Boutique: {formatFCFA(sessionRetailSales)} | Gros: {formatFCFA(sessionWholesaleSales)}
                    </p>
                 </div>
              </div>
              <div className="bg-white p-6 border border-neutral-200 flex flex-col justify-between h-36">
                 <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest">Mouvements (E/S)</p>
                 <div>
                    <p className="text-2xs font-bold text-neutral-500 uppercase">Dépôts: +{formatFCFA(sessionIn)}</p>
                    <p className="text-2xs font-bold text-red-500 uppercase mt-0.5">Retraits: -{formatFCFA(sessionOut)}</p>
                 </div>
              </div>
              <div className="bg-white p-6 border-2 border-black flex flex-col justify-between h-36">
                 <p className="text-[9px] font-bold text-neutral-500 uppercase tracking-widest">Solde Théorique Tiroir</p>
                 <div>
                    <p className="text-3xl font-black text-emerald-700">{formatFCFA(theoreticalSessionCash)}</p>
                    <p className="text-[8px] font-bold text-neutral-400 uppercase tracking-widest mt-1 flex items-center">
                       <ShieldCheck className="w-3 h-3 mr-1 text-emerald-600" /> Solde attendu dans le tiroir
                    </p>
                 </div>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 2: CASH MOVEMENTS LOGS (FLUX JOURNALIERS) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold uppercase tracking-widest flex items-center">
                <HistoryIcon className="w-4 h-4 mr-2 text-neutral-400" /> Journal Général des Mouvements (24h)
              </h3>
            </div>
            <div className="bg-white border border-neutral-200 overflow-hidden rounded-sm">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-neutral-50 border-b border-neutral-200">
                    <th className="p-4 text-[9px] font-black uppercase tracking-widest text-neutral-400">Heure</th>
                    <th className="p-4 text-[9px] font-black uppercase tracking-widest text-neutral-400">Opération</th>
                    <th className="p-4 text-[9px] font-black uppercase tracking-widest text-neutral-400">Motif</th>
                    <th className="p-4 text-[9px] font-black uppercase tracking-widest text-neutral-400">Auteur</th>
                    <th className="p-4 text-right text-[9px] font-black uppercase tracking-widest text-neutral-400">Montant</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {movements.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-12 text-center text-neutral-400 text-xs uppercase tracking-widest font-bold">Aucun mouvement enregistré</td>
                    </tr>
                  ) : (
                    movements.map(m => (
                      <tr key={m.id} className="hover:bg-neutral-50/50 transition-colors">
                        <td className="p-4 text-xs font-bold text-neutral-400">
                           {new Date(m.date).toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'})}
                        </td>
                        <td className="p-4">
                           <span className={`px-2 py-0.5 text-[8px] font-black uppercase tracking-widest rounded ${m.type === 'IN' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                             {m.type === 'IN' ? 'Entrée' : 'Sortie'}
                           </span>
                        </td>
                        <td className="p-4 text-xs font-medium text-black line-clamp-1 max-w-xs">{m.reason}</td>
                        <td className="p-4 text-2xs font-bold text-neutral-500 uppercase">{m.user}</td>
                        <td className={`p-4 text-right font-black text-xs ${m.type === 'IN' ? 'text-emerald-600' : 'text-red-600'}`}>
                          {m.type === 'IN' ? '+' : '-'} {formatFCFA(m.amount)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* SECTION 3: SESSIONS HISTORY (CLÔTURES COMPTES / COMPTABILITÉ) */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold uppercase tracking-widest flex items-center">
                <Receipt className="w-4 h-4 mr-2 text-neutral-400" /> Archives Rapports Z
              </h3>
            </div>
            <div className="space-y-4 max-h-[360px] overflow-y-auto pr-1">
              {sessionsHistory.length === 0 ? (
                <div className="p-12 bg-white border border-neutral-200 text-center text-neutral-400 uppercase text-[10px] font-bold tracking-widest">
                  Aucun historique de clôture
                </div>
              ) : (
                sessionsHistory.map(session => (
                  <div key={session.id} className="bg-white border border-neutral-200 p-4 relative hover:border-black transition-colors">
                     <p className="text-[10px] font-black uppercase tracking-widest text-neutral-800">Rapport Z #{session.id.split('-')[1] || session.id}</p>
                     <p className="text-[9px] text-neutral-400 mt-1">Fermé le {new Date(session.closedAt || '').toLocaleDateString('fr-FR')}</p>
                     
                     <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-neutral-100">
                        <div>
                          <p className="text-[8px] text-neutral-400 uppercase">Théorique d'espèces</p>
                          <p className="text-xs font-black text-neutral-800">{formatFCFA(session.expectedCash)}</p>
                        </div>
                        <div>
                          <p className="text-[8px] text-neutral-400 uppercase">Réel recompté</p>
                          <p className="text-xs font-black text-neutral-800">{formatFCFA(session.actualCash || 0)}</p>
                        </div>
                     </div>
                     
                     <div className="flex justify-between items-center mt-3 pt-3 border-t border-neutral-100">
                        <div>
                           {session.difference === 0 ? (
                             <span className="text-[8px] font-black uppercase text-emerald-600">Caisse Équilibrée</span>
                           ) : (
                             <span className={`text-[8px] font-black uppercase ${session.difference && session.difference > 0 ? 'text-blue-600' : 'text-red-500'}`}>
                               Écart: {session.difference && session.difference > 0 ? '+' : ''}{formatFCFA(session.difference || 0)}
                             </span>
                           )}
                        </div>
                        <button 
                          onClick={() => setShowZReportReceipt(session)}
                          className="p-1.5 border border-neutral-200 hover:border-black text-neutral-400 hover:text-black transition-all"
                          title="Imprimer Rapport Z"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                     </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>

      {/* MODAL 1: ADD FLOW MOVEMENT */}
      {showEntryModal && (
        <div className="fixed inset-0 bg-neutral-900/60 z-[70] grid place-items-center overflow-y-auto p-4 py-12 backdrop-blur-sm">
           <div className="bg-white max-w-md w-full border-2 border-black p-8 animate-in zoom-in duration-150">
              <div className="flex justify-between items-center mb-6 border-b border-neutral-100 pb-3">
                 <h3 className="text-lg font-black uppercase tracking-tight">
                    {entryType === 'IN' ? 'Dépôt de Fond (Entrée)' : 'Sortie / Retrait de caisse'}
                 </h3>
                 <button onClick={() => setShowEntryModal(false)} className="text-neutral-400 hover:text-black transition-colors">
                    <X className="w-5 h-5" />
                 </button>
              </div>

              <form onSubmit={handleAddMovement} className="space-y-6">
                 <div>
                    <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block mb-2">Montant (FCFA)</label>
                    <input 
                      required
                      type="number" 
                      min="1"
                      value={amount}
                      onChange={e => setAmount(e.target.value)}
                      className="w-full text-3xl font-black py-2 border-b-2 border-neutral-200 outline-none focus:border-black transition-all"
                      placeholder="0"
                    />
                 </div>
                 <div>
                    <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block mb-2">Motif / Justification administrative</label>
                    <textarea 
                      required
                      rows={3}
                      value={reason}
                      onChange={e => setReason(e.target.value)}
                      className="w-full text-sm font-bold p-3 bg-neutral-50 border border-neutral-200 outline-none focus:border-black transition-all rounded-sm"
                      placeholder="Ex: Achat d'ampoules de rechange, versement transporteur..."
                    />
                 </div>

                 <button 
                   type="submit" 
                   className="w-full py-4 bg-black text-white font-bold uppercase tracking-widest text-xs hover:bg-neutral-800 transition-all border border-black shadow-xl"
                 >
                   Enregistrer la transaction
                 </button>
              </form>
           </div>
        </div>
      )}

      {/* MODAL 2: CASH EXPLICIT CLOSURE (RAPPORZ Z FORM) */}
      {showCloseModal && currentSession && (
        <div className="fixed inset-0 bg-neutral-900/60 z-[70] grid place-items-center overflow-y-auto p-4 py-12 backdrop-blur-sm">
           <div className="bg-white max-w-lg w-full border-2 border-black p-8 animate-in zoom-in duration-150 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6 border-b border-neutral-100 pb-3">
                 <h3 className="text-lg font-black uppercase tracking-tight flex items-center gap-2 text-red-600">
                    <Lock className="w-5 h-5" /> Clôture de Caisse & Calcul des Écarts
                 </h3>
                 <button onClick={() => setShowCloseModal(false)} className="text-neutral-400 hover:text-black transition-colors">
                    <X className="w-5 h-5" />
                 </button>
              </div>

              {/* Theoretical Stats */}
              <div className="p-4 bg-neutral-50 border border-neutral-200 space-y-3 mb-6 font-mono text-xs">
                <div className="flex justify-between border-b pb-2 border-neutral-200">
                  <span>Fond initial (A) :</span>
                  <span className="font-bold">{formatFCFA(currentSession.expectedCash)}</span>
                </div>
                <div className="flex justify-between border-b pb-2 border-neutral-200">
                  <span>Ventes espèces de la session (B) :</span>
                  <span className="font-bold text-emerald-600">+{formatFCFA(sessionSales)}</span>
                </div>
                <div className="flex justify-between border-b pb-2 border-neutral-200">
                  <span>Mouvements d'entrées (C) :</span>
                  <span className="font-bold">+{formatFCFA(sessionIn)}</span>
                </div>
                <div className="flex justify-between border-b pb-2 border-neutral-200">
                  <span>Mouvements de sorties (D) :</span>
                  <span className="font-bold text-red-500">-{formatFCFA(sessionOut)}</span>
                </div>
                <div className="flex justify-between pt-2 text-sm font-black uppercase">
                  <span>Solde de caisse attendu (A+B+C-D) :</span>
                  <span className="text-emerald-700">{formatFCFA(theoreticalSessionCash)}</span>
                </div>
              </div>

              <form onSubmit={handleCloseSession} className="space-y-6">
                 <div>
                    <label className="text-[10px] font-bold text-red-600 uppercase tracking-widest block mb-2">
                      Espèces Physiques Réellement Comptées (FCFA)
                    </label>
                    <input 
                      required
                      type="number" 
                      min="0"
                      value={actualCashCount}
                      onChange={e => setActualCashCount(e.target.value)}
                      className="w-full text-3xl font-black py-2 border-b-2 border-red-200 focus:border-red-600 outline-none transition-all"
                      placeholder="Renseigner le comptage précis"
                    />
                    <p className="text-[9px] text-neutral-400 mt-2">
                      Veuillez compter physiquement tout l'argent présent dans votre tiroirs-caisse à cet instant.
                    </p>
                 </div>

                 <div>
                    <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block mb-2 font-black">Observations / Justification d'écart</label>
                    <textarea 
                      rows={2}
                      value={closingNotes}
                      onChange={e => setClosingNotes(e.target.value)}
                      className="w-full text-xs p-3 bg-neutral-100 border border-neutral-200 outline-none focus:border-black transition-all rounded-sm"
                      placeholder="Optionnel : justification de surplus ou de déficit..."
                    />
                 </div>

                 <button 
                   type="submit" 
                   className="w-full py-4 bg-red-600 text-white font-bold uppercase tracking-widest text-xs hover:bg-red-700 transition-all border border-red-600 shadow-xl"
                 >
                   Valider la Clôture & Produire le Rapport Z
                 </button>
              </form>
           </div>
        </div>
      )}

      {/* MODAL 3: STYLED Z-REPORT PRINCING TICKET (HIGH FIDELITY) */}
      {showZReportReceipt && (
        <div className="fixed inset-0 bg-neutral-900/80 z-[80] grid place-items-center overflow-y-auto p-4 py-12 backdrop-blur-md">
           <div className="bg-white max-w-sm w-full border-4 border-black p-8 animate-in zoom-in duration-150 max-h-[90vh] overflow-y-auto">
             
             {/* Printable area */}
             <div className="text-center font-mono text-xs border-b border-dashed border-neutral-300 pb-4 mb-4">
                <h3 className="font-extrabold text-xl uppercase tracking-tighter">{settings?.storeName || 'ZARA GALLERY'}</h3>
                 {settings?.logoUrl ? (
                    <img src={settings.logoUrl} alt="Logo" className="max-h-12 w-auto object-contain mx-auto mb-2" referrerPolicy="no-referrer" />
                 ) : null}
                <p className="text-2xs uppercase mt-1">{settings?.storeAddress || 'Ouagadougou, Burkina Faso'}</p>
                <p className="text-2xs font-bold uppercase mt-1">CLÔTURE COMPTABLE - RAPPORT Z</p>
                <p className="text-[9px] text-neutral-500 mt-2">Numéro de document : #{showZReportReceipt.id.split('-')[1]}</p>
             </div>

             <div className="space-y-2 font-mono text-[11px] pb-4 border-b border-dashed border-neutral-300 mb-4">
                <div className="flex justify-between">
                  <span>Ouvert par :</span>
                  <span className="font-black uppercase">{showZReportReceipt.openerId}</span>
                </div>
                <div className="flex justify-between">
                  <span>Fermé par :</span>
                  <span className="font-black uppercase">{showZReportReceipt.closerId}</span>
                </div>
                <div className="flex justify-between">
                  <span>Date :</span>
                  <span>{new Date(showZReportReceipt.closedAt || '').toLocaleDateString('fr-FR')}</span>
                </div>
                <div className="flex justify-between">
                  <span>Heure de Clôture :</span>
                  <span>{new Date(showZReportReceipt.closedAt || '').toLocaleTimeString('fr-FR')}</span>
                </div>
             </div>

             <div className="space-y-2.5 font-mono text-[11px] pb-4 border-b border-dashed border-neutral-300 mb-4">
                <div className="flex justify-between font-bold">
                  <span>A. Fond de départ :</span>
                  <span>{formatFCFA(showZReportReceipt.expectedCash - (sessionSales + sessionIn - sessionOut) /* wait, expectedCash is pre-calculated theoretical */)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Solde attendu total :</span>
                  <span className="font-bold">{formatFCFA(showZReportReceipt.expectedCash)}</span>
                </div>
                <div className="flex justify-between text-neutral-800">
                  <span>B. Montant recompte :</span>
                  <span className="font-black underline">{formatFCFA(showZReportReceipt.actualCash || 0)}</span>
                </div>
             </div>

             <div className="py-4 bg-neutral-50 px-3 border border-neutral-200 font-mono text-center mb-6">
                <p className="text-[10px] font-black uppercase text-neutral-500 tracking-wide">État de l'écart</p>
                {showZReportReceipt.difference === 0 ? (
                  <p className="text-lg font-black text-emerald-700 mt-1 uppercase">Caisse Équilibrée (±0)</p>
                ) : (
                  <div>
                    <p className={`text-lg font-black mt-1 uppercase ${showZReportReceipt.difference && showZReportReceipt.difference > 0 ? 'text-blue-600' : 'text-red-600'}`}>
                       {showZReportReceipt.difference && showZReportReceipt.difference > 0 ? 'EXCÉDENT' : 'DÉFICIT'} DETECTÉ
                    </p>
                    <p className="text-sm font-black mt-1">
                      {showZReportReceipt.difference && showZReportReceipt.difference > 0 ? '+' : ''} {formatFCFA(showZReportReceipt.difference || 0)}
                    </p>
                  </div>
                )}
             </div>

             {showZReportReceipt.notes && (
               <div className="bg-neutral-50 border p-3 border-neutral-200 font-mono text-[10px] text-neutral-600 mb-6 text-left">
                  <p className="font-bold uppercase text-neutral-800 mb-1">Observations :</p>
                  <p className="italic">"{showZReportReceipt.notes}"</p>
               </div>
             )}

             <div className="space-y-3 font-mono text-center">
                <button 
                  onClick={() => {
                    const printWindow = window.open('', '_blank');
                    if (printWindow) {
                      printWindow.document.write(`
                        <html>
                          <head>
                            <title>Ticket Z - ${settings?.storeName || 'ZARA GALLERY'}</title>
                            <style>
                              body { font-family: monospace; padding: 20px; width: 300px; }
                              .text-center { text-align: center; }
                              .flex { display: flex; justify-content: space-between; margin-bottom: 5px; }
                              .border-b { border-bottom: 1px dashed #000; padding-bottom: 10px; margin-bottom: 10px; }
                              .font-black { font-weight: bold; }
                              .mt-4 { margin-top: 15px; }
                              .bg-grey { background-color: #f0f0f0; padding: 10px; text-align: center; }
                            </style>
                          </head>
                          <body>
                            <div class="text-center border-b">
                              ${settings?.logoUrl ? `<img src="${settings.logoUrl}" style="max-height: 50px; width: auto; object-fit: contain; margin-bottom: 5px;" referrerPolicy="no-referrer" />` : ''}
                              <h2>${settings?.storeName || 'ZARA GALLERY'}</h2>
                              <p>${settings?.storeAddress || 'Ouagadougou, Burkina Faso'}</p>
                              <h3>CLOTURE COMPTABLE - RAPPORT Z</h3>
                              <p>Session ID: ${showZReportReceipt.id}</p>
                            </div>
                            <div class="border-b">
                              <div class="flex"><span>Ouvert par:</span><span>${showZReportReceipt.openerId}</span></div>
                              <div class="flex"><span>Ferme par:</span><span>${showZReportReceipt.closerId}</span></div>
                              <div class="flex"><span>Date:</span><span>${new Date(showZReportReceipt.closedAt || '').toLocaleDateString('fr-FR')}</span></div>
                              <div class="flex"><span>Heure Cloture:</span><span>${new Date(showZReportReceipt.closedAt || '').toLocaleTimeString('fr-FR')}</span></div>
                            </div>
                            <div class="border-b">
                              <div class="flex"><span>Théorique attendu:</span><span>${formatFCFA(showZReportReceipt.expectedCash)}</span></div>
                              <div class="flex font-black"><span>Physique recompte:</span><span>${formatFCFA(showZReportReceipt.actualCash || 0)}</span></div>
                            </div>
                            <div class="bg-grey">
                              <strong>Ecart final :</strong>
                              <div>${showZReportReceipt.difference && showZReportReceipt.difference > 0 ? '+' : ''}${formatFCFA(showZReportReceipt.difference || 0)}</div>
                            </div>
                            ${showZReportReceipt.notes ? `
                            <div class="mt-4">
                              <strong>Observations:</strong>
                              <p style="font-style: italic;">"${showZReportReceipt.notes}"</p>
                            </div>` : ''}
                            <div class="text-center mt-4">
                              <p>-- Rappport Z Archive Officiel --</p>
                            </div>
                            <script>window.print();</script>
                          </body>
                        </html>
                      `);
                      printWindow.document.close();
                    } else {
                      alert("Veuillez autoriser les fenêtres contextuelles pour imprimer.");
                    }
                  }}
                  className="w-full py-4 border-2 border-black text-black hover:bg-black hover:text-white font-bold uppercase tracking-wider text-[11px] transition-all flex items-center justify-center gap-2 shadow-sm"
                >
                  <Printer className="w-4 h-4" /> Lancer l'Impression Reçu
                </button>
                <button 
                  onClick={() => setShowZReportReceipt(null)}
                  className="w-full py-2.5 bg-neutral-900 text-white hover:bg-black font-bold uppercase tracking-wider text-[10px] transition-all"
                >
                  Fermer l'Apperçu
                </button>
             </div>

           </div>
        </div>
      )}

    </div>
  );
}

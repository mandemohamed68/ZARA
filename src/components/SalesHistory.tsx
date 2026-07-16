import React, { useState, useMemo } from 'react';
import { Order, User, AppSettings, getPaymentMethodLabel } from '../types';
import { printElement } from '../utils/print-helper';
import { ReceiptText, Search, User as UserIcon, Calendar, ArrowRight, Printer, Download, X } from 'lucide-react';

function oklchToHsl(oklchStr: string): string {
  const match = oklchStr.match(/oklch\(([^)]+)\)/i);
  if (!match) return 'rgb(120, 120, 120)';
  
  const content = match[1].trim();
  const parts = content.split('/');
  const colorPart = parts[0].trim();
  const alphaPart = parts[1] ? parts[1].trim() : null;
  
  const colorVals = colorPart.split(/[\s,]+/);
  if (colorVals.length < 3) return 'rgb(120, 120, 120)';
  
  let lVal = colorVals[0];
  let l = parseFloat(lVal);
  if (lVal.includes('%')) {
    l = l / 100;
  }
  if (isNaN(l)) l = 0.5;
  l = Math.max(0, Math.min(1, l));
  
  let cVal = colorVals[1];
  let c = parseFloat(cVal);
  if (cVal.includes('%')) {
    c = c / 100;
  }
  if (isNaN(c)) c = 0;
  
  let hVal = colorVals[2];
  let h = 0;
  if (hVal.toLowerCase() !== 'none') {
    h = parseFloat(hVal);
    if (isNaN(h)) h = 0;
  }
  
  const hslL = l * 100;
  const hslS = Math.min(100, Math.round(c * 250));
  
  if (alphaPart) {
    let a = parseFloat(alphaPart);
    if (alphaPart.includes('%')) {
      a = a / 100;
    }
    if (isNaN(a)) a = 1;
    a = Math.max(0, Math.min(1, a));
    return `hsla(${Math.round(h)}, ${hslS}%, ${Math.round(hslL)}%, ${a})`;
  }
  
  return `hsl(${Math.round(h)}, ${hslS}%, ${Math.round(hslL)}%)`;
}

function cleanOklchStylesForHtml2Canvas(clonedDoc: Document) {
  // 1. Hide elements with 'print:hidden' class inline to guarantee they won't render, and clean inline styles
  const elements = clonedDoc.getElementsByTagName('*');
  for (let i = 0; i < elements.length; i++) {
    const el = elements[i] as HTMLElement;
    let node: HTMLElement | null = el;
    let isHidden = false;
    while (node) {
      if (node.classList && node.classList.contains('print:hidden')) {
        isHidden = true;
        break;
      }
      node = node.parentElement;
    }
    
    if (isHidden) {
      el.style.setProperty('display', 'none', 'important');
      continue;
    }
    
    const styleAttr = el.getAttribute('style');
    if (styleAttr && styleAttr.includes('oklch')) {
      const cleaned = styleAttr.replace(/oklch\([^)]+\)/gi, (match) => {
        try {
          return oklchToHsl(match);
        } catch (e) {
          return 'inherit';
        }
      });
      el.setAttribute('style', cleaned);
    }
  }

  // 2. Extract public styles and inline them without oklch references
  let combinedCss = '';
  try {
    const sheets = window.document.styleSheets;
    for (let i = 0; i < sheets.length; i++) {
      try {
        const sheet = sheets[i];
        const rules = sheet.cssRules || sheet.rules;
        if (!rules) continue;
        for (let j = 0; j < rules.length; j++) {
          combinedCss += rules[j].cssText + '\n';
        }
      } catch (e) {
        // Handle cross-origin stylesheet reading restriction gracefully
      }
    }
  } catch (e) {
    console.error("Error reading styleSheets", e);
  }

  // If we couldn't get combined CSS rules, fall back to reading text content from style tags
  if (!combinedCss) {
    const originalStyles = window.document.querySelectorAll('style');
    originalStyles.forEach(s => {
      combinedCss += (s.textContent || '') + '\n';
    });
  }

  // Remove oklch references from the CSS
  if (combinedCss && combinedCss.includes('oklch')) {
    combinedCss = combinedCss.replace(/oklch\([^)]+\)/gi, (match) => {
      try {
        return oklchToHsl(match);
      } catch (e) {
        return 'inherit';
      }
    });
  }

  // Remove existing styles & stylesheets in cloned document to prevent html2canvas parsing original styles
  const clonedStylesAndLinks = clonedDoc.querySelectorAll('style, link[rel="stylesheet"]');
  clonedStylesAndLinks.forEach(node => {
    node.parentNode?.removeChild(node);
  });

  // Inject our beautifully cleaned CSS
  const newStyleTag = clonedDoc.createElement('style');
  newStyleTag.textContent = combinedCss;
  clonedDoc.head.appendChild(newStyleTag);
}

interface SalesHistoryProps {
  orders: Order[];
  wholesaleOrders?: any[];
  wholesalers?: any[];
  currentUser: User;
  users: User[];
  settings?: AppSettings;
}

export default function SalesHistory({ orders, wholesaleOrders = [], wholesalers = [], currentUser, users, settings }: SalesHistoryProps) {
  const [activeTab, setActiveTab] = useState<'RETAIL' | 'WHOLESALE'>('RETAIL');
  // Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [cashierFilter, setCashierFilter] = useState('');
  
  // Print modal state
  const [selectedOrderToPrint, setSelectedOrderToPrint] = useState<Order | null>(null);

  const isAdmin = currentUser.role === 'ADMIN';
  const isManager = currentUser.role === 'MANAGER';
  const roleTitle = isAdmin ? "Accès Admin: Tout voir" : isManager ? "Accès Manager: Vue globale" : "Accès Personnel: Vos ventes";

  // Deduplicate cashier names for the filter dropdown
  const uniqueCashiers = Array.from(new Set(orders.map(o => o.cashier)));

  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      // 1. Role-based access logic
      if (!isManager && !isAdmin) {
        // Cashiers only see their own tickets
        if (order.cashier !== currentUser.name) return false;
      }
      // Note: By original prompt, Manager sees all cashiers & themselves. Admin sees all.
      // E.g., if there's restrictions where managers don't see admins, we would filter here.
      // But for simplicity, Manager and Admin see all orders in the list, then can filter down.

      // 2. Filters
      if (startDate) {
        if (order.date.split('T')[0] < startDate) return false;
      }
      if (endDate) {
        if (order.date.split('T')[0] > endDate) return false;
      }

      if (cashierFilter && order.cashier !== cashierFilter) {
        return false;
      }

      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        if (!order.id.toLowerCase().includes(term) && !order.customer?.name.toLowerCase().includes(term)) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [orders, currentUser, isAdmin, isManager, startDate, endDate, cashierFilter, searchTerm]);

  const filteredWholesaleOrders = useMemo(() => {
    return wholesaleOrders.filter(order => {
      // 1. Filters
      if (startDate) {
        if (order.date.split('T')[0] < startDate) return false;
      }
      if (endDate) {
        if (order.date.split('T')[0] > endDate) return false;
      }

      const w = wholesalers.find(w => w.id === order.wholesalerId);
      
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        if (!order.id.toLowerCase().includes(term) && !(w?.companyName.toLowerCase().includes(term))) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [wholesaleOrders, wholesalers, startDate, endDate, searchTerm]);

  const totalFilteredRevenue = activeTab === 'RETAIL' 
    ? filteredOrders.reduce((sum, o) => sum + o.total, 0)
    : filteredWholesaleOrders.reduce((sum, o) => sum + o.total, 0);

  const formatFCFA = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(amount);
  };

  const handlePrintReceipt = (order: Order) => {
    setSelectedOrderToPrint(order);
  };

  const confirmPrintA4 = () => {
    printElement('receipt-content-history', 'Reçu ZARA GALLERY', 'A4');
  };

  const confirmPrint58 = () => {
    printElement('receipt-content-history', 'Reçu ZARA GALLERY', '58mm');
  };

  const handleExportCSV = () => {
    if (filteredOrders.length === 0) return;

    // Build CSV headers
    const headers = ['Order ID', 'Date', 'Cashier', 'Total Amount', 'Tax', 'Discount'];
    
    // Build CSV rows
    const rows = filteredOrders.map(o => {
      const dateStr = new Date(o.date).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }).replace(',', '');
      return [
        o.id,
        dateStr,
        o.cashier || '',
        o.total || 0,
        o.tax || 0,
        o.discountTotal || 0
      ].join(',');
    });

    const csvContent = headers.join(',') + '\n' + rows.join('\n');
    const encodedUri = encodeURI(`data:text/csv;charset=utf-8,\uFEFF${csvContent}`);
    
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `zara_sales_history_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-8 h-full overflow-y-auto bg-white flex-1 animate-in fade-in duration-500">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 border-b border-neutral-100 pb-8 gap-6">
          <div>
            <h2 className="text-4xl font-black text-black tracking-tighter uppercase mb-2 flex items-center gap-4">
              <ReceiptText className="w-10 h-10" /> Historique des Ventes
            </h2>
            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.3em]">{roleTitle}</p>
          </div>
          <div className="bg-neutral-50 px-6 py-4 border border-neutral-100 text-right min-w-[200px]">
             <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-1">Chiffre d'Affaires Trouvé</p>
             <p className="text-2xl font-black text-black tracking-tighter">{formatFCFA(totalFilteredRevenue)}</p>
             <p className="text-[9px] font-bold uppercase tracking-widest text-emerald-600 mt-1">
               {activeTab === 'RETAIL' ? filteredOrders.length : filteredWholesaleOrders.length} Tickets
             </p>
          </div>
        </div>

        {/* --- TABS --- */}
        <div className="flex border-b border-black mb-8">
           <button
             onClick={() => setActiveTab('RETAIL')}
             className={`px-6 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'RETAIL' ? 'bg-black text-white' : 'bg-transparent text-black hover:bg-neutral-100'}`}
           >
              Ventes Détail (Boutique)
           </button>
           <button
             onClick={() => setActiveTab('WHOLESALE')}
             className={`px-6 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'WHOLESALE' ? 'bg-black text-white' : 'bg-transparent text-black hover:bg-neutral-100'}`}
           >
              Ventes en Gros
           </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col lg:flex-row gap-4 mb-10 bg-neutral-50/60 border border-neutral-200/80 p-5 rounded-none">
           <div className="relative flex-1">
             <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 w-4 h-4" />
             <input 
               type="text" 
               placeholder="RECHERCHER PAR ID TICKET OU NOM DE CLIENT..." 
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
               className="w-full pl-12 pr-4 py-3.5 bg-white border border-neutral-200 text-[10px] font-black uppercase tracking-[0.15em] focus:border-black outline-none transition-all rounded-none"
             />
           </div>
           
           <div className="relative flex-1 lg:max-w-[200px]">
             <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 w-4 h-4" />
             <input 
               title="Date de début"
               type="date" 
               value={startDate}
               onChange={(e) => setStartDate(e.target.value)}
               className="w-full pl-12 pr-4 py-3.5 bg-white border border-neutral-200 text-[10.5px] font-black uppercase tracking-[0.15em] focus:border-black outline-none transition-all rounded-none"
             />
           </div>
           
           <div className="relative flex-1 lg:max-w-[200px]">
             <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 w-4 h-4" />
             <input 
               title="Date de fin"
               type="date" 
               value={endDate}
               onChange={(e) => setEndDate(e.target.value)}
               className="w-full pl-12 pr-4 py-3.5 bg-white border border-neutral-200 text-[10.5px] font-black uppercase tracking-[0.15em] focus:border-black outline-none transition-all rounded-none"
             />
           </div>

           {(isAdmin || isManager) && (
             <div className="relative flex-1 lg:max-w-xs">
               <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 w-4 h-4" />
               <select
                 value={cashierFilter}
                 onChange={(e) => setCashierFilter(e.target.value)}
                 className="w-full pl-12 pr-4 py-3.5 bg-white border border-neutral-200 text-[10.5px] font-black uppercase tracking-[0.15em] focus:border-black outline-none transition-all appearance-none rounded-none"
               >
                 <option value="">Tous les Vendeurs</option>
                 {uniqueCashiers.map(c => (
                   <option key={c} value={c}>{c}</option>
                 ))}
               </select>
             </div>
           )}
           <div className="flex gap-2">
             <button 
               onClick={handleExportCSV}
               disabled={filteredOrders.length === 0}
               className="px-6 py-3.5 bg-black text-white hover:bg-neutral-800 disabled:opacity-30 text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap flex items-center justify-center rounded-none shadow-sm cursor-pointer"
             >
               <Download className="w-3.5 h-3.5 mr-2" />
               Exporter (CSV)
             </button>
             <button 
               onClick={() => {setSearchTerm(''); setStartDate(new Date().toISOString().split('T')[0]); setEndDate(new Date().toISOString().split('T')[0]); setCashierFilter('');}}
               className="px-6 py-3.5 bg-white border border-neutral-200 hover:border-black text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap rounded-none cursor-pointer text-neutral-700 hover:text-black"
             >
               Effacer Filtres
             </button>
           </div>
        </div>

        {/* Results Table */}
        <div className="bg-white border border-neutral-100 shadow-sm overflow-x-auto print:hidden">
          <table className="min-w-full text-left">
            <thead>
              <tr className="bg-neutral-50 border-b border-neutral-100">
                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-neutral-400">ID & Date</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-neutral-400">{activeTab === 'RETAIL' ? 'Vendeur' : 'Grossiste'}</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-neutral-400">Paiement</th>
                <th className="p-6 text-right text-[10px] font-black uppercase tracking-widest text-neutral-400">Montant TTC</th>
                <th className="p-6 text-center text-[10px] font-black uppercase tracking-widest text-neutral-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-50">
              {activeTab === 'RETAIL' && (
                filteredOrders.length > 0 ? filteredOrders.map(order => (
                  <tr key={order.id} className="hover:bg-neutral-50/50 transition-colors group">
                    <td className="p-6">
                      <p className="font-black text-black text-xs">{order.id}</p>
                      <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mt-1">
                        {new Date(order.date).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                      </p>
                    </td>
                    <td className="p-6">
                      <span className="text-[10px] font-black text-black uppercase tracking-[0.2em] bg-neutral-100 px-2 py-1">
                        {order.cashier}
                      </span>
                    </td>
                    <td className="p-6">
                      <div className="flex items-center gap-2">
                         {order.payments.map((p, i) => (
                           <span key={i} className="text-[9px] font-bold uppercase tracking-widest text-neutral-500 border border-neutral-200 px-1.5 py-0.5">
                             {getPaymentMethodLabel(p.method)}
                           </span>
                         ))}
                      </div>
                    </td>
                    <td className="p-6 text-right">
                      <p className="font-black text-sm">{formatFCFA(order.total)}</p>
                      {order.status === 'RETURNED' && <p className="text-[9px] font-black text-red-500 uppercase tracking-widest mt-1">Retourné</p>}
                      {order.status === 'LAYAWAY' && <p className="text-[9px] font-black text-amber-500 uppercase tracking-widest mt-1">Acompte</p>}
                    </td>
                    <td className="p-6">
                      <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                         <button onClick={() => handlePrintReceipt(order)} className="p-2 border border-neutral-200 hover:bg-black hover:text-white hover:border-black transition-colors rounded-sm" title="Imprimer le reçu">
                           <Printer className="w-4 h-4" />
                         </button>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={5} className="p-16 text-center text-[10px] font-bold uppercase tracking-widest text-neutral-300">
                       Aucun ticket ne correspond à vos filtres.
                    </td>
                  </tr>
                )
              )}
              {activeTab === 'WHOLESALE' && (
                filteredWholesaleOrders.length > 0 ? filteredWholesaleOrders.map(order => {
                  const w = wholesalers.find(w => w.id === order.wholesalerId);
                  return (
                    <tr key={order.id} className="hover:bg-neutral-50/50 transition-colors group">
                      <td className="p-6">
                        <p className="font-black text-black text-xs">{order.id}</p>
                        <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mt-1">
                          {new Date(order.date).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                        </p>
                      </td>
                      <td className="p-6">
                        <span className="text-[10px] font-black text-black uppercase tracking-[0.2em] bg-neutral-100 px-2 py-1 max-w-[200px] truncate block">
                          Gros: {w?.companyName || 'Inconnu'}
                        </span>
                      </td>
                      <td className="p-6">
                        <div className="flex items-center gap-2">
                           <span className="text-[9px] font-bold uppercase tracking-widest text-neutral-500 border border-neutral-200 px-1.5 py-0.5">
                             {order.paymentType}
                           </span>
                        </div>
                      </td>
                      <td className="p-6 text-right">
                        <p className="font-black text-sm">{formatFCFA(order.total)}</p>
                        {order.paymentStatus === 'PAID' && <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mt-1">Payé</p>}
                        {order.paymentStatus === 'PARTIALLY_PAID' && <p className="text-[9px] font-black text-amber-500 uppercase tracking-widest mt-1">Partiel</p>}
                        {order.paymentStatus === 'UNPAID' && <p className="text-[9px] font-black text-red-500 uppercase tracking-widest mt-1">Non Payé</p>}
                      </td>
                      <td className="p-6 text-center">
                         <span className="text-[8px] text-neutral-400 tracking-widest uppercase">Espace Gros</span>
                      </td>
                    </tr>
                  )
                }) : (
                  <tr>
                    <td colSpan={5} className="p-16 text-center text-[10px] font-bold uppercase tracking-widest text-neutral-300">
                       Aucun ticket de gros ne correspond à vos filtres.
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* Print Receipt Modal (Reusing existing layout from POS) */}
      {selectedOrderToPrint && (
        <div className="fixed inset-0 bg-neutral-950/80 z-[200] flex flex-col items-center justify-start p-4 overflow-y-auto backdrop-blur-sm pt-8 md:pt-20">
           <div className="bg-white p-8 md:p-12 w-full max-w-2xl border-4 border-black relative mb-8 md:mb-20 animate-in zoom-in duration-200">
            <div id="receipt-content-history" className="max-w-md mx-auto bg-white p-12 shadow-2xl border border-neutral-100 text-black font-mono print:shadow-none print:border-none print:p-0 print:w-full relative">
              <button 
                onClick={() => setSelectedOrderToPrint(null)} 
                className="absolute right-6 top-6 text-neutral-400 hover:text-black print:hidden"
              >
                 <X className="w-5 h-5"/>
              </button>
              
              <div className="text-center mb-10 border-b-2 border-black pb-8 mt-4 flex flex-col items-center justify-center">
                 {settings?.logoUrl ? (
                   <img src={settings.logoUrl} alt="Logo" className="max-h-16 w-auto object-contain mb-3" referrerPolicy="no-referrer" />
                 ) : null}
                 {settings?.storeName !== "" && (
                   <h1 className="text-3xl font-black uppercase tracking-tighter break-all">
                     {settings?.storeName ?? 'ZARA'}
                   </h1>
                 )}
                 {settings?.storeAddress !== "" && (
                   <p className="text-[9px] uppercase font-bold text-neutral-500 mt-1 text-center max-w-[250px] leading-relaxed">
                     {settings?.storeAddress ?? 'ZARA GALLERY • Ouagadougou'}
                   </p>
                 )}
                 {settings?.storePhone && (
                    <p className="text-[9px] font-bold text-neutral-500 mt-0.5">Tél: {settings.storePhone}</p>
                 )}
              </div>
              <div className="space-y-2 text-[10px] font-bold uppercase mb-8 pb-8 border-b border-neutral-100">
                 <div className="flex justify-between"><span>Ticket No</span><span>#{selectedOrderToPrint.id}</span></div>
                 <div className="flex justify-between"><span>Date</span><span>{new Date(selectedOrderToPrint.date).toLocaleString()}</span></div>
                 <div className="flex justify-between"><span>Caisse</span><span>{selectedOrderToPrint.cashier}</span></div>
                 {selectedOrderToPrint.customer && <div className="flex justify-between"><span>Client</span><span>{selectedOrderToPrint.customer.name}</span></div>}
              </div>
              <table className="w-full text-[10px] mb-8">
                 <thead><tr className="border-b-2 border-black">
                    <th className="text-left py-2 uppercase">Art.</th><th className="text-center py-2">Qté.</th><th className="text-right py-2">Total</th>
                 </tr></thead>
                 <tbody className="divide-y divide-neutral-100">
                    {selectedOrderToPrint.items.map((item, idx) => (
                      <tr key={idx} className="py-2">
                        <td className="py-2"><p className="font-bold">{item.product.name}</p><p className="text-[8px] text-neutral-400">{item.variant.size} / {item.variant.color}</p></td>
                        <td className="text-center">{item.quantity}</td>
                        <td className="text-right font-black">{formatFCFA((item.manualPrice || item.product.basePrice) * (1 - item.discount / 100) * item.quantity)}</td>
                      </tr>
                    ))}
                 </tbody>
              </table>
              <div className="space-y-2 text-xs border-t-2 border-black pt-6 mb-10">
                 <div className="flex justify-between"><span>Sous-total HT</span><span>{formatFCFA(selectedOrderToPrint.subtotal)}</span></div>
                 {selectedOrderToPrint.tax > 0 ? (
                   <div className="flex justify-between"><span>TVA (18%)</span><span>{formatFCFA(selectedOrderToPrint.tax)}</span></div>
                 ) : (
                   <div className="flex justify-between text-neutral-400"><span>Exonéré TVA</span><span>0 F CFA</span></div>
                 )}
                 <div className="flex justify-between text-lg font-black pt-4"><span>Total TTC</span><span>{formatFCFA(selectedOrderToPrint.total)}</span></div>
              </div>
              <div className="text-center">
                 <p className="text-[9px] uppercase font-bold text-neutral-400 mb-8 tracking-[0.2em]">Merci de votre confiance. Votre achat a bien été enregistré.</p>
                 <div className="flex gap-2 print:hidden uppercase text-[9px]">
                    <button onClick={confirmPrintA4} className="flex-1 bg-neutral-100 text-black hover:bg-neutral-200 py-4 font-black transition-colors rounded-sm shadow-[0_4px_14px_0_rgba(0,0,0,0.1)]">
                      Imprimer (A4)
                    </button>
                    <button onClick={confirmPrint58} className="flex-1 bg-black text-white hover:bg-neutral-800 py-4 font-black transition-colors rounded-sm shadow-[0_4px_14px_0_rgba(0,0,0,0.1)]">
                      Ticket (58mm)
                    </button>
                    <button onClick={async () => {
                       try {
                         const element = document.getElementById('receipt-content-history');
                         if (!element) return;
                         
                         // Temporarily hide buttons for capture
                         const buttons = element.querySelector('.print\\:hidden');
                         if (buttons) (buttons as HTMLElement).style.display = 'none';
                         
                         const { default: html2canvas } = await import('html2canvas');
                         const { jsPDF } = await import('jspdf');
                         
                         const canvas = await html2canvas(element, {
                           scale: 2,
                           useCORS: true,
                           backgroundColor: '#ffffff',
                           onclone: (clonedDoc) => {
                             cleanOklchStylesForHtml2Canvas(clonedDoc);
                           }
                         });
                         const imgData = canvas.toDataURL('image/png');

                         const pdf = new jsPDF({
                           orientation: 'portrait',
                           unit: 'px',
                           format: [element.clientWidth, element.clientHeight]
                         });
                         
                         pdf.addImage(imgData, 'PNG', 0, 0, element.clientWidth, element.clientHeight);
                         pdf.save(`Recu-${selectedOrderToPrint.id}.pdf`);
                         
                         // Restore buttons
                         if (buttons) (buttons as HTMLElement).style.display = 'flex';
                       } catch (e) {
                         console.error("PDF generation failed:", e);
                         alert("Erreur lors de la génération du PDF");
                       }
                    }} className="flex-1 bg-neutral-200 text-black hover:bg-neutral-300 py-4 text-[10px] font-black uppercase transition-colors rounded-sm shadow-xl">
                      Télécharger PDF
                    </button>
                 </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

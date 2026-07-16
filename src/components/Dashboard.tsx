import React, { useState, useMemo } from 'react';
import { Order, CashMovement, AppSettings } from '../types';
import { WholesaleOrder, Wholesaler } from '../types_wholesale';
import { 
  TrendingUp, Users, ShoppingBag, CreditCard, ArrowUpRight, BarChart3, 
  Wallet, Smartphone, Landmark, CheckSquare, AlertTriangle, HelpCircle, FileText, Printer
} from 'lucide-react';

interface DashboardProps {
  orders: Order[];
  wholesaleOrders?: WholesaleOrder[];
  wholesalers?: Wholesaler[];
  cashMovements?: CashMovement[];
  settings?: AppSettings;
}

type ScanMode = 'COMBINED' | 'RETAIL' | 'WHOLESALE';

export default function Dashboard({ orders, wholesaleOrders = [], wholesalers = [], cashMovements = [], settings }: DashboardProps) {
  const [scanMode, setScanMode] = useState<ScanMode>('COMBINED');

  const formatFCFA = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(amount);
  };

  const handlePrintPointDuJour = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Sales Retail today
    const retailToday = orders.filter(o => new Date(o.date) >= today);
    const retailTotal = retailToday.reduce((sum, o) => sum + o.total, 0);

    const retailByMethod: Record<string, number> = {};
    retailToday.forEach(o => {
      o.payments.forEach(p => {
        retailByMethod[p.method] = (retailByMethod[p.method] || 0) + p.amount;
      });
    });

    // Wholesale today (bills created today)
    const wholesaleToday = wholesaleOrders.filter(o => new Date(o.date) >= today);
    const wholesaleFactureToday = wholesaleToday.reduce((sum, o) => sum + o.total, 0);
    const wholesaleCreditCreatedToday = wholesaleToday.reduce((sum, o) => sum + (o.total - o.amountPaid), 0);

    // Payments received today for wholesale (can be from today's orders or past orders)
    const wPaymentsByMethod: Record<string, number> = {};
    wholesaleOrders.forEach(o => {
      o.payments.forEach(p => {
        if (new Date(p.date) >= today) {
           const method = p.paymentMethod || 'Espèces';
           wPaymentsByMethod[method] = (wPaymentsByMethod[method] || 0) + p.amount;
        }
      });
    });

    // Cash Movements today
    const movementsToday = cashMovements.filter(m => new Date(m.date) >= today);
    const cashIn = movementsToday.filter(m => m.type === 'IN').reduce((sum, m) => sum + m.amount, 0);
    const cashOut = movementsToday.filter(m => m.type === 'OUT').reduce((sum, m) => sum + m.amount, 0);

    // Globals
    const globalByMethod: Record<string, number> = {};
    Object.keys(retailByMethod).forEach(k => globalByMethod[k] = (globalByMethod[k] || 0) + retailByMethod[k]);
    Object.keys(wPaymentsByMethod).forEach(k => {
       // Harmonize 'CASH'
       const key = k === 'CASH_COMPTANT' || k === 'Espèces' ? 'CASH' : k;
       globalByMethod[key] = (globalByMethod[key] || 0) + wPaymentsByMethod[k];
    });

    const printContent = `
      <html>
        <head>
          <title>Point du Jour</title>
          <style>
            body { font-family: monospace; padding: 20px; font-size: 14px; color: #000; margin: 0; }
            h1 { text-align: center; text-transform: uppercase; border-bottom: 2px solid #000; padding-bottom: 10px; margin-top: 0; }
            h2 { font-size: 16px; border-bottom: 1px dotted #000; padding-bottom: 5px; margin-top: 20px; text-transform: uppercase; }
            .row { display: flex; justify-content: space-between; margin-bottom: 4px; }
            .bold { font-weight: bold; }
            .totals { border-top: 1px solid #000; padding-top: 10px; margin-top: 10px; }
            * { box-sizing: border-box; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
            @media print {
              .no-print { display: none !important; }
              body { padding: 0; }
            }
            .action-bar {
              background: #f5f5f5; border-bottom: 1px solid #ddd; padding: 15px; margin-bottom: 30px;
              display: flex; gap: 15px; justify-content: center;
              position: sticky; top: 0;
            }
            .btn {
              padding: 10px 20px; font-weight: bold; cursor: pointer; border: 1px solid #000; background: #fff; border-radius: 4px; font-family: sans-serif; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; transition: all 0.2s;
            }
            .btn:hover { background: #eee; }
            .btn-primary { background: #000; color: #fff; }
            .btn-primary:hover { background: #333; }
            .content-wrapper { padding: 0 20px; max-width: 800px; margin: 0 auto; }
          </style>
        </head>
        <body>
          <div class="no-print action-bar">
            <button class="btn btn-primary" onclick="window.print()">🖨️ Imprimer / PDF</button>
            <button class="btn" onclick="const blob = new Blob([document.documentElement.outerHTML], {type: 'text/html'}); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'Point_du_Jour_${new Date().toISOString().split('T')[0]}.html'; a.click();">💾 Télécharger (HTML)</button>
            <button class="btn" onclick="window.close()">❌ Fermer</button>
          </div>
          <div class="content-wrapper">
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
          <h1 style="margin-top: 15px;">Point du Jour - ${new Date().toLocaleDateString('fr-FR')}</h1>
          <p style="text-align:center">Édité à ${new Date().toLocaleTimeString('fr-FR')}</p>

          <div class="grid">
             <div>
                <h2>1. Ventes au Détail (Boutique)</h2>
                <div class="row"><span>Transactions:</span> <span>${retailToday.length} tickets</span></div>
                <div class="row bold"><span>Total Facturé:</span> <span>${formatFCFA(retailTotal)}</span></div>
                <br />
                <div class="row bold" style="text-decoration: underline;">Encaissements Détail:</div>
                ${Object.entries(retailByMethod).map(([m, val]) => `<div class="row"><span>- ${m}:</span> <span>${formatFCFA(val)}</span></div>`).join('')}
             </div>

             <div>
                <h2>2. Ventes en Gros (B2B)</h2>
                <div class="row"><span>Factures créées:</span> <span>${wholesaleToday.length} factures</span></div>
                <div class="row bold"><span>Total Facturé:</span> <span>${formatFCFA(wholesaleFactureToday)}</span></div>
                <div class="row"><span>Nouvelles Créances:</span> <span>${formatFCFA(wholesaleCreditCreatedToday)}</span></div>
                <br />
                <div class="row bold" style="text-decoration: underline;">Paiements Reçus (Toutes factures confondues):</div>
                ${Object.entries(wPaymentsByMethod).map(([m, val]) => `<div class="row"><span>- ${m === 'CASH_COMPTANT' ? 'CASH' : m}:</span> <span>${formatFCFA(val)}</span></div>`).join('')}
             </div>
          </div>

          <h2>3. Synthèse Globale des Encaissements et Mouvements</h2>
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

          <p style="text-align:center; font-size: 10px; margin-top: 40px; color: #555;">Point du jour édité par Intelligence Affaires Zara</p>
          </div>
        </body>
      </html>
    `;

    const printWin = window.open('', '_blank', 'width=800,height=800');
    if (printWin) {
      printWin.document.write(printContent);
      printWin.document.close();
      printWin.focus();
    }
  };

  // --- STATS COMPUTATIONS DEPENDING ON MODE ---
  const filteredSalesData = useMemo(() => {
    let rawRevenue = 0;
    let rawCount = 0;
    let rawDiscounts = 0;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Filter today & yesterday for trend calculations
    let todayCombinedRev = 0;
    let yesterdayCombinedRev = 0;
    let todayCount = 0;
    let yesterdayCount = 0;

    if (scanMode === 'COMBINED' || scanMode === 'RETAIL') {
      rawRevenue += orders.reduce((sum, o) => sum + o.total, 0);
      rawCount += orders.length;
      rawDiscounts += orders.reduce((sum, o) => sum + (o.discountTotal || 0), 0);

      // Trend data integration
      orders.forEach(o => {
        const d = new Date(o.date);
        if (d >= today) {
          todayCombinedRev += o.total;
          todayCount++;
        } else if (d >= yesterday && d < today) {
          yesterdayCombinedRev += o.total;
          yesterdayCount++;
        }
      });
    }

    if (scanMode === 'COMBINED' || scanMode === 'WHOLESALE') {
      rawRevenue += wholesaleOrders.reduce((sum, o) => sum + o.total, 0);
      rawCount += wholesaleOrders.length;
      // Wholesale discounts
      rawDiscounts += wholesaleOrders.reduce((sum, o) => sum + (o.discount || 0), 0);

      // Trend data integration
      wholesaleOrders.forEach(o => {
        const d = new Date(o.date);
        if (d >= today) {
          todayCombinedRev += o.total;
          todayCount++;
        } else if (d >= yesterday && d < today) {
          yesterdayCombinedRev += o.total;
          yesterdayCount++;
        }
      });
    }

    const averageOrderVal = rawCount > 0 ? rawRevenue / rawCount : 0;

    // Calculate dynamic trends compared to yesterday
    const trendRev = yesterdayCombinedRev > 0 ? ((todayCombinedRev - yesterdayCombinedRev) / yesterdayCombinedRev) * 100 : (todayCombinedRev > 0 ? 100 : 0);
    const trendCount = yesterdayCount > 0 ? ((todayCount - yesterdayCount) / yesterdayCount) * 100 : (todayCount > 0 ? 100 : 0);

    return {
      revenue: rawRevenue,
      count: rawCount,
      average: averageOrderVal,
      discounts: rawDiscounts,
      trendRevenue: trendRev,
      trendCount: trendCount
    };
  }, [scanMode, orders, wholesaleOrders]);

  // --- HARMONIZED PAYMENT BREAKDOWN ---
  const paymentBreakdown = useMemo(() => {
    const acc: Record<string, number> = {
      CASH: 0,
      MOBILE_MONEY: 0,
      ORANGE_MONEY: 0,
      MOOV_MONEY: 0,
      CARD: 0,
      CHEQUE: 0,
      VIREMENT: 0
    };

    if (scanMode === 'COMBINED' || scanMode === 'RETAIL') {
      orders.forEach(o => {
        o.payments.forEach(p => {
          const m = p.method;
          acc[m] = (acc[m] || 0) + p.amount;
        });
      });
    }

    if (scanMode === 'COMBINED' || scanMode === 'WHOLESALE') {
      wholesaleOrders.forEach(o => {
        o.payments.forEach(p => {
          const m = p.paymentMethod;
          acc[m] = (acc[m] || 0) + p.amount;
        });
      });
    }

    return acc;
  }, [scanMode, orders, wholesaleOrders]);

  // --- HARMONIZED BEST SELLERS OUTFLOWS ---
  const top10Sales = useMemo(() => {
    const counts: Record<string, { name: string, qty: number, total: number }> = {};

    if (scanMode === 'COMBINED' || scanMode === 'RETAIL') {
      orders.forEach(o => {
        o.items.forEach(item => {
          const productId = item.product.id;
          if (!counts[productId]) {
            counts[productId] = { name: item.product.name, qty: 0, total: 0 };
          }
          counts[productId].qty += item.quantity;
          counts[productId].total += (item.manualPrice || item.product.basePrice) * (1 - item.discount / 100) * item.quantity;
        });
      });
    }

    if (scanMode === 'COMBINED' || scanMode === 'WHOLESALE') {
      wholesaleOrders.forEach(o => {
        o.items.forEach(item => {
          const productId = item.productId;
          if (!counts[productId]) {
            counts[productId] = { name: item.productName, qty: 0, total: 0 };
          }
          counts[productId].qty += item.totalPieces;
          counts[productId].total += item.totalAmount;
        });
      });
    }

    return Object.values(counts).sort((a, b) => b.qty - a.qty).slice(0, 10);
  }, [scanMode, orders, wholesaleOrders]);

  // --- SPECIALIZED CREDIT AND PAYMENT METRICS FOR WHOLESALE ---
  const wholesaleCreditMetrics = useMemo(() => {
    let totalWholesaleInvoiced = 0;
    let totalWholesaleCollected = 0;
    let totalWholesaleOutstandingDebt = 0;

    let countCashComptantOrders = 0;
    let countInstallmentOrders = 0;
    let countCreditOrders = 0;

    let installmentTotalCount = 0;
    let installmentPaidCount = 0;
    let installmentPendingCount = 0;
    let installmentOverdueCount = 0;
    let installmentTotalOutstandingSum = 0;

    wholesaleOrders.forEach(o => {
      totalWholesaleInvoiced += o.total;
      totalWholesaleCollected += o.amountPaid;
      totalWholesaleOutstandingDebt += (o.total - o.amountPaid);

      if (o.paymentType === 'CASH_COMPTANT') countCashComptantOrders++;
      else if (o.paymentType === 'INSTALLMENTS') countInstallmentOrders++;
      else if (o.paymentType === 'CREDIT') countCreditOrders++;

      // Analyze installments
      o.installments.forEach(inst => {
        installmentTotalCount++;
        if (inst.status === 'PAID') {
          installmentPaidCount++;
        } else if (inst.status === 'OVERDUE') {
          installmentOverdueCount++;
          installmentTotalOutstandingSum += (inst.amount - inst.amountPaid);
        } else {
          installmentPendingCount++;
          installmentTotalOutstandingSum += (inst.amount - inst.amountPaid);
        }
      });
    });

    const activeWholesalersOwedDues = wholesalers.reduce((sum, w) => sum + w.balance, 0);

    return {
      invoiced: totalWholesaleInvoiced,
      collected: totalWholesaleCollected,
      outstandingDebt: totalWholesaleOutstandingDebt,
      actualOwedBalance: activeWholesalersOwedDues,
      counts: {
        cash: countCashComptantOrders,
        installments: countInstallmentOrders,
        credit: countCreditOrders
      },
      installments: {
        total: installmentTotalCount,
        paid: installmentPaidCount,
        pending: installmentPendingCount,
        overdue: installmentOverdueCount,
        outstandingAmount: installmentTotalOutstandingSum
      }
    };
  }, [wholesaleOrders, wholesalers]);

  return (
    <div className="p-8 h-full overflow-y-auto bg-white flex-1 animate-in fade-in duration-500">
      <div className="max-w-7xl mx-auto">
        
        {/* Header Section with Mode Toggles */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 border-b border-neutral-100 pb-8 gap-6">
          <div>
            <h2 className="text-4xl font-black text-black tracking-tighter uppercase mb-2 flex items-center gap-4">
              <BarChart3 className="w-10 h-10" /> Intelligence Affaires
            </h2>
            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.3em]">
              Centralisation comptable et harmonisation des données de caisse & grossistes
            </p>
          </div>
          
          <div className="flex flex-col items-end gap-4">
            <button
              onClick={handlePrintPointDuJour}
              className="px-6 py-3 bg-black text-white hover:bg-neutral-800 text-[10px] font-black uppercase tracking-widest transition-all shadow-xl flex items-center gap-2"
            >
              <Printer className="w-4 h-4" /> Point du Jour / Bilan
            </button>

            {/* OMNICHANNEL SCOPE SWITCHER */}
            <div className="flex border-2 border-black p-1 bg-white shadow-sm">
              <button 
                onClick={() => setScanMode('COMBINED')}
                className={`px-4 py-2 text-[9px] font-black uppercase tracking-widest transition-all ${scanMode === 'COMBINED' ? 'bg-black text-white' : 'bg-transparent text-black hover:bg-neutral-50'}`}
              >
                Omnicanal (Global)
              </button>
              <button 
                onClick={() => setScanMode('RETAIL')}
                className={`px-4 py-2 text-[9px] font-black uppercase tracking-widest transition-all ${scanMode === 'RETAIL' ? 'bg-black text-white' : 'bg-transparent text-black hover:bg-neutral-50'}`}
              >
                Détail (POS)
              </button>
              <button 
                onClick={() => setScanMode('WHOLESALE')}
                className={`px-4 py-2 text-[9px] font-black uppercase tracking-widest transition-all ${scanMode === 'WHOLESALE' ? 'bg-black text-white' : 'bg-transparent text-black hover:bg-neutral-50'}`}
              >
                Grossistes (B2B)
              </button>
            </div>
          </div>
        </div>

        {/* Primary KPI Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-0 border border-neutral-200/80 mb-12 bg-white">
          <StatCard 
            label="Chiffre d'Affaires Brut" 
            value={formatFCFA(filteredSalesData.revenue)} 
            trend={filteredSalesData.trendRevenue} 
            icon={<TrendingUp className="w-5 h-5 text-neutral-400" />} 
            border 
          />
          <StatCard 
            label="Volume de Ventes" 
            value={`${filteredSalesData.count} Facs.`} 
            trend={filteredSalesData.trendCount} 
            icon={<ShoppingBag className="w-5 h-5 text-neutral-400" />} 
            border 
          />
          <StatCard 
            label="Panier Moyen" 
            value={formatFCFA(filteredSalesData.average)} 
            icon={<Users className="w-5 h-5 text-neutral-400" />} 
            border 
          />
          <StatCard 
            label="Remises d'Incitation" 
            value={formatFCFA(filteredSalesData.discounts)} 
            icon={<BarChart3 className="w-5 h-5 text-neutral-400" />} 
            negative 
          />
        </div>

        {/* SPECIAL WHOLESALE (CASH, CREDIT, INSTALLMENT) MONITORING SYSTEM */}
        {(scanMode === 'COMBINED' || scanMode === 'WHOLESALE') && (
          <div className="mb-12 animate-in zoom-in-95 duration-200">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] mb-6 flex items-center border-l-4 border-black pl-4">
              ⭐ Suivi Financier des Grossistes (Cash, Échelonnements & Crédits)
            </h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Box 1: Wholesaler Revenue Allocation */}
              <div className="border border-black p-6 bg-white flex flex-col justify-between">
                <div>
                  <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-3">Modes de Règlement Accordés</p>
                  <p className="text-xs font-black uppercase tracking-tight text-neutral-800 mb-6">
                    Total Facturé aux Grossistes : <span className="text-black block text-2xl mt-1">{formatFCFA(wholesaleCreditMetrics.invoiced)}</span>
                  </p>
                  
                  <div className="space-y-3 font-mono text-[10px] border-t border-neutral-100 pt-4">
                    <div className="flex justify-between items-center text-zinc-600">
                      <span className="uppercase font-bold">💵 Cash Comptant :</span>
                      <span className="font-black text-neutral-800">{wholesaleCreditMetrics.counts.cash} comm.</span>
                    </div>
                    <div className="flex justify-between items-center text-zinc-600">
                      <span className="uppercase font-bold">📆 Versements échelonnés :</span>
                      <span className="font-black text-neutral-800">{wholesaleCreditMetrics.counts.installments} comm.</span>
                    </div>
                    <div className="flex justify-between items-center text-zinc-600">
                      <span className="uppercase font-bold">📉 Crédit Long-terme :</span>
                      <span className="font-black text-neutral-800">{wholesaleCreditMetrics.counts.credit} comm.</span>
                    </div>
                  </div>
                </div>
                <div className="bg-neutral-50 px-3.5 py-2.5 text-[9px] uppercase tracking-wider font-extrabold text-neutral-500 border border-neutral-200/50 mt-6 flex justify-between">
                  <span>Encaissé Directement :</span>
                  <span className="text-emerald-600">{formatFCFA(wholesaleCreditMetrics.collected)}</span>
                </div>
              </div>

              {/* Box 2: Outstanding Credits & Wholesaler Dues */}
              <div className="border border-black p-6 bg-white flex flex-col justify-between">
                <div>
                  <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-3">Créances & Soldes Restants Dûs</p>
                  <p className="text-xs font-black uppercase tracking-tight text-neutral-800 mb-6">
                    Solde Débiteur Global (Encours) : <span className="text-red-600 block text-2xl mt-1">{formatFCFA(wholesaleCreditMetrics.actualOwedBalance)}</span>
                  </p>
                  
                  <div className="space-y-2 text-[10px] uppercase font-bold text-neutral-500 pt-3 border-t border-neutral-100">
                    <p className="leading-snug">
                      Ce solde représente le crédit total actif actuellement octroyé aux grossistes partenaires et qui doit nous être reversé.
                    </p>
                    <p className="text-[9px] leading-snug text-neutral-400 normal-case">
                      Chaque versement enregistré diminue directement le solde débiteur du grossiste.
                    </p>
                  </div>
                </div>
                <div className="bg-red-50 px-3.5 py-2.5 text-[9px] uppercase tracking-wider font-extrabold text-red-700 border border-red-200/50 mt-6 flex justify-between">
                  <span>Créances sur commandes :</span>
                  <span>{formatFCFA(wholesaleCreditMetrics.outstandingDebt)}</span>
                </div>
              </div>

              {/* Box 3: Technical Installments (Échéanciers) Tracker */}
              <div className="border border-black p-6 bg-white flex flex-col justify-between">
                <div>
                  <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-3">Suivi Technique des Échéances</p>
                  <p className="text-xs font-black uppercase tracking-tight text-neutral-800 mb-5">
                    Plan d'Amortissement : <span className="text-black block text-2xl mt-1">{wholesaleCreditMetrics.installments.total} tranches</span>
                  </p>
                  
                  <div className="grid grid-cols-3 gap-2.5 border-t border-neutral-100 pt-4 text-center">
                    <div className="bg-neutral-50 p-2 border border-neutral-100">
                      <span className="block text-[8px] font-black uppercase tracking-widest text-neutral-400">Payées</span>
                      <span className="text-xs font-black text-emerald-600">{wholesaleCreditMetrics.installments.paid}</span>
                    </div>
                    <div className="bg-neutral-50 p-2 border border-neutral-100">
                      <span className="block text-[8px] font-black uppercase tracking-widest text-neutral-400">En cours</span>
                      <span className="text-xs font-black text-neutral-700">{wholesaleCreditMetrics.installments.pending}</span>
                    </div>
                    <div className="bg-red-50 p-2 border border-red-100">
                      <span className="block text-[8px] font-black uppercase tracking-widest text-red-500 flex items-center justify-center gap-1">En Retard ⚠️</span>
                      <span className="text-xs font-black text-red-600">{wholesaleCreditMetrics.installments.overdue}</span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-neutral-900 text-white px-3.5 py-2.5 text-[9px] uppercase tracking-wider font-extrabold border border-black mt-6 flex justify-between">
                  <span>Montant Restant à Recouvrer :</span>
                  <span>{formatFCFA(wholesaleCreditMetrics.installments.outstandingAmount)}</span>
                </div>
              </div>

            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Section Volet de Paiement */}
          <div className="lg:col-span-2 space-y-12">
            <div>
              <h3 className="text-sm font-black uppercase tracking-[0.2em] mb-6 flex items-center border-l-2 border-black pl-4">
                Répartition Détaillée des Encaissements ({scanMode === 'COMBINED' ? 'Global' : scanMode === 'RETAIL' ? 'Détail uniquement' : 'Grossistes uniquement'})
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <PaymentStat label="Mobile Money" amount={(paymentBreakdown['MOBILE_MONEY'] || 0) + (paymentBreakdown['ORANGE_MONEY'] || 0) + (paymentBreakdown['MOOV_MONEY'] || 0)} icon={<Smartphone className="text-amber-600" />} />
                <PaymentStat label="Espèces (FCFA)" amount={paymentBreakdown['CASH'] || 0} icon={<Wallet className="text-neutral-900" />} />
                <PaymentStat label="Cartes Bancaires" amount={paymentBreakdown['CARD'] || 0} icon={<CreditCard className="text-neutral-400" />} />
                <PaymentStat label="Virement Bancaire" amount={paymentBreakdown['VIREMENT'] || 0} icon={<Landmark className="text-emerald-700" />} />
                <PaymentStat label="Chèques Déposés" amount={paymentBreakdown['CHEQUE'] || 0} icon={<FileText className="text-zinc-650" />} />
              </div>
            </div>

            <div>
              <h3 className="text-sm font-black uppercase tracking-[0.2em] mb-6 flex items-center border-l-2 border-black pl-4">
                Analyse Volume : Top 10 Best-Sellers (Articles sortants)
              </h3>
              <div className="bg-neutral-50 border border-neutral-100 p-8">
                <div className="space-y-6">
                  {top10Sales.map((item, i) => (
                    <div key={i} className="flex flex-col gap-2">
                      <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                        <span className="truncate max-w-[300px]">{i+1}. {item.name}</span>
                        <span>{item.qty} pcs. • {formatFCFA(item.total)}</span>
                      </div>
                      <div className="w-full h-1 bg-neutral-200">
                        <div 
                          className="h-full bg-black transition-all duration-1000" 
                          style={{ width: `${(item.qty / (top10Sales[0]?.qty || 1)) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                  {top10Sales.length === 0 && (
                    <p className="text-center text-[10px] font-bold text-neutral-400 uppercase tracking-widest py-10">Données de ventes insuffisantes</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar: Recent Activity */}
          <div className="space-y-8">
            <h3 className="text-sm font-black uppercase tracking-[0.2em] mb-6 flex items-center border-l-2 border-black pl-4">
               Dernières Ventes ({scanMode === 'WHOLESALE' ? 'B2B uniquement' : 'Détails'})
            </h3>
            <div className="divide-y divide-neutral-100 border border-neutral-100 bg-white max-h-[420px] overflow-y-auto">
               
               {/* RENDER WHOLESALE ORDERS IF APPLICABLE */}
               {(scanMode === 'COMBINED' || scanMode === 'WHOLESALE') && wholesaleOrders.map(wOrder => (
                  <div key={wOrder.id} className="p-4 hover:bg-neutral-50 transition-colors flex justify-between items-center group bg-amber-50/10">
                     <div>
                        <p className="text-xs font-black uppercase tracking-tight text-amber-700 flex items-center">
                          #{wOrder.id} [GROS]
                          <ArrowUpRight className="w-2.5 h-2.5 ml-2 text-amber-500 group-hover:text-amber-700 transition-colors" />
                        </p>
                        <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest mt-1">
                           Partenaire — {new Date(wOrder.date).toLocaleDateString('fr-FR')}
                        </p>
                     </div>
                     <div className="text-right">
                        <p className="font-black text-xs text-black">{formatFCFA(wOrder.total)}</p>
                        <p className="text-[8px] font-bold text-amber-600 uppercase tracking-widest">
                          {wOrder.paymentType === 'CASH_COMPTANT' ? 'COMPTANT' : wOrder.paymentType === 'INSTALLMENTS' ? 'ÉCHELONNÉ' : 'CRÉDIT'}
                        </p>
                     </div>
                  </div>
               ))}

               {/* RENDER POS ORDERS */}
               {(scanMode === 'COMBINED' || scanMode === 'RETAIL') && orders.slice(0, 10).map(order => (
                  <div key={order.id} className="p-4 hover:bg-neutral-50 transition-colors flex justify-between items-center group">
                     <div>
                        <p className="text-xs font-black uppercase tracking-tight text-black flex items-center">
                          #{order.id}
                          <ArrowUpRight className="w-2.5 h-2.5 ml-2 text-neutral-300 group-hover:text-black transition-colors" />
                        </p>
                        <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest mt-1">
                           {order.cashier.split(' ')[0]} — {new Date(order.date).toLocaleTimeString('fr-FR', {hour:'2-digit', minute:'2-digit'})}
                        </p>
                     </div>
                     <div className="text-right">
                        <p className="font-black text-xs text-black">{formatFCFA(order.total)}</p>
                        <p className="text-[8px] font-bold text-neutral-300 uppercase tracking-widest">
                          {order.payments[0]?.method}{order.payments.length > 1 ? ' +...' : ''}
                        </p>
                     </div>
                  </div>
               ))}

               {orders.length === 0 && wholesaleOrders.length === 0 && (
                 <div className="p-10 text-center text-neutral-300 text-[10px] font-bold uppercase tracking-widest leading-relaxed">
                   Aucune transaction enregistrée
                 </div>
               )}
            </div>
            
            <button 
              onClick={() => {
                const combinedCsv = "data:text/csv;charset=utf-8," 
                  + "Type,ID,Date,Montant Total,Montant Encaissé,Type Règlement\n"
                  + orders.map(o => `Retail,${o.id},${o.date},${o.total},${o.total},COMPTANT`).join("\n") + "\n"
                  + wholesaleOrders.map(o => `Wholesale,${o.id},${o.date},${o.total},${o.amountPaid},${o.paymentType}`).join("\n");
                
                const encodedUri = encodeURI(combinedCsv);
                const link = document.createElement("a");
                link.setAttribute("href", encodedUri);
                link.setAttribute("download", "rapport_financier_harmonise_zara.csv");
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }}
              className="w-full py-4 border border-black text-[10px] font-black uppercase tracking-widest hover:bg-black hover:text-white transition-all shadow-md focus:outline-none"
            >
              Exporter comptabilité harmonisée (CSV)
            </button>
         </div>
        </div>

      </div>
    </div>
  );
}

function StatCard({ label, value, icon, border, negative, trend }: { label: string, value: string, icon: React.ReactNode, border?: boolean, negative?: boolean, trend?: number }) {
  const formatTrend = (t: number) => {
    if (t === 0) return "STAGNANT";
    return `${t > 0 ? '+' : ''}${t.toFixed(1)}% vs HIER`;
  };

  const isTrendPositive = trend !== undefined && trend > 0;
  const isTrendNegative = trend !== undefined && trend < 0;

  return (
    <div className={`p-8 flex flex-col justify-between h-52 transition-colors ${border ? 'border-r border-neutral-100 last:border-r-0' : ''}`}>
       <div className="flex justify-between items-start">
         <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest max-w-[120px]">{label}</p>
         <div className="text-neutral-200">{icon}</div>
       </div>
       <div>
          <p className={`text-4xl font-black tracking-tighter ${negative ? 'text-red-600' : 'text-black'}`}>{value}</p>
          {trend !== undefined && (
            <div className={`flex items-center mt-2 text-[9px] font-black uppercase tracking-widest ${isTrendPositive ? 'text-emerald-600' : (isTrendNegative ? 'text-red-500' : 'text-neutral-400')}`}>
              <ArrowUpRight className={`w-3 h-3 mr-1 ${isTrendNegative ? 'rotate-90' : isTrendPositive ? '' : 'hidden'}`} /> {formatTrend(trend)}
            </div>
          )}
       </div>
    </div>
  );
}

function PaymentStat({ label, amount, icon }: { label: string, amount: number, icon: React.ReactNode }) {
  return (
    <div className="p-6 bg-white border border-neutral-100 hover:border-black transition-all flex items-center justify-between group">
       <div className="flex items-center gap-4">
          <div className="p-3 bg-neutral-50 rounded-none group-hover:bg-white transition-colors">{icon}</div>
          <div>
            <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">{label}</p>
            <p className="font-black text-base text-black tracking-tight">{new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(amount)}</p>
          </div>
       </div>
    </div>
  );
}

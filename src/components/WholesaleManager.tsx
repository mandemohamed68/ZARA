import React, { useState, useEffect } from 'react';
import { Wholesaler, WholesaleOrder, WholesaleOrderItem, WholesalePayment, Installment } from '../types_wholesale';
import { Product, ProductVariant, User, CashRegisterSession, AppSettings } from '../types';
import { 
  Users2, UserPlus, FileSpreadsheet, Plus, Trash2, Calendar, 
  DollarSign, CheckCircle2, Clock, AlertTriangle, Truck, 
  PlusCircle, CreditCard, ChevronDown, ChevronRight, Info, 
  Layers, Search, Check, FileText, Ban, Printer, Sparkles, Phone, MessageCircle
} from 'lucide-react';
import { printElement } from '../utils/print-helper';

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

interface WholesaleManagerProps {
  products: Product[];
  setProducts: (products: Product[]) => void;
  wholesaleOrders: WholesaleOrder[];
  setWholesaleOrders: (orders: WholesaleOrder[] | ((prev: WholesaleOrder[]) => WholesaleOrder[])) => void;
  wholesalers: Wholesaler[];
  setWholesalers: (wholesalers: Wholesaler[] | ((prev: Wholesaler[]) => Wholesaler[])) => void;
  trackMovement: (productId: string, variantId: string, type: 'SALE' | 'RESTOCK' | 'RETURN' | 'ADJUSTMENT' | 'LOSS', quantity: number, reason: string) => void;
  addAuditLog: (action: string, details: string, severity?: 'INFO' | 'WARNING' | 'CRITICAL') => void;
  currentUser: User;
  isPaymentLocked: boolean;
  isCashSessionRequired: boolean;
  currentSession: CashRegisterSession | null;
  settings?: AppSettings;
}

export default function WholesaleManager({
  products,
  setProducts,
  wholesaleOrders,
  setWholesaleOrders,
  wholesalers,
  setWholesalers,
  trackMovement,
  addAuditLog,
  currentUser,
  isPaymentLocked,
  isCashSessionRequired,
  currentSession,
  settings
}: WholesaleManagerProps) {

  // User-specific work hours restriction check
  const isUserTimeRestricted = (() => {
    if (currentUser.role === 'ADMIN') return false;
    if (!currentUser.openingTime || !currentUser.closingTime) return false;
    
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    return currentTime < currentUser.openingTime || currentTime >= currentUser.closingTime;
  })();

  const isSellingDisabled = (isPaymentLocked && currentUser.role !== 'ADMIN') || 
                            (isCashSessionRequired && !currentSession) || 
                            isUserTimeRestricted;
  
  // Tabs: 'DIRECTORY' | 'NEW_ORDER' | 'ORDERS_LEDGER'
  const [activeTab, setActiveTab] = useState<'DIRECTORY' | 'NEW_ORDER' | 'ORDERS_LEDGER'>('DIRECTORY');
  
  // WHOLSALE LIST STATE
  const [searchWholesaler, setSearchWholesaler] = useState('');
  const [isNewWholesalerModalOpen, setIsNewWholesalerModalOpen] = useState(false);
  const [editingWholesaler, setEditingWholesaler] = useState<Wholesaler | null>(null);

  // New wholesaler form
  const [wName, setWName] = useState('');
  const [wCompany, setWCompany] = useState('');
  const [wPhone, setWPhone] = useState('');
  const [wEmail, setWEmail] = useState('');
  const [wAddress, setWAddress] = useState('');
  const [wCreditLimit, setWCreditLimit] = useState('2000000');

  // RENDER CUSTOM MONETARY VALUE FX
  const formatXOF = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      maximumFractionDigits: 0
    }).format(amount);
  };

  // NEW BULK / WHOLESALE ORDER COMPOSER STATE
  const [selWholesalerId, setSelWholesalerId] = useState('');
  const [composerItems, setComposerItems] = useState<WholesaleOrderItem[]>([]);
  const [paymentType, setPaymentType] = useState<'CASH_COMPTANT' | 'INSTALLMENTS' | 'CREDIT'>('CASH_COMPTANT');
  const [orderNotes, setOrderNotes] = useState('');
  
  // Installment composer
  const [installmentCount, setInstallmentCount] = useState<number>(3);
  const [customInstallments, setCustomInstallments] = useState<{ dueDate: string; amount: number }[]>([]);
  const [initialDeposit, setInitialDeposit] = useState<string>('0');

  // --- IN-APP DIALOGS / NOTIFICATIONS STATE ---
  const [customModal, setCustomModal] = useState<{
    isOpen: boolean;
    type: 'success' | 'error' | 'warning' | 'info' | 'confirm_generic';
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm?: () => void;
    onCancel?: () => void;
  }>({
    isOpen: false,
    type: 'info',
    title: '',
    message: ''
  });

  const showCustomAlert = (title: string, message: string, type: 'success' | 'error' | 'warning' | 'info' = 'error', onConfirm?: () => void) => {
    setCustomModal({
      isOpen: true,
      type,
      title,
      message,
      confirmLabel: 'OK',
      onConfirm: () => {
        setCustomModal(prev => ({ ...prev, isOpen: false }));
        if (onConfirm) onConfirm();
      }
    });
  };

  const showCustomConfirm = (
    title: string,
    message: string,
    onConfirm: () => void,
    onCancel?: () => void,
    confirmLabel = 'Confirmer',
    cancelLabel = 'Annuler'
  ) => {
    setCustomModal({
      isOpen: true,
      type: 'confirm_generic',
      title,
      message,
      confirmLabel,
      cancelLabel,
      onConfirm: () => {
        setCustomModal(prev => ({ ...prev, isOpen: false }));
        onConfirm();
      },
      onCancel: () => {
        setCustomModal(prev => ({ ...prev, isOpen: false }));
        if (onCancel) onCancel();
      }
    });
  };

  // Item Selector State
  const [selProductId, setSelProductId] = useState('');
  const [selVariantId, setSelVariantId] = useState('');
  const [composerCartons, setComposerCartons] = useState('1');
  const [composerPiecesPerCtn, setComposerPiecesPerCtn] = useState('12'); // editable!
  const [composerPriceOverride, setComposerPriceOverride] = useState('');

  // Saisir Versement installment state
  const [selectedRepayOrder, setSelectedRepayOrder] = useState<WholesaleOrder | null>(null);
  const [selectedInstallment, setSelectedInstallment] = useState<Installment | null>(null);
  const [repayAmount, setRepayAmount] = useState('');
  const [repayMethod, setRepayMethod] = useState<'CASH' | 'MOBILE_MONEY' | 'ORANGE_MONEY' | 'MOOV_MONEY' | 'CARD' | 'CHEQUE' | 'VIREMENT'>('CASH');
  const [repayNotes, setRepayNotes] = useState('');
  const [isRepayModalOpen, setIsRepayModalOpen] = useState(false);

  // Order Details Modal
  const [activeDetailsOrder, setActiveDetailsOrder] = useState<WholesaleOrder | null>(null);

  // --- ACTIVATE WHOLESALER SUBMIT ---
  const handleWholesalerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingWholesaler) {
      setWholesalers(prev => prev.map(w => w.id === editingWholesaler.id ? {
        ...w,
        name: wName,
        companyName: wCompany,
        phone: wPhone,
        email: wEmail || undefined,
        address: wAddress || undefined,
        creditLimit: parseInt(wCreditLimit) || 0
      } : w));
      addAuditLog('WHOLESALER_UPDATED', `Fiche grossiste "${wName}" modifiée par ${currentUser.name}.`);
      setEditingWholesaler(null);
    } else {
      const newWholesaler: Wholesaler = {
        id: `GROS-${Date.now()}`,
        name: wName,
        companyName: wCompany,
        phone: wPhone,
        email: wEmail || undefined,
        address: wAddress || undefined,
        balance: 0,
        creditLimit: parseInt(wCreditLimit) || 0,
        createdAt: new Date().toISOString()
      };
      setWholesalers(prev => [...prev, newWholesaler]);
      addAuditLog('WHOLESALER_REGISTERED', `Nouveau grossiste enregistré : "${wName}" (${wCompany}).`);
    }
    // Reset
    setWName('');
    setWCompany('');
    setWPhone('');
    setWEmail('');
    setWAddress('');
    setWCreditLimit('2000000');
    setIsNewWholesalerModalOpen(false);
  };

  const handleEditWholesaler = (w: Wholesaler) => {
    setEditingWholesaler(w);
    setWName(w.name);
    setWCompany(w.companyName);
    setWPhone(w.phone);
    setWEmail(w.email || '');
    setWAddress(w.address || '');
    setWCreditLimit(w.creditLimit.toString());
    setIsNewWholesalerModalOpen(true);
  };

  const handleDeleteWholesaler = (w: Wholesaler) => {
    if (w.balance > 0) {
      showCustomAlert(
        "Suppression impossible",
        `Impossible de supprimer le grossiste ${w.name} car il possède un solde débiteur de ${formatXOF(w.balance)}.`,
        'error'
      );
      return;
    }
    showCustomConfirm(
      "Confirmer la suppression",
      `Voulez-vous vraiment supprimer le grossiste "${w.name}" ? Il ne figurera plus dans le registre actif.`,
      () => {
        setWholesalers(prev => prev.filter(item => item.id !== w.id));
        addAuditLog('WHOLESALER_DELETED', `Grossiste suprimmé : "${w.name}".`, 'WARNING');
      }
    );
  };

  // --- COMPOSER LIST MANAGEMENT ---
  const handleAddProductToComposer = () => {
    if (!selProductId || !selVariantId) {
      showCustomAlert("Sélection requise", "Veuillez sélectionner un article et sa variante.", "warning");
      return;
    }
    const prod = products.find(p => p.id === selProductId);
    const variant = prod?.variants.find(v => v.id === selVariantId);
    if (!prod || !variant) return;

    const cartons = parseInt(composerCartons) || 1;
    const piecesPerCtn = parseInt(composerPiecesPerCtn) || 12; // customizable pieces
    const totalNewPieces = cartons * piecesPerCtn;
    const unitPrice = composerPriceOverride ? parseInt(composerPriceOverride) : (prod.wholesalePrice || prod.basePrice);

    // Check if variant already exists in composer
    const existingIdx = composerItems.findIndex(item => item.variantId === selVariantId);
    if (existingIdx !== -1) {
      // Prompt edit
      showCustomConfirm(
        "Article déjà présent",
        `Cette variante (${prod.name} ${variant.size}) est déjà présente dans la commande. Souhaitez-vous la remplacer ?`,
        () => {
          const newItems = [...composerItems];
          newItems[existingIdx] = {
            id: `ITEM-${Date.now()}`,
            productId: prod.id,
            productName: prod.name,
            variantId: variant.id,
            size: variant.size,
            color: variant.color,
            cartonsCount: cartons,
            piecesPerCarton: piecesPerCtn,
            totalPieces: totalNewPieces,
            unitPrice,
            totalAmount: totalNewPieces * unitPrice
          };
          setComposerItems(newItems);
        }
      );
    } else {
      const newItem: WholesaleOrderItem = {
        id: `ITEM-${Date.now()}`,
        productId: prod.id,
        productName: prod.name,
        variantId: variant.id,
        size: variant.size,
        color: variant.color,
        cartonsCount: cartons,
        piecesPerCarton: piecesPerCtn,
        totalPieces: totalNewPieces,
        unitPrice,
        totalAmount: totalNewPieces * unitPrice
      };
      setComposerItems([...composerItems, newItem]);
    }

    // Reset item add form preserving same product if desired
    setComposerCartons('1');
    setComposerPriceOverride('');
  };

  // CALCULATE RUNNING SUMS
  const orderSubtotal = composerItems.reduce((acc, item) => acc + item.totalAmount, 0);
  const orderDiscount = 0; // can add custom discount if wanted
  const orderTotal = orderSubtotal;

  // GENERATE SCHEDULE ON COMMITTING OR TABBING
  const handleGenerateInstallments = () => {
    const defaultInstallmentsCount = Math.max(2, installmentCount);
    const depositAmount = paymentType === 'CASH_COMPTANT' ? orderTotal : (parseInt(initialDeposit) || 0);
    const remainingToStagger = Math.max(0, orderTotal - depositAmount);
    const amountPerTranche = Math.floor(remainingToStagger / defaultInstallmentsCount);
    const generated: { dueDate: string; amount: number }[] = [];
    
    const today = new Date();
    for (let i = 1; i <= defaultInstallmentsCount; i++) {
      // Due Date spaced by 30 days
      const dueDate = new Date();
      dueDate.setDate(today.getDate() + (i * 30));
      
      // Last installment gets remaining cents/rounding
      const schedAmount = (i === defaultInstallmentsCount) 
        ? (remainingToStagger - (amountPerTranche * (defaultInstallmentsCount - 1)))
        : amountPerTranche;

      generated.push({
        dueDate: dueDate.toISOString().split('T')[0],
        amount: schedAmount
      });
    }
    setCustomInstallments(generated);
  };

  useEffect(() => {
    if (paymentType === 'INSTALLMENTS') {
      handleGenerateInstallments();
    }
  }, [initialDeposit, installmentCount, paymentType, orderTotal]);

  // UPDATE SINGLE VALUE IN CUSTOM SCHEDULE
  const updateCustomInstallmentVal = (idx: number, field: 'dueDate' | 'amount', value: string) => {
    const updated = [...customInstallments];
    if (field === 'dueDate') {
      updated[idx].dueDate = value;
    } else {
      updated[idx].amount = parseInt(value) || 0;
    }
    setCustomInstallments(updated);
  };

  // COMPOSER RESET
  const resetOrderComposer = () => {
    setSelWholesalerId('');
    setComposerItems([]);
    setPaymentType('CASH_COMPTANT');
    setOrderNotes('');
    setCustomInstallments([]);
    setInstallmentCount(3);
    setInitialDeposit('0');
    setSelProductId('');
    setSelVariantId('');
    setComposerCartons('1');
    setComposerPiecesPerCtn('12');
    setComposerPriceOverride('');
  };

  // --- SUBMIT COMPLETED B2B WHOLESALE ORDER FROM A TO Z ---
  const handlePlaceWholesaleOrder = () => {
    if (isSellingDisabled) {
      showCustomAlert(
        "Opération Bloquée",
        "Erreur : Impossible d'enregistrer l'ordre de vente. Vos opérations d'enregistrement et d'émissions de commandes de gros sont actuellement bloquées ou hors horaires.",
        "error"
      );
      return;
    }
    if (!selWholesalerId) {
      showCustomAlert(
        "Grossiste requis",
        "Veuillez sélectionner un grossiste partenaire pour cette commande de gros.",
        "warning"
      );
      return;
    }
    if (composerItems.length === 0) {
      showCustomAlert(
        "Commande de gros vide",
        "Veuillez ajouter au moins un produit à la commande de gros avant de l'émettre.",
        "warning"
      );
      return;
    }

    const wholesaler = wholesalers.find(w => w.id === selWholesalerId);
    if (!wholesaler) return;

    // Gather upfront deposit amount
    const depositAmount = paymentType === 'CASH_COMPTANT' ? orderTotal : Math.min(orderTotal, parseInt(initialDeposit) || 0);
    const remainingToStagger = Math.max(0, orderTotal - depositAmount);

    // Build installments if échelonné, or unpaid bulk credit
    let installmentsToSave: Installment[] = [];
    if (paymentType === 'INSTALLMENTS') {
      const scheduleSum = customInstallments.reduce((acc, inst) => acc + inst.amount, 0);
      if (scheduleSum !== remainingToStagger || customInstallments.length === 0) {
        // Automatically balance/regenerate so it doesn't fail or block
        const defaultInstallmentsCount = Math.max(2, installmentCount || 3);
        const amountPerTranche = Math.floor(remainingToStagger / defaultInstallmentsCount);
        const generated: Installment[] = [];
        const today = new Date();
        
        for (let i = 1; i <= defaultInstallmentsCount; i++) {
          const dueDateObj = new Date();
          dueDateObj.setDate(today.getDate() + (i * 30));
          const schedAmount = (i === defaultInstallmentsCount) 
            ? (remainingToStagger - (amountPerTranche * (defaultInstallmentsCount - 1)))
            : amountPerTranche;
            
          generated.push({
            id: `TR-${Date.now()}-${i}`,
            dueDate: dueDateObj.toISOString().split('T')[0],
            amount: schedAmount,
            amountPaid: 0,
            status: 'PENDING'
          });
        }
        installmentsToSave = generated;
      } else {
        installmentsToSave = customInstallments.map((inst, idx) => ({
          id: `TR-${Date.now()}-${idx}`,
          dueDate: inst.dueDate,
          amount: inst.amount,
          amountPaid: 0,
          status: 'PENDING'
        }));
      }
    } else if (paymentType === 'CREDIT') {
      // 1 sole installment due in 30 days
      const thirtyDaysLater = new Date();
      thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);
      installmentsToSave = [{
        id: `TR-${Date.now()}-0`,
        dueDate: thirtyDaysLater.toISOString().split('T')[0],
        amount: remainingToStagger,
        amountPaid: 0,
        status: 'PENDING'
      }];
    }

    // Initial payment
    const initialPaymentAmount = depositAmount;
    const initialPaymentsHistory: WholesalePayment[] = [];

    if (initialPaymentAmount > 0) {
      initialPaymentsHistory.push({
        id: `WP-${Date.now()}-INITIAL`,
        date: new Date().toISOString(),
        amount: initialPaymentAmount,
        paymentMethod: 'CASH', // default initial
        notes: paymentType === 'CASH_COMPTANT' ? 'Paiement comptant initial à la facture' : `Acompte initial de ${formatXOF(initialPaymentAmount)} enregistré`,
        receivedBy: currentUser.name
      });
    }

    const totalUnpaid = paymentType === 'CASH_COMPTANT' ? 0 : remainingToStagger;
    const creditExceeded = totalUnpaid > 0 && (wholesaler.balance + totalUnpaid > wholesaler.creditLimit);

    // Prepare Products Decrement Update
    let anyStockUnderRef = false;
    const updatedProducts = products.map(p => {
      const pWithClonedVariants = { ...p, variants: [...p.variants] };
      composerItems.forEach(item => {
        if (item.productId === p.id) {
          pWithClonedVariants.variants = pWithClonedVariants.variants.map(v => {
            if (v.id === item.variantId) {
              const nextStock = v.stock - item.totalPieces;
              if (nextStock < 0) anyStockUnderRef = true;
              return { ...v, stock: nextStock };
            }
            return v;
          });
        }
      });
      return pWithClonedVariants;
    });

    // Helper to perform the actual persistence
    const proceedWithSave = () => {
      // Update Products Stock state
      setProducts(updatedProducts);

      // Create Stock Movement log for each item
      composerItems.forEach(item => {
        trackMovement(
          item.productId,
          item.variantId,
          'SALE',
          -item.totalPieces,
          `Vente Gros - ${wholesaler.companyName}`
        );
      });

      // Update Wholesaler outstanding Balance (Debts)
      const unpaidDebt = orderTotal - initialPaymentAmount;
      setWholesalers(prev => prev.map(w => {
        if (w.id === selWholesalerId) {
          return { ...w, balance: w.balance + unpaidDebt };
        }
        return w;
      }));

      const generatedId = `GROS-O-${Math.floor(100000 + Math.random() * 900000)}`;

      // Prepare Wholesale Order
      const newWOrder: WholesaleOrder = {
        id: generatedId,
        wholesalerId: selWholesalerId,
        date: new Date().toISOString(),
        items: composerItems,
        subtotal: orderSubtotal,
        tax: 0,
        discount: 0,
        total: orderTotal,
        amountPaid: initialPaymentAmount,
        paymentType,
        installments: installmentsToSave,
        payments: initialPaymentsHistory,
        deliveryStatus: 'PENDING',
        paymentStatus: initialPaymentAmount >= orderTotal ? 'PAID' : (initialPaymentAmount > 0 ? 'PARTIALLY_PAID' : 'UNPAID'),
        notes: orderNotes,
        createdByUser: currentUser.name
      };

      // Record B2B Order
      setWholesaleOrders(prev => [newWOrder, ...prev]);

      addAuditLog(
        'WHOLESALE_ORDER_CREATED',
        `Facturation de Gros #${newWOrder.id} émise pour ${wholesaler.companyName}. Règlement: ${paymentType === 'CASH_COMPTANT' ? 'COMPTANT' : 'ÉCHELONNELENT'}. Total: ${formatXOF(orderTotal)}`,
        'INFO'
      );

      showCustomAlert(
        "Commande enregistrée",
        `Félicitations ! Commande de Gros #${newWOrder.id} enregistrée avec succès.`,
        "success",
        () => {
          resetOrderComposer();
          setActiveTab('ORDERS_LEDGER');
        }
      );
    };

    // Analyze warnings list
    const warnings: string[] = [];
    if (creditExceeded) {
      warnings.push(`Dépassement crédit : Le montant non payé de cette commande (${formatXOF(totalUnpaid)}) dépasse la limite de crédit accordée à ${wholesaler.name} (Reste max : ${formatXOF(wholesaler.creditLimit - wholesaler.balance)}).`);
    }
    if (anyStockUnderRef) {
      warnings.push("Stock insuffisant : Certains articles de la commande dépassent le stock physique en boutique (le stock deviendra négatif).");
    }

    if (warnings.length > 0) {
      const warningMessage = warnings.join("\n\n");
      showCustomConfirm(
        "⚠️ Alertes importantes de Commande",
        `Attention, les alertes suivantes ont été relevées :\n\n${warningMessage}\n\nSouhaitez-vous forcer la commande de gros de ${formatXOF(orderTotal)} malgré ces limites ?`,
        proceedWithSave,
        undefined,
        "Forcer la commande",
        "Modifier d'abord"
      );
    } else {
      showCustomConfirm(
        "Confirmer l'émission de la commande",
        `Voulez-vous enregistrer cette commande de gros de ${formatXOF(orderTotal)} pour le partenaire grossiste "${wholesaler.companyName}" ?`,
        proceedWithSave,
        undefined,
        "Confirmer l'émission",
        "Annuler"
      );
    }
  };

  // --- RECORD PAYMENT REPAYMENT / RECORD VERSEMENT ---
  const handleRecordRepayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRepayOrder) return;
    const amountVal = parseInt(repayAmount) || 0;
    if (amountVal <= 0) {
      showCustomAlert("Montant incorrect", "Veuillez entrer un montant supérieur à 0 F CFA.", "warning");
      return;
    }

    const orderOutstanding = selectedRepayOrder.total - selectedRepayOrder.amountPaid;
    if (amountVal > orderOutstanding) {
      showCustomAlert(
        "Dépassement du solde",
        `Attention : Le versement proposé (${formatXOF(amountVal)}) dépasse le solde restant dû de cette commande (${formatXOF(orderOutstanding)}).`,
        "warning"
      );
      return;
    }

    // Add WholesalePayment object
    const newPayment: WholesalePayment = {
      id: `WP-${Date.now()}`,
      date: new Date().toISOString(),
      amount: amountVal,
      paymentMethod: repayMethod,
      notes: repayNotes,
      receivedBy: currentUser.name,
      installmentId: selectedInstallment?.id || undefined
    };

    let updatedInstallments = [...selectedRepayOrder.installments];
    let remainingPaymentCredit = amountVal;

    // Split payment across matching installment or oldest pending tranche
    if (selectedInstallment) {
      updatedInstallments = updatedInstallments.map(inst => {
        if (inst.id === selectedInstallment.id) {
          const unpaid = inst.amount - inst.amountPaid;
          const apply = Math.min(remainingPaymentCredit, unpaid);
          const nextPaid = inst.amountPaid + apply;
          remainingPaymentCredit -= apply;
          return {
            ...inst,
            amountPaid: nextPaid,
            status: nextPaid >= inst.amount ? 'PAID' : (nextPaid > 0 ? 'PARTIAL' : 'PENDING')
          };
        }
        return inst;
      });
    }

    // If there is still payment left or no specific installment was chosen, pay oldest pending installments
    if (remainingPaymentCredit > 0) {
      updatedInstallments = updatedInstallments.map(inst => {
        if (inst.status !== 'PAID' && remainingPaymentCredit > 0) {
          const unpaid = inst.amount - inst.amountPaid;
          const apply = Math.min(remainingPaymentCredit, unpaid);
          const nextPaid = inst.amountPaid + apply;
          remainingPaymentCredit -= apply;
          return {
            ...inst,
            amountPaid: nextPaid,
            status: nextPaid >= inst.amount ? 'PAID' : (nextPaid > 0 ? 'PARTIAL' : 'PENDING')
          };
        }
        return inst;
      });
    }

    const totalPaidSum = selectedRepayOrder.amountPaid + amountVal;
    const nextPaymentStatus = totalPaidSum >= selectedRepayOrder.total ? 'PAID' : 'PARTIALLY_PAID';

    // Update order in general list
    setWholesaleOrders(prev => prev.map(o => {
      if (o.id === selectedRepayOrder.id) {
        return {
          ...o,
          amountPaid: totalPaidSum,
          paymentStatus: nextPaymentStatus,
          installments: updatedInstallments,
          payments: [...o.payments, newPayment]
        };
      }
      return o;
    }));

    // Update wholesaler outstanding balance (Subtract payment amount)
    setWholesalers(prev => prev.map(w => {
      if (w.id === selectedRepayOrder.wholesalerId) {
        return { ...w, balance: Math.max(0, w.balance - amountVal) };
      }
      return w;
    }));

    // Audit trace
    const wholesaler = wholesalers.find(w => w.id === selectedRepayOrder.wholesalerId);
    addAuditLog(
      'WHOLESALE_REPAYMENT_RECORDED',
      `Versement de ${formatXOF(amountVal)} enregistré pour ${wholesaler?.companyName || 'Grossiste'} (Facture #${selectedRepayOrder.id}) via ${repayMethod}.`,
      'INFO'
    );

    showCustomAlert(
      "Versement enregistré",
      `Versement enregistré avec succès de ${formatXOF(amountVal)} F CFA.`,
      "success"
    );
    setIsRepayModalOpen(false);
    setSelectedRepayOrder(null);
    setSelectedInstallment(null);
    setRepayAmount('');
    setRepayNotes('');
  };

  const handleOpenRepayModal = (order: WholesaleOrder, installment?: Installment) => {
    setSelectedRepayOrder(order);
    setSelectedInstallment(installment || null);
    if (installment) {
      setRepayAmount((installment.amount - installment.amountPaid).toString());
      setRepayNotes(`Virement de la tranche due le ${installment.dueDate}`);
    } else {
      setRepayAmount((order.total - order.amountPaid).toString());
      setRepayNotes(`Règlement partiel/total de la commande #${order.id}`);
    }
    setIsRepayModalOpen(true);
  };

  // TOGGLE SHIPPED STATES
  const handleToggleDeliveryStatus = (order: WholesaleOrder) => {
    const nextStatusMap: Record<WholesaleOrder['deliveryStatus'], WholesaleOrder['deliveryStatus']> = {
      'PENDING': 'SHIPPED',
      'SHIPPED': 'DELIVERED',
      'DELIVERED': 'PENDING'
    };
    const nextStatus = nextStatusMap[order.deliveryStatus];
    
    setWholesaleOrders(prev => prev.map(o => {
      if (o.id === order.id) {
        return { ...o, deliveryStatus: nextStatus };
      }
      return o;
    }));

    const w = wholesalers.find(ws => ws.id === order.wholesalerId);
    addAuditLog('WHOLESALE_DELIVERY_CHANGED', `Commande de gros #${order.id} (${w?.companyName}): status expédition -> ${nextStatus}`);
  };

  // AGGREGATE CORE CALCULATIONS
  const totalOutstandingCredit = wholesalers.reduce((acc, w) => acc + w.balance, 0);
  const totalWholesalersCount = wholesalers.length;
  const overdueInstallmentsCount = wholesaleOrders.reduce((acc, order) => {
    const todayStr = new Date().toISOString().split('T')[0];
    const overdue = order.installments.filter(inst => inst.status !== 'PAID' && inst.dueDate < todayStr).length;
    return acc + overdue;
  }, 0);

  // Filter lists
  const filteredWholesalers = wholesalers.filter(w => {
    return w.name.toLowerCase().includes(searchWholesaler.toLowerCase()) || 
           w.companyName.toLowerCase().includes(searchWholesaler.toLowerCase()) ||
           w.phone.includes(searchWholesaler);
  });

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-10 bg-neutral-50 custom-scrollbar">
      
      {/* Upper header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10 border-b border-black/10 pb-6 print:hidden">
         <div>
            <h1 className="text-xl font-black uppercase tracking-widest text-neutral-900 font-mono flex items-center gap-3">
              <Layers className="w-5 h-5 text-neutral-800" /> Espace Grossistes & Commande Gros
            </h1>
            <p className="text-[10px] text-neutral-400 font-black uppercase tracking-widest mt-1">Espace B2B : Règlements par échelonnements, pièces variables au carton et suivi débiteur</p>
         </div>

         {/* Tab toggle */}
         <div className="flex border-2 border-black p-1 bg-white">
            <button 
              onClick={() => setActiveTab('DIRECTORY')}
              className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'DIRECTORY' ? 'bg-black text-white' : 'bg-transparent text-black'}`}
            >
              🏢 Grossistes & Stats
            </button>
            <button 
              onClick={() => setActiveTab('NEW_ORDER')}
              className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'NEW_ORDER' ? 'bg-black text-white' : 'bg-transparent text-black'}`}
            >
              📝 Saisir Commande de Gros
            </button>
            <button 
              onClick={() => setActiveTab('ORDERS_LEDGER')}
              className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'ORDERS_LEDGER' ? 'bg-black text-white' : 'bg-transparent text-black'}`}
            >
              📦 Suivi Commandes & Échéances
            </button>
         </div>
      </div>

      {/* RETAIL/STATS OVERVIEW */}
      {activeTab === 'DIRECTORY' && (
        <div className="space-y-8 animate-in fade-in duration-200">
          
          {/* Top statistical summaries */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             <div className="bg-white border-b-4 border-black p-6 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-[8px] font-black text-neutral-400 uppercase tracking-widest">Créance Globale B2B</p>
                  <p className="text-2xl font-black font-mono text-black mt-1">{formatXOF(totalOutstandingCredit)}</p>
                  <p className="text-[8px] font-bold text-neutral-400 uppercase mt-1">Encours total à recouvrer</p>
                </div>
                <div className="p-3 bg-neutral-100 rounded-none text-black"><DollarSign className="w-6 h-6" /></div>
             </div>

             <div className="bg-white border-b-4 border-emerald-600 p-6 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-[8px] font-black text-neutral-400 uppercase tracking-widest">Grossistes Partenaires</p>
                  <p className="text-2xl font-black font-mono text-emerald-700 mt-1">{totalWholesalersCount} grossistes</p>
                  <p className="text-[8px] font-bold text-neutral-400 uppercase mt-1">Actifs dans la base</p>
                </div>
                <div className="p-3 bg-emerald-50 rounded-none text-emerald-700"><Users2 className="w-6 h-6" /></div>
             </div>

             <div className="bg-white border-b-4 border-red-650 p-6 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-[8px] font-black text-neutral-400 uppercase tracking-widest">Échéances en Souffrance</p>
                  <p className="text-2xl font-black font-mono text-neutral-900 mt-1">
                     {overdueInstallmentsCount} tranches
                  </p>
                  <p className="text-[8px] font-bold text-red-650 uppercase mt-1 tracking-widest">Retards de versement à relancer</p>
                </div>
                <div className={`p-3 rounded-none ${overdueInstallmentsCount > 0 ? 'bg-red-50 text-red-600' : 'bg-neutral-100 text-neutral-400'}`}>
                  <AlertTriangle className="w-6 h-6" />
                </div>
             </div>
          </div>

          {/* Directory Action bar */}
          <div className="bg-white border border-neutral-100 p-6 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
             <div className="relative w-full md:w-96">
                <Search className="w-4 h-4 text-neutral-400 absolute left-4.5 top-1/2 -translate-y-1/2" />
                <input 
                  type="text"
                  placeholder="RECHERCHER PAR NOM, SOCIÉTÉ OU TÉLÉPHONE..."
                  value={searchWholesaler}
                  onChange={e => setSearchWholesaler(e.target.value)}
                  className="w-full bg-neutral-50 focus:bg-white pl-11 pr-4 py-3 text-[10px] font-bold uppercase tracking-widest outline-none border border-neutral-200 focus:border-black shrink-0"
                />
             </div>
             
             <button
               onClick={() => {
                 setEditingWholesaler(null);
                 setWName('');
                 setWCompany('');
                 setWPhone('');
                 setWEmail('');
                 setWAddress('');
                 setWCreditLimit('2000000');
                 setIsNewWholesalerModalOpen(true);
               }}
               className="bg-black hover:bg-neutral-800 text-white font-black uppercase text-[10px] px-6 py-3.5 tracking-widest flex items-center gap-2"
             >
               <UserPlus className="w-4 h-4" /> Enregistrer un Grossiste
             </button>
          </div>

          {/* Table display */}
          <div className="bg-white border border-neutral-150 shadow-sm overflow-hidden">
             <div className="p-5 border-b border-neutral-100">
                <h3 className="text-xs font-black uppercase tracking-tight text-neutral-900 font-mono">Registre des Grossistes de la Boutique</h3>
             </div>
             <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                   <thead>
                      <tr className="bg-neutral-50/70 border-b border-neutral-200">
                         <th className="p-4 text-[8px] font-black uppercase tracking-widest text-neutral-400">Entreprise / Contact</th>
                         <th className="p-4 text-[8px] font-black uppercase tracking-widest text-neutral-400">Coordonnées</th>
                         <th className="p-4 text-[8px] font-black uppercase tracking-widest text-neutral-400 text-right">Limite de Crédit</th>
                         <th className="p-4 text-[8px] font-black uppercase tracking-widest text-neutral-400 text-right">Créance Restante</th>
                         <th className="p-4 text-[8px] font-black uppercase tracking-widest text-neutral-400 text-center">Ratio de Risque</th>
                         <th className="p-4 text-[8px] font-black uppercase tracking-widest text-neutral-400 text-center">Actions</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-neutral-100">
                      {filteredWholesalers.map(w => {
                         const usedPercent = w.creditLimit > 0 ? (w.balance / w.creditLimit) * 100 : 0;
                         const labelColor = usedPercent >= 90 ? 'text-red-600' : (usedPercent >= 50 ? 'text-amber-600' : 'text-emerald-700');
                         return (
                            <tr key={w.id} className="hover:bg-neutral-50/50 transition-colors">
                               <td className="p-4">
                                  <p className="text-xs font-black text-black uppercase">{w.companyName}</p>
                                  <p className="text-[9px] text-neutral-400 font-bold uppercase tracking-widest mt-0.5">Resp: {w.name}</p>
                               </td>
                               <td className="p-4">
                                  <div className="text-xs font-black font-mono flex items-center gap-2">
                                     {w.phone}
                                     <div className="flex gap-1 border border-neutral-200">
                                       <a href={`tel:${w.phone.replace(/[^0-9+]/g, '')}`} className="p-1 hover:bg-neutral-100 text-neutral-600 hover:text-black transition-colors" title="Appeler">
                                         <Phone className="w-3 h-3" />
                                       </a>
                                       <a href={`https://wa.me/${w.phone.replace(/[^0-9+]/g, '')}`} target="_blank" rel="noopener noreferrer" className="p-1 hover:bg-[#25D366]/20 text-[#25D366] transition-colors" title="WhatsApp">
                                         <MessageCircle className="w-3 h-3" />
                                       </a>
                                     </div>
                                  </div>
                                  {w.email && <p className="text-[9px] text-neutral-400 lowercase min-w-0 mt-1 truncate max-w-[120px]">{w.email}</p>}
                               </td>
                               <td className="p-4 text-right">
                                  <p className="text-xs font-black font-mono text-neutral-600">{formatXOF(w.creditLimit)}</p>
                               </td>
                               <td className="p-4 text-right">
                                  <p className={`text-xs font-black font-mono ${w.balance > 0 ? 'text-red-600' : 'text-neutral-500'}`}>{formatXOF(w.balance)}</p>
                               </td>
                               <td className="p-4 text-center">
                                  <div className="inline-flex flex-col items-center">
                                     <div className="w-16 bg-neutral-200 h-1.5 rounded-full overflow-hidden">
                                        <div 
                                          className={`h-full ${usedPercent >= 90 ? 'bg-red-600' : (usedPercent >= 50 ? 'bg-amber-500' : 'bg-emerald-600')}`} 
                                          style={{ width: `${Math.min(100, usedPercent)}%` }}
                                        ></div>
                                     </div>
                                     <span className={`text-[8px] font-black mt-1 ${labelColor}`}>{Math.round(usedPercent)}% consommé</span>
                                  </div>
                               </td>
                               <td className="p-4">
                                  <div className="flex gap-2 justify-center">
                                     <button 
                                       onClick={() => handleEditWholesaler(w)}
                                       className="px-2.5 py-1.5 bg-neutral-100 hover:bg-neutral-900 hover:text-white text-neutral-700 text-[8px] font-black uppercase tracking-widest transition-colors"
                                     >
                                        Modifier
                                     </button>
                                     <button 
                                       onClick={() => handleDeleteWholesaler(w)}
                                       className="px-2.5 py-1.5 bg-red-50 hover:bg-red-600 hover:text-white text-red-600 text-[8px] font-black uppercase tracking-widest transition-colors"
                                     >
                                        Supprimer
                                     </button>
                                  </div>
                               </td>
                            </tr>
                         );
                      })}
                      {filteredWholesalers.length === 0 && (
                         <tr>
                            <td colSpan={6} className="p-10 text-center text-xs text-neutral-400 font-bold uppercase">Aucun grossiste trouvé. Enregistrez un nouveau partenaire pour démarrer.</td>
                         </tr>
                      )}
                   </tbody>
                </table>
             </div>
          </div>
        </div>
      )}

      {/* NEW B2B ORDER STEP SCREEN */}
      {activeTab === 'NEW_ORDER' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {isSellingDisabled && (
            <div className="bg-red-50 text-red-950 border border-red-200 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="relative flex h-3.5 w-3.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-red-650"></span>
                </span>
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-red-800">
                    SAISIE DE COMMANDE GROSSISTE BLOQUÉE (CONSULTATION)
                  </p>
                  <p className="text-[10px] font-bold text-red-600/90 uppercase tracking-wider mt-0.5">
                    {isUserTimeRestricted 
                      ? `Vos horaires autorisés : ${currentUser.openingTime} - ${currentUser.closingTime || '24:00'}.` 
                      : !currentSession && isCashSessionRequired 
                        ? "Les opérations de facturation de gros sont suspendues en caisse fermée." 
                        : "Les opérations financières sont actuellement closes en raison du verrouillage de caisse."}
                  </p>
                </div>
              </div>
              <div className="text-[9px] font-black uppercase bg-red-650 text-white px-3 py-1.5 tracking-wider">
                 MODE CONSULTATION UNIQUEMENT
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
           
           {/* Cart & Billing setup - Left column */}
           <div className="lg:col-span-2 space-y-8">
              
              {/* Select grossiste step */}
              <div className="bg-white border border-neutral-200 p-8 shadow-sm">
                 <h2 className="text-xs font-black uppercase tracking-tight text-black mb-4 font-mono flex items-center gap-2">
                    <span className="w-5 h-5 bg-black text-white text-[10px] flex items-center justify-center font-bold">1</span> Étape 1 : Grossiste Partenaire
                 </h2>
                 
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                       <label className="text-[8px] font-black text-neutral-400 uppercase tracking-widest block mb-1">Choisir le Grossiste de la Commande</label>
                       <select 
                         value={selWholesalerId} 
                         onChange={e => setSelWholesalerId(e.target.value)}
                         className="w-full bg-neutral-50 px-4 py-3.5 text-[10px] font-black uppercase tracking-widest outline-none border border-neutral-200 focus:border-black cursor-pointer"
                       >
                          <option value="">-- SÉLECTIONNER UN GROSSISTE --</option>
                          {wholesalers.map(wh => (
                             <option key={wh.id} value={wh.id}>
                                {wh.companyName.toUpperCase()} ({wh.name.toUpperCase()})
                             </option>
                          ))}
                       </select>
                    </div>

                    {selWholesalerId && (() => {
                       const wh = wholesalers.find(w => w.id === selWholesalerId);
                       if (!wh) return null;
                       return (
                          <div className="p-4 bg-neutral-50 border border-neutral-150 grid grid-cols-2 gap-4">
                             <div>
                                <span className="text-[8px] font-black text-neutral-400 uppercase tracking-widest block">Créance Actuelle</span>
                                <span className={`text-xs font-black font-mono ${wh.balance > 0 ? 'text-red-650' : 'text-neutral-600'}`}>{formatXOF(wh.balance)}</span>
                             </div>
                             <div>
                                <span className="text-[8px] font-black text-neutral-400 uppercase tracking-widest block">Crédit Disponible</span>
                                <span className="text-xs font-black font-mono">{formatXOF(wh.creditLimit - wh.balance)}</span>
                             </div>
                          </div>
                       );
                    })()}
                 </div>
              </div>

              {/* Compose items step */}
              <div className="bg-white border border-neutral-200 p-8 shadow-sm space-y-6">
                 <h2 className="text-xs font-black uppercase tracking-tight text-black mb-4 font-mono flex items-center gap-2">
                    <span className="w-5 h-5 bg-black text-white text-[10px] flex items-center justify-center font-bold">2</span> Étape 2 : Articles & Encoissage de Cartons (Pièces Variables)
                 </h2>

                 {/* Barcode insertion for item selection */}
                 <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pb-6 border-b border-neutral-100">
                    <div className="md:col-span-2">
                       <label className="text-[8px] font-black text-neutral-400 uppercase tracking-widest block mb-1">Sélectionner Article</label>
                       <select 
                         value={selProductId} 
                         onChange={e => {
                           setSelProductId(e.target.value);
                           const prod = products.find(p => p.id === e.target.value);
                           if (prod) {
                             setSelVariantId(prod.variants[0]?.id || '');
                             setComposerPiecesPerCtn((prod.bulkPackQty || 12).toString());
                           } else {
                             setSelVariantId('');
                           }
                         }}
                         className="w-full bg-neutral-50 px-4 py-3 text-[10px] font-black uppercase tracking-widest outline-none border border-neutral-200 focus:border-black cursor-pointer"
                       >
                          <option value="">-- CHOISIR VÊTEMENT ZARA --</option>
                          {products.map(p => (
                             <option key={p.id} value={p.id}>
                                {p.name.toUpperCase()} (Boutique: {formatXOF(p.basePrice)} / Gros: {formatXOF(p.wholesalePrice || p.basePrice)})
                             </option>
                          ))}
                       </select>
                    </div>

                    {selProductId && (
                      <div>
                         <label className="text-[8px] font-black text-neutral-400 uppercase tracking-widest block mb-1">Choisir Variante</label>
                         <select 
                           value={selVariantId} 
                           onChange={e => setSelVariantId(e.target.value)}
                           className="w-full bg-neutral-50 px-4 py-3 text-[10px] font-black uppercase tracking-widest outline-none border border-neutral-200 focus:border-black cursor-pointer"
                         >
                            <option value="">-- VARIANTES DISPO --</option>
                            {products.find(p => p.id === selProductId)?.variants.map(v => (
                               <option key={v.id} value={v.id}>
                                  {v.size} / {v.color || 'Standard'} (Stock: {v.stock} pcs)
                               </option>
                            ))}
                         </select>
                      </div>
                    )}

                    {selProductId && (
                      <div className="flex items-end">
                         <button 
                           onClick={() => {
                             // Prefill values
                             const prod = products.find(p => p.id === selProductId);
                             if (prod) {
                               setComposerPiecesPerCtn((prod.bulkPackQty || 12).toString());
                             }
                           }}
                           className="text-[9px] font-black text-neutral-500 uppercase tracking-wider py-3 px-2 bg-neutral-150 hover:bg-neutral-200 w-full text-center"
                         >
                            Charger Defaults
                         </button>
                      </div>
                    )}
                 </div>

                 {/* Carton configure */}
                 {selProductId && (
                   <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-neutral-50 border border-neutral-150 animate-in fade-in duration-200">
                      <div>
                         <label className="text-[8px] font-black text-neutral-500 uppercase tracking-widest block mb-1">Cartons à livrer</label>
                         <input 
                           type="number" 
                           min="1"
                           value={composerCartons}
                           onChange={e => setComposerCartons(e.target.value)}
                           className="w-full bg-white px-3 py-2 text-xs font-black outline-none border border-neutral-200 focus:border-black"
                         />
                      </div>
                      <div>
                         {/* DYNAMIC PIECES PER CARTON INPUT */}
                         <label className="text-[8px] font-black text-emerald-800 uppercase tracking-widest block mb-1">Pièces par carton</label>
                         <input 
                           type="number" 
                           min="1"
                           value={composerPiecesPerCtn}
                           onChange={e => setComposerPiecesPerCtn(e.target.value)}
                           className="w-full bg-white px-3 py-2 text-xs font-black text-emerald-900 outline-none border border-emerald-300 focus:border-black"
                           title="Vous pouvez changer le nombre de pièces par carton pour cette livraison."
                         />
                      </div>
                      <div>
                         <label className="text-[8px] font-black text-neutral-500 uppercase tracking-widest block mb-1">Prix de Gros Unit. (Négo)</label>
                         <input 
                           type="number" 
                           placeholder="Laisser vide pour défaut"
                           value={composerPriceOverride}
                           onChange={e => setComposerPriceOverride(e.target.value)}
                           className="w-full bg-white px-3 py-2 text-xs font-black outline-none border border-neutral-200 focus:border-black"
                        />
                      </div>
                      <div className="flex items-end">
                         <button 
                           onClick={handleAddProductToComposer}
                           className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-[9px] font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-1"
                         >
                            <Plus className="w-4 h-4" /> Ajouter Ligne
                         </button>
                      </div>
                   </div>
                 )}

                 {/* List of currently composed items */}
                 <div className="border border-neutral-200 rounded-none overflow-hidden mt-6">
                    <table className="w-full text-left">
                       <thead>
                          <tr className="bg-neutral-50 border-b border-neutral-200 text-[8px] font-black text-neutral-400 uppercase tracking-widest">
                             <th className="p-3">Désignation</th>
                             <th className="p-3 text-center">Cartons</th>
                             <th className="p-3 text-center">Pcs / Carton</th>
                             <th className="p-3 text-center">Total Pièces</th>
                             <th className="p-3 text-right">Tarif Unit;</th>
                             <th className="p-3 text-right">Montant Brut</th>
                             <th className="p-3 text-center">Actions</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-neutral-100 text-[11px] font-semibold text-neutral-700">
                          {composerItems.map(item => (
                             <tr key={item.id} className="hover:bg-neutral-50/40">
                                <td className="p-3 font-bold uppercase text-black">
                                   {item.productName} <span className="text-[9px] text-neutral-400 font-mono">({item.size} / {item.color || 'STND'})</span>
                                </td>
                                <td className="p-3 text-center font-black">{item.cartonsCount} ctn(s)</td>
                                <td className="p-3 text-center font-black font-mono text-emerald-800">{item.piecesPerCarton} pcs/ctn</td>
                                <td className="p-3 text-center font-black font-mono">{item.totalPieces} pièces</td>
                                <td className="p-3 text-right font-black font-mono">{formatXOF(item.unitPrice)}</td>
                                <td className="p-3 text-right font-black font-mono text-black">{formatXOF(item.totalAmount)}</td>
                                <td className="p-3 text-center">
                                   <button 
                                     onClick={() => setComposerItems(composerItems.filter(ci => ci.id !== item.id))}
                                     className="text-red-500 hover:text-red-700 font-black uppercase text-[8px] tracking-wider"
                                   >
                                      Enlever
                                   </button>
                                </td>
                             </tr>
                          ))}
                          {composerItems.length === 0 && (
                             <tr>
                                <td colSpan={7} className="p-8 text-center text-[10px] text-neutral-400 font-black uppercase tracking-widest">Le panier B2B en gros est actuellement vide.</td>
                             </tr>
                          )}
                       </tbody>
                    </table>
                 </div>
              </div>

              {/* Installment repayment setup step */}
              {composerItems.length > 0 && (
                 <div className="bg-white border border-neutral-200 p-8 shadow-sm space-y-6">
                    <h2 className="text-xs font-black uppercase tracking-tight text-black mb-4 font-mono flex items-center gap-2">
                       <span className="w-5 h-5 bg-black text-white text-[10px] flex items-center justify-center font-bold">3</span> Étape 3 : Plan de Financement & Règlements
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-b border-neutral-155 pb-6">
                       <button 
                         type="button"
                         onClick={() => setPaymentType('CASH_COMPTANT')}
                         className={`p-4 border-2 flex flex-col items-center gap-1 justify-center relative cursor-pointer ${paymentType === 'CASH_COMPTANT' ? 'border-black bg-neutral-950/2' : 'border-neutral-200 hover:border-black'}`}
                       >
                          <CheckCircle2 className={`w-5 h-5 ${paymentType === 'CASH_COMPTANT' ? 'text-black' : 'text-neutral-300'}`} />
                          <span className="text-[10px] font-black uppercase tracking-widest text-black">Achat Comptant</span>
                          <span className="text-[8px] text-neutral-400 uppercase tracking-widest">Facture payée en totalité direct</span>
                       </button>

                       <button 
                         type="button"
                         onClick={() => {
                           setPaymentType('INSTALLMENTS');
                           handleGenerateInstallments();
                         }}
                         className={`p-4 border-2 flex flex-col items-center gap-1 justify-center relative cursor-pointer ${paymentType === 'INSTALLMENTS' ? 'border-emerald-600 bg-emerald-50/10' : 'border-neutral-200 hover:border-black'}`}
                       >
                          <Clock className={`w-5 h-5 ${paymentType === 'INSTALLMENTS' ? 'text-emerald-700' : 'text-neutral-300'}`} />
                          <span className="text-[10px] font-black uppercase tracking-widest text-emerald-800">Échelonnement</span>
                          <span className="text-[8px] text-neutral-400 uppercase tracking-widest">Règlement en plusieurs tranches</span>
                       </button>

                       <button 
                         type="button"
                         onClick={() => setPaymentType('CREDIT')}
                         className={`p-4 border-2 flex flex-col items-center gap-1 justify-center relative cursor-pointer ${paymentType === 'CREDIT' ? 'border-amber-600 bg-amber-50/10' : 'border-neutral-200 hover:border-black'}`}
                       >
                          <AlertTriangle className={`w-5 h-5 ${paymentType === 'CREDIT' ? 'text-amber-750' : 'text-neutral-300'}`} />
                          <span className="text-[10px] font-black uppercase tracking-widest text-amber-800">Crédit Simple</span>
                          <span className="text-[8px] text-neutral-400 uppercase tracking-widest">Facturé à crédit (dû à 30 jours)</span>
                       </button>
                    </div>

                    {/* Installments & Deposit specific config */}
                    {(paymentType === 'INSTALLMENTS' || paymentType === 'CREDIT') && (
                       <div className="space-y-6 animate-in fade-in duration-200 mt-6 pt-6 border-t border-dashed border-neutral-200">
                          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-neutral-50 p-4 border border-neutral-150">
                             <div>
                                <span className="text-[9px] font-black text-neutral-400 uppercase tracking-widest block">Acompte à la commande (FCFA)</span>
                                <p className="text-[7px] text-neutral-400 uppercase tracking-widest font-semibold mt-0.5">Montant payé comptant lors de l'établissement de la facture</p>
                             </div>
                             <div className="flex items-center gap-2 w-full md:w-auto">
                                <input 
                                  type="number"
                                  min="0"
                                  max={orderTotal}
                                  value={initialDeposit}
                                  onChange={e => setInitialDeposit(e.target.value)}
                                  className="w-full md:w-32 bg-white border border-neutral-200 px-3 py-2 text-right text-xs font-black outline-none focus:border-black"
                                />
                             </div>
                          </div>
                       </div>
                    )}
                    {paymentType === 'INSTALLMENTS' && (
                       <div className="space-y-6 animate-in fade-in duration-200">
                          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-neutral-50 p-4 border border-neutral-150">
                             <div>
                                <span className="text-[9px] font-black text-neutral-400 uppercase tracking-widest block">Nombre d'échéances / tranches</span>
                                <p className="text-[7px] text-neutral-400 uppercase tracking-widest font-semibold mt-0.5">Espacement automatique de 30 jours entre tranches</p>
                             </div>
                             <div className="flex items-center gap-2">
                                <input 
                                  type="number"
                                  min="2"
                                  max="12"
                                  value={installmentCount}
                                  onChange={e => setInstallmentCount(parseInt(e.target.value) || 3)}
                                  className="w-16 bg-white border border-neutral-200 px-3 py-2 text-center text-xs font-black outline-none focus:border-black"
                                />
                                <button 
                                  onClick={handleGenerateInstallments}
                                  className="bg-black text-white text-[9px] font-black uppercase tracking-[0.15em] px-4 py-2 hover:bg-neutral-800"
                                >
                                   Générer / Équilibrer
                                </button>
                             </div>
                          </div>

                          {/* Render generated installments rows to customize date/amount */}
                          <div className="space-y-3">
                             <span className="text-[9px] font-black text-neutral-400 uppercase tracking-widest block">Échéancier de Facturation (Customisable)</span>
                             {customInstallments.map((inst, i) => (
                                <div key={i} className="flex flex-col md:flex-row items-center gap-4 p-4 border border-dashed border-neutral-200 bg-neutral-50/30">
                                   <div className="w-full md:w-32 shrink-0">
                                      <span className="text-[9px] font-black text-neutral-900 uppercase">Tranche #{i+1}</span>
                                   </div>
                                   <div className="w-full md:w-auto flex-1">
                                      <label className="text-[7px] font-black text-neutral-400 uppercase tracking-widest block mb-0.5">Date limite de paiement</label>
                                      <input 
                                        type="date"
                                        value={inst.dueDate}
                                        onChange={e => updateCustomInstallmentVal(i, 'dueDate', e.target.value)}
                                        className="w-full bg-white border border-neutral-200 px-3 py-2 text-xs font-bold outline-none focus:border-black"
                                      />
                                   </div>
                                   <div className="w-full md:w-auto flex-1">
                                      <label className="text-[7px] font-black text-neutral-400 uppercase tracking-widest block mb-0.5">Montant Dû</label>
                                      <input 
                                        type="number"
                                        value={inst.amount}
                                        onChange={e => updateCustomInstallmentVal(i, 'amount', e.target.value)}
                                        className="w-full bg-white border border-neutral-200 px-3 py-2 text-xs font-black outline-none focus:border-black"
                                      />
                                   </div>
                                </div>
                             ))}

                             {/* Feedback calculation */}
                             {(() => {
                                const sum = customInstallments.reduce((acc, inst) => acc + inst.amount, 0);
                                const deposit = parseInt(initialDeposit) || 0;
                                const remainingToStagger = Math.max(0, orderTotal - deposit);
                                const diff = remainingToStagger - sum;
                                return (
                                   <div className={`p-4 font-mono text-[9px] font-black uppercase tracking-widest flex justify-between items-center ${diff === 0 ? 'bg-emerald-50 text-emerald-800': 'bg-red-50 text-red-700'}`}>
                                      <span>SOMME DES TRANCHES: {formatXOF(sum)}</span>
                                      <span>{diff === 0 ? '✓ PARFAIT : EQUILIBRÉ' : `⚠️ ÉCART : ${formatXOF(diff)} (Veuillez réajuster pour égaler le reste: ${formatXOF(remainingToStagger)})`}</span>
                                   </div>
                                );
                             })()}
                          </div>
                       </div>
                    )}
                 </div>
              )}
           </div>

           {/* Receipt Outline - Right column */}
           <div className="bg-white border-2 border-black p-8 shadow-sm h-fit sticky top-10 space-y-6">
              <div className="text-center border-b border-black pb-4">
                 {settings?.logoUrl ? (
                    <img src={settings.logoUrl} alt="Logo" className="max-h-12 w-auto object-contain mx-auto mb-2" referrerPolicy="no-referrer" />
                 ) : null}
                 <h3 className="font-mono text-lg font-black tracking-tighter text-black uppercase">{settings?.storeName || 'ZARA GALLERY'} B2B</h3>
                 <span className="text-[8px] text-neutral-400 font-bold uppercase tracking-widest block mt-0.5">Bordereau ProFormat de Gros</span>
              </div>

              <div className="space-y-4 text-xs">
                 <div className="flex justify-between items-center text-[10px] font-bold text-neutral-400 uppercase tracking-widest border-b border-neutral-100 pb-2">
                    <span>Grossiste</span>
                    <span className="text-black font-black">
                       {selWholesalerId ? wholesalers.find(w => w.id === selWholesalerId)?.companyName || 'Inconnu' : '-- NON DÉFINI --'}
                    </span>
                 </div>

                 {/* Order lines brief display */}
                 <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {composerItems.map(item => (
                       <div key={item.id} className="flex justify-between text-[11px] font-semibold text-neutral-500">
                          <span className="truncate w-36 uppercase font-bold text-black">{item.productName} ({item.size})</span>
                          <span>{item.cartonsCount} ctn x {item.piecesPerCarton} p = {item.totalPieces} p</span>
                       </div>
                    ))}
                    {composerItems.length === 0 && (
                       <p className="text-[10px] text-center text-neutral-300 font-black uppercase tracking-widest py-4 border border-dashed border-neutral-100">Aucun article ajouté</p>
                    )}
                 </div>

                 <div className="border-t border-black/10 pt-4 space-y-2 font-mono text-[11px]">
                    <div className="flex justify-between">
                       <span className="text-neutral-400 uppercase tracking-widest">TOTAL BRUT</span>
                       <span className="text-neutral-800 font-bold">{formatXOF(orderSubtotal)}</span>
                    </div>
                    <div className="flex justify-between">
                       <span className="text-neutral-400 uppercase tracking-widest">REMISES GROS</span>
                       <span className="text-emerald-700 font-bold">0 F CFA</span>
                    </div>
                    <div className="flex justify-between text-base font-black text-black pt-2 border-t border-black/20">
                       <span>NET À PAYER</span>
                       <span>{formatXOF(orderTotal)}</span>
                    </div>
                 </div>

                 {/* Financial summary values */}
                 <div className="p-3 bg-neutral-900 text-white font-mono text-[9px] uppercase tracking-widest space-y-1.5">
                    <div className="flex justify-between">
                       <span>Type d'encaissement:</span>
                       <span className="font-black text-emerald-400">{paymentType === 'CASH_COMPTANT' ? 'COMPTANT': (paymentType === 'INSTALLMENTS' ? 'ÉCHELONNÉ': 'CRÉDIT')}</span>
                    </div>
                    <div className="flex justify-between">
                       <span>Total Payé Comptant :</span>
                       <span className="font-bold">{formatXOF(paymentType === 'CASH_COMPTANT' ? orderTotal : (parseInt(initialDeposit) || 0))}</span>
                    </div>
                    <div className="flex justify-between border-t border-white/20 pt-1.5 font-black">
                       <span>Créance Débitée :</span>
                       <span className="text-amber-300">{formatXOF(paymentType === 'CASH_COMPTANT' ? 0 : Math.max(0, orderTotal - (parseInt(initialDeposit) || 0)))}</span>
                    </div>
                 </div>

                 {/* Order internal notes */}
                 <div>
                    <label className="text-[8px] font-black text-neutral-400 uppercase tracking-widest block mb-1">Notes internes commande</label>
                    <textarea 
                      placeholder="Commentaires, conditions spéciales de transport..."
                      value={orderNotes}
                      onChange={e => setOrderNotes(e.target.value)}
                      className="w-full bg-neutral-50 px-3 py-2 text-[10px] outline-none border border-neutral-200 focus:border-black h-16 resize-none"
                    />
                 </div>
              </div>

              {isSellingDisabled ? (
                 <div className="bg-red-50 text-red-900 border border-red-200 p-4 text-center mt-6">
                    <p className="text-[10px] font-black uppercase tracking-widest text-red-800">ENREGISTREMENT BLOQUÉ</p>
                    <p className="text-[9px] uppercase font-bold text-neutral-500 mt-1">Vous ne pouvez pas émettre de commande en dehors des horaires ou avec une caisse fermée.</p>
                 </div>
              ) : (
                <button 
                  type="button"
                  onClick={handlePlaceWholesaleOrder}
                  className="w-full py-4 bg-black hover:bg-neutral-800 text-white text-[10px] font-black uppercase tracking-[0.25em] flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                   <PlusCircle className="w-4 h-4" /> Émettre la commande
                </button>
              )}
           </div>
        </div>
        </div>
      )}

      {/* TRACKING AND INSTALMENTS LEDGER SCREEN */}
      {activeTab === 'ORDERS_LEDGER' && (
        <div className="space-y-8 animate-in fade-in duration-200">
           
           {/* Order grid card trackers */}
           <div className="bg-white border border-neutral-150 p-6 shadow-sm">
              <h3 className="text-xs font-black uppercase tracking-tight text-neutral-900 font-mono mb-4">Commandes Grossiste Récentes & Événements financiers</h3>

              <div className="space-y-6">
                 {wholesaleOrders.map(order => {
                    const wholesaler = wholesalers.find(w => w.id === order.wholesalerId);
                    const isOver = order.amountPaid >= order.total;
                    
                    const deliveryColors = {
                      'PENDING': 'bg-amber-100 text-amber-800',
                      'SHIPPED': 'bg-blue-100 text-blue-800',
                      'DELIVERED': 'bg-green-100 text-green-800'
                    };

                    const paymentColors = {
                      'PAID': 'bg-green-100 text-green-800 border-green-200',
                      'PARTIALLY_PAID': 'bg-amber-100 text-amber-800 border-amber-200',
                      'UNPAID': 'bg-red-150 text-red-800 border-red-200'
                    };

                    return (
                       <div key={order.id} className="border border-neutral-200 bg-white shadow-sm flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-neutral-100">
                          {/* Invoice Core Info & Grossiste Target */}
                          <div className="p-6 flex-1 space-y-4">
                             <div className="flex justify-between items-start">
                                <div>
                                   <span className="font-mono text-xs font-black text-black">FACTURE GROS #{order.id}</span>
                                   <p className="text-[8px] text-neutral-400 font-bold uppercase tracking-widest mt-1">Émise le: {new Date(order.date).toLocaleDateString('fr-FR')}</p>
                                </div>
                                <span className={`text-[8px] font-black uppercase tracking-widest border px-2.5 py-1 ${paymentColors[order.paymentStatus]}`}>
                                   {order.paymentStatus === 'PAID' ? 'SOLDOUT': (order.paymentStatus === 'PARTIALLY_PAID' ? 'PARTIEL DU' : 'EN COURS DU')}
                                </span>
                             </div>

                             <div className="pt-2">
                                <span className="text-[8px] font-black text-neutral-400 uppercase tracking-widest block">Acheteur Grossiste :</span>
                                <span className="text-xs font-black text-black uppercase">{wholesaler?.companyName || 'Inconnu'}</span>
                                <p className="text-[9px] text-neutral-400 uppercase tracking-widest">Gérant: {wholesaler?.name}</p>
                             </div>

                             {order.notes && (
                               <p className="text-[10px] text-neutral-500 bg-neutral-50 p-2 italic border-l-2 border-neutral-300">"{order.notes}"</p>
                             )}
                          </div>

                          {/* Inventory / Item Detail summary */}
                          <div className="p-6 w-full md:w-80 space-y-3">
                             <span className="text-[8px] font-black text-neutral-400 uppercase tracking-widest block mb-1">Détails Colisage :</span>
                             <div className="space-y-1 text-[11px] max-h-32 overflow-y-auto">
                                {order.items.map(it => (
                                   <div key={it.id} className="flex justify-between font-semibold text-neutral-600 border-b border-dashed border-neutral-100 pb-1">
                                      <span className="truncate w-36 uppercase font-bold text-black">{it.productName} ({it.size})</span>
                                      <span className="font-mono font-black">{it.cartonsCount} CTN x {it.piecesPerCarton} p</span>
                                   </div>
                                ))}
                             </div>
                             <div className="pt-2 text-[10px] uppercase font-black tracking-widest text-neutral-700">
                                Total expédié : {order.items.reduce((acc, i) => acc + i.totalPieces, 0)} pièces
                             </div>
                          </div>

                          {/* Staggered repayments (Échéances Timeline) */}
                          <div className="p-6 flex-1 space-y-4">
                             <span className="text-[8px] font-black text-neutral-400 uppercase tracking-widest block">Tableau des Échéances de Règlement :</span>
                             
                             <div className="space-y-2.5">
                                {order.installments.map((inst, i) => {
                                   const isOverdue = inst.status !== 'PAID' && inst.dueDate < new Date().toISOString().split('T')[0];
                                   return (
                                      <div key={inst.id} className={`flex justify-between items-center p-2.5 border ${inst.status === 'PAID' ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : (isOverdue ? 'bg-red-50 border-red-150 text-red-650' : 'bg-neutral-50 border-neutral-200 text-neutral-700')}`}>
                                         <div>
                                            <span className="text-[9px] font-black uppercase">Tranche {i+1} : {formatXOF(inst.amount)}</span>
                                            <p className="text-[7px] font-bold uppercase tracking-widest mt-0.5">Échéance : {new Date(inst.dueDate).toLocaleDateString('fr-FR')} {isOverdue && '⚠️ EN RETARD'}</p>
                                         </div>
                                         
                                         <div className="flex gap-2">
                                            {inst.status !== 'PAID' ? (
                                               <button 
                                                 onClick={() => handleOpenRepayModal(order, inst)}
                                                 className="px-2 py-1 bg-black hover:bg-neutral-800 text-white text-[8px] font-black uppercase tracking-widest transition-colors cursor-pointer"
                                               >
                                                  Encaisser
                                               </button>
                                            ) : (
                                               <span className="text-[8px] font-black uppercase text-emerald-800">✓ PAYÉ</span>
                                            )}
                                         </div>
                                      </div>
                                   );
                                })}

                                {order.installments.length === 0 && (
                                   <div className="p-3 bg-neutral-50 text-center text-[9px] font-black text-neutral-400 uppercase">
                                      Payé comptant au comptable de la boutique (Pas d'échéances)
                                   </div>
                                )}
                             </div>
                          </div>

                          {/* Payment Recap Stats & Actions */}
                          <div className="p-6 w-full md:w-64 space-y-4 text-right">
                             <div>
                                <span className="text-[8px] font-black text-neutral-400 uppercase tracking-widest block">MONTANT TOTAL DUE</span>
                                <span className="text-lg font-black font-mono text-black">{formatXOF(order.total)}</span>
                             </div>
                             
                             <div>
                                <span className="text-[8px] font-black text-neutral-400 uppercase tracking-widest block">Somme reçue</span>
                                <span className="text-sm font-black font-mono text-emerald-700">{formatXOF(order.amountPaid)}</span>
                             </div>

                             <div>
                                <span className="text-[8px] font-black text-neutral-400 uppercase tracking-widest block">Reste à payer</span>
                                <span className="text-sm font-black font-mono text-red-600">{formatXOF(order.total - order.amountPaid)}</span>
                             </div>

                             <div className="pt-4 flex flex-col gap-2">
                                {/* Print B2B Invoice trigger */}
                                <button 
                                  onClick={() => {
                                    setActiveDetailsOrder(order);
                                    // Trigger simple print window helper or custom overlay
                                  }}
                                  className="w-full py-2 border border-black hover:bg-neutral-50 text-black text-[8px] font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                                >
                                   <Printer className="w-3.5 h-3.5" /> imprimer Facture B2B
                                </button>
                                
                                {/* Delivery status controls */}
                                <button 
                                  onClick={() => handleToggleDeliveryStatus(order)}
                                  className={`w-full py-2 hover:opacity-90 text-[8px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 cursor-pointer ${deliveryColors[order.deliveryStatus]}`}
                                >
                                   <Truck className="w-3.5 h-3.5" /> Livrer: {order.deliveryStatus}
                                </button>

                                {/* Direct custom payment */}
                                {!isOver && (
                                   <button 
                                     onClick={() => handleOpenRepayModal(order)}
                                     className="w-full py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-[8px] font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                                   >
                                      <DollarSign className="w-3.5 h-3.5" /> Versement Libre
                                   </button>
                                )}
                             </div>
                          </div>
                       </div>
                    );
                 })}
                 {wholesaleOrders.length === 0 && (
                    <div className="p-16 border-2 border-dashed border-neutral-100 text-center">
                       <p className="text-xs text-neutral-300 font-black uppercase tracking-widest">Aucune commande de gros enregistrée sur cet appareil.</p>
                       <p className="text-[8px] text-neutral-400 uppercase tracking-widest mt-1">Utilisez l'onglet de gauche pour enregistrer les articles achetés par carton par vos partenaires.</p>
                    </div>
                 )}
              </div>
           </div>
        </div>
      )}


      {/* MODAL 1: NEW/EDIT WHOLESALER */}
      {isNewWholesalerModalOpen && (
        <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-xs grid place-items-center overflow-y-auto z-[110] p-4 py-12 font-sans">
           <div className="bg-white border-2 border-black w-full max-w-lg p-6 md:p-8 animate-in zoom-in-95 duration-150 shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
              
              <div className="flex justify-between items-center border-b border-neutral-100 pb-4 mb-6">
                 <div>
                    <span className="text-[8px] font-black text-neutral-400 uppercase tracking-widest block">REGISTRE PARTENAIRE</span>
                    <h3 className="text-xs font-black uppercase tracking-tight text-black font-mono">
                       {editingWholesaler ? 'Modifier Fiche Grossiste' : 'Inscrire Nouveau Grossiste'}
                    </h3>
                 </div>
                 <button 
                   onClick={() => setIsNewWholesalerModalOpen(false)}
                   className="text-neutral-400 hover:text-black font-bold uppercase text-[9px] tracking-widest"
                 >
                    Fermer
                 </button>
              </div>

              <form onSubmit={handleWholesalerSubmit} className="space-y-5">
                 <div>
                    <label className="text-[8px] font-black text-neutral-400 uppercase tracking-widest block mb-1">Nom Complet Représentant (*)</label>
                    <input 
                      required
                      type="text"
                      value={wName}
                      onChange={e => setWName(e.target.value)}
                      placeholder="Ex: AMADOU DIALLO"
                      className="w-full bg-neutral-50 px-4 py-3 text-[10px] font-bold uppercase tracking-widest outline-none border border-neutral-200 focus:border-black"
                    />
                 </div>

                 <div>
                    <label className="text-[8px] font-black text-neutral-400 uppercase tracking-widest block mb-1 font-mono">Raison Sociale / Société (*)</label>
                    <input 
                      required
                      type="text"
                      value={wCompany}
                      onChange={e => setWCompany(e.target.value)}
                      placeholder="Ex: BOUTIQUE DIALLO FRÈRES BURKINA"
                      className="w-full bg-neutral-50 px-4 py-3 text-[10px] font-bold uppercase tracking-widest outline-none border border-neutral-200 focus:border-black"
                    />
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div>
                       <label className="text-[8px] font-black text-neutral-400 uppercase tracking-widest block mb-1">Téléphone (*)</label>
                       <input 
                         required
                         type="tel"
                         value={wPhone}
                         onChange={e => setWPhone(e.target.value)}
                         placeholder="+221 77 123 45 67"
                         className="w-full bg-neutral-50 px-4 py-3 text-[10px] font-bold uppercase tracking-widest outline-none border border-neutral-200 focus:border-black"
                       />
                    </div>
                    <div>
                       <label className="text-[8px] font-black text-neutral-400 uppercase tracking-widest block mb-1">Email (Optionnel)</label>
                       <input 
                         type="email"
                         value={wEmail}
                         onChange={e => setWEmail(e.target.value)}
                         placeholder="amadou@gmail.com"
                         className="w-full bg-neutral-50 px-4 py-3 text-[10px] font-normal tracking-wide outline-none border border-neutral-200 focus:border-black"
                       />
                    </div>
                 </div>

                 <div>
                    <label className="text-[8px] font-black text-neutral-400 uppercase tracking-widest block mb-1">Adresse Géographique</label>
                    <input 
                      type="text"
                      value={wAddress}
                      onChange={e => setWAddress(e.target.value)}
                      placeholder="Adresse, Grand Marché, Ouagadougou"
                      className="w-full bg-neutral-50 px-4 py-3 text-[10px] font-bold uppercase tracking-widest outline-none border border-neutral-200 focus:border-black"
                    />
                 </div>

                 <div>
                    <label className="text-[8px] font-black text-neutral-400 uppercase tracking-widest block mb-1">Limite maximale de crédit autorisé (F CFA)</label>
                    <input 
                      type="number"
                      value={wCreditLimit}
                      onChange={e => setWCreditLimit(e.target.value)}
                      placeholder="2000000"
                      className="w-full bg-neutral-50 px-4 py-3 text-[10px] font-black outline-none border border-neutral-200 focus:border-black"
                    />
                    <span className="text-[7px] text-neutral-400 uppercase tracking-widest mt-1 block">La commande de gros sera bloquée ou déclenchera une alerte si l'encours du client dépasse ce seuil.</span>
                 </div>

                 <button 
                   type="submit"
                   className="w-full py-4 bg-black hover:bg-neutral-800 text-white text-[10px] font-black uppercase tracking-[0.25em] transition-all cursor-pointer"
                 >
                    {editingWholesaler ? 'Enregistrer Modifications' : 'Créer le Compte Grossiste'}
                 </button>
              </form>
           </div>
        </div>
      )}

      {/* MODAL 2: RECORD PAYMENT (Repayment of installment) */}
      {isRepayModalOpen && selectedRepayOrder && (
         <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-xs grid place-items-center overflow-y-auto z-[110] p-4 py-12">
            <div className="bg-white border-2 border-black w-full max-w-md p-6 md:p-8 animate-in zoom-in-95 duration-150 shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
               
               <div className="flex justify-between items-center border-b border-neutral-200 pb-4 mb-6">
                  <div>
                     <span className="text-[8px] font-black text-neutral-400 uppercase tracking-widest block">CAISSIER RECOUVREMENT</span>
                     <h3 className="text-xs font-black uppercase tracking-tight text-emerald-800 font-mono">
                        Saisir un encaissement versement
                     </h3>
                  </div>
                  <button 
                    onClick={() => {
                      setIsRepayModalOpen(false);
                      setSelectedRepayOrder(null);
                      setSelectedInstallment(null);
                    }}
                    className="text-neutral-400 hover:text-black font-bold uppercase text-[9px] tracking-widest"
                  >
                     Fermer
                  </button>
               </div>

               <form onSubmit={handleRecordRepayment} className="space-y-5">
                  <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-none text-[10px] uppercase font-bold space-y-1">
                     <div className="flex justify-between">
                        <span className="text-neutral-400">FACTURE GROS COMPUTE:</span>
                        <span className="text-black font-black">#{selectedRepayOrder.id}</span>
                     </div>
                     <div className="flex justify-between">
                        <span className="text-neutral-400">CONCERNÉ:</span>
                        <span className="text-black font-black truncate max-w-40">
                           {wholesalers.find(w => w.id === selectedRepayOrder.wholesalerId)?.companyName}
                        </span>
                     </div>
                     {selectedInstallment && (
                        <div className="flex justify-between text-emerald-800 font-black border-t border-dashed border-neutral-200 pt-1">
                           <span>TRANCHE CILBÉE :</span>
                           <span>DUE LE {new Date(selectedInstallment.dueDate).toLocaleDateString('fr-FR')}</span>
                        </div>
                     )}
                  </div>

                  <div>
                     <label className="text-[8px] font-black text-neutral-400 uppercase tracking-widest block mb-1">Montant Reçu (F CFA) (*)</label>
                     <input 
                       required
                       type="number"
                       value={repayAmount}
                       onChange={e => setRepayAmount(e.target.value)}
                       className="w-full bg-neutral-50 px-4 py-3 text-xs font-black outline-none border border-neutral-200 focus:border-black"
                     />
                     <span className="text-[7px] text-neutral-400 uppercase mt-1 block">Reste total à payer: {formatXOF(selectedRepayOrder.total - selectedRepayOrder.amountPaid)}</span>
                  </div>

                  <div>
                     <label className="text-[8px] font-black text-neutral-400 uppercase tracking-widest block mb-1">Mode de règlement</label>
                     <select 
                       value={repayMethod}
                       onChange={e => setRepayMethod(e.target.value as any)}
                       className="w-full bg-neutral-50 px-4 py-3 text-[10px] font-bold uppercase tracking-widest outline-none border border-neutral-200 focus:border-black cursor-pointer"
                     >
                        <option value="CASH">ESPÈCES</option>
                        <option value="MOBILE_MONEY">MOBILE MONEY</option>
                        <option value="CARD">CARTE BANCAIRE</option>
                        <option value="VIREMENT">VIREMENT BANCAIRE</option>
                        <option value="CHEQUE">CHÈQUE BANCAIRE</option>
                     </select>
                  </div>

                  <div>
                     <label className="text-[8px] font-black text-neutral-400 uppercase tracking-widest block mb-1">Notes de Paiement / Reçu</label>
                     <input 
                       type="text"
                       value={repayNotes}
                       onChange={e => setRepayNotes(e.target.value)}
                       placeholder="Numéro de transaction, chèque ou nom dépositaire..."
                       className="w-full bg-neutral-50 px-4 py-3 text-[10px] font-bold uppercase tracking-widest outline-none border border-neutral-200 focus:border-black"
                     />
                  </div>

                  <button 
                    type="submit"
                    className="w-full py-4 bg-emerald-700 hover:bg-emerald-800 text-white text-[10px] font-black uppercase tracking-[0.25em] transition-all cursor-pointer"
                  >
                     Enregistrer le Paiement
                  </button>
               </form>
            </div>
         </div>
      )}


      {/* OVERLAY / SHEET MODAL: INVOICE PRINT B2B VIEW */}
      {activeDetailsOrder && (() => {
         const wh = wholesalers.find(w => w.id === activeDetailsOrder.wholesalerId);
         const handlePrintInvoiceA4 = () => {
            try {
              printElement('printable-b2b-invoice', 'Facture B2B ZARA GALLERY', 'A4');
            } catch (e) {
              console.error("Print error", e);
            }
         };
         
         const handlePrintInvoice58 = () => {
            try {
              printElement('printable-b2b-invoice', 'Facture B2B ZARA GALLERY', '58mm');
            } catch (e) {
              console.error("Print error", e);
            }
         };
         const handlePrintInvoice_unused = () => {
           try {
             window.print();
           } catch (e) {
             console.error("Print error", e);
             alert("Veuillez autoriser l'impression.");
           }
         };

         return (
            <div className="fixed inset-0 bg-neutral-900/75 backdrop-blur-xs grid place-items-center overflow-y-auto z-[120] p-4 py-12">
               <div className="bg-white border-4 border-black w-full max-w-3xl p-8 shadow-2xl animate-in fade-in duration-200 max-h-[90vh] overflow-y-auto custom-scrollbar">
                  
                  {/* Action buttons on top */}
                  <div className="flex justify-between items-center pb-4 mb-6 border-b border-neutral-200 print:hidden">
                     <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest font-mono">APERCU AVANT IMPRESSION FACTURE B2B</span>
                     <div className="flex gap-2">
                        <button 
                          onClick={handlePrintInvoiceA4}
                          className="bg-neutral-100 hover:bg-neutral-200 text-black font-black uppercase text-[9px] tracking-widest px-4 py-2.5 flex items-center gap-1.5"
                        >
                           <Printer className="w-3.5 h-3.5" /> Impression A4
                        </button>
                        <button 
                          onClick={handlePrintInvoice58}
                          className="bg-black hover:bg-neutral-850 text-white font-black uppercase text-[9px] tracking-widest px-4 py-2.5 flex items-center gap-1.5"
                        >
                           <Printer className="w-3.5 h-3.5" /> Ticket 58mm
                        </button>
                        <button 
                          onClick={async () => {
                             try {
                               const element = document.getElementById('printable-b2b-invoice');
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
                               pdf.save(`Facture-B2B-${activeDetailsOrder.id}.pdf`);
                               
                               // Restore buttons
                               if (buttons) (buttons as HTMLElement).style.display = 'flex';
                             } catch (e) {
                               console.error("PDF generation failed:", e);
                               alert("Erreur lors de la génération du PDF");
                             }
                          }}
                          className="bg-emerald-700 hover:bg-emerald-800 text-white font-black uppercase text-[9px] tracking-widest px-4 py-2.5 flex items-center gap-1.5"
                        >
                           Télécharger PDF
                        </button>
                        <button 
                          onClick={() => setActiveDetailsOrder(null)}
                          className="bg-neutral-100 hover:bg-neutral-250 text-zinc-900 font-black uppercase text-[9px] tracking-widest px-4 py-2.5"
                        >
                           Fermer
                        </button>
                     </div>
                  </div>

                  {/* REAL INTENT PRINT LAYOUT CANVAS */}
                  <style dangerouslySetInnerHTML={{__html: `
                    @media print {
                      @page { size: auto; margin: 0; }
                      body {
                        visibility: hidden !important;
                        margin: 0 !important;
                        padding: 0 !important;
                      }
                      #printable-b2b-invoice, #printable-b2b-invoice * {
                        visibility: visible !important;
                      }
                      #printable-b2b-invoice {
                        position: absolute !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: 100% !important;
                        max-width: 100% !important;
                        padding: 24px !important;
                        margin: 0 !important;
                        border: none !important;
                        box-shadow: none !important;
                      }
                    }
                  `}} />
                  <div className="bg-white text-zinc-900 font-sans p-2 select-text" id="printable-b2b-invoice">
                     <div className="flex justify-between items-start border-b-2 border-black pb-6">
                        <div className="flex items-center gap-4">
                           {settings?.logoUrl ? (
                              <img src={settings.logoUrl} alt="Logo" className="max-h-16 w-auto object-contain" referrerPolicy="no-referrer" />
                           ) : null}
                           <div>
                              <h1 className="text-3xl font-black tracking-tighter text-black uppercase">{settings?.storeName || 'ZARA GALLERY'}</h1>
                              <p className="text-[8px] font-black text-neutral-500 uppercase tracking-widest mt-0.5">Boutique de Mode B2B & Prêt-à-porter de Luxe</p>
                              <p className="text-[8px] font-medium text-neutral-400 uppercase font-mono mt-1">{settings?.storeAddress || 'Ouagadougou, Burkina Faso'} · Tel: {settings?.storePhone || '+226 25 30 00 00'}</p>
                           </div>
                        </div>
                        <div className="text-right font-mono">
                           <span className="bg-black text-white text-[9px] font-black uppercase px-2 py-1 tracking-widest block mb-2">FACTURE B2B DE GROS</span>
                           <span className="text-xs font-black text-neutral-950 block">REF: #{activeDetailsOrder.id}</span>
                           <span className="text-[8px] font-bold text-neutral-400 uppercase tracking-widest block mt-0.5">Date: {new Date(activeDetailsOrder.date).toLocaleDateString('fr-FR')}</span>
                        </div>
                     </div>

                     <div className="grid grid-cols-2 gap-8 py-6 text-xs">
                        <div>
                           <span className="text-[8px] font-black text-neutral-400 uppercase tracking-widest block mb-1">Émetteur / Vendeur :</span>
                           <p className="font-bold text-black uppercase">{settings?.storeName || 'ZARA GALLERY'}</p>
                           <p className="text-neutral-500 uppercase mt-0.5 font-bold">Conseiller: {activeDetailsOrder.createdByUser}</p>
                           <p className="text-[9px] text-neutral-400 uppercase mt-0.5">Statut: Enregistrement Physique</p>
                        </div>
                        <div>
                           <span className="text-[8px] font-black text-neutral-400 uppercase tracking-widest block mb-1">Grossiste Bénéficiaire / Client :</span>
                           <p className="font-black text-black uppercase text-sm">{wh?.companyName}</p>
                           <p className="text-neutral-500 mt-0.5 font-bold uppercase">Rep: {wh?.name}</p>
                           <div className="flex items-center gap-2 mt-1">
                             <p className="text-neutral-500 font-mono">Tél/WhatsApp : {wh?.phone}</p>
                             {wh?.phone && (
                               <div className="flex gap-1 border border-neutral-200 ml-1">
                                 <a href={`tel:${wh.phone.replace(/[^0-9+]/g, '')}`} className="p-1 hover:bg-neutral-100 text-neutral-600 hover:text-black transition-colors" title="Appeler">
                                   <Phone className="w-3 h-3" />
                                 </a>
                                 <a href={`https://wa.me/${wh.phone.replace(/[^0-9+]/g, '')}`} target="_blank" rel="noopener noreferrer" className="p-1 hover:bg-[#25D366]/10 text-[#25D366] transition-colors" title="WhatsApp">
                                   <MessageCircle className="w-3 h-3" />
                                 </a>
                               </div>
                             )}
                           </div>
                           {wh?.address && <p className="text-neutral-400 mt-0.5 uppercase tracking-wide text-[9px]">{wh.address}</p>}
                        </div>
                     </div>

                     {/* Colisage items */}
                     <table className="w-full text-left my-6 border-collapse">
                        <thead>
                           <tr className="border-y border-black/40 bg-neutral-50 uppercase text-[9px] font-black tracking-widest text-neutral-500">
                              <th className="p-3">Désignation Vêtement Zara</th>
                              <th className="p-3 text-center">Cartons</th>
                              <th className="p-3 text-center">Pièces / Carton</th>
                              <th className="p-3 text-center">Total Quantité (Pcs)</th>
                              <th className="p-3 text-right">Tarif Gros (Unit.)</th>
                              <th className="p-3 text-right">Montant Global</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-200 text-xs text-neutral-800">
                           {activeDetailsOrder.items.map(it => (
                              <tr key={it.id} className="font-semibold">
                                 <td className="p-3 uppercase font-black text-black">
                                    {it.productName} <span className="text-[9px] text-neutral-500 font-mono">({it.size} / {it.color || 'STND'})</span>
                                 </td>
                                 <td className="p-3 text-center font-bold">{it.cartonsCount} carton(s)</td>
                                 <td className="p-3 text-center font-bold text-emerald-800">{it.piecesPerCarton} pcs/ctn</td>
                                 <td className="p-3 text-center font-bold font-mono">{it.totalPieces} pièces</td>
                                 <td className="p-3 text-right font-bold font-mono">{formatXOF(it.unitPrice)}</td>
                                 <td className="p-3 text-right font-black font-mono text-black">{formatXOF(it.totalAmount)}</td>
                              </tr>
                           ))}
                        </tbody>
                     </table>

                     <div className="grid grid-cols-5 gap-6 pt-4 border-t border-black/10 font-mono text-xs">
                        <div className="col-span-3 text-[10px] space-y-4">
                           {/* Plan d'échéance list */}
                           <div>
                              <span className="text-[8px] font-black text-neutral-400 uppercase tracking-widest block mb-2">Plan d'Échelonnement Appliqué :</span>
                              <div className="grid grid-cols-2 gap-2">
                                 {activeDetailsOrder.installments.map((inst, idx) => (
                                    <div key={inst.id} className="p-2 border border-neutral-200 flex justify-between items-center text-[10px]">
                                       <span>Tranche {idx+1} ({new Date(inst.dueDate).toLocaleDateString('fr-FR')}) :</span>
                                       <span className={`font-black ${inst.status === 'PAID' ? 'text-emerald-700 font-bold': 'text-neutral-800'}`}>
                                          {formatXOF(inst.amount)} ({inst.status === 'PAID' ? 'PAYÉ': 'DÛ'})
                                       </span>
                                    </div>
                                 ))}
                                 {activeDetailsOrder.installments.length === 0 && (
                                    <div className="p-2 border border-neutral-100 col-span-2 text-neutral-400 text-center font-black uppercase text-[8px] tracking-widest">
                                       RÉGLÉ EN CONTINU AU COMPTANT (0 CRÉANCE)
                                    </div>
                                 )}
                              </div>
                           </div>

                           {/* Notes footer */}
                           <div>
                              <span className="text-[8px] font-black text-neutral-400 uppercase tracking-widest block mb-1">Conditions de transport & Signature:</span>
                              <p className="text-[8px] font-normal text-neutral-400 leading-relaxed uppercase">Les marchandises voyagent aux risques et périls du destinataire. Aucun retour d'articles portés ou décousus n'est accepté après un délai de 48h.</p>
                           </div>
                        </div>

                        {/* Balance recap */}
                        <div className="col-span-2 bg-neutral-950 p-4 text-white uppercase text-[10px] space-y-3 shrink-0 h-fit">
                           <div className="flex justify-between font-bold">
                              <span className="text-neutral-400">TOTAL BRUT:</span>
                              <span>{formatXOF(activeDetailsOrder.subtotal)}</span>
                           </div>
                           <div className="flex justify-between font-bold">
                              <span className="text-neutral-400 font-mono">REMISES GROS:</span>
                              <span className="text-emerald-400">0 F CFA</span>
                           </div>
                           <div className="flex justify-between font-black text-base border-t border-white/20 pt-2">
                              <span>NET TOTAL:</span>
                              <span>{formatXOF(activeDetailsOrder.total)}</span>
                           </div>
                           <div className="flex justify-between font-bold border-t border-white/10 pt-2 text-emerald-400">
                              <span>SOMME PAYÉE:</span>
                              <span>{formatXOF(activeDetailsOrder.amountPaid)}</span>
                           </div>
                           <div className="flex justify-between font-black text-amber-300">
                              <span>CRÉANCE DUE:</span>
                              <span>{formatXOF(activeDetailsOrder.total - activeDetailsOrder.amountPaid)}</span>
                           </div>
                        </div>
                     </div>

                     {/* Signature fields for actual printing */}
                     <div className="grid grid-cols-2 gap-10 pt-16 text-center text-[10px] font-black uppercase mt-12">
                        <div className="border-t border-dashed border-black/40 pt-4">
                           <span>Signature Caissier de la Boutique</span>
                           <div className="h-16"></div>
                        </div>
                        <div className="border-t border-dashed border-black/40 pt-4">
                           <span>signature Partenaire Grossiste</span>
                           <div className="h-16"></div>
                        </div>
                     </div>
                  </div>

               </div>
            </div>
         );
      })()}

      {/* GLOBAL CUSTOM NOTIFICATION AND CONFIRMATION MODAL OVERLAY */}
      {customModal.isOpen && (
         <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-xs grid place-items-center overflow-y-auto z-[200] p-4 py-12 font-mono text-xs">
            <div className="bg-white border-2 border-black w-full max-w-md p-6 md:p-8 animate-in zoom-in-95 duration-150 shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
               <div className="flex items-center gap-3 border-b border-black pb-4 mb-6">
                  {customModal.type === 'error' && <span className="text-red-650 font-black text-lg">🛑</span>}
                  {customModal.type === 'warning' && <span className="text-amber-500 font-black text-lg">⚠️</span>}
                  {customModal.type === 'success' && <span className="text-emerald-600 font-black text-lg">✅</span>}
                  {customModal.type === 'info' && <span className="text-blue-600 font-black text-lg">ℹ️</span>}
                  {customModal.type === 'confirm_generic' && <span className="text-black font-black text-lg">❓</span>}
                  <h3 className="font-bold uppercase tracking-widest text-black text-[11px]">{customModal.title}</h3>
               </div>
               
               <div className="text-zinc-700 font-sans text-[11px] leading-relaxed whitespace-pre-line mb-8 uppercase font-bold">
                  {customModal.message}
               </div>

               <div className="flex gap-3 justify-end font-mono">
                  {customModal.onCancel && (
                     <button
                       onClick={customModal.onCancel}
                       className="px-5 py-2.5 border-2 border-neutral-200 text-zinc-650 hover:bg-neutral-50 font-bold uppercase tracking-widest text-[9px] transition-colors cursor-pointer"
                     >
                        {customModal.cancelLabel || 'Annuler'}
                     </button>
                  )}
                  {customModal.onConfirm && (
                     <button
                       onClick={customModal.onConfirm}
                       className={`px-5 py-2.5 font-black uppercase tracking-widest text-[9px] transition-colors text-white cursor-pointer ${
                         customModal.type === 'error' ? 'bg-red-650 hover:bg-red-700' :
                         customModal.type === 'warning' ? 'bg-amber-600 hover:bg-amber-700' :
                         customModal.type === 'success' ? 'bg-emerald-700 hover:bg-emerald-800' :
                         'bg-black hover:bg-neutral-800'
                       }`}
                     >
                        {customModal.confirmLabel || 'OK'}
                     </button>
                  )}
               </div>
            </div>
         </div>
      )}

    </div>
  );
}

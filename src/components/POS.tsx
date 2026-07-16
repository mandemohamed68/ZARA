import React, { useState, useEffect, useRef } from 'react';
import { Product, ProductVariant, CartItem, Order, PendingTicket, User, Promotion, Customer, AuditLogEntry, PaymentItem, getVipStatus, CashRegisterSession, AppSettings, getPaymentMethodLabel } from '../types';
import { printElement } from '../utils/print-helper';
import { decodeAzertyBarcode, autoDecodeBarcodeIfMangled } from '../utils/barcodeHelper';
import { CATEGORIES } from '../data';
import { Search, Trash2, Plus, Minus, CreditCard, Banknote, X, ShoppingCart, Tag, Smartphone, Clock, ShieldAlert, Printer, UserCircle, Package, Shirt, Baby, Footprints, Watch, ShoppingBag, UserPlus, Star, Edit3, CheckCircle2, Lock as LockIcon, LogOut, Store } from 'lucide-react';

const RenderProductIcon = ({ iconName, className }: { iconName: string, className?: string }) => {
  const getIconColor = (name: string) => {
    switch (name) {
      case 'Shirt': return 'text-amber-800 bg-amber-50';
      case 'Baby': return 'text-emerald-800 bg-emerald-50';
      case 'Footprints': return 'text-rose-800 bg-rose-50';
      case 'Watch': return 'text-indigo-800 bg-indigo-50';
      case 'ShoppingBag': return 'text-slate-800 bg-slate-50';
      default: return 'text-neutral-800 bg-neutral-50';
    }
  };

  const icons: Record<string, React.ReactNode> = {
    'Shirt': <Shirt className={className} />,
    'Baby': <Baby className={className} />,
    'Footprints': <Footprints className={className} />,
    'Watch': <Watch className={className} />,
    'ShoppingBag': <ShoppingBag className={className} />,
  };
  
  return (
    <div className={`w-full h-full flex items-center justify-center rounded-none border border-neutral-100 ${getIconColor(iconName)}`}>
      {icons[iconName] || <Shirt className={className} />}
    </div>
  );
};

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

interface POSProps {
  products: Product[];
  currentUser: User;
  onCompleteOrder: (order: Order, updatedProducts: Product[]) => void;
  promotions: Promotion[];
  customers: Customer[];
  addAuditLog: (action: string, details: string, severity?: AuditLogEntry['severity']) => void;
  pendingTickets: PendingTicket[];
  setPendingTickets: React.Dispatch<React.SetStateAction<PendingTicket[]>>;
  setCustomers: (c: Customer[]) => void;
  isPaymentLocked: boolean;
  onLogout: () => void;
  currentSession: CashRegisterSession | null;
  onOpenSession: (startingFloat: number) => void;
  isCashSessionRequired: boolean;
  settings: AppSettings;
}

export default function POS({ 
  products, 
  currentUser, 
  onCompleteOrder, 
  promotions, 
  customers, 
  addAuditLog, 
  pendingTickets, 
  setPendingTickets, 
  setCustomers, 
  isPaymentLocked, 
  onLogout,
  currentSession,
  onOpenSession,
  isCashSessionRequired,
  settings
}: POSProps) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [category, setCategory] = useState('Tous');
  const [search, setSearch] = useState('');
  const [startingFloat, setStartingFloat] = useState('25000');
  
  // Modals state
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);
  
  // CRM state
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showCustomerList, setShowCustomerList] = useState(false);
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  
  // New Customer Form
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');

  // TVA Toggle
  const [isTvaEnabled, setIsTvaEnabled] = useState(false);

  // Hold Modal State
  const [showHoldModal, setShowHoldModal] = useState(false);
  const [holdTicketName, setHoldTicketName] = useState('');

  // Restoration of missing states
  const [discountModalItem, setDiscountModalItem] = useState<string | null>(null);
  const [discountValue, setDiscountValue] = useState<string>('');
  const [globalDiscountModal, setGlobalDiscountModal] = useState(false);
  const [globalDiscountVal, setGlobalDiscountVal] = useState<string>('0');
  const [showManagerAlert, setShowManagerAlert] = useState(false);
  const [isEditingItem, setIsEditingItem] = useState<CartItem | null>(null);
  const [editPrice, setEditPrice] = useState('');
  const [editReason, setEditReason] = useState('');
  const [payments, setPayments] = useState<PaymentItem[]>([{ method: 'CASH', amount: 0 }]);
  const [consultMode, setConsultMode] = useState(false);
  const [isMobileCartVisible, setIsMobileCartVisible] = useState(false);
  const [scannerNotification, setScannerNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const notificationTimeoutRef = useRef<any>(null);

  const showNotification = (message: string, type: 'success' | 'error' = 'error') => {
    if (notificationTimeoutRef.current) {
      clearTimeout(notificationTimeoutRef.current);
    }
    setScannerNotification({ message, type });
    notificationTimeoutRef.current = setTimeout(() => {
      setScannerNotification(null);
    }, 4000);
  };

  const activePromotion = promotions.find(p => p.isActive);

  // User-specific work hours restiction check
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

  // Barcode Gun Listener
  useEffect(() => {
    let rawBarcode = '';
    let lastTime = Date.now();

    const handleKeyPress = (e: KeyboardEvent) => {
      // Barcode scanners type extremely fast (<40ms between strokes)
      const now = Date.now();
      if (now - lastTime > 40) {
        rawBarcode = ''; // Reset if slow typing (human typing)
      }
      lastTime = now;

      if (e.key === 'Enter') {
        if (rawBarcode.trim().length >= 4) {
          const barcodeValue = rawBarcode.trim();
          const decodedValue = decodeAzertyBarcode(barcodeValue);
          // Look for variant with this barcode
          const matchedProduct = products.find(p => p.variants.some(v => v.barcode === barcodeValue || v.barcode === decodedValue));
          if (matchedProduct) {
            const matchedVariant = matchedProduct.variants.find(v => v.barcode === barcodeValue || v.barcode === decodedValue);
            if (matchedVariant) {
               // Add it to the cart
               setCart(prev => {
                 const existing = prev.find(item => item.variant.id === matchedVariant.id);
                 if (existing) {
                   return prev.map(item => item.variant.id === matchedVariant.id ? { ...item, quantity: item.quantity + 1 } : item);
                 }
                 return [...prev, { id: Date.now().toString(), product: matchedProduct, variant: matchedVariant, quantity: 1, discount: 0 }];
               });
               addAuditLog('SCANNER_CODE_BARRE', `Article scanné par lecteur de code-barres : ${matchedProduct.name} (Taille : ${matchedVariant.size})`);
               showNotification(`Article Scanné : ${matchedProduct.name} (${matchedVariant.size} - ${matchedVariant.color})`, 'success');
            }
          } else {
             addAuditLog('SCANNER_INCONNU', `Code-barres inconnu : "${barcodeValue}" (Décodé : "${decodedValue}")`, 'WARNING');
             showNotification(`Code-barres inconnu : "${barcodeValue}" (ou "${decodedValue}")`, 'error');
          }
          rawBarcode = '';
        }
      } else if (e.key && e.key.length === 1) {
        rawBarcode += e.key;
      }
    };

    window.addEventListener('keypress', handleKeyPress);
    return () => {
      window.removeEventListener('keypress', handleKeyPress);
    };
  }, [products]);

  const formatFCFA = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(amount);
  };

  const filteredProducts = products.filter(p => {
    const matchesCat = category === 'Tous' || p.category === category;
    const s = search.toLowerCase();
    const decodedS = decodeAzertyBarcode(s);
    const matchesName = p.name.toLowerCase().includes(s) || p.name.toLowerCase().includes(decodedS);
    const matchesSub = p.subCategory?.toLowerCase().includes(s) || p.subCategory?.toLowerCase().includes(decodedS);
    const matchesBarcode = p.variants.some(v => 
      v.barcode?.toLowerCase().includes(s) || 
      v.barcode?.toLowerCase().includes(decodedS)
    );
    
    return matchesCat && (matchesName || matchesSub || matchesBarcode);
  });

  const calculateStock = (product: Product) => {
    return product.variants.reduce((sum, v) => sum + v.stock, 0);
  };

  const handleProductClick = (product: Product) => {
    if (product.variants.length === 1 && product.variants[0].size === 'Unique') {
      addToCart(product, product.variants[0]);
    } else {
      setSelectedProduct(product);
    }
  };

  const addToCart = (product: Product, variant: ProductVariant) => {
    setCart(prev => {
      const existing = prev.find(item => item.variant.id === variant.id);
      if (existing) {
        return prev.map(item => item.variant.id === variant.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { id: Date.now().toString(), product, variant, quantity: 1, discount: 0 }];
    });
    setSelectedProduct(null);
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQ = item.quantity + delta;
        return newQ > 0 ? { ...item, quantity: newQ } : item;
      }
      return item;
    }));
  };

  const openManualEdit = (item: CartItem) => {
    setIsEditingItem(item);
    setEditPrice((item.manualPrice || item.product.basePrice).toString());
    setEditReason(item.manualPriceReason || '');
  };

  const handleManualPriceChange = () => {
    if (!isEditingItem || !editPrice || !editReason) return;
    const newPrice = parseInt(editPrice);
    setCart(cart.map(item => item.id === isEditingItem.id ? { ...item, manualPrice: newPrice, manualPriceReason: editReason } : item));
    addAuditLog('PRICE_MODIFICATION', `Prix article "${isEditingItem.product.name}" modifié de ${isEditingItem.manualPrice || isEditingItem.product.basePrice} à ${newPrice}. Raison: ${editReason}`, 'WARNING');
    setIsEditingItem(null);
  };

  const applyItemDiscount = () => {
    if (!discountModalItem) return;
    const discount = parseInt(discountValue);
    if (!isNaN(discount) && discount >= 0 && discount <= 100) {
      setCart(prev => prev.map(item => 
        item.id === discountModalItem ? { ...item, discount } : item
      ));
    }
    setDiscountModalItem(null);
    setDiscountValue('');
  };

  const isManager = currentUser.role === 'ADMIN' || currentUser.role === 'MANAGER';

  const triggerGlobalDiscount = () => {
    if (!isManager) {
      setShowManagerAlert(true);
      setTimeout(() => setShowManagerAlert(false), 3000);
      return;
    }
    setGlobalDiscountModal(true);
  };

  const applyGlobalDiscount = () => {
    const val = parseInt(globalDiscountVal);
    if (isNaN(val) || val < 0) {
      setGlobalDiscountVal('0');
    }
    setGlobalDiscountModal(false);
  };

  const putTicketOnHold = () => {
    if (cart.length === 0) return;
    setHoldTicketName(`Client ${pendingTickets.length + 1}`);
    setShowHoldModal(true);
  };

  const handleConfirmHold = () => {
    if (!holdTicketName.trim()) return;
    
    setPendingTickets(prev => [...prev, {
      id: Date.now().toString(),
      name: holdTicketName,
      items: [...cart],
      timestamp: Date.now()
    }]);
    
    setCart([]);
    setGlobalDiscountVal('0');
    setSelectedCustomer(null);
    setShowHoldModal(false);
    setHoldTicketName('');
    addAuditLog('TICKET_HELD', `Ticket "${holdTicketName}" mis en attente par ${currentUser.name}`);
  };

  const restoreTicket = (ticket: PendingTicket) => {
    if (cart.length > 0) {
      if (!confirm("Le panier actuel n'est pas vide. Voulez-vous l'écraser ?")) return;
    }
    setCart(ticket.items);
    setGlobalDiscountVal('0');
    setPendingTickets(prev => prev.filter(t => t.id !== ticket.id));
  };

  const baseSubtotal = cart.reduce((sum, item) => sum + ((item.manualPrice || item.product.basePrice) * item.quantity), 0);
  const itemDiscountsTotal = cart.reduce((sum, item) => sum + (((item.manualPrice || item.product.basePrice) * (item.discount / 100)) * item.quantity), 0);
  const totalItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  
  const hasAutoPromo = totalItemsCount >= 3;
  const autoPromoRate = hasAutoPromo ? (activePromotion?.discountValue || 0) / 100 : 0;
  const afterItemDiscounts = baseSubtotal - itemDiscountsTotal;
  const autoPromoValue = afterItemDiscounts * autoPromoRate;
  
  const vipData = selectedCustomer ? getVipStatus(selectedCustomer.loyaltyPoints) : { tier: 'BRONZE', discount: 0 };
  const vipDiscountRate = vipData.discount / 100;
  const vipDiscountValue = (afterItemDiscounts - autoPromoValue) * vipDiscountRate;
  
  const globalDiscountAmount = parseInt(globalDiscountVal) || 0;

  const totalDiscounts = itemDiscountsTotal + autoPromoValue + vipDiscountValue + globalDiscountAmount;
  const totalBeforeTax = Math.max(0, baseSubtotal - totalDiscounts);
  const taxRate = isTvaEnabled ? 0.18 : 0;
  const tax = totalBeforeTax * taxRate;
  const total = totalBeforeTax + tax;

  const handleCheckout = () => {
    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
    if (totalPaid < total) {
      alert("Le montant total payé est insuffisant.");
      return;
    }

    const order: Order = {
      id: `TKT-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
      date: new Date().toISOString(),
      cashier: currentUser.name,
      customer: selectedCustomer || undefined,
      items: cart,
      subtotal: totalBeforeTax,
      tax,
      discountTotal: totalDiscounts,
      total,
      payments,
      status: 'COMPLETED'
    };

    const updatedProducts = products.map(p => ({
      ...p,
      variants: p.variants.map(v => {
        const cartItem = cart.find(ci => ci.variant.id === v.id);
        return cartItem ? { ...v, stock: v.stock - cartItem.quantity } : v;
      })
    }));

    onCompleteOrder(order, updatedProducts);
    setCompletedOrder(order);
    setIsPaymentModalOpen(false);
  };

  const handleNextClient = () => {
    setCart([]);
    setGlobalDiscountVal('0');
    setSelectedCustomer(null);
    setCompletedOrder(null);
    setPayments([{ method: 'CASH', amount: 0 }]);
  };

  const handlePrintReceiptA4 = () => {
    printElement('receipt-content', 'Reçu ZARA GALLERY', 'A4');
  };

  const handlePrintReceipt58 = () => {
    printElement('receipt-content', 'Reçu ZARA GALLERY', '58mm');
  };

  const updatePaymentAmount = (index: number, amount: number) => {
    const newPayments = [...payments];
    newPayments[index].amount = amount;
    setPayments(newPayments);
  };

  const addPaymentMethod = (method: PaymentItem['method']) => {
    const remaining = Math.max(0, total - payments.reduce((sum, p) => sum + p.amount, 0));
    setPayments([...payments, { method, amount: remaining }]);
  };

  const removePayment = (index: number) => {
    setPayments(payments.filter((_, i) => i !== index));
  };

  const handleCreateCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    const newCustomer: Customer = {
      id: `CUST-${Date.now()}`,
      name: newCustName,
      phone: newCustPhone,
      loyaltyPoints: 0,
      totalSpent: 0
    };
    setCustomers([...customers, newCustomer]);
    setSelectedCustomer(newCustomer);
    setShowAddCustomerModal(false);
    setNewCustName('');
    setNewCustPhone('');
    addAuditLog('CUSTOMER_CREATED', `Nouveau client ${newCustomer.name} (${newCustomer.phone}) créé par ${currentUser.name}`);
  };

  return (
    <>
      {/* Floating Scanner Notification Overlay */}
      {scannerNotification && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[9999] px-6 py-4 flex items-center gap-3 border shadow-2xl animate-in fade-in slide-in-from-top-4 duration-300 ${
          scannerNotification.type === 'error' 
            ? 'bg-red-950 text-red-100 border-red-500' 
            : 'bg-emerald-950 text-emerald-100 border-emerald-500'
        }`}>
          <ShieldAlert className={`w-5 h-5 shrink-0 ${scannerNotification.type === 'error' ? 'text-red-400' : 'text-emerald-400'}`} />
          <span className="text-[11px] font-black uppercase tracking-wider">{scannerNotification.message}</span>
          <button onClick={() => setScannerNotification(null)} className="ml-4 text-white hover:text-white/70 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="flex flex-col lg:flex-row h-full w-full print:hidden overflow-hidden bg-neutral-50 relative">
      {/* Mobile Cart Toggle Floating Button */}
      <button 
        onClick={() => setIsMobileCartVisible(true)}
        className="lg:hidden fixed bottom-6 right-6 z-40 bg-black text-white p-4 rounded-full shadow-2xl flex items-center justify-center border-2 border-white/20 active:scale-95 transition-transform"
      >
        <div className="relative">
          <ShoppingCart className="w-6 h-6" />
          {cart.length > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-600 text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-full border-2 border-black">
              {cart.reduce((sum, i) => sum + i.quantity, 0)}
            </span>
          )}
        </div>
      </button>

      {/* Search & Categories */}
      <div className="flex-1 flex flex-col h-full bg-white border-r border-neutral-100">
        {isSellingDisabled && (
          <div className="bg-red-50 text-red-900 border-b border-red-200 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="relative flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-red-600"></span>
              </span>
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-red-800">
                  {isUserTimeRestricted 
                    ? "SESSION CAISSE VERROUILLÉE (HORS HORAIRES)" 
                    : !currentSession && isCashSessionRequired 
                      ? "SESSION DE CAISSE EN ATTENTE D'OUVERTURE" 
                      : "TERMINAL DE VENTE CLOS (HORAIRES BOUTIQUE)"}
                </p>
                <p className="text-[10px] font-bold text-red-600/90 uppercase tracking-wider mt-0.5">
                  {isUserTimeRestricted 
                    ? `Vos horaires autorisés : ${currentUser.openingTime} - ${currentUser.closingTime}.` 
                    : !currentSession && isCashSessionRequired 
                      ? "Les ventes physiques sont suspendues. Ouvrez d'abord une session dans la Gestion de Caisse." 
                      : "Les ventes sont verrouillées conformément au règlement ou manuellement."}
                </p>
              </div>
            </div>
            <div className="text-[10px] font-black uppercase bg-red-600 text-white px-3 py-1 tracking-wider">
               MODE CONSULTATION
            </div>
          </div>
        )}
        <div className="p-6 border-b border-neutral-100 flex justify-between items-center gap-6">
          <div className="relative flex-1 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 w-4 h-4" />
            <input 
              type="text" 
              placeholder="RECHERCHER OU SCANNER DIRECTEMENT UN ARTICLE..." 
              value={search}
              onChange={(e) => setSearch(autoDecodeBarcodeIfMangled(e.target.value))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const term = search.trim();
                  if (term.length >= 3) {
                    const decoded = decodeAzertyBarcode(term);
                    const matchedProduct = products.find(p => p.variants.some(v => v.barcode === term || v.barcode === decoded));
                    if (matchedProduct) {
                      const matchedVariant = matchedProduct.variants.find(v => v.barcode === term || v.barcode === decoded);
                      if (matchedVariant) {
                        setCart(prev => {
                          const existing = prev.find(item => item.variant.id === matchedVariant.id);
                          if (existing) {
                            return prev.map(item => item.variant.id === matchedVariant.id ? { ...item, quantity: item.quantity + 1 } : item);
                          }
                          return [...prev, { id: Date.now().toString(), product: matchedProduct, variant: matchedVariant, quantity: 1, discount: 0 }];
                        });
                        addAuditLog('SCAN_MANUEL', `Article ajouté par recherche directe : ${matchedProduct.name} (${matchedVariant.size})`);
                        showNotification(`Article Ajouté : ${matchedProduct.name} (${matchedVariant.size})`, 'success');
                        setSearch('');
                      }
                    } else {
                      // Show a definitive error notification for code-barres
                      showNotification(`Aucun article trouvé avec le code-barres : "${term}"`, 'error');
                    }
                  }
                }
              }}
              className="w-full pl-12 pr-4 py-3.5 bg-neutral-50/60 border border-neutral-200/80 text-xs font-bold uppercase tracking-widest outline-none focus:border-black focus:bg-white transition-all rounded-none"
            />
            
            {/* Tooltip on Hover */}
            <div className="absolute top-14 left-0 w-80 bg-black text-white p-4 text-[10px] uppercase font-bold tracking-widest z-50 hidden group-hover:block animate-in fade-in zoom-in-95 duration-200 pointer-events-none shadow-2xl">
              <p className="mb-2 text-white/70">ℹ️ Comment utiliser la douchette ?</p>
              <p className="leading-relaxed">
                Le lecteur de code-barres fonctionne comme un clavier externe. 
                <span className="text-blue-400 block mt-1">Peu importe où l'application est hébergée</span>, 
                il vous suffit de cliquer n'importe où sur cette page et de scanner. L'article s'ajoutera automatiquement au panier.
              </p>
            </div>
          </div>
          
          {pendingTickets.length > 0 && (
            <div className="flex items-center gap-3">
              <div className="flex -space-x-1.5">
                {pendingTickets.map((_, i) => (
                  <div key={i} className="w-7 h-7 rounded-none bg-black border border-white flex items-center justify-center text-[9px] font-bold text-white shadow-sm">
                    {i + 1}
                  </div>
                ))}
              </div>
              <div className="flex gap-2 overflow-x-auto hide-scrollbar max-w-[300px]">
                {pendingTickets.map(pt => (
                  <button 
                    key={pt.id} 
                    onClick={() => restoreTicket(pt)} 
                    className="px-4 py-2 border border-black text-black bg-white rounded-none text-[9px] tracking-widest uppercase font-bold flex items-center hover:bg-black hover:text-white transition-all shadow-sm cursor-pointer"
                  >
                    <Clock className="w-3 h-3 mr-2 text-neutral-400" /> 
                    <span className="truncate max-w-[80px]">{pt.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        
        <div className="px-6 flex gap-8 overflow-x-auto border-b border-neutral-100 bg-white hide-scrollbar">
          {CATEGORIES.map(cat => (
            <button 
              key={cat} 
              onClick={() => setCategory(cat)} 
              className={`py-4 font-black text-[10px] uppercase tracking-[0.25em] transition-all relative whitespace-nowrap cursor-pointer ${
                category === cat 
                  ? 'text-black' 
                  : 'text-neutral-400 hover:text-black'
              }`}
            >
              {cat}
              {category === cat && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black" />
              )}
            </button>
          ))}
        </div>

        {activePromotion && (
          <div className="px-6 pt-5">
             <div className="bg-black text-white px-4 py-2.5 text-[9px] tracking-[0.25em] uppercase font-bold text-center flex items-center justify-center gap-3">
               <Star className="w-3 h-3 text-white fill-white" />
               {activePromotion.title}
               <Star className="w-3 h-3 text-white fill-white" />
             </div>
          </div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 overflow-y-auto p-6 flex-1 bg-neutral-50/40">
          {filteredProducts.map(p => {
            const totalStock = calculateStock(p);
            return (
              <button 
                key={p.id} 
                onClick={() => handleProductClick(p)}
                disabled={totalStock <= 0}
                className={`bg-white border border-neutral-200/60 p-5 hover:border-black transition-all text-left flex flex-col h-52 relative group cursor-pointer shadow-sm hover:shadow-[0_10px_25px_rgba(0,0,0,0.03)] rounded-none ${totalStock <= 0 ? 'opacity-45 grayscale' : ''}`}
              >
                <div className="w-10 h-10 mb-4 flex-shrink-0 overflow-hidden bg-neutral-100 flex items-center justify-center relative border border-neutral-150">
                   {p.imageUrl ? (
                     <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                   ) : (
                     <RenderProductIcon iconName={p.imageColor} className="w-5 h-5" />
                   )}
                </div>
                <h3 className="font-bold text-neutral-800 text-xs leading-snug line-clamp-2 uppercase tracking-tight">{p.name}</h3>
                <p className="text-[8px] uppercase tracking-widest text-neutral-400 mt-1.5 font-bold">{p.subCategory}</p>
                <div className="mt-auto pt-4 flex justify-between items-end w-full border-t border-neutral-100 group-hover:border-neutral-200 transition-colors">
                  <span className="font-extrabold text-neutral-900 text-xs">{formatFCFA(p.basePrice)}</span>
                  <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 ${totalStock < 5 ? 'bg-amber-50 text-amber-700' : 'bg-neutral-50 text-neutral-500'}`}>
                    {totalStock > 0 ? `${totalStock} DISP` : 'RUPTURE'}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      </div>
      
      {/* Cart Container */}
      <div className={`
        ${isMobileCartVisible ? 'fixed inset-0 translate-y-0' : 'fixed inset-0 translate-y-full lg:translate-y-0'} 
        lg:static w-full lg:w-[420px] flex flex-col bg-white border-l border-neutral-200 shadow-[0_0_40px_rgba(0,0,0,0.02)] z-50 lg:z-20 transition-transform duration-300 ease-out
      `}>
        <div className="p-6 border-b border-neutral-100 bg-white flex items-center justify-between">
          <h2 className="text-[10px] font-black tracking-[0.2em] text-neutral-900 flex items-center uppercase">
            <ShoppingCart className="w-4 h-4 mr-2.5 text-neutral-700" /> Panier Zara
          </h2>
          <div className="flex gap-2">
            <button onClick={() => setIsMobileCartVisible(false)} className="lg:hidden p-2 text-neutral-400 hover:text-black mr-2">
              <X className="w-5 h-5" />
            </button>
            <button onClick={putTicketOnHold} className="p-2 border border-neutral-200 hover:border-black text-neutral-400 hover:text-black rounded-none transition-colors"><Clock className="w-4 h-4" /></button>
            <button onClick={() => { setCart([]); setSelectedCustomer(null); }} className="p-2 border border-neutral-200 hover:border-red-600 text-neutral-400 hover:text-red-600 rounded-none transition-colors"><Trash2 className="w-4 h-4" /></button>
          </div>
        </div>

        {/* Customer Selector */}
        <div className="bg-neutral-50 border-b border-neutral-100 px-6 py-4.5 relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center flex-1">
                <UserCircle className={`w-5 h-5 mr-3 ${selectedCustomer ? 'text-black' : 'text-neutral-300'}`} />
                {selectedCustomer ? (
                  <div className="flex-1 flex justify-between items-center pr-4">
                    <div>
                      <p className="text-[10px] font-black uppercase text-black">{selectedCustomer.name}</p>
                      <p className="text-[8px] font-bold text-neutral-400 uppercase tracking-widest">{selectedCustomer.phone}</p>
                    </div>
                    {getVipStatus(selectedCustomer.loyaltyPoints).discount > 0 && (
                      <span className={`px-2 py-0.5 text-[8px] font-black uppercase tracking-widest ${getVipStatus(selectedCustomer.loyaltyPoints).color}`}>
                        {getVipStatus(selectedCustomer.loyaltyPoints).tier} ({getVipStatus(selectedCustomer.loyaltyPoints).discount}%)
                      </span>
                    )}
                  </div>
                ) : (
                  <input 
                    type="text" 
                    placeholder="Chercher Client (Fidélité)..." 
                    value={customerSearch}
                    onFocus={() => setShowCustomerList(true)}
                    onChange={e => setCustomerSearch(e.target.value)}
                    className="text-[10px] uppercase tracking-widest placeholder-neutral-300 text-black outline-none w-full font-bold"
                  />
                )}
              </div>
              {selectedCustomer ? (
                <button onClick={() => setSelectedCustomer(null)} className="text-neutral-400 hover:text-red-500"><X className="w-4 h-4"/></button>
              ) : (
                <button onClick={() => setShowAddCustomerModal(true)} className="text-neutral-300 hover:text-black transition-colors"><UserPlus className="w-4 h-4"/></button>
              )}
            </div>
            {showCustomerList && !selectedCustomer && (
              <div className="absolute top-full left-0 right-0 bg-white border border-neutral-200 shadow-2xl z-50 max-h-48 overflow-y-auto">
                 {customers.filter(c => c.name.toLowerCase().includes(customerSearch.toLowerCase()) || c.phone.includes(customerSearch)).slice(0, 5).map(c => (
                   <button key={c.id} disabled={c.suspended} onClick={() => { if (!c.suspended) { setSelectedCustomer(c); setShowCustomerList(false); } }} className={`w-full text-left p-3 flex justify-between items-center border-b border-neutral-100 last:border-0 text-[10px] ${c.suspended ? 'opacity-40 cursor-not-allowed bg-red-100/10' : 'hover:bg-neutral-50'}`}>
                      <div>
                        <p className="font-black uppercase flex items-center gap-1.5">
                          {c.name}
                          {c.suspended && (
                            <span className="bg-red-600 text-white px-1.5 py-0.5 text-[7px] font-black uppercase rounded-xs tracking-wider">
                              Suspendu
                            </span>
                          )}
                        </p>
                        <p className="text-neutral-400">{c.phone}</p>
                      </div>
                      <span className={`${c.suspended ? 'text-neutral-400' : 'text-amber-500'} font-black`}>{c.loyaltyPoints} pts</span>
                   </button>
                 ))}
                 <div className="p-2 bg-neutral-50">
                    <button 
                      onClick={() => setShowAddCustomerModal(true)}
                      className="w-full py-2 text-[8px] font-black uppercase tracking-[0.2em] text-neutral-500 hover:text-black"
                    >
                      Créer nouveau client
                    </button>
                 </div>
              </div>
            )}
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {cart.map(item => (
            <div key={item.id} className="bg-white border border-neutral-100 p-4 shadow-sm relative group">
              <div className="flex justify-between items-start mb-4">
                 <div>
                    <h4 className="font-black text-black text-xs uppercase tracking-tight">{item.product.name}</h4>
                    <p className="text-[8px] font-bold text-neutral-400 uppercase tracking-widest mt-0.5">{item.variant.size} — {item.variant.color}</p>
                 </div>
                 <button onClick={() => setCart(cart.filter(i => i.id !== item.id))} className="text-neutral-200 hover:text-red-600 transition-colors"><X className="w-4 h-4"/></button>
              </div>
              <div className="flex justify-between items-center">
                 <div className="flex items-center gap-3">
                    <div className="flex items-center border border-neutral-100 rounded-sm">
                      <button onClick={() => updateQuantity(item.id, -1)} className="p-1 px-2 hover:bg-neutral-50"><Minus className="w-3 h-3"/></button>
                      <span className="w-4 text-center font-bold text-[10px]">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.id, 1)} className="p-1 px-2 hover:bg-neutral-50"><Plus className="w-3 h-3"/></button>
                    </div>
                    <button onClick={() => openManualEdit(item)} className="p-1.5 bg-neutral-50 hover:bg-neutral-100 rounded text-neutral-400 hover:text-black transition-colors" title="Modifier Prix/Code">
                       <Edit3 className="w-3 h-3" />
                    </button>
                 </div>
                 <div className="text-right">
                    {item.discount > 0 && <span className="text-[8px] font-black text-red-600 uppercase tracking-widest mr-2">-{item.discount}%</span>}
                    <span className="font-black text-black text-xs">{formatFCFA((item.manualPrice || item.product.basePrice) * (1 - item.discount / 100) * item.quantity)}</span>
                    {item.manualPrice && <p className="text-[7px] text-orange-600 font-bold uppercase tracking-widest mt-1">Prix Manuel Appliqué</p>}
                 </div>
              </div>
            </div>
          ))}
        </div>

        <div className="p-6 bg-white border-t border-neutral-200">
          <div className="space-y-2 mb-6 text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500">
            <div className="flex justify-between"><span>S-Total HT</span><span className="text-black">{formatFCFA(baseSubtotal)}</span></div>
            {itemDiscountsTotal > 0 && <div className="flex justify-between text-black"><span>Remises (Articles)</span><span>-{formatFCFA(itemDiscountsTotal)}</span></div>}
            {autoPromoValue > 0 && <div className="flex justify-between text-black"><span>Promo ({activePromotion?.discountValue}%)</span><span>-{formatFCFA(autoPromoValue)}</span></div>}
            {vipDiscountValue > 0 && <div className="flex justify-between text-black"><span>Avantage VIP</span><span>-{formatFCFA(vipDiscountValue)}</span></div>}
            {globalDiscountAmount > 0 && <div className="flex justify-between text-black"><span>Remise Globale</span><span>-{formatFCFA(globalDiscountAmount)}</span></div>}
            <div className="flex justify-between items-center group cursor-pointer" onClick={() => setIsTvaEnabled(!isTvaEnabled)}>
              <div className="flex items-center gap-2">
                <span>TVA (18%)</span>
                <div className={`w-6 h-3 rounded-full transition-colors relative flex items-center px-0.5 ${isTvaEnabled ? 'bg-black' : 'bg-neutral-200'}`}>
                  <div className={`w-2 h-2 bg-white rounded-full transition-transform ${isTvaEnabled ? 'translate-x-3' : 'translate-x-0'}`}></div>
                </div>
              </div>
              <span className="text-black">{formatFCFA(tax)}</span>
            </div>
            <div className="flex justify-between pt-4 border-t border-neutral-100 text-black">
              <span className="font-black">Total TTC</span>
              <span className="text-3xl font-black tracking-tighter">{formatFCFA(total)}</span>
            </div>
          </div>
          <button 
            disabled={cart.length === 0 || isSellingDisabled}
            onClick={() => setIsPaymentModalOpen(true)}
            className="w-full bg-black text-white font-black py-5 text-[11px] uppercase tracking-widest shadow-2xl hover:bg-neutral-800 transition-all disabled:opacity-30">
            {isSellingDisabled ? 'Ventes Bloquées (Caisse Fermée)' : 'Passer au Règlement'}
          </button>
        </div>
      </div>
    </div>

      {/* Manual Edit Modal */}
      {isEditingItem && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[150] grid place-items-center overflow-y-auto p-4 py-12">
           <div className="bg-white w-full max-w-sm p-10 border-2 border-black animate-in zoom-in duration-150 relative">
              <button onClick={() => setIsEditingItem(null)} className="absolute right-6 top-6 text-neutral-400 hover:text-black"><X className="w-5 h-5"/></button>
              <h3 className="text-lg font-black uppercase tracking-tighter mb-6">Modification Manuelle</h3>
              <div className="space-y-6">
                 <div>
                    <label className="text-[9px] font-black text-neutral-400 uppercase tracking-widest block mb-2">Nouveau Prix (FCFA)</label>
                    <input type="number" value={editPrice} onChange={e => setEditPrice(e.target.value)} className="w-full text-2xl font-black py-2 border-b-2 border-black outline-none" />
                 </div>
                 <div>
                    <label className="text-[9px] font-black text-neutral-400 uppercase tracking-widest block mb-2">Motif de la modification</label>
                    <textarea value={editReason} onChange={e => setEditReason(e.target.value)} placeholder="Ex: Geste commercial exceptionnel" className="w-full bg-neutral-50 p-4 text-[10px] font-bold outline-none border-b border-neutral-200 focus:border-black h-24" />
                 </div>
                 <button onClick={handleManualPriceChange} className="w-full bg-black text-white py-4 text-[10px] font-black uppercase tracking-widest hover:bg-neutral-800 transition-colors shadow-xl">Enregistrer & Tracer</button>
              </div>
           </div>
        </div>
      )}

      {/* Payment Modal Expanded for Multi-payment */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 bg-neutral-900/80 z-[120] grid place-items-center overflow-y-auto p-4 py-12 backdrop-blur-sm">
          <div className="bg-white w-full max-w-2xl border-2 border-black animate-in slide-in-from-bottom-10 duration-300">
            <div className="p-8 flex justify-between items-center border-b border-neutral-100">
               <div><h3 className="text-3xl font-black uppercase tracking-tighter">Caisse Zara</h3><p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest">Multi-paiements Acceptés</p></div>
               <button onClick={() => setIsPaymentModalOpen(false)}><X className="w-6 h-6"/></button>
            </div>
            
            <div className="p-8 grid grid-cols-2 gap-12 bg-neutral-50/50">
               <div>
                  <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-2">Reste à régler</p>
                  <p className="text-4xl font-black tracking-tighter text-black">{formatFCFA(Math.max(0, total - payments.reduce((sum, p) => sum + p.amount, 0)))}</p>
                  
                  <div className="mt-8 space-y-3">
                     <p className="text-[9px] font-black text-neutral-400 uppercase tracking-widest">Répartition des paiements</p>
                     {payments.map((p, idx) => (
                       <div key={idx} className="flex gap-4 items-end bg-white border border-neutral-100 p-4 shadow-sm relative">
                          <div className="flex-1">
                             <p className="text-[8px] font-bold uppercase text-neutral-400 mb-1">{getPaymentMethodLabel(p.method)}</p>
                             <input type="number" value={p.amount} onChange={e => updatePaymentAmount(idx, parseInt(e.target.value) || 0)} className="w-full text-lg font-black outline-none bg-transparent" />
                          </div>
                          {payments.length > 1 && <button onClick={() => removePayment(idx)} className="p-2 text-neutral-300 hover:text-red-500"><Trash2 className="w-4 h-4"/></button>}
                       </div>
                     ))}
                  </div>
               </div>

               <div className="space-y-4">
                  <p className="text-[9px] font-black text-neutral-400 uppercase tracking-widest">Ajouter Methode de Paiement</p>
                  <div className="grid grid-cols-3 gap-2">
                     {[
                       { id: 'CASH', icon: <Banknote className="w-4 h-4"/>, label: 'Espèces' },
                       { id: 'MOBILE_MONEY', icon: <Smartphone className="w-4 h-4"/>, label: 'Mobile' },
                       { id: 'CARD', icon: <CreditCard className="w-4 h-4"/>, label: 'Carte' }
                     ].map(m => (
                       <button key={m.id} onClick={() => addPaymentMethod(m.id as any)} className="p-4 border-2 border-neutral-100 hover:border-black bg-white flex flex-col items-center gap-2 transition-all group">
                          <span className="text-neutral-400 group-hover:text-black">{m.icon}</span>
                          <span className="text-[8px] font-black uppercase text-neutral-400 group-hover:text-black">{m.label}</span>
                       </button>
                     ))}
                  </div>
               </div>

            <div className="p-8">
               <button onClick={handleCheckout} className="w-full bg-black text-white py-6 text-xs font-black uppercase tracking-[0.3em] shadow-2xl hover:bg-neutral-800 transition-all">Finaliser l'Encaissement Zara</button>
            </div>
          </div>
        </div>
      </div>
    )}

      {/* Order Completion Receipt View */}
      {completedOrder && (
        <div className="fixed inset-0 bg-neutral-950/80 z-[200] flex flex-col items-center justify-start p-4 overflow-y-auto backdrop-blur-sm pt-8 md:pt-20">
           <div className="bg-white p-8 md:p-12 w-full max-w-2xl border-4 border-black relative mb-8 md:mb-20 animate-in zoom-in duration-200">
            <div id="receipt-content" className="max-w-md mx-auto bg-white p-12 shadow-2xl border border-neutral-100 text-black font-mono print:shadow-none print:border-none print:p-0 print:w-full">
              <div className="text-center mb-10 border-b-2 border-black pb-8 flex flex-col items-center justify-center">
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
                 <div className="flex justify-between"><span>Ticket No</span><span>#{completedOrder.id}</span></div>
                 <div className="flex justify-between"><span>Date</span><span>{new Date(completedOrder.date).toLocaleString()}</span></div>
                 <div className="flex justify-between"><span>Caisse</span><span>{completedOrder.cashier}</span></div>
                 {completedOrder.customer && <div className="flex justify-between"><span>Client</span><span>{completedOrder.customer.name}</span></div>}
              </div>
              <table className="w-full text-[10px] mb-8">
                 <thead><tr className="border-b-2 border-black">
                    <th className="text-left py-2 uppercase">Art.</th><th className="text-center py-2">Qté.</th><th className="text-right py-2">Total</th>
                 </tr></thead>
                 <tbody className="divide-y divide-neutral-100">
                    {completedOrder.items.map((item, idx) => (
                      <tr key={idx} className="py-2">
                        <td className="py-2"><p className="font-bold">{item.product.name}</p><p className="text-[8px] text-neutral-400">{item.variant.size} / {item.variant.color}</p></td>
                        <td className="text-center">{item.quantity}</td>
                        <td className="text-right font-black">{formatFCFA((item.manualPrice || item.product.basePrice) * (1 - item.discount / 100) * item.quantity)}</td>
                      </tr>
                    ))}
                 </tbody>
              </table>
              <div className="space-y-2 text-xs border-t-2 border-black pt-6 mb-10">
                 <div className="flex justify-between"><span>Sous-total HT</span><span>{formatFCFA(completedOrder.subtotal)}</span></div>
                 {completedOrder.tax > 0 ? (
                   <div className="flex justify-between"><span>TVA (18%)</span><span>{formatFCFA(completedOrder.tax)}</span></div>
                 ) : (
                   <div className="flex justify-between text-neutral-400"><span>Exonéré TVA</span><span>0 F CFA</span></div>
                 )}
                 <div className="flex justify-between text-lg font-black pt-4"><span>Total TTC</span><span>{formatFCFA(completedOrder.total)}</span></div>
              </div>
              <div className="text-center">
                 <p className="text-[9px] uppercase font-bold text-neutral-400 mb-8 tracking-[0.2em]">Merci de votre confiance. Votre achat a bien été enregistré.</p>
                 <div className="flex gap-2 print:hidden uppercase text-[9px]">
                    <button onClick={handlePrintReceiptA4} className="flex-1 bg-neutral-100 hover:bg-neutral-200 py-4 font-black text-black transition-colors rounded-sm shadow-[0_4px_14px_0_rgba(0,0,0,0.1)]">Imprimer (A4)</button>
                    <button onClick={handlePrintReceipt58} className="flex-1 bg-black hover:bg-neutral-800 py-4 font-black text-white transition-colors rounded-sm shadow-[0_4px_14px_0_rgba(0,0,0,0.1)]">Ticket (58mm)</button>
                    <button onClick={async () => {
                       try {
                         const element = document.getElementById('receipt-content');
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
                         pdf.save(`Recu-${completedOrder.id}.pdf`);
                         
                         // Restore buttons
                         if (buttons) (buttons as HTMLElement).style.display = 'flex';
                       } catch (e) {
                         console.error("PDF generation failed:", e);
                         alert("Erreur lors de la génération du PDF");
                       }
                    }} className="flex-1 bg-neutral-200 hover:bg-neutral-300 py-4 text-[10px] font-black uppercase text-black transition-colors rounded-sm shadow-xl">Télécharger PDF</button>
                    <button onClick={handleNextClient} className="flex-1 bg-black text-white hover:bg-neutral-800 py-4 text-[10px] font-black uppercase transition-colors rounded-sm shadow-xl">Vente Suivante</button>
                 </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Product Selection Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 bg-neutral-900/60 z-50 flex flex-col items-center justify-start p-4 overflow-y-auto backdrop-blur-sm pt-8 md:pt-20">
          <div className="bg-white p-8 w-full max-w-2xl border-2 border-black mb-8 md:mb-20 animate-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-8 border-b border-neutral-200 pb-4">
              <div>
                <h3 className="text-xl font-bold uppercase tracking-tight">{selectedProduct.name}</h3>
                <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest mt-1">Sélect. Déclinaison Zara</p>
              </div>
              <button onClick={() => setSelectedProduct(null)} className="text-neutral-400 hover:text-black">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {selectedProduct.variants.map((v) => (
                <button 
                  key={v.id}
                  disabled={v.stock <= 0}
                  onClick={() => addToCart(selectedProduct, v)}
                  className={`flex justify-between items-center p-5 border transition-all ${
                    v.stock > 0 
                      ? 'border-neutral-200 hover:border-black hover:bg-neutral-50' 
                      : 'border-neutral-100 bg-neutral-50 opacity-40 cursor-not-allowed'
                  }`}
                >
                  <div className="text-left">
                    <span className="font-bold text-black text-lg block">{v.size}</span>
                    <span className="text-neutral-500 text-[10px] uppercase tracking-widest font-bold">{v.color}</span>
                  </div>
                  <div className="text-right">
                     <span className={`text-[10px] font-bold uppercase tracking-widest ${v.stock > 0 ? 'text-black' : 'text-red-500'}`}>
                       {v.stock > 0 ? `${v.stock} DISPO` : 'RUPTURE'}
                     </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Add Customer Modal */}
      {showAddCustomerModal && (
        <div className="fixed inset-0 bg-neutral-900/90 z-[300] flex flex-col items-center justify-start p-4 overflow-y-auto backdrop-blur-sm pt-8 md:pt-20">
           <div className="bg-white max-w-sm w-full border-2 border-black p-10 animate-in zoom-in duration-150 relative mb-8 md:mb-20">
              <button onClick={() => setShowAddCustomerModal(false)} className="absolute right-6 top-6 text-neutral-400 hover:text-black focus:outline-none">
                 <X className="w-5 h-5"/>
              </button>
              <h3 className="text-lg font-black uppercase tracking-tighter mb-8 border-b border-neutral-100 pb-4">Nouveau Client Zara</h3>
              <form onSubmit={handleCreateCustomer} className="space-y-8">
                 <div>
                    <label className="text-[9px] font-black text-neutral-400 uppercase tracking-widest mb-2 block">Nom complet</label>
                    <input 
                      required
                      autoFocus
                      type="text" 
                      value={newCustName} 
                      onChange={e => setNewCustName(e.target.value)} 
                      className="w-full text-base font-black py-3 border-b-2 border-neutral-200 outline-none focus:border-black transition-all"
                      placeholder="Ex: Aminata Diarra"
                    />
                 </div>
                 <div>
                    <label className="text-[9px] font-black text-neutral-400 uppercase tracking-widest mb-2 block">Numéro de téléphone</label>
                    <input 
                      required
                      type="tel" 
                      value={newCustPhone} 
                      onChange={e => setNewCustPhone(e.target.value)} 
                      className="w-full text-base font-black py-3 border-b-2 border-neutral-200 outline-none focus:border-black transition-all"
                      placeholder="Ex: 70000000"
                    />
                 </div>
                 <button type="submit" className="w-full bg-black text-white py-4 text-[10px] font-black uppercase tracking-widest hover:bg-neutral-800 transition-all shadow-xl">
                    Enregistrer le client
                 </button>
              </form>
           </div>
        </div>
      )}

      {/* Hold Ticket Modal */}
      {showHoldModal && (
        <div className="fixed inset-0 bg-neutral-900/90 z-[310] flex flex-col items-center justify-start p-4 overflow-y-auto backdrop-blur-sm pt-8 md:pt-20">
           <div className="bg-white max-w-sm w-full border-4 border-black p-10 animate-in zoom-in duration-150 relative mb-8 md:mb-20">
              <button onClick={() => setShowHoldModal(false)} className="absolute right-6 top-6 text-neutral-400 hover:text-black">
                 <X className="w-5 h-5"/>
              </button>
              <div className="text-center mb-8">
                 <Clock className="w-12 h-12 mx-auto mb-4 text-neutral-200" />
                 <h3 className="text-xl font-black uppercase tracking-tighter">Mise en Attente</h3>
                 <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mt-2">Nommer cette session de vente</p>
              </div>
              <div className="space-y-6">
                 <div>
                    <label className="text-[9px] font-black text-neutral-400 uppercase tracking-widest mb-2 block">Référence / Nom</label>
                    <input 
                      autoFocus
                      type="text" 
                      value={holdTicketName} 
                      onChange={e => setHoldTicketName(e.target.value)} 
                      onKeyDown={e => e.key === 'Enter' && handleConfirmHold()}
                      className="w-full text-2xl font-black py-3 border-b-4 border-black outline-none text-center"
                      placeholder="Ex: Client 1"
                    />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <button onClick={() => setShowHoldModal(false)} className="py-4 border border-neutral-200 text-[10px] font-black uppercase tracking-widest hover:bg-neutral-50">Annuler</button>
                    <button onClick={handleConfirmHold} className="py-4 bg-black text-white text-[10px] font-black uppercase tracking-widest hover:bg-neutral-800 shadow-xl">Confirmer</button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Individual Time Restriction Overlay */}
      {isUserTimeRestricted && !consultMode && (
        <div className="fixed inset-0 bg-neutral-950/45 z-[320] flex flex-col items-center justify-start p-4 overflow-y-auto backdrop-blur-md animate-in fade-in duration-500 pt-8 md:pt-20">
           <div className="bg-white p-10 border-4 border-black max-w-lg w-full text-center shadow-[0_0_100px_rgba(0,0,0,0.5)] mb-8 md:mb-20">
              <Clock className="w-16 h-16 mx-auto mb-8 text-black animate-bounce" />
              <h3 className="text-4xl font-black uppercase tracking-tighter mb-4 leading-none">POSTE RESTREINT</h3>
              <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-[0.4em] mb-10">Accès caisse en dehors de vos horaires de service</p>
              
              <div className="bg-neutral-50 p-8 border border-neutral-100 mb-10">
                 <p className="text-[10px] font-black uppercase tracking-widest text-neutral-800 leading-relaxed mb-4">
                   Vos droits d'encaissement et de saisie sur ce poste sont configurés sur la plage ci-dessous :
                 </p>
                 <div className="flex items-center justify-center gap-2 bg-red-50 py-3.5 px-6 border border-red-100 max-w-xs mx-auto">
                    <Clock className="w-4 h-4 text-red-600" />
                    <span className="text-sm font-black text-red-700 tracking-widest">{currentUser.openingTime || '00:00'} - {currentUser.closingTime || '24:00'}</span>
                 </div>
                 <p className="text-[9px] text-neutral-400 uppercase font-bold tracking-widest mt-4">
                   En dehors de ces heures, vous pouvez consulter le catalogue et votre compte sans valider de ventes.
                 </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 <button 
                    onClick={() => setConsultMode(true)}
                    className="w-full py-4 border-2 border-black hover:bg-neutral-50 text-black font-black uppercase tracking-[0.15em] text-[10px] transition-colors"
                 >
                    Consulter l'Espace
                 </button>
                 <button 
                    onClick={onLogout}
                    className="w-full py-4 bg-black hover:bg-neutral-800 text-white font-black uppercase tracking-[0.15em] text-[10px] transition-colors flex items-center justify-center shadow-xl"
                 >
                    <LogOut className="w-4 h-4 mr-2" />
                    Se Déconnecter
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* Payment Lock Overlay */}
      {isPaymentLocked && currentUser.role !== 'ADMIN' && !consultMode && (
        <div className="fixed inset-0 bg-neutral-950/40 z-[320] flex flex-col items-center justify-start p-4 overflow-y-auto backdrop-blur-md animate-in fade-in duration-500 pt-8 md:pt-20">
           <div className="bg-white p-12 border-4 border-black max-w-lg w-full text-center shadow-[0_0_100px_rgba(0,0,0,0.5)] mb-8 md:mb-20">
              <LockIcon className="w-16 h-16 mx-auto mb-8 text-black" />
              <h3 className="text-4xl font-black uppercase tracking-tighter mb-4 leading-none">Terminal Clos</h3>
              <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-[0.4em] mb-10">La fenêtre de vente est actuellement verrouillée</p>
              
               <div className="bg-neutral-50 p-8 border border-neutral-100 mb-10">
                  <p className="text-[10px] font-black uppercase tracking-widest text-neutral-800 leading-relaxed">
                    Pour des raisons de sécurité et de conformité aux horaires de la boutique, les transactions sont suspendues.
                  </p>
                  <div className="flex items-center justify-center gap-4 mt-6">
                     <Clock className="w-5 h-5 text-neutral-300" />
                     <span className="text-xs font-black uppercase tracking-widest">En attente de réouverture</span>
                  </div>
               </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 <button 
                    onClick={() => setConsultMode(true)}
                    className="w-full py-4 border-2 border-black hover:bg-neutral-50 text-black font-black uppercase tracking-[0.15em] text-[10px] transition-colors"
                 >
                    Consulter l'Espace
                 </button>
                 <button 
                    onClick={onLogout}
                    className="w-full py-4 bg-black hover:bg-neutral-800 text-white font-black uppercase tracking-[0.15em] text-[10px] transition-colors flex items-center justify-center shadow-xl"
                 >
                    <LogOut className="w-4 h-4 mr-2" />
                    Se Déconnecter
                 </button>
              </div>

               <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest italic mt-6">
                 * Les administrateurs conservent un accès de secours.
               </p>
           </div>
        </div>
      )}

      {/* Session Opening Overlay */}
      {isCashSessionRequired && !currentSession && !consultMode && (
        <div className="fixed inset-0 bg-neutral-950/60 z-[320] flex flex-col items-center justify-start p-4 overflow-y-auto backdrop-blur-md animate-in fade-in duration-500 pt-8 md:pt-20">
          <div className="bg-white p-12 border-4 border-black max-w-lg w-full text-center shadow-[0_0_100px_rgba(0,0,0,0.5)] mb-8 md:mb-20">
            <Store className="w-16 h-16 mx-auto mb-8 text-black" />
            <h3 className="text-4xl font-black uppercase tracking-tighter mb-4 leading-none">Caisse Fermée</h3>
            <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-[0.4em] mb-10">Veuillez ouvrir la session de caisse pour commencer</p>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              const floatVal = parseFloat(startingFloat) || 0;
              onOpenSession(floatVal);
            }}>
              <div className="bg-neutral-50 p-8 border border-neutral-100 mb-10 text-left">
                <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 block mb-3">Fond de Caisse Initial (FCFA)</label>
                <input 
                  required
                  type="number"
                  min="0"
                  value={startingFloat}
                  onChange={e => setStartingFloat(e.target.value)}
                  className="w-full text-3xl font-black py-3 border-b-2 border-black outline-none bg-transparent"
                  placeholder="Ex: 50000"
                />
                <p className="text-[9px] text-neutral-400 uppercase font-bold tracking-widest mt-4">
                  Ce montant servira de fond de roulement de départ pour effectuer des rendus de monnaie.
                </p>
              </div>

              <button 
                type="submit"
                className="w-full mb-4 py-5 bg-black hover:bg-neutral-800 text-white font-black uppercase tracking-[0.2em] text-[11px] transition-colors flex items-center justify-center shadow-2xl"
              >
                Ouvrir la Caisse & Commencer
              </button>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                <button 
                  type="button"
                  onClick={() => setConsultMode(true)}
                  className="w-full py-4 border border-neutral-300 hover:border-black font-black uppercase tracking-[0.1em] text-[10px] transition-colors flex items-center justify-center"
                >
                  Mode Consultation
                </button>
                <button 
                  type="button"
                  onClick={onLogout}
                  className="w-full py-4 text-neutral-400 hover:text-red-600 font-black uppercase tracking-[0.1em] text-[10px] transition-colors flex items-center justify-center"
                >
                  <LogOut className="w-4 h-4 mr-2" /> Déconnexion
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

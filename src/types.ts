export type Role = 'CAISSIER' | 'MANAGER' | 'ADMIN';

export interface UserPermissions {
  canViewWholesale?: boolean;
  canViewInventory?: boolean;
  canViewStats?: boolean;
  canViewCRM?: boolean;
  canViewPromotions?: boolean;
  canViewUsers?: boolean;
  canViewAudit?: boolean;
}

export interface User {
  id: string;
  name: string;
  pin: string;
  role: Role;
  isActive: boolean;
  avatar?: string;
  openingTime?: string; // e.g. "08:30" or "" (no restriction)
  closingTime?: string; // e.g. "18:00" or "" (no restriction)
  permissions?: UserPermissions;
}

export interface ProductVariant {
  id: string;
  size: string;
  color: string;
  stock: number;
  barcode?: string;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  subCategory?: string;
  basePrice: number;
  variants: ProductVariant[];
  imageColor: string; // Used for Icon name or specialized color
  minStockThreshold?: number;
  imageUrl?: string; // Product photo
  wholesalePrice?: number; // Price of items in wholesale / bulk
  wholesaleMinQty?: number; // Minimum quantity to trigger wholesale price
  bulkPackQty?: number; // Quantity per pack/box (e.g., 10 or 12 or 24)
  isWholesaleEnabled?: boolean; // Flag if wholesale is enabled for this product
}

export interface ProductMovement {
  id: string;
  productId: string;
  variantId: string;
  type: 'SALE' | 'RESTOCK' | 'RETURN' | 'ADJUSTMENT' | 'LOSS';
  quantity: number;
  reason: string;
  date: string;
  user: string;
}

export interface CartItem {
  id: string;
  product: Product;
  variant: ProductVariant;
  quantity: number;
  discount: number; // in %
  manualPrice?: number; // Trace for manual price modification
  manualPriceReason?: string;
}

export interface PaymentItem {
  method: 'CASH' | 'MOBILE_MONEY' | 'ORANGE_MONEY' | 'MOOV_MONEY' | 'CARD';
  amount: number;
}

export function getPaymentMethodLabel(method: string): string {
  switch (method) {
    case 'CASH':
      return 'Espèces';
    case 'MOBILE_MONEY':
    case 'ORANGE_MONEY':
    case 'MOOV_MONEY':
      return 'Mobile Money';
    case 'CARD':
      return 'Carte Bancaire';
    case 'CHEQUE':
      return 'Chèque';
    case 'VIREMENT':
      return 'Virement';
    default:
      return method;
  }
}

export interface Order {
  id: string;
  date: string;
  cashier: string;
  customer?: Customer;
  items: CartItem[];
  subtotal: number;
  tax: number;
  discountTotal: number;
  total: number;
  payments: PaymentItem[];
  status: 'COMPLETED' | 'RETURNED'| 'PARTIALLY_RETURNED' | 'LAYAWAY';
  amountPaid?: number; // For Layaways (Acomptes)
  originalOrderId?: string; // For returns
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  user: string;
  action: string; // e.g., "PRICE_MODIFICATION", "STOCK_DELETE", "ORDER_CANCEL"
  details: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  loyaltyPoints: number;
  totalSpent: number;
  lastPurchaseDate?: string;
  suspended?: boolean;
}

export interface Promotion {
  id: string;
  title: string;
  imageUrl: string;
  isActive: boolean;
  type: 'BANNER' | 'POPUP';
  discountValue?: number;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  receiverId?: string; // 'GLOBAL' or targeted user ID
  text: string;
  timestamp: string;
}

export interface PendingTicket {
  id: string;
  name: string;
  items: CartItem[];
  timestamp: number;
}

export interface CashMovement {
  id: string;
  type: 'IN' | 'OUT';
  amount: number;
  reason: string;
  date: string;
  user: string;
}

export interface CashRegisterSession {
  id: string;
  openerId: string;
  closerId?: string;
  openedAt: string;
  closedAt?: string;
  expectedCash: number;
  actualCash?: number;
  difference?: number;
  notes?: string;
  status: 'OPEN' | 'CLOSED';
}

export const getVipStatus = (points: number) => {
  if (points >= 1500) return { tier: 'PLATINIUM', discount: 10, color: 'bg-black text-amber-500' };
  if (points >= 800) return { tier: 'GOLD', discount: 5, color: 'bg-amber-400 text-black' };
  if (points >= 300) return { tier: 'SILVER', discount: 2, color: 'bg-neutral-300 text-black' };
  return { tier: 'BRONZE', discount: 0, color: 'bg-neutral-100 text-neutral-500' };
};

export interface AppSettings {
  isPaymentLocked: boolean;
  manualLock: boolean;
  autoLockEnabled: boolean;
  openingTime: string; // "HH:mm"
  closingTime: string; // "HH:mm"
  isCashSessionRequired: boolean;
  logoUrl?: string;
  storeName?: string;
  storeAddress?: string;
  storePhone?: string;
  welcomeMessageEnabled?: boolean;
  welcomeMessageText?: string;
  isDatabaseSyncEnabled?: boolean;
  themeColor?: string;
  darkModeEnabled?: boolean;
  lowStockThreshold?: number;
}

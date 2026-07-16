import { Product, ProductVariant } from './types';

export interface Wholesaler {
  id: string;
  name: string;
  companyName: string;
  phone: string;
  email?: string;
  address?: string;
  balance: number; // Positive = client owes us (debt), Negative = prepaid balance
  creditLimit: number;
  createdAt: string;
}

export interface Installment {
  id: string;
  dueDate: string;
  amount: number;
  amountPaid: number;
  status: 'PENDING' | 'PAID' | 'PARTIAL' | 'OVERDUE';
}

export interface WholesaleOrderItem {
  id: string;
  productId: string;
  productName: string;
  variantId: string;
  size: string;
  color: string;
  cartonsCount: number;
  piecesPerCarton: number; // Editable per line-item: "les pièces par carton peuvent changer"
  totalPieces: number; // cartonsCount * piecesPerCarton
  unitPrice: number; // wholesale unit price
  totalAmount: number;
}

export interface WholesalePayment {
  id: string;
  date: string;
  amount: number;
  paymentMethod: 'CASH' | 'MOBILE_MONEY' | 'ORANGE_MONEY' | 'MOOV_MONEY' | 'CARD' | 'CHEQUE' | 'VIREMENT';
  notes?: string;
  receivedBy: string;
  installmentId?: string; // Links to a specific tranche if applicable
}

export interface WholesaleOrder {
  id: string;
  wholesalerId: string;
  date: string;
  items: WholesaleOrderItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  amountPaid: number;
  paymentType: 'CASH_COMPTANT' | 'INSTALLMENTS' | 'CREDIT';
  installments: Installment[];
  payments: WholesalePayment[];
  deliveryStatus: 'PENDING' | 'SHIPPED' | 'DELIVERED';
  paymentStatus: 'UNPAID' | 'PARTIALLY_PAID' | 'PAID';
  notes?: string;
  createdByUser: string;
}

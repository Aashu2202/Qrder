export interface InvoiceData {
  tenant: {
    name: string;
    address: string;
    phone?: string | null;
    gstin?: string | null;
    logoUrl?: string | null;
    currency: string;
  };
  branch: {
    name: string;
    address?: string;
  };
  order: {
    orderNumber: string;
    placedAt: string;
    completedAt?: string | null;
    tableNumber?: string | null;
    servedByName?: string | null;
    notes?: string | null;
    couponCode?: string | null;
    discountReason?: string | null;
  };
  items: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    modifiers: Array<{ name: string; priceDelta: number }>;
    lineTotal: number;
  }>;
  totals: {
    subtotal: number;
    taxAmount: number;
    discountAmount: number;
    serviceCharge?: number;
    totalAmount: number;
  };
  /** GST rate in % for display. CGST/SGST = rate/2 each, intra-state assumed. */
  gstRate?: number;
  payments?: Array<{
    method: string;
    amount: number;
    gatewayPaymentId?: string | null;
    paidAt?: string | null;
  }>;
  /** Optional message at the bottom: e.g. "Thank you, please visit again". */
  footer?: string;
}

export interface KotData {
  branch: { name: string };
  order: {
    orderNumber: string;
    placedAt: string;
    tableNumber?: string | null;
    notes?: string | null;
  };
  /** Items grouped by kitchen station. */
  stations: Array<{
    name: string;
    items: Array<{
      quantity: number;
      name: string;
      modifiers: string[];
      cookingNotes?: string | null;
    }>;
  }>;
}

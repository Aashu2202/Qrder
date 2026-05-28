export interface MenuCategory {
  id: string;
  name: string;
  slug: string;
  displayOrder: number;
  imageUrl: string | null;
  isActive: boolean;
}

export interface MenuItem {
  id: string;
  categoryId: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  basePrice: number;
  taxRate: string | null;
  isVeg: boolean;
  spicyLevel: number;
  prepTimeMinutes: number | null;
  tags: string[] | null;
  isAvailable: boolean;
  displayOrder: number;
}

export interface TableRow {
  id: string;
  number: string;
  capacity: number;
  status: 'available' | 'occupied' | 'reserved' | 'cleaning';
  qr: { id: string; token: string; isActive: boolean } | null;
}

export interface Order {
  id: string;
  orderNumber: string;
  status: string;
  tableId: string | null;
  totalAmount: number;
  subtotal: number;
  taxAmount: number;
  placedAt: string;
}

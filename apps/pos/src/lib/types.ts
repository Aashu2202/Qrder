export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  tenantId: string;
  branchId: string | null;
  permissions: string[];
}

export interface Branch {
  id: string;
  name: string;
  tenantId: string;
  isActive: boolean;
}

export interface TableRow {
  id: string;
  number: string;
  capacity: number;
  status: 'available' | 'occupied' | 'reserved' | 'cleaning';
}

export interface MenuCategory {
  id: string;
  name: string;
  slug: string;
  displayOrder: number;
}

export interface ModifierOption {
  id: string;
  name: string;
  priceDelta: number;
  isDefault: boolean;
  displayOrder: number;
}

export interface ModifierGroup {
  id: string;
  name: string;
  selectionType: 'single' | 'multiple' | string;
  minSelect: number;
  maxSelect: number;
  modifiers: ModifierOption[];
}

export interface MenuItem {
  id: string;
  categoryId: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  basePrice: number;
  isVeg: boolean;
  spicyLevel: number;
  prepTimeMinutes: number | null;
  isAvailable: boolean;
  modifierGroups?: ModifierGroup[];
}

export interface OrderItem {
  id: string;
  menuItemId: string;
  nameSnapshot: string;
  unitPrice: number;
  quantity: number;
  modifiersTotal: number;
  lineTotal: number;
  status: string;
  cookingNotes: string | null;
}

export interface Order {
  id: string;
  orderNumber: string;
  status: string;
  tableId: string | null;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  placedAt: string;
  items: OrderItem[];
  notes: string | null;
}

export interface OrderListItem {
  id: string;
  orderNumber: string;
  status: string;
  tableId: string | null;
  totalAmount: number;
  placedAt: string;
}

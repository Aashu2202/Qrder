export interface PublicResolve {
  tenant: {
    id: string;
    name: string;
    slug: string;
    logoUrl: string | null;
    brandColor: string | null;
    currency: string;
    taxConfig: { gst: number; serviceCharge: number };
    supportedLocales: string[];
  };
  branch: { id: string; name: string; phone: string | null };
  table: { id: string; number: string };
}

export interface MenuCategory {
  id: string;
  name: string;
  slug: string;
  displayOrder: number;
  imageUrl: string | null;
  localizedName?: string;
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
  taxRate: string | null;
  isVeg: boolean;
  spicyLevel: number;
  prepTimeMinutes: number | null;
  tags: string[] | null;
  isAvailable: boolean;
  modifierGroups?: ModifierGroup[];
  /** Locale-overlay fields filled by the server when ?locale=… is passed. */
  localizedName?: string;
  localizedDescription?: string | null;
  /** Current price after any active happy-hour rule. Equals basePrice when no rule applies. */
  effectivePrice?: number;
  isOnSale?: boolean;
}

export interface PublicMenu {
  categories: MenuCategory[];
  items: MenuItem[];
}

export interface OrderItemDetail {
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

export interface OrderDetail {
  id: string;
  orderNumber: string;
  status: string;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  placedAt: string;
  items: OrderItemDetail[];
}

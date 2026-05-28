export const Role = {
  SUPER_ADMIN: 'super_admin',
  MANAGER: 'manager',
  CASHIER: 'cashier',
  WAITER: 'waiter',
  KITCHEN: 'kitchen',
  BAR: 'bar',
} as const;
export type Role = (typeof Role)[keyof typeof Role];

export const OrderStatus = {
  PLACED: 'placed',
  ACCEPTED: 'accepted',
  PREPARING: 'preparing',
  READY: 'ready',
  SERVED: 'served',
  COMPLETED: 'completed',
  REJECTED: 'rejected',
  CANCELED: 'canceled',
} as const;
export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];

export const OrderItemStatus = {
  PENDING: 'pending',
  PREPARING: 'preparing',
  READY: 'ready',
  SERVED: 'served',
} as const;
export type OrderItemStatus = (typeof OrderItemStatus)[keyof typeof OrderItemStatus];

export const OrderSource = {
  QR: 'qr',
  POS: 'pos',
  PHONE: 'phone',
  ADMIN: 'admin',
} as const;
export type OrderSource = (typeof OrderSource)[keyof typeof OrderSource];

export const TableStatus = {
  AVAILABLE: 'available',
  OCCUPIED: 'occupied',
  RESERVED: 'reserved',
  CLEANING: 'cleaning',
} as const;
export type TableStatus = (typeof TableStatus)[keyof typeof TableStatus];

export const PaymentMethod = {
  UPI: 'upi',
  CARD: 'card',
  CASH: 'cash',
  WALLET: 'wallet',
  SPLIT: 'split',
} as const;
export type PaymentMethod = (typeof PaymentMethod)[keyof typeof PaymentMethod];

export const PaymentStatus = {
  PENDING: 'pending',
  PAID: 'paid',
  FAILED: 'failed',
  REFUNDED: 'refunded',
} as const;
export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];

export const Permission = {
  MENU_READ: 'menu:read',
  MENU_WRITE: 'menu:write',
  ORDERS_READ: 'orders:read',
  ORDERS_WRITE: 'orders:write',
  ORDERS_STATUS: 'orders:status',
  PAYMENTS_READ: 'payments:read',
  PAYMENTS_WRITE: 'payments:write',
  STAFF_READ: 'staff:read',
  STAFF_WRITE: 'staff:write',
  TABLES_READ: 'tables:read',
  TABLES_WRITE: 'tables:write',
  SETTINGS_WRITE: 'settings:write',
  ANALYTICS_READ: 'analytics:read',
  KITCHEN_OPERATE: 'kitchen:operate',
} as const;
export type Permission = (typeof Permission)[keyof typeof Permission];

export const RolePermissions: Record<Role, Permission[]> = {
  [Role.SUPER_ADMIN]: Object.values(Permission),
  [Role.MANAGER]: [
    Permission.MENU_READ,
    Permission.MENU_WRITE,
    Permission.ORDERS_READ,
    Permission.ORDERS_WRITE,
    Permission.ORDERS_STATUS,
    Permission.PAYMENTS_READ,
    Permission.PAYMENTS_WRITE,
    Permission.STAFF_READ,
    Permission.STAFF_WRITE,
    Permission.TABLES_READ,
    Permission.TABLES_WRITE,
    Permission.SETTINGS_WRITE,
    Permission.ANALYTICS_READ,
  ],
  [Role.CASHIER]: [
    Permission.MENU_READ,
    Permission.ORDERS_READ,
    Permission.ORDERS_WRITE,
    Permission.ORDERS_STATUS,
    Permission.PAYMENTS_READ,
    Permission.PAYMENTS_WRITE,
    Permission.TABLES_READ,
  ],
  [Role.WAITER]: [
    Permission.MENU_READ,
    Permission.ORDERS_READ,
    Permission.ORDERS_WRITE,
    Permission.ORDERS_STATUS,
    Permission.TABLES_READ,
    Permission.TABLES_WRITE,
  ],
  [Role.KITCHEN]: [
    Permission.MENU_READ,
    Permission.ORDERS_READ,
    Permission.ORDERS_STATUS,
    Permission.KITCHEN_OPERATE,
  ],
  [Role.BAR]: [
    Permission.MENU_READ,
    Permission.ORDERS_READ,
    Permission.ORDERS_STATUS,
    Permission.KITCHEN_OPERATE,
  ],
};

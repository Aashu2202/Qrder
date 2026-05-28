/**
 * Socket.IO event catalog — server↔client contract.
 * Both backend and frontend import these to stay in sync.
 */
import type { OrderStatus, OrderItemStatus, TableStatus } from './enums.js';

export const ServerEvents = {
  OrderPlaced: 'order:placed',
  OrderStatusChanged: 'order:status_changed',
  OrderItemStatusChanged: 'order:item_status_changed',
  OrderCancelled: 'order:cancelled',
  TableStatusChanged: 'table:status_changed',
  TableWaiterCalled: 'table:waiter_called',
  KitchenNewItem: 'kitchen:new_item',
  MenuItemAvailabilityChanged: 'menu:item_availability_changed',
  Notification: 'notification',
} as const;
export type ServerEvent = (typeof ServerEvents)[keyof typeof ServerEvents];

export const ClientEvents = {
  JoinOrderRoom: 'order:join',
  LeaveOrderRoom: 'order:leave',
  Ping: 'ping',
} as const;
export type ClientEvent = (typeof ClientEvents)[keyof typeof ClientEvents];

export interface OrderPlacedPayload {
  orderId: string;
  orderNumber: string;
  tableId: string | null;
  tableNumber: string | null;
  branchId: string;
  itemCount: number;
  total: number;
  placedAt: string;
}

export interface OrderStatusChangedPayload {
  orderId: string;
  status: OrderStatus;
  changedAt: string;
}

export interface OrderItemStatusChangedPayload {
  orderId: string;
  itemId: string;
  status: OrderItemStatus;
  changedAt: string;
}

export interface TableStatusChangedPayload {
  tableId: string;
  status: TableStatus;
  changedAt: string;
}

export interface NotificationPayload {
  type: string;
  message: string;
  severity: 'info' | 'success' | 'warning' | 'error';
}

export type ServerEventPayloads = {
  [ServerEvents.OrderPlaced]: OrderPlacedPayload;
  [ServerEvents.OrderStatusChanged]: OrderStatusChangedPayload;
  [ServerEvents.OrderItemStatusChanged]: OrderItemStatusChangedPayload;
  [ServerEvents.OrderCancelled]: { orderId: string; reason?: string };
  [ServerEvents.TableStatusChanged]: TableStatusChangedPayload;
  [ServerEvents.TableWaiterCalled]: { tableId: string; reason?: string };
  [ServerEvents.KitchenNewItem]: { orderId: string; itemId: string; stationId: string | null };
  [ServerEvents.MenuItemAvailabilityChanged]: { itemId: string; isAvailable: boolean };
  [ServerEvents.Notification]: NotificationPayload;
};

export const roomKey = {
  branchOrders: (tenantId: string, branchId: string) =>
    `tenant:${tenantId}:branch:${branchId}:orders`,
  branchKitchen: (tenantId: string, branchId: string) =>
    `tenant:${tenantId}:branch:${branchId}:kitchen`,
  branchStation: (tenantId: string, branchId: string, stationId: string) =>
    `tenant:${tenantId}:branch:${branchId}:station:${stationId}`,
  branchTables: (tenantId: string, branchId: string) =>
    `tenant:${tenantId}:branch:${branchId}:tables`,
  order: (tenantId: string, orderId: string) => `tenant:${tenantId}:order:${orderId}`,
};

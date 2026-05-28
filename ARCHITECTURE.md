# Qrder — Restaurant & Bar Management System

**A QR-first, multi-tenant SaaS for restaurants, cafes, bars, lounges, food courts, and cloud kitchens.**

Version: 0.1.0 (Pilot blueprint)
Last updated: 2026-05-23
Target launch scale: 1 restaurant, 1–5 branches (architecture forward-compatible with multi-tenant SaaS scale-up)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Locked Stack & Open Decisions](#2-locked-stack--open-decisions)
3. [System Architecture Overview](#3-system-architecture-overview)
4. [SaaS Multi-Tenancy Model](#4-saas-multi-tenancy-model)
5. [Monorepo & Folder Structure](#5-monorepo--folder-structure)
6. [Database Schema (PostgreSQL + Drizzle)](#6-database-schema-postgresql--drizzle)
7. [REST API Structure](#7-rest-api-structure)
8. [Real-Time Architecture (Socket.IO)](#8-real-time-architecture-socketio)
9. [Authentication & RBAC Flow](#9-authentication--rbac-flow)
10. [QR Ordering Flow (End-to-End)](#10-qr-ordering-flow-end-to-end)
11. [UI / Screen Wireframes](#11-ui--screen-wireframes)
12. [Admin Dashboard Design](#12-admin-dashboard-design)
13. [Kitchen Dashboard Design (KDS)](#13-kitchen-dashboard-design-kds)
14. [Customer QR App Design](#14-customer-qr-app-design)
15. [Deployment Architecture (Pilot)](#15-deployment-architecture-pilot)
16. [Scale-Up Path → Enterprise](#16-scale-up-path--enterprise)
17. [Development Roadmap](#17-development-roadmap)
18. [Open Library Decisions](#18-open-library-decisions-non-architectural)

---

## 1. Executive Summary

Qrder is a QR-first ordering and operations platform for hospitality businesses. A diner scans the QR sticker on their table, the menu opens instantly with the table auto-detected, they order and pay without flagging a waiter, and the kitchen sees the ticket in real time. Operators get a unified back office for menu, tables, staff, billing, inventory, and analytics.

**Design principles:**

- **QR-first, customer-frictionless.** No app install. First paint < 1.5 s on 3G.
- **Realtime by default.** Every operator screen (admin, kitchen, waiter) reflects the world within ~500 ms.
- **Multi-tenant from schema day one.** Pilot deploys as single-tenant, but data is keyed by `tenant_id` from the very first migration so we never replatform.
- **Boring tech where possible, sharp tech where it matters.** Postgres + Express + Next.js for the boring core; Socket.IO + Redis for the sharp realtime layer.
- **Offline-tolerant operator screens.** Kitchen and POS keep working through brief network blips.

---

## 2. Locked Stack & Open Decisions

### Locked (these shape the architecture)

| Layer | Choice | Why |
|---|---|---|
| Frontend framework | **Next.js 15 (App Router)** | SSR for fast QR-menu first paint; built-in image optimization for food photos; same framework for customer + admin + kitchen apps. |
| Frontend state | **TanStack Query + Zustand** | TanStack Query owns server state w/ optimistic updates; Zustand owns cart/UI state. Pairs cleanly with Socket.IO. |
| Backend runtime | **Node.js 22 + Express 5** | Per spec. Mature, easy hiring, fine perf at pilot scale. |
| Database | **PostgreSQL 16 on Neon** | Per spec. Branching DBs (Neon) makes per-PR preview DBs trivial. |
| ORM | **Drizzle ORM** | TypeScript-first, SQL-close, lightweight runtime, type-safe joins. |
| Realtime | **Socket.IO** (with Redis adapter when we scale > 1 node) | Per spec. Battle-tested, room-based broadcast fits tables/kitchens cleanly. |
| Repo | **Turborepo monorepo** with pnpm workspaces | Shared types across apps, cached builds, single source of truth. |
| Auth | **JWT (access + refresh)** with HTTP-only refresh cookies | Per spec. Refresh rotation; access tokens short (15 min). |
| File storage | **Cloudinary** | Per spec. Easier than raw S3 for image transforms (menu thumbnails). |
| Deployment | **Docker + (Render / Railway / Fly.io) for pilot → K8s later** | Pilot doesn't need K8s. Defer that complexity. |

### To be decided in Section 18

UI primitives, payment gateway, form/validation libs, testing stack, observability stack, queue/job runner. These are local choices that don't shape this document.

---

## 3. System Architecture Overview

```
                                     ┌─────────────────────────────────────────────┐
                                     │                  CDN (Cloudflare)            │
                                     │  Static assets, menu images via Cloudinary   │
                                     └────────────────────┬────────────────────────┘
                                                          │
        ┌──────────────────────┬──────────────────────────┼──────────────────────┬─────────────────────┐
        │                      │                          │                      │                     │
   ┌────▼────┐           ┌─────▼─────┐             ┌──────▼──────┐         ┌─────▼─────┐         ┌─────▼─────┐
   │ Customer│           │   Admin   │             │   Kitchen   │         │  Waiter / │         │  Public   │
   │ QR App  │           │ Dashboard │             │ Display(KDS)│         │   POS     │         │  Landing  │
   │ (Next.js│           │ (Next.js  │             │  (Next.js   │         │ (Next.js  │         │ (Next.js  │
   │  SSR)   │           │  CSR)     │             │   CSR/PWA)  │         │   PWA)    │         │   SSG)    │
   └────┬────┘           └─────┬─────┘             └──────┬──────┘         └─────┬─────┘         └─────┬─────┘
        │                      │                          │                      │                     │
        │ HTTPS / WSS          │                          │                      │                     │
        └──────────────────────┴──────────────────────────┼──────────────────────┴─────────────────────┘
                                                          │
                                          ┌───────────────▼────────────────┐
                                          │      API Gateway (Express)      │
                                          │   - REST endpoints (/api/v1/*)  │
                                          │   - Socket.IO server (/realtime)│
                                          │   - Tenant resolver middleware  │
                                          │   - JWT auth + RBAC             │
                                          │   - Rate limit + audit log      │
                                          └─┬────────┬────────┬────────┬────┘
                                            │        │        │        │
              ┌─────────────────────────────┘        │        │        └────────────────────────┐
              │                                      │        │                                  │
       ┌──────▼──────┐                       ┌───────▼────┐ ┌─▼──────────┐                ┌──────▼──────┐
       │ PostgreSQL  │                       │   Redis    │ │ Cloudinary │                │  Workers    │
       │  (Neon)     │                       │  cache +   │ │  images    │                │ (BullMQ):   │
       │             │                       │  Pub/Sub + │ │            │                │ - invoices  │
       │ All tenant  │                       │  Socket.IO │ │            │                │ - emails    │
       │ data, RLS   │                       │  adapter   │ │            │                │ - reports   │
       └─────────────┘                       └────────────┘ └────────────┘                │ - webhooks  │
                                                                                          └──────┬──────┘
                                                                                                 │
                                                                                          ┌──────▼──────┐
                                                                                          │  External   │
                                                                                          │  services:  │
                                                                                          │  - Razorpay │
                                                                                          │  - WhatsApp │
                                                                                          │  - SendGrid │
                                                                                          │  - Twilio   │
                                                                                          └─────────────┘
```

**At pilot scale, the API Gateway, Socket.IO server, and worker run in the same Node process.** They split into independent services only when traffic warrants it (see [Section 16](#16-scale-up-path--enterprise)).

---

## 4. SaaS Multi-Tenancy Model

**Strategy: shared database, shared schema, row-level tenant isolation.**

This is the lowest-friction multi-tenant model and the right call for the pilot. Every business table carries a `tenant_id` column. Every query filters by `tenant_id` via middleware-injected context — no manual `WHERE tenant_id = ?` in feature code.

### Tenant resolution chain (middleware order matters)

1. **Customer QR routes** → `tenant_id` + `branch_id` extracted from the QR token (JWT, scoped, public).
2. **Operator routes** → `tenant_id` extracted from the authenticated user's JWT.
3. **Platform admin routes** → no tenant; explicit `?tenant=...` query and platform-admin role check.

### Defense in depth

- **App layer**: a `tenantContext` AsyncLocalStorage scope wraps every request. Drizzle queries go through a `tenantDb(tenantId)` factory that auto-applies `eq(table.tenantId, tenantId)`.
- **DB layer**: PostgreSQL Row-Level Security policies on every business table — even if app-level filter is bypassed, the DB rejects cross-tenant reads.
- **CI guard**: a lint rule that flags any `db.select()` or `db.insert()` call not routed through `tenantDb(...)`.

### What is and isn't tenant-scoped

| Scoped by tenant | Global (platform) |
|---|---|
| menu_items, tables, orders, payments, staff, customers, inventory, kitchen_stations, settings | plans, subscriptions, platform_admins, audit_logs (with tenant_id col), feature_flags |

---

## 5. Monorepo & Folder Structure

```
qrder/
├── apps/
│   ├── api/                          # Express + Socket.IO backend
│   │   ├── src/
│   │   │   ├── server.ts             # HTTP + Socket.IO bootstrap
│   │   │   ├── app.ts                # Express app factory
│   │   │   ├── config/               # env loader, constants
│   │   │   ├── middleware/
│   │   │   │   ├── auth.ts           # JWT verify, attach user
│   │   │   │   ├── tenant.ts         # resolve + scope tenant
│   │   │   │   ├── rbac.ts           # role-based gate
│   │   │   │   ├── rateLimit.ts
│   │   │   │   └── errorHandler.ts
│   │   │   ├── modules/              # feature modules (vertical slices)
│   │   │   │   ├── auth/             # routes, service, dto
│   │   │   │   ├── tenant/
│   │   │   │   ├── branches/
│   │   │   │   ├── tables/
│   │   │   │   ├── menu/
│   │   │   │   ├── orders/
│   │   │   │   ├── kitchen/
│   │   │   │   ├── payments/
│   │   │   │   ├── staff/
│   │   │   │   ├── customers/
│   │   │   │   ├── inventory/
│   │   │   │   ├── analytics/
│   │   │   │   └── notifications/
│   │   │   ├── realtime/
│   │   │   │   ├── io.ts             # Socket.IO server setup
│   │   │   │   ├── rooms.ts          # room naming + join logic
│   │   │   │   └── handlers/         # per-namespace event handlers
│   │   │   ├── workers/              # BullMQ workers (in-process for pilot)
│   │   │   │   ├── invoice.worker.ts
│   │   │   │   ├── notification.worker.ts
│   │   │   │   └── report.worker.ts
│   │   │   ├── lib/                  # shared utils (logger, errors, ids)
│   │   │   └── index.ts              # entrypoint
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── customer/                     # Next.js 15 customer QR app
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── (qr)/[qrToken]/   # /q/<token> — SSR menu landing
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   ├── cart/page.tsx
│   │   │   │   │   ├── order/[id]/page.tsx  # live tracking
│   │   │   │   │   └── pay/page.tsx
│   │   │   │   ├── layout.tsx
│   │   │   │   └── globals.css
│   │   │   ├── components/           # menu cards, cart drawer, etc
│   │   │   ├── lib/
│   │   │   │   ├── api.ts            # fetch wrappers
│   │   │   │   ├── socket.ts         # Socket.IO client
│   │   │   │   └── i18n.ts
│   │   │   ├── store/                # Zustand: cart, ui
│   │   │   └── hooks/                # TanStack Query hooks
│   │   ├── public/
│   │   ├── next.config.ts
│   │   └── package.json
│   │
│   ├── admin/                        # Next.js admin dashboard
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── (auth)/login/page.tsx
│   │   │   │   ├── (dashboard)/
│   │   │   │   │   ├── layout.tsx    # sidebar + topbar
│   │   │   │   │   ├── overview/page.tsx
│   │   │   │   │   ├── orders/page.tsx
│   │   │   │   │   ├── menu/page.tsx
│   │   │   │   │   ├── tables/page.tsx
│   │   │   │   │   ├── staff/page.tsx
│   │   │   │   │   ├── customers/page.tsx
│   │   │   │   │   ├── inventory/page.tsx
│   │   │   │   │   ├── analytics/page.tsx
│   │   │   │   │   ├── branches/page.tsx
│   │   │   │   │   └── settings/page.tsx
│   │   │   │   └── layout.tsx
│   │   │   ├── components/
│   │   │   ├── lib/
│   │   │   ├── store/
│   │   │   └── hooks/
│   │   └── package.json
│   │
│   ├── kitchen/                      # KDS — tablet-optimized PWA
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── (auth)/login/page.tsx
│   │   │   │   ├── (kds)/
│   │   │   │   │   ├── page.tsx      # active orders board
│   │   │   │   │   ├── station/[id]/page.tsx  # per-station view
│   │   │   │   │   └── history/page.tsx
│   │   │   ├── components/
│   │   │   └── service-worker.ts     # offline cache
│   │   └── package.json
│   │
│   └── pos/                          # Waiter / POS PWA (tablet)
│       ├── src/
│       │   ├── app/
│       │   │   ├── (auth)/login/page.tsx
│       │   │   ├── (pos)/
│       │   │   │   ├── tables/page.tsx
│       │   │   │   ├── order/[tableId]/page.tsx
│       │   │   │   └── bills/page.tsx
│       │   └── ...
│       └── package.json
│
├── packages/
│   ├── db/                           # Drizzle schema + migrations
│   │   ├── src/
│   │   │   ├── schema/
│   │   │   │   ├── tenants.ts
│   │   │   │   ├── branches.ts
│   │   │   │   ├── tables.ts
│   │   │   │   ├── menu.ts
│   │   │   │   ├── orders.ts
│   │   │   │   ├── payments.ts
│   │   │   │   ├── staff.ts
│   │   │   │   ├── customers.ts
│   │   │   │   ├── inventory.ts
│   │   │   │   ├── kitchen.ts
│   │   │   │   ├── notifications.ts
│   │   │   │   └── index.ts
│   │   │   ├── client.ts             # tenantDb() factory
│   │   │   ├── seed.ts
│   │   │   └── types.ts
│   │   ├── drizzle.config.ts
│   │   └── migrations/               # generated
│   │
│   ├── shared/                       # cross-app types, enums, constants
│   │   ├── src/
│   │   │   ├── events.ts             # Socket.IO event names + payloads
│   │   │   ├── enums.ts              # OrderStatus, Role, PaymentMethod
│   │   │   ├── dto/                  # request/response Zod schemas
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── ui/                           # shared React components
│   │   ├── src/
│   │   │   ├── components/           # Button, Card, Modal, Toast, etc
│   │   │   ├── primitives/           # design tokens, theme
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── auth/                         # JWT helpers, password hash, QR-token
│   │   └── src/
│   │       ├── jwt.ts
│   │       ├── password.ts
│   │       └── qrToken.ts
│   │
│   └── config/                       # eslint, tsconfig, tailwind preset
│       ├── eslint-preset.js
│       ├── tsconfig.base.json
│       └── tailwind.preset.js
│
├── infra/
│   ├── docker/
│   │   ├── docker-compose.yml        # local: postgres + redis
│   │   └── docker-compose.prod.yml
│   ├── k8s/                          # future
│   └── github/
│       └── workflows/
│           ├── ci.yml                # lint + test + typecheck
│           ├── deploy-api.yml
│           └── deploy-web.yml
│
├── docs/
│   ├── ARCHITECTURE.md               # this file (or symlinked)
│   ├── API.md                        # generated from OpenAPI
│   ├── ROADMAP.md
│   └── DECISIONS/                    # ADRs
│
├── turbo.json
├── pnpm-workspace.yaml
├── package.json
├── .env.example
├── .gitignore
└── README.md
```

---

## 6. Database Schema (PostgreSQL + Drizzle)

### ER overview (textual)

```
plans ─< subscriptions >─ tenants ─< branches ─< tables
                            │           │         │
                            │           │         └─< qr_codes
                            │           ├─< menu_categories ─< menu_items ─< menu_item_modifiers
                            │           │                                    │
                            │           │                                    └─> modifier_groups ─< modifiers
                            │           ├─< kitchen_stations
                            │           ├─< orders ─< order_items ─< order_item_modifiers
                            │           │     │
                            │           │     └─< payments
                            │           ├─< staff (users)
                            │           ├─< customers ─< loyalty_transactions
                            │           ├─< inventory_items ─< stock_movements
                            │           ├─< feedback
                            │           └─< notifications
                            └─< audit_logs
```

### Core tables (representative Drizzle definitions)

```ts
// packages/db/src/schema/tenants.ts
import { pgTable, uuid, varchar, timestamp, jsonb, boolean } from 'drizzle-orm/pg-core';

export const plans = pgTable('plans', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 64 }).notNull(),         // 'trial', 'starter', 'pro', 'enterprise'
  priceMonthly: integer('price_monthly').notNull(),         // in paise/cents
  maxBranches: integer('max_branches').notNull(),
  maxStaff: integer('max_staff').notNull(),
  maxOrdersPerMonth: integer('max_orders_per_month'),
  features: jsonb('features').notNull(),                    // { kds: true, analytics: true, ... }
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const tenants = pgTable('tenants', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 128 }).notNull(),
  slug: varchar('slug', { length: 64 }).notNull().unique(), // qrder.app/<slug>
  ownerEmail: varchar('owner_email', { length: 255 }).notNull(),
  currency: varchar('currency', { length: 3 }).default('INR').notNull(),
  timezone: varchar('timezone', { length: 64 }).default('Asia/Kolkata').notNull(),
  logoUrl: varchar('logo_url', { length: 512 }),
  brandColor: varchar('brand_color', { length: 7 }),
  taxConfig: jsonb('tax_config').notNull(),                  // { gst: 5, serviceCharge: 0, ... }
  settings: jsonb('settings').notNull().default({}),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const subscriptions = pgTable('subscriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  planId: uuid('plan_id').notNull().references(() => plans.id),
  status: varchar('status', { length: 32 }).notNull(),       // 'trial', 'active', 'past_due', 'canceled'
  trialEndsAt: timestamp('trial_ends_at'),
  currentPeriodEnd: timestamp('current_period_end').notNull(),
  externalSubscriptionId: varchar('external_subscription_id', { length: 128 }), // Razorpay sub id
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
```

```ts
// packages/db/src/schema/branches.ts
export const branches = pgTable('branches', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 128 }).notNull(),
  address: jsonb('address').notNull(),
  phone: varchar('phone', { length: 24 }),
  isActive: boolean('is_active').default(true).notNull(),
  openHours: jsonb('open_hours'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => ({
  tenantIdx: index('branches_tenant_idx').on(t.tenantId),
}));
```

```ts
// packages/db/src/schema/tables.ts
export const tables = pgTable('tables', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  branchId: uuid('branch_id').notNull().references(() => branches.id, { onDelete: 'cascade' }),
  number: varchar('number', { length: 16 }).notNull(),       // 'T01', 'B-Patio-3'
  capacity: integer('capacity').default(4).notNull(),
  status: varchar('status', { length: 16 }).default('available').notNull(),
  // 'available' | 'occupied' | 'reserved' | 'cleaning'
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => ({
  uniqPerBranch: uniqueIndex('tables_branch_number_uq').on(t.branchId, t.number),
  tenantIdx: index('tables_tenant_idx').on(t.tenantId),
}));

export const qrCodes = pgTable('qr_codes', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  branchId: uuid('branch_id').notNull().references(() => branches.id),
  tableId: uuid('table_id').references(() => tables.id, { onDelete: 'cascade' }),
  token: varchar('token', { length: 64 }).notNull().unique(), // opaque; embedded in URL
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
```

```ts
// packages/db/src/schema/menu.ts
export const menuCategories = pgTable('menu_categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  branchId: uuid('branch_id').references(() => branches.id), // null = applies to all branches
  name: varchar('name', { length: 64 }).notNull(),
  slug: varchar('slug', { length: 64 }).notNull(),
  displayOrder: integer('display_order').default(0).notNull(),
  imageUrl: varchar('image_url', { length: 512 }),
  isActive: boolean('is_active').default(true).notNull(),
});

export const menuItems = pgTable('menu_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  branchId: uuid('branch_id').references(() => branches.id), // null = all branches
  categoryId: uuid('category_id').notNull().references(() => menuCategories.id),
  name: varchar('name', { length: 128 }).notNull(),
  description: text('description'),
  imageUrl: varchar('image_url', { length: 512 }),
  basePrice: integer('base_price').notNull(),                 // paise/cents
  taxRate: numeric('tax_rate', { precision: 5, scale: 2 }),
  isVeg: boolean('is_veg').default(true).notNull(),
  spicyLevel: integer('spicy_level').default(0).notNull(),    // 0..3
  prepTimeMinutes: integer('prep_time_minutes'),
  stationId: uuid('station_id').references(() => kitchenStations.id),
  tags: text('tags').array(),                                 // ['bestseller','chef-special']
  isAvailable: boolean('is_available').default(true).notNull(),
  displayOrder: integer('display_order').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const modifierGroups = pgTable('modifier_groups', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 64 }).notNull(),            // 'Size', 'Add-ons', 'Spice level'
  selectionType: varchar('selection_type', { length: 16 }).notNull(), // 'single' | 'multiple'
  minSelect: integer('min_select').default(0).notNull(),
  maxSelect: integer('max_select').default(1).notNull(),
});

export const modifiers = pgTable('modifiers', {
  id: uuid('id').primaryKey().defaultRandom(),
  groupId: uuid('group_id').notNull().references(() => modifierGroups.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 64 }).notNull(),            // 'Extra cheese', 'Large'
  priceDelta: integer('price_delta').default(0).notNull(),    // can be negative
  isDefault: boolean('is_default').default(false).notNull(),
});

export const menuItemModifierGroups = pgTable('menu_item_modifier_groups', {
  menuItemId: uuid('menu_item_id').notNull().references(() => menuItems.id, { onDelete: 'cascade' }),
  groupId: uuid('group_id').notNull().references(() => modifierGroups.id, { onDelete: 'cascade' }),
}, (t) => ({ pk: primaryKey({ columns: [t.menuItemId, t.groupId] }) }));
```

```ts
// packages/db/src/schema/orders.ts
export const orders = pgTable('orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  branchId: uuid('branch_id').notNull().references(() => branches.id),
  tableId: uuid('table_id').references(() => tables.id),
  orderNumber: varchar('order_number', { length: 16 }).notNull(), // human-readable, branch-scoped daily
  customerId: uuid('customer_id').references(() => customers.id),
  source: varchar('source', { length: 16 }).notNull(),        // 'qr' | 'pos' | 'phone' | 'admin'
  status: varchar('status', { length: 24 }).notNull(),
  // 'placed' | 'accepted' | 'preparing' | 'ready' | 'served' | 'completed' | 'rejected' | 'canceled'
  subtotal: integer('subtotal').notNull(),
  taxAmount: integer('tax_amount').notNull(),
  discountAmount: integer('discount_amount').default(0).notNull(),
  totalAmount: integer('total_amount').notNull(),
  notes: text('notes'),
  placedAt: timestamp('placed_at').defaultNow().notNull(),
  acceptedAt: timestamp('accepted_at'),
  readyAt: timestamp('ready_at'),
  servedAt: timestamp('served_at'),
  completedAt: timestamp('completed_at'),
  servedByStaffId: uuid('served_by_staff_id').references(() => staff.id),
}, (t) => ({
  tenantBranchStatusIdx: index('orders_tenant_branch_status_idx').on(t.tenantId, t.branchId, t.status),
  tableActiveIdx: index('orders_table_active_idx').on(t.tableId, t.status),
  placedAtIdx: index('orders_placed_at_idx').on(t.placedAt),
}));

export const orderItems = pgTable('order_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderId: uuid('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  menuItemId: uuid('menu_item_id').notNull().references(() => menuItems.id),
  nameSnapshot: varchar('name_snapshot', { length: 128 }).notNull(),  // freeze item name at order time
  unitPrice: integer('unit_price').notNull(),
  quantity: integer('quantity').notNull(),
  modifiersTotal: integer('modifiers_total').default(0).notNull(),
  lineTotal: integer('line_total').notNull(),
  status: varchar('status', { length: 24 }).default('pending').notNull(),
  cookingNotes: text('cooking_notes'),
  stationId: uuid('station_id').references(() => kitchenStations.id),
  startedAt: timestamp('started_at'),
  readyAt: timestamp('ready_at'),
}, (t) => ({
  orderIdx: index('order_items_order_idx').on(t.orderId),
}));

export const orderItemModifiers = pgTable('order_item_modifiers', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderItemId: uuid('order_item_id').notNull().references(() => orderItems.id, { onDelete: 'cascade' }),
  modifierId: uuid('modifier_id').notNull().references(() => modifiers.id),
  nameSnapshot: varchar('name_snapshot', { length: 64 }).notNull(),
  priceDelta: integer('price_delta').notNull(),
});
```

```ts
// packages/db/src/schema/payments.ts
export const payments = pgTable('payments', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  orderId: uuid('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  amount: integer('amount').notNull(),
  method: varchar('method', { length: 16 }).notNull(),        // 'upi' | 'card' | 'cash' | 'wallet' | 'split'
  status: varchar('status', { length: 16 }).notNull(),        // 'pending' | 'paid' | 'failed' | 'refunded'
  gateway: varchar('gateway', { length: 16 }),                // 'razorpay' | 'stripe' | null (cash)
  gatewayPaymentId: varchar('gateway_payment_id', { length: 128 }),
  gatewayMeta: jsonb('gateway_meta'),
  paidAt: timestamp('paid_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
```

```ts
// packages/db/src/schema/staff.ts
export const staff = pgTable('staff', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  branchId: uuid('branch_id').references(() => branches.id),  // null = all branches (super admin)
  email: varchar('email', { length: 255 }).notNull(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  name: varchar('name', { length: 128 }).notNull(),
  phone: varchar('phone', { length: 24 }),
  role: varchar('role', { length: 32 }).notNull(),
  // 'super_admin' | 'manager' | 'cashier' | 'waiter' | 'kitchen' | 'bar'
  stationIds: uuid('station_ids').array(),                    // kitchen staff
  isActive: boolean('is_active').default(true).notNull(),
  lastLoginAt: timestamp('last_login_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => ({
  tenantEmailUq: uniqueIndex('staff_tenant_email_uq').on(t.tenantId, t.email),
}));
```

```ts
// packages/db/src/schema/customers.ts
export const customers = pgTable('customers', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  phone: varchar('phone', { length: 24 }),
  email: varchar('email', { length: 255 }),
  name: varchar('name', { length: 128 }),
  loyaltyPoints: integer('loyalty_points').default(0).notNull(),
  totalSpend: integer('total_spend').default(0).notNull(),
  visitCount: integer('visit_count').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => ({
  tenantPhoneIdx: index('customers_tenant_phone_idx').on(t.tenantId, t.phone),
}));

export const feedback = pgTable('feedback', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  orderId: uuid('order_id').references(() => orders.id),
  customerId: uuid('customer_id').references(() => customers.id),
  rating: integer('rating').notNull(),                        // 1..5
  comment: text('comment'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
```

```ts
// packages/db/src/schema/inventory.ts
export const inventoryItems = pgTable('inventory_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  branchId: uuid('branch_id').notNull().references(() => branches.id),
  name: varchar('name', { length: 128 }).notNull(),
  unit: varchar('unit', { length: 16 }).notNull(),            // 'kg', 'l', 'pcs'
  stockQty: numeric('stock_qty', { precision: 12, scale: 3 }).notNull(),
  reorderLevel: numeric('reorder_level', { precision: 12, scale: 3 }),
  costPerUnit: integer('cost_per_unit'),
});

export const stockMovements = pgTable('stock_movements', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  inventoryItemId: uuid('inventory_item_id').notNull().references(() => inventoryItems.id),
  changeQty: numeric('change_qty', { precision: 12, scale: 3 }).notNull(),
  reason: varchar('reason', { length: 32 }).notNull(),        // 'purchase' | 'consumption' | 'wastage' | 'adjustment'
  orderId: uuid('order_id').references(() => orders.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
```

```ts
// packages/db/src/schema/kitchen.ts
export const kitchenStations = pgTable('kitchen_stations', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  branchId: uuid('branch_id').notNull().references(() => branches.id),
  name: varchar('name', { length: 64 }).notNull(),            // 'Grill', 'Bar', 'Tandoor', 'Dessert'
  displayOrder: integer('display_order').default(0).notNull(),
});
```

```ts
// packages/db/src/schema/notifications.ts
export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  recipientStaffId: uuid('recipient_staff_id').references(() => staff.id),
  channel: varchar('channel', { length: 16 }).notNull(),      // 'in_app' | 'email' | 'sms' | 'whatsapp' | 'push'
  type: varchar('type', { length: 32 }).notNull(),
  payload: jsonb('payload').notNull(),
  readAt: timestamp('read_at'),
  sentAt: timestamp('sent_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id),
  actorStaffId: uuid('actor_staff_id').references(() => staff.id),
  action: varchar('action', { length: 64 }).notNull(),
  entity: varchar('entity', { length: 32 }).notNull(),
  entityId: uuid('entity_id'),
  diff: jsonb('diff'),
  ip: varchar('ip', { length: 64 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
```

### Index strategy

- Every `tenant_id` column gets an index.
- Hot queries (live orders board, KDS) get composite indexes: `(tenant_id, branch_id, status)`, `(branch_id, status, placed_at DESC)`.
- `orders.placed_at` indexed for analytics range scans.
- Foreign-key columns indexed implicitly (Postgres doesn't auto-create FK indexes — Drizzle migrations will add them).

### Row-Level Security (representative)

```sql
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY orders_tenant_isolation ON orders
  USING (tenant_id = current_setting('app.current_tenant')::uuid);
```

Set per-transaction via `SET LOCAL app.current_tenant = '<uuid>'` in the tenant middleware.

---

## 7. REST API Structure

**Base URL:** `https://api.qrder.app/v1`
**All responses JSON.** Errors follow RFC 7807 problem+json.
**Versioned:** `/v1` is stable contract; breaking changes get `/v2`.

### Naming conventions

- Resource-oriented, plural nouns: `/menu-items`, `/orders`, `/tables`.
- Customer-facing (no auth, just QR token) lives under `/q/<token>/...`.
- Operator-facing requires JWT, lives under `/v1/...`.

### Customer (public via QR token)

| Method | Path | Purpose |
|---|---|---|
| GET | `/q/:token` | Resolve QR → tenant/branch/table public info + branding |
| GET | `/q/:token/menu` | Fetch full menu for this branch |
| GET | `/q/:token/menu/items/:id` | Item detail with modifiers |
| POST | `/q/:token/orders` | Place order from cart |
| GET | `/q/:token/orders/:id` | Order status + items |
| POST | `/q/:token/orders/:id/feedback` | Submit rating |
| POST | `/q/:token/payments/initiate` | Start payment (returns gateway session) |
| POST | `/q/:token/payments/webhook` | Gateway webhook (no token, signed) |
| POST | `/q/:token/waiter-call` | Smart waiter calling |

### Auth (operator)

| Method | Path | Purpose |
|---|---|---|
| POST | `/v1/auth/login` | email + password → access + refresh token |
| POST | `/v1/auth/refresh` | refresh → new access token |
| POST | `/v1/auth/logout` | invalidate refresh token |
| POST | `/v1/auth/forgot-password` | email reset link |
| POST | `/v1/auth/reset-password` | token + new password |
| GET | `/v1/auth/me` | current user + permissions |

### Tenant & branches

| Method | Path | Roles |
|---|---|---|
| GET | `/v1/tenant` | super_admin, manager |
| PATCH | `/v1/tenant` | super_admin |
| GET | `/v1/branches` | all operators |
| POST | `/v1/branches` | super_admin |
| PATCH | `/v1/branches/:id` | super_admin, manager |
| DELETE | `/v1/branches/:id` | super_admin |

### Tables & QR

| Method | Path | Roles |
|---|---|---|
| GET | `/v1/branches/:branchId/tables` | manager, waiter |
| POST | `/v1/branches/:branchId/tables` | manager |
| PATCH | `/v1/tables/:id` | manager, waiter (status only) |
| DELETE | `/v1/tables/:id` | manager |
| POST | `/v1/tables/:id/qr` | (re)generate QR token |
| GET | `/v1/tables/:id/qr.png` | download printable QR |
| POST | `/v1/tables/bulk-qr` | generate sheet of QRs (PDF) |

### Menu

| Method | Path | Roles |
|---|---|---|
| GET | `/v1/menu/categories` | manager |
| POST | `/v1/menu/categories` | manager |
| PATCH | `/v1/menu/categories/:id` | manager |
| GET | `/v1/menu/items` | manager |
| POST | `/v1/menu/items` | manager |
| PATCH | `/v1/menu/items/:id` | manager |
| PATCH | `/v1/menu/items/:id/availability` | manager, kitchen |
| POST | `/v1/menu/items/:id/image` | manager (Cloudinary signed upload) |
| GET | `/v1/menu/modifier-groups` | manager |
| POST | `/v1/menu/modifier-groups` | manager |

### Orders

| Method | Path | Roles |
|---|---|---|
| GET | `/v1/orders` | manager, cashier, waiter (live + history, filters via query) |
| GET | `/v1/orders/:id` | manager, cashier, waiter |
| POST | `/v1/orders` | manager, waiter, cashier (manual order) |
| PATCH | `/v1/orders/:id/status` | manager, waiter, kitchen |
| POST | `/v1/orders/:id/items` | waiter (add items to existing order) |
| DELETE | `/v1/orders/:id/items/:itemId` | manager, waiter |
| POST | `/v1/orders/:id/merge` | manager, waiter |
| POST | `/v1/orders/:id/split` | manager, cashier |
| POST | `/v1/orders/:id/discount` | manager |
| POST | `/v1/orders/:id/kot` | print/regenerate KOT |
| POST | `/v1/orders/:id/invoice` | generate invoice PDF |

### Kitchen

| Method | Path | Roles |
|---|---|---|
| GET | `/v1/kitchen/queue` | kitchen, bar |
| POST | `/v1/kitchen/items/:orderItemId/accept` | kitchen |
| POST | `/v1/kitchen/items/:orderItemId/ready` | kitchen |
| POST | `/v1/kitchen/items/:orderItemId/delay` | kitchen |
| GET | `/v1/kitchen/stations` | manager, kitchen |
| POST | `/v1/kitchen/stations` | manager |

### Payments & billing

| Method | Path | Roles |
|---|---|---|
| POST | `/v1/payments` | cashier, manager (record manual payment) |
| GET | `/v1/payments/:id` | cashier, manager |
| POST | `/v1/payments/:id/refund` | manager |
| GET | `/v1/invoices/:orderId` | cashier, manager |
| POST | `/v1/invoices/:orderId/send` | cashier (whatsapp/email) |

### Staff

| Method | Path | Roles |
|---|---|---|
| GET | `/v1/staff` | super_admin, manager |
| POST | `/v1/staff` | super_admin, manager |
| PATCH | `/v1/staff/:id` | super_admin, manager |
| DELETE | `/v1/staff/:id` | super_admin |
| POST | `/v1/staff/:id/reset-password` | super_admin |

### Customers, inventory, analytics, notifications follow the same shape — full table in `docs/API.md` (generated from OpenAPI).

### Conventions

- **Pagination:** cursor-based — `?cursor=<opaque>&limit=50`.
- **Filtering:** explicit query params, not generic `?filter=`.
- **Idempotency:** `POST /orders` accepts `Idempotency-Key` header; key + tenant unique for 24h.
- **Rate limiting:** 100 req/min/IP on customer; 600 req/min/user on operator.
- **Errors:** `{ type, title, status, detail, traceId, fields? }`.

---

## 8. Real-Time Architecture (Socket.IO)

### Rooms (namespacing pattern)

```
tenant:<tenantId>:branch:<branchId>:orders        ← all operator clients of a branch
tenant:<tenantId>:branch:<branchId>:kitchen       ← KDS clients
tenant:<tenantId>:branch:<branchId>:station:<id>  ← per-station KDS view
tenant:<tenantId>:branch:<branchId>:tables        ← table status updates
tenant:<tenantId>:order:<orderId>                 ← customer's order tracking
```

### Connection auth

- Operator clients connect with JWT in `auth.token`. Server validates, joins `tenant:` + branch rooms based on user's branch access.
- Customer clients connect with QR token. Server validates, joins only their `order:<id>` room when they place an order.

### Event catalog (typed via `packages/shared/src/events.ts`)

| Event | Direction | Payload | Subscribers |
|---|---|---|---|
| `order:placed` | server → operator | `{ orderId, tableNumber, items[], total }` | branch:orders, branch:kitchen |
| `order:status_changed` | server → both | `{ orderId, status, changedAt }` | branch:orders, order:<id> |
| `order:item_status_changed` | server → both | `{ orderId, itemId, status }` | branch:kitchen, order:<id> |
| `order:cancelled` | server → both | `{ orderId, reason }` | branch:orders, order:<id> |
| `table:status_changed` | server → operator | `{ tableId, status }` | branch:tables |
| `table:waiter_called` | server → operator | `{ tableId, reason }` | branch:orders |
| `kitchen:new_item` | server → KDS | `{ orderId, item, stationId }` | branch:station:<id> |
| `menu:item_availability_changed` | server → all | `{ itemId, isAvailable }` | branch:orders, customer connections in branch |
| `notification` | server → operator | `{ type, message, severity }` | tenant:<id>:user:<id> |

### Delivery guarantees

- Socket.IO acks for critical events (`order:placed`). If kitchen client doesn't ack within 5 s, server falls back to BullMQ retry + push notification.
- Customer events tolerated as best-effort; the order tracking page also polls `/orders/:id` every 10 s as a safety net.

### Horizontal scaling

- Pilot: 1 Node process, no Redis adapter needed.
- > 1 process: Socket.IO Redis Streams adapter (built-in), Redis at `REDIS_URL`.

---

## 9. Authentication & RBAC Flow

### Token model

- **Access token** (JWT, 15 min) — carried in `Authorization: Bearer`.
- **Refresh token** (opaque, 30 d) — HTTP-only, Secure, SameSite=Strict cookie. Rotated on every refresh; old token added to revocation list (Redis SET with TTL).
- **QR token** (signed JWT, no expiry, can be rotated by tenant) — encodes `{ tenantId, branchId, tableId, jti }`. Server verifies signature + checks `qr_codes.is_active`.

### Login flow

```
1. POST /v1/auth/login { email, password }
2. Server: find staff by (tenant_slug?, email), bcrypt compare
3. Issue access JWT { sub: staffId, tenantId, branchId, role, perms }
4. Issue refresh token, set as HTTP-only cookie
5. Return { accessToken, user }
```

### Refresh flow

```
1. Client hits 401 on any /v1/* call
2. Client calls POST /v1/auth/refresh (cookie auto-sent)
3. Server validates refresh token (signature, not revoked, not expired)
4. Issue new access + rotate refresh
5. Retry original request
```

### RBAC matrix (summarized)

| Role | Menu mgmt | Order create | Order status | Payments | Staff mgmt | Settings | Analytics |
|---|---|---|---|---|---|---|---|
| super_admin | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| manager | ✅ | ✅ | ✅ | ✅ | ✅ (non-admin) | ✅ (branch) | ✅ |
| cashier | — | ✅ | ✅ (limited) | ✅ | — | — | view-only |
| waiter | — | ✅ | ✅ (limited) | record cash only | — | — | — |
| kitchen | toggle availability | — | item-status only | — | — | — | own metrics |

Permissions encoded as scopes on the JWT (`perms: ["menu:read","menu:write","orders:write","payments:write",...]`). Express middleware `requirePerm('menu:write')` gates each route.

### Customer QR auth

- No customer login required by default.
- Optionally: phone-OTP linking (saves to `customers` table, enables loyalty).
- Customer JWT scoped to `{ qrToken, customerId?, orderId? }` — never grants operator capabilities.

---

## 10. QR Ordering Flow (End-to-End)

```
[1] Diner scans QR sticker on table T03
    ─→ Phone opens https://qrder.app/q/abc123xyz

[2] Next.js SSR route (qr)/[qrToken]/page.tsx:
    - Server resolves QR token → tenant, branch, table
    - Fetches branding + menu (cached at edge for 60s)
    - Streams full menu HTML to client
    - First paint < 1.5s on 3G

[3] Client hydrates, opens Socket.IO connection in background
    - Joins room: tenant:<id>:branch:<id>:public (for live availability)

[4] Diner browses menu
    - "Bestseller" and "Recently ordered" sections personalized by phone (if linked) or session
    - Item cards: image, price, veg/non-veg dot, spicy chili, prep time
    - Tap item → modifier modal (size, add-ons, cooking notes)
    - "Add to cart" → Zustand cart store

[5] Cart drawer
    - Subtotal, taxes (computed client-side, verified server-side)
    - "Place order" CTA

[6] POST /q/<token>/orders { items: [...], notes }
    - Server:
        a. Validate items + prices (refetch + compare)
        b. Validate availability
        c. Compute totals (authoritative)
        d. Create order + order_items (transaction)
        e. Emit `order:placed` to branch:orders + branch:kitchen rooms
        f. Update table status → 'occupied'
        g. Schedule prep-time estimation
    - Response: { orderId, orderNumber, eta }

[7] Customer redirected to /q/<token>/order/<id>
    - Real-time status: Placed → Accepted → Preparing → Ready → Served
    - Each transition: subtle haptic + status update
    - "Add more items" button → returns to menu, items added to existing order

[8] Kitchen (KDS) flow
    - Order card pops with sound notification
    - Items routed to stations based on menu_items.stationId
    - Cook taps "Start" → status preparing, timer begins
    - Cook taps "Ready" → notification to waiter ("Order #42 ready at Tandoor")

[9] Waiter delivers
    - Waiter app shows "Ready to serve at T03"
    - Tap "Served" → order.status = 'served'

[10] Payment
    - Option A (recommended): Customer taps "Pay now" → /q/<token>/pay
      - Select method (UPI/Card/Wallet)
      - Gateway redirect (Razorpay)
      - Webhook → payment.status = 'paid' → order.status = 'completed'
    - Option B: Customer asks for bill; cashier prints; settles via POS

[11] Post-order
    - Feedback prompt: rate 1-5, optional comment
    - Loyalty points credited (if phone linked)
    - Table status → 'cleaning' → 'available' after staff tap
    - Invoice emailed/WhatsApped if customer opted in
```

### Sequence diagram (compact)

```
Customer       Next.js SSR     Express API     Postgres       Socket.IO       KDS / Admin
   │               │               │              │              │                │
   │ scan QR       │               │              │              │                │
   ├──────────────►│               │              │              │                │
   │               │ resolve+menu  │              │              │                │
   │               ├──────────────►│              │              │                │
   │               │               ├─ SELECT ─────►              │                │
   │               │◄──────────────┤◄─────────────┤              │                │
   │◄──────────────┤ HTML+state    │              │              │                │
   │               │               │              │              │                │
   │ POST /orders  │               │              │              │                │
   ├───────────────────────────────►              │              │                │
   │               │               ├─ TX insert ──►              │                │
   │               │               │◄─────────────┤              │                │
   │               │               ├─ emit ──────────────────────►                │
   │               │               │              │              ├── order:placed ►│
   │◄──────────────────────────────┤ { orderId }  │              │                │
   │               │               │              │              │                │
   │  WS connect   │               │              │              │                │
   ├──────────────────────────────────────────────────────────────►                │
   │  joins order:<id>             │              │              │                │
   │               │               │              │              │                │
   │               │               │  KDS marks   │              │ ◄──────────────┤
   │               │               │  item ready  │              │                │
   │               │               │◄─────────────────────────────────────────────┤
   │               │               ├─ UPDATE ─────►              │                │
   │               │               ├─ emit ──────────────────────►                │
   │◄──────────────────────────────────────────── order:status_changed ───────────┤
```

---

## 11. UI / Screen Wireframes

ASCII wireframes — fidelity is "shape and hierarchy", not pixel-perfect.

### Customer QR — Menu screen (mobile)

```
┌─────────────────────────────────────┐
│ ☰   🍴 Mango Tree            🌙 EN  │  ← branding, theme, language
│     Table T03 · Welcome!            │
├─────────────────────────────────────┤
│  🔍  Search dishes...              │
├─────────────────────────────────────┤
│  [All] [Starters] [Main] [Drinks] >│  ← horizontal scroll chips
├─────────────────────────────────────┤
│  ⭐ Bestsellers                     │
│  ┌──────────┐  ┌──────────┐         │
│  │ [image]  │  │ [image]  │         │
│  │ Paneer.. │  │ Butter.. │         │
│  │ 🟢 ₹240  │  │ 🟢 ₹320  │         │
│  │ ⏱ 12 m   │  │ ⏱ 15 m   │         │
│  │  + Add   │  │  + Add   │         │
│  └──────────┘  └──────────┘         │
│                                     │
│  Starters                           │
│  ┌─────────────────────────────────┐│
│  │ 🟢  Veg Spring Rolls       ₹180 ││
│  │     Crispy rolls with...   + Add││
│  └─────────────────────────────────┘│
│  ┌─────────────────────────────────┐│
│  │ 🔴  Chicken Tikka     🌶🌶 ₹280 ││
│  │     Char-grilled marin..  + Add ││
│  └─────────────────────────────────┘│
├─────────────────────────────────────┤
│  🛒 Cart (3)  ·  ₹740   →  View    │  ← sticky cart bar
└─────────────────────────────────────┘
```

### Customer — Order tracking

```
┌─────────────────────────────────────┐
│ ←   Order #042                      │
│     Table T03 · Placed 4 min ago    │
├─────────────────────────────────────┤
│                                     │
│   ✅ Placed                          │
│      │                              │
│   ✅ Accepted                        │
│      │                              │
│   🔵 Preparing      ⏱ ~8 min         │
│      │                              │
│   ⚪ Ready                           │
│      │                              │
│   ⚪ Served                          │
│                                     │
├─────────────────────────────────────┤
│  Your order                         │
│  2× Paneer Tikka          ₹480      │
│  1× Butter Naan           ₹60       │
│  1× Mango Lassi           ₹120      │
│                                     │
│  Subtotal                  ₹660     │
│  GST (5%)                  ₹33      │
│  Total                    ₹693      │
│                                     │
│  [ + Add more items ]               │
│  [ 🔔 Call waiter ]                  │
│  [ 💳 Pay now ]                      │
└─────────────────────────────────────┘
```

---

## 12. Admin Dashboard Design

### Overall layout (desktop)

```
┌────────────────────────────────────────────────────────────────────────────┐
│ 🍴 Qrder    Mango Tree ▾  · Branch: Indiranagar ▾        🔔  👤 Aashish ▾  │
├──────────┬─────────────────────────────────────────────────────────────────┤
│          │                                                                 │
│ 🏠 Over   │   Today's overview                          [↻ Live]            │
│ 📋 Orders │   ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐               │
│ 🍴 Menu   │   │ Sales   │ │ Orders  │ │ Avg     │ │ Tables  │               │
│ 🪑 Tables │   │ ₹48,320 │ │   137   │ │ Ticket  │ │  18/24  │               │
│ 👥 Staff  │   │  +12% ↑ │ │  +8% ↑  │ │  ₹352   │ │ Occupied│               │
│ 🧑 Cust.  │   └─────────┘ └─────────┘ └─────────┘ └─────────┘               │
│ 📦 Inven. │                                                                 │
│ 📊 Analyt.│   Revenue (7d)         ┌─────────────────────────┐              │
│ 🏪 Branch │   ┌──────────────┐     │ Live orders             │              │
│ ⚙ Settings│   │   ╱╲    ╱╲   │     │ • #042 T03  Preparing 🔵│              │
│           │   │ ╱   ╲  ╱  ╲  │     │ • #041 T07  Ready    ✅ │              │
│           │   │╱     ╲╱    ╲ │     │ • #040 T11  Placed   ⏳ │              │
│           │   │              │     │ • #039 T02  Served   👤 │              │
│           │   └──────────────┘     └─────────────────────────┘              │
│           │                                                                 │
│           │   Popular dishes (today)      Peak hours                        │
│           │   1. Paneer Tikka     42      ▁▁▂▃▅█▇▆▄▂▁                       │
│           │   2. Butter Chicken   37      12 1 2 3 4 5 6 7 8 9 10           │
│           │   3. Mango Lassi      29                                        │
└──────────┴─────────────────────────────────────────────────────────────────┘
```

### Orders page

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Orders                                                                      │
│                                                                             │
│ [All] [Active] [Completed]  Table: All ▾  Date: Today ▾  Staff: All ▾  +New │
├─────────────────────────────────────────────────────────────────────────────┤
│ #     Table  Items  Status        Total    Placed       Server   Actions   │
│ ─────────────────────────────────────────────────────────────────────────── │
│ #042  T03    4      🔵 Preparing   ₹693    4 min ago    Riya     [View]    │
│ #041  T07    2      ✅ Ready       ₹420    8 min ago    Riya     [Serve]   │
│ #040  T11    6      ⏳ Placed      ₹1,240  9 min ago    —         [Accept]  │
│ #039  T02    3      👤 Served      ₹580    18 min ago   Karan    [Pay]     │
│ #038  T05    5      💳 Paid        ₹2,140  32 min ago   Karan    [Print]   │
│ ...                                                                         │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Menu editor

Split view: category tree on left, item grid on right, edit drawer slides in from the right when an item is tapped. Drag-to-reorder. Live preview on customer mockup.

---

## 13. Kitchen Dashboard Design (KDS)

Tablet-optimized, landscape, dark theme (kitchen lighting), fat tap targets.

```
┌────────────────────────────────────────────────────────────────────────────┐
│ 🍴 KDS  ·  Indiranagar  ·  Station: All ▾    🔊        ⏱ 14:32   8 active  │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│ ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│ │ #042  T03    │  │ #041  T07    │  │ #040  T11    │  │ #039  T02    │    │
│ │ 4 min ⏱      │  │ 8 min ⏱ ⚠   │  │ 1 min ⏱      │  │ 12 min ⏱ 🔴 │    │
│ ├──────────────┤  ├──────────────┤  ├──────────────┤  ├──────────────┤    │
│ │ 2× Paneer    │  │ 1× Chicken   │  │ 3× Veg Roll  │  │ 1× Biryani   │    │
│ │   Tikka  🟢  │  │   Tikka  🔵  │  │   ⏳         │  │   ⏳         │    │
│ │ 1× Butter    │  │ 2× Naan  🟢  │  │ 1× Soup      │  │ 2× Naan      │    │
│ │   Naan   🔵  │  │              │  │   ⏳         │  │   ⏳         │    │
│ │ 1× Lassi 🍹  │  │              │  │ 1× Mocktail  │  │ 1× Kheer     │    │
│ │              │  │              │  │   🍹         │  │   🍰         │    │
│ │ "No onions"  │  │              │  │              │  │              │    │
│ ├──────────────┤  ├──────────────┤  ├──────────────┤  ├──────────────┤    │
│ │ [Accept All] │  │ [Mark Ready] │  │ [Accept All] │  │ [Delay 5min] │    │
│ └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘    │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

**Behaviors:**
- New order: card slides in from right + bell sound + brief vibrate (PWA).
- Cards age: green border < 5 min, amber 5–10, red > 10 min.
- Single tap on an item toggles its status (pending → preparing → ready).
- "Mark Ready" on the whole card transitions all items.
- Per-station filter at top — Grill, Tandoor, Bar, Dessert.
- History tab: today's completed orders for review.

---

## 14. Customer QR App Design

Key UX rules:

1. **Zero loading state at first paint.** SSR streams the menu HTML before JS arrives.
2. **No registration required.** Phone link is optional, post-order.
3. **Cart never blocks browsing.** Sticky bar at bottom; full cart in a drawer.
4. **Estimated prep time visible upfront.** Sets expectations.
5. **Live status without polling.** Socket.IO + 10 s safety-net poll.
6. **Dark mode auto.** Detect `prefers-color-scheme`.
7. **Multi-language.** Hindi, English, regional pack per branch; menu items have translation map in `menu_items.translations` JSONB (add column when ready).

---

## 15. Deployment Architecture (Pilot)

**Goal: cheap, simple, "demo-ready" for the first 5 branches.**

```
┌───────────────────────────────────────────────────────────────┐
│                         Cloudflare                            │
│           DNS, CDN, TLS, basic DDoS, image proxy              │
└──────────────────────────┬────────────────────────────────────┘
                           │
       ┌───────────────────┼───────────────────────┐
       │                   │                       │
   ┌───▼──────┐      ┌─────▼──────┐         ┌──────▼───────┐
   │ Vercel   │      │ Render or  │         │  Neon         │
   │ - apps/  │      │ Railway    │         │  PostgreSQL   │
   │   customer       │ apps/api   │         │  (branches    │
   │ - apps/  │ ─────► (Express + │ ───────►│   per PR)     │
   │   admin  │      │  Socket.IO)│         └───────────────┘
   │ - apps/  │      │            │         ┌───────────────┐
   │   kitchen│      │ Workers in │         │ Cloudinary    │
   │ - apps/  │      │ same proc  │         │ (images)      │
   │   pos    │      │            │         └───────────────┘
   └──────────┘      │            │         ┌───────────────┐
                     │            │ ───────►│ Upstash Redis │
                     └────────────┘         │ (cache + jobs)│
                                            └───────────────┘
```

**Why this shape:**
- **Vercel for Next.js apps** — zero-config SSR, automatic edge caching, preview deploys per PR.
- **Render/Railway for Express + Socket.IO** — Vercel's serverless functions don't suit long-lived WebSocket connections. A single $7/month dyno is enough for the pilot.
- **Neon for Postgres** — branching DBs make PR previews trivial; serverless pricing is forgiving at pilot scale.
- **Upstash Redis** — pay-per-request, fine for cache + BullMQ at this scale.
- **Cloudinary** — already specced; signed uploads from admin.

**Environments:**
- `local` — Docker Compose (postgres + redis), apps via `pnpm dev`.
- `preview` — every PR gets a Vercel preview + Neon branch.
- `staging` — main branch auto-deploys.
- `production` — tagged releases, manual promote.

**CI/CD (GitHub Actions):**
- `ci.yml`: pnpm install → typecheck → lint → unit tests → e2e against ephemeral Postgres.
- `deploy-api.yml`: on push to main, build + push Docker image, deploy to Render.
- Vercel handles frontend deploys natively.

---

## 16. Scale-Up Path → Enterprise

When you outgrow the pilot, the migration path is:

| Trigger | Change |
|---|---|
| > 1 API process | Add Socket.IO Redis Streams adapter (env var flip — no code change). |
| > 10k orders/day | Move workers (BullMQ) into a separate container/process. |
| > 50 tenants | Add per-tenant API read replicas (Neon read replicas), set up tenant cache keyed in Redis. |
| > 500 tenants | Split into actual microservices: `auth-svc`, `order-svc`, `menu-svc`, `payment-svc`, `kitchen-svc`. Communication via Redis Streams + sync HTTP. |
| > 100k orders/day | Move analytics to a separate OLAP store (ClickHouse / BigQuery), CDC from Postgres. |
| Multi-region | Tenant-affinity routing (geographic), per-region DBs, cross-region replication for platform tables. |
| Compliance (PCI, SOC 2) | Vault for secrets, audit_logs to immutable WORM storage, encryption at rest already covered by Neon. |

**Architectural commitments that buy us this future:**
- `tenant_id` on every row from day one.
- All cross-module calls go through module service layers — feature code never imports another module's `db` queries directly. Easy to extract into network calls later.
- Event payloads defined in `packages/shared/events.ts` so a future message bus can adopt them verbatim.
- API versioned (`/v1`) so we can break contracts without breaking customers.

---

## 17. Development Roadmap

### Phase 0 — Foundation (Week 1)

- Bootstrap Turborepo with pnpm workspaces.
- Set up `packages/db` with Drizzle, initial schema (tenants, branches, staff, tables).
- Set up `apps/api` Express skeleton, tenant middleware, JWT auth.
- Set up `apps/admin` Next.js shell with login.
- Docker Compose for local Postgres + Redis.
- CI: typecheck + lint passing.

### Phase 1 — MVP customer ordering (Weeks 2–3)

- Menu schema + categories + items + modifiers.
- Admin: CRUD menu, CRUD tables, generate QR.
- Customer QR app: scan → menu → cart → place order.
- Kitchen dashboard: live incoming orders, mark statuses.
- Socket.IO realtime for order:placed and status changes.
- **Milestone: demo-able to a single restaurant.**

### Phase 2 — Operations (Weeks 4–5)

- Waiter / POS app (basic).
- Manual order creation, table assign, KOT print.
- Bill generation, GST calculation.
- Payments: Razorpay UPI/card + cash recording.
- Customer order tracking page polished.

### Phase 3 — Multi-branch + Staff (Week 6)

- Branches CRUD.
- Staff RBAC fully wired.
- Branch switcher in admin.
- Audit log basics.

### Phase 4 — Analytics + polish (Weeks 7–8)

- Dashboard overview with sales, peak hours, popular dishes.
- Export PDF/CSV.
- Inventory basics (manual stock).
- Customer loyalty (phone OTP, points).
- Feedback collection.

### Phase 5 — Advanced (Weeks 9–12, prioritize)

- Multi-language menu.
- Happy hour / dynamic pricing.
- Smart waiter calling.
- Push notifications.
- AI recommendations (item-level collaborative filter, then chef-curated overrides).
- WhatsApp invoice.
- Offline mode for POS/KDS.

### Phase 6 — SaaS readiness (Weeks 13+)

- Subscription billing.
- Tenant onboarding flow + admin platform panel.
- Per-tenant settings, branding.
- Trial flow.
- Public marketing site.

---

## 18. Open Library Decisions (Non-architectural)

These don't change the blueprint and can be decided when we start the relevant module. Recommendations included; we'll batch-confirm before scaffolding.

| Decision | Recommended | Alt | Notes |
|---|---|---|---|
| UI primitives | **shadcn/ui** (copy-into-repo Radix + Tailwind components) | Mantine, MUI | shadcn/ui pairs perfectly with Next 15 + Tailwind, fully customizable, no runtime overhead. |
| Form lib | **React Hook Form + Zod** | Formik | RHF is faster, Zod shares schemas with backend. |
| Validation (shared) | **Zod** | Yup, Valibot | Use same Zod schemas in `packages/shared/dto/` for API request validation and frontend forms. |
| Payment gateway (IN) | **Razorpay** | Stripe (intl) | UPI native, dominant in India. Stripe for international expansion. |
| Job queue | **BullMQ** | pg-boss, Inngest | BullMQ + Upstash Redis is simple at pilot scale. |
| Email | **Resend** | SendGrid, Postmark | Best DX for transactional, generous free tier. |
| SMS / WhatsApp | **Twilio** for SMS, **Meta WhatsApp Cloud API** direct | Gupshup, Karix | Cheaper to integrate Meta directly for WhatsApp invoices. |
| PDF (invoices) | **@react-pdf/renderer** in a worker | Puppeteer, PDFKit | React component → PDF, easy theming. |
| Date/time | **date-fns** | dayjs, luxon | Tree-shakable, immutable, no timezone surprises for our use. |
| Logging | **pino** + **pino-pretty** | winston | Fastest Node logger, structured JSON, plays well with log shippers. |
| Tracing | **OpenTelemetry SDK** → Grafana Tempo or Honeycomb | Sentry tracing | Vendor-neutral, deferrable to Phase 3+. |
| Error tracking | **Sentry** | Bugsnag | Best DX, generous free tier, source map support. |
| Unit tests | **Vitest** | Jest | Faster, Vite-native, drop-in Jest API. |
| E2E tests | **Playwright** | Cypress | Multi-browser, faster, better debugging. |
| API contract | **Zod schemas + ts-rest** (or **tRPC** for internal apps, **OpenAPI** for public) | tRPC end-to-end | Hybrid: tRPC for admin/kitchen/pos (internal, typed), REST+OpenAPI for customer (public, versioned). |
| Auth helper | **jose** for JWT (Node 22 native crypto) | jsonwebtoken | jose is modern, ESM-first, supports edge runtimes. |
| Password hashing | **argon2** | bcrypt | Memory-hard, modern recommendation. |
| QR generation | **qrcode** (Node) for PNG, browser-side for previews | — | Standard pick. |

---

## Appendix A — Glossary

- **KDS** — Kitchen Display System. Replaces paper KOTs (Kitchen Order Tickets).
- **KOT** — Kitchen Order Ticket. Historical paper slip the kitchen receives; in Qrder, it's a printable PDF and the live KDS card.
- **BOT / Bar Order Ticket** — same as KOT but routed to the bar station.
- **PWA** — Progressive Web App. Installable from browser, offline-capable.
- **RLS** — Row-Level Security. Postgres feature that filters rows per-session.
- **BFF** — Backend-for-Frontend. A thin API layer (here, Next.js route handlers) that aggregates calls.

---

*End of architecture blueprint v0.1.0. Next: scaffold Phase 0 — confirm Section 18 picks and we begin.*

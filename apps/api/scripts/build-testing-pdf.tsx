/* eslint-disable react/no-unescaped-entities */
import * as React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from '@react-pdf/renderer';
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
void React;

const here = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(here, '../../..');

const colors = {
  text: '#18181b',
  muted: '#71717a',
  border: '#e4e4e7',
  softBg: '#fafafa',
  brand: '#ea580c',
  brandSoft: '#fff7ed',
  good: '#16a34a',
  warn: '#d97706',
  bad: '#dc2626',
  blue: '#2563eb',
  blueSoft: '#eff6ff',
};

const styles = StyleSheet.create({
  page: {
    padding: 40,
    paddingTop: 50,
    paddingBottom: 50,
    fontSize: 10,
    fontFamily: 'Helvetica',
    color: colors.text,
    lineHeight: 1.45,
  },
  cover: {
    padding: 60,
    flexGrow: 1,
    justifyContent: 'center',
  },
  coverTitle: { fontSize: 32, fontFamily: 'Helvetica-Bold', marginBottom: 8 },
  coverSub: { fontSize: 14, color: colors.muted, marginBottom: 32 },
  coverMeta: { fontSize: 10, color: colors.muted, marginTop: 4 },
  h1: {
    fontSize: 20,
    fontFamily: 'Helvetica-Bold',
    marginTop: 4,
    marginBottom: 10,
    color: colors.brand,
  },
  h2: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    marginTop: 18,
    marginBottom: 6,
    paddingBottom: 3,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  h3: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    marginTop: 12,
    marginBottom: 4,
  },
  p: { marginBottom: 6 },
  muted: { color: colors.muted },
  code: {
    fontFamily: 'Courier',
    fontSize: 9,
    backgroundColor: colors.softBg,
    paddingVertical: 4,
    paddingHorizontal: 6,
    marginBottom: 8,
    borderRadius: 3,
    color: '#3f3f46',
  },
  inlineCode: {
    fontFamily: 'Courier',
    fontSize: 9,
    backgroundColor: colors.softBg,
    paddingHorizontal: 3,
  },
  // Tables
  table: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 3,
    marginBottom: 10,
    overflow: 'hidden',
  },
  trHead: {
    flexDirection: 'row',
    backgroundColor: colors.softBg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tr: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  trLast: {
    flexDirection: 'row',
  },
  th: { padding: 6, fontFamily: 'Helvetica-Bold', fontSize: 9 },
  td: { padding: 6, fontSize: 9 },
  // Pills
  pill: {
    fontSize: 8,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 10,
    marginRight: 4,
  },
  pillBrand: { backgroundColor: colors.brandSoft, color: colors.brand },
  pillBlue: { backgroundColor: colors.blueSoft, color: colors.blue },
  pillGood: { backgroundColor: '#dcfce7', color: colors.good },
  pillWarn: { backgroundColor: '#fef3c7', color: colors.warn },
  // Callouts
  callout: {
    flexDirection: 'row',
    padding: 8,
    borderRadius: 4,
    marginVertical: 6,
    borderLeftWidth: 3,
  },
  calloutInfo: { backgroundColor: colors.blueSoft, borderLeftColor: colors.blue },
  calloutWarn: { backgroundColor: '#fffbeb', borderLeftColor: colors.warn },
  calloutGood: { backgroundColor: '#f0fdf4', borderLeftColor: colors.good },
  calloutBody: { flex: 1, fontSize: 9 },
  // Steps
  step: { flexDirection: 'row', marginBottom: 4 },
  stepNum: { width: 18, fontFamily: 'Helvetica-Bold', color: colors.brand },
  // List
  li: { flexDirection: 'row', marginBottom: 3 },
  bullet: { width: 10 },
  liText: { flex: 1 },
  // Footer / header
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 40,
    right: 40,
    fontSize: 8,
    color: colors.muted,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  pageHeader: {
    position: 'absolute',
    top: 20,
    left: 40,
    right: 40,
    fontSize: 8,
    color: colors.muted,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
    paddingBottom: 4,
  },
});

// ============================================================
// Small helpers
// ============================================================

function PageHeader({ section }: { section: string }) {
  return (
    <View style={styles.pageHeader} fixed>
      <Text>Qrder · Testing Guide</Text>
      <Text>{section}</Text>
    </View>
  );
}

function Footer() {
  return (
    <View style={styles.footer} fixed>
      <Text>Generated for pilot testing — version 0.5 (Phases 1–5 complete)</Text>
      <Text
        render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
      />
    </View>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <Text style={styles.p}>{children}</Text>;
}

function Code({ children }: { children: string }) {
  return <Text style={styles.code}>{children}</Text>;
}

function InlineCode({ children }: { children: string }) {
  return <Text style={styles.inlineCode}>{children}</Text>;
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.li}>
      <Text style={styles.bullet}>•</Text>
      <Text style={styles.liText}>{children}</Text>
    </View>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <View style={styles.step}>
      <Text style={styles.stepNum}>{n}.</Text>
      <Text style={{ flex: 1 }}>{children}</Text>
    </View>
  );
}

function Callout({
  tone = 'info',
  children,
}: {
  tone?: 'info' | 'warn' | 'good';
  children: React.ReactNode;
}) {
  const calloutStyle =
    tone === 'warn' ? styles.calloutWarn : tone === 'good' ? styles.calloutGood : styles.calloutInfo;
  return (
    <View style={[styles.callout, calloutStyle]}>
      <Text style={styles.calloutBody}>{children}</Text>
    </View>
  );
}

interface Col {
  header: string;
  width: number;
}

function DataTable({
  cols,
  rows,
}: {
  cols: Col[];
  rows: Array<Array<string | React.ReactNode>>;
}) {
  return (
    <View style={styles.table}>
      <View style={styles.trHead}>
        {cols.map((c, i) => (
          <View key={i} style={{ width: `${c.width}%` }}>
            <Text style={styles.th}>{c.header}</Text>
          </View>
        ))}
      </View>
      {rows.map((row, ri) => (
        <View key={ri} style={ri === rows.length - 1 ? styles.trLast : styles.tr}>
          {row.map((cell, ci) => (
            <View key={ci} style={{ width: `${cols[ci]!.width}%` }}>
              <Text style={styles.td}>{cell}</Text>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

// ============================================================
// Sections
// ============================================================

function Cover() {
  return (
    <Page size="A4" style={styles.page}>
      <View style={styles.cover}>
        <Text style={styles.coverTitle}>Qrder</Text>
        <Text style={styles.coverSub}>Testing Guide — Pilot End-to-End</Text>
        <Text style={styles.coverMeta}>
          QR-first restaurant & bar management SaaS
        </Text>
        <Text style={styles.coverMeta}>
          5 frontend apps · Express + Socket.IO API · PostgreSQL (Neon)
        </Text>
        <Text style={styles.coverMeta}>Razorpay test mode · Optional Cloudinary</Text>
        <Text style={[styles.coverMeta, { marginTop: 24 }]}>
          Covers Phases 1–5: customer ordering, kitchen, POS, billing, payments,
          analytics, staff RBAC, audit logs, multi-language menu, happy-hour pricing,
          recommendations.
        </Text>
        <Text style={[styles.coverMeta, { marginTop: 24 }]}>
          Generated: {new Date().toISOString().slice(0, 10)}
        </Text>
      </View>
    </Page>
  );
}

function Toc() {
  const entries = [
    '1. System overview & topology',
    '2. Setup & prerequisites',
    '3. URLs and ports',
    '4. Seeded data & user accounts',
    '5. Role / permission matrix',
    '6. Customer app — pages & actions',
    '7. Admin app — pages & actions',
    '8. Kitchen app — pages & actions',
    '9. POS app — pages & actions',
    '10. API reference (by module)',
    '11. Realtime / Socket.IO events',
    '12. End-to-end test scenarios (1–17)',
    '13. Test data reset & cleanup',
    '14. Troubleshooting',
  ];
  return (
    <Page size="A4" style={styles.page}>
      <PageHeader section="Table of contents" />
      <Text style={styles.h1}>Table of Contents</Text>
      {entries.map((e, i) => (
        <Text key={i} style={{ marginBottom: 4 }}>
          {e}
        </Text>
      ))}
      <Callout tone="info">
        Where you see a {' '}
        <Text style={styles.inlineCode}>code snippet</Text>, it's an exact value you
        can paste into a browser, terminal, or API client.
      </Callout>
      <Footer />
    </Page>
  );
}

function S1Overview() {
  return (
    <Page size="A4" style={styles.page}>
      <PageHeader section="1. System overview" />
      <Text style={styles.h1}>1. System overview & topology</Text>

      <P>
        Qrder is a multi-tenant SaaS for restaurants, cafes, and bars built around
        a QR-code customer ordering flow. There are five user-facing apps and one
        API; all share a Postgres database (Neon) and broadcast realtime updates
        via Socket.IO.
      </P>

      <Text style={styles.h2}>Apps</Text>
      <DataTable
        cols={[
          { header: 'App', width: 18 },
          { header: 'Purpose', width: 50 },
          { header: 'Tech', width: 32 },
        ]}
        rows={[
          [
            'API',
            'REST + Socket.IO. Auth, tenancy, menu, orders, payments, analytics.',
            'Node 22, Express 4, Drizzle ORM, Socket.IO',
          ],
          [
            'Customer',
            'QR-scanned by diners. Menu → cart → place order → track → pay.',
            'Next.js 15 SSR, Tailwind 4',
          ],
          [
            'Admin',
            'Owner / manager control panel. Menu, tables, staff, analytics, audit.',
            'Next.js 15 CSR, Recharts',
          ],
          [
            'Kitchen',
            'KDS board for cooks. Tap to advance item state.',
            'Next.js 15 PWA',
          ],
          [
            'POS',
            'Waiter / cashier workstation. Floor view, order taking, billing, settlement.',
            'Next.js 15 tablet-first PWA',
          ],
        ]}
      />

      <Text style={styles.h2}>Data flow at a glance</Text>
      <Bullet>
        Diner scans the QR sticker → Customer app SSR-renders the menu (≤ 1.5 s
        first paint).
      </Bullet>
      <Bullet>
        Customer places order → API writes to Postgres in a transaction →
        Socket.IO broadcasts to kitchen + POS rooms.
      </Bullet>
      <Bullet>
        Kitchen marks items ready → API updates → POS sees "Ready to serve" live.
      </Bullet>
      <Bullet>
        Customer taps "Pay now" or cashier marks cash → status flips to
        completed, table moves to cleaning.
      </Bullet>
      <Bullet>
        Admin sees revenue, popular dishes, peak hours update in real time on
        the overview page.
      </Bullet>

      <Text style={styles.h2}>Multi-tenancy</Text>
      <P>
        Every business row carries a {' '}
        <Text style={styles.inlineCode}>tenant_id</Text> and every operator query
        is scoped by the JWT's tenant. Customer requests are scoped by a signed
        QR token. The pilot deploys as one tenant ({'"'}Mango Tree{'"'}) but the
        schema is multi-tenant from day one.
      </P>

      <Footer />
    </Page>
  );
}

function S2Setup() {
  return (
    <Page size="A4" style={styles.page}>
      <PageHeader section="2. Setup" />
      <Text style={styles.h1}>2. Setup & prerequisites</Text>

      <Text style={styles.h2}>Prerequisites</Text>
      <Bullet>Node.js 22 (or newer) installed</Bullet>
      <Bullet>
        pnpm 9.15+ (install via {' '}
        <Text style={styles.inlineCode}>npm install -g pnpm</Text>)
      </Bullet>
      <Bullet>
        A Postgres connection string. Neon is set up — see {' '}
        <Text style={styles.inlineCode}>.env</Text> (gitignored).
      </Bullet>

      <Text style={styles.h2}>Environment variables</Text>
      <P>
        All env values live in <Text style={styles.inlineCode}>.env</Text> at the
        repo root. The required keys:
      </P>
      <Code>
        {`NODE_ENV=development
PORT=4000

DATABASE_URL=postgresql://...neon.tech/neondb?sslmode=require

REDIS_URL=redis://localhost:6379       # optional

JWT_SECRET=<48+ random chars>
JWT_ACCESS_EXPIRES_IN=8h
JWT_REFRESH_EXPIRES_IN=8h
QR_TOKEN_SECRET=<48+ random chars>

ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001,http://localhost:3002,http://localhost:3003

# Cloudinary (optional — disables direct uploads if blank)
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# Razorpay (test mode keys already populated)
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=...
RAZORPAY_WEBHOOK_SECRET=test_razorpay

NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_WS_URL=http://localhost:4000`}
      </Code>

      <Text style={styles.h2}>First-time setup</Text>
      <Step n={1}>
        <Text>
          <Text style={styles.inlineCode}>pnpm install</Text> — installs all
          workspace dependencies.
        </Text>
      </Step>
      <Step n={2}>
        <Text>
          <Text style={styles.inlineCode}>pnpm --filter @qrder/db db:migrate</Text>{' '}
          — applies all pending migrations to Neon (idempotent).
        </Text>
      </Step>
      <Step n={3}>
        <Text>
          <Text style={styles.inlineCode}>pnpm --filter @qrder/db db:seed</Text>{' '}
          — seeds tenant {'"'}Mango Tree{'"'}, branch Indiranagar, 12 tables,
          4 kitchen stations, and the owner staff account.
        </Text>
      </Step>

      <Text style={styles.h2}>Starting all 5 apps</Text>
      <Code>pnpm dev</Code>
      <P>
        Turborepo runs all apps in parallel. After ~5 seconds:
      </P>
      <Bullet>API on :4000</Bullet>
      <Bullet>Customer on :3000</Bullet>
      <Bullet>Admin on :3001</Bullet>
      <Bullet>Kitchen on :3002</Bullet>
      <Bullet>POS on :3003</Bullet>

      <Callout tone="info">
        For the QR PNG download (Admin → Tables → QR PNG) to embed the correct
        domain in the QR code, set {' '}
        <Text style={styles.inlineCode}>CUSTOMER_APP_URL=http://localhost:3000</Text>{' '}
        in the API's env if the default doesn't match.
      </Callout>

      <Footer />
    </Page>
  );
}

function S3Urls() {
  return (
    <Page size="A4" style={styles.page}>
      <PageHeader section="3. URLs and ports" />
      <Text style={styles.h1}>3. URLs and ports</Text>

      <DataTable
        cols={[
          { header: 'Service', width: 18 },
          { header: 'Local URL', width: 32 },
          { header: 'Purpose', width: 50 },
        ]}
        rows={[
          ['API', 'http://localhost:4000', 'REST + Socket.IO + webhooks'],
          ['Health check', 'http://localhost:4000/health', 'Liveness probe'],
          ['DB health', 'http://localhost:4000/health/db', 'DB connectivity check'],
          ['Customer', 'http://localhost:3000', 'Marketing landing'],
          [
            'Customer (QR)',
            'http://localhost:3000/q/<token>',
            'Menu + cart + tracking',
          ],
          [
            'Admin login',
            'http://localhost:3001/login',
            'Owner / manager control panel',
          ],
          ['Kitchen login', 'http://localhost:3002/login', 'KDS board sign-in'],
          ['POS login', 'http://localhost:3003/login', 'Waiter / cashier sign-in'],
        ]}
      />

      <Text style={styles.h2}>Notes</Text>
      <Bullet>
        QR tokens come from Admin → Tables → {' '}
        <Text style={styles.inlineCode}>Rotate</Text> or the QR PNG download.
      </Bullet>
      <Bullet>
        All operator apps share the same auth cookie domain (localhost), so the
        refresh-token cookie issued from any of them is honored by all.
      </Bullet>
      <Bullet>
        Each operator app stores its access token in its own localStorage key:{' '}
        <Text style={styles.inlineCode}>qrder-auth</Text> (admin),{' '}
        <Text style={styles.inlineCode}>qrder-kds-auth</Text> (kitchen),{' '}
        <Text style={styles.inlineCode}>qrder-pos-auth</Text> (POS).
      </Bullet>

      <Footer />
    </Page>
  );
}

function S4Users() {
  return (
    <Page size="A4" style={styles.page}>
      <PageHeader section="4. Seeded data & user accounts" />
      <Text style={styles.h1}>4. Seeded data & user accounts</Text>

      <Text style={styles.h2}>The seed script creates</Text>
      <Bullet>1 tenant: {'"'}Mango Tree{'"'}</Bullet>
      <Bullet>1 branch: Indiranagar (Bengaluru)</Bullet>
      <Bullet>4 kitchen stations: Tandoor, Grill, Bar, Dessert</Bullet>
      <Bullet>12 tables: T01–T12</Bullet>
      <Bullet>1 super_admin staff (see below)</Bullet>

      <Text style={styles.h2}>Default super-admin login</Text>
      <DataTable
        cols={[
          { header: 'Field', width: 25 },
          { header: 'Value', width: 75 },
        ]}
        rows={[
          ['Email', 'owner@mango.test'],
          ['Password', 'Owner@123'],
          ['Role', 'super_admin (all permissions)'],
          ['Branch assignment', 'All branches (branchId = null)'],
        ]}
      />

      <Callout tone="warn">
        Change this password before any production use. Create new staff with
        scoped roles via Admin → Staff for daily operations.
      </Callout>

      <Text style={styles.h2}>Creating test accounts for other roles</Text>
      <P>
        Sign into Admin → Staff → <Text style={styles.inlineCode}>+ New staff</Text>.
        Recommended test set:
      </P>

      <DataTable
        cols={[
          { header: 'Role', width: 16 },
          { header: 'Test email', width: 32 },
          { header: 'Password', width: 18 },
          { header: 'Use for', width: 34 },
        ]}
        rows={[
          ['manager', 'manager@mango.test', 'Manager@1', 'Admin login (no super-admin actions)'],
          ['cashier', 'cashier@mango.test', 'Cashier@1', 'POS settle / refund'],
          ['waiter', 'waiter@mango.test', 'Waiter@1', 'POS floor / table workspace'],
          ['kitchen', 'cook@mango.test', 'Cook@1', 'Kitchen Display System'],
          ['bar', 'bar@mango.test', 'Bar@1', 'KDS filtered to bar station'],
        ]}
      />

      <Footer />
    </Page>
  );
}

function S5Roles() {
  return (
    <Page size="A4" style={styles.page}>
      <PageHeader section="5. Roles & permissions" />
      <Text style={styles.h1}>5. Role / permission matrix</Text>

      <P>
        Every route is gated by Express middleware (
        <Text style={styles.inlineCode}>requirePerm(...)</Text>) that checks the
        JWT's permission scopes. The roles you can assign in Admin → Staff map
        to these scopes:
      </P>

      <DataTable
        cols={[
          { header: 'Permission', width: 22 },
          { header: 'super_admin', width: 13 },
          { header: 'manager', width: 13 },
          { header: 'cashier', width: 13 },
          { header: 'waiter', width: 13 },
          { header: 'kitchen', width: 13 },
          { header: 'bar', width: 13 },
        ]}
        rows={[
          ['menu:read', '✓', '✓', '✓', '✓', '✓', '✓'],
          ['menu:write', '✓', '✓', '—', '—', '—', '—'],
          ['orders:read', '✓', '✓', '✓', '✓', '✓', '✓'],
          ['orders:write', '✓', '✓', '✓', '✓', '—', '—'],
          ['orders:status', '✓', '✓', '✓', '✓', '✓', '✓'],
          ['payments:read', '✓', '✓', '✓', '—', '—', '—'],
          ['payments:write', '✓', '✓', '✓', '—', '—', '—'],
          ['tables:read', '✓', '✓', '✓', '✓', '—', '—'],
          ['tables:write', '✓', '✓', '—', '✓', '—', '—'],
          ['staff:write', '✓', '✓ (non-admin)', '—', '—', '—', '—'],
          ['settings:write', '✓', '✓', '—', '—', '—', '—'],
          ['analytics:read', '✓', '✓', '—', '—', '—', '—'],
          ['kitchen:operate', '✓', '—', '—', '—', '✓', '✓'],
        ]}
      />

      <Text style={styles.h2}>What each app gates on</Text>
      <Bullet>
        <Text>
          <Text style={styles.inlineCode}>Admin</Text> — opens for any role with
          a valid JWT but pages without permission return 403 from the API. Test
          with each role: log in, click through every sidebar item.
        </Text>
      </Bullet>
      <Bullet>
        <Text>
          <Text style={styles.inlineCode}>Kitchen</Text> — login requires the
          account to have <Text style={styles.inlineCode}>kitchen:operate</Text>.
        </Text>
      </Bullet>
      <Bullet>
        <Text>
          <Text style={styles.inlineCode}>POS</Text> — needs{' '}
          <Text style={styles.inlineCode}>orders:write</Text> for table workspace
          and <Text style={styles.inlineCode}>payments:write</Text> for the
          Settle flow.
        </Text>
      </Bullet>

      <Footer />
    </Page>
  );
}

// ============================================================
// Per-app pages
// ============================================================

function S6Customer() {
  return (
    <Page size="A4" style={styles.page}>
      <PageHeader section="6. Customer app" />
      <Text style={styles.h1}>6. Customer app (http://localhost:3000)</Text>

      <DataTable
        cols={[
          { header: 'Route', width: 30 },
          { header: 'What it does', width: 70 },
        ]}
        rows={[
          ['/', 'Landing / fallback. Shown when no QR token is given.'],
          [
            '/q/[token]',
            'Menu screen. SSR. Branding header + category chips + item cards. Shows trending strip and customizable badge on items with modifier groups.',
          ],
          [
            '/q/[token]/cart',
            'Review cart with per-line cooking notes. Modifies quantity, removes lines, places order.',
          ],
          [
            '/q/[token]/order/[id]',
            'Live order tracking. Shows status timeline (Placed → Accepted → Preparing → Ready → Served). Pay-now button (Razorpay), Call waiter, Request bill, post-served feedback prompt.',
          ],
        ]}
      />

      <Text style={styles.h2}>Customer flow actions</Text>
      <Bullet>Tap a category chip — filters items.</Bullet>
      <Bullet>
        Tap <Text style={styles.inlineCode}>+ Add</Text> on a no-options item —
        adds directly to cart.
      </Bullet>
      <Bullet>
        Tap <Text style={styles.inlineCode}>Customize</Text> on an item with
        modifier groups — opens picker (single / multiple based on group type),
        shows live price preview.
      </Bullet>
      <Bullet>
        Tap the Languages icon in the header — switches to{' '}
        <Text style={styles.inlineCode}>?locale=hi</Text> etc. Re-fetches the
        menu with localized names/descriptions.
      </Bullet>
      <Bullet>
        Tap sticky cart bar → cart drawer. Add cooking notes per line. Submit
        order — server re-prices authoritatively (you'll see happy-hour discounts
        applied here).
      </Bullet>
      <Bullet>
        On the tracking page: tap <Text style={styles.inlineCode}>Call waiter</Text>{' '}
        or <Text style={styles.inlineCode}>Request bill</Text> — both create a
        persisted service request (POS sees it).
      </Bullet>
      <Bullet>
        Tap <Text style={styles.inlineCode}>💳 Pay now</Text> — opens Razorpay
        Checkout. Use any test card from{' '}
        <Text style={styles.inlineCode}>razorpay.com/docs/payments/test-mode/</Text>
        . Status flips to completed on success.
      </Bullet>
      <Bullet>
        After status becomes served, the feedback form appears. Rate 1-5 + optional
        comment.
      </Bullet>

      <Footer />
    </Page>
  );
}

function S7Admin() {
  return (
    <Page size="A4" style={styles.page}>
      <PageHeader section="7. Admin app" />
      <Text style={styles.h1}>7. Admin app (http://localhost:3001)</Text>

      <DataTable
        cols={[
          { header: 'Route', width: 24 },
          { header: 'What it does', width: 76 },
        ]}
        rows={[
          ['/login', 'Email + password sign-in. 8h JWT issued on success.'],
          ['/overview', 'Today / 7-day sales, completed orders, avg ticket, tables occupied. Top sellers + status counts. Auto-refresh 60s.'],
          ['/orders', 'Live orders table with realtime Socket.IO. Filter active-only. Accept / Mark served / Complete shortcuts inline.'],
          ['/menu', 'Categories chips + items table. CRUD via dialogs. Toggle availability inline. Item dialog supports modifier-group attach + signed Cloudinary upload (falls back to base64 when no creds).'],
          ['/menu/modifiers', 'Modifier groups CRUD: create group with single/multiple selection + min/max. Add options with price deltas and isDefault toggle.'],
          ['/tables', 'Branch-scoped table grid with status pills. Create / edit / delete. Rotate QR token. Download per-table QR PNG. Bulk QR sheet PDF.'],
          ['/staff', 'Staff CRUD with role + branch assignment. Initial password on create. Reset-password dialog. Self-deletion blocked.'],
          ['/customers', 'Searchable customer list. Loyalty points + visit count + total spend. Click row → drawer with order history + feedback.'],
          ['/inventory', 'Branch-scoped inventory items with reorder-level warning. Adjust (purchase / consumption / wastage / manual) with reason-driven sign. Movement history drawer.'],
          ['/analytics', 'Charts: revenue line, top-sellers bar, peak-hours bar, payment-methods list. Range chips (Today / 7d / 30d / 90d). CSV export.'],
          ['/branches', 'Branch CRUD. Active card highlights. Sets active branch for tables/inventory/POS.'],
          ['/feedback', 'Avg rating (30d) + 1–5 star distribution + reverse-chrono feed of ratings & comments.'],
          ['/audit-log', 'Append-only log of sensitive mutations: staff, branches, discounts, refunds, pricing rules. Joined with actor staff name + IP.'],
          ['/settings', 'Account info, tenant id. Full settings panel comes in Phase 3+ polish.'],
        ]}
      />

      <Footer />
    </Page>
  );
}

function S8Kitchen() {
  return (
    <Page size="A4" style={styles.page}>
      <PageHeader section="8. Kitchen app" />
      <Text style={styles.h1}>8. Kitchen app (http://localhost:3002)</Text>

      <DataTable
        cols={[
          { header: 'Route', width: 22 },
          { header: 'What it does', width: 78 },
        ]}
        rows={[
          ['/login', 'Sign-in for kitchen or bar staff. Requires kitchen:operate permission.'],
          ['/', 'KDS grid. One card per active order. Tap an item to cycle status: pending → preparing → ready → served. Cards age: green (< 5 min) → amber (5–10) → red (> 10).'],
        ]}
      />

      <Text style={styles.h2}>Behaviors</Text>
      <Bullet>
        New order placed in customer / POS → KDS card slides in within ~500 ms
        (Socket.IO).
      </Bullet>
      <Bullet>
        Tapping the last item to <Text style={styles.inlineCode}>ready</Text>{' '}
        auto-cascades the order status to <Text style={styles.inlineCode}>ready</Text>.
      </Bullet>
      <Bullet>
        Cooking notes from the diner are shown italic under the item name.
      </Bullet>
      <Bullet>
        15s polling backup in case the Socket connection drops.
      </Bullet>

      <Footer />
    </Page>
  );
}

function S9Pos() {
  return (
    <Page size="A4" style={styles.page}>
      <PageHeader section="9. POS app" />
      <Text style={styles.h1}>9. POS app (http://localhost:3003)</Text>

      <DataTable
        cols={[
          { header: 'Route', width: 24 },
          { header: 'What it does', width: 76 },
        ]}
        rows={[
          ['/login', 'Waiter / cashier sign-in. 8h JWT.'],
          [
            '/',
            'Floor view: live table grid with status colors (available / occupied / reserved / cleaning) + active order badge + active waiter-call pulse. Branch switcher in header.',
          ],
          [
            '/table/[id]',
            'Per-table workspace. Shows current order with items + totals. Five actions: Bill (PDF), Settle (cash/UPI/card/wallet), Discount (flat or coupon), Transfer (free-table picker), Split (evenly or by-item).',
          ],
        ]}
      />

      <Text style={styles.h2}>Key actions</Text>
      <Bullet>
        <Text style={styles.inlineCode}>Start order</Text> — opens menu drawer
        with category chips, search, modifier picker for customizable items.
      </Bullet>
      <Bullet>
        <Text style={styles.inlineCode}>Add items</Text> — same drawer; new items
        join the existing order.
      </Bullet>
      <Bullet>
        <Text style={styles.inlineCode}>Bill</Text> — opens the invoice PDF
        in a new tab.
      </Bullet>
      <Bullet>
        <Text style={styles.inlineCode}>Settle</Text> — record cash / card / UPI
        / wallet payment. Auto-completes the order when paid amount ≥ total.
      </Bullet>
      <Bullet>
        <Text style={styles.inlineCode}>Discount</Text> — apply flat ₹ amount
        with reason OR enter a coupon code.
      </Bullet>
      <Bullet>
        <Text style={styles.inlineCode}>Transfer</Text> — choose a free table to
        move the order to. Old table freed if no other active orders.
      </Bullet>
      <Bullet>
        <Text style={styles.inlineCode}>Split</Text> — evenly into N shares, or
        cycle each item through bill indices for per-item split.
      </Bullet>
      <Bullet>
        After completion, the table moves to{' '}
        <Text style={styles.inlineCode}>cleaning</Text>. Use{' '}
        <Text style={styles.inlineCode}>Mark available</Text> to free it.
      </Bullet>

      <Footer />
    </Page>
  );
}

// ============================================================
// API reference
// ============================================================

function S10Api() {
  return (
    <Page size="A4" style={styles.page}>
      <PageHeader section="10. API reference" />
      <Text style={styles.h1}>10. API reference</Text>

      <P>
        Base URL: <Text style={styles.inlineCode}>http://localhost:4000</Text>.
        All operator routes need {' '}
        <Text style={styles.inlineCode}>Authorization: Bearer &lt;jwt&gt;</Text>.
        Customer routes are under <Text style={styles.inlineCode}>/q/:token</Text>{' '}
        and use the signed QR token only (no JWT).
      </P>

      <Text style={styles.h2}>Auth (no auth required for login/refresh)</Text>
      <Code>
        {`POST   /v1/auth/login                  body: { email, password }
POST   /v1/auth/refresh                cookie: qrder_refresh
POST   /v1/auth/logout
GET    /v1/auth/me                     requires JWT`}
      </Code>

      <Text style={styles.h2}>Menu</Text>
      <Code>
        {`GET    /v1/menu/categories
POST   /v1/menu/categories             body: { name, slug, displayOrder?, isActive? }
PATCH  /v1/menu/categories/:id
DELETE /v1/menu/categories/:id

GET    /v1/menu/items[?categoryId=]
GET    /v1/menu/items/:id
POST   /v1/menu/items                  body: { categoryId, name, basePrice, ... }
PATCH  /v1/menu/items/:id
PATCH  /v1/menu/items/:id/availability body: { isAvailable }
DELETE /v1/menu/items/:id

GET    /v1/menu/modifier-groups
POST   /v1/menu/modifier-groups
PATCH  /v1/menu/modifier-groups/:id
DELETE /v1/menu/modifier-groups/:id
POST   /v1/menu/modifier-groups/:groupId/modifiers
PATCH  /v1/menu/modifiers/:id
DELETE /v1/menu/modifiers/:id
PUT    /v1/menu/items/:id/modifier-groups   body: { groupIds: [...] }
GET    /v1/menu/items/:id/modifier-groups`}
      </Code>

      <Text style={styles.h2}>Branches & tables</Text>
      <Code>
        {`GET    /v1/branches
POST   /v1/branches
PATCH  /v1/branches/:id
DELETE /v1/branches/:id
GET    /v1/branches/:id/qr-sheet.pdf    binary PDF

GET    /v1/tables?branchId=...
POST   /v1/tables?branchId=...
PATCH  /v1/tables/:id
PATCH  /v1/tables/:id/status            body: { status }
DELETE /v1/tables/:id
POST   /v1/tables/:id/qr                rotates the active QR token
GET    /v1/tables/:id/qr.png            binary PNG`}
      </Code>

      <Text style={styles.h2}>Orders & kitchen</Text>
      <Code>
        {`GET    /v1/orders[?branchId=&activeOnly=true&status=]
GET    /v1/orders/:id
POST   /v1/orders?branchId=&tableId=    body: { items: [{menuItemId, quantity, modifierIds}], notes? }
PATCH  /v1/orders/:id/status            body: { status }
POST   /v1/orders/:id/items             body: { items: [...] }
POST   /v1/orders/:id/transfer          body: { targetTableId }
POST   /v1/orders/:id/merge             body: { sourceOrderId }
POST   /v1/orders/:id/split             body: { mode: 'evenly'|'by-item', splitCount?|assignments? }
POST   /v1/orders/:id/discount          body: { couponCode?, flatAmount?, reason? }
GET    /v1/orders/:id/invoice.pdf       binary
GET    /v1/orders/:id/kot.pdf           binary
PATCH  /v1/orders/items/:itemId/status  body: { status }

GET    /v1/kitchen/queue?branchId=...
PATCH  /v1/kitchen/items/:itemId        body: { status }`}
      </Code>

      <Footer />
    </Page>
  );
}

function S10ApiPart2() {
  return (
    <Page size="A4" style={styles.page}>
      <PageHeader section="10. API reference (cont.)" />
      <Text style={styles.h1}>10. API reference (continued)</Text>

      <Text style={styles.h2}>Payments</Text>
      <Code>
        {`GET    /v1/payments/by-order/:orderId
POST   /v1/payments                         body: { orderId, method, amount, note? }
POST   /v1/payments/:id/refund              body: { amount?, reason? }
POST   /v1/payments/webhook/razorpay        Razorpay calls this; HMAC-verified`}
      </Code>

      <Text style={styles.h2}>Staff & coupons</Text>
      <Code>
        {`GET    /v1/staff
POST   /v1/staff                       body: { email, name, role, branchId, password, ... }
PATCH  /v1/staff/:id
DELETE /v1/staff/:id
POST   /v1/staff/:id/reset-password    body: { newPassword }

GET    /v1/coupons
POST   /v1/coupons
PATCH  /v1/coupons/:id
DELETE /v1/coupons/:id`}
      </Code>

      <Text style={styles.h2}>Analytics, customers, feedback</Text>
      <Code>
        {`GET    /v1/analytics/summary?range=today|7d|30d|90d[&branchId=]
GET    /v1/analytics/top-items?range=&limit=
GET    /v1/analytics/peak-hours?range=
GET    /v1/analytics/revenue-series?range=
GET    /v1/analytics/payment-methods?range=
GET    /v1/analytics/export.csv?range=     CSV download

GET    /v1/customers[?search=]
GET    /v1/customers/:id                   includes orders[] + feedback[]

GET    /v1/feedback?limit=
GET    /v1/feedback/summary?days=30`}
      </Code>

      <Text style={styles.h2}>Inventory, pricing rules, service requests</Text>
      <Code>
        {`GET    /v1/inventory/items?branchId=
POST   /v1/inventory/items?branchId=
PATCH  /v1/inventory/items/:id
DELETE /v1/inventory/items/:id
POST   /v1/inventory/items/:id/movements   body: { changeQty, reason }
GET    /v1/inventory/items/:id/movements

GET    /v1/pricing-rules
POST   /v1/pricing-rules                body: { name, type, value, startTime?, endTime?, ... }
PATCH  /v1/pricing-rules/:id
DELETE /v1/pricing-rules/:id

GET    /v1/service-requests?branchId=[&openOnly=true]
POST   /v1/service-requests/:id/acknowledge
POST   /v1/service-requests/:id/resolve`}
      </Code>

      <Text style={styles.h2}>Misc — uploads, audit log, customer (public)</Text>
      <Code>
        {`POST   /v1/uploads/sign                body: { folder } — signed Cloudinary params

GET    /v1/audit-logs?limit=&before=

GET    /q/:token                       resolve QR → branding + table info
GET    /q/:token/menu[?locale=hi]      full menu with prices, translations, mod groups
GET    /q/:token/recommendations[?itemId=]   "also ordered with" or trending
POST   /q/:token/orders                body: PlaceOrderInput
GET    /q/:token/orders/:id
POST   /q/:token/orders/:id/payment/initiate
POST   /q/:token/orders/:id/payment/verify   body: gateway response
POST   /q/:token/orders/:id/feedback   body: { rating, comment? }
POST   /q/:token/waiter-call           body: { reason }`}
      </Code>

      <Footer />
    </Page>
  );
}

function S11Realtime() {
  return (
    <Page size="A4" style={styles.page}>
      <PageHeader section="11. Realtime events" />
      <Text style={styles.h1}>11. Realtime / Socket.IO events</Text>

      <P>
        Connect to <Text style={styles.inlineCode}>http://localhost:4000</Text>{' '}
        with auth payload <Text style={styles.inlineCode}>{`{ token: <jwt> }`}</Text>{' '}
        (operator) or <Text style={styles.inlineCode}>{`{ qrToken: <qr> }`}</Text>{' '}
        (customer). Each operator client auto-joins its branch's order, kitchen,
        and table rooms.
      </P>

      <DataTable
        cols={[
          { header: 'Event', width: 28 },
          { header: 'Direction', width: 18 },
          { header: 'When it fires', width: 54 },
        ]}
        rows={[
          [
            'order:placed',
            'server → operators',
            'A new order is created (customer or POS).',
          ],
          [
            'order:status_changed',
            'server → both',
            'Order status transitions (placed → accepted → preparing → ready → served → completed).',
          ],
          [
            'order:item_status_changed',
            'server → both',
            'Individual order item moves through pending/preparing/ready.',
          ],
          [
            'table:status_changed',
            'server → operators',
            'Table flips between available / occupied / cleaning / reserved.',
          ],
          [
            'table:waiter_called',
            'server → operators',
            'Customer pressed Call waiter or Request bill. POS shows pulse badge.',
          ],
          [
            'menu:item_availability_changed',
            'server → operators',
            'Manager toggled an item in/out of stock.',
          ],
        ]}
      />

      <Text style={styles.h2}>How to verify a realtime path manually</Text>
      <Step n={1}>Open POS at :3003 in one window.</Step>
      <Step n={2}>Open Kitchen at :3002 in another.</Step>
      <Step n={3}>Open Customer QR URL in a third.</Step>
      <Step n={4}>Place an order in Customer.</Step>
      <Step n={5}>Within ~500 ms: POS shows the table occupied, Kitchen shows the ticket.</Step>

      <Footer />
    </Page>
  );
}

// ============================================================
// Test scenarios
// ============================================================

function S12Scenarios() {
  return (
    <Page size="A4" style={styles.page}>
      <PageHeader section="12. Test scenarios" />
      <Text style={styles.h1}>12. End-to-end test scenarios</Text>

      <P>
        Run each scenario from a clean dev start{' '}
        (<Text style={styles.inlineCode}>pnpm dev</Text>) with all apps open.
        Most scenarios share the same setup phase (login + active branch); a
        single setup gives you 30+ minutes of testing.
      </P>

      <Text style={styles.h2}>Scenario 1 — Owner first login & menu setup</Text>
      <Step n={1}>Visit http://localhost:3001/login. Log in as owner@mango.test / Owner@123.</Step>
      <Step n={2}>Sidebar → Menu → click <Text style={styles.inlineCode}>+ Category</Text>. Create "Starters". Submit.</Step>
      <Step n={3}>Click <Text style={styles.inlineCode}>+ Item</Text>. Fill: name "Paneer Tikka", category Starters, price 240, veg, spicy=2, prep=15 min. Save.</Step>
      <Step n={4}>Toggle Available off and on — confirm the badge updates in-place.</Step>
      <Step n={5}>Click into Modifier groups → create "Size" (single, min/max 1). Add Half −₹50, Full ₹0 (default).</Step>
      <Step n={6}>Back to Menu → edit Paneer Tikka → check Size group → Save.</Step>
      <Callout tone="good">
        Expected: GET /v1/menu/items returns the item with{' '}
        <Text style={styles.inlineCode}>modifierGroups[]</Text> populated.
      </Callout>

      <Text style={styles.h2}>Scenario 2 — Tables & QR codes</Text>
      <Step n={1}>Sidebar → Tables. The 12 seeded tables (T01–T12) appear.</Step>
      <Step n={2}>Pick T01 → click <Text style={styles.inlineCode}>QR PNG</Text>. PNG downloads.</Step>
      <Step n={3}>Click <Text style={styles.inlineCode}>QR sheet</Text> in the page header. A multi-table PDF sheet downloads with one QR per table.</Step>
      <Step n={4}>Click <Text style={styles.inlineCode}>Rotate</Text> on a table — the old QR is deactivated; previous scans now 404.</Step>

      <Footer />
    </Page>
  );
}

function S12ScenariosB() {
  return (
    <Page size="A4" style={styles.page}>
      <PageHeader section="12. Test scenarios (cont.)" />

      <Text style={styles.h2}>Scenario 3 — Customer ordering (QR-first)</Text>
      <Step n={1}>From Tables, click QR PNG for T01. Note the URL embedded inside (looks like /q/ABC...).</Step>
      <Step n={2}>Open that URL in a fresh tab → Customer menu loads SSR.</Step>
      <Step n={3}>Verify branding header: "Mango Tree · Indiranagar · Table T01".</Step>
      <Step n={4}>Tap Paneer Tikka → modifier picker opens → choose Half (−₹50) → Add.</Step>
      <Step n={5}>Cart bar at the bottom shows 1 item, ₹190 (= 240 − 50).</Step>
      <Step n={6}>Tap cart bar → review → Place order.</Step>
      <Step n={7}>Tracking page opens. POS at :3003 and Kitchen at :3002 should light up within 500 ms.</Step>

      <Text style={styles.h2}>Scenario 4 — Kitchen flow</Text>
      <Step n={1}>Kitchen :3002 → new card appears with a sound (in real env). Card border = green (&lt; 5min).</Step>
      <Step n={2}>Tap the Paneer Tikka line — status → preparing. Order auto-flips to "preparing".</Step>
      <Step n={3}>Tap again — status → ready. Order auto-flips to "ready". Customer's tracking page advances.</Step>

      <Text style={styles.h2}>Scenario 5 — POS settle (cash)</Text>
      <Step n={1}>POS :3003 floor view → tap T01.</Step>
      <Step n={2}>Order detail shows items + totals. Press <Text style={styles.inlineCode}>Settle</Text>.</Step>
      <Step n={3}>Method = cash, amount auto-filled to total. Submit.</Step>
      <Step n={4}>Order auto-completes; T01 flips to cleaning.</Step>
      <Step n={5}>Press <Text style={styles.inlineCode}>Mark available</Text> to free the table.</Step>

      <Text style={styles.h2}>Scenario 6 — Customer Razorpay payment</Text>
      <Step n={1}>Repeat scenario 3 but stop before the cashier settles.</Step>
      <Step n={2}>On the customer tracking page after status served, tap <Text style={styles.inlineCode}>💳 Pay now</Text>.</Step>
      <Step n={3}>Razorpay Checkout opens. Pay with a test card: <Text style={styles.inlineCode}>4111 1111 1111 1111</Text>, any future expiry, any CVV.</Step>
      <Step n={4}>On success, tracking page shows "✓ Paid · Thank you!"; admin /orders reflects "completed".</Step>
      <Callout tone="info">
        The webhook secret in your .env (<Text style={styles.inlineCode}>test_razorpay</Text>)
        only verifies inline checkout signatures — real webhooks need the exact
        secret from your Razorpay dashboard. For local testing, the verify
        endpoint already completes the order without needing the webhook.
      </Callout>

      <Text style={styles.h2}>Scenario 7 — Coupon discount</Text>
      <Step n={1}>Use a SQL client to insert a coupon (no admin UI yet) — see Test data section. Code = WELCOME10, 10% off.</Step>
      <Step n={2}>POS table workspace with an active order → <Text style={styles.inlineCode}>Discount</Text>.</Step>
      <Step n={3}>Pick Coupon → enter WELCOME10 → Apply. Total drops 10%.</Step>
      <Step n={4}>Audit Log → entry "discount" appears with the diff JSON.</Step>

      <Footer />
    </Page>
  );
}

function S12ScenariosC() {
  return (
    <Page size="A4" style={styles.page}>
      <PageHeader section="12. Test scenarios (cont.)" />

      <Text style={styles.h2}>Scenario 8 — Split bill</Text>
      <Step n={1}>POS with an active order having ≥ 2 items → <Text style={styles.inlineCode}>Split</Text>.</Step>
      <Step n={2}>Choose Evenly = 3. Expected: 2 child orders created with parentOrderId; each holds 1/3 of the total.</Step>
      <Step n={3}>Alternatively choose By item; tap each item to cycle into Bill 1 / 2 / 3.</Step>

      <Text style={styles.h2}>Scenario 9 — Transfer table</Text>
      <Step n={1}>POS → table with an order → <Text style={styles.inlineCode}>Transfer</Text>.</Step>
      <Step n={2}>Pick a free table from the grid.</Step>
      <Step n={3}>Order is reassigned. Old table freed (if no other active orders). New table flips to occupied. POS auto-navigates to floor.</Step>

      <Text style={styles.h2}>Scenario 10 — Merge orders</Text>
      <P>API-only for now (no POS UI):</P>
      <Code>
        {`POST /v1/orders/<targetOrderId>/merge
{ "sourceOrderId": "<sourceOrderId>" }`}
      </Code>
      <P>Source order canceled with note "merged → #&lt;target&gt;". Source's items reassigned. Source's table freed.</P>

      <Text style={styles.h2}>Scenario 11 — Refund</Text>
      <Step n={1}>POS Settle a card or UPI payment first.</Step>
      <Step n={2}>API call (or use the refund endpoint when wired into UI):
      </Step>
      <Code>{`POST /v1/payments/<paymentId>/refund   body: { amount?, reason? }`}</Code>
      <Step n={3}>Payment row flips to refunded; audit log entry created.</Step>

      <Text style={styles.h2}>Scenario 12 — Loyalty points</Text>
      <Step n={1}>Customer order with phone (currently set programmatically; see Test data section).</Step>
      <Step n={2}>Complete the order. The customer row gets <Text style={styles.inlineCode}>floor(total/1000)</Text> points (1 pt per ₹10).</Step>
      <Step n={3}>Admin → Customers → search by phone → drawer shows points + spend + order history.</Step>

      <Text style={styles.h2}>Scenario 13 — Multi-language menu</Text>
      <Step n={1}>API: PATCH a menu item's translations:</Step>
      <Code>
        {`PATCH /v1/menu/items/<id>
{ "translations": { "hi": { "name": "पनीर टिक्का", "description": "..." } } }`}
      </Code>
      <Step n={2}>Update tenant settings.supportedLocales to include "hi" (Phase 6 UI; for now: SQL).</Step>
      <Step n={3}>Customer app → Languages icon → choose हिन्दी. Menu re-renders.</Step>

      <Text style={styles.h2}>Scenario 14 — Happy-hour pricing</Text>
      <Step n={1}>API: create a pricing rule for everyone, 20% off Paneer Tikka, 00:00–23:59:</Step>
      <Code>
        {`POST /v1/pricing-rules
{
  "name": "Happy Hour 20%",
  "type": "percent",
  "value": 2000,
  "menuItemIds": ["<paneer item id>"],
  "startTime": "00:00",
  "endTime":   "23:59",
  "isActive":  true
}`}
      </Code>
      <Step n={2}>Customer menu reload → item now shows ₹192, strike-through ₹240, "Sale" pill.</Step>
      <Step n={3}>Order it → server applies rule → line total reflects ₹192.</Step>

      <Footer />
    </Page>
  );
}

function S12ScenariosD() {
  return (
    <Page size="A4" style={styles.page}>
      <PageHeader section="12. Test scenarios (cont.)" />

      <Text style={styles.h2}>Scenario 15 — Service requests (call waiter)</Text>
      <Step n={1}>Customer tracking page → tap <Text style={styles.inlineCode}>Call waiter</Text>.</Step>
      <Step n={2}>POS floor view → red pulse badge appears on the corresponding table.</Step>
      <Step n={3}>POS or API:</Step>
      <Code>
        {`GET  /v1/service-requests?branchId=<id>
POST /v1/service-requests/<id>/acknowledge
POST /v1/service-requests/<id>/resolve`}
      </Code>
      <Step n={4}>Status transitions: open → acknowledged → resolved.</Step>

      <Text style={styles.h2}>Scenario 16 — Inventory adjust</Text>
      <Step n={1}>Admin → Inventory. Add "Paneer" (kg, 5, reorder 1, ₹350/kg).</Step>
      <Step n={2}>Adjust → reason Purchase, +2 kg → stock now 7 kg.</Step>
      <Step n={3}>Adjust → reason Consumption, 1.5 kg → stock now 5.5 kg (auto-signed negative).</Step>
      <Step n={4}>Try over-consume (e.g. 100 kg) — API rejects with "Resulting stock cannot be negative".</Step>
      <Step n={5}>History drawer shows all movements with timestamps.</Step>

      <Text style={styles.h2}>Scenario 17 — Staff management & RBAC</Text>
      <Step n={1}>Admin → Staff → <Text style={styles.inlineCode}>+ New staff</Text>. Create Riya as waiter, branch Indiranagar, password Riya@1234.</Step>
      <Step n={2}>Open POS at :3003 in a new browser. Log in as riya@mango.test / Riya@1234. Floor view loads.</Step>
      <Step n={3}>Open Admin at :3001 with Riya's account → access works but waiter-allowed pages only; staff page returns 403 on API.</Step>
      <Step n={4}>Back as owner: <Text style={styles.inlineCode}>Reset password</Text> for Riya → new password. Riya's old password rejected at /v1/auth/login.</Step>
      <Step n={5}>Audit log shows the three actions: create / reset_password / and any RBAC denials.</Step>

      <Text style={styles.h2}>Scenario 18 — Analytics & CSV export</Text>
      <Step n={1}>After running scenarios 3–7, Admin → Overview shows non-zero revenue and top sellers.</Step>
      <Step n={2}>Admin → Analytics. Range chips change all 4 charts. Toggle 7d / 30d / 90d.</Step>
      <Step n={3}>Click <Text style={styles.inlineCode}>CSV</Text> — downloads <Text style={styles.inlineCode}>orders-7d.csv</Text>.</Step>
      <Step n={4}>Admin → Feedback shows ratings + 30-day distribution after scenario 3's served orders get rated.</Step>

      <Footer />
    </Page>
  );
}

function S13Reset() {
  return (
    <Page size="A4" style={styles.page}>
      <PageHeader section="13. Test data reset" />
      <Text style={styles.h1}>13. Test data reset & cleanup</Text>

      <Text style={styles.h2}>Clear all orders / payments / feedback (keep menu + tables)</Text>
      <Code>
        {`-- Run against Neon. Order matters: dependent rows first.
DELETE FROM order_item_modifiers;
DELETE FROM order_items;
DELETE FROM payments;
DELETE FROM feedback;
DELETE FROM orders;
DELETE FROM service_requests;
DELETE FROM stock_movements;
UPDATE customers SET loyalty_points = 0, total_spend = 0, visit_count = 0;
UPDATE tables SET status = 'available';`}
      </Code>

      <Text style={styles.h2}>Full nuke (everything except the tenant & owner)</Text>
      <Code>
        {`-- WARNING: this also wipes menu items and modifier groups.
TRUNCATE
  audit_logs,
  order_item_modifiers,
  order_items,
  payments,
  feedback,
  orders,
  service_requests,
  stock_movements,
  notifications,
  pricing_rules,
  coupons,
  inventory_items,
  menu_item_modifier_groups,
  modifiers,
  modifier_groups,
  menu_items,
  menu_categories,
  qr_codes
CASCADE;
UPDATE tables SET status = 'available';`}
      </Code>

      <Text style={styles.h2}>Re-seed</Text>
      <Code>pnpm --filter @qrder/db db:seed</Code>
      <P>
        Idempotent: it will fail if the tenant exists. Drop the tenants table or
        do a fresh DB if you want a true clean slate.
      </P>

      <Text style={styles.h2}>Insert a quick test coupon (no admin UI yet)</Text>
      <Code>
        {`INSERT INTO coupons (tenant_id, code, type, value, min_subtotal, is_active)
SELECT id, 'WELCOME10', 'percent', 1000, 0, true FROM tenants LIMIT 1;`}
      </Code>

      <Text style={styles.h2}>Insert tenant supported locales</Text>
      <Code>
        {`UPDATE tenants
SET settings = settings || '{"supportedLocales":["en","hi"]}'::jsonb
WHERE slug = 'mango-tree';`}
      </Code>

      <Footer />
    </Page>
  );
}

function S14Troubleshooting() {
  return (
    <Page size="A4" style={styles.page}>
      <PageHeader section="14. Troubleshooting" />
      <Text style={styles.h1}>14. Troubleshooting</Text>

      <Text style={styles.h2}>"Auto-logged out on refresh"</Text>
      <P>
        If you start using a stale token (e.g. you ran the app days ago with a 15
        min TTL, then JWT_ACCESS_EXPIRES_IN moved to 8h), the persisted token
        may still be expired. Open DevTools Console in the admin tab:
      </P>
      <Code>{`localStorage.removeItem('qrder-auth'); location.href = '/login';`}</Code>

      <Text style={styles.h2}>"400 Bad Request: branchId is required"</Text>
      <P>
        Super-admin users have <Text style={styles.inlineCode}>branchId = null</Text>.
        Branch-scoped endpoints (tables, kitchen queue, inventory) need an
        explicit branchId. The Admin / POS apps handle this via the branch
        switcher chip in the topbar — if you see this error, click the chip and
        pick a branch.
      </P>

      <Text style={styles.h2}>"PDF returns 500"</Text>
      <P>
        The PDF templates import React explicitly for the classic JSX transform
        used by tsx (the dev runtime). If you edit a template and hit a 500,
        check the API logs — common cause is a missing React import or
        returning <Text style={styles.inlineCode}>null</Text> from JSX where
        React-PDF expects <Text style={styles.inlineCode}>&lt;View /&gt;</Text>.
      </P>

      <Text style={styles.h2}>"Razorpay payment never confirms"</Text>
      <P>
        The customer pay flow uses inline signature verification (no webhook
        needed). If you see issues:
      </P>
      <Bullet>
        Check the API logs for{' '}
        <Text style={styles.inlineCode}>razorpay createOrder failed</Text> — keys
        invalid.
      </Bullet>
      <Bullet>
        Check the customer's browser console for{' '}
        <Text style={styles.inlineCode}>checkout.js</Text> errors — script
        blocked.
      </Bullet>
      <Bullet>
        On success, the customer's verify call should return 200; if it 400s,
        the signature is wrong (often a key-secret mismatch).
      </Bullet>

      <Text style={styles.h2}>"Image upload always falls back to base64"</Text>
      <P>
        That means <Text style={styles.inlineCode}>CLOUDINARY_*</Text> env vars
        aren't set — the API picks the NoOp storage. Fill in your Cloudinary
        creds in <Text style={styles.inlineCode}>.env</Text> and restart the
        API. Direct signed uploads start working immediately, no code change.
      </P>

      <Text style={styles.h2}>"Socket.IO won't connect"</Text>
      <P>
        Check ALLOWED_ORIGINS includes the URL you're loading the operator app
        from. Default covers all dev ports (3000–3003).
      </P>

      <Text style={styles.h2}>Regenerating this PDF</Text>
      <Code>{`pnpm --filter @qrder/api build:docs`}</Code>
      <P>
        The script is at{' '}
        <Text style={styles.inlineCode}>apps/api/scripts/build-testing-pdf.tsx</Text>.
        Edit it and re-run to refresh the PDF.
      </P>

      <Footer />
    </Page>
  );
}

// ============================================================
// Document
// ============================================================

function TestingDoc() {
  return (
    <Document
      title="Qrder — Testing Guide"
      author="Qrder pilot"
      subject="End-to-end test plan and reference"
    >
      <Cover />
      <Toc />
      <S1Overview />
      <S2Setup />
      <S3Urls />
      <S4Users />
      <S5Roles />
      <S6Customer />
      <S7Admin />
      <S8Kitchen />
      <S9Pos />
      <S10Api />
      <S10ApiPart2 />
      <S11Realtime />
      <S12Scenarios />
      <S12ScenariosB />
      <S12ScenariosC />
      <S12ScenariosD />
      <S13Reset />
      <S14Troubleshooting />
    </Document>
  );
}

// ============================================================
// Entrypoint
// ============================================================

async function main() {
  const buffer = await renderToBuffer(
    <TestingDoc /> as unknown as Parameters<typeof renderToBuffer>[0],
  );
  const out = resolve(REPO_ROOT, 'TESTING.pdf');
  await writeFile(out, buffer);
  // eslint-disable-next-line no-console
  console.log(`✓ Wrote ${out} (${buffer.length.toLocaleString()} bytes)`);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});

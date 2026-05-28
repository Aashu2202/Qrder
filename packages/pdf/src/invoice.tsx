import * as React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import type { InvoiceData } from './types';
// `React` import is intentional even though we don't reference it by name:
// the API's tsx runtime compiles JSX with the classic transform which needs it.
void React;

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 10, fontFamily: 'Helvetica', color: '#18181b' },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  brand: { flexDirection: 'row', alignItems: 'center' },
  brandText: { fontSize: 16, fontFamily: 'Helvetica-Bold' },
  meta: { fontSize: 9, color: '#71717a' },
  hr: { borderBottomWidth: 1, borderBottomColor: '#e4e4e7', marginVertical: 8 },
  twoCol: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  col: { width: '48%' },
  label: { fontSize: 8, color: '#71717a', textTransform: 'uppercase', letterSpacing: 0.5 },
  value: { fontSize: 10, marginTop: 2 },
  thRow: {
    flexDirection: 'row',
    backgroundColor: '#fafafa',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e4e4e7',
    paddingVertical: 6,
    paddingHorizontal: 4,
    marginTop: 8,
  },
  tr: {
    flexDirection: 'row',
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderBottomWidth: 0.5,
    borderColor: '#f4f4f5',
  },
  th: { fontFamily: 'Helvetica-Bold', fontSize: 9 },
  cName: { flex: 4 },
  cQty: { flex: 1, textAlign: 'right' },
  cPrice: { flex: 2, textAlign: 'right' },
  cTotal: { flex: 2, textAlign: 'right' },
  modLine: { color: '#71717a', fontSize: 8, marginTop: 2 },
  totalsBlock: { marginTop: 12, alignSelf: 'flex-end', width: 200 },
  totalsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 },
  totalLabel: { color: '#52525b' },
  grandRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderTopWidth: 1,
    borderColor: '#e4e4e7',
    marginTop: 4,
  },
  grandLabel: { fontFamily: 'Helvetica-Bold' },
  grandValue: { fontFamily: 'Helvetica-Bold' },
  footer: { marginTop: 24, textAlign: 'center', fontSize: 9, color: '#71717a' },
  logo: { width: 28, height: 28, borderRadius: 4, marginRight: 8 },
});

function money(amount: number, currency: string): string {
  const major = amount / 100;
  const symbol = currency === 'INR' ? '₹' : currency + ' ';
  return symbol + major.toFixed(2);
}

/**
 * Build a row only if there's content. React-PDF + React 19 is fussy about
 * `null` children — we use empty `<View />` placeholders where needed.
 */
export function InvoiceDocument({ data }: { data: InvoiceData }) {
  const cur = data.tenant.currency || 'INR';
  const gstRate = data.gstRate ?? 5;
  const halfGst = data.totals.taxAmount / 2;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.brand}>
            {data.tenant.logoUrl ? (
              <Image src={data.tenant.logoUrl} style={styles.logo} />
            ) : (
              <View />
            )}
            <View>
              <Text style={styles.brandText}>{data.tenant.name}</Text>
              <Text style={styles.meta}>{data.tenant.address || ' '}</Text>
              <Text style={styles.meta}>{data.tenant.phone || ' '}</Text>
              <Text style={styles.meta}>
                {data.tenant.gstin ? `GSTIN: ${data.tenant.gstin}` : ' '}
              </Text>
            </View>
          </View>
          <View>
            <Text style={styles.brandText}>INVOICE</Text>
            <Text style={styles.meta}>#{data.order.orderNumber}</Text>
            <Text style={styles.meta}>{new Date(data.order.placedAt).toLocaleString()}</Text>
          </View>
        </View>

        <View style={styles.twoCol}>
          <View style={styles.col}>
            <Text style={styles.label}>Branch</Text>
            <Text style={styles.value}>{data.branch.name}</Text>
            <Text style={[styles.label, { marginTop: 6 }]}>Table</Text>
            <Text style={styles.value}>{data.order.tableNumber || '—'}</Text>
          </View>
          <View style={styles.col}>
            <Text style={styles.label}>Served by</Text>
            <Text style={styles.value}>{data.order.servedByName || '—'}</Text>
            <Text style={[styles.label, { marginTop: 6 }]}>Closed at</Text>
            <Text style={styles.value}>
              {data.order.completedAt ? new Date(data.order.completedAt).toLocaleString() : '—'}
            </Text>
          </View>
        </View>

        <View style={styles.thRow}>
          <Text style={[styles.th, styles.cName]}>Item</Text>
          <Text style={[styles.th, styles.cQty]}>Qty</Text>
          <Text style={[styles.th, styles.cPrice]}>Price</Text>
          <Text style={[styles.th, styles.cTotal]}>Total</Text>
        </View>

        {data.items.map((it, idx) => (
          <View key={idx} style={styles.tr}>
            <View style={styles.cName}>
              <Text>{it.name}</Text>
              {it.modifiers.length > 0 ? (
                <Text style={styles.modLine}>
                  {it.modifiers
                    .map((m) =>
                      m.priceDelta === 0
                        ? m.name
                        : `${m.name} (${m.priceDelta > 0 ? '+' : ''}${money(m.priceDelta, cur)})`,
                    )
                    .join(', ')}
                </Text>
              ) : (
                <View />
              )}
            </View>
            <Text style={styles.cQty}>{it.quantity}</Text>
            <Text style={styles.cPrice}>{money(it.unitPrice, cur)}</Text>
            <Text style={styles.cTotal}>{money(it.lineTotal, cur)}</Text>
          </View>
        ))}

        <View style={styles.totalsBlock}>
          <View style={styles.totalsRow}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text>{money(data.totals.subtotal, cur)}</Text>
          </View>
          {data.totals.discountAmount > 0 ? (
            <View style={styles.totalsRow}>
              <Text style={styles.totalLabel}>
                Discount{data.order.couponCode ? ` (${data.order.couponCode})` : ''}
              </Text>
              <Text>−{money(data.totals.discountAmount, cur)}</Text>
            </View>
          ) : (
            <View />
          )}
          <View style={styles.totalsRow}>
            <Text style={styles.totalLabel}>CGST ({(gstRate / 2).toFixed(1)}%)</Text>
            <Text>{money(halfGst, cur)}</Text>
          </View>
          <View style={styles.totalsRow}>
            <Text style={styles.totalLabel}>SGST ({(gstRate / 2).toFixed(1)}%)</Text>
            <Text>{money(halfGst, cur)}</Text>
          </View>
          <View style={styles.grandRow}>
            <Text style={styles.grandLabel}>Total</Text>
            <Text style={styles.grandValue}>{money(data.totals.totalAmount, cur)}</Text>
          </View>
        </View>

        {data.payments && data.payments.length > 0 ? (
          <View>
            <View style={styles.hr} />
            <Text style={styles.label}>Payments</Text>
            {data.payments.map((p, i) => (
              <Text key={i} style={styles.value}>
                {p.method.toUpperCase()} · {money(p.amount, cur)}
                {p.gatewayPaymentId ? ` · ${p.gatewayPaymentId}` : ''}
              </Text>
            ))}
          </View>
        ) : (
          <View />
        )}

        <Text style={styles.footer}>{data.footer || 'Thank you. We hope to see you again.'}</Text>
      </Page>
    </Document>
  );
}

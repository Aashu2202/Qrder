import * as React from 'react';
import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer';
void React;

export interface QrSheetData {
  tenant: { name: string; logoUrl?: string | null };
  branch: { name: string };
  tables: Array<{
    number: string;
    /** Pre-rendered PNG data URL of the QR code. */
    pngDataUrl: string;
    url: string;
  }>;
}

const styles = StyleSheet.create({
  page: { padding: 24, fontFamily: 'Helvetica' },
  header: { marginBottom: 12, textAlign: 'center' },
  brand: { fontSize: 14, fontFamily: 'Helvetica-Bold' },
  meta: { fontSize: 9, color: '#71717a', marginTop: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: {
    width: '33.33%',
    padding: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  cellInner: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#e4e4e7',
    borderRadius: 6,
    padding: 8,
    alignItems: 'center',
  },
  tableLabel: { fontSize: 16, fontFamily: 'Helvetica-Bold', marginBottom: 6 },
  qr: { width: 130, height: 130 },
  scanLabel: { fontSize: 9, color: '#71717a', marginTop: 6, textAlign: 'center' },
});

export function QrSheetDocument({ data }: { data: QrSheetData }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.brand}>{data.tenant.name} · {data.branch.name}</Text>
          <Text style={styles.meta}>Scan to order from your phone</Text>
        </View>
        <View style={styles.grid}>
          {data.tables.map((t) => (
            <View key={t.number} style={styles.cell}>
              <View style={styles.cellInner}>
                <Text style={styles.tableLabel}>Table {t.number}</Text>
                <Image src={t.pngDataUrl} style={styles.qr} />
                <Text style={styles.scanLabel}>Scan with your camera</Text>
              </View>
            </View>
          ))}
        </View>
      </Page>
    </Document>
  );
}

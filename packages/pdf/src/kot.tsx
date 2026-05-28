import * as React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import type { KotData } from './types';
void React;

const styles = StyleSheet.create({
  page: { padding: 16, fontSize: 11, fontFamily: 'Helvetica' },
  bigNum: { fontSize: 28, fontFamily: 'Helvetica-Bold' },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  meta: { fontSize: 9, color: '#52525b' },
  hr: { borderBottomWidth: 1, borderBottomColor: '#000', marginVertical: 6 },
  station: { marginTop: 8 },
  stationHead: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    paddingVertical: 3,
    backgroundColor: '#e4e4e7',
    paddingHorizontal: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  itemRow: { flexDirection: 'row', paddingVertical: 4 },
  itemQty: { width: 30, fontFamily: 'Helvetica-Bold' },
  itemBody: { flex: 1 },
  itemName: { fontSize: 12 },
  itemNote: { fontSize: 10, fontStyle: 'italic', color: '#52525b', marginTop: 1 },
  itemMod: { fontSize: 9, color: '#52525b', marginTop: 1 },
  footer: { marginTop: 12, fontSize: 9, color: '#71717a', textAlign: 'center' },
});

export function KotDocument({ data }: { data: KotData }) {
  return (
    <Document>
      <Page size="A5" style={styles.page}>
        <View style={styles.topRow}>
          <View>
            <Text style={styles.meta}>{data.branch.name} · KOT</Text>
            <Text style={styles.bigNum}>#{data.order.orderNumber}</Text>
            <Text style={styles.meta}>{new Date(data.order.placedAt).toLocaleString()}</Text>
          </View>
          {data.order.tableNumber ? (
            <View>
              <Text style={styles.meta}>Table</Text>
              <Text style={styles.bigNum}>{data.order.tableNumber}</Text>
            </View>
          ) : (
            <View />
          )}
        </View>

        <View style={styles.hr} />

        {data.stations.map((s) => (
          <View key={s.name} style={styles.station}>
            <Text style={styles.stationHead}>{s.name}</Text>
            {s.items.map((it, i) => (
              <View key={i} style={styles.itemRow}>
                <Text style={styles.itemQty}>{it.quantity}×</Text>
                <View style={styles.itemBody}>
                  <Text style={styles.itemName}>{it.name}</Text>
                  {it.modifiers.length > 0 ? (
                    <Text style={styles.itemMod}>{it.modifiers.join(', ')}</Text>
                  ) : (
                    <View />
                  )}
                  {it.cookingNotes ? (
                    <Text style={styles.itemNote}>{it.cookingNotes}</Text>
                  ) : (
                    <View />
                  )}
                </View>
              </View>
            ))}
          </View>
        ))}

        {data.order.notes ? (
          <View>
            <View style={styles.hr} />
            <Text style={styles.itemNote}>Note: {data.order.notes}</Text>
          </View>
        ) : (
          <View />
        )}

        <Text style={styles.footer}>Generated {new Date().toLocaleTimeString()}</Text>
      </Page>
    </Document>
  );
}

import { renderToBuffer, type DocumentProps } from '@react-pdf/renderer';
import { createElement, type ReactElement } from 'react';
import {
  InvoiceDocument,
  KotDocument,
  QrSheetDocument,
  type InvoiceData,
  type KotData,
  type QrSheetData,
} from '@qrder/pdf';

export async function renderInvoice(data: InvoiceData): Promise<Buffer> {
  const el = createElement(InvoiceDocument, { data }) as unknown as ReactElement<DocumentProps>;
  return renderToBuffer(el);
}

export async function renderKot(data: KotData): Promise<Buffer> {
  const el = createElement(KotDocument, { data }) as unknown as ReactElement<DocumentProps>;
  return renderToBuffer(el);
}

export async function renderQrSheet(data: QrSheetData): Promise<Buffer> {
  const el = createElement(QrSheetDocument, { data }) as unknown as ReactElement<DocumentProps>;
  return renderToBuffer(el);
}

export type { InvoiceData, KotData, QrSheetData };

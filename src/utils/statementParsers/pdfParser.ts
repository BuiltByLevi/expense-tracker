// The LEGACY build, deliberately: pdf.js's default build uses JS built-ins
// only the very newest browsers ship (Map.getOrInsert, Math.sumPrecise,
// Promise.try, Uint8Array.fromBase64). On a phone browser even slightly
// behind, the default build never finishes and the import sits on
// "Reading <file>..." forever. The legacy build bundles its own polyfills.
// Both the library and its worker must come from legacy/ — they are a pair.
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
// Vite ?url import bundles the worker as a same-origin asset, satisfying the
// app's strict `script-src 'self'` CSP (no CDN worker loading).
import pdfWorkerSrc from 'pdfjs-dist/legacy/build/pdf.worker.mjs?url';
import { itemsToTransactions, type PdfTextItem } from '../../../shared/statementParsers/pdfStatement';
import type { NormalizedTransaction, ParserError } from './types';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerSrc;

async function extractItems(file: File): Promise<PdfTextItem[]> {
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  const items: PdfTextItem[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    for (const item of content.items) {
      if (!('str' in item) || !item.str.trim()) continue;
      items.push({ page: pageNum, x: item.transform[4], y: item.transform[5], width: item.width, str: item.str });
    }
  }

  return items;
}

export async function parsePdfFile(file: File): Promise<
  { transactions: NormalizedTransaction[] } | { error: ParserError }
> {
  let items: PdfTextItem[];
  try {
    items = await extractItems(file);
  } catch (err: unknown) {
    const name = (err as { name?: string })?.name;
    if (name === 'PasswordException') {
      return { error: { code: 'ENCRYPTED_PDF', message: 'This PDF is password-protected. Please remove the password and re-upload.' } };
    }
    // Keep the real cause visible — the message above the user sees is generic.
    console.error('PDF statement parse failed:', err);
    return { error: { code: 'PARSE_FAILED', message: 'Failed to read this PDF file.' } };
  }

  const totalText = items.map((i) => i.str).join('').trim();
  if (totalText.length < 20) {
    return {
      error: {
        code: 'SCANNED_PDF',
        message: "This looks like a scanned/image PDF with no extractable text. Scanned statements aren't supported yet — try CSV or Excel instead, or a text-based PDF.",
      },
    };
  }

  const transactions = itemsToTransactions(items);

  if (transactions.length === 0) {
    return {
      error: {
        code: 'PARSE_FAILED',
        message: "Couldn't find any recognizable transaction lines in this PDF. It may use a layout this app doesn't understand yet — try CSV or Excel instead.",
      },
    };
  }

  return { transactions };
}

import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { parseCsvText, type ParseResult } from '@shared/statementParsers/csvParser';
import { parseExcelBuffer } from '@shared/statementParsers/excelParser';

export type StatementFormat = 'csv' | 'excel' | 'pdf' | 'unknown';

export interface PickedStatement {
  uri: string;
  name: string;
  format: StatementFormat;
}

export function detectFormat(fileName: string): StatementFormat {
  const ext = fileName.toLowerCase().split('.').pop() ?? '';
  if (ext === 'csv' || ext === 'txt') return 'csv';
  if (ext === 'xls' || ext === 'xlsx' || ext === 'xlsm') return 'excel';
  if (ext === 'pdf') return 'pdf';
  return 'unknown';
}

/**
 * Opens the system file picker. `copyToCacheDirectory` matters on Android:
 * the picker hands back a `content://` URI that expo-file-system cannot read
 * directly, so Expo copies it to a readable `file://` path in the cache first.
 */
export async function pickStatementFile(): Promise<PickedStatement | null> {
  const result = await DocumentPicker.getDocumentAsync({
    copyToCacheDirectory: true,
    multiple: false,
    type: [
      'text/csv',
      'text/comma-separated-values',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/pdf',
      // Some Android file providers report a generic type for .csv/.xls;
      // without this they would be unselectable.
      'application/octet-stream',
    ],
  });

  if (result.canceled || !result.assets?.length) return null;
  const asset = result.assets[0];
  return {
    uri: asset.uri,
    name: asset.name ?? 'statement',
    format: detectFormat(asset.name ?? ''),
  };
}

async function readBytes(uri: string): Promise<ArrayBuffer> {
  return await new File(uri).arrayBuffer();
}

/**
 * Reads the picked file and runs it through the SAME parser the web app uses
 * (shared/statementParsers). Only byte acquisition is platform-specific.
 */
export async function parseStatement(picked: PickedStatement): Promise<ParseResult> {
  if (picked.format === 'pdf') {
    return {
      error: {
        code: 'UNSUPPORTED_FORMAT',
        message:
          'PDF statements are not supported in the mobile app yet — the PDF text extractor used on the web needs a browser engine. Please export your statement as CSV or Excel, or use the web app for PDFs.',
      },
    };
  }

  if (picked.format === 'unknown') {
    return {
      error: {
        code: 'UNSUPPORTED_FORMAT',
        message: `"${picked.name}" isn't a supported statement format. Please pick a .csv, .xls or .xlsx file.`,
      },
    };
  }

  let buffer: ArrayBuffer;
  try {
    buffer = await readBytes(picked.uri);
  } catch {
    return {
      error: { code: 'PARSE_FAILED', message: `Couldn't read "${picked.name}" from storage.` },
    };
  }

  if (buffer.byteLength === 0) {
    return { error: { code: 'EMPTY_FILE', message: 'That file is empty.' } };
  }

  if (picked.format === 'csv') {
    // Bank CSV exports are UTF-8 or Latin-1; `fatal: false` keeps a stray
    // byte from aborting the whole import.
    const text = new TextDecoder('utf-8', { fatal: false }).decode(buffer);
    return parseCsvText(text);
  }

  return parseExcelBuffer(buffer);
}

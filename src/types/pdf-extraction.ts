import type { ExtractedPdfData, KeyActivity } from './planning';

export interface PdfParseResult {
  success: boolean;
  confidence: 'high' | 'medium' | 'low' | 'failed';
  data: Partial<ExtractedPdfData>;
  rawText: string;
  errors: string[];
}

export interface ManualOverride {
  field: keyof ExtractedPdfData;
  value: unknown;
}

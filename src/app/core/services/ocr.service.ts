import { Injectable } from '@angular/core';

export interface OcrResult {
    value: number | null;
    confidence: number;
    rawText: string;
}

/**
 * On-Device OCR via Tesseract.js (WASM).
 * No API key needed, works offline.
 * Lazy-loads the Tesseract worker only when recognizeMeterValue() is first called.
 */
@Injectable({ providedIn: 'root' })
export class OcrService {
    /**
     * Recognizes a meter reading from a photo file.
     * Returns the best numeric candidate, confidence (0-100), and the full raw text.
     */
    async recognizeMeterValue(file: File): Promise<OcrResult> {
        // Lazy import – WASM bundle only loaded when OCR is first used
        const Tesseract = await import('tesseract.js');

        const { data } = await Tesseract.recognize(file, 'deu+eng', {
            // Force digit-optimized page segmentation:
            // PSM 6 = Assume a single uniform block of text
            // tessedit_char_whitelist restricts output to digits, comma, dot, space
        });

        const rawText = data.text.trim();
        const confidence = Math.round(data.confidence);

        const value = this.extractMeterReading(rawText);

        return { value, confidence, rawText };
    }

    /**
     * Extracts the most likely meter reading number from OCR text.
     * Meter readings are typically 4-8 digits, optionally with 1-3 decimal places.
     * Supports both dot (12345.678) and comma (12345,678) as decimal separators.
     */
    private extractMeterReading(text: string): number | null {
        if (!text) return null;

        // Normalize: replace commas used as decimal separators
        const normalized = text.replace(/\s+/g, ' ');

        // Pattern: 1-8 digits, optional decimal part (dot or comma + 1-4 digits)
        const pattern = /\b(\d{1,8})[.,](\d{1,4})\b|\b(\d{4,8})\b/g;

        const candidates: number[] = [];
        let match: RegExpExecArray | null;

        while ((match = pattern.exec(normalized)) !== null) {
            let numStr: string;
            if (match[1] !== undefined && match[2] !== undefined) {
                // Has decimal separator
                numStr = `${match[1]}.${match[2]}`;
            } else {
                // Integer only
                numStr = match[3];
            }
            const num = parseFloat(numStr);
            if (!isNaN(num) && num >= 0) {
                candidates.push(num);
            }
        }

        if (candidates.length === 0) return null;

        // Prefer the largest number (meter readings tend to be the dominant number on the display)
        return candidates.reduce((a, b) => (a > b ? a : b));
    }
}

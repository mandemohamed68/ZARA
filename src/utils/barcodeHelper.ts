/**
 * Utility to decode keyboard-emulated barcode scans on French (AZERTY) keyboards.
 * Barcode scanners often emulate an English (QWERTY) keyboard layout.
 * When used on a PC configured with a French (AZERTY) layout, the number row keys 
 * ('1', '2', ..., '0') map to French special characters (e.g. '&', 'é', ..., 'à')
 * because Shift is not held down.
 * 
 * This tool translates those characters back to their standard digits and letters.
 */

const AZERTY_TO_QWERTY_NUMBERS: Record<string, string> = {
  '&': '1',
  'é': '2',
  '"': '3',
  "'": '4',
  '(': '5',
  '-': '6',
  'è': '7',
  '_': '8',
  'ç': '9',
  'à': '0',
};

// Also map letters for common shifts (A <-> Q, Z <-> W)
const AZERTY_TO_QWERTY_LETTERS: Record<string, string> = {
  'q': 'a',
  'w': 'z',
  'a': 'q',
  'z': 'w',
  'Q': 'A',
  'W': 'Z',
  'A': 'Q',
  'Z': 'W',
  ',': 'm',
};

export function decodeAzertyBarcode(input: string): string {
  if (!input) return '';
  
  let decoded = '';
  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    if (AZERTY_TO_QWERTY_NUMBERS[char] !== undefined) {
      decoded += AZERTY_TO_QWERTY_NUMBERS[char];
    } else if (AZERTY_TO_QWERTY_LETTERS[char] !== undefined) {
      decoded += AZERTY_TO_QWERTY_LETTERS[char];
    } else {
      decoded += char;
    }
  }
  return decoded;
}

/**
 * Checks if a scanned code looks like an AZERTY-mangled numeric barcode
 * (e.g. contains classic AZERTY number-row characters like é, à, &, è, ç, etc.)
 */
export function isMangledAzertyBarcode(input: string): boolean {
  if (!input) return false;
  const azertySpecialChars = /[&é"'(è_çà]/;
  return azertySpecialChars.test(input);
}

/**
 * Automagically decodes an input string if it looks like a scanner-emulated AZERTY input.
 * This is safe to run in onChange handlers because it checks if the decoded version
 * represents a purely numeric code or a valid Zara format (e.g. ZARA-123456), or if the
 * string is heavily mangled and has no spaces.
 */
export function autoDecodeBarcodeIfMangled(input: string): string {
  if (!input) return '';
  
  const trimmed = input.trim();
  if (trimmed.length < 3) return input; // Too short to be a reliable barcode
  
  // Barcodes never contain spaces
  if (trimmed.includes(' ')) return input;
  
  const decoded = decodeAzertyBarcode(trimmed);
  
  // 1. If decoded string is fully numeric (e.g. EAN / UPC / custom integers like 20000100)
  if (/^\d+$/.test(decoded)) {
    return decoded;
  }
  
  // 2. If decoded string matches ZARA-999999 format (case-insensitive)
  if (/^zara-\d+$/i.test(decoded)) {
    return decoded;
  }
  
  // 3. Fallback: If it contains many typical scanner characters and no actual digits at all
  // then we can convert it to make it readable as numbers since real users type numbers
  const hasMangledChars = /[&é"'(è_çà]/.test(trimmed);
  const hasNormalDigits = /[0-9]/.test(trimmed);
  if (hasMangledChars && !hasNormalDigits) {
    return decoded;
  }
  
  return input;
}

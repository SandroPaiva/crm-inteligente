/**
 * Phone utilities for DDI + DDD + number formatting.
 * Format stored: +55 (11) 99999-9999  (digits only in DB: 5511999999999)
 * Display format: +55 (11) 99999-9999
 */

/**
 * Strips all non-digit characters from a string.
 */
export function digitsOnly(value: string): string {
  return value.replace(/\D/g, '');
}

/**
 * Normalizes a raw phone string (digits) into the display format:
 * +DDI (DDD) XXXXX-XXXX  or  +DDI (DDD) XXXX-XXXX
 *
 * Rules applied to existing data:
 * - If starts with 55 and length >= 12  → keep DDI=55, extract DDD + number
 * - If starts with 2-digit DDD 11..99 and length 10-11 → prepend DDI=55
 * - Otherwise just apply mask as-is
 */
export function normalizePhone(raw: string): string {
  if (!raw) return '';
  const digits = digitsOnly(raw);
  if (!digits) return raw; // keep original if no digits at all

  // Already has country code (55 + 10-11 digits = 12-13 total)
  if (digits.startsWith('55') && digits.length >= 12) {
    const ddi = '55';
    const rest = digits.slice(2);
    const ddd = rest.slice(0, 2);
    const num = rest.slice(2);
    return formatPhoneParts(ddi, ddd, num);
  }

  // Has DDD (2 digits) without country code: 10-11 digits
  if (digits.length >= 10 && digits.length <= 11) {
    const ddi = '55';
    const ddd = digits.slice(0, 2);
    const num = digits.slice(2);
    return formatPhoneParts(ddi, ddd, num);
  }

  // Return cleaned up with whatever we have
  return digits;
}

function formatPhoneParts(ddi: string, ddd: string, num: string): string {
  // Format number portion: 8 digits → XXXX-XXXX, 9 digits → XXXXX-XXXX
  let formattedNum = num;
  if (num.length === 9) {
    formattedNum = num.slice(0, 5) + '-' + num.slice(5);
  } else if (num.length === 8) {
    formattedNum = num.slice(0, 4) + '-' + num.slice(4);
  }
  return `+${ddi} (${ddd}) ${formattedNum}`;
}

/**
 * Applies live input masking for the phone field.
 * As user types, formats to: +XX (XX) XXXXX-XXXX
 */
export function applyPhoneMask(raw: string): string {
  const digits = digitsOnly(raw);
  let result = '';

  // DDI: up to 2 digits
  if (digits.length > 0) {
    result += '+' + digits.slice(0, 2);
  }
  // DDD: next 2 digits
  if (digits.length > 2) {
    result += ' (' + digits.slice(2, 4) + ')';
  } else if (digits.length === 2) {
    // Still typing DDI
  }
  // Phone number: remaining digits
  if (digits.length > 4) {
    const num = digits.slice(4, 13); // max 9 digits for number
    if (num.length <= 4) {
      result += ' ' + num;
    } else if (num.length <= 8) {
      // 8-digit landline
      result += ' ' + num.slice(0, 4) + '-' + num.slice(4);
    } else {
      // 9-digit mobile
      result += ' ' + num.slice(0, 5) + '-' + num.slice(5, 9);
    }
  }

  return result;
}

/**
 * Returns the raw digit string to store in the database.
 */
export function phoneToStore(masked: string): string {
  return digitsOnly(masked);
}

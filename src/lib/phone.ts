// Bangladeshi mobile numbers, as typed by a customer on a phone.
//
// No database import — the checkout form is a client component.
//
// The two problems this solves: a Bangla keyboard produces Bangla numerals
// (০১৯…), which are digits to a human and rubbish to every courier API; and
// people write the same number five different ways (+8801…, 8801…, 01…,
// 1…). Everything is folded to the one local form that orders are already
// stored in — 01XXXXXXXXX — so the admin list, the fraud check and the
// courier lookups all see the same string.

/** Shown as a fixed prefix beside the input. Not part of the stored value. */
export const BD_DIAL_CODE = "+88";

export const BD_LOCAL_LENGTH = 11;

/**
 * Folds Bangla (০-৯) and Arabic-Indic (٠-٩) numerals to ASCII and drops
 * everything that isn't a digit.
 */
export function toAsciiDigits(input: string): string {
  let out = "";
  for (const ch of input) {
    const code = ch.codePointAt(0)!;
    if (ch >= "0" && ch <= "9") out += ch;
    // Bangla ০..৯
    else if (code >= 0x09e6 && code <= 0x09ef) out += String(code - 0x09e6);
    // Arabic-Indic ٠..٩
    else if (code >= 0x0660 && code <= 0x0669) out += String(code - 0x0660);
    // Eastern Arabic-Indic ۰..۹
    else if (code >= 0x06f0 && code <= 0x06f9) out += String(code - 0x06f0);
  }
  return out;
}

/**
 * Whatever was typed or pasted, reduced to the local 01XXXXXXXXX form.
 * Mirrors normalizeBDPhoneNumber() on the server so the client can never
 * produce something the server would then reject.
 */
export function normalizeBDLocalPhone(input: string): string {
  let digits = toAsciiDigits(input);
  // A pasted +8801… or 8801… — drop the country code.
  if (digits.startsWith("880")) digits = digits.slice(3);
  else if (digits.startsWith("88") && digits.length > BD_LOCAL_LENGTH) {
    digits = digits.slice(2);
  }
  // "1712345678" from someone who omitted the leading zero.
  if (digits.length === 10 && digits.startsWith("1")) digits = "0" + digits;
  return digits.slice(0, BD_LOCAL_LENGTH);
}

/** The operator prefixes Bangladesh actually issues. */
export function isValidBDLocalPhone(value: string): boolean {
  return /^01[3-9][0-9]{8}$/.test(value);
}

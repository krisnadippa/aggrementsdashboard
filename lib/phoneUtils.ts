/**
 * Formats any domestic or international phone number into a valid WhatsApp international format.
 * WhatsApp requires digits only without '+', leading zeroes, or symbols: https://wa.me/<country_code><number>
 *
 * Supported formats:
 * - Indonesian with +62: "+62 812-3456-7890" -> "6281234567890"
 * - Indonesian domestic zero: "081234567890" -> "6281234567890"
 * - Indonesian without prefix: "81234567890" -> "6281234567890"
 * - International with +: "+61 412 345 678" -> "61412345678"
 * - International with +: "+1 (555) 234-5678" -> "15552345678"
 * - International with +: "+44 7911 123456" -> "447911123456"
 * - International with +: "+60 12-345 6789" -> "60123456789"
 * - International with 00: "0061 412 345 678" -> "61412345678"
 * - International already has country code: "61412345678" -> "61412345678"
 */
export function formatWhatsAppNumber(phone: string): string {
  if (!phone) return '';
  const trimmed = phone.trim();

  // If user entered explicit '+', they provided an international country code
  if (trimmed.startsWith('+') || trimmed.includes('+')) {
    return trimmed.replace(/\D/g, '');
  }

  // If starts with '00' (international call prefix, e.g. 0060..., 0044...)
  if (trimmed.startsWith('00')) {
    return trimmed.slice(2).replace(/\D/g, '');
  }

  // Strip all non-digit characters
  const digits = trimmed.replace(/\D/g, '');
  if (!digits) return '';

  // Domestic Indonesian mobile format (08...) or general local number starting with 0
  if (digits.startsWith('0')) {
    return '62' + digits.slice(1);
  }

  // Indonesian mobile number without leading 0 or +62 (e.g. 812..., 821..., 857..., 878... with 9 to 13 digits)
  if (/^8[1-9]\d{7,11}$/.test(digits)) {
    return '62' + digits;
  }

  // All other cases (e.g. 62..., 60..., 61..., 1..., 44..., 33..., 49..., etc.)
  return digits;
}

/**
 * Validates whether the formatted phone number has a plausible length for WhatsApp.
 */
export function isValidWhatsAppNumber(formattedPhone: string): boolean {
  // International E.164 phone numbers have between 7 and 15 digits
  return /^\d{7,15}$/.test(formattedPhone);
}

/**
 * Generates the full WhatsApp chat/share URL with prefilled text.
 */
export function createWhatsAppUrl(phone: string, text: string): string {
  const cleanPhone = formatWhatsAppNumber(phone);
  const encodedText = encodeURIComponent(text);
  return `https://wa.me/${cleanPhone}?text=${encodedText}`;
}

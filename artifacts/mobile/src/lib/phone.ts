/** Telefon raqamni login uchun tozalash (+998, bo'shliq, takroriy 998) */
export function normalizeLoginPhone(input: string): string {
  let digits = input.replace(/\D/g, "");

  // +998 maydonida to'liq raqam yozilsa: 998998995054004 -> 998995054004
  while (digits.startsWith("998998") && digits.length > 12) {
    digits = digits.slice(3);
  }

  if (digits.length === 9) {
    digits = `998${digits}`;
  }

  return digits;
}

export function toTelUri(phone: string): string {
  const digits = normalizeLoginPhone(phone);
  return digits ? `tel:+${digits}` : "tel:";
}

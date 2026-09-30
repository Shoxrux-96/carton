const norm = (s?: string) => (s || "").trim().toLowerCase();

// Korxonamiz ro'yxatidan korxona bilan moslik (har ikki tomonda qisman moslashuv ham)
// yoki nomda "shovot carton" bo'lsa — bizniki
export function isOursCompany(name: string, companies: any[]): boolean {
  const a = norm(name);
  if (!a) return false;
  if (a.includes("shovot carton")) return true;
  return companies.some(c => {
    const b = norm(c?.name);
    return b && (a === b || a.includes(b) || b.includes(a));
  });
}

// Avtomatik kategoriya (API bilan bir xil qoida, hech qachon bo'sh qaytmaydi):
// 1) yuboruvchi bizniki → "Sotuv" (mahsulot chiqim / sotuv)
// 2) qabul qiluvchi bizniki → "Xarid" (material kirim / xarid)
// 3) ikkalasi ham bizniki emas → mahsulot nomi kirsа "Sotuv", aks holda "Xarid"
export function getWaybillCategory(
  sender: string,
  receiver: string,
  companies: any[] = [],
  itemNames?: string[],
  productNames?: string[],
): string {
  if (isOursCompany(sender, companies)) return "Sotuv";
  if (isOursCompany(receiver, companies)) return "Xarid";
  const names = (itemNames || []).map(norm).filter(Boolean);
  const pnames = (productNames || []).map(norm).filter(Boolean);
  if (names.length > 0 && pnames.length > 0) {
    const hasProduct = names.some(n => pnames.some(p => n === p || n.includes(p) || p.includes(n)));
    if (hasProduct) return "Sotuv";
  }
  return "Xarid";
}

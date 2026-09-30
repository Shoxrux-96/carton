import L from "leaflet";

// Xaritadagi nuqta uchun igna (pin) belgisi — tashqi resurslarga bog'lanmaydi
export function makePinIcon(color: string): L.DivIcon {
  const html =
    `<svg width="34" height="46" viewBox="0 0 32 44" xmlns="http://www.w3.org/2000/svg" style="filter:drop-shadow(0 2px 3px rgba(0,0,0,.45))">` +
    `<path d="M16 1C7.7 1 1 7.7 1 16c0 10.4 15 27 15 27s15-16.6 15-27C31 7.7 24.3 1 16 1z" fill="${color}" stroke="#ffffff" stroke-width="2.5"/>` +
    `<circle cx="16" cy="15.5" r="5.5" fill="#ffffff"/>` +
    `</svg>`;
  return L.divIcon({ className: "", html, iconSize: [34, 46], iconAnchor: [17, 46] });
}

// Tanlangan nuqta uchun umumiy qizil igna
export const pinIcon = makePinIcon("#ef4444");

// Ombor uchun to'q sariq igna
export const warehousePinIcon = makePinIcon("#f97316");

import React, { useState, useRef, useEffect } from "react";
import { View, StyleSheet, Text, TouchableOpacity } from "react-native";
import { apiFetch } from "../api";
import { colors } from "../theme";
import { buildDriverMap } from "../lib/mapHtml";
import { MapFrame, postMap } from "../components/MapFrame";
import { syncUserProfile } from "../lib/employee-profile";
import * as Location from "expo-location";

type LatLng = { lat: number; lng: number };

// Matndagi manzildan "lat,lng" juftligini ajratish
function parseLatLng(s?: string | null): LatLng | null {
  if (!s) return null;
  const m = String(s).match(/(-?\d{1,3}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)/);
  if (!m) return null;
  const lat = Number(m[1]);
  const lng = Number(m[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

// Nominatim orqali matnli manzilni koordinataga aylantirish
async function geocode(q: string): Promise<LatLng | null> {
  try {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`
    );
    const j = await r.json();
    if (j && j[0]) return { lat: Number(j[0].lat), lng: Number(j[0].lon) };
  } catch {}
  return null;
}

// OSRM — yo'l bo'yicha optimal (road-snapped) marshrut
async function osrmRoute(a: LatLng, b: LatLng): Promise<number[][] | null> {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${a.lng},${a.lat};${b.lng},${b.lat}?overview=full&geometries=geojson`;
    const r = await fetch(url);
    const j = await r.json();
    const coords = j?.routes?.[0]?.geometry?.coordinates;
    if (Array.isArray(coords) && coords.length > 1) {
      return coords.map((c: number[]) => [c[1], c[0]]); // [lng,lat] → [lat,lng]
    }
  } catch {}
  return null;
}

const km = (a: LatLng, b: LatLng) => {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
};

// Haydovchi uchun to'liq ekran, jonli xarita:
// — real GPS lokatsiya (joyni kuzatadi)
// — qabul qilingan buyurtma manziliga optimal yo'l (ko'k)
// — ombordan mijozgacha yuk yo'li (to'q sariq)
export default function DriverMapScreen() {
  const [wh, setWh] = useState<LatLng>({ lat: 41.311081, lng: 69.240562 });
  const [sat, setSat] = useState(false);
  const [myLoc, setMyLoc] = useState<LatLng | null>(null);
  const [dest, setDest] = useState<(LatLng & { label: string }) | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const webRef = useRef<any>(null);
  const watchRef = useRef<any>(null);
  const destRef = useRef<LatLng | null>(null);
  const whRef = useRef<LatLng>(wh);
  const drvRouteAt = useRef<number>(0);
  const drvRoutePos = useRef<LatLng | null>(null);
  const fitted = useRef(false);
  const myLocRef = useRef<LatLng | null>(null);
  const readyRef = useRef(false);
  const queueRef = useRef<any[]>([]);

  // Xarita yuklanmaguncha xabarlar navbatda turadi, keyin yuboriladi
  const post = (msg: any) => {
    if (readyRef.current) postMap(webRef, msg);
    else queueRef.current.push(msg);
  };
  const onMapLoad = () => {
    readyRef.current = true;
    const q = queueRef.current.splice(0);
    q.forEach(m => postMap(webRef, m));
  };

  // Ombor → mijoz (yuk yo'li) chizish
  const drawCargoRoute = async (from: LatLng, to: LatLng) => {
    const pts = await osrmRoute(from, to);
    if (pts) {
      post({ type: "drawRoute", id: "wo", points: pts, color: "#f97316", weight: 5 });
      if (!fitted.current) {
        fitted.current = true;
        setTimeout(() => post({ type: "fit" }), 200);
      }
    }
  };

  // Haydovchi → mijoz (optimal, ko'k) — jonli qayta chizish
  const drawDriverRoute = async (from: LatLng, to: LatLng) => {
    const pts = await osrmRoute(from, to);
    if (pts) {
      post({ type: "drawRoute", id: "drv", points: pts, color: "#2563eb", weight: 6 });
      if (!fitted.current) {
        fitted.current = true;
        setTimeout(() => post({ type: "fit" }), 200);
      }
    }
  };

  // Qabul qilingan buyurtmani topish + manzilini aniqlash
  const loadOrder = async () => {
    try {
      const profile = await syncUserProfile();
      const employeeId = profile?.employeeId;
      const list: any[] = await apiFetch("/waybills").catch(() => []);
      const mine = (Array.isArray(list) ? list : [])
        .filter((w: any) => w.driverId === employeeId)
        .sort((a: any, b: any) => b.id - a.id);
      const active = mine.find((w: any) => w.deliveryStatus !== "delivered") || mine[0];

      if (!active) {
        setHint("Sizga biriktirilgan buyurtma yo'q");
        return;
      }

      // Manzil: 1) deliveryAddress "lat,lng", 2) mijoz koordinatasi, 3) geokod
      let pos = parseLatLng(active.deliveryAddress);
      const label = `${active.receiverCompany || "Mijoz"}${active.docNumber ? ` (#${active.docNumber})` : ""}`;

      if (!pos && active.receiverCompany) {
        try {
          const clients: any[] = await apiFetch("/clients").catch(() => []);
          const c = (Array.isArray(clients) ? clients : []).find(
            (c: any) => String(c.name || "").trim() === String(active.receiverCompany).trim()
          );
          if (c) {
            pos = parseLatLng(c.address);
            if (!pos && c.address) pos = await geocode(String(c.address));
          }
        } catch {}
      }
      if (!pos && active.deliveryAddress) {
        pos = await geocode(String(active.deliveryAddress));
      }

      if (!pos) {
        setHint("Buyurtma manzili aniqlanmadi");
        return;
      }

      setDest({ ...pos, label });
      destRef.current = pos;
      post({ type: "setDest", lat: pos.lat, lng: pos.lng, label });

      // Ombor → mijoz yuk yo'li
      drawCargoRoute(whRef.current, pos);

      // Agar GPS allaqachon ma'lum bo'lsa — haydovchi yo'li darhol
      if (myLocRef.current) drawDriverRoute(myLocRef.current, pos);
    } catch {
      setHint("Buyurtma yuklanmadi");
    }
  };

  useEffect(() => {
    (async () => {
      // Ombor manzili
      try {
        const settings = await apiFetch("/settings").catch(() => null);
        if (settings?.lat && settings?.lng) {
          const c = { lat: Number(settings.lat), lng: Number(settings.lng) };
          setWh(c);
          whRef.current = c;
          post({ type: "flyTo", lat: c.lat, lng: c.lng, z: 13 });
        }
      } catch {}

      // Buyurtma + yo'llar
      await loadOrder();

      // Real GPS — jonli kuzatuv
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          setHint(h => h || "GPS ruxsati berilmagan — lokatsiya ko'rsatilmaydi");
          return;
        }
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        onLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        watchRef.current = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.High, distanceInterval: 15, timeInterval: 4000 },
          p => onLoc({ lat: p.coords.latitude, lng: p.coords.longitude })
        );
      } catch {}
    })();
    return () => { try { watchRef.current?.remove(); } catch {} };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // GPS harakati → marker + yo'lni jonli qayta chizish (15 soniyada bir marta)
  const onLoc = (loc: LatLng) => {
    myLocRef.current = loc;
    setMyLoc(loc);
    post({ type: "myLoc", ...loc });

    const target = destRef.current;
    if (!target) return;
    const now = Date.now();
    const moved = drvRoutePos.current ? km(loc, drvRoutePos.current) * 1000 : Infinity;
    if (now - drvRouteAt.current > 15000 || moved > 30) {
      drvRouteAt.current = now;
      drvRoutePos.current = loc;
      drawDriverRoute(loc, target);
    }
  };

  return (
    <View style={s.root}>
      <MapFrame ref={webRef} html={buildDriverMap(wh.lat, wh.lng)} onLoad={onMapLoad} />

      {/* Sarlavha */}
      <View style={s.badge}>
        <Text style={s.badgeTxt}>🗺️ Xarita</Text>
      </View>

      {/* Yo'l izohi (legend) */}
      {dest && (
        <View style={s.legend}>
          <View style={s.legendRow}>
            <View style={[s.dot, { backgroundColor: "#2563eb" }]} />
            <Text style={s.legendTxt}>Haydovchi → Buyurtma (optimal)</Text>
          </View>
          <View style={s.legendRow}>
            <View style={[s.dot, { backgroundColor: "#f97316" }]} />
            <Text style={s.legendTxt}>Ombor → Buyurtma (yuk yo'li)</Text>
          </View>
        </View>
      )}

      {/* Ogohlantirish */}
      {hint && (
        <View style={s.hint}>
          <Text style={s.hintTxt}>ℹ️ {hint}</Text>
        </View>
      )}

      {/* Zoom tugmalari */}
      <View style={s.zoomCol}>
        <TouchableOpacity style={s.zoomBtn} onPress={() => post({ type: "zoomIn" })} activeOpacity={0.7}>
          <Text style={s.zoomTxt}>＋</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.zoomBtn} onPress={() => post({ type: "zoomOut" })} activeOpacity={0.7}>
          <Text style={s.zoomTxt}>−</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.zoomBtn, { backgroundColor: "#eff6ff" }]} onPress={() => {
          if (myLocRef.current) post({ type: "flyTo", ...myLocRef.current, z: 16 });
          else post({ type: "locate" });
        }} activeOpacity={0.7}>
          <Text style={s.zoomTxt}>📍</Text>
        </TouchableOpacity>
      </View>

      {/* Ko'cha / Sun'iy yo'ldosh */}
      <View style={s.layerBar}>
        <TouchableOpacity
          style={[s.layerBtn, !sat && s.layerBtnOn]}
          onPress={() => { setSat(false); post({ type: "street" }); }}
          activeOpacity={0.8}
        >
          <Text style={[s.layerTxt, !sat && s.layerTxtOn]}>🗺️ Ko'cha</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.layerBtn, sat && s.layerBtnOn]}
          onPress={() => { setSat(true); post({ type: "sat" }); }}
          activeOpacity={0.8}
        >
          <Text style={[s.layerTxt, sat && s.layerTxtOn]}>🛰️ Sun'iy yo'ldosh</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#e8e8e8" },
  badge: {
    position: "absolute", top: 12, left: 12,
    backgroundColor: "rgba(255,255,255,0.95)", borderRadius: 999,
    paddingHorizontal: 12, paddingVertical: 7,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18, shadowRadius: 6, elevation: 4,
  },
  badgeTxt: { fontSize: 12, fontWeight: "800", color: colors.text },
  legend: {
    position: "absolute", top: 52, left: 12,
    backgroundColor: "rgba(255,255,255,0.95)", borderRadius: 12,
    paddingHorizontal: 10, paddingVertical: 8, gap: 5,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15, shadowRadius: 5, elevation: 3,
  },
  legendRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  dot: { width: 14, height: 4, borderRadius: 2 },
  legendTxt: { fontSize: 10, fontWeight: "700", color: colors.textSecondary },
  hint: {
    position: "absolute", top: 52, right: 12, maxWidth: 220,
    backgroundColor: "rgba(255,251,235,0.97)", borderRadius: 12,
    paddingHorizontal: 10, paddingVertical: 8, borderWidth: 1, borderColor: "#fcd34d",
  },
  hintTxt: { fontSize: 10, fontWeight: "700", color: "#92400e" },
  zoomCol: { position: "absolute", top: 12, right: 12, gap: 8 },
  zoomBtn: {
    width: 44, height: 44, borderRadius: 12, backgroundColor: "#fff",
    alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.22, shadowRadius: 6, elevation: 5,
  },
  zoomTxt: { fontSize: 22, fontWeight: "800", color: "#1c1917", lineHeight: 26 },
  layerBar: {
    position: "absolute", bottom: 18, left: "50%", marginLeft: -130,
    width: 260, flexDirection: "row", gap: 8,
    backgroundColor: "rgba(255,255,255,0.96)", borderRadius: 999,
    padding: 6, justifyContent: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2, shadowRadius: 8, elevation: 6,
  },
  layerBtn: {
    flex: 1, borderRadius: 999, paddingVertical: 9, paddingHorizontal: 10,
    alignItems: "center", backgroundColor: "#fff",
  },
  layerBtnOn: { backgroundColor: colors.primary },
  layerTxt: { fontSize: 11, fontWeight: "800", color: "#475569", textAlign: "center" },
  layerTxtOn: { color: "#fff" },
});

import React, { useEffect, useMemo, useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet,
} from "react-native";
import { colors, radius } from "../theme";

// Web saytdagi CompanyAutocomplete bilan bir xil: mijozlar ro'yxatidan
// korxona nomini avtomatik tavsiya qiladi, tanlanganda telefonni ham to'ldiradi.
export default function CompanyAutocomplete({
  value, phone, clients, onChange, placeholder, inputStyle,
}: {
  value: string;
  phone?: string;
  clients: any[];
  onChange: (name: string, phone: string) => void;
  placeholder?: string;
  inputStyle?: any;
}) {
  const [query, setQuery] = useState(value || "");
  const [open, setOpen] = useState(false);

  useEffect(() => { setQuery(value || ""); }, [value]);

  const filtered = useMemo(() => {
    const list = Array.isArray(clients) ? clients : [];
    const q = (query || "").trim().toLowerCase();
    const base = q
      ? list.filter(c =>
          (c?.name || "").toLowerCase().includes(q) ||
          (c?.companyName || "").toLowerCase().includes(q) ||
          String(c?.phone || "").includes(q))
      : list;
    return base.slice(0, 10);
  }, [query, clients]);

  const select = (c: any) => {
    const name = c?.companyName || c?.name || "";
    setQuery(name);
    setOpen(false);
    onChange(name, c?.phone || "");
  };

  return (
    <View style={s.wrap}>
      <TextInput
        style={[s.input, inputStyle]}
        value={query}
        onChangeText={t => { setQuery(t); setOpen(true); onChange(t, phone || ""); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 180)}
        placeholder={placeholder || "Kompaniya nomi"}
        placeholderTextColor={colors.textMuted}
        autoCorrect={false}
      />
      {open && filtered.length > 0 && (
        <View style={s.dropdown}>
          <ScrollView style={{ maxHeight: 210 }} keyboardShouldPersistTaps="handled">
            {filtered.map((c: any, i: number) => (
              <TouchableOpacity
                key={c?.id ?? i}
                style={s.item}
                onPress={() => select(c)}
                activeOpacity={0.6}
              >
                <View style={{ flex: 1 }}>
                  <Text style={s.itemName} numberOfLines={1}>{c?.companyName || c?.name || ""}</Text>
                  {!!c?.phone && <Text style={s.itemPhone}>{c.phone}</Text>}
                </View>
                <Text style={s.itemArrow}>✓</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { position: "relative", zIndex: 999 },
  input: {
    height: 44, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md,
    paddingHorizontal: 12, fontSize: 14, color: colors.text, backgroundColor: colors.surfaceAlt,
  },
  dropdown: {
    position: "absolute", top: "100%", left: 0, right: 0, marginTop: 4,
    backgroundColor: "#fff", borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border,
    zIndex: 1000, elevation: 12, overflow: "hidden",
    shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 10, shadowOffset: { width: 0, height: 4 },
  },
  item: {
    flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#e5e7eb",
  },
  itemName: { fontSize: 14, fontWeight: "600", color: colors.text },
  itemPhone: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  itemArrow: { fontSize: 12, color: colors.primary, fontWeight: "700", marginLeft: 8 },
});

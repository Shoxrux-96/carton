import React, { useState, useCallback, useMemo, useEffect } from "react";
import {
  View, Text, ScrollView, StyleSheet, RefreshControl,
  TouchableOpacity, TextInput, Modal, Alert, Linking,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { apiFetch } from "../api";
import { colors, radius, shadows, spacing } from "../theme";
import LocationPicker from "../components/LocationPicker";

const formatSum = (n: number) => n.toLocaleString("uz-UZ") + " so'm";
const n = (s: string) => parseFloat(s) || 0;

const generateOrderCode = () => {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let code = "";
  for (let i = 0; i < 2; i++) code += letters[Math.floor(Math.random() * letters.length)];
  for (let i = 0; i < 4; i++) code += Math.floor(Math.random() * 10);
  return code;
};

const deliveryProgressConfig: Record<string, { label: string; bg: string; text: string }> = {
  pending: { label: "Kutilmoqda", bg: "#f3f4f6", text: "#6b7280" },
  shipped: { label: "Yuborilgan", bg: "#dbeafe", text: "#2563eb" },
  in_transit: { label: "Yo'lda", bg: "#fef3c7", text: "#d97706" },
  delivered: { label: "Yetkazilgan", bg: "#dcfce7", text: "#16a34a" },
};

interface OrderItem {
  id?: number;
  name: string;
  quantity: number;
  price: number;
  notes?: string;
  productId?: number;
}

export default function OrdersScreen() {
  const [orders, setOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState<"all" | "day" | "month" | "year">("all");
  const [filterDate, setFilterDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  const [selectedClientId, setSelectedClientId] = useState<number>(0);
  const [coordinates, setCoordinates] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<OrderItem[]>([{ name: "", quantity: 1, price: 0 }]);

  const load = async () => {
    try {
      const [o, p, c, inv] = await Promise.all([
        apiFetch("/orders"), apiFetch("/products"), apiFetch("/clients"), apiFetch("/inventory"),
      ]);
      setOrders(Array.isArray(o) ? o : []);
      setProducts(Array.isArray(p) ? p : []);
      setClients(Array.isArray(c) ? c : []);
      setInventory(Array.isArray(inv) ? inv : []);
    } catch {}
  };

  useFocusEffect(useCallback(() => { void load(); }, []));
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  useEffect(() => { setPage(1); }, [dateFilter, pageSize]);

  const stockMap = useMemo(() => {
    const m: Record<number, number> = {};
    inventory.forEach((inv: any) => { m[inv.productId] = (m[inv.productId] || 0) + inv.quantity; });
    return m;
  }, [inventory]);

  const clientsMap = useMemo(() => {
    if (!Array.isArray(clients)) return {};
    return Object.fromEntries(clients.map((c: any) => [c.id, c]));
  }, [clients]);

  useEffect(() => {
    if (!editing && selectedClientId) {
      const client = clientsMap[selectedClientId];
      setCoordinates(client?.address || "");
    }
  }, [selectedClientId, editing, clientsMap]);

  const selectedClient = useMemo(() => {
    if (!selectedClientId) return null;
    return clientsMap[selectedClientId] || null;
  }, [selectedClientId, clientsMap]);

  const filteredOrders = useMemo(() => {
    let filtered = orders.filter((o: any) => (o.orderType || "delivery") === "delivery");
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter((o: any) => {
        const clientName = o.clientName || clientsMap[o.clientId]?.name || "";
        return (o.orderCode || "").toLowerCase().includes(q) || clientName.toLowerCase().includes(q);
      });
    }
    if (dateFilter !== "all") {
      const today = new Date().toISOString().split("T")[0];
      const fd = new Date(filterDate);
      filtered = filtered.filter((o: any) => {
        const d = new Date(o.createdAt);
        if (isNaN(d.getTime())) return true;
        if (dateFilter === "day") return d.toISOString().split("T")[0] === today;
        if (dateFilter === "month") return d.getFullYear() === fd.getFullYear() && d.getMonth() === fd.getMonth();
        if (dateFilter === "year") return d.getFullYear() === fd.getFullYear();
        return true;
      });
    }
    return filtered;
  }, [orders, search, dateFilter, filterDate, clientsMap]);

  const sortedOrders = useMemo(() => {
    return [...filteredOrders].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [filteredOrders]);

  const totalPages = Math.max(1, Math.ceil(sortedOrders.length / pageSize));
  const paginatedOrders = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedOrders.slice(start, start + pageSize);
  }, [sortedOrders, page, pageSize]);

  const pendingCount = orders.filter(o => o.deliveryStatus === "pending").length;
  const shippedCount = orders.filter(o => o.deliveryStatus === "shipped").length;
  const inTransitCount = orders.filter(o => o.deliveryStatus === "in_transit").length;
  const deliveredCount = orders.filter(o => o.deliveryStatus === "delivered").length;
  const totalSum = filteredOrders.reduce((s, o) => s + (o.totalSum || 0), 0);

  const resetForm = () => {
    setSelectedClientId(0); setCoordinates(""); setNotes("");
    setItems([{ name: "", quantity: 1, price: 0 }]); setEditing(null);
  };

  const openAdd = () => { resetForm(); setShowModal(true); };

  const openEdit = (order: any) => {
    setEditing(order);
    setSelectedClientId(order.clientId || 0);
    setNotes(order.notes || "");
    setCoordinates(order.deliveryAddress || "");
    if (Array.isArray(order.items) && order.items.length > 0) {
      setItems(order.items.map((i: any) => ({
        name: i.name || "", quantity: i.quantity || 1, price: i.price || 0, productId: i.productId,
      })));
    } else {
      setItems([{ name: order.productName || "", quantity: order.quantity || 1, price: order.productPrice || 0 }]);
    }
    setShowModal(true);
  };

  const addItem = () => setItems([...items, { name: "", quantity: 1, price: 0 }]);
  const removeItem = (idx: number) => { if (items.length > 1) setItems(items.filter((_, i) => i !== idx)); };
  const updateItem = (idx: number, field: keyof OrderItem, value: any) => {
    setItems(items.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  };
  const selectProduct = (idx: number, productId: number) => {
    const p = products.find((pr: any) => pr.id === productId);
    if (p) setItems(items.map((item, i) => i === idx ? { ...item, productId: p.id, name: p.name, price: p.price } : item));
  };

  const itemsTotal = items.reduce((s, i) => s + i.quantity * i.price, 0);

  const validateItems = (): string | null => {
    for (const item of items) {
      if (!item.name.trim()) return "Mahsulot nomini kiriting";
      if (item.quantity < 1) return "Miqdor 1 dan kam bo'lishi mumkin emas";
    }
    return null;
  };

  const submitOrder = async () => {
    const err = validateItems();
    if (err) { Alert.alert("Xatolik", err); return; }
    if (!selectedClientId) { Alert.alert("Xatolik", "Mijozni tanlang"); return; }

    for (const item of items) {
      if (!item.productId) continue;
      const stock = stockMap[item.productId] || 0;
      if (item.quantity > stock) {
        Alert.alert("Xatolik", `"${item.name}" uchun omborda yetarli mahsulot yo'q! Mavjud: ${stock} dona`);
        return;
      }
    }

    setSaving(true);
    try {
      const totalSum = items.reduce((s, i) => s + i.quantity * i.price, 0);
      const firstItem = items[0];
      let productId = firstItem?.productId || 0;
      if (!productId && Array.isArray(products)) {
        const found = products.find((p: any) => p.name === firstItem?.name);
        if (found) productId = found.id;
      }
      const client = clientsMap[selectedClientId];
      const payload = {
        orderType: "delivery",
        clientId: selectedClientId,
        productId,
        quantity: items.reduce((s, i) => s + i.quantity, 0),
        notes,
        deliveryAddress: coordinates,
        orderCode: editing ? editing.orderCode || generateOrderCode() : generateOrderCode(),
        items: items.map(item => ({ productId: item.productId, name: item.name.trim(), quantity: item.quantity, price: item.price })),
        totalSum,
        clientName: client?.name || "",
        clientPhone: client?.phone || "",
      };

      if (editing) {
        await apiFetch(`/orders/${editing.id}`, { method: "PUT", body: JSON.stringify(payload) });
      } else {
        await apiFetch("/orders", { method: "POST", body: JSON.stringify(payload) });
      }

      // Deduct stock
      try {
        for (const item of items) {
          if (!item.productId) continue;
          await apiFetch("/sales", {
            method: "POST",
            body: JSON.stringify({ productId: item.productId, quantity: item.quantity, warehouseId: 1 }),
          });
        }
      } catch {}

      Alert.alert("Muvaffaqiyat", editing ? "Buyurtma yangilandi" : "Buyurtma yaratildi");
      setShowModal(false); resetForm(); await load();
    } catch (e: any) { Alert.alert("Xatolik", e.message); }
    finally { setSaving(false); }
  };

  const updateStatus = async (id: number, value: string) => {
    try {
      await apiFetch(`/orders/${id}`, { method: "PUT", body: JSON.stringify({ deliveryStatus: value }) });
      await load();
    } catch (e: any) { Alert.alert("Xatolik", e.message); }
  };

  const deleteOrder = async (id: number) => {
    Alert.alert("O'chirish", "Buyurtmani o'chirmoqchimisiz?", [
      { text: "Yo'q" },
      { text: "Ha", style: "destructive", onPress: async () => {
        try { await apiFetch(`/orders/${id}`, { method: "DELETE" }); await load(); } catch (e: any) {
          Alert.alert("Xatolik", e.message);
        }
      }},
    ]);
  };

  const formatCoords = (addr: string) => {
    if (!addr) return null;
    const parts = addr.split(",").map(Number);
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      return `${parts[0].toFixed(4)}, ${parts[1].toFixed(4)}`;
    }
    return addr;
  };

  const formatDate = (d: string) => {
    if (!d) return "";
    const dt = new Date(d);
    return `${String(dt.getDate()).padStart(2, "0")}.${String(dt.getMonth() + 1).padStart(2, "0")} ${String(dt.getHours()).padStart(2, "0")}:${String(dt.getMinutes()).padStart(2, "0")}`;
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background,  }}>
      {/* Header */}
      <View style={styles.topHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.topTitle}>Buyurtmalar</Text>
          <Text style={styles.topSub}>{sortedOrders.length} ta buyurtma • {formatSum(totalSum)}</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
          <Text style={styles.addBtnText}>+ Yangi</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <TextInput style={styles.searchInput} value={search} onChangeText={setSearch} placeholder="🔍 Buyurtma qidirish..." placeholderTextColor={colors.textMuted} />
      </View>

      {/* Date filter */}
      <View style={styles.filterRow}>
        {([["all", "Hammasi"], ["day", "Bugun"], ["month", "Oy"], ["year", "Yil"]] as const).map(([key, label]) => (
          <TouchableOpacity key={key} style={[styles.filterBtn, dateFilter === key && styles.filterBtnActive]} onPress={() => setDateFilter(key)}>
            <Text style={[styles.filterBtnText, dateFilter === key && { color: "#fff" }]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={[styles.statVal, { color: "#d97706" }]}>{pendingCount}</Text>
          <Text style={styles.statLabel}>Kutilmoqda</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statVal, { color: "#2563eb" }]}>{shippedCount}</Text>
          <Text style={styles.statLabel}>Yuborilgan</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statVal, { color: "#ea580c" }]}>{inTransitCount}</Text>
          <Text style={styles.statLabel}>Yo'lda</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statVal, { color: "#16a34a" }]}>{deliveredCount}</Text>
          <Text style={styles.statLabel}>Yetkazilgan</Text>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {paginatedOrders.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🛒</Text>
            <Text style={styles.emptyText}>Buyurtmalar topilmadi</Text>
            <Text style={styles.emptyHint}>"Yangi" tugmasini bosib buyurtma yarating</Text>
          </View>
        ) : paginatedOrders.map((order) => {
          const clientFromMap = clientsMap[order.clientId];
          const clientName = order.clientName || clientFromMap?.name || "";
          const clientPhone = order.clientPhone || clientFromMap?.phone || "";
          const coords = formatCoords(order.deliveryAddress || "");
          const st = deliveryProgressConfig[order.deliveryStatus] || deliveryProgressConfig.pending;

          return (
            <View key={order.id} style={styles.card}>
              {/* Header */}
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.orderCode}>#{order.orderCode || order.id}</Text>
                  <Text style={styles.clientName}>👤 {clientName || "Noma'lum"}</Text>
                  {clientPhone ? (
                    <TouchableOpacity onPress={() => Linking.openURL(`tel:${clientPhone}`)}>
                      <Text style={styles.clientPhone}>📞 {clientPhone}</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
                <View style={[styles.statusBadge, { backgroundColor: st.bg }]}>
                  <Text style={[styles.statusText, { color: st.text }]}>{st.label}</Text>
                </View>
              </View>

              {/* Items */}
              {Array.isArray(order.items) && order.items.length > 0 ? (
                order.items.map((item: any, i: number) => (
                  <View key={item.id ?? item.productId ?? `${item.name}-${i}`} style={styles.itemRow}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    <Text style={styles.itemDetail}>{item.quantity} ta</Text>
                  </View>
                ))
              ) : (
                <View style={styles.itemRow}>
                  <Text style={styles.itemName}>{order.productName || order.materialName || "—"}</Text>
                  <Text style={styles.itemDetail}>{order.quantity} ta</Text>
                </View>
              )}

              {/* Footer */}
              <View style={styles.cardFooter}>
                <View>
                  <Text style={styles.footerLabel}>Jami summa</Text>
                  <Text style={styles.footerVal}>{formatSum(order.totalSum || 0)}</Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={styles.footerLabel}>Sana</Text>
                  <Text style={styles.footerVal}>{formatDate(order.createdAt)}</Text>
                </View>
              </View>

              {/* Location */}
              {coords && (
                <View style={styles.locationRow}>
                  <Text style={styles.locationText}>📍 {coords}</Text>
                </View>
              )}

              {/* Status change */}
              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>Yetkazish holati:</Text>
                <View style={styles.statusButtons}>
                  {Object.entries(deliveryProgressConfig).map(([key, cfg]) => (
                    <TouchableOpacity
                      key={key}
                      style={[styles.statusBtn, order.deliveryStatus === key && { backgroundColor: cfg.bg, borderColor: cfg.text }]}
                      onPress={() => updateStatus(order.id, key)}
                      disabled={order.deliveryStatus === "delivered"}
                    >
                      <Text style={[styles.statusBtnText, order.deliveryStatus === key && { color: cfg.text, fontWeight: "700" }]}>{cfg.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Actions */}
              <View style={styles.actionRow}>
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: "#dbeafe" }]} onPress={() => openEdit(order)}>
                  <Text style={[styles.actionText, { color: "#2563eb" }]}>✏️ Tahrirlash</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: "#fee2e2" }]} onPress={() => deleteOrder(order.id)}>
                  <Text style={[styles.actionText, { color: "#dc2626" }]}>🗑️ O'chirish</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}

        {/* Pagination */}
        {totalPages > 1 && (
          <View style={styles.paginationRow}>
            <TouchableOpacity style={[styles.pageBtn, page <= 1 && { opacity: 0.3 }]} onPress={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>
              <Text style={styles.pageBtnText}>◀</Text>
            </TouchableOpacity>
            {Array.from({ length: totalPages }, (_, i) => i + 1).filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1).map((p, idx, arr) => (
              <React.Fragment key={p}>
                {idx > 0 && arr[idx - 1] !== p - 1 && <Text style={styles.pageDots}>...</Text>}
                <TouchableOpacity style={[styles.pageNum, page === p && styles.pageNumActive]} onPress={() => setPage(p)}>
                  <Text style={[styles.pageNumText, page === p && { color: "#fff" }]}>{p}</Text>
                </TouchableOpacity>
              </React.Fragment>
            ))}
            <TouchableOpacity style={[styles.pageBtn, page >= totalPages && { opacity: 0.3 }]} onPress={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
              <Text style={styles.pageBtnText}>▶</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={openAdd} activeOpacity={0.8}>
        <Text style={styles.fabText}>＋</Text>
      </TouchableOpacity>

      {/* Modal */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editing ? "✏️ Tahrirlash" : "Yangi yetkazish"}</Text>
              <TouchableOpacity onPress={() => { setShowModal(false); resetForm(); }}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Client select */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>👤 Mijoz *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {clients.filter(c => c.type === "customer").map(c => (
                  <TouchableOpacity key={c.id} style={[styles.clientChip, selectedClientId === c.id && styles.clientChipActive]} onPress={() => setSelectedClientId(c.id)}>
                    <Text style={[styles.clientChipText, selectedClientId === c.id && { color: "#fff" }]}>{c.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              {selectedClient && (
                <View style={styles.clientInfo}>
                  {selectedClient.phone ? <Text style={styles.clientInfoText}>📞 {selectedClient.phone}</Text> : null}
                  {selectedClient.address ? <Text style={styles.clientInfoText}>📍 {selectedClient.address}</Text> : null}
                  {selectedClient.source ? <Text style={styles.clientInfoText}>ℹ️ {selectedClient.source}</Text> : null}
                </View>
              )}
            </View>

            {/* Items */}
            <View style={styles.fieldGroup}>
              <View style={styles.itemsHeader}>
                <Text style={styles.fieldLabel}>📦 Mahsulotlar</Text>
                <TouchableOpacity onPress={addItem} style={styles.addItemBtn}>
                  <Text style={styles.addItemText}>+ Qo'shish</Text>
                </TouchableOpacity>
              </View>

              {items.map((item, idx) => (
                <View key={idx} style={styles.itemCard}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                    {products.map(p => {
                      const stock = stockMap[p.id] || 0;
                      const low = stock <= 0;
                      return (
                        <TouchableOpacity key={p.id} style={[styles.prodChip, item.productId === p.id && styles.prodChipActive]} onPress={() => selectProduct(idx, p.id)}>
                          <Text style={[styles.prodChipText, item.productId === p.id && { color: "#fff" }]}>
                            {p.name} ({stock})
                          </Text>
                          {low && <View style={styles.lowDot} />}
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                  {item.productId && item.quantity > (stockMap[item.productId] || 0) && (
                    <View style={styles.stockWarning}>
                      <Text style={styles.stockWarningText}>⚠️ Omborda yetarli emas ({stockMap[item.productId] || 0} dona)</Text>
                    </View>
                  )}
                  <View style={styles.itemInputRow}>
                    <TextInput style={[styles.itemInput, { flex: 1 }]} value={String(item.quantity)} onChangeText={v => updateItem(idx, "quantity", Math.max(1, Number(v) || 0))} placeholder="Soni" keyboardType="numeric" placeholderTextColor={colors.textMuted} />
                    <TextInput style={[styles.itemInput, { flex: 1 }]} value={String(item.price)} onChangeText={v => updateItem(idx, "price", Math.max(0, Number(v) || 0))} placeholder="Narxi" keyboardType="numeric" placeholderTextColor={colors.textMuted} />
                    <Text style={styles.itemSum}>{formatSum(item.quantity * item.price)}</Text>
                    {items.length > 1 && (
                      <TouchableOpacity onPress={() => removeItem(idx)} style={styles.removeBtn}>
                        <Text style={{ fontSize: 16 }}>🗑️</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ))}

              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Jami summa:</Text>
                <Text style={styles.totalValue}>{formatSum(itemsTotal)}</Text>
              </View>
            </View>

            {/* Location */}
            <LocationPicker value={coordinates} onChange={setCoordinates} />

            {/* Notes */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>💬 Izoh</Text>
              <TextInput style={styles.fieldInput} value={notes} onChangeText={setNotes} placeholder="Qo'shimcha ma'lumot" placeholderTextColor={colors.textMuted} />
            </View>

            {/* Actions */}
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => { setShowModal(false); resetForm(); }}>
                <Text style={styles.cancelText}>Bekor</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={submitOrder} disabled={saving}>
                <Text style={styles.saveText}>{saving ? "Saqlanmoqda..." : "Saqlash"}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  topHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm,
  },
  topTitle: { fontSize: 20, fontWeight: "800", color: colors.text },
  topSub: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  addBtn: { backgroundColor: colors.primary, paddingHorizontal: 16, paddingVertical: 10, borderRadius: radius.lg, ...shadows.sm },
  addBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  searchWrap: { paddingHorizontal: spacing.lg, marginBottom: spacing.sm },
  searchInput: { height: 44, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.lg, paddingHorizontal: 14, fontSize: 14, color: colors.text, backgroundColor: colors.surface },
  filterRow: { flexDirection: "row", gap: 6, paddingHorizontal: spacing.lg, marginBottom: spacing.sm },
  filterBtn: { flex: 1, paddingVertical: 8, borderRadius: radius.md, backgroundColor: colors.surfaceAlt, alignItems: "center" },
  filterBtnActive: { backgroundColor: colors.primary },
  filterBtnText: { fontSize: 11, fontWeight: "700", color: colors.textSecondary },
  statsRow: { flexDirection: "row", gap: 6, paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  statCard: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.sm, alignItems: "center", ...shadows.sm },
  statVal: { fontSize: 18, fontWeight: "800" },
  statLabel: { fontSize: 9, color: colors.textMuted, marginTop: 2 },
  listContent: { padding: spacing.lg, paddingBottom: 100 },
  empty: { padding: 60, alignItems: "center" },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: colors.text, fontWeight: "700", fontSize: 16 },
  emptyHint: { color: colors.textMuted, marginTop: 6, textAlign: "center" },

  card: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.lg, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.borderLight, ...shadows.sm },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 },
  orderCode: { fontSize: 11, fontWeight: "600", color: colors.textMuted, fontFamily: "monospace" },
  clientName: { fontSize: 15, fontWeight: "700", color: colors.text, marginTop: 2 },
  clientPhone: { fontSize: 12, color: colors.primary, marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 10, fontWeight: "700" },
  itemRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4, borderTopWidth: 0.5, borderTopColor: colors.borderLight },
  itemName: { fontSize: 13, fontWeight: "600", color: colors.text, flex: 1 },
  itemDetail: { fontSize: 12, color: colors.textSecondary, marginLeft: 8 },
  cardFooter: { flexDirection: "row", justifyContent: "space-between", paddingTop: 8, marginTop: 4, borderTopWidth: 1, borderTopColor: colors.borderLight },
  footerLabel: { fontSize: 10, color: colors.textMuted },
  footerVal: { fontSize: 13, fontWeight: "700", color: colors.text, marginTop: 2 },
  locationRow: { marginTop: 6, paddingVertical: 4 },
  locationText: { fontSize: 11, color: colors.textSecondary },
  statusRow: { marginTop: 8 },
  statusLabel: { fontSize: 11, fontWeight: "600", color: colors.textSecondary, marginBottom: 6 },
  statusButtons: { flexDirection: "row", gap: 4, flexWrap: "wrap" },
  statusBtn: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 6, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border },
  statusBtnText: { fontSize: 10, fontWeight: "600", color: colors.textSecondary },
  actionRow: { flexDirection: "row", gap: 8, marginTop: 10, paddingTop: 8, borderTopWidth: 0.5, borderTopColor: colors.borderLight },
  actionBtn: { flex: 1, paddingVertical: 8, borderRadius: radius.md, alignItems: "center" },
  actionText: { fontSize: 12, fontWeight: "700" },

  paginationRow: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 4, paddingVertical: 12 },
  pageBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: colors.surfaceAlt, justifyContent: "center", alignItems: "center" },
  pageBtnText: { fontSize: 12, fontWeight: "700", color: colors.textSecondary },
  pageNum: { width: 32, height: 32, borderRadius: 8, backgroundColor: colors.surfaceAlt, justifyContent: "center", alignItems: "center" },
  pageNumActive: { backgroundColor: colors.primary },
  pageNumText: { fontSize: 12, fontWeight: "700", color: colors.textSecondary },
  pageDots: { fontSize: 12, color: colors.textMuted },

  fab: { position: "absolute", bottom: 24, right: 20, width: 60, height: 60, borderRadius: 30, backgroundColor: colors.primary, justifyContent: "center", alignItems: "center", ...shadows.lg, zIndex: 100 },
  fabText: { fontSize: 28, color: "#fff", fontWeight: "300", marginTop: -2 },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalScroll: { maxHeight: "92%", backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  modalContent: { padding: spacing.xxl, paddingBottom: 40 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.lg },
  modalTitle: { fontSize: 20, fontWeight: "800", color: colors.text },
  modalClose: { fontSize: 24, color: colors.textMuted },
  fieldGroup: { marginBottom: spacing.lg },
  fieldLabel: { fontSize: 13, fontWeight: "700", color: colors.textSecondary, marginBottom: 8 },
  fieldInput: { height: 48, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 14, fontSize: 15, color: colors.text, backgroundColor: colors.surfaceAlt },
  clientChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.full, backgroundColor: colors.surfaceAlt, marginRight: 8, borderWidth: 1.5, borderColor: colors.border },
  clientChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  clientChipText: { fontSize: 13, fontWeight: "600", color: colors.text },
  clientInfo: { marginTop: 8, padding: 10, backgroundColor: "#f8fafc", borderRadius: radius.md, borderWidth: 1, borderColor: colors.borderLight },
  clientInfoText: { fontSize: 12, color: colors.textSecondary, marginBottom: 3 },
  itemsHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  addItemBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.full, backgroundColor: colors.surfaceAlt },
  addItemText: { fontSize: 12, fontWeight: "600", color: colors.primary },
  itemCard: { backgroundColor: colors.surfaceAlt, borderRadius: radius.md, padding: 10, marginBottom: 8, borderWidth: 1, borderColor: colors.border },
  prodChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.full, backgroundColor: colors.surface, marginRight: 6, borderWidth: 1, borderColor: colors.border, flexDirection: "row", alignItems: "center", gap: 4 },
  prodChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  prodChipText: { fontSize: 11, fontWeight: "600", color: colors.text },
  lowDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#dc2626" },
  stockWarning: { backgroundColor: "#fef2f2", padding: 6, borderRadius: 6, marginBottom: 6 },
  stockWarningText: { fontSize: 10, fontWeight: "600", color: "#dc2626" },
  itemInputRow: { flexDirection: "row", gap: 6, alignItems: "center" },
  itemInput: { height: 40, borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 10, fontSize: 14, color: colors.text, backgroundColor: colors.surface },
  itemSum: { fontSize: 12, fontWeight: "700", color: colors.primary, minWidth: 70, textAlign: "right" },
  removeBtn: { padding: 4 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.border },
  totalLabel: { fontSize: 13, color: colors.textSecondary },
  totalValue: { fontSize: 18, fontWeight: "800", color: colors.primary },
  modalActions: { flexDirection: "row", gap: 12, marginTop: spacing.xl },
  cancelBtn: { flex: 1, height: 50, backgroundColor: colors.surfaceAlt, borderRadius: radius.lg, justifyContent: "center", alignItems: "center" },
  cancelText: { fontSize: 15, fontWeight: "600", color: colors.textSecondary },
  saveBtn: { flex: 1, height: 50, backgroundColor: colors.primary, borderRadius: radius.lg, justifyContent: "center", alignItems: "center", ...shadows.sm },
  saveText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});

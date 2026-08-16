import React, { useState, useCallback, useMemo } from "react";
import {
  View, Text, ScrollView, StyleSheet, RefreshControl,
  TouchableOpacity, TextInput, Modal, Alert, Dimensions,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { apiFetch } from "../api";
import { colors, radius, shadows, spacing } from "../theme";

const { width } = Dimensions.get("window");
const formatSum = (n: number) => n.toLocaleString("uz-UZ") + " so'm";

const deliveryStatusConfig: Record<string, { label: string; bg: string; text: string }> = {
  pending: { label: "Kutilmoqda", bg: "#fef3c7", text: "#d97706" },
  confirmed: { label: "Tasdiqlangan", bg: "#dbeafe", text: "#2563eb" },
  production: { label: "Ishlab chiqarishda", bg: "#f3e8ff", text: "#7c3aed" },
  completed: { label: "Bajarilgan", bg: "#dcfce7", text: "#16a34a" },
  cancelled: { label: "Bekor", bg: "#fee2e2", text: "#dc2626" },
};

const deliveryProgressConfig: Record<string, { label: string; bg: string; text: string }> = {
  pending: { label: "Kutilmoqda", bg: "#f3f4f6", text: "#6b7280" },
  shipped: { label: "Yuborilgan", bg: "#dbeafe", text: "#2563eb" },
  in_transit: { label: "Yo'lda", bg: "#fef3c7", text: "#d97706" },
  delivered: { label: "Yetkazilgan", bg: "#dcfce7", text: "#16a34a" },
};

const purchaseStatusConfig: Record<string, { label: string; bg: string; text: string }> = {
  pending: { label: "Kutilmoqda", bg: "#fef3c7", text: "#d97706" },
  ordered: { label: "Buyurtma qilingan", bg: "#dbeafe", text: "#2563eb" },
  received: { label: "Qabul qilingan", bg: "#dcfce7", text: "#16a34a" },
  cancelled: { label: "Bekor", bg: "#fee2e2", text: "#dc2626" },
};

type OrderType = "delivery" | "purchase";

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
  productId?: number;
}

export default function OrdersScreen({ navigation }: any) {
  const [orders, setOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [orderType, setOrderType] = useState<OrderType>("delivery");
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [selectedClientId, setSelectedClientId] = useState<number>(0);
  const [supplier, setSupplier] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<OrderItem[]>([{ name: "", quantity: 1, price: 0 }]);

  const load = async () => {
    try {
      const [o, p, c, inv] = await Promise.all([
        apiFetch("/orders"),
        apiFetch("/products"),
        apiFetch("/clients"),
        apiFetch("/inventory"),
      ]);
      setOrders(Array.isArray(o) ? o : []);
      setProducts(Array.isArray(p) ? p : []);
      setClients(Array.isArray(c) ? c : []);
      setInventory(Array.isArray(inv) ? inv : []);
    } catch {}
  };

  useFocusEffect(useCallback(() => { load(); }, []));
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const stockMap = useMemo(() => {
    const m: Record<number, number> = {};
    inventory.forEach((inv: any) => { m[inv.productId] = (m[inv.productId] || 0) + inv.quantity; });
    return m;
  }, [inventory]);

  const filtered = useMemo(() => {
    return orders.filter((o: any) => (o.orderType || "delivery") === orderType)
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [orders, orderType]);

  const pendingCount = orders.filter(o => o.status === "pending").length;
  const activeCount = orders.filter(o => o.status === "confirmed" || o.status === "in_progress" || o.status === "production").length;
  const completedCount = orders.filter(o => o.status === "completed").length;
  const totalSum = filtered.reduce((s, o) => s + (o.totalSum || 0), 0);

  const updateStatus = async (id: number, field: string, value: string) => {
    try {
      await apiFetch(`/orders/${id}`, { method: "PUT", body: JSON.stringify({ [field]: value }) });
      await load();
    } catch (e: any) { Alert.alert("Xatolik", e.message); }
  };

  const deleteOrder = async (id: number) => {
    Alert.alert("O'chirish", "Buyurtmani o'chirmoqchimisiz?", [
      { text: "Yo'q" },
      { text: "Ha", style: "destructive", onPress: async () => {
        try { await apiFetch(`/orders/${id}`, { method: "DELETE" }); await load(); } catch {}
      }},
    ]);
  };

  const resetForm = () => {
    setSelectedClientId(0); setSupplier(""); setNotes("");
    setItems([{ name: "", quantity: 1, price: 0 }]);
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

  const submitOrder = async () => {
    const validItems = items.filter(i => i.name.trim() && i.quantity > 0);
    if (validItems.length === 0) { Alert.alert("Xatolik", "Kamida bitta mahsulot kiriting"); return; }

    if (orderType === "delivery" && !selectedClientId) { Alert.alert("Xatolik", "Mijoz tanlang"); return; }
    if (orderType === "purchase" && !supplier.trim()) { Alert.alert("Xatolik", "Yetkazib beruvchini kiriting"); return; }

    setSaving(true);
    try {
      const totalSum = validItems.reduce((s, i) => s + i.quantity * i.price, 0);
      const client = clients.find(c => c.id === selectedClientId);
      const payload: any = {
        orderType,
        notes,
        items: validItems,
        totalSum,
        quantity: validItems.reduce((s, i) => s + i.quantity, 0),
      };

      if (orderType === "delivery") {
        payload.clientId = selectedClientId;
        const firstItem = validItems[0];
        payload.productId = firstItem?.productId || 0;
      } else {
        payload.supplier = supplier;
        payload.materialName = validItems.map(i => i.name).join(", ");
      }

      await apiFetch("/orders", { method: "POST", body: JSON.stringify(payload) });
      Alert.alert("Muvaffaqiyat", "Buyurtma yaratildi ✅");
      setShowModal(false);
      resetForm();
      await load();
    } catch (e: any) { Alert.alert("Xatolik", e.message); }
    finally { setSaving(false); }
  };

  const renderStatusBadge = (status: string, config: Record<string, any>) => {
    const s = config[status] || config.pending;
    return (
      <View style={[styles.badge, { backgroundColor: s.bg }]}>
        <Text style={[styles.badgeText, { color: s.text }]}>{s.label}</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { borderLeftColor: "#d97706" }]}>
            <Text style={styles.statValue}>{pendingCount}</Text>
            <Text style={styles.statLabel}>Kutilmoqda</Text>
          </View>
          <View style={[styles.statCard, { borderLeftColor: "#3b82f6" }]}>
            <Text style={styles.statValue}>{activeCount}</Text>
            <Text style={styles.statLabel}>Faol</Text>
          </View>
          <View style={[styles.statCard, { borderLeftColor: "#16a34a" }]}>
            <Text style={styles.statValue}>{completedCount}</Text>
            <Text style={styles.statLabel}>Bajarildi</Text>
          </View>
        </View>

        {/* Quick nav */}
        <View style={styles.quickNav}>
          <TouchableOpacity style={styles.quickBtn} onPress={() => navigation.navigate("Sales")}>
            <Text style={styles.quickIcon}>📊</Text>
            <Text style={styles.quickLabel}>Savdo</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickBtn} onPress={() => navigation.navigate("Delivery")}>
            <Text style={styles.quickIcon}>🚚</Text>
            <Text style={styles.quickLabel}>Yetkazish</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickBtn} onPress={() => navigation.navigate("Clients")}>
            <Text style={styles.quickIcon}>🏢</Text>
            <Text style={styles.quickLabel}>Mijozlar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickBtn} onPress={() => navigation.navigate("DeliveryMap")}>
            <Text style={styles.quickIcon}>🗺️</Text>
            <Text style={styles.quickLabel}>Xarita</Text>
          </TouchableOpacity>
        </View>

        {/* Order type tabs */}
        <View style={styles.tabRow}>
          <TouchableOpacity style={[styles.tab, orderType === "delivery" && styles.tabActive]} onPress={() => setOrderType("delivery")}>
            <Text style={[styles.tabText, orderType === "delivery" && { color: "#fff" }]}>🚚 Yetkazish</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tab, orderType === "purchase" && styles.tabActive]} onPress={() => setOrderType("purchase")}>
            <Text style={[styles.tabText, orderType === "purchase" && { color: "#fff" }]}>📦 Xarid</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.countText}>{filtered.length} ta buyurtma • {formatSum(totalSum)}</Text>

        {/* Orders list */}
        {filtered.map((order) => (
          <View key={order.id} style={styles.orderCard}>
            {/* Header */}
            <View style={styles.orderHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.orderCode}>#{order.orderCode || order.id}</Text>
                {orderType === "delivery" ? (
                  <Text style={styles.orderClient}>👤 {order.clientName || "Noma'lum"}</Text>
                ) : (
                  <Text style={styles.orderClient}>🏪 {order.supplier || "Noma'lum"}</Text>
                )}
              </View>
              {renderStatusBadge(order.status, orderType === "delivery" ? deliveryStatusConfig : purchaseStatusConfig)}
            </View>

            {/* Items */}
            {Array.isArray(order.items) && order.items.length > 0 ? (
              order.items.map((item: any, i: number) => (
                <View key={i} style={styles.itemRow}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemQty}>{item.quantity} ta × {formatSum(item.price)}</Text>
                </View>
              ))
            ) : (
              <View style={styles.itemRow}>
                <Text style={styles.itemName}>{order.productName || order.materialName || "—"}</Text>
                <Text style={styles.itemQty}>{order.quantity} ta</Text>
              </View>
            )}

            {/* Footer */}
            <View style={styles.orderFooter}>
              <Text style={styles.orderSum}>💰 {formatSum(order.totalSum || 0)}</Text>
              <Text style={styles.orderDate}>📅 {order.createdAt ? new Date(order.createdAt).toLocaleDateString("uz") : "—"}</Text>
            </View>

            {/* Delivery progress */}
            {orderType === "delivery" && order.deliveryStatus && (
              <View style={styles.deliveryRow}>
                <Text style={styles.deliveryLabel}>Yetkazish:</Text>
                {renderStatusBadge(order.deliveryStatus, deliveryProgressConfig)}
              </View>
            )}

            {/* Actions */}
            <View style={styles.actionRow}>
              {order.status === "pending" && (
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: "#dbeafe" }]} onPress={() => updateStatus(order.id, "status", orderType === "delivery" ? "confirmed" : "ordered")}>
                  <Text style={[styles.actionText, { color: "#2563eb" }]}>▶️ Boshlash</Text>
                </TouchableOpacity>
              )}
              {(order.status === "confirmed" || order.status === "production" || order.status === "ordered") && (
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: "#dcfce7" }]} onPress={() => updateStatus(order.id, "status", "completed")}>
                  <Text style={[styles.actionText, { color: "#16a34a" }]}>✅ Yakunlash</Text>
                </TouchableOpacity>
              )}
              {orderType === "delivery" && order.deliveryStatus !== "delivered" && (
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: "#fef3c7" }]} onPress={() => {
                  const next = order.deliveryStatus === "pending" ? "shipped" : order.deliveryStatus === "shipped" ? "in_transit" : "delivered";
                  updateStatus(order.id, "deliveryStatus", next);
                }}>
                  <Text style={[styles.actionText, { color: "#d97706" }]}>🚚 Keyingi</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: "#fee2e2" }]} onPress={() => deleteOrder(order.id)}>
                <Text style={[styles.actionText, { color: "#dc2626" }]}>🗑️</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        {filtered.length === 0 && (
          <View style={styles.empty}><Text style={styles.emptyText}>Buyurtmalar topilmadi</Text></View>
        )}
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => { resetForm(); setShowModal(true); }} activeOpacity={0.8}>
        <Text style={styles.fabText}>＋</Text>
      </TouchableOpacity>

      {/* Modal - New Order */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {orderType === "delivery" ? "🚚 Yangi yetkazish" : "📦 Yangi xarid"}
                </Text>
                <TouchableOpacity onPress={() => setShowModal(false)}>
                  <Text style={styles.modalClose}>✕</Text>
                </TouchableOpacity>
              </View>

              {/* Order type switch in modal */}
              <View style={styles.modalTabRow}>
                <TouchableOpacity style={[styles.modalTab, orderType === "delivery" && styles.modalTabActive]} onPress={() => setOrderType("delivery")}>
                  <Text style={[styles.modalTabText, orderType === "delivery" && { color: "#fff" }]}>🚚 Yetkazish</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalTab, orderType === "purchase" && styles.modalTabActive]} onPress={() => setOrderType("purchase")}>
                  <Text style={[styles.modalTabText, orderType === "purchase" && { color: "#fff" }]}>📦 Xarid</Text>
                </TouchableOpacity>
              </View>

              {/* Client / Supplier */}
              {orderType === "delivery" ? (
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Mijoz</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {clients.filter(c => c.type === "customer").map(c => (
                      <TouchableOpacity key={c.id} style={[styles.clientChip, selectedClientId === c.id && styles.clientChipActive]} onPress={() => setSelectedClientId(c.id)}>
                        <Text style={[styles.clientChipText, selectedClientId === c.id && { color: "#fff" }]}>{c.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                  {selectedClientId > 0 && (
                    <View style={styles.clientInfo}>
                      <Text style={styles.clientInfoText}>📞 {clients.find(c => c.id === selectedClientId)?.phone || "—"}</Text>
                    </View>
                  )}
                </View>
              ) : (
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Yetkazib beruvchi</Text>
                  <TextInput style={styles.fieldInput} value={supplier} onChangeText={setSupplier} placeholder="Yetkazib beruvchi nomi" placeholderTextColor={colors.textMuted} />
                </View>
              )}

              {/* Items */}
              <View style={styles.fieldGroup}>
                <View style={styles.itemsHeader}>
                  <Text style={styles.fieldLabel}>Mahsulotlar</Text>
                  <TouchableOpacity onPress={addItem} style={styles.addItemBtn}>
                    <Text style={styles.addItemText}>+ Qo'shish</Text>
                  </TouchableOpacity>
                </View>

                {items.map((item, idx) => (
                  <View key={idx} style={styles.itemCard}>
                    {orderType === "delivery" ? (
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                        {products.map(p => (
                          <TouchableOpacity key={p.id} style={[styles.prodChip, item.productId === p.id && styles.prodChipActive]} onPress={() => selectProduct(idx, p.id)}>
                            <Text style={[styles.prodChipText, item.productId === p.id && { color: "#fff" }]}>
                              {p.name} ({stockMap[p.id] || 0})
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    ) : (
                      <TextInput style={styles.itemInput} value={item.name} onChangeText={v => updateItem(idx, "name", v)} placeholder="Material nomi" placeholderTextColor={colors.textMuted} />
                    )}
                    <View style={styles.itemInputRow}>
                      <TextInput style={[styles.itemInput, { flex: 1 }]} value={String(item.quantity)} onChangeText={v => updateItem(idx, "quantity", Math.max(1, Number(v) || 0))} placeholder="Soni" keyboardType="numeric" placeholderTextColor={colors.textMuted} />
                      <TextInput style={[styles.itemInput, { flex: 1 }]} value={String(item.price)} onChangeText={v => updateItem(idx, "price", Math.max(0, Number(v) || 0))} placeholder="Narxi" keyboardType="numeric" placeholderTextColor={colors.textMuted} />
                      <Text style={styles.itemSum}>{formatSum(item.quantity * item.price)}</Text>
                      {items.length > 1 && (
                        <TouchableOpacity onPress={() => removeItem(idx)} style={styles.removeBtn}>
                          <Text style={styles.removeBtnText}>🗑️</Text>
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

              {/* Notes */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Izoh</Text>
                <TextInput style={styles.fieldInput} value={notes} onChangeText={setNotes} placeholder="Qo'shimcha ma'lumot" placeholderTextColor={colors.textMuted} />
              </View>

              {/* Actions */}
              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowModal(false)}>
                  <Text style={styles.cancelText}>Bekor qilish</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveBtn} onPress={submitOrder} disabled={saving}>
                  <Text style={styles.saveText}>{saving ? "⏳ Saqlanmoqda..." : "✅ Saqlash"}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: 100 },
  statsRow: { flexDirection: "row", gap: 8, marginBottom: spacing.md },
  quickNav: { flexDirection: "row", gap: 8, marginBottom: spacing.lg },
  quickBtn: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.md, paddingVertical: 12, alignItems: "center", ...shadows.sm },
  quickIcon: { fontSize: 20, marginBottom: 2 },
  quickLabel: { fontSize: 10, fontWeight: "600", color: colors.textSecondary },
  statCard: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, borderLeftWidth: 3, ...shadows.sm },
  statValue: { fontSize: 20, fontWeight: "800", color: colors.text },
  statLabel: { fontSize: 10, color: colors.textSecondary },
  tabRow: { flexDirection: "row", gap: 8, marginBottom: spacing.md },
  tab: { flex: 1, paddingVertical: 12, borderRadius: radius.lg, backgroundColor: colors.surfaceAlt, alignItems: "center" },
  tabActive: { backgroundColor: colors.primary },
  tabText: { fontSize: 14, fontWeight: "700", color: colors.textSecondary },
  countText: { fontSize: 13, color: colors.textMuted, marginBottom: spacing.md },
  orderCard: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.lg, marginBottom: spacing.md, ...shadows.sm },
  orderHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: spacing.sm },
  orderCode: { fontSize: 12, fontWeight: "600", color: colors.textMuted, fontFamily: "monospace" },
  orderClient: { fontSize: 15, fontWeight: "700", color: colors.text, marginTop: 2 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 10, fontWeight: "700" },
  itemRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
  itemName: { fontSize: 13, fontWeight: "600", color: colors.primary },
  itemQty: { fontSize: 12, color: colors.textSecondary },
  orderFooter: { flexDirection: "row", justifyContent: "space-between", paddingTop: spacing.sm, marginTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  orderSum: { fontSize: 14, fontWeight: "700", color: colors.text },
  orderDate: { fontSize: 12, color: colors.textMuted },
  deliveryRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: spacing.sm },
  deliveryLabel: { fontSize: 12, color: colors.textSecondary },
  actionRow: { flexDirection: "row", gap: 6, marginTop: spacing.md },
  actionBtn: { flex: 1, paddingVertical: 8, borderRadius: radius.md, alignItems: "center" },
  actionText: { fontSize: 12, fontWeight: "700" },
  empty: { padding: 40, alignItems: "center" },
  emptyText: { color: colors.textMuted },
  fab: { position: "absolute", bottom: 24, right: 20, width: 60, height: 60, borderRadius: 30, backgroundColor: colors.primary, justifyContent: "center", alignItems: "center", ...shadows.lg, zIndex: 100 },
  fabText: { fontSize: 28, color: "#fff", fontWeight: "300", marginTop: -2 },

  // Modal styles
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: spacing.xxl, paddingBottom: 40, maxHeight: "90%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.lg },
  modalTitle: { fontSize: 20, fontWeight: "800", color: colors.text },
  modalClose: { fontSize: 24, color: colors.textMuted, padding: 4 },
  modalTabRow: { flexDirection: "row", gap: 8, marginBottom: spacing.lg },
  modalTab: { flex: 1, paddingVertical: 10, borderRadius: radius.lg, backgroundColor: colors.surfaceAlt, alignItems: "center" },
  modalTabActive: { backgroundColor: colors.primary },
  modalTabText: { fontSize: 13, fontWeight: "700", color: colors.textSecondary },
  fieldGroup: { marginBottom: spacing.lg },
  fieldLabel: { fontSize: 13, fontWeight: "700", color: colors.textSecondary, marginBottom: 8 },
  fieldInput: { height: 48, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 14, fontSize: 15, color: colors.text, backgroundColor: colors.surfaceAlt },
  clientChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.full, backgroundColor: colors.surfaceAlt, marginRight: 8, borderWidth: 1.5, borderColor: colors.border },
  clientChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  clientChipText: { fontSize: 13, fontWeight: "600", color: colors.text },
  clientInfo: { marginTop: 8, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: "#eef2ff", borderRadius: radius.md },
  clientInfoText: { fontSize: 12, color: colors.textSecondary },
  itemsHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  addItemBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.full, backgroundColor: colors.surfaceAlt },
  addItemText: { fontSize: 12, fontWeight: "600", color: colors.primary },
  itemCard: { backgroundColor: colors.surfaceAlt, borderRadius: radius.md, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: colors.border },
  itemInput: { height: 40, borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 10, fontSize: 14, color: colors.text, backgroundColor: colors.surface, marginBottom: 6 },
  itemInputRow: { flexDirection: "row", gap: 6, alignItems: "center" },
  itemSum: { fontSize: 12, fontWeight: "700", color: colors.primary, minWidth: 70, textAlign: "right" },
  removeBtn: { padding: 6 },
  removeBtnText: { fontSize: 16 },
  prodChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.full, backgroundColor: colors.surface, marginRight: 6, borderWidth: 1, borderColor: colors.border },
  prodChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  prodChipText: { fontSize: 11, fontWeight: "600", color: colors.text },
  totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border, marginTop: 8 },
  totalLabel: { fontSize: 13, color: colors.textSecondary },
  totalValue: { fontSize: 18, fontWeight: "800", color: colors.primary },
  modalActions: { flexDirection: "row", gap: 12, marginTop: spacing.xl },
  cancelBtn: { flex: 1, height: 52, backgroundColor: colors.surfaceAlt, borderRadius: radius.lg, justifyContent: "center", alignItems: "center" },
  cancelText: { fontSize: 15, fontWeight: "600", color: colors.textSecondary },
  saveBtn: { flex: 1, height: 52, backgroundColor: colors.primary, borderRadius: radius.lg, justifyContent: "center", alignItems: "center", ...shadows.sm },
  saveText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});

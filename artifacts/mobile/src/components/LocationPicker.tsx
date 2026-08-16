import React, { useState } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ActivityIndicator, Alert, Linking,
} from "react-native";
import * as Location from "expo-location";
import { colors, radius, spacing } from "../theme";

interface Props {
  value: string;
  onChange: (coords: string) => void;
}

export default function LocationPicker({ value, onChange }: Props) {
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const getCurrentLocation = async () => {
    setLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Ruxsat kerak", "Lokatsiya ruxsatini bering");
        setLoading(false);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const coords = `${loc.coords.latitude.toFixed(6)},${loc.coords.longitude.toFixed(6)}`;
      onChange(coords);
    } catch (e: any) {
      Alert.alert("Xatolik", "Lokatsiya aniqlanmadi: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const openInMaps = () => {
    if (!value) return;
    const [lat, lng] = value.split(",").map(Number);
    if (isNaN(lat) || isNaN(lng)) return;
    const url = `https://www.google.com/maps?q=${lat},${lng}`;
    Linking.openURL(url);
  };

  const parsedCoords = value ? value.split(",").map(Number) : null;
  const isValid = parsedCoords && parsedCoords.length === 2 && !isNaN(parsedCoords[0]) && !isNaN(parsedCoords[1]);

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.label}>📍 Manzili (lokatsiya)</Text>
        <TouchableOpacity onPress={() => setExpanded(!expanded)}>
          <Text style={styles.toggleText}>{expanded ? "Yopish" : "Batafsil"}</Text>
        </TouchableOpacity>
      </View>

      {/* Quick location button */}
      <TouchableOpacity style={styles.locBtn} onPress={getCurrentLocation} disabled={loading}>
        {loading ? (
          <ActivityIndicator color={colors.primary} size="small" />
        ) : (
          <Text style={styles.locBtnText}>📍 Joriy lokatsiyani aniqlash</Text>
        )}
      </TouchableOpacity>

      {/* Coordinate input */}
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChange}
        placeholder="41.311081, 69.240562"
        placeholderTextColor={colors.textMuted}
        keyboardType="default"
      />

      {/* Preview */}
      {isValid && (
        <View style={styles.preview}>
          <View style={styles.previewInfo}>
            <Text style={styles.previewCoord}>
              🌐 {parsedCoords![0].toFixed(4)}, {parsedCoords![1].toFixed(4)}
            </Text>
            <TouchableOpacity onPress={openInMaps} style={styles.mapLink}>
              <Text style={styles.mapLinkText}>🗺️ Xaritada ochish</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Expanded - manual entry */}
      {expanded && (
        <View style={styles.expandedSection}>
          <Text style={styles.helpText}>
            Koordinatalarni quyidagi formatda kiriting:{"\n"}
            • 41.311081, 69.240562{"\n"}
            • Yoki "Joriy lokatsiya" tugmasini bosing
          </Text>

          <View style={styles.coordRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.coordLabel}>Kenglik (lat)</Text>
              <TextInput
                style={styles.coordInput}
                value={isValid ? String(parsedCoords![0]) : ""}
                onChangeText={(v) => {
                  const lat = parseFloat(v) || 0;
                  const lng = isValid ? parsedCoords![1] : 0;
                  onChange(`${lat},${lng}`);
                }}
                keyboardType="numeric"
                placeholder="41.31"
                placeholderTextColor={colors.textMuted}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.coordLabel}>Uzunlik (lng)</Text>
              <TextInput
                style={styles.coordInput}
                value={isValid ? String(parsedCoords![1]) : ""}
                onChangeText={(v) => {
                  const lat = isValid ? parsedCoords![0] : 0;
                  const lng = parseFloat(v) || 0;
                  onChange(`${lat},${lng}`);
                }}
                keyboardType="numeric"
                placeholder="69.24"
                placeholderTextColor={colors.textMuted}
              />
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: spacing.md },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  label: { fontSize: 13, fontWeight: "700", color: colors.textSecondary },
  toggleText: { fontSize: 12, fontWeight: "600", color: colors.primary },
  locBtn: {
    height: 44, flexDirection: "row", alignItems: "center", justifyContent: "center",
    backgroundColor: "#eef2ff", borderRadius: radius.md, marginBottom: 8,
    borderWidth: 1.5, borderColor: colors.primaryLight, borderStyle: "dashed",
  },
  locBtnText: { fontSize: 14, fontWeight: "600", color: colors.primary },
  input: {
    height: 48, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md,
    paddingHorizontal: 14, fontSize: 15, color: colors.text, backgroundColor: colors.surfaceAlt,
  },
  preview: {
    marginTop: 8, backgroundColor: "#f0fdf4", borderRadius: radius.md,
    padding: 10, borderWidth: 1, borderColor: "#bbf7d0",
  },
  previewInfo: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  previewCoord: { fontSize: 13, fontWeight: "600", color: "#166534" },
  mapLink: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, backgroundColor: "#dcfce7" },
  mapLinkText: { fontSize: 11, fontWeight: "600", color: "#16a34a" },
  expandedSection: { marginTop: spacing.md, backgroundColor: colors.surfaceAlt, borderRadius: radius.md, padding: spacing.md },
  helpText: { fontSize: 12, color: colors.textMuted, lineHeight: 18, marginBottom: spacing.md },
  coordRow: { flexDirection: "row", gap: 10 },
  coordLabel: { fontSize: 11, fontWeight: "600", color: colors.textSecondary, marginBottom: 4 },
  coordInput: {
    height: 42, borderWidth: 1.5, borderColor: colors.border, borderRadius: 8,
    paddingHorizontal: 10, fontSize: 14, color: colors.text, backgroundColor: colors.surface,
  },
});

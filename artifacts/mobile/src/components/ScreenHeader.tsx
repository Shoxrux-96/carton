import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { colors, radius } from "../theme";

export default function ScreenHeader({ title }: { title: string }) {
  const navigation = useNavigation();
  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
        <Text style={styles.backText}>←</Text>
      </TouchableOpacity>
      <Text style={styles.title}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
    paddingTop: 50,
    paddingBottom: 14,
    zIndex: 50,
  },
  backBtn: {
    position: "absolute",
    left: 12,
    top: 56,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: radius.md,
  },
  backText: { fontSize: 18, color: "#fff", fontWeight: "800" },
  title: { fontSize: 17, fontWeight: "800", color: "#fff", textAlign: "center" },
});

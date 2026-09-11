import React, { useState, useMemo, useCallback, useRef } from "react";
import {
  View, Text, ScrollView, StyleSheet, TextInput,
  TouchableOpacity, KeyboardAvoidingView, Platform, Dimensions,
} from "react-native";
import { WebView as RNWebView } from "react-native-webview";
import { useFocusEffect } from "@react-navigation/native";
import { colors, radius, shadows, spacing } from "../theme";

const { width } = Dimensions.get("window");
const fmt = (n: number) => n.toLocaleString("uz-UZ");
const fmtD = (n: number, d = 2) => n.toFixed(d);

function BoxWebView({ boxW, boxH, boxL }: { boxW: number; boxH: number; boxL: number }) {
  const S = 5;
  const blankLen = 2 * (boxW + boxL) + 6;
  const flapH = boxL / 2;
  const blankW = 1 + flapH + boxH + flapH + 1;
  const svgW = blankLen * S;
  const svgH = blankW * S;

  const x0 = 0;
  const xW1 = boxW * S;
  const xL1 = (boxW + boxL) * S;
  const xW2 = (2 * boxW + boxL) * S;
  const xL2 = (2 * boxW + 2 * boxL) * S;
  const xGlue = xL2;
  const xCut = xL2 + 5 * S;
  const xEnd = xCut + 1 * S;

  const yCutTop = 0;
  const yFlapTop = 1 * S;
  const yCenter = (1 + flapH) * S;
  const yFlapBot = (1 + flapH + boxH) * S;
  const yCutBot = (1 + flapH + boxH + flapH) * S;
  const yEnd = (1 + flapH + boxH + flapH + 1) * S;

  const padL = 50, padR = 30, padT = 30, padB = 60;
  const totalSvgW = svgW + padL + padR;
  const totalSvgH = svgH + padT + padB;

  const bx = 60, by = 50;
  const bw = 180, bh = 120, d = 70;
  const box3dPadL = 50, box3dPadR = 35, box3dPadT = 20, box3dPadB = 50;
  const box3dTotalW = bx + bw + d + box3dPadL + box3dPadR;
  const box3dTotalH = by + bh + box3dPadB + box3dPadT;

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=3">
<style>body{margin:0;padding:0;background:#fff;}
.s1{display:flex;justify-content:center;align-items:center;width:100%;padding:8px 0;}
.s2{display:flex;justify-content:center;align-items:center;width:100%;padding:8px 0;border-top:1px solid #e5e7eb;margin-top:8px;}
svg{display:block;max-width:100%;height:auto;}
</style></head><body>

<div class="s1">
<svg viewBox="${-padL} ${-padT} ${totalSvgW} ${totalSvgH}" preserveAspectRatio="xMidYMid meet">
<rect x="${-padL}" y="${-padT}" width="${totalSvgW}" height="${totalSvgH}" fill="white"/>

<rect x="0" y="${yCutTop}" width="${svgW}" height="${S}" fill="#fee2e2" stroke="#ef4444" stroke-width="1" stroke-dasharray="4 2"/>
<text x="${svgW / 2}" y="${yCutTop + S / 2 + 5}" text-anchor="middle" font-size="13" fill="#ef4444" font-weight="bold">1 sm chiqindi</text>

<rect x="${x0}" y="${yFlapTop}" width="${xW1}" height="${flapH * S}" fill="#dbeafe" stroke="#3b82f6" stroke-width="1.5" stroke-dasharray="5 3"/>
<rect x="${xW1}" y="${yFlapTop}" width="${xL1 - xW1}" height="${flapH * S}" fill="#dbeafe" stroke="#3b82f6" stroke-width="1.5" stroke-dasharray="5 3"/>
<rect x="${xL1}" y="${yFlapTop}" width="${xW2 - xL1}" height="${flapH * S}" fill="#dbeafe" stroke="#3b82f6" stroke-width="1.5" stroke-dasharray="5 3"/>
<rect x="${xW2}" y="${yFlapTop}" width="${xL2 - xW2}" height="${flapH * S}" fill="#dbeafe" stroke="#3b82f6" stroke-width="1.5" stroke-dasharray="5 3"/>

<rect x="${x0}" y="${yCenter}" width="${xW1}" height="${boxH * S}" fill="#fef3c7" stroke="#d97706" stroke-width="2.5"/>
<rect x="${xW1}" y="${yCenter}" width="${xL1 - xW1}" height="${boxH * S}" fill="#fed7aa" stroke="#ea580c" stroke-width="2.5"/>
<rect x="${xL1}" y="${yCenter}" width="${xW2 - xL1}" height="${boxH * S}" fill="#fef3c7" stroke="#d97706" stroke-width="2.5"/>
<rect x="${xW2}" y="${yCenter}" width="${xL2 - xW2}" height="${boxH * S}" fill="#fed7aa" stroke="#ea580c" stroke-width="2.5"/>
<rect x="${xGlue}" y="${yCenter}" width="${5 * S}" height="${boxH * S}" fill="#d1fae5" stroke="#10b981" stroke-width="1.5" stroke-dasharray="6 3"/>
<rect x="${xCut}" y="${yCenter}" width="${1 * S}" height="${boxH * S}" fill="#fee2e2" stroke="#ef4444" stroke-width="1" stroke-dasharray="3 2"/>

<rect x="${x0}" y="${yFlapBot}" width="${xW1}" height="${flapH * S}" fill="#dbeafe" stroke="#3b82f6" stroke-width="1.5" stroke-dasharray="5 3"/>
<rect x="${xW1}" y="${yFlapBot}" width="${xL1 - xW1}" height="${flapH * S}" fill="#dbeafe" stroke="#3b82f6" stroke-width="1.5" stroke-dasharray="5 3"/>
<rect x="${xL1}" y="${yFlapBot}" width="${xW2 - xL1}" height="${flapH * S}" fill="#dbeafe" stroke="#3b82f6" stroke-width="1.5" stroke-dasharray="5 3"/>
<rect x="${xW2}" y="${yFlapBot}" width="${xL2 - xW2}" height="${flapH * S}" fill="#dbeafe" stroke="#3b82f6" stroke-width="1.5" stroke-dasharray="5 3"/>

<rect x="0" y="${yCutBot}" width="${svgW}" height="${S}" fill="#fee2e2" stroke="#ef4444" stroke-width="1" stroke-dasharray="4 2"/>
<text x="${svgW / 2}" y="${yCutBot + S / 2 + 5}" text-anchor="middle" font-size="13" fill="#ef4444" font-weight="bold">1 sm chiqindi</text>

<text x="${xW1 / 2}" y="${yCenter + boxH * S / 2 - 10}" text-anchor="middle" font-size="16" font-weight="bold" fill="#92400e">W</text>
<text x="${xW1 / 2}" y="${yCenter + boxH * S / 2 + 14}" text-anchor="middle" font-size="14" fill="#92400e">${boxW} sm</text>
<text x="${(xW1 + xL1) / 2}" y="${yCenter + boxH * S / 2 - 10}" text-anchor="middle" font-size="16" font-weight="bold" fill="#9a3412">L</text>
<text x="${(xW1 + xL1) / 2}" y="${yCenter + boxH * S / 2 + 14}" text-anchor="middle" font-size="14" fill="#9a3412">${boxL} sm</text>
<text x="${(xL1 + xW2) / 2}" y="${yCenter + boxH * S / 2 - 10}" text-anchor="middle" font-size="16" font-weight="bold" fill="#92400e">W</text>
<text x="${(xL1 + xW2) / 2}" y="${yCenter + boxH * S / 2 + 14}" text-anchor="middle" font-size="14" fill="#92400e">${boxW} sm</text>
<text x="${(xW2 + xL2) / 2}" y="${yCenter + boxH * S / 2 - 10}" text-anchor="middle" font-size="16" font-weight="bold" fill="#9a3412">L</text>
<text x="${(xW2 + xL2) / 2}" y="${yCenter + boxH * S / 2 + 14}" text-anchor="middle" font-size="14" fill="#9a3412">${boxL} sm</text>
<text x="${xGlue + 2.5 * S}" y="${yCenter + boxH * S / 2 + 4}" text-anchor="middle" font-size="12" font-weight="bold" fill="#065f46">YELIM</text>
<text x="${xGlue + 2.5 * S}" y="${yCenter + boxH * S / 2 + 18}" text-anchor="middle" font-size="11" fill="#065f46">5 sm</text>
<text x="${xCut + 0.5 * S}" y="${yCenter + boxH * S / 2 + 5}" text-anchor="middle" font-size="12" fill="#ef4444" font-weight="bold">1</text>

<text x="${xW1 / 2}" y="${yFlapTop + flapH * S / 2 + 6}" text-anchor="middle" font-size="13" fill="#1e40af" font-weight="bold">L/2</text>
<text x="${(xW1 + xL1) / 2}" y="${yFlapTop + flapH * S / 2 + 6}" text-anchor="middle" font-size="13" fill="#1e40af" font-weight="bold">L/2</text>
<text x="${xW1 / 2}" y="${yFlapBot + flapH * S / 2 + 6}" text-anchor="middle" font-size="13" fill="#1e40af" font-weight="bold">L/2</text>
<text x="${(xW1 + xL1) / 2}" y="${yFlapBot + flapH * S / 2 + 6}" text-anchor="middle" font-size="13" fill="#1e40af" font-weight="bold">L/2</text>

<line x1="0" y1="${svgH + 14}" x2="${svgW}" y2="${svgH + 14}" stroke="#374151" stroke-width="1.5"/>
<line x1="${x0}" y1="${svgH + 8}" x2="${xW1}" y2="${svgH + 8}" stroke="#d97706" stroke-width="1"/>
<text x="${xW1 / 2}" y="${svgH + 30}" text-anchor="middle" font-size="14" fill="#d97706" font-weight="bold">${boxW}</text>
<line x1="${xW1}" y1="${svgH + 8}" x2="${xL1}" y2="${svgH + 8}" stroke="#ea580c" stroke-width="1"/>
<text x="${(xW1 + xL1) / 2}" y="${svgH + 30}" text-anchor="middle" font-size="14" fill="#ea580c" font-weight="bold">${boxL}</text>
<line x1="${xL1}" y1="${svgH + 8}" x2="${xW2}" y2="${svgH + 8}" stroke="#d97706" stroke-width="1"/>
<text x="${(xL1 + xW2) / 2}" y="${svgH + 30}" text-anchor="middle" font-size="14" fill="#d97706" font-weight="bold">${boxW}</text>
<line x1="${xW2}" y1="${svgH + 8}" x2="${xL2}" y2="${svgH + 8}" stroke="#ea580c" stroke-width="1"/>
<text x="${(xW2 + xL2) / 2}" y="${svgH + 30}" text-anchor="middle" font-size="14" fill="#ea580c" font-weight="bold">${boxL}</text>
<line x1="${xGlue}" y1="${svgH + 8}" x2="${xCut}" y2="${svgH + 8}" stroke="#10b981" stroke-width="1"/>
<text x="${xGlue + 2.5 * S}" y="${svgH + 30}" text-anchor="middle" font-size="13" fill="#10b981" font-weight="bold">5</text>
<line x1="${xCut}" y1="${svgH + 8}" x2="${xEnd}" y2="${svgH + 8}" stroke="#ef4444" stroke-width="1"/>
<text x="${xCut + 0.5 * S}" y="${svgH + 30}" text-anchor="middle" font-size="13" fill="#ef4444" font-weight="bold">1</text>
<text x="${svgW / 2}" y="${svgH + 50}" text-anchor="middle" font-size="15" font-weight="bold" fill="#374151">Kesma: ${blankLen.toFixed(1)} x ${blankW.toFixed(1)} sm</text>

<line x1="-16" y1="${yCutTop}" x2="-16" y2="${yFlapTop}" stroke="#ef4444" stroke-width="1"/>
<text x="-22" y="${(yCutTop + yFlapTop) / 2 + 5}" text-anchor="end" font-size="13" fill="#ef4444" font-weight="bold">1</text>
<line x1="-16" y1="${yFlapTop}" x2="-16" y2="${yCenter}" stroke="#3b82f6" stroke-width="1"/>
<text x="-22" y="${(yFlapTop + yCenter) / 2 + 5}" text-anchor="end" font-size="13" fill="#3b82f6" font-weight="bold">${(boxL / 2).toFixed(1)}</text>
<line x1="-16" y1="${yCenter}" x2="-16" y2="${yFlapBot}" stroke="#d97706" stroke-width="2"/>
<text x="-22" y="${(yCenter + yFlapBot) / 2 + 6}" text-anchor="end" font-size="15" fill="#d97706" font-weight="bold">${boxH}</text>
<line x1="-16" y1="${yFlapBot}" x2="-16" y2="${yCutBot}" stroke="#3b82f6" stroke-width="1"/>
<text x="-22" y="${(yFlapBot + yCutBot) / 2 + 5}" text-anchor="end" font-size="13" fill="#3b82f6" font-weight="bold">${(boxL / 2).toFixed(1)}</text>
<line x1="-16" y1="${yCutBot}" x2="-16" y2="${yEnd}" stroke="#ef4444" stroke-width="1"/>
<text x="-22" y="${(yCutBot + yEnd) / 2 + 5}" text-anchor="end" font-size="13" fill="#ef4444" font-weight="bold">1</text>
</svg>
</div>

<div class="s2">
<svg viewBox="${-box3dPadL} ${-box3dPadT} ${box3dTotalW} ${box3dTotalH}" preserveAspectRatio="xMidYMid meet">
<rect x="${-box3dPadL}" y="${-box3dPadT}" width="${box3dTotalW}" height="${box3dTotalH}" fill="white"/>

<rect x="${bx}" y="${by}" width="${bw}" height="${bh}" fill="#fef3c7" stroke="#d97706" stroke-width="2"/>
<polygon points="${bx + bw},${by} ${bx + bw + d},${by - d * 0.6} ${bx + bw + d},${by + bh - d * 0.6} ${bx + bw},${by + bh}" fill="#fed7aa" stroke="#ea580c" stroke-width="2"/>
<line x1="${bx + bw}" y1="${by}" x2="${bx + bw + d}" y2="${by - d * 0.6}" stroke="#ea580c" stroke-width="1" stroke-dasharray="4 2"/>
<polygon points="${bx},${by} ${bx + d},${by - d * 0.6} ${bx + bw + d},${by - d * 0.6} ${bx + bw},${by}" fill="#dbeafe" stroke="#3b82f6" stroke-width="2"/>
<line x1="${bx + bw * 0.6}" y1="${by}" x2="${bx + bw * 0.6 + d}" y2="${by - d * 0.6}" stroke="black" stroke-width="1.5" stroke-dasharray="3 2"/>

<line x1="${bx}" y1="${by + bh + 16}" x2="${bx + bw}" y2="${by + bh + 16}" stroke="#d97706" stroke-width="1.5"/>
<line x1="${bx}" y1="${by + bh + 12}" x2="${bx}" y2="${by + bh + 20}" stroke="#d97706" stroke-width="1"/>
<line x1="${bx + bw}" y1="${by + bh + 12}" x2="${bx + bw}" y2="${by + bh + 20}" stroke="#d97706" stroke-width="1"/>
<text x="${bx + bw / 2}" y="${by + bh + 38}" text-anchor="middle" font-size="17" fill="#d97706" font-weight="bold">W = ${boxW}</text>

<line x1="${bx - 18}" y1="${by}" x2="${bx - 18}" y2="${by + bh}" stroke="#d97706" stroke-width="1.5"/>
<line x1="${bx - 22}" y1="${by}" x2="${bx - 14}" y2="${by}" stroke="#d97706" stroke-width="1"/>
<line x1="${bx - 22}" y1="${by + bh}" x2="${bx - 14}" y2="${by + bh}" stroke="#d97706" stroke-width="1"/>
<text x="${bx - 26}" y="${by + bh / 2 + 6}" text-anchor="end" font-size="17" fill="#d97706" font-weight="bold">H = ${boxH}</text>

<text x="${bx + bw / 2}" y="${by + bh / 2 - 16}" text-anchor="middle" font-size="22" fill="#374151" font-weight="bold">${boxW} x ${boxH} x ${boxL}</text>
<text x="${bx + bw / 2}" y="${by + bh / 2 + 4}" text-anchor="middle" font-size="14" fill="#6b7280">W x H x L</text>
</svg>
</div>

</body></html>`;

  return (
    <RNWebView
      source={{ html }}
      style={{ width: "100%", height: 580, backgroundColor: "#fff" }}
      originWhitelist={["*"]}
      scrollEnabled={false}
      javaScriptEnabled={false}
    />
  );
}

export default function ProductionCalcScreen() {
  const [resetKey, setResetKey] = useState(0);

  useFocusEffect(useCallback(() => {
    setResetKey(k => k + 1);
  }, []));

  return <ProductionCalcInner key={resetKey} />;
}

function ProductionCalcInner() {
  const [boxL, setBoxL] = useState("");
  const [boxW, setBoxW] = useState("");
  const [boxH, setBoxH] = useState("");
  const [paperWeightKg, setPaperWeightKg] = useState("0.125");
  const [priceLayer1, setPriceLayer1] = useState("");
  const [priceLayer2, setPriceLayer2] = useState("");
  const [priceLayer3, setPriceLayer3] = useState("");
  const [wastePercent, setWastePercent] = useState("10");
  const [quantity, setQuantity] = useState("1000");
  const [coefficient, setCoefficient] = useState("1.5");
  const [companyName, setCompanyName] = useState("Shovot Carton");
  const [boxName, setBoxName] = useState("RSC quti");

  const n = (s: string) => parseFloat(s) || 0;
  const hasBox = n(boxL) > 0 && n(boxW) > 0 && n(boxH) > 0;

  const calc = useMemo(() => {
    const L = n(boxL), W = n(boxW), H = n(boxH);
    const pwKg = n(paperWeightKg);
    const p1 = n(priceLayer1), p2 = n(priceLayer2), p3 = n(priceLayer3);
    const q = n(quantity);
    const k = n(coefficient);

    if (L <= 0 || W <= 0 || H <= 0 || pwKg <= 0 || q <= 0) return null;

    const blankLen = 2 * (W + L) + 6;
    const flapH = L / 2;
    const blankW = 1 + flapH + H + flapH + 1;
    const netAreaM2 = (blankLen * blankW) / 10000;

    const l1Weight = netAreaM2 * pwKg;
    const l1Cost = l1Weight * p1;
    const l2Weight = netAreaM2 * pwKg / 0.7;
    const l2Cost = l2Weight * p2;
    const l3Weight = netAreaM2 * pwKg;
    const l3Cost = l3Weight * p3;

    const totalWeight = l1Weight + l2Weight + l3Weight;
    const totalPaperCost = l1Cost + l2Cost + l3Cost;
    const sellingPrice = Math.round(totalPaperCost * k);

    return {
      blankLen: +fmtD(blankLen, 1), blankW: +fmtD(blankW, 1),
      netAreaM2: +fmtD(netAreaM2, 4),
      l1: { weight: +fmtD(l1Weight, 4), price: p1, cost: Math.round(l1Cost) },
      l2: { weight: +fmtD(l2Weight, 4), price: p2, cost: Math.round(l2Cost) },
      l3: { weight: +fmtD(l3Weight, 4), price: p3, cost: Math.round(l3Cost) },
      totalWeight: +fmtD(totalWeight, 4), totalPaperCost: Math.round(totalPaperCost),
      perBox: { paper: Math.round(totalPaperCost), total: Math.round(totalPaperCost) },
      total: { quantity: q, paper: Math.round(totalPaperCost * q), grandTotal: Math.round(totalPaperCost * q) },
      sellingPrice,
      sellingTotal: Math.round(sellingPrice * q),
      revenue: Math.round(sellingPrice * q),
      profit: Math.round((sellingPrice - totalPaperCost) * q),
      coefficient: k,
    };
  }, [boxL, boxW, boxH, paperWeightKg, priceLayer1, priceLayer2, priceLayer3, wastePercent, quantity, coefficient]);

  const InputField = useCallback(({ label, value, setValue, placeholder, unit }: {
    label: string; value: string; setValue: (v: string) => void; placeholder: string; unit?: string;
  }) => (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputRow}>
        <TextInput style={styles.input} value={value} onChangeText={setValue}
          keyboardType="numeric" placeholder={placeholder} placeholderTextColor={colors.textMuted} />
        {unit && <Text style={styles.unit}>{unit}</Text>}
      </View>
    </View>
  ), []);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* KORXONA + QUTI NOMI */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📝 Korxona & quti nomi</Text>
          <InputField label="Korxona" value={companyName} setValue={setCompanyName} placeholder="Shovot Carton" />
          <InputField label="Quti nomi" value={boxName} setValue={setBoxName} placeholder="RSC quti" />
        </View>

        {/* QUTI O'LCHAMLARI */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📦 Quti o'lchamlari (sm)</Text>
          <View style={styles.row}>
            <InputField label="Bo'yi (L)" value={boxL} setValue={setBoxL} placeholder="30" unit="sm" />
            <InputField label="Eni (W)" value={boxW} setValue={setBoxW} placeholder="20" unit="sm" />
            <InputField label="Balandligi (H)" value={boxH} setValue={setBoxH} placeholder="15" unit="sm" />
          </View>
        </View>

        {/* ESKIZ + 3D — to'liq ekran */}
        {hasBox && (
          <View style={styles.sketchSection}>
            <View style={styles.sketchHeader}>
              <Text style={styles.sketchTitle}>📐 {boxName}</Text>
              <Text style={styles.sketchSub}>{n(boxW)} × {n(boxH)} × {n(boxL)} sm</Text>
            </View>
            <BoxWebView boxW={n(boxW)} boxH={n(boxH)} boxL={n(boxL)} />
          </View>
        )}

        {/* QOG'OG'IZ OG'IRLIGI */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📄 Qog'oz og'irligi</Text>
          <InputField label="Og'irlik" value={paperWeightKg} setValue={setPaperWeightKg} placeholder="0.125" unit="kg/m²" />
        </View>

        {/* QATLAM NARXLARI */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>💰 Har bir qatlam narxi (so'm/kg)</Text>
          <InputField label="1-qatlam (tashqi)" value={priceLayer1} setValue={setPriceLayer1} placeholder="8000" unit="so'm/kg" />
          <InputField label="2-qatlam (gofra)" value={priceLayer2} setValue={setPriceLayer2} placeholder="6000" unit="so'm/kg" />
          <InputField label="3-qatlam (ichki)" value={priceLayer3} setValue={setPriceLayer3} placeholder="7000" unit="so'm/kg" />
        </View>

        {/* MIQDOR */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📊 Miqdor</Text>
          <View style={styles.row}>
            <InputField label="Chiqindi" value={wastePercent} setValue={setWastePercent} placeholder="10" unit="%" />
            <InputField label="Miqdor" value={quantity} setValue={setQuantity} placeholder="1000" unit="dona" />
          </View>
          {calc && (
            <View style={styles.resultSummary}>
              <View style={styles.resultSummaryRow}>
                <Text style={styles.resultSummaryLabel}>Ishlab chiqarish:</Text>
                <Text style={styles.resultSummaryValue}>{fmt(calc.total.paper)} so'm</Text>
              </View>
              <View style={styles.resultSummaryRow}>
                <Text style={[styles.resultSummaryLabel, { color: "#6366f1" }]}>Daromad:</Text>
                <Text style={[styles.resultSummaryValue, { color: "#6366f1" }]}>{fmt(calc.revenue)} so'm</Text>
              </View>
              <View style={styles.resultSummaryRow}>
                <Text style={[styles.resultSummaryLabel, { color: colors.danger }]}>Sof foyda:</Text>
                <Text style={[styles.resultSummaryValue, { color: colors.danger }]}>{fmt(calc.profit)} so'm</Text>
              </View>
            </View>
          )}
        </View>

        {/* SOTISH NARXI */}
        <View style={[styles.card, { backgroundColor: "#fffbeb", borderColor: "#fbbf24" }]}>
          <Text style={[styles.cardTitle, { color: "#b45309" }]}>📈 Sotish narxi</Text>
          <InputField label="Koeffitsient" value={coefficient} setValue={setCoefficient} placeholder="1.5" unit="×" />
        </View>

        {/* NATIJALAR */}
        {hasBox && calc && (
          <>
            {/* KESMA O'LCHAMLARI */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>✂️ Kesma o'lchamlari</Text>
              <View style={styles.dimRow}>
                <View style={styles.dimBox}>
                  <Text style={styles.dimValue}>{calc.blankLen}</Text>
                  <Text style={styles.dimLabel}>sm uzunlik</Text>
                </View>
                <View style={styles.dimBox}>
                  <Text style={styles.dimValue}>{calc.blankW}</Text>
                  <Text style={styles.dimLabel}>sm en</Text>
                </View>
                <View style={[styles.dimBox, { backgroundColor: "#fef3c7" }]}>
                  <Text style={[styles.dimValue, { color: "#d97706" }]}>{calc.netAreaM2}</Text>
                  <Text style={[styles.dimLabel, { color: "#d97706" }]}>m² maydon</Text>
                </View>
              </View>
            </View>

            {/* 3 QATLAMLI JADVAL */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>📄 3 qatlamli qog'oz (1 dona uchun)</Text>
              <View style={[styles.tableRow, styles.tableHeader]}>
                <Text style={[styles.tableCell, styles.tableHeaderText]}>Qatlam</Text>
                <Text style={[styles.tableCell, styles.tableHeaderText]}>Turi</Text>
                <Text style={[styles.tableCell, styles.tableHeaderText, { textAlign: "right" }]}>Og'irlik</Text>
                <Text style={[styles.tableCell, styles.tableHeaderText, { textAlign: "right" }]}>Narx</Text>
                <Text style={[styles.tableCell, styles.tableHeaderText, { textAlign: "right" }]}>Summa</Text>
              </View>
              <View style={styles.tableRow}>
                <Text style={[styles.tableCell, { fontWeight: "800", color: "#2563eb" }]}>1</Text>
                <Text style={[styles.tableCell, { color: colors.textSecondary }]}>Tashqi</Text>
                <Text style={[styles.tableCell, { textAlign: "right", fontWeight: "700" }]}>{calc.l1.weight} kg</Text>
                <Text style={[styles.tableCell, { textAlign: "right", color: colors.textSecondary }]}>{fmt(calc.l1.price)}</Text>
                <Text style={[styles.tableCell, { textAlign: "right", fontWeight: "700" }]}>{fmt(calc.l1.cost)}</Text>
              </View>
              <View style={[styles.tableRow, { backgroundColor: "#fffbeb" }]}>
                <Text style={[styles.tableCell, { fontWeight: "800", color: "#d97706" }]}>2</Text>
                <Text style={[styles.tableCell, { color: colors.textSecondary }]}>Gofra ÷0.7</Text>
                <Text style={[styles.tableCell, { textAlign: "right", fontWeight: "700" }]}>{calc.l2.weight} kg</Text>
                <Text style={[styles.tableCell, { textAlign: "right", color: "#d97706" }]}>{fmt(calc.l2.price)}</Text>
                <Text style={[styles.tableCell, { textAlign: "right", fontWeight: "700" }]}>{fmt(calc.l2.cost)}</Text>
              </View>
              <View style={styles.tableRow}>
                <Text style={[styles.tableCell, { fontWeight: "800", color: "#22c55e" }]}>3</Text>
                <Text style={[styles.tableCell, { color: colors.textSecondary }]}>Ichki</Text>
                <Text style={[styles.tableCell, { textAlign: "right", fontWeight: "700" }]}>{calc.l3.weight} kg</Text>
                <Text style={[styles.tableCell, { textAlign: "right", color: colors.textSecondary }]}>{fmt(calc.l3.price)}</Text>
                <Text style={[styles.tableCell, { textAlign: "right", fontWeight: "700" }]}>{fmt(calc.l3.cost)}</Text>
              </View>
              <View style={[styles.tableRow, styles.tableFooter]}>
                <Text style={[styles.tableCell, { fontWeight: "800", fontSize: 14 }]}>JAMI</Text>
                <Text style={[styles.tableCell]}></Text>
                <Text style={[styles.tableCell, { textAlign: "right", fontWeight: "800", fontSize: 14 }]}>{calc.totalWeight} kg</Text>
                <Text style={[styles.tableCell]}></Text>
                <Text style={[styles.tableCell, { textAlign: "right", fontWeight: "800", fontSize: 16, color: colors.primary }]}>{fmt(calc.totalPaperCost)} so'm</Text>
              </View>
            </View>

            {/* NARX CARD'LAR */}
            <View style={styles.priceCardsRow}>
              <View style={[styles.priceCard, { backgroundColor: "#eff6ff", borderColor: "#3b82f6" }]}>
                <Text style={[styles.priceCardLabel, { color: "#2563eb" }]}>Ishlab chiqarish</Text>
                <Text style={[styles.priceCardValue, { color: "#2563eb" }]}>{fmt(calc.perBox.total)}</Text>
                <Text style={[styles.priceCardUnit, { color: "#3b82f6" }]}>so'm / dona</Text>
              </View>
              <View style={[styles.priceCard, { backgroundColor: "#ecfdf5", borderColor: "#22c55e", borderWidth: 2 }]}>
                <Text style={[styles.priceCardLabel, { color: "#16a34a" }]}>Sotish narxi</Text>
                <Text style={[styles.priceCardValue, { color: "#16a34a" }]}>{fmt(calc.sellingPrice)}</Text>
                <Text style={[styles.priceCardUnit, { color: "#22c55e" }]}>so'm / dona</Text>
                <View style={styles.coeffBadge}>
                  <Text style={styles.coeffBadgeText}>× {calc.coefficient}</Text>
                </View>
              </View>
            </View>

            {/* MIQDOR BO'LIMI */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>📊 {fmt(calc.total.quantity)} dona uchun</Text>
              <View style={styles.resultSummaryRow}>
                <Text style={styles.resultSummaryLabel}>Ishlab chiqarish:</Text>
                <Text style={styles.resultSummaryValue}>{fmt(calc.total.paper)} so'm</Text>
              </View>
              <View style={styles.resultSummaryRow}>
                <Text style={[styles.resultSummaryLabel, { color: "#6366f1" }]}>Daromad:</Text>
                <Text style={[styles.resultSummaryValue, { color: "#6366f1" }]}>{fmt(calc.revenue)} so'm</Text>
              </View>
              <View style={styles.resultSummaryRow}>
                <Text style={[styles.resultSummaryLabel, { color: colors.danger }]}>Sof foyda:</Text>
                <Text style={[styles.resultSummaryValue, { color: colors.danger }]}>{fmt(calc.profit)} so'm</Text>
              </View>
            </View>
          </>
        )}

        {!hasBox && (
          <View style={styles.emptyState}>
            <Text style={{ fontSize: 48, marginBottom: 12 }}>📦</Text>
            <Text style={styles.emptyText}>Quti o'lchamlarini kiriting (sm)</Text>
            <Text style={styles.emptySub}>Eskiz avtomatik chiziladi</Text>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: 40 },
  card: {
    backgroundColor: colors.surface, borderRadius: radius.xl,
    padding: spacing.lg, marginHorizontal: spacing.lg,
    marginBottom: spacing.md, ...shadows.sm,
    borderWidth: 1, borderColor: colors.border,
  },
  cardTitle: { fontSize: 14, fontWeight: "700", color: colors.text, marginBottom: spacing.md },
  row: { flexDirection: "row", gap: 10 },
  field: { flex: 1, marginBottom: 10 },
  label: { fontSize: 11, fontWeight: "600", color: colors.textSecondary, marginBottom: 4 },
  inputRow: { flexDirection: "row", alignItems: "center" },
  input: {
    flex: 1, backgroundColor: colors.surfaceAlt, borderRadius: radius.md,
    paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 15, fontWeight: "600", color: colors.text,
    borderWidth: 1, borderColor: colors.border,
  },
  unit: { fontSize: 10, color: colors.textMuted, marginLeft: 6, minWidth: 50 },
  resultSummary: {
    marginTop: spacing.sm, paddingTop: spacing.md,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  resultSummaryRow: {
    flexDirection: "row", justifyContent: "space-between", paddingVertical: 4,
  },
  resultSummaryLabel: { fontSize: 13, color: colors.textSecondary, fontWeight: "500" },
  resultSummaryValue: { fontSize: 13, fontWeight: "700", color: colors.text },
  dimRow: { flexDirection: "row", gap: 10 },
  dimBox: {
    flex: 1, backgroundColor: "#f5f3ff", borderRadius: radius.md,
    padding: 12, alignItems: "center",
  },
  dimValue: { fontSize: 18, fontWeight: "800", color: "#7c3aed" },
  dimLabel: { fontSize: 10, color: "#7c3aed", marginTop: 2 },
  tableRow: {
    flexDirection: "row", paddingVertical: 8,
    borderBottomWidth: 0.5, borderBottomColor: colors.border,
  },
  tableHeader: {
    backgroundColor: colors.surfaceAlt, borderTopLeftRadius: radius.sm, borderTopRightRadius: radius.sm,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  tableHeaderText: { fontWeight: "700", color: colors.textSecondary, fontSize: 11 },
  tableCell: { flex: 1, fontSize: 12, color: colors.text, paddingHorizontal: 4 },
  tableFooter: { backgroundColor: "#f0fdf4", borderBottomWidth: 0, paddingTop: 10 },
  priceCardsRow: { flexDirection: "row", gap: 10, marginHorizontal: spacing.lg, marginBottom: spacing.md },
  priceCard: {
    flex: 1, borderRadius: radius.xl, padding: 16, alignItems: "center",
    borderWidth: 1, ...shadows.sm,
  },
  priceCardLabel: { fontSize: 11, fontWeight: "700", textTransform: "uppercase" },
  priceCardValue: { fontSize: 28, fontWeight: "800", marginTop: 4 },
  priceCardUnit: { fontSize: 11, marginTop: 4 },
  coeffBadge: {
    marginTop: 6, backgroundColor: "#dcfce7", paddingHorizontal: 10,
    paddingVertical: 3, borderRadius: 20,
  },
  coeffBadgeText: { fontSize: 12, fontWeight: "700", color: "#16a34a" },
  emptyState: { padding: 60, alignItems: "center" },
  emptyText: { fontSize: 14, color: colors.textMuted, fontWeight: "600" },
  emptySub: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
  sketchSection: {
    marginHorizontal: spacing.lg, marginBottom: spacing.md,
    backgroundColor: colors.surface, borderRadius: radius.xl,
    overflow: "hidden", ...shadows.sm,
  },
  sketchHeader: {
    paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm,
    backgroundColor: "#f0fdf4", borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  sketchTitle: { fontSize: 15, fontWeight: "700", color: colors.text },
  sketchSub: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
});

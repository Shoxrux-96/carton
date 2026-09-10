import React from "react";

interface BoxTemplateProps {
  boxLength: number;  // cm
  boxWidth: number;   // cm
  boxHeight: number;  // cm
  showFlat?: boolean;
  show3D?: boolean;
  showTitle?: boolean;
  printMode?: boolean;  // chop etish uchun — rangsiz, katta o'lchamlar
}

export default function BoxTemplate({ boxLength, boxWidth, boxHeight, showFlat = true, show3D = true, showTitle = true, printMode = false }: BoxTemplateProps) {
  const L = boxLength;
  const W = boxWidth;
  const H = boxHeight;

  // Kesma o'lchamlari (sm)
  const blankLen = 2 * W + 2 * L + 6;          // uzunlik: 2(W+L) + 6
  const flapH = L / 2;                          // kanot: bo'yi/2
  const blankW = 1 + flapH + H + flapH + 1;    // eni: 1 + L/2 + H + L/2 + 1

  // SVG — 1 sm = 7px (katta eskiz)
  const S = 7;
  const svgW = blankLen * S;
  const svgH = blankW * S;
  const pad = 50;

  // X koordinatalari (sm → px)
  const x0 = 0;                        // boshlash
  const xW1 = W * S;                   // 1-paneldan keyin
  const xL1 = (W + L) * S;            // 2-paneldan keyin
  const xW2 = (2 * W + L) * S;        // 3-paneldan keyin
  const xL2 = (2 * W + 2 * L) * S;    // 4-paneldan keyin
  const xGlue = xL2;                   // yelim boshlanishi
  const xCut = xL2 + 5 * S;           // yelim tugashi (5sm)
  const xEnd = xCut + 1 * S;          // chiqindi tugashi (1sm)

  // Y koordinatalari
  const yCutTop = 0;                                     // tepa chiqindi (1sm)
  const yFlapTop = 1 * S;                                // tep kanot boshlanishi
  const yCenter = (1 + flapH) * S;                       // markaz boshlanishi
  const yFlapBot = (1 + flapH + H) * S;                  // past kanot boshlanishi
  const yCutBot = (1 + flapH + H + flapH) * S;           // past chiqindi boshlanishi
  const yEnd = (1 + flapH + H + flapH + 1) * S;         // yakun

  // 3D box SVG dimensions
  const box3dW = 320;
  const box3dH = 280;
  const bx = 40;  // box x offset
  const by = 50;  // box y offset (pastga siljitildi)
  const bw = 180; // box width
  const bh = 120; // box height
  const d = 60;   // depth (oblique projection)

  const f = (n: number) => Math.round(n * 10) / 10;

  return (
    <div className="relative">
      {/* FLAT SKETCH */}
      {showFlat && (
      <svg
        width={svgW + pad * 2 + 30}
        height={svgH + pad * 2 + 20}
        viewBox={`${-pad - 30} ${-pad} ${svgW + pad * 2 + 30} ${svgH + pad * 2 + 20}`}
        className="w-full h-auto"
        style={{ maxHeight: "400px" }}
      >
        {/* Fon */}
        <rect x={-pad - 30} y={-pad} width={svgW + pad * 2 + 30} height={svgH + pad * 2 + 20} fill="white" />

        {/* ===== TEPA CHIQINDI (1 sm) ===== */}
        <rect x={0} y={yCutTop} width={svgW} height={1 * S}
          fill="#fee2e2" stroke="#ef4444" strokeWidth={1} strokeDasharray="4 2" />
        <text x={svgW / 2} y={yCutTop + 0.5 * S + 5} textAnchor="middle" fontSize={11} fill="#ef4444" fontWeight="bold">
          1 sm — chiqindi (chiqarish uchun)
        </text>

        {/* ===== TOP FLAPS (L/2) ===== */}
        <rect x={x0} y={yFlapTop} width={xW1} height={flapH * S}
          fill="#dbeafe" stroke="#3b82f6" strokeWidth={1.5} strokeDasharray="5 3" />
        <rect x={xW1} y={yFlapTop} width={xL1 - xW1} height={flapH * S}
          fill="#dbeafe" stroke="#3b82f6" strokeWidth={1.5} strokeDasharray="5 3" />
        <rect x={xL1} y={yFlapTop} width={xW2 - xL1} height={flapH * S}
          fill="#dbeafe" stroke="#3b82f6" strokeWidth={1.5} strokeDasharray="5 3" />
        <rect x={xW2} y={yFlapTop} width={xL2 - xW2} height={flapH * S}
          fill="#dbeafe" stroke="#3b82f6" strokeWidth={1.5} strokeDasharray="5 3" />

        {/* ===== MARKAZ PANELLARI (asosiy devorlar) ===== */}
        {/* Panel 1 — W */}
        <rect x={x0} y={yCenter} width={xW1} height={H * S}
          fill="#fef3c7" stroke="#d97706" strokeWidth={2.5} />
        {/* Panel 2 — L */}
        <rect x={xW1} y={yCenter} width={xL1 - xW1} height={H * S}
          fill="#fed7aa" stroke="#ea580c" strokeWidth={2.5} />
        {/* Panel 3 — W */}
        <rect x={xL1} y={yCenter} width={xW2 - xL1} height={H * S}
          fill="#fef3c7" stroke="#d97706" strokeWidth={2.5} />
        {/* Panel 4 — L */}
        <rect x={xW2} y={yCenter} width={xL2 - xW2} height={H * S}
          fill="#fed7aa" stroke="#ea580c" strokeWidth={2.5} />

        {/* ===== YELIM SOHASI (5 sm) ===== */}
        <rect x={xGlue} y={yCenter} width={5 * S} height={H * S}
          fill="#d1fae5" stroke="#10b981" strokeWidth={1.5} strokeDasharray="6 3" />

        {/* ===== CHIQINDI SOHASI (1 sm) ===== */}
        <rect x={xCut} y={yCenter} width={1 * S} height={H * S}
          fill="#fee2e2" stroke="#ef4444" strokeWidth={1} strokeDasharray="3 2" />

        {/* ===== PASTKI FLAPS (L/2) ===== */}
        <rect x={x0} y={yFlapBot} width={xW1} height={flapH * S}
          fill="#dbeafe" stroke="#3b82f6" strokeWidth={1.5} strokeDasharray="5 3" />
        <rect x={xW1} y={yFlapBot} width={xL1 - xW1} height={flapH * S}
          fill="#dbeafe" stroke="#3b82f6" strokeWidth={1.5} strokeDasharray="5 3" />
        <rect x={xL1} y={yFlapBot} width={xW2 - xL1} height={flapH * S}
          fill="#dbeafe" stroke="#3b82f6" strokeWidth={1.5} strokeDasharray="5 3" />
        <rect x={xW2} y={yFlapBot} width={xL2 - xW2} height={flapH * S}
          fill="#dbeafe" stroke="#3b82f6" strokeWidth={1.5} strokeDasharray="5 3" />

        {/* ===== PASTKI CHIQINDI (1 sm) ===== */}
        <rect x={0} y={yCutBot} width={svgW} height={1 * S}
          fill="#fee2e2" stroke="#ef4444" strokeWidth={1} strokeDasharray="4 2" />
        <text x={svgW / 2} y={yCutBot + 0.5 * S + 5} textAnchor="middle" fontSize={11} fill="#ef4444" fontWeight="bold">
          1 sm — chiqindi (chiqarish uchun)
        </text>

        {/* ===== PANEL MARKERS (ichida) ===== */}
        {/* Panel 1 */}
        <text x={xW1 / 2} y={yCenter + H * S / 2 - 10} textAnchor="middle" fontSize={14} fontWeight="bold" fill="#92400e">W</text>
        <text x={xW1 / 2} y={yCenter + H * S / 2 + 12} textAnchor="middle" fontSize={11} fill="#92400e">{W} sm</text>

        {/* Panel 2 */}
        <text x={(xW1 + xL1) / 2} y={yCenter + H * S / 2 - 10} textAnchor="middle" fontSize={14} fontWeight="bold" fill="#9a3412">L</text>
        <text x={(xW1 + xL1) / 2} y={yCenter + H * S / 2 + 12} textAnchor="middle" fontSize={11} fill="#9a3412">{L} sm</text>

        {/* Panel 3 */}
        <text x={(xL1 + xW2) / 2} y={yCenter + H * S / 2 - 10} textAnchor="middle" fontSize={14} fontWeight="bold" fill="#92400e">W</text>
        <text x={(xL1 + xW2) / 2} y={yCenter + H * S / 2 + 12} textAnchor="middle" fontSize={11} fill="#92400e">{W} sm</text>

        {/* Panel 4 */}
        <text x={(xW2 + xL2) / 2} y={yCenter + H * S / 2 - 10} textAnchor="middle" fontSize={14} fontWeight="bold" fill="#9a3412">L</text>
        <text x={(xW2 + xL2) / 2} y={yCenter + H * S / 2 + 12} textAnchor="middle" fontSize={11} fill="#9a3412">{L} sm</text>

        {/* Yelim */}
        <text x={xGlue + 2.5 * S} y={yCenter + H * S / 2 - 6} textAnchor="middle" fontSize={10} fontWeight="bold" fill="#065f46">YELIM</text>
        <text x={xGlue + 2.5 * S} y={yCenter + H * S / 2 + 8} textAnchor="middle" fontSize={9} fill="#065f46">5 sm</text>

        {/* Chiqindi (yelim ortidan) */}
        <text x={xCut + 0.5 * S} y={yCenter + H * S / 2 + 5} textAnchor="middle" fontSize={9} fill="#ef4444" fontWeight="bold">1</text>

        {/* Top flap labels */}
        <text x={xW1 / 2} y={yFlapTop + flapH * S / 2 + 5} textAnchor="middle" fontSize={10} fill="#1e40af" fontWeight="bold">L/2</text>
        <text x={(xW1 + xL1) / 2} y={yFlapTop + flapH * S / 2 + 5} textAnchor="middle" fontSize={10} fill="#1e40af" fontWeight="bold">L/2</text>

        {/* Bottom flap labels */}
        <text x={xW1 / 2} y={yFlapBot + flapH * S / 2 + 5} textAnchor="middle" fontSize={10} fill="#1e40af" fontWeight="bold">L/2</text>
        <text x={(xW1 + xL1) / 2} y={yFlapBot + flapH * S / 2 + 5} textAnchor="middle" fontSize={10} fill="#1e40af" fontWeight="bold">L/2</text>

        {/* ===== PASTKI — UZUNLIK O'LCHAMLARI ===== */}
        <line x1={0} y1={svgH + 10} x2={svgW} y2={svgH + 10} stroke="#374151" strokeWidth={1.5} markerEnd="url(#aR)" markerStart="url(#aL)" />

        {/* W1 */}
        <line x1={x0} y1={svgH + 4} x2={xW1} y2={svgH + 4} stroke="#d97706" strokeWidth={1} />
        <text x={xW1 / 2} y={svgH + 24} textAnchor="middle" fontSize={11} fill="#d97706" fontWeight="bold">{W}</text>

        {/* L1 */}
        <line x1={xW1} y1={svgH + 4} x2={xL1} y2={svgH + 4} stroke="#ea580c" strokeWidth={1} />
        <text x={(xW1 + xL1) / 2} y={svgH + 24} textAnchor="middle" fontSize={11} fill="#ea580c" fontWeight="bold">{L}</text>

        {/* W2 */}
        <line x1={xL1} y1={svgH + 4} x2={xW2} y2={svgH + 4} stroke="#d97706" strokeWidth={1} />
        <text x={(xL1 + xW2) / 2} y={svgH + 24} textAnchor="middle" fontSize={11} fill="#d97706" fontWeight="bold">{W}</text>

        {/* L2 */}
        <line x1={xW2} y1={svgH + 4} x2={xL2} y2={svgH + 4} stroke="#ea580c" strokeWidth={1} />
        <text x={(xW2 + xL2) / 2} y={svgH + 24} textAnchor="middle" fontSize={11} fill="#ea580c" fontWeight="bold">{L}</text>

        {/* Glue 5sm */}
        <line x1={xGlue} y1={svgH + 4} x2={xCut} y2={svgH + 4} stroke="#10b981" strokeWidth={1} />
        <text x={xGlue + 2.5 * S} y={svgH + 24} textAnchor="middle" fontSize={10} fill="#10b981" fontWeight="bold">5</text>

        {/* Cut 1sm */}
        <line x1={xCut} y1={svgH + 4} x2={xEnd} y2={svgH + 4} stroke="#ef4444" strokeWidth={1} />
        <text x={xCut + 0.5 * S} y={svgH + 24} textAnchor="middle" fontSize={10} fill="#ef4444" fontWeight="bold">1</text>

        {/* Jami */}
        <text x={svgW / 2} y={svgH + 42} textAnchor="middle" fontSize={12} fontWeight="bold" fill="#374151">
          Kesma: {f(blankLen)} sm × {f(blankW)} sm
        </text>

        {/* ===== CHAP — VERTIKAL O'LCHAMLAR ===== */}
        {/* 1 sm chiqindi (tepa) */}
        <line x1={-12} y1={yCutTop} x2={-12} y2={yFlapTop} stroke="#ef4444" strokeWidth={1} />
        <text x={-18} y={(yCutTop + yFlapTop) / 2 + 5} textAnchor="end" fontSize={10} fill="#ef4444" fontWeight="bold">1</text>

        {/* L/2 (tep kanot) */}
        <line x1={-12} y1={yFlapTop} x2={-12} y2={yCenter} stroke="#3b82f6" strokeWidth={1} />
        <text x={-18} y={(yFlapTop + yCenter) / 2 + 5} textAnchor="end" fontSize={10} fill="#3b82f6" fontWeight="bold">{f(L / 2)}</text>

        {/* H (markaz) */}
        <line x1={-12} y1={yCenter} x2={-12} y2={yFlapBot} stroke="#d97706" strokeWidth={1.5} />
        <text x={-18} y={(yCenter + yFlapBot) / 2 + 5} textAnchor="end" fontSize={11} fill="#d97706" fontWeight="bold">{H}</text>

        {/* L/2 (past kanot) */}
        <line x1={-12} y1={yFlapBot} x2={-12} y2={yCutBot} stroke="#3b82f6" strokeWidth={1} />
        <text x={-18} y={(yFlapBot + yCutBot) / 2 + 5} textAnchor="end" fontSize={10} fill="#3b82f6" fontWeight="bold">{f(L / 2)}</text>

        {/* 1 sm chiqindi (past) */}
        <line x1={-12} y1={yCutBot} x2={-12} y2={yEnd} stroke="#ef4444" strokeWidth={1} />
        <text x={-18} y={(yCutBot + yEnd) / 2 + 5} textAnchor="end" fontSize={10} fill="#ef4444" fontWeight="bold">1</text>

        <defs>
          <marker id="aR" markerWidth={8} markerHeight={8} refX={8} refY={4} orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#374151" /></marker>
          <marker id="aL" markerWidth={8} markerHeight={8} refX={0} refY={4} orient="auto"><path d="M8,0 L0,4 L8,8 Z" fill="#374151" /></marker>
        </defs>
      </svg>
      )}

      {/* 3D QUTI CHIZMASI */}
      {show3D && (
      <div className={printMode ? "" : "mt-4 border-t border-border/50 pt-4"}>
        {showTitle && <p className="text-xs font-bold text-center text-muted-foreground mb-3">📦 3D ko'rinish — Yig'ilgan quti</p>}
        <svg
          viewBox={`0 0 ${box3dW + 40} ${box3dH + 40}`}
          className="w-full h-auto"
          style={{ maxHeight: printMode ? "none" : "260px" }}
        >
          <rect x={0} y={0} width={box3dW + 40} height={box3dH + 40} fill="white" />

          {/* Old tomon (W × H) */}
          <rect x={bx} y={by} width={bw} height={bh}
            fill="#fef3c7" stroke="#d97706" strokeWidth={2} />

          {/* Ong tomon (L × H) — oblique */}
          <polygon
            points={`${bx + bw},${by} ${bx + bw + d},${by - d * 0.6} ${bx + bw + d},${by + bh - d * 0.6} ${bx + bw},${by + bh}`}
            fill="#fed7aa" stroke="#ea580c" strokeWidth={2} />
          <line x1={bx + bw} y1={by} x2={bx + bw + d} y2={by - d * 0.6}
            stroke="#ea580c" strokeWidth={1} strokeDasharray="4 2" />

          {/* Tepa tomon (W × L) — oblique */}
          <polygon
            points={`${bx},${by} ${bx + d},${by - d * 0.6} ${bx + bw + d},${by - d * 0.6} ${bx + bw},${by}`}
            fill="#dbeafe" stroke="#3b82f6" strokeWidth={2} />

          {/* Tepa qanot chizig'i (yelim) */}
          <line x1={bx + bw * 0.6} y1={by} x2={bx + bw * 0.6 + d} y2={by - d * 0.6}
            stroke="black" strokeWidth={1.5} strokeDasharray="3 2" />

          {/* O'lchamlar — W (pastda) — KATTA */}
          <line x1={bx} y1={by + bh + 18} x2={bx + bw} y2={by + bh + 18}
            stroke="#d97706" strokeWidth={1.5} markerEnd="url(#aR3d)" markerStart="url(#aL3d)" />
          <text x={bx + bw / 2} y={by + bh + 35} textAnchor="middle" fontSize={printMode ? 14 : 10} fill="#d97706" fontWeight="bold">
            W = {W}
          </text>

          {/* O'lchamlar — H (chapda vertikal) — KATTA */}
          <line x1={bx - 18} y1={by} x2={bx - 18} y2={by + bh}
            stroke="#d97706" strokeWidth={1.5} markerEnd="url(#aD3d)" markerStart="url(#aU3d)" />
          <text x={bx - 26} y={by + bh / 2 + 5} textAnchor="end" fontSize={printMode ? 14 : 10} fill="#d97706" fontWeight="bold">
            H = {H}
          </text>

          {/* H — old tomon ichida */}
          <text x={bx + bw / 2} y={by + bh / 2 + 5} textAnchor="middle" fontSize={printMode ? 14 : 10} fill="#d97706" fontWeight="bold">
            H = {H}
          </text>

          {/* O'lchamlar — L (pastda diagonal) — KATTA */}
          <line x1={bx + bw} y1={by + bh + 18} x2={bx + bw + d} y2={by + bh + 18 - d * 0.6}
            stroke="#ea580c" strokeWidth={1.5} />
          <line x1={bx + bw + d} y1={by + bh + 18 - d * 0.6 + 12} x2={bx + bw + d} y2={by + bh + 18 - d * 0.6 - 12}
            stroke="#ea580c" strokeWidth={1.5} markerEnd="url(#aD3d)" markerStart="url(#aU3d)" />
          <text x={bx + bw + d + 12} y={by + bh + 18 - d * 0.3 + 5} textAnchor="start" fontSize={printMode ? 14 : 10} fill="#ea580c" fontWeight="bold">
            L = {L}
          </text>

          {/* Label — KATTA */}
          <text x={bx + bw / 2} y={by + bh / 2 - 18} textAnchor="middle" fontSize={printMode ? 16 : 12} fill="#374151" fontWeight="bold">
            {W} × {H} × {L}
          </text>
          <text x={bx + bw / 2} y={by + bh / 2} textAnchor="middle" fontSize={printMode ? 11 : 8} fill="#6b7280">
            W × H × L
          </text>

          <defs>
            <marker id="aR3d" markerWidth={7} markerHeight={7} refX={7} refY={3.5} orient="auto"><path d="M0,0 L7,3.5 L0,7 Z" fill="#d97706" /></marker>
            <marker id="aL3d" markerWidth={7} markerHeight={7} refX={0} refY={3.5} orient="auto"><path d="M7,0 L0,3.5 L7,7 Z" fill="#d97706" /></marker>
            <marker id="aD3d" markerWidth={7} markerHeight={7} refX={3.5} refY={7} orient="auto"><path d="M0,0 L7,0 L3.5,7 Z" fill="#d97706" /></marker>
            <marker id="aU3d" markerWidth={7} markerHeight={7} refX={3.5} refY={0} orient="auto"><path d="M0,7 L7,7 L3.5,0 Z" fill="#d97706" /></marker>
          </defs>
        </svg>
      </div>
      )}
    </div>
  );
}

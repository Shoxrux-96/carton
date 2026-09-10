import React from "react";

interface BoxTemplateProps {
  boxLength: number;  // cm
  boxWidth: number;   // cm
  boxHeight: number;  // cm
}

export default function BoxTemplate({ boxLength, boxWidth, boxHeight }: BoxTemplateProps) {
  const L = boxLength;  // sm
  const W = boxWidth;   // sm
  const H = boxHeight;  // sm

  // Kesma o'lchamlari (sm)
  const blankLen = 2 * W + 2 * L + 6;         // 2(W+L) + 6sm (5 yelim + 1 chiqindi)
  const flapH = L / 2;                         // kanot = bo'yi / 2
  const cutSize = 1;                           // 1 sm chiqindi (tep/past)
  const blankW = cutSize + flapH + H + flapH + cutSize; // H + L + 2 sm

  // SVG масштаб — 1 sm = 5px
  const scale = 5;
  const svgW = blankLen * scale;
  const svgH = blankW * scale;
  const pad = 60;

  // Panel koordinatalari (sm → px)
  const p1x = 0;
  const p2x = W * scale;
  const p3x = (W + L) * scale;
  const p4x = (2 * W + L) * scale;
  const glueX = (2 * W + 2 * L) * scale;
  const cutX = glueX + 5 * scale; // 1 sm chiqindi

  // Vertikal koordinatalar
  const cutTopY = 0;
  const topFlapY = cutSize * scale;
  const centerY = (cutSize + flapH) * scale;
  const bottomFlapY = (cutSize + flapH + H) * scale;
  const cutBottomY = (cutSize + flapH + H + flapH) * scale;

  const fmt = (n: number) => Math.round(n * 10) / 10;

  return (
    <div className="relative">
      <svg
        width={svgW + pad * 2 + 40}
        height={svgH + pad * 2 + 30}
        viewBox={`${-pad - 40} ${-pad} ${svgW + pad * 2 + 40} ${svgH + pad * 2 + 30}`}
        className="w-full h-auto"
        style={{ maxHeight: "500px" }}
      >
        <rect x={-pad - 40} y={-pad} width={svgW + pad * 2 + 40} height={svgH + pad * 2 + 30} fill="white" />

        {/* ===== CHIQINDI — tepadan 1sm ===== */}
        <rect x={0} y={cutTopY} width={cutX + 10 * scale} height={cutSize * scale}
          fill="#fee2e2" stroke="#ef4444" strokeWidth={1} strokeDasharray="4 2" />
        <text x={(cutX + 10 * scale) / 2} y={cutTopY + cutSize * scale / 2 + 4}
          textAnchor="middle" fontSize={10} fill="#ef4444" fontWeight="bold">1 sm chiqindi</text>

        {/* ===== TOP FLAPS ===== */}
        {[p1x, p2x, p3x, p4x].map((x, i) => {
          const w = i % 2 === 0 ? W : L;
          return (
            <rect key={`tf${i}`} x={x} y={topFlapY} width={w * scale} height={flapH * scale}
              fill="#dbeafe" stroke="#3b82f6" strokeWidth={1.5} strokeDasharray="5 3" />
          );
        })}

        {/* ===== CENTER PANELS (asosiy devorlar) ===== */}
        {/* Panel 1 — Width */}
        <rect x={p1x} y={centerY} width={W * scale} height={H * scale}
          fill="#fef3c7" stroke="#d97706" strokeWidth={2.5} />
        {/* Panel 2 — Length */}
        <rect x={p2x} y={centerY} width={L * scale} height={H * scale}
          fill="#fed7aa" stroke="#ea580c" strokeWidth={2.5} />
        {/* Panel 3 — Width */}
        <rect x={p3x} y={centerY} width={W * scale} height={H * scale}
          fill="#fef3c7" stroke="#d97706" strokeWidth={2.5} />
        {/* Panel 4 — Length */}
        <rect x={p4x} y={centerY} width={L * scale} height={H * scale}
          fill="#fed7aa" stroke="#ea580c" strokeWidth={2.5} />

        {/* ===== GLUE FLAP (5 sm) ===== */}
        <rect x={glueX} y={centerY} width={5 * scale} height={H * scale}
          fill="#d1fae5" stroke="#10b981" strokeWidth={1.5} strokeDasharray="6 3" />

        {/* ===== CHIQINDI — 1 sm (yelim ortidan) ===== */}
        <rect x={cutX} y={centerY} width={1 * scale} height={H * scale}
          fill="#fee2e2" stroke="#ef4444" strokeWidth={1} strokeDasharray="3 2" />

        {/* ===== BOTTOM FLAPS ===== */}
        {[p1x, p2x, p3x, p4x].map((x, i) => {
          const w = i % 2 === 0 ? W : L;
          return (
            <rect key={`bf${i}`} x={x} y={bottomFlapY} width={w * scale} height={flapH * scale}
              fill="#dbeafe" stroke="#3b82f6" strokeWidth={1.5} strokeDasharray="5 3" />
          );
        })}

        {/* ===== CHIQINDI — pastdan 1sm ===== */}
        <rect x={0} y={cutBottomY} width={svgW} height={cutSize * scale}
          fill="#fee2e2" stroke="#ef4444" strokeWidth={1} strokeDasharray="4 2" />
        <text x={svgW / 2} y={cutBottomY + cutSize * scale / 2 + 4}
          textAnchor="middle" fontSize={10} fill="#ef4444" fontWeight="bold">1 sm chiqindi</text>

        {/* ===== PANEL MARKERS (ichida) ===== */}
        {/* Panel 1 */}
        <text x={p1x + W * scale / 2} y={centerY + H * scale / 2 - 8} textAnchor="middle" fontSize={13} fontWeight="bold" fill="#92400e">W</text>
        <text x={p1x + W * scale / 2} y={centerY + H * scale / 2 + 10} textAnchor="middle" fontSize={10} fill="#92400e">{W} sm</text>

        {/* Panel 2 */}
        <text x={p2x + L * scale / 2} y={centerY + H * scale / 2 - 8} textAnchor="middle" fontSize={13} fontWeight="bold" fill="#9a3412">L</text>
        <text x={p2x + L * scale / 2} y={centerY + H * scale / 2 + 10} textAnchor="middle" fontSize={10} fill="#9a3412">{L} sm</text>

        {/* Panel 3 */}
        <text x={p3x + W * scale / 2} y={centerY + H * scale / 2 - 8} textAnchor="middle" fontSize={13} fontWeight="bold" fill="#92400e">W</text>
        <text x={p3x + W * scale / 2} y={centerY + H * scale / 2 + 10} textAnchor="middle" fontSize={10} fill="#92400e">{W} sm</text>

        {/* Panel 4 */}
        <text x={p4x + L * scale / 2} y={centerY + H * scale / 2 - 8} textAnchor="middle" fontSize={13} fontWeight="bold" fill="#9a3412">L</text>
        <text x={p4x + L * scale / 2} y={centerY + H * scale / 2 + 10} textAnchor="middle" fontSize={10} fill="#9a3412">{L} sm</text>

        {/* Glue flap */}
        <text x={glueX + 2.5 * scale} y={centerY + H * scale / 2 - 6} textAnchor="middle" fontSize={9} fontWeight="bold" fill="#065f46">YELIM</text>
        <text x={glueX + 2.5 * scale} y={centerY + H * scale / 2 + 6} textAnchor="middle" fontSize={8} fill="#065f46">5 sm</text>

        {/* 1 sm chiqindi (yelim ortidan) */}
        <text x={cutX + 0.5 * scale} y={centerY + H * scale / 2 + 4} textAnchor="middle" fontSize={7} fill="#ef4444" fontWeight="bold">1</text>

        {/* Top flap labels */}
        <text x={p1x + W * scale / 2} y={topFlapY + flapH * scale / 2 + 4} textAnchor="middle" fontSize={9} fill="#1e40af" fontWeight="bold">L/2</text>
        <text x={p2x + L * scale / 2} y={topFlapY + flapH * scale / 2 + 4} textAnchor="middle" fontSize={9} fill="#1e40af" fontWeight="bold">L/2</text>
        <text x={p3x + W * scale / 2} y={topFlapY + flapH * scale / 2 + 4} textAnchor="middle" fontSize={9} fill="#1e40af" fontWeight="bold">L/2</text>
        <text x={p4x + L * scale / 2} y={topFlapY + flapH * scale / 2 + 4} textAnchor="middle" fontSize={9} fill="#1e40af" fontWeight="bold">L/2</text>

        {/* Bottom flap labels */}
        <text x={p1x + W * scale / 2} y={bottomFlapY + flapH * scale / 2 + 4} textAnchor="middle" fontSize={9} fill="#1e40af" fontWeight="bold">L/2</text>
        <text x={p2x + L * scale / 2} y={bottomFlapY + flapH * scale / 2 + 4} textAnchor="middle" fontSize={9} fill="#1e40af" fontWeight="bold">L/2</text>

        {/* ===== PASTKI — UZUNLIK O'LCHAMI ===== */}
        <line x1={0} y1={svgH + 15} x2={svgW} y2={svgH + 15} stroke="#374151" strokeWidth={1.5} markerEnd="url(#aR)" markerStart="url(#aL)" />

        {/* Har bir qism ustida chiziq */}
        {/* W panel 1 */}
        <line x1={p1x} y1={svgH + 8} x2={p2x} y2={svgH + 8} stroke="#d97706" strokeWidth={1} />
        <text x={p1x + W * scale / 2} y={svgH + 25} textAnchor="middle" fontSize={9} fill="#d97706" fontWeight="bold">{W}</text>

        {/* L panel 2 */}
        <line x1={p2x} y1={svgH + 8} x2={p3x} y2={svgH + 8} stroke="#ea580c" strokeWidth={1} />
        <text x={p2x + L * scale / 2} y={svgH + 25} textAnchor="middle" fontSize={9} fill="#ea580c" fontWeight="bold">{L}</text>

        {/* W panel 3 */}
        <line x1={p3x} y1={svgH + 8} x2={p4x} y2={svgH + 8} stroke="#d97706" strokeWidth={1} />
        <text x={p3x + W * scale / 2} y={svgH + 25} textAnchor="middle" fontSize={9} fill="#d97706" fontWeight="bold">{W}</text>

        {/* L panel 4 */}
        <line x1={p4x} y1={svgH + 8} x2={glueX} y2={svgH + 8} stroke="#ea580c" strokeWidth={1} />
        <text x={p4x + L * scale / 2} y={svgH + 25} textAnchor="middle" fontSize={9} fill="#ea580c" fontWeight="bold">{L}</text>

        {/* Glue 5sm */}
        <line x1={glueX} y1={svgH + 8} x2={cutX} y2={svgH + 8} stroke="#10b981" strokeWidth={1} />
        <text x={glueX + 2.5 * scale} y={svgH + 25} textAnchor="middle" fontSize={8} fill="#10b981" fontWeight="bold">5</text>

        {/* Cut 1sm */}
        <line x1={cutX} y1={svgH + 8} x2={cutX + 1 * scale} y2={svgH + 8} stroke="#ef4444" strokeWidth={1} />
        <text x={cutX + 0.5 * scale} y={svgH + 25} textAnchor="middle" fontSize={8} fill="#ef4444" fontWeight="bold">1</text>

        {/* Jami uzunlik */}
        <text x={svgW / 2} y={svgH + 40} textAnchor="middle" fontSize={11} fontWeight="bold" fill="#374151">
          Kesma: {fmt(blankLen)} sm × {fmt(blankW)} sm
        </text>

        {/* ===== CHAP TOMON — VERTIKAL O'LCHAMLAR ===== */}
        {/* 1 sm chiqindi (tepa) */}
        <line x1={-15} y1={cutTopY} x2={-15} y2={topFlapY} stroke="#ef4444" strokeWidth={1} />
        <text x={-22} y={(cutTopY + topFlapY) / 2 + 4} textAnchor="end" fontSize={9} fill="#ef4444" fontWeight="bold">1</text>

        {/* L/2 (tep kanot) */}
        <line x1={-15} y1={topFlapY} x2={-15} y2={centerY} stroke="#3b82f6" strokeWidth={1} />
        <text x={-22} y={(topFlapY + centerY) / 2 + 4} textAnchor="end" fontSize={9} fill="#3b82f6" fontWeight="bold">{fmt(L / 2)}</text>

        {/* H (markaz) */}
        <line x1={-15} y1={centerY} x2={-15} y2={bottomFlapY} stroke="#d97706" strokeWidth={1.5} />
        <text x={-22} y={(centerY + bottomFlapY) / 2 + 4} textAnchor="end" fontSize={10} fill="#d97706" fontWeight="bold">{H}</text>

        {/* L/2 (past kanot) */}
        <line x1={-15} y1={bottomFlapY} x2={-15} y2={cutBottomY} stroke="#3b82f6" strokeWidth={1} />
        <text x={-22} y={(bottomFlapY + cutBottomY) / 2 + 4} textAnchor="end" fontSize={9} fill="#3b82f6" fontWeight="bold">{fmt(L / 2)}</text>

        {/* 1 sm chiqindi (past) */}
        <line x1={-15} y1={cutBottomY} x2={-15} y2={svgH} stroke="#ef4444" strokeWidth={1} />
        <text x={-22} y={(cutBottomY + svgH) / 2 + 4} textAnchor="end" fontSize={9} fill="#ef4444" fontWeight="bold">1</text>

        <defs>
          <marker id="aR" markerWidth={8} markerHeight={8} refX={8} refY={4} orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#374151" /></marker>
          <marker id="aL" markerWidth={8} markerHeight={8} refX={0} refY={4} orient="auto"><path d="M8,0 L0,4 L8,8 Z" fill="#374151" /></marker>
        </defs>
      </svg>
    </div>
  );
}

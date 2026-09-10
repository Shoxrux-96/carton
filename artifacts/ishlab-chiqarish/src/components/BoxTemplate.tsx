import React from "react";

interface BoxTemplateProps {
  boxLength: number;  // cm
  boxWidth: number;   // cm
  boxHeight: number;  // cm
}

export default function BoxTemplate({ boxLength, boxWidth, boxHeight }: BoxTemplateProps) {
  // cm → mm
  const L = boxLength * 10;
  const W = boxWidth * 10;
  const H = boxHeight * 10;

  // Kesma o'lchamlari (mm)
  const blankLen = 2 * W + 2 * L + 50;    // 4 panel + 5cm yelim chok
  const flapH = L / 2;                     // kanot = bo'yi / 2
  const cutTop = 10;    // 1 sm tepadan
  const cutBottom = 10; // 1 sm pastdan
  const blankW = cutTop + H + flapH + flapH + cutBottom; // H + L + 20mm

  // SVG масштаб — 1mm = 0.35px
  const scale = 0.35;
  const svgW = blankLen * scale;
  const svgH = blankW * scale;
  const pad = 50;

  // Panel koordinatalari (chapdan)
  const p1x = 0;
  const p2x = W * scale;
  const p3x = (W + L) * scale;
  const p4x = (2 * W + L) * scale;
  const glueX = (2 * W + 2 * L) * scale;

  // Vertikal koordinatalar
  const cutTopY = 0;
  const topFlapY = cutTop * scale;
  const centerY = (cutTop + flapH) * scale;
  const bottomFlapY = (cutTop + H) * scale;
  const cutBottomY = (cutTop + H + flapH + flapH) * scale;

  const fmt = (n: number) => Math.round(n);
  const fmtSm = (n: number) => (n / 10).toFixed(1);

  return (
    <div className="relative">
      <svg
        width={svgW + pad * 2}
        height={svgH + pad * 2}
        viewBox={`${-pad} ${-pad} ${svgW + pad * 2} ${svgH + pad * 2}`}
        className="w-full h-auto"
        style={{ maxHeight: "450px" }}
      >
        <rect x={-pad} y={-pad} width={svgW + pad * 2} height={svgH + pad * 2} fill="white" />

        {/* ===== CHIQINDI — tepadan 1sm ===== */}
        <rect x={0} y={cutTopY} width={svgW} height={cutTop * scale}
          fill="#fee2e2" stroke="#ef4444" strokeWidth={0.5} strokeDasharray="3 2" />
        <text x={svgW / 2} y={cutTop * scale / 2 + 3} textAnchor="middle" fontSize={7} fill="#ef4444">1 sm chiqindi</text>

        {/* ===== TOP FLAPS ===== */}
        {[p1x, p2x, p3x, p4x].map((x, i) => {
          const w = i % 2 === 0 ? W : L;
          return (
            <rect key={`tf${i}`} x={x} y={topFlapY} width={w * scale} height={flapH * scale}
              fill="#dbeafe" stroke="#3b82f6" strokeWidth={1.5} strokeDasharray="4 2" />
          );
        })}

        {/* ===== CENTER PANELS ===== */}
        <rect x={p1x} y={centerY} width={W * scale} height={H * scale}
          fill="#fef3c7" stroke="#d97706" strokeWidth={2} />
        <rect x={p2x} y={centerY} width={L * scale} height={H * scale}
          fill="#fed7aa" stroke="#ea580c" strokeWidth={2} />
        <rect x={p3x} y={centerY} width={W * scale} height={H * scale}
          fill="#fef3c7" stroke="#d97706" strokeWidth={2} />
        <rect x={p4x} y={centerY} width={L * scale} height={H * scale}
          fill="#fed7aa" stroke="#ea580c" strokeWidth={2} />

        {/* ===== GLUE FLAP (50mm) ===== */}
        <rect x={glueX} y={centerY} width={50 * scale} height={H * scale}
          fill="#d1fae5" stroke="#10b981" strokeWidth={1.5} strokeDasharray="6 3" />

        {/* ===== BOTTOM FLAPS ===== */}
        {[p1x, p2x, p3x, p4x].map((x, i) => {
          const w = i % 2 === 0 ? W : L;
          return (
            <rect key={`bf${i}`} x={x} y={bottomFlapY} width={w * scale} height={flapH * scale}
              fill="#dbeafe" stroke="#3b82f6" strokeWidth={1.5} strokeDasharray="4 2" />
          );
        })}

        {/* ===== CHIQINDI — pastdan 1sm ===== */}
        <rect x={0} y={cutBottomY} width={svgW} height={cutBottom * scale}
          fill="#fee2e2" stroke="#ef4444" strokeWidth={0.5} strokeDasharray="3 2" />
        <text x={svgW / 2} y={cutBottomY + cutBottom * scale / 2 + 3} textAnchor="middle" fontSize={7} fill="#ef4444">1 sm chiqindi</text>

        {/* ===== PANEL MARKERS ===== */}
        <text x={p1x + W * scale / 2} y={centerY + H * scale / 2 - 6} textAnchor="middle" fontSize={10} fontWeight="bold" fill="#92400e">W</text>
        <text x={p1x + W * scale / 2} y={centerY + H * scale / 2 + 7} textAnchor="middle" fontSize={8} fill="#92400e">{fmtSm(W)} sm</text>

        <text x={p2x + L * scale / 2} y={centerY + H * scale / 2 - 6} textAnchor="middle" fontSize={10} fontWeight="bold" fill="#9a3412">L</text>
        <text x={p2x + L * scale / 2} y={centerY + H * scale / 2 + 7} textAnchor="middle" fontSize={8} fill="#9a3412">{fmtSm(L)} sm</text>

        <text x={p3x + W * scale / 2} y={centerY + H * scale / 2 - 6} textAnchor="middle" fontSize={10} fontWeight="bold" fill="#92400e">W</text>
        <text x={p3x + W * scale / 2} y={centerY + H * scale / 2 + 7} textAnchor="middle" fontSize={8} fill="#92400e">{fmtSm(W)} sm</text>

        <text x={p4x + L * scale / 2} y={centerY + H * scale / 2 - 6} textAnchor="middle" fontSize={10} fontWeight="bold" fill="#9a3412">L</text>
        <text x={p4x + L * scale / 2} y={centerY + H * scale / 2 + 7} textAnchor="middle" fontSize={8} fill="#9a3412">{fmtSm(L)} sm</text>

        <text x={glueX + 25 * scale} y={centerY + H * scale / 2 - 4} textAnchor="middle" fontSize={7} fontWeight="bold" fill="#065f46">YELIM</text>
        <text x={glueX + 25 * scale} y={centerY + H * scale / 2 + 6} textAnchor="middle" fontSize={6} fill="#065f46">5 sm</text>

        {/* Top flap labels */}
        <text x={p1x + W * scale / 2} y={topFlapY + flapH * scale / 2 + 3} textAnchor="middle" fontSize={6} fill="#1e40af">L/2</text>
        <text x={p2x + L * scale / 2} y={topFlapY + flapH * scale / 2 + 3} textAnchor="middle" fontSize={6} fill="#1e40af">L/2</text>
        <text x={p3x + W * scale / 2} y={topFlapY + flapH * scale / 2 + 3} textAnchor="middle" fontSize={6} fill="#1e40af">L/2</text>
        <text x={p4x + L * scale / 2} y={topFlapY + flapH * scale / 2 + 3} textAnchor="middle" fontSize={6} fill="#1e40af">L/2</text>

        {/* Bottom flap labels */}
        <text x={p1x + W * scale / 2} y={bottomFlapY + flapH * scale / 2 + 3} textAnchor="middle" fontSize={6} fill="#1e40af">L/2</text>
        <text x={p2x + L * scale / 2} y={bottomFlapY + flapH * scale / 2 + 3} textAnchor="middle" fontSize={6} fill="#1e40af">L/2</text>

        {/* ===== CHAP TOMONDA VERTIKAL O'LCHAMLAR ===== */}
        {/* 1 sm chiqindi (tepa) */}
        <line x1={-12} y1={cutTopY} x2={-12} y2={topFlapY} stroke="#ef4444" strokeWidth={0.8} />
        <text x={-18} y={(cutTopY + topFlapY) / 2 + 3} textAnchor="end" fontSize={6} fill="#ef4444" fontWeight="bold">1</text>

        {/* L/2 (tep kanot) */}
        <line x1={-12} y1={topFlapY} x2={-12} y2={centerY} stroke="#3b82f6" strokeWidth={0.8} />
        <text x={-18} y={(topFlapY + centerY) / 2 + 3} textAnchor="end" fontSize={6} fill="#3b82f6" fontWeight="bold">{fmtSm(L / 2)}</text>

        {/* H (markaz) */}
        <line x1={-12} y1={centerY} x2={-12} y2={bottomFlapY} stroke="#d97706" strokeWidth={0.8} />
        <text x={-18} y={(centerY + bottomFlapY) / 2 + 3} textAnchor="end" fontSize={7} fill="#d97706" fontWeight="bold">{fmtSm(H)}</text>

        {/* L/2 (past kanot) */}
        <line x1={-12} y1={bottomFlapY} x2={-12} y2={cutBottomY} stroke="#3b82f6" strokeWidth={0.8} />
        <text x={-18} y={(bottomFlapY + cutBottomY) / 2 + 3} textAnchor="end" fontSize={6} fill="#3b82f6" fontWeight="bold">{fmtSm(L / 2)}</text>

        {/* 1 sm chiqindi (past) */}
        <line x1={-12} y1={cutBottomY} x2={-12} y2={svgH} stroke="#ef4444" strokeWidth={0.8} />
        <text x={-18} y={(cutBottomY + svgH) / 2 + 3} textAnchor="end" fontSize={6} fill="#ef4444" fontWeight="bold">1</text>

        {/* ===== O'LCHAM CHIZIQLARI ===== */}
        {/* Pastki umumiy uzunlik */}
        <line x1={0} y1={svgH + 12} x2={svgW} y2={svgH + 12} stroke="#374151" strokeWidth={1} markerEnd="url(#aR)" markerStart="url(#aL)" />
        <text x={svgW / 2} y={svgH + 27} textAnchor="middle" fontSize={9} fontWeight="bold" fill="#374151">
          Kesma: {fmtSm(blankLen)} sm × {fmtSm(blankW)} sm
        </text>

        {/* Har bir panel ustida */}
        <line x1={p1x} y1={-6} x2={p2x} y2={-6} stroke="#d97706" strokeWidth={0.8} />
        <text x={p1x + W * scale / 2} y={-10} textAnchor="middle" fontSize={7} fill="#d97706" fontWeight="bold">{fmtSm(W)}</text>

        <line x1={p2x} y1={-6} x2={p3x} y2={-6} stroke="#ea580c" strokeWidth={0.8} />
        <text x={p2x + L * scale / 2} y={-10} textAnchor="middle" fontSize={7} fill="#ea580c" fontWeight="bold">{fmtSm(L)}</text>

        <line x1={p3x} y1={-6} x2={p4x} y2={-6} stroke="#d97706" strokeWidth={0.8} />
        <text x={p3x + W * scale / 2} y={-10} textAnchor="middle" fontSize={7} fill="#d97706" fontWeight="bold">{fmtSm(W)}</text>

        <line x1={p4x} y1={-6} x2={glueX} y2={-6} stroke="#ea580c" strokeWidth={0.8} />
        <text x={p4x + L * scale / 2} y={-10} textAnchor="middle" fontSize={7} fill="#ea580c" fontWeight="bold">{fmtSm(L)}</text>

        <line x1={glueX} y1={-6} x2={glueX + 50 * scale} y2={-6} stroke="#10b981" strokeWidth={0.8} />
        <text x={glueX + 25 * scale} y={-10} textAnchor="middle" fontSize={6} fill="#10b981" fontWeight="bold">5</text>

        <defs>
          <marker id="aR" markerWidth={6} markerHeight={6} refX={6} refY={3} orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="#374151" /></marker>
          <marker id="aL" markerWidth={6} markerHeight={6} refX={0} refY={3} orient="auto"><path d="M6,0 L0,3 L6,6 Z" fill="#374151" /></marker>
        </defs>
      </svg>
    </div>
  );
}

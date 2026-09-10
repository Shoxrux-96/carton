import React from "react";

interface BoxTemplateProps {
  boxLength: number; // mm
  boxWidth: number;  // mm
  boxHeight: number; // mm
}

export default function BoxTemplate({ boxLength, boxWidth, boxHeight }: BoxTemplateProps) {
  const L = boxLength;
  const W = boxWidth;
  const H = boxHeight;

  // Kesma o'lchamlari (mm)
  const blankLen = 2 * W + 2 * L + 50; // eni: 4 panel + 5cm yelim chok
  const flapH = H / 2;
  const blankW = H + 2 * flapH + 20; // bo'yi: markaz + 2 kanot + 2cm chiqindi

  // SVG масштаб — 1mm = 0.35px (katta qutilar uchun)
  const scale = 0.35;
  const svgW = blankLen * scale;
  const svgH = blankW * scale;
  const pad = 40;

  // Panel koordinatalari (chapdan)
  const p1x = 0;          // panel 1 (W)
  const p2x = W * scale;  // panel 2 (L)
  const p3x = (W + L) * scale; // panel 3 (W)
  const p4x = (2 * W + L) * scale; // panel 4 (L)
  const glueX = (2 * W + 2 * L) * scale; // yelim chok (50mm)

  // Vertikal koordinatalar
  const topFlapY = 0;
  const centerY = flapH * scale;
  const bottomFlapY = (flapH + H) * scale;

  const fmt = (n: number) => Math.round(n);

  return (
    <div className="relative">
      <svg
        width={svgW + pad * 2}
        height={svgH + pad * 2}
        viewBox={`${-pad} ${-pad} ${svgW + pad * 2} ${svgH + pad * 2}`}
        className="w-full h-auto"
        style={{ maxHeight: "500px" }}
      >
        {/* Background */}
        <rect x={-pad} y={-pad} width={svgW + pad * 2} height={svgH + pad * 2} fill="white" />

        {/* ===== TOP FLAPS ===== */}
        {/* Top flap 1 (W) */}
        <rect x={p1x} y={topFlapY} width={W * scale} height={flapH * scale}
          fill="#dbeafe" stroke="#3b82f6" strokeWidth={1.5} strokeDasharray="4 2" />
        {/* Top flap 2 (L) */}
        <rect x={p2x} y={topFlapY} width={L * scale} height={flapH * scale}
          fill="#dbeafe" stroke="#3b82f6" strokeWidth={1.5} strokeDasharray="4 2" />
        {/* Top flap 3 (W) */}
        <rect x={p3x} y={topFlapY} width={W * scale} height={flapH * scale}
          fill="#dbeafe" stroke="#3b82f6" strokeWidth={1.5} strokeDasharray="4 2" />
        {/* Top flap 4 (L) */}
        <rect x={p4x} y={topFlapY} width={L * scale} height={flapH * scale}
          fill="#dbeafe" stroke="#3b82f6" strokeWidth={1.5} strokeDasharray="4 2" />

        {/* ===== CENTER PANELS (asosiy devorlar) ===== */}
        {/* Panel 1 — Width */}
        <rect x={p1x} y={centerY} width={W * scale} height={H * scale}
          fill="#fef3c7" stroke="#d97706" strokeWidth={2} />
        {/* Panel 2 — Length */}
        <rect x={p2x} y={centerY} width={L * scale} height={H * scale}
          fill="#fed7aa" stroke="#ea580c" strokeWidth={2} />
        {/* Panel 3 — Width */}
        <rect x={p3x} y={centerY} width={W * scale} height={H * scale}
          fill="#fef3c7" stroke="#d97706" strokeWidth={2} />
        {/* Panel 4 — Length */}
        <rect x={p4x} y={centerY} width={L * scale} height={H * scale}
          fill="#fed7aa" stroke="#ea580c" strokeWidth={2} />

        {/* ===== GLUE FLAP (50mm) ===== */}
        <rect x={glueX} y={centerY} width={50 * scale} height={H * scale}
          fill="#d1fae5" stroke="#10b981" strokeWidth={1.5} strokeDasharray="6 3" />

        {/* ===== BOTTOM FLAPS ===== */}
        <rect x={p1x} y={bottomFlapY} width={W * scale} height={flapH * scale}
          fill="#dbeafe" stroke="#3b82f6" strokeWidth={1.5} strokeDasharray="4 2" />
        <rect x={p2x} y={bottomFlapY} width={L * scale} height={flapH * scale}
          fill="#dbeafe" stroke="#3b82f6" strokeWidth={1.5} strokeDasharray="4 2" />
        <rect x={p3x} y={bottomFlapY} width={W * scale} height={flapH * scale}
          fill="#dbeafe" stroke="#3b82f6" strokeWidth={1.5} strokeDasharray="4 2" />
        <rect x={p4x} y={bottomFlapY} width={L * scale} height={flapH * scale}
          fill="#dbeafe" stroke="#3b82f6" strokeWidth={1.5} strokeDasharray="4 2" />

        {/* ===== CHIQINDI (2cm) — pastda ===== */}
        <rect x={0} y={bottomFlapY + flapH * scale} width={svgW} height={10 * scale}
          fill="#fee2e2" stroke="#ef4444" strokeWidth={0.5} strokeDasharray="3 2" />

        {/* ===== PANEL MARKERS (ichida) ===== */}
        {/* Panel 1 */}
        <text x={p1x + W * scale / 2} y={centerY + H * scale / 2 - 8}
          textAnchor="middle" fontSize={11} fontWeight="bold" fill="#92400e">W</text>
        <text x={p1x + W * scale / 2} y={centerY + H * scale / 2 + 8}
          textAnchor="middle" fontSize={9} fill="#92400e">{fmt(W)} mm</text>

        {/* Panel 2 */}
        <text x={p2x + L * scale / 2} y={centerY + H * scale / 2 - 8}
          textAnchor="middle" fontSize={11} fontWeight="bold" fill="#9a3412">L</text>
        <text x={p2x + L * scale / 2} y={centerY + H * scale / 2 + 8}
          textAnchor="middle" fontSize={9} fill="#9a3412">{fmt(L)} mm</text>

        {/* Panel 3 */}
        <text x={p3x + W * scale / 2} y={centerY + H * scale / 2 - 8}
          textAnchor="middle" fontSize={11} fontWeight="bold" fill="#92400e">W</text>
        <text x={p3x + W * scale / 2} y={centerY + H * scale / 2 + 8}
          textAnchor="middle" fontSize={9} fill="#92400e">{fmt(W)} mm</text>

        {/* Panel 4 */}
        <text x={p4x + L * scale / 2} y={centerY + H * scale / 2 - 8}
          textAnchor="middle" fontSize={11} fontWeight="bold" fill="#9a3412">L</text>
        <text x={p4x + L * scale / 2} y={centerY + H * scale / 2 + 8}
          textAnchor="middle" fontSize={9} fill="#9a3412">{fmt(L)} mm</text>

        {/* Glue flap */}
        <text x={glueX + 25 * scale} y={centerY + H * scale / 2 - 6}
          textAnchor="middle" fontSize={8} fontWeight="bold" fill="#065f46">YELIM</text>
        <text x={glueX + 25 * scale} y={centerY + H * scale / 2 + 6}
          textAnchor="middle" fontSize={7} fill="#065f46">50mm</text>

        {/* Top flap labels */}
        <text x={p1x + W * scale / 2} y={topFlapY + flapH * scale / 2 + 3}
          textAnchor="middle" fontSize={7} fill="#1e40af">H/2</text>
        <text x={p2x + L * scale / 2} y={topFlapY + flapH * scale / 2 + 3}
          textAnchor="middle" fontSize={7} fill="#1e40af">H/2</text>

        {/* ===== O'LCHAM CHIZIQLARI ====="""

        {/* Pastki umumiy uzunlik */}
        <line x1={0} y1={svgH + 15} x2={svgW} y2={svgH + 15} stroke="#374151" strokeWidth={1} markerEnd="url(#arrowR)" markerStart="url(#arrowL)" />
        <text x={svgW / 2} y={svgH + 30} textAnchor="middle" fontSize={10} fontWeight="bold" fill="#374151">
          Kesma uzunligi: {fmt(blankLen)} mm (2W + 2L + 50)
        </text>

        {/* Chap umumiy eni */}
        <line x1={-15} y1={0} x2={-15} y2={svgH} stroke="#374151" strokeWidth={1} markerEnd="url(#arrowD)" markerStart="url(#arrowU)" />
        <text x={-25} y={svgH / 2} textAnchor="middle" fontSize={10} fontWeight="bold" fill="#374151"
          transform={`rotate(-90, -25, ${svgH / 2})`}>
          Kesma eni: {fmt(blankW)} mm (2H + 20)
        </text>

        {/* Har bir panel ustida eni */}
        {/* Panel 1 width */}
        <line x1={p1x} y1={-8} x2={p2x} y2={-8} stroke="#d97706" strokeWidth={0.8} />
        <text x={p1x + W * scale / 2} y={-12} textAnchor="middle" fontSize={8} fill="#d97706" fontWeight="bold">{fmt(W)}</text>

        {/* Panel 2 width */}
        <line x1={p2x} y1={-8} x2={p3x} y2={-8} stroke="#ea580c" strokeWidth={0.8} />
        <text x={p2x + L * scale / 2} y={-12} textAnchor="middle" fontSize={8} fill="#ea580c" fontWeight="bold">{fmt(L)}</text>

        {/* Panel 3 width */}
        <line x1={p3x} y1={-8} x2={p4x} y2={-8} stroke="#d97706" strokeWidth={0.8} />
        <text x={p3x + W * scale / 2} y={-12} textAnchor="middle" fontSize={8} fill="#d97706" fontWeight="bold">{fmt(W)}</text>

        {/* Panel 4 width */}
        <line x1={p4x} y1={-8} x2={glueX} y2={-8} stroke="#ea580c" strokeWidth={0.8} />
        <text x={p4x + L * scale / 2} y={-12} textAnchor="middle" fontSize={8} fill="#ea580c" fontWeight="bold">{fmt(L)}</text>

        {/* Glue flap width */}
        <line x1={glueX} y1={-8} x2={glueX + 50 * scale} y2={-8} stroke="#10b981" strokeWidth={0.8} />
        <text x={glueX + 25 * scale} y={-12} textAnchor="middle" fontSize={7} fill="#10b981" fontWeight="bold">50</text>

        {/* Arrow markers */}
        <defs>
          <marker id="arrowR" markerWidth={6} markerHeight={6} refX={6} refY={3} orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill="#374151" />
          </marker>
          <marker id="arrowL" markerWidth={6} markerHeight={6} refX={0} refY={3} orient="auto">
            <path d="M6,0 L0,3 L6,6 Z" fill="#374151" />
          </marker>
          <marker id="arrowD" markerWidth={6} markerHeight={6} refX={3} refY={6} orient="auto">
            <path d="M0,0 L3,6 L6,0 Z" fill="#374151" />
          </marker>
          <marker id="arrowU" markerWidth={6} markerHeight={6} refX={3} refY={0} orient="auto">
            <path d="M0,6 L3,0 L6,6 Z" fill="#374151" />
          </marker>
        </defs>
      </svg>
    </div>
  );
}

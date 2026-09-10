import React from "react";

interface Props {
  boxLength: number;
  boxWidth: number;
  boxHeight: number;
  companyName?: string;
  boxName?: string;
  sellingPrice?: number;
  productionPrice?: number;
}

export default function PrintLayout({
  boxLength,
  boxWidth,
  boxHeight,
  companyName = "Shovot Carton",
  boxName = "RSC quti",
  sellingPrice = 0,
  productionPrice = 0,
}: Props) {
  const L = boxLength;
  const W = boxWidth;
  const H = boxHeight;

  // Kesma o'lchamlari (sm)
  const blankLen = 2 * W + 2 * L + 6;
  const flapH = L / 2;
  const blankW = 1 + flapH + H + flapH + 1;

  // SVG — 1 sm = 5px (katta eskiz)
  const S = 5;
  const svgW = blankLen * S;
  const svgH = blankW * S;
  const pad = 40;

  // X koordinatalari
  const x0 = 0;
  const xW1 = W * S;
  const xL1 = (W + L) * S;
  const xW2 = (2 * W + L) * S;
  const xL2 = (2 * W + 2 * L) * S;
  const xGlue = xL2;
  const xCut = xL2 + 5 * S;
  const xEnd = xCut + 1 * S;

  // Y koordinatalari
  const yCutTop = 0;
  const yFlapTop = 1 * S;
  const yCenter = (1 + flapH) * S;
  const yFlapBot = (1 + flapH + H) * S;
  const yCutBot = (1 + flapH + H + flapH) * S;
  const yEnd = (1 + flapH + H + flapH + 1) * S;

  // 3D box
  const bx3d = 50;
  const by3d = 20;
  const bw3d = 200;
  const bh3d = 130;
  const d3d = 70;

  const fmt = (n: number) => n.toLocaleString("uz-UZ");

  return (
    <div className="print-layout">
      {/* Chop etish tugmasi */}
      <button
        onClick={() => window.print()}
        className="no-print fixed top-4 right-4 z-50 bg-primary text-primary-foreground px-4 py-2 rounded-lg shadow-lg hover:bg-primary/90 text-sm font-bold flex items-center gap-2"
      >
        🖨️ Chop etish
      </button>

      {/* SAHIFA */}
      <div className="bg-white text-black mx-auto" style={{ maxWidth: "210mm", padding: "15mm" }}>
        {/* SARLAVHA */}
        <div className="text-center border-b-2 border-black pb-4 mb-6">
          <h1 className="text-2xl font-extrabold tracking-wide uppercase">{companyName}</h1>
          <p className="text-sm text-gray-600 mt-1">Ishlab chiqarish detali — {boxName}</p>
          <div className="flex justify-center gap-8 mt-3 text-xs">
            <span>Sana: _______________</span>
            <span>Raqam: _______________</span>
          </div>
        </div>

        {/* QUTI O'LCHAMLARI JADVALI — kichik */}
        <div className="mb-4">
          <h2 className="text-xs font-bold mb-1 uppercase border-b border-gray-400 pb-0.5">
            1. Quti o'lchamlari
          </h2>
          <div className="flex gap-4 text-[10px]">
            <div className="flex items-center gap-1"><span className="font-bold">W =</span> <span className="font-mono">{W} sm</span></div>
            <div className="flex items-center gap-1"><span className="font-bold">H =</span> <span className="font-mono">{H} sm</span></div>
            <div className="flex items-center gap-1"><span className="font-bold">L =</span> <span className="font-mono">{L} sm</span></div>
            <div className="flex items-center gap-1"><span className="font-bold">Kesma:</span> <span className="font-mono">{fmt(blankLen)} × {fmt(blankW)} sm</span></div>
            <div className="flex items-center gap-1"><span className="font-bold">Kanot:</span> <span className="font-mono">{fmt(flapH)} sm</span></div>
          </div>
        </div>

        {/* 3D CHIZMA */}
        <div className="mb-4">
          <h2 className="text-xs font-bold mb-1 uppercase border-b border-gray-400 pb-0.5">
            2. Qutining 3D ko'rinishi
          </h2>
          <div className="flex justify-center">
            <svg viewBox={`0 0 ${bx3d + bw3d + d3d + 80} ${by3d + bh3d + 60}`} width="500" height="320">
              {/* Old tomon (W × H) */}
              <rect x={bx3d} y={by3d} width={bw3d} height={bh3d}
                fill="#f5f5f5" stroke="#000" strokeWidth={2} />

              {/* Ong tomon (L × H) */}
              <polygon
                points={`${bx3d + bw3d},${by3d} ${bx3d + bw3d + d3d},${by3d - d3d * 0.6} ${bx3d + bw3d + d3d},${by3d + bh3d - d3d * 0.6} ${bx3d + bw3d},${by3d + bh3d}`}
                fill="#e5e5e5" stroke="#000" strokeWidth={2} />

              {/* Tepa tomon (W × L) */}
              <polygon
                points={`${bx3d},${by3d} ${bx3d + d3d},${by3d - d3d * 0.6} ${bx3d + bw3d + d3d},${by3d - d3d * 0.6} ${bx3d + bw3d},${by3d}`}
                fill="#d5d5d5" stroke="#000" strokeWidth={2} />

              {/* Yelim chizig'i */}
              <line x1={bx3d + bw3d * 0.65} y1={by3d} x2={bx3d + bw3d * 0.65 + d3d} y2={by3d - d3d * 0.6}
                stroke="#666" strokeWidth={1} strokeDasharray="4 2" />

              {/* O'lchamlar — W (pastda) */}
              <line x1={bx3d} y1={by3d + bh3d + 15} x2={bx3d + bw3d} y2={by3d + bh3d + 15}
                stroke="#000" strokeWidth={1} markerEnd="url(#arrowR)" markerStart="url(#arrowL)" />
              <text x={bx3d + bw3d / 2} y={by3d + bh3d + 30} textAnchor="middle" fontSize={12} fontWeight="bold">
                W = {W} sm
              </text>

              {/* O'lchamlar — H (chapda) */}
              <line x1={bx3d - 15} y1={by3d} x2={bx3d - 15} y2={by3d + bh3d}
                stroke="#000" strokeWidth={1} markerEnd="url(#arrowD)" markerStart="url(#arrowU)" />
              <text x={bx3d - 22} y={by3d + bh3d / 2 + 4} textAnchor="end" fontSize={12} fontWeight="bold">
                H = {H}
              </text>

              {/* O'lchamlar — L (pastda diagonaldan) */}
              <line x1={bx3d + bw3d} y1={by3d + bh3d + 15} x2={bx3d + bw3d + d3d} y2={by3d + bh3d + 15 - d3d * 0.6}
                stroke="#000" strokeWidth={1} />
              <line x1={bx3d + bw3d + d3d} y1={by3d + bh3d + 15 - d3d * 0.6 + 10} x2={bx3d + bw3d + d3d} y2={by3d + bh3d + 15 - d3d * 0.6 - 10}
                stroke="#000" strokeWidth={1} markerEnd="url(#arrowD3d)" markerStart="url(#arrowU3d)" />
              <text x={bx3d + bw3d + d3d + 12} y={by3d + bh3d + 15 - d3d * 0.3 + 4} textAnchor="start" fontSize={12} fontWeight="bold">
                L = {L} sm
              </text>

              {/* Markaz label */}
              <text x={bx3d + bw3d / 2} y={by3d + bh3d / 2 + 5} textAnchor="middle" fontSize={14} fontWeight="bold">
                {W} × {H} × {L}
              </text>

              <defs>
                <marker id="arrowR" markerWidth={8} markerHeight={8} refX={8} refY={4} orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#000" /></marker>
                <marker id="arrowL" markerWidth={8} markerHeight={8} refX={0} refY={4} orient="auto"><path d="M8,0 L0,4 L8,8 Z" fill="#000" /></marker>
                <marker id="arrowD" markerWidth={8} markerHeight={8} refX={4} refY={8} orient="auto"><path d="M0,0 L8,0 L4,8 Z" fill="#000" /></marker>
                <marker id="arrowU" markerWidth={8} markerHeight={8} refX={4} refY={0} orient="auto"><path d="M0,8 L8,8 L4,0 Z" fill="#000" /></marker>
                <marker id="arrowD3d" markerWidth={8} markerHeight={8} refX={4} refY={8} orient="auto"><path d="M0,0 L8,0 L4,8 Z" fill="#000" /></marker>
                <marker id="arrowU3d" markerWidth={8} markerHeight={8} refX={4} refY={0} orient="auto"><path d="M0,8 L8,8 L4,0 Z" fill="#000" /></marker>
              </defs>
            </svg>
          </div>
        </div>

        {/* ESKIZ — TO'LIQ, KATTA */}
        <div className="mb-4">
          <h2 className="text-xs font-bold mb-1 uppercase border-b border-gray-400 pb-0.5">
            3. Kesma eskizi (to'liq)
          </h2>
          <div className="flex justify-center overflow-hidden">
            <svg
              width={svgW + pad * 2 + 30}
              height={svgH + pad * 2 + 20}
              viewBox={`${-pad - 30} ${-pad} ${svgW + pad * 2 + 30} ${svgH + pad * 2 + 20}`}
              style={{ maxWidth: "100%", height: "auto" }}
            >
              {/* Fon */}
              <rect x={-pad - 30} y={-pad} width={svgW + pad * 2 + 30} height={svgH + pad * 2 + 20} fill="white" />

              {/* TEPA CHIQINDI */}
              <rect x={0} y={yCutTop} width={svgW} height={1 * S}
                fill="#fee2e2" stroke="#ef4444" strokeWidth={1} strokeDasharray="4 2" />
              <text x={svgW / 2} y={yCutTop + 0.5 * S + 4} textAnchor="middle" fontSize={9} fill="#ef4444" fontWeight="bold">
                1 sm — chiqindi
              </text>

              {/* TOP FLAPS */}
              <rect x={x0} y={yFlapTop} width={xW1} height={flapH * S}
                fill="#dbeafe" stroke="#3b82f6" strokeWidth={1.5} strokeDasharray="5 3" />
              <rect x={xW1} y={yFlapTop} width={xL1 - xW1} height={flapH * S}
                fill="#dbeafe" stroke="#3b82f6" strokeWidth={1.5} strokeDasharray="5 3" />
              <rect x={xL1} y={yFlapTop} width={xW2 - xL1} height={flapH * S}
                fill="#dbeafe" stroke="#3b82f6" strokeWidth={1.5} strokeDasharray="5 3" />
              <rect x={xW2} y={yFlapTop} width={xL2 - xW2} height={flapH * S}
                fill="#dbeafe" stroke="#3b82f6" strokeWidth={1.5} strokeDasharray="5 3" />

              {/* MARKAZ PANELLARI */}
              <rect x={x0} y={yCenter} width={xW1} height={H * S}
                fill="#fef3c7" stroke="#d97706" strokeWidth={2.5} />
              <rect x={xW1} y={yCenter} width={xL1 - xW1} height={H * S}
                fill="#fed7aa" stroke="#ea580c" strokeWidth={2.5} />
              <rect x={xL1} y={yCenter} width={xW2 - xL1} height={H * S}
                fill="#fef3c7" stroke="#d97706" strokeWidth={2.5} />
              <rect x={xW2} y={yCenter} width={xL2 - xW2} height={H * S}
                fill="#fed7aa" stroke="#ea580c" strokeWidth={2.5} />

              {/* YELIM */}
              <rect x={xGlue} y={yCenter} width={5 * S} height={H * S}
                fill="#d1fae5" stroke="#10b981" strokeWidth={1.5} strokeDasharray="6 3" />

              {/* CHIQINDI */}
              <rect x={xCut} y={yCenter} width={1 * S} height={H * S}
                fill="#fee2e2" stroke="#ef4444" strokeWidth={1} strokeDasharray="3 2" />

              {/* PASTKI FLAPS */}
              <rect x={x0} y={yFlapBot} width={xW1} height={flapH * S}
                fill="#dbeafe" stroke="#3b82f6" strokeWidth={1.5} strokeDasharray="5 3" />
              <rect x={xW1} y={yFlapBot} width={xL1 - xW1} height={flapH * S}
                fill="#dbeafe" stroke="#3b82f6" strokeWidth={1.5} strokeDasharray="5 3" />
              <rect x={xL1} y={yFlapBot} width={xW2 - xL1} height={flapH * S}
                fill="#dbeafe" stroke="#3b82f6" strokeWidth={1.5} strokeDasharray="5 3" />
              <rect x={xW2} y={yFlapBot} width={xL2 - xW2} height={flapH * S}
                fill="#dbeafe" stroke="#3b82f6" strokeWidth={1.5} strokeDasharray="5 3" />

              {/* PASTKI CHIQINDI */}
              <rect x={0} y={yCutBot} width={svgW} height={1 * S}
                fill="#fee2e2" stroke="#ef4444" strokeWidth={1} strokeDasharray="4 2" />
              <text x={svgW / 2} y={yCutBot + 0.5 * S + 4} textAnchor="middle" fontSize={9} fill="#ef4444" fontWeight="bold">
                1 sm — chiqindi
              </text>

              {/* PANEL MARKERS */}
              <text x={xW1 / 2} y={yCenter + H * S / 2 - 8} textAnchor="middle" fontSize={12} fontWeight="bold" fill="#92400e">W</text>
              <text x={xW1 / 2} y={yCenter + H * S / 2 + 10} textAnchor="middle" fontSize={9} fill="#92400e">{W} sm</text>

              <text x={(xW1 + xL1) / 2} y={yCenter + H * S / 2 - 8} textAnchor="middle" fontSize={12} fontWeight="bold" fill="#9a3412">L</text>
              <text x={(xW1 + xL1) / 2} y={yCenter + H * S / 2 + 10} textAnchor="middle" fontSize={9} fill="#9a3412">{L} sm</text>

              <text x={(xL1 + xW2) / 2} y={yCenter + H * S / 2 - 8} textAnchor="middle" fontSize={12} fontWeight="bold" fill="#92400e">W</text>
              <text x={(xL1 + xW2) / 2} y={yCenter + H * S / 2 + 10} textAnchor="middle" fontSize={9} fill="#92400e">{W} sm</text>

              <text x={(xW2 + xL2) / 2} y={yCenter + H * S / 2 - 8} textAnchor="middle" fontSize={12} fontWeight="bold" fill="#9a3412">L</text>
              <text x={(xW2 + xL2) / 2} y={yCenter + H * S / 2 + 10} textAnchor="middle" fontSize={9} fill="#9a3412">{L} sm</text>

              <text x={xGlue + 2.5 * S} y={yCenter + H * S / 2 - 6} textAnchor="middle" fontSize={8} fontWeight="bold" fill="#065f46">YELIM</text>
              <text x={xGlue + 2.5 * S} y={yCenter + H * S / 2 + 6} textAnchor="middle" fontSize={7} fill="#065f46">5 sm</text>
              <text x={xCut + 0.5 * S} y={yCenter + H * S / 2 + 4} textAnchor="middle" fontSize={7} fill="#ef4444" fontWeight="bold">1</text>

              {/* Flap labels */}
              <text x={xW1 / 2} y={yFlapTop + flapH * S / 2 + 4} textAnchor="middle" fontSize={8} fill="#1e40af" fontWeight="bold">L/2</text>
              <text x={(xW1 + xL1) / 2} y={yFlapTop + flapH * S / 2 + 4} textAnchor="middle" fontSize={8} fill="#1e40af" fontWeight="bold">L/2</text>
              <text x={xW1 / 2} y={yFlapBot + flapH * S / 2 + 4} textAnchor="middle" fontSize={8} fill="#1e40af" fontWeight="bold">L/2</text>
              <text x={(xW1 + xL1) / 2} y={yFlapBot + flapH * S / 2 + 4} textAnchor="middle" fontSize={8} fill="#1e40af" fontWeight="bold">L/2</text>

              {/* HORIZONTAL O'LCHAMLAR */}
              <line x1={0} y1={svgH + 10} x2={svgW} y2={svgH + 10} stroke="#374151" strokeWidth={1.5} markerEnd="url(#aR)" markerStart="url(#aL)" />
              <line x1={x0} y1={svgH + 4} x2={xW1} y2={svgH + 4} stroke="#d97706" strokeWidth={1} />
              <text x={xW1 / 2} y={svgH + 22} textAnchor="middle" fontSize={9} fill="#d97706" fontWeight="bold">{W}</text>
              <line x1={xW1} y1={svgH + 4} x2={xL1} y2={svgH + 4} stroke="#ea580c" strokeWidth={1} />
              <text x={(xW1 + xL1) / 2} y={svgH + 22} textAnchor="middle" fontSize={9} fill="#ea580c" fontWeight="bold">{L}</text>
              <line x1={xL1} y1={svgH + 4} x2={xW2} y2={svgH + 4} stroke="#d97706" strokeWidth={1} />
              <text x={(xL1 + xW2) / 2} y={svgH + 22} textAnchor="middle" fontSize={9} fill="#d97706" fontWeight="bold">{W}</text>
              <line x1={xW2} y1={svgH + 4} x2={xL2} y2={svgH + 4} stroke="#ea580c" strokeWidth={1} />
              <text x={(xW2 + xL2) / 2} y={svgH + 22} textAnchor="middle" fontSize={9} fill="#ea580c" fontWeight="bold">{L}</text>
              <line x1={xGlue} y1={svgH + 4} x2={xCut} y2={svgH + 4} stroke="#10b981" strokeWidth={1} />
              <text x={xGlue + 2.5 * S} y={svgH + 22} textAnchor="middle" fontSize={8} fill="#10b981" fontWeight="bold">5</text>
              <line x1={xCut} y1={svgH + 4} x2={xEnd} y2={svgH + 4} stroke="#ef4444" strokeWidth={1} />
              <text x={xCut + 0.5 * S} y={svgH + 22} textAnchor="middle" fontSize={8} fill="#ef4444" fontWeight="bold">1</text>
              <text x={svgW / 2} y={svgH + 38} textAnchor="middle" fontSize={10} fontWeight="bold" fill="#374151">
                Kesma: {fmt(blankLen)} sm × {fmt(blankW)} sm
              </text>

              {/* VERTIKAL O'LCHAMLAR */}
              <line x1={-12} y1={yCutTop} x2={-12} y2={yFlapTop} stroke="#ef4444" strokeWidth={1} />
              <text x={-18} y={(yCutTop + yFlapTop) / 2 + 4} textAnchor="end" fontSize={8} fill="#ef4444" fontWeight="bold">1</text>
              <line x1={-12} y1={yFlapTop} x2={-12} y2={yCenter} stroke="#3b82f6" strokeWidth={1} />
              <text x={-18} y={(yFlapTop + yCenter) / 2 + 4} textAnchor="end" fontSize={8} fill="#3b82f6" fontWeight="bold">{fmt(L / 2)}</text>
              <line x1={-12} y1={yCenter} x2={-12} y2={yFlapBot} stroke="#d97706" strokeWidth={1.5} />
              <text x={-18} y={(yCenter + yFlapBot) / 2 + 4} textAnchor="end" fontSize={9} fill="#d97706" fontWeight="bold">{H}</text>
              <line x1={-12} y1={yFlapBot} x2={-12} y2={yCutBot} stroke="#3b82f6" strokeWidth={1} />
              <text x={-18} y={(yFlapBot + yCutBot) / 2 + 4} textAnchor="end" fontSize={8} fill="#3b82f6" fontWeight="bold">{fmt(L / 2)}</text>
              <line x1={-12} y1={yCutBot} x2={-12} y2={yEnd} stroke="#ef4444" strokeWidth={1} />
              <text x={-18} y={(yCutBot + yEnd) / 2 + 4} textAnchor="end" fontSize={8} fill="#ef4444" fontWeight="bold">1</text>

              <defs>
                <marker id="aR" markerWidth={8} markerHeight={8} refX={8} refY={4} orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#374151" /></marker>
                <marker id="aL" markerWidth={8} markerHeight={8} refX={0} refY={4} orient="auto"><path d="M8,0 L0,4 L8,8 Z" fill="#374151" /></marker>
              </defs>
            </svg>
          </div>
        </div>

        {/* IMZO */}
        <div className="mt-8 pt-4 border-t border-gray-300 flex justify-between text-xs">
          <div>
            <p className="font-bold mb-6">Ishlab chiqarish ruxsat etdi:</p>
            <div className="flex items-end gap-2">
              <span className="border-b border-black w-32">&nbsp;</span>
              <span>/________________/</span>
            </div>
          </div>
          <div className="text-right">
            <p className="font-bold mb-6">Tayyorladi:</p>
            <div className="flex items-end gap-2 justify-end">
              <span>/________________/</span>
              <span className="border-b border-black w-32">&nbsp;</span>
            </div>
          </div>
        </div>
      </div>

      {/* PRINT STYLES */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .print-layout, .print-layout * { visibility: visible !important; }
          .print-layout { position: absolute; left: 0; top: 0; width: 100%; }
          .no-print { display: none !important; }
          .page-break-before { page-break-before: always; }
          @page { margin: 10mm; size: A4 portrait; }
        }
      `}</style>
    </div>
  );
}

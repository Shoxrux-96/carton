import React from "react";

interface Props {
  boxLength: number;
  boxWidth: number;
  boxHeight: number;
  companyName?: string;
  boxName?: string;
}

export default function PrintLayout({
  boxLength,
  boxWidth,
  boxHeight,
  companyName = "Shovot Carton",
  boxName = "RSC quti",
}: Props) {
  const L = boxLength;
  const W = boxWidth;
  const H = boxHeight;
  const today = new Date().toLocaleDateString("uz-UZ");

  // Kesma o'lchamlari
  const blankLen = 2 * W + 2 * L + 6;
  const flapH = L / 2;
  const blankW = 1 + flapH + H + flapH + 1;

  // SVG eskiz — 1 sm = 8px (katta)
  const S = 8;
  const svgW = blankLen * S;
  const svgH = blankW * S;

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

  // 3D box — kichikroq (30%)
  const bx3 = 30;
  const by3 = 25;
  const bw3 = 120;
  const bh3 = 80;
  const d3 = 40;

  const fmt = (n: number) => n.toLocaleString("uz-UZ");

  return (
    <div className="print-layout">
      {/* SAHIFA — LANDSCAPE */}
      <div className="bg-white text-black mx-auto" style={{ width: "297mm", minHeight: "210mm", padding: "10mm" }}>
        {/* SARLAVHA — yonma-yon */}
        <div className="flex items-center gap-6 border-b-2 border-black pb-2 mb-3">
          <h1 className="text-xl font-extrabold tracking-wide uppercase">{companyName}</h1>
          <span className="text-gray-400">|</span>
          <span className="text-sm font-bold">{boxName}</span>
          <span className="text-gray-400">|</span>
          <span className="text-xs text-gray-500">Sana: {today}</span>
        </div>

        {/* QUTI O'LCHAMLARI — bitta qatorda */}
        <div className="flex items-center gap-6 text-xs mb-3 bg-gray-50 rounded px-3 py-2 border border-gray-200">
          <div><span className="font-bold">Eni (W):</span> <span className="font-mono text-sm font-bold">{W} sm</span></div>
          <div><span className="font-bold">Balandligi (H):</span> <span className="font-mono text-sm font-bold">{H} sm</span></div>
          <div><span className="font-bold">Bo'yi (L):</span> <span className="font-mono text-sm font-bold">{L} sm</span></div>
          <div className="border-l border-gray-300 pl-3"><span className="font-bold">Kesma:</span> <span className="font-mono text-sm font-bold">{fmt(blankLen)} × {fmt(blankW)} sm</span></div>
          <div><span className="font-bold">Kanot:</span> <span className="font-mono text-sm font-bold">{fmt(flapH)} sm</span></div>
        </div>

        {/* ASOSIY QISM — 30% 3D + 70% eskiz */}
        <div className="flex gap-4" style={{ height: "155mm" }}>
          {/* 3D KO'RINISH — 30% */}
          <div className="flex-[3] border border-gray-300 rounded p-2 flex flex-col">
            <p className="text-[10px] font-bold text-center text-gray-500 mb-1">3D ko'rinish</p>
            <div className="flex-1 flex items-center justify-center">
              <svg viewBox={`0 0 ${bx3 + bw3 + d3 + 50} ${by3 + bh3 + 40}`} style={{ width: "100%", height: "100%" }}>
                {/* Old tomon */}
                <rect x={bx3} y={by3} width={bw3} height={bh3}
                  fill="#f5f5f5" stroke="#000" strokeWidth={2} />
                {/* Ong tomon */}
                <polygon
                  points={`${bx3 + bw3},${by3} ${bx3 + bw3 + d3},${by3 - d3 * 0.6} ${bx3 + bw3 + d3},${by3 + bh3 - d3 * 0.6} ${bx3 + bw3},${by3 + bh3}`}
                  fill="#e5e5e5" stroke="#000" strokeWidth={2} />
                {/* Tepa tomon */}
                <polygon
                  points={`${bx3},${by3} ${bx3 + d3},${by3 - d3 * 0.6} ${bx3 + bw3 + d3},${by3 - d3 * 0.6} ${bx3 + bw3},${by3}`}
                  fill="#d5d5d5" stroke="#000" strokeWidth={2} />
                {/* Yelim chizig'i */}
                <line x1={bx3 + bw3 * 0.65} y1={by3} x2={bx3 + bw3 * 0.65 + d3} y2={by3 - d3 * 0.6}
                  stroke="#666" strokeWidth={1} strokeDasharray="3 2" />

                {/* W — pastda */}
                <line x1={bx3} y1={by3 + bh3 + 12} x2={bx3 + bw3} y2={by3 + bh3 + 12}
                  stroke="#000" strokeWidth={1} markerEnd="url(#aR3p)" markerStart="url(#aL3p)" />
                <text x={bx3 + bw3 / 2} y={by3 + bh3 + 24} textAnchor="middle" fontSize={11} fontWeight="bold">W = {W}</text>

                {/* H — chapda */}
                <line x1={bx3 - 12} y1={by3} x2={bx3 - 12} y2={by3 + bh3}
                  stroke="#000" strokeWidth={1} markerEnd="url(#aD3p)" markerStart="url(#aU3p)" />
                <text x={bx3 - 18} y={by3 + bh3 / 2 + 4} textAnchor="end" fontSize={11} fontWeight="bold">H = {H}</text>

                {/* L — pastda diagonal */}
                <line x1={bx3 + bw3} y1={by3 + bh3 + 12} x2={bx3 + bw3 + d3} y2={by3 + bh3 + 12 - d3 * 0.6}
                  stroke="#000" strokeWidth={1} />
                <line x1={bx3 + bw3 + d3} y1={by3 + bh3 + 12 - d3 * 0.6 + 8} x2={bx3 + bw3 + d3} y2={by3 + bh3 + 12 - d3 * 0.6 - 8}
                  stroke="#000" strokeWidth={1} markerEnd="url(#aD3p)" markerStart="url(#aU3p)" />
                <text x={bx3 + bw3 + d3 + 8} y={by3 + bh3 + 12 - d3 * 0.3 + 4} textAnchor="start" fontSize={11} fontWeight="bold">L = {L}</text>

                {/* Label */}
                <text x={bx3 + bw3 / 2} y={by3 + bh3 / 2 - 4} textAnchor="middle" fontSize={12} fontWeight="bold">{W} × {H} × {L}</text>
                <text x={bx3 + bw3 / 2} y={by3 + bh3 / 2 + 10} textAnchor="middle" fontSize={8} fill="#666">W × H × L</text>

                <defs>
                  <marker id="aR3p" markerWidth={7} markerHeight={7} refX={7} refY={3.5} orient="auto"><path d="M0,0 L7,3.5 L0,7 Z" fill="#000" /></marker>
                  <marker id="aL3p" markerWidth={7} markerHeight={7} refX={0} refY={3.5} orient="auto"><path d="M7,0 L0,3.5 L7,7 Z" fill="#000" /></marker>
                  <marker id="aD3p" markerWidth={7} markerHeight={7} refX={3.5} refY={7} orient="auto"><path d="M0,0 L7,0 L3.5,7 Z" fill="#000" /></marker>
                  <marker id="aU3p" markerWidth={7} markerHeight={7} refX={3.5} refY={0} orient="auto"><path d="M0,7 L7,7 L3.5,0 Z" fill="#000" /></marker>
                </defs>
              </svg>
            </div>
          </div>

          {/* KESMA ESKIZI — 70% */}
          <div className="flex-[7] border border-gray-300 rounded p-2 flex flex-col">
            <p className="text-[10px] font-bold text-center text-gray-500 mb-1">Kesma eskizi — to'liq (1 sm = 8 px)</p>
            <div className="flex-1 flex items-center justify-center overflow-hidden">
              <svg
                width={svgW + 80}
                height={svgH + 60}
                viewBox={`${-50} ${-30} ${svgW + 80} ${svgH + 60}`}
                style={{ width: "100%", height: "100%" }}
              >
                {/* TEPA CHIQINDI */}
                <rect x={0} y={yCutTop} width={svgW} height={1 * S}
                  fill="#fee2e2" stroke="#ef4444" strokeWidth={1} strokeDasharray="4 2" />
                <text x={svgW / 2} y={yCutTop + 0.5 * S + 5} textAnchor="middle" fontSize={13} fill="#ef4444" fontWeight="bold">1 sm chiqindi</text>

                {/* TOP FLAPS */}
                <rect x={x0} y={yFlapTop} width={xW1} height={flapH * S} fill="#dbeafe" stroke="#3b82f6" strokeWidth={1.5} strokeDasharray="5 3" />
                <rect x={xW1} y={yFlapTop} width={xL1 - xW1} height={flapH * S} fill="#dbeafe" stroke="#3b82f6" strokeWidth={1.5} strokeDasharray="5 3" />
                <rect x={xL1} y={yFlapTop} width={xW2 - xL1} height={flapH * S} fill="#dbeafe" stroke="#3b82f6" strokeWidth={1.5} strokeDasharray="5 3" />
                <rect x={xW2} y={yFlapTop} width={xL2 - xW2} height={flapH * S} fill="#dbeafe" stroke="#3b82f6" strokeWidth={1.5} strokeDasharray="5 3" />

                {/* MARKAZ PANELLARI */}
                <rect x={x0} y={yCenter} width={xW1} height={H * S} fill="#fef3c7" stroke="#d97706" strokeWidth={2.5} />
                <rect x={xW1} y={yCenter} width={xL1 - xW1} height={H * S} fill="#fed7aa" stroke="#ea580c" strokeWidth={2.5} />
                <rect x={xL1} y={yCenter} width={xW2 - xL1} height={H * S} fill="#fef3c7" stroke="#d97706" strokeWidth={2.5} />
                <rect x={xW2} y={yCenter} width={xL2 - xW2} height={H * S} fill="#fed7aa" stroke="#ea580c" strokeWidth={2.5} />

                {/* YELIM */}
                <rect x={xGlue} y={yCenter} width={5 * S} height={H * S} fill="#d1fae5" stroke="#10b981" strokeWidth={1.5} strokeDasharray="6 3" />
                <rect x={xCut} y={yCenter} width={1 * S} height={H * S} fill="#fee2e2" stroke="#ef4444" strokeWidth={1} strokeDasharray="3 2" />

                {/* PASTKI FLAPS */}
                <rect x={x0} y={yFlapBot} width={xW1} height={flapH * S} fill="#dbeafe" stroke="#3b82f6" strokeWidth={1.5} strokeDasharray="5 3" />
                <rect x={xW1} y={yFlapBot} width={xL1 - xW1} height={flapH * S} fill="#dbeafe" stroke="#3b82f6" strokeWidth={1.5} strokeDasharray="5 3" />
                <rect x={xL1} y={yFlapBot} width={xW2 - xL1} height={flapH * S} fill="#dbeafe" stroke="#3b82f6" strokeWidth={1.5} strokeDasharray="5 3" />
                <rect x={xW2} y={yFlapBot} width={xL2 - xW2} height={flapH * S} fill="#dbeafe" stroke="#3b82f6" strokeWidth={1.5} strokeDasharray="5 3" />

                {/* PASTKI CHIQINDI */}
                <rect x={0} y={yCutBot} width={svgW} height={1 * S} fill="#fee2e2" stroke="#ef4444" strokeWidth={1} strokeDasharray="4 2" />
                <text x={svgW / 2} y={yCutBot + 0.5 * S + 5} textAnchor="middle" fontSize={13} fill="#ef4444" fontWeight="bold">1 sm chiqindi</text>

                {/* PANEL MARKERS — KATTA */}
                <text x={xW1 / 2} y={yCenter + H * S / 2 - 8} textAnchor="middle" fontSize={18} fontWeight="bold" fill="#92400e">W</text>
                <text x={xW1 / 2} y={yCenter + H * S / 2 + 12} textAnchor="middle" fontSize={14} fill="#92400e">{W}</text>

                <text x={(xW1 + xL1) / 2} y={yCenter + H * S / 2 - 8} textAnchor="middle" fontSize={18} fontWeight="bold" fill="#9a3412">L</text>
                <text x={(xW1 + xL1) / 2} y={yCenter + H * S / 2 + 12} textAnchor="middle" fontSize={14} fill="#9a3412">{L}</text>

                <text x={(xL1 + xW2) / 2} y={yCenter + H * S / 2 - 8} textAnchor="middle" fontSize={18} fontWeight="bold" fill="#92400e">W</text>
                <text x={(xL1 + xW2) / 2} y={yCenter + H * S / 2 + 12} textAnchor="middle" fontSize={14} fill="#92400e">{W}</text>

                <text x={(xW2 + xL2) / 2} y={yCenter + H * S / 2 - 8} textAnchor="middle" fontSize={18} fontWeight="bold" fill="#9a3412">L</text>
                <text x={(xW2 + xL2) / 2} y={yCenter + H * S / 2 + 12} textAnchor="middle" fontSize={14} fill="#9a3412">{L}</text>

                <text x={xGlue + 2.5 * S} y={yCenter + H * S / 2 - 5} textAnchor="middle" fontSize={12} fontWeight="bold" fill="#065f46">YELIM</text>
                <text x={xGlue + 2.5 * S} y={yCenter + H * S / 2 + 8} textAnchor="middle" fontSize={11} fill="#065f46">5 sm</text>
                <text x={xCut + 0.5 * S} y={yCenter + H * S / 2 + 5} textAnchor="middle" fontSize={11} fill="#ef4444" fontWeight="bold">1</text>

                <text x={xW1 / 2} y={yFlapTop + flapH * S / 2 + 5} textAnchor="middle" fontSize={13} fill="#1e40af" fontWeight="bold">L/2</text>
                <text x={(xW1 + xL1) / 2} y={yFlapTop + flapH * S / 2 + 5} textAnchor="middle" fontSize={13} fill="#1e40af" fontWeight="bold">L/2</text>
                <text x={xW1 / 2} y={yFlapBot + flapH * S / 2 + 5} textAnchor="middle" fontSize={13} fill="#1e40af" fontWeight="bold">L/2</text>
                <text x={(xW1 + xL1) / 2} y={yFlapBot + flapH * S / 2 + 5} textAnchor="middle" fontSize={13} fill="#1e40af" fontWeight="bold">L/2</text>

                {/* HORIZONTAL O'LCHAMLAR — KATTA */}
                <line x1={0} y1={svgH + 10} x2={svgW} y2={svgH + 10} stroke="#374151" strokeWidth={1.5} markerEnd="url(#aR)" markerStart="url(#aL)" />
                <line x1={x0} y1={svgH + 4} x2={xW1} y2={svgH + 4} stroke="#d97706" strokeWidth={1} />
                <text x={xW1 / 2} y={svgH + 28} textAnchor="middle" fontSize={14} fill="#d97706" fontWeight="bold">{W}</text>
                <line x1={xW1} y1={svgH + 4} x2={xL1} y2={svgH + 4} stroke="#ea580c" strokeWidth={1} />
                <text x={(xW1 + xL1) / 2} y={svgH + 28} textAnchor="middle" fontSize={14} fill="#ea580c" fontWeight="bold">{L}</text>
                <line x1={xL1} y1={svgH + 4} x2={xW2} y2={svgH + 4} stroke="#d97706" strokeWidth={1} />
                <text x={(xL1 + xW2) / 2} y={svgH + 28} textAnchor="middle" fontSize={14} fill="#d97706" fontWeight="bold">{W}</text>
                <line x1={xW2} y1={svgH + 4} x2={xL2} y2={svgH + 4} stroke="#ea580c" strokeWidth={1} />
                <text x={(xW2 + xL2) / 2} y={svgH + 28} textAnchor="middle" fontSize={14} fill="#ea580c" fontWeight="bold">{L}</text>
                <line x1={xGlue} y1={svgH + 4} x2={xCut} y2={svgH + 4} stroke="#10b981" strokeWidth={1} />
                <text x={xGlue + 2.5 * S} y={svgH + 28} textAnchor="middle" fontSize={13} fill="#10b981" fontWeight="bold">5</text>
                <line x1={xCut} y1={svgH + 4} x2={xEnd} y2={svgH + 4} stroke="#ef4444" strokeWidth={1} />
                <text x={xCut + 0.5 * S} y={svgH + 28} textAnchor="middle" fontSize={13} fill="#ef4444" fontWeight="bold">1</text>
                <text x={svgW / 2} y={svgH + 48} textAnchor="middle" fontSize={15} fontWeight="bold" fill="#374151">
                  Kesma: {fmt(blankLen)} sm × {fmt(blankW)} sm
                </text>

                {/* VERTIKAL O'LCHAMLAR — KATTA */}
                <line x1={-12} y1={yCutTop} x2={-12} y2={yFlapTop} stroke="#ef4444" strokeWidth={1} />
                <text x={-18} y={(yCutTop + yFlapTop) / 2 + 5} textAnchor="end" fontSize={12} fill="#ef4444" fontWeight="bold">1</text>
                <line x1={-12} y1={yFlapTop} x2={-12} y2={yCenter} stroke="#3b82f6" strokeWidth={1} />
                <text x={-18} y={(yFlapTop + yCenter) / 2 + 5} textAnchor="end" fontSize={13} fill="#3b82f6" fontWeight="bold">{fmt(L / 2)}</text>
                <line x1={-12} y1={yCenter} x2={-12} y2={yFlapBot} stroke="#d97706" strokeWidth={1.5} />
                <text x={-18} y={(yCenter + yFlapBot) / 2 + 5} textAnchor="end" fontSize={15} fill="#d97706" fontWeight="bold">{H}</text>
                <line x1={-12} y1={yFlapBot} x2={-12} y2={yCutBot} stroke="#3b82f6" strokeWidth={1} />
                <text x={-18} y={(yFlapBot + yCutBot) / 2 + 5} textAnchor="end" fontSize={13} fill="#3b82f6" fontWeight="bold">{fmt(L / 2)}</text>
                <line x1={-12} y1={yCutBot} x2={-12} y2={yEnd} stroke="#ef4444" strokeWidth={1} />
                <text x={-18} y={(yCutBot + yEnd) / 2 + 5} textAnchor="end" fontSize={12} fill="#ef4444" fontWeight="bold">1</text>

                <defs>
                  <marker id="aR" markerWidth={8} markerHeight={8} refX={8} refY={4} orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#374151" /></marker>
                  <marker id="aL" markerWidth={8} markerHeight={8} refX={0} refY={4} orient="auto"><path d="M8,0 L0,4 L8,8 Z" fill="#374151" /></marker>
                </defs>
              </svg>
            </div>
          </div>
        </div>

        {/* IMZO */}
        <div className="mt-3 pt-2 border-t border-gray-300 flex justify-between text-[10px]">
          <div>
            <p className="font-bold mb-4">Ishlab chiqarish ruxsat etdi:</p>
            <div className="flex items-end gap-1">
              <span className="border-b border-black w-28">&nbsp;</span>
              <span>/____/</span>
            </div>
          </div>
          <div className="text-right">
            <p className="font-bold mb-4">Tayyorladi:</p>
            <div className="flex items-end gap-1 justify-end">
              <span>/____/</span>
              <span className="border-b border-black w-28">&nbsp;</span>
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
          @page { margin: 5mm; size: A4 landscape; }
        }
      `}</style>
    </div>
  );
}

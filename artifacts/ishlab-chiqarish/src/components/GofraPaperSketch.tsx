import React from "react";

interface GofraPaperSketchProps {
  width: number;
  length: number;
  printMode?: boolean;
}

export default function GofraPaperSketch({ width, length, printMode = false }: GofraPaperSketchProps) {
  if (width <= 0 || length <= 0) return null;

  const S = printMode ? 2 : 3;
  const maxSvgW = printMode ? 290 : 450;
  const maxSvgH = printMode ? 200 : 320;

  const rawW = width * S;
  const rawH = length * S;

  const scale = Math.min(maxSvgW / rawW, maxSvgH / rawH, 1);
  const svgW = rawW * scale;
  const svgH = rawH * scale;
  const pad = printMode ? 50 : 60;

  const f = (n: number) => Math.round(n * 10) / 10;

  const fontSize = printMode ? 14 : 14;
  const dimFontSize = printMode ? 12 : 13;
  const labelFontSize = printMode ? 11 : 11;

  return (
    <svg
      width={svgW + pad * 2}
      height={svgH + pad * 2}
      viewBox={`${-pad} ${-pad} ${svgW + pad * 2} ${svgH + pad * 2}`}
      className="w-full h-auto"
      style={printMode ? { maxHeight: "none" } : { maxHeight: "300px" }}
    >
      <rect x={-pad} y={-pad} width={svgW + pad * 2} height={svgH + pad * 2} fill="white" />

      {/* Gofra qog'oz asosiy rectangular */}
      <rect x={0} y={0} width={svgW} height={svgH}
        fill="#fef3c7" stroke="#d97706" strokeWidth={printMode ? 3 : 2.5} rx={4} />

      {/* Gofra chiziqlari — horizontal */}
      {Array.from({ length: Math.min(Math.floor(svgH / (printMode ? 16 : 12)), 30) }, (_, i) => {
        const total = Math.min(Math.floor(svgH / (printMode ? 16 : 12)), 30);
        const y = ((i + 1) * svgH) / (total + 1);
        return (
          <line
            key={`h-${i}`}
            x1={8} y1={y} x2={svgW - 8} y2={y}
            stroke="#ea580c" strokeWidth={printMode ? 1.2 : 0.8} strokeDasharray="6 4" opacity={0.5}
          />
        );
      })}

      {/* Gofra chiziqlari — vertical */}
      {Array.from({ length: Math.min(Math.floor(svgW / (printMode ? 16 : 12)), 35) }, (_, i) => {
        const total = Math.min(Math.floor(svgW / (printMode ? 16 : 12)), 35);
        const x = ((i + 1) * svgW) / (total + 1);
        return (
          <line
            key={`v-${i}`}
            x1={x} y1={8} x2={x} y2={svgH - 8}
            stroke="#d97706" strokeWidth={printMode ? 0.8 : 0.5} strokeDasharray="4 6" opacity={0.3}
          />
        );
      })}

      {/* Markaz text */}
      <text x={svgW / 2} y={svgH / 2 - 14} textAnchor="middle" fontSize={fontSize} fontWeight="bold" fill="#92400e">
        GOFRA QOG'OZ
      </text>
      <text x={svgW / 2} y={svgH / 2 + 14} textAnchor="middle" fontSize={labelFontSize} fill="#b45309">
        {width} × {length} sm
      </text>

      {/* Pastda — uzunlik o'lchami (Eni W) */}
      <line x1={0} y1={svgH + 16} x2={svgW} y2={svgH + 16}
        stroke="#d97706" strokeWidth={printMode ? 2 : 1.5}
        markerEnd="url(#gR)" markerStart="url(#gL)" />
      <line x1={0} y1={svgH + 4} x2={0} y2={svgH + 28}
        stroke="#d97706" strokeWidth={1} />
      <line x1={svgW} y1={svgH + 4} x2={svgW} y2={svgH + 28}
        stroke="#d97706" strokeWidth={1} />
      <text x={svgW / 2} y={svgH + 44} textAnchor="middle" fontSize={dimFontSize} fill="#d97706" fontWeight="bold">
        W = {f(width)} sm
      </text>

      {/* Chapda — bo'yi o'lchami (L) */}
      <line x1={-16} y1={0} x2={-16} y2={svgH}
        stroke="#ea580c" strokeWidth={printMode ? 2 : 1.5}
        markerEnd="url(#gD)" markerStart="url(#gU)" />
      <line x1={-4} y1={0} x2={-28} y2={0}
        stroke="#ea580c" strokeWidth={1} />
      <line x1={-4} y1={svgH} x2={-28} y2={svgH}
        stroke="#ea580c" strokeWidth={1} />
      <text
        x={-22} y={svgH / 2 + 5}
        textAnchor="end" fontSize={dimFontSize} fill="#ea580c" fontWeight="bold"
        transform={`rotate(-90, -22, ${svgH / 2})`}
      >
        L = {f(length)} sm
      </text>

      {/* Maydon */}
      <text x={svgW / 2} y={svgH + 68} textAnchor="middle" fontSize={labelFontSize} fontWeight="bold" fill="#374151">
        Maydon: {fmt((width * length) / 10000)} m²
      </text>

      <defs>
        <marker id="gR" markerWidth={8} markerHeight={8} refX={8} refY={4} orient="auto">
          <path d="M0,0 L8,4 L0,8 Z" fill="#d97706" />
        </marker>
        <marker id="gL" markerWidth={8} markerHeight={8} refX={0} refY={4} orient="auto">
          <path d="M8,0 L0,4 L8,8 Z" fill="#d97706" />
        </marker>
        <marker id="gD" markerWidth={8} markerHeight={8} refX={4} refY={8} orient="auto">
          <path d="M0,0 L8,0 L4,8 Z" fill="#ea580c" />
        </marker>
        <marker id="gU" markerWidth={8} markerHeight={8} refX={4} refY={0} orient="auto">
          <path d="M0,8 L8,8 L4,0 Z" fill="#ea580c" />
        </marker>
      </defs>
    </svg>
  );
}

function fmt(n: number) {
  return n.toLocaleString("uz-UZ");
}

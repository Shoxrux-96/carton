import { useRef, useEffect, useState } from "react";
import boxBaseUrl from "@assets/5.png";

interface Product3DProps {
  product: {
    name: string;
    description?: string;
    length?: number;
    width?: number;
    height?: number;
    material?: string;
    color?: string;
    image?: string;
    price?: number;
    clientLogo?: string;
    createdAt?: string;
  };
  companyLogo?: string;
}

function composeImage(
  baseSrc: string,
  clientLogo?: string,
  companyLogo?: string,
  prodName?: string,
  dimensions?: { length?: number; width?: number; height?: number },
  prodImage?: string,
): Promise<string> {
  return new Promise((resolve) => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d")!;
    canvas.width = 1200;
    canvas.height = 900;

    const base = new Image();
    base.crossOrigin = "anonymous";
    base.onload = () => {
      ctx.drawImage(base, 0, 0, 1200, 900);

      ctx.fillStyle = "rgba(0,0,0,0.2)";
      ctx.fillRect(0, 0, 1200, 900);

      const logo = clientLogo || companyLogo;
      if (logo) {
        const limg = new Image();
        limg.crossOrigin = "anonymous";
        limg.onload = () => {
          const logoSize = 220;
          const lx = 1200 - logoSize - 50;
          const ly = 50;
          ctx.save();
          ctx.shadowColor = "rgba(0,0,0,0.4)";
          ctx.shadowBlur = 20;
          ctx.shadowOffsetY = 5;
          ctx.beginPath();
          ctx.roundRect(lx - 10, ly - 10, logoSize + 20, logoSize + 20, 24);
          ctx.fillStyle = "rgba(255,255,255,0.9)";
          ctx.fill();
          ctx.shadowColor = "transparent";
          ctx.beginPath();
          ctx.roundRect(lx - 10, ly - 10, logoSize + 20, logoSize + 20, 24);
          ctx.clip();
          ctx.drawImage(limg, lx, ly, logoSize, logoSize);
          ctx.restore();
          drawText();
        };
        limg.onerror = drawText;
        limg.src = logo;
      } else {
        drawText();
      }
    };
    base.onerror = () => {
      ctx.fillStyle = "#c49464";
      ctx.fillRect(0, 0, 1200, 900);
      drawText();
    };
    base.src = baseSrc;

    function drawText() {
      ctx.save();
      ctx.shadowColor = "rgba(0,0,0,0.6)";
      ctx.shadowBlur = 15;
      ctx.shadowOffsetY = 4;

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 64px Inter, system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      ctx.fillText((prodName || "MAHSULOT").toUpperCase(), 600, 750);

      const l = dimensions?.length;
      const w = dimensions?.width;
      const h = dimensions?.height;
      if (l || w || h) {
        ctx.font = "36px Inter, system-ui, sans-serif";
        ctx.fillStyle = "rgba(255,255,255,0.9)";
        ctx.textBaseline = "top";
        const parts: string[] = [];
        if (l) parts.push(`${l} sm`);
        if (w) parts.push(`${w} sm`);
        if (h) parts.push(`${h} sm`);
        ctx.fillText(parts.join(" × "), 600, 770);
      }

      ctx.restore();

      if (prodImage) {
        const pimg = new Image();
        pimg.crossOrigin = "anonymous";
        pimg.onload = () => {
          const ps = 200;
          ctx.save();
          ctx.shadowColor = "rgba(0,0,0,0.3)";
          ctx.shadowBlur = 15;
          ctx.shadowOffsetY = 4;
          ctx.beginPath();
          ctx.roundRect(50, 50, ps, ps, 20);
          ctx.fillStyle = "rgba(255,255,255,0.85)";
          ctx.fill();
          ctx.shadowColor = "transparent";
          ctx.beginPath();
          ctx.roundRect(50, 50, ps, ps, 20);
          ctx.clip();
          ctx.drawImage(pimg, 50, 50, ps, ps);
          ctx.restore();
          resolve(canvas.toDataURL("image/png"));
        };
        pimg.onerror = () => resolve(canvas.toDataURL("image/png"));
        pimg.src = prodImage;
      } else {
        resolve(canvas.toDataURL("image/png"));
      }
    }
  });
}

export default function ProductView({ product, companyLogo }: Product3DProps) {
  const [composed, setComposed] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    composeImage(
      boxBaseUrl,
      product.clientLogo,
      companyLogo,
      product.name,
      { length: product.length, width: product.width, height: product.height },
      product.image,
    ).then((url) => {
      setComposed(url);
      setLoading(false);
    });
  }, [product.clientLogo, companyLogo, product.name, product.length, product.width, product.height, product.image]);

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-stone-100">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-foreground font-medium">Tayyorlanmoqda...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-stone-100 p-6">
      <div className="relative max-w-4xl w-full rounded-2xl overflow-hidden shadow-2xl border border-border/50">
        <img src={composed!} alt={product.name} className="w-full h-auto" />
        <div className="absolute top-4 right-4 flex items-center gap-2 px-4 py-2 rounded-xl bg-white/80 backdrop-blur shadow-sm border border-border/50">
          <div>
            <p className="text-sm font-bold text-foreground">{product.name}</p>
            {product.description && (
              <p className="text-xs text-muted-foreground max-w-[200px] truncate">{product.description}</p>
            )}
          </div>
        </div>
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-3">
          {product.material && (
            <InfoChip label="Material" value={product.material} />
          )}
          {product.price != null && (
            <InfoChip label="Narxi" value={`${Number(product.price).toLocaleString()} so'm`} />
          )}
          {product.createdAt && (
            <InfoChip
              label="Sana"
              value={new Date(product.createdAt).toLocaleDateString("uz-UZ", {
                day: "numeric", month: "short", year: "numeric",
              })}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function InfoChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-4 py-2 rounded-xl bg-white/80 backdrop-blur shadow-sm border border-border/50 text-center">
      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className="text-sm font-bold text-foreground">{value}</p>
    </div>
  );
}

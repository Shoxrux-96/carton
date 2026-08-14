import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import customFetch from "@/lib/custom-fetch";
import { useLang } from "@/lib/i18n";
import { useAuth } from "@/hooks/use-auth";
import { Boxes, Upload, Trash2, Download, Move } from "lucide-react";
import SiteNavbar from "@/components/SiteNavbar";

const FACE_KEYS = ["front", "back", "left", "right", "top", "bottom"] as const;
type FaceKey = (typeof FACE_KEYS)[number];

type BoxStyle = "fold" | "flap" | "lid";

const STYLE_KEYS: BoxStyle[] = ["fold", "flap", "lid"];
const STYLE_LABEL: Record<BoxStyle, string> = {
  fold: "catalog_3d_style_fold",
  flap: "catalog_3d_style_flap",
  lid: "catalog_3d_style_lid",
};

// Three.js BoxGeometry material order: [+x, -x, +y, -y, +z, -z]
const BOX_ORDER: FaceKey[] = ["right", "left", "top", "bottom", "front", "back"];

const DEFAULT_IMAGES = [
  `${import.meta.env.BASE_URL}images/carton-gofra.png`,
  `${import.meta.env.BASE_URL}images/box-60x40.webp`,
  `${import.meta.env.BASE_URL}images/quti.png`,
  `${import.meta.env.BASE_URL}images/qutilar.png`,
  `${import.meta.env.BASE_URL}images/sovg.png`,
];

const FACE_LABEL: Record<FaceKey, string> = {
  front: "catalog_3d_face_front",
  back: "catalog_3d_face_back",
  left: "catalog_3d_face_left",
  right: "catalog_3d_face_right",
  top: "catalog_3d_face_top",
  bottom: "catalog_3d_face_bottom",
};

const COMPANY_LOGO = `${import.meta.env.BASE_URL}images/logo-circle.png`;

const COLOR_MAP: Record<string, string> = {
  oq: "#ffffff",
  white: "#ffffff",
  "ko'k": "#dbeafe",
  blue: "#dbeafe",
  yashil: "#dcfce7",
  green: "#dcfce7",
  qizil: "#fee2e2",
  red: "#fee2e2",
  sariq: "#fef9c3",
  yellow: "#fef9c3",
  gofrokarton: "#f5efe3",
  karton: "#f5efe3",
};

function resolveColor(raw?: string): string {
  if (!raw) return "#f5efe3";
  const v = String(raw).trim();
  if (v.startsWith("#")) return v;
  const c = COLOR_MAP[v.toLowerCase()];
  return c || "#f5efe3";
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null as any);
    img.src = src;
  });
}

export default function CatalogView3D() {
  const { id } = useParams<{ id: string }>();
  const { t, lang } = useLang();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const { data: product } = useQuery({
    queryKey: ["/api/products", id],
    queryFn: () => customFetch(`/api/products/${id}`).then(r => r.json()),
    enabled: !!id,
  });

  const { data: products } = useQuery({
    queryKey: ["/api/public/products"],
    queryFn: () => customFetch("/api/public/products").then(r => r.json()),
  });

  const [face, setFace] = useState<FaceKey>("front");
  const [style, setStyle] = useState<BoxStyle>("fold");
  const [logoX, setLogoX] = useState(0.35);
  const [logoY, setLogoY] = useState(0.15);
  const [logoScale, setLogoScale] = useState(0.5);
  const [showLogo, setShowLogo] = useState(true);
  const [logoSrc, setLogoSrc] = useState<string>(COMPANY_LOGO);

  const x = product?.length ? Number(product.length) : 40;
  const y = product?.height ? Number(product.height) : 30;
  const z = product?.width ? Number(product.width) : 40;
  const baseColor = resolveColor(product?.color);

  const [logoImg, setLogoImg] = useState<HTMLImageElement | null>(null);
  const [textures, setTextures] = useState<THREE.CanvasTexture[]>([]);
  const threeRef = useRef<any>(null);

  useEffect(() => { loadImage(logoSrc).then(setLogoImg); }, [logoSrc]);
  useEffect(() => {
    const W = 1024;
    const H = 768;
    const build = (key: FaceKey): THREE.CanvasTexture => {
      const canvas = document.createElement("canvas");
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext("2d")!;

      // base carton fill
      ctx.fillStyle = baseColor;
      ctx.fillRect(0, 0, W, H);

      // corrugated texture lines
      ctx.strokeStyle = "rgba(0,0,0,0.06)";
      ctx.lineWidth = 3;
      for (let i = -H; i < W + H; i += 14) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i + H, H);
        ctx.stroke();
      }

      // box flap borders
      ctx.strokeStyle = "rgba(0,0,0,0.18)";
      ctx.lineWidth = 10;
      ctx.strokeRect(5, 5, W - 10, H - 10);
      ctx.strokeStyle = "rgba(255,255,255,0.25)";
      ctx.lineWidth = 4;
      ctx.strokeRect(18, 18, W - 36, H - 36);

      // logo printed on this face (transparent PNG, no panel)
      if (showLogo && logoImg && key === face) {
        const size = logoScale * Math.min(W, H) * 0.75;
        const pad = 14;
        const lx = logoX * (W - size - pad * 2) + pad;
        const ly = logoY * (H - size - pad * 2) + pad;
        const ar = logoImg.naturalWidth / logoImg.naturalHeight;
        let dw = size, dh = size;
        if (ar > 1) dh = size / ar; else if (ar < 1) dw = size * ar;
        ctx.save();
        ctx.shadowColor = "rgba(0,0,0,0.28)";
        ctx.shadowBlur = 18;
        ctx.shadowOffsetY = 5;
        ctx.drawImage(logoImg, lx + (size - dw) / 2, ly + (size - dh) / 2, dw, dh);
        ctx.restore();
      }

      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      return tex;
    };

    setTextures(BOX_ORDER.map(k => build(k)));
  }, [face, logoX, logoY, logoScale, showLogo, logoImg, baseColor]);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setLogoSrc(reader.result as string);
      setShowLogo(true);
    };
    reader.readAsDataURL(file);
  };

  if (!product) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <SiteNavbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-foreground font-medium">{t("catalog_3d_rotate_hint")}</p>
          </div>
        </div>
      </div>
    );
  }

  const otherProducts = (Array.isArray(products) ? products : []).filter((p: any) => String(p.id) !== String(id)).slice(0, 4);

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-stone-100 flex flex-col">
      <SiteNavbar />

      {/* Page header */}
      <div className="max-w-[1400px] w-full mx-auto px-4 sm:px-6 pt-6 pb-2 flex items-center justify-between">
        <h1 className="text-xl sm:text-2xl font-bold text-foreground truncate">{product.name}</h1>
        <Link href="/catalog" className="text-sm font-medium text-muted-foreground hover:text-amber-700 transition-colors shrink-0">
          {t("catalog_3d_back")}
        </Link>
      </div>

      <main className="flex-1 max-w-[1400px] w-full mx-auto px-4 sm:px-6 pb-6 flex flex-col lg:flex-row gap-4">
        {/* 3D canvas */}
        <div className="flex-1 h-[55vh] lg:h-[calc(100vh-16rem)] min-h-[420px] rounded-2xl overflow-hidden shadow-xl border border-border/50 bg-white relative">
          <Canvas
            camera={{ position: [4, 3, 5], fov: 45 }}
            gl={{ preserveDrawingBuffer: true, antialias: true, alpha: true }}
            dpr={[1, 2]}
            style={{ width: "100%", height: "100%" }}
            onCreated={({ scene }) => { scene.background = null; }}
          >
            <Box3DScene
              x={x} y={y} z={z}
              style={style}
              textures={textures}
              onDragFace={(f) => setFace(f)}
              onMoveLogo={(fx, fy) => { setLogoX(fx); setLogoY(fy); }}
            />
            <CaptureThree threeRef={threeRef} />
          </Canvas>
          <div className="absolute top-3 left-3 flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/85 backdrop-blur shadow-sm border border-border/50 text-xs text-muted-foreground">
            <Move className="w-3.5 h-3.5 text-amber-600" />
            {t("catalog_3d_rotate_hint")}
          </div>
          {/* Blue download button (bottom-left, per reference) */}
          <ExportButton threeRef={threeRef} className="absolute bottom-4 left-4" />
        </div>

        {/* Controls */}
        <aside className="w-full lg:w-80 shrink-0 bg-white/70 backdrop-blur rounded-2xl border border-border/50 shadow-sm p-5 space-y-6 max-h-[70vh] lg:max-h-none overflow-y-auto">
          {/* Box style picker */}
          <div>
            <p className="text-sm font-bold text-foreground mb-3">{t("catalog_3d_style")}</p>
            <div className="grid grid-cols-1 gap-2">
              {STYLE_KEYS.map(k => (
                <button
                  key={k}
                  onClick={() => setStyle(k)}
                  className={`px-3 py-2.5 rounded-xl border text-left transition-all ${
                    style === k
                      ? "bg-amber-600 text-white border-amber-600 shadow-md shadow-amber-500/25"
                      : "bg-white text-muted-foreground border-border hover:border-amber-300 hover:text-amber-700"
                  }`}
                >
                  <span className="block text-xs font-semibold">{t(STYLE_LABEL[k])}</span>
                  <span className={`block text-[11px] mt-0.5 ${style === k ? "text-amber-100" : "text-muted-foreground/70"}`}>
                    {t(`${STYLE_LABEL[k]}_desc`)}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Face picker */}
          <div>
            <p className="text-sm font-bold text-foreground mb-3">{t("catalog_3d_face")}</p>
            <div className="grid grid-cols-3 gap-2">
              {FACE_KEYS.map(k => (
                <button
                  key={k}
                  onClick={() => setFace(k)}
                  className={`px-2 py-2 rounded-xl text-xs font-semibold border transition-all ${
                    face === k
                      ? "bg-amber-600 text-white border-amber-600 shadow-md shadow-amber-500/25"
                      : "bg-white text-muted-foreground border-border hover:border-amber-300 hover:text-amber-700"
                  }`}
                >
                  {t(FACE_LABEL[k])}
                </button>
              ))}
            </div>
          </div>

          {/* Logo controls */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-bold text-foreground">{t("catalog_3d_logo")}</p>
              <label className="flex items-center gap-2 text-xs font-medium text-amber-700 cursor-pointer hover:text-amber-800">
                <input type="checkbox" checked={showLogo} onChange={e => setShowLogo(e.target.checked)} className="accent-amber-600" />
                <Boxes className="w-3.5 h-3.5" />
              </label>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                  <span>{t("catalog_3d_logo_position")}</span>
                </div>
                <input
                  type="range" min={0} max={1} step={0.01} value={logoX}
                  onChange={e => setLogoX(Number(e.target.value))}
                  className="w-full accent-amber-600"
                />
                <input
                  type="range" min={0} max={1} step={0.01} value={logoY}
                  onChange={e => setLogoY(Number(e.target.value))}
                  className="w-full accent-amber-600 mt-2"
                />
              </div>

              <div>
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                  <span>{t("catalog_3d_logo_scale")}</span>
                  <span className="font-semibold text-amber-700">{Math.round(logoScale * 100)}%</span>
                </div>
                <input
                  type="range" min={0.15} max={1} step={0.01} value={logoScale}
                  onChange={e => setLogoScale(Number(e.target.value))}
                  className="w-full accent-amber-600"
                />
              </div>

              <div className="flex gap-2">
                <label className="flex-1 cursor-pointer">
                  <input type="file" accept="image/*" onChange={handleUpload} className="hidden" />
                  <span className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-amber-300 text-amber-700 text-sm font-semibold hover:bg-amber-50 transition-colors">
                    <Upload className="w-4 h-4" /> {t("catalog_3d_logo_upload")}
                  </span>
                </label>
                <button
                  onClick={() => { setShowLogo(false); setLogoSrc(COMPANY_LOGO); }}
                  className="flex items-center justify-center px-3 py-2.5 rounded-xl border border-border text-muted-foreground hover:border-red-300 hover:text-red-600 transition-colors"
                  title={t("catalog_3d_logo_remove")}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Info */}
          {(x || y || z || product.material) && (
            <div className="pt-4 border-t border-border/60">
              <div className="flex flex-wrap gap-2">
                <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-xs font-medium text-amber-700 border border-amber-100">
                  {t("catalog_3d_dimensions")}: {x}×{y}×{z} sm
                </span>
                {product.material && (
                  <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-xs font-medium text-amber-700 border border-amber-100">
                    {t("catalog_3d_material")}: {product.material}
                  </span>
                )}
                {isAdmin && product.price != null && (
                  <span className="px-2.5 py-1 rounded-lg bg-amber-600 text-xs font-medium text-white border border-amber-600">
                    {Number(product.price).toLocaleString(lang === "ru" ? "ru-RU" : "uz-UZ")} {t("landing_currency")}
                  </span>
                )}
              </div>
            </div>
          )}

        </aside>
      </main>

      {/* Other products strip */}
      <div className="max-w-[1400px] w-full mx-auto px-4 sm:px-6 pb-8">
        <div className="bg-white/70 backdrop-blur rounded-2xl border border-border/50 shadow-sm p-4">
          <p className="text-sm font-bold text-foreground mb-3">{t("catalog_3d_other_products")}</p>
          {otherProducts.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {otherProducts.map((p: any, i: number) => {
                const imgSrc = p.image || DEFAULT_IMAGES[i % DEFAULT_IMAGES.length];
                return (
                  <Link
                    key={p.id}
                    href={`/catalog/${p.id}`}
                    className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all ${
                      String(p.id) === String(id)
                        ? "border-amber-400 bg-amber-50"
                        : "border-border/60 hover:border-amber-300 hover:bg-amber-50/60"
                    }`}
                  >
                    <img
                      src={imgSrc}
                      alt={p.name}
                      className="w-14 h-14 rounded-lg object-cover shrink-0 bg-gradient-to-br from-amber-50 to-orange-50"
                    />
                    <span className="text-sm font-semibold text-foreground leading-tight line-clamp-2">{p.name}</span>
                  </Link>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t("landing_no_products")}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function Box3DScene({ x, y, z, style, textures, onDragFace, onMoveLogo }: {
  x: number; y: number; z: number;
  style: BoxStyle;
  textures: THREE.CanvasTexture[];
  onDragFace: (f: FaceKey) => void;
  onMoveLogo: (fx: number, fy: number) => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const raycaster = useRef(new THREE.Raycaster());
  const pointer = useRef(new THREE.Vector2());
  const isDragging = useRef(false);

  const scale = 5 / Math.max(x, y, z);
  const gw = x * scale, gh = y * scale, gd = z * scale;

  const materials = useMemo(
    () => textures.map((map) => new THREE.MeshStandardMaterial({
      map,
      roughness: 0.6,
      metalness: 0,
      transparent: true,
      opacity: 0.55,
      side: THREE.DoubleSide,
      depthWrite: false,
    })),
    [textures],
  );

  const panelMat = useMemo(
    () => new THREE.MeshStandardMaterial({
      color: "#ffffff",
      roughness: 0.6,
      metalness: 0,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
    [],
  );

  const resolveHit = (e: any): { face: FaceKey; fx: number; fy: number } | null => {
    const mesh = meshRef.current;
    if (!mesh) return null;
    const native = e.nativeEvent;
    const rect = ((native.currentTarget || native.target) as HTMLElement).getBoundingClientRect();
    pointer.current.x = ((native.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.current.y = -((native.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.current.setFromCamera(pointer.current, e.camera);
    const [hit] = raycaster.current.intersectObject(mesh, false);
    if (!hit?.point) return null;

    const local = mesh.worldToLocal(hit.point.clone());
    const n = hit.face?.normal || new THREE.Vector3(0, 0, 1);
    const ax = Math.abs(n.x), ay = Math.abs(n.y), az = Math.abs(n.z);

    const hx = gw / 2, hy = gh / 2, hz = gd / 2;
    let face: FaceKey;
    let u: number, v: number;
    if (az >= ax && az >= ay) {
      face = n.z > 0 ? "front" : "back";
      u = (local.x + hx) / gw;
      v = (local.y + hy) / gh;
    } else if (ay >= ax && ay >= az) {
      face = n.y > 0 ? "top" : "bottom";
      u = (local.x + hx) / gw;
      v = (local.z + hz) / gd;
    } else {
      face = n.x > 0 ? "right" : "left";
      u = (local.z + hz) / gd;
      v = (local.y + hy) / gh;
    }
    return { face, fx: Math.min(1, Math.max(0, u)), fy: Math.min(1, Math.max(0, v)) };
  };

  return (
    <>
      <ambientLight intensity={0.7} />
      <directionalLight position={[6, 10, 8]} intensity={1.2} />
      <directionalLight position={[-6, -4, -6]} intensity={0.35} />
      {/* soft ground shadow */}
      <mesh position={[0, -gh / 2 - 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[gw * 1.6, gd * 1.6]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.08} depthWrite={false} />
      </mesh>
      <mesh
        ref={meshRef}
        material={materials}
        onPointerDown={(e) => {
          e.stopPropagation();
          const hit = resolveHit(e);
          if (hit) {
            isDragging.current = true;
            onDragFace(hit.face);
            onMoveLogo(hit.fx, hit.fy);
          }
        }}
        onPointerMove={(e) => {
          if (!isDragging.current) return;
          e.stopPropagation();
          const hit = resolveHit(e);
          if (hit) {
            onDragFace(hit.face);
            onMoveLogo(hit.fx, hit.fy);
          }
        }}
        onPointerUp={() => { isDragging.current = false; }}
        onPointerLeave={() => { isDragging.current = false; }}
      >
        <boxGeometry args={[gw, gh, gd]} />
      </mesh>

      {style === "flap" && (
        <>
          {/* two open top flaps (mailer) */}
          <mesh material={panelMat} raycast={() => null} position={[0, gh / 2 + 0.03, -gd / 4]} rotation={[1.15, 0, 0]}>
            <boxGeometry args={[gw, 0.06, gd / 2]} />
          </mesh>
          <mesh material={panelMat} raycast={() => null} position={[0, gh / 2 + 0.03, gd / 4]} rotation={[-1.15, 0, 0]}>
            <boxGeometry args={[gw, 0.06, gd / 2]} />
          </mesh>
          {/* side flaps folded flat on top */}
          <mesh material={panelMat} raycast={() => null} position={[-gw / 4, gh / 2 + 0.03, 0]}>
            <boxGeometry args={[gw / 2, 0.04, gd - 0.1]} />
          </mesh>
          <mesh material={panelMat} raycast={() => null} position={[gw / 4, gh / 2 + 0.03, 0]}>
            <boxGeometry args={[gw / 2, 0.04, gd - 0.1]} />
          </mesh>
        </>
      )}

      {style === "lid" && (
        <>
          {/* separate lid resting on top with a rim */}
          <mesh material={panelMat} raycast={() => null} position={[0, gh / 2 + 0.35, 0]}>
            <boxGeometry args={[gw + 0.5, 0.7, gd + 0.5]} />
          </mesh>
        </>
      )}
      <OrbitControls enableDamping dampingFactor={0.15} minDistance={3} maxDistance={20} makeDefault />
    </>
  );
}

function CaptureThree({ threeRef }: { threeRef: React.MutableRefObject<any> }) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  threeRef.current = { gl, scene, camera };
  return null;
}

function ExportButton({ threeRef, className }: { threeRef: React.MutableRefObject<any>; className?: string }) {
  const { t } = useLang();
  const handle = () => {
    const { gl, scene, camera } = threeRef.current || {};
    if (!gl) return;
    gl.render(scene, camera);
    const url = gl.domElement.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `karton-3d-${Date.now()}.png`;
    a.click();
  };
  return (
    <button
      onClick={handle}
      className={`${className || ""} flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-lg shadow-blue-500/25 transition-colors`}
    >
      <Download className="w-4 h-4" /> {t("catalog_3d_export")}
    </button>
  );
}

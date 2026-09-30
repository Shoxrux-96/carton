import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import customFetch from "@/lib/custom-fetch";
import { motion } from "framer-motion";
import { Phone, Ruler, Boxes, ArrowRight, Layers, Weight } from "lucide-react";
import { useLang } from "@/lib/i18n";
import { useAuth } from "@/hooks/use-auth";
import SiteNavbar from "@/components/SiteNavbar";

const DEFAULT_IMAGES = [
  `${import.meta.env.BASE_URL}images/carton-gofra.png`,
  `${import.meta.env.BASE_URL}images/box-60x40.webp`,
  `${import.meta.env.BASE_URL}images/quti.png`,
  `${import.meta.env.BASE_URL}images/qutilar.png`,
  `${import.meta.env.BASE_URL}images/sovg.png`,
];

export default function Catalog() {
  const { data: products, isLoading } = useQuery({
    queryKey: ["/api/public/products"],
    queryFn: () => customFetch("/api/public/products").then(r => r.json()),
  });

  const { t, lang } = useLang();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans scroll-smooth">
      <SiteNavbar />

      <section className="relative py-16 overflow-hidden bg-gradient-to-br from-amber-50 via-background to-orange-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-12">
            <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-foreground">
              {t("landing_catalog_title")}
            </h1>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              {t("landing_catalog_desc")}
            </p>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {Array.isArray(products) && products.map((product: any, i: number) => {
                const imgSrc = product.image || DEFAULT_IMAGES[i % DEFAULT_IMAGES.length];
                return (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: i * 0.1 }}
                    className="bg-card rounded-3xl overflow-hidden shadow-md border border-border/50 hover:shadow-xl hover:border-amber-200 transition-all duration-300 group flex flex-col"
                  >
                    <div className="aspect-[4/3] overflow-hidden bg-gradient-to-br from-amber-50 to-orange-50 relative flex items-center justify-center">
                      <img
                        src={imgSrc}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                      <Link
                        href={`/catalog/${product.id}`}
                        className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/30 transition-colors"
                      >
                        <span className="opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-amber-600 text-white font-semibold text-sm shadow-lg">
                          <Boxes className="w-4 h-4" /> {t("catalog_view_3d")}
                        </span>
                      </Link>
                    </div>
                    <div className="p-6 flex flex-col flex-1">
                      <h3 className="text-xl font-bold mb-2">{product.name}</h3>
                      <p className="text-muted-foreground text-sm mb-4 min-h-[40px]">
                        {product.description || t("landing_product_detail")}
                      </p>

                      {/* Quti o'lchamlari */}
                      {(product.length || product.width || product.height) && (
                        <div className="grid grid-cols-3 gap-2 mb-4">
                          {product.length && (
                            <div className="text-center p-2 bg-amber-50 rounded-lg border border-amber-100">
                              <div className="text-[10px] text-amber-600 font-medium uppercase">Bo'yi</div>
                              <div className="text-sm font-bold text-amber-800">{product.length} sm</div>
                            </div>
                          )}
                          {product.width && (
                            <div className="text-center p-2 bg-amber-50 rounded-lg border border-amber-100">
                              <div className="text-[10px] text-amber-600 font-medium uppercase">Eni</div>
                              <div className="text-sm font-bold text-amber-800">{product.width} sm</div>
                            </div>
                          )}
                          {product.height && (
                            <div className="text-center p-2 bg-amber-50 rounded-lg border border-amber-100">
                              <div className="text-[10px] text-amber-600 font-medium uppercase">Balandligi</div>
                              <div className="text-sm font-bold text-amber-800">{product.height} sm</div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Kalkulyatsiya ma'lumotlari */}
                      {(() => {
                        let calcData: any = null;
                        try { calcData = product.material ? JSON.parse(product.material) : null; } catch {}
                        if (!calcData) return null;
                        return (
                          <div className="mb-4 space-y-2 bg-violet-50 rounded-xl p-3 border border-violet-100">
                            <div className="flex items-center gap-1.5 text-[11px] font-bold text-violet-700 uppercase">
                              <Layers className="w-3 h-3" /> Qog'oz tarkibi
                            </div>
                            {calcData.l1 && (
                              <div className="flex items-center justify-between text-xs">
                                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-500" /> 1-qatlam (Tashqi)</span>
                                <span className="font-medium">{calcData.l1.weight} kg</span>
                              </div>
                            )}
                            {calcData.l2 && (
                              <div className="flex items-center justify-between text-xs">
                                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500" /> 2-qatlam (Gofra)</span>
                                <span className="font-medium">{calcData.l2.weight} kg</span>
                              </div>
                            )}
                            {calcData.l3 && (
                              <div className="flex items-center justify-between text-xs">
                                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-500" /> 3-qatlam (Ichki)</span>
                                <span className="font-medium">{calcData.l3.weight} kg</span>
                              </div>
                            )}
                            {calcData.blankLen && (
                              <div className="flex items-center justify-between text-xs pt-1.5 border-t border-violet-200">
                                <span className="text-violet-600">Kesma</span>
                                <span className="font-bold">{calcData.blankLen}×{calcData.blankW} sm</span>
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      <div className="pt-4 border-t border-border mt-auto">
                        {isAdmin && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-muted-foreground">Sotish narxi</span>
                            <span className="text-2xl font-bold text-emerald-600">
                              {Number(product.price).toLocaleString(lang === "ru" ? "ru-RU" : "uz-UZ")} {t("landing_currency")}
                            </span>
                          </div>
                        )}
                      </div>
                      <Link href={`/catalog/${product.id}`} className="mt-4">
                        <Button className="w-full rounded-xl bg-amber-600 hover:bg-amber-700 shadow-lg shadow-amber-500/25">
                          {t("catalog_view_3d")}
                          <ArrowRight className="ml-2 w-4 h-4" />
                        </Button>
                      </Link>
                    </div>
                  </motion.div>
                );
              })}
              {(!Array.isArray(products) || products.length === 0) && (
                <div className="col-span-full text-center py-20 text-muted-foreground">
                  {t("landing_no_products")}
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      <footer className="bg-gray-900 text-white mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <img
                src={`${import.meta.env.BASE_URL}images/logo-circle.png`}
                alt="Shovot Carton"
                className="w-12 h-12 rounded-full object-contain bg-white ring-2 ring-amber-400/40 p-1"
              />
              <div>
                <div className="font-bold text-lg leading-tight">Shovot Carton</div>
                <div className="text-xs text-gray-400">shovotcarton.uz</div>
              </div>
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-400">
              <a href="tel:+998995054004" className="hover:text-amber-400 transition-colors">+998 99 505 40 04</a>
              <a href="/#contact" className="hover:text-amber-400 transition-colors">{t("landing_contact")}</a>
            </div>
            <p className="text-gray-500 text-sm">© {new Date().getFullYear()} Shovot Carton. {t("landing_rights")}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

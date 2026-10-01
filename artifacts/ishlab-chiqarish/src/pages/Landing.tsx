import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useQuery } from "@tanstack/react-query";
import customFetch from "@/lib/custom-fetch";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { Mail, MapPin, ChevronRight, Award, Truck, Package, Send, Loader2, PackageOpen, Boxes, Stamp, Palette, ArrowRightLeft, Phone, Ruler, Globe, Layers } from "lucide-react";
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

export default function Landing() {
  const { data: products, isLoading } = useQuery({
    queryKey: ["/api/public/products"],
    queryFn: () => customFetch("/api/public/products").then(r => r.json()),
  });

  const { t, lang } = useLang();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [phoneOpen, setPhoneOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans scroll-smooth">
      {/* Navbar */}
      <SiteNavbar />

      {/* Hero */}
      <section id="top" className="relative pt-16 pb-24 overflow-hidden bg-gradient-to-br from-amber-50 via-background to-orange-50">
        <div className="absolute inset-0 opacity-5 pointer-events-none" style={{backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23d97706' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")"}} />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex flex-col lg:flex-row items-center gap-12">
            <div className="flex-1 text-center lg:text-left">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-100 text-amber-700 font-medium text-sm mb-8 border border-amber-200"
              >
                <Package className="w-4 h-4" />
                <span>{t("landing_location")}</span>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="text-4xl md:text-6xl font-bold tracking-tight text-foreground leading-[1.15]"
              >
                {t("landing_hero_title")}{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-600 to-orange-500">
                  {t("landing_hero_highlight")}
                </span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="mt-6 text-lg text-muted-foreground max-w-xl leading-relaxed"
              >
                {t("landing_hero_desc")}
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="mt-10 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start"
              >
                <Link href="/catalog">
                  <Button size="lg" className="rounded-full w-full sm:w-auto text-base px-8 h-13 bg-amber-600 hover:bg-amber-700 shadow-lg shadow-amber-500/25 group">
                    {t("landing_view_catalog")}
                    <ChevronRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
                <a href="#contact">
                  <Button size="lg" variant="outline" className="rounded-full w-full sm:w-auto text-base px-8 h-13 border-amber-300 text-amber-800 hover:bg-amber-50">
                    {t("landing_contact")}
                  </Button>
                </a>
              </motion.div>

              {/* Stats */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="mt-14 grid grid-cols-4 gap-4 max-w-lg mx-auto lg:mx-0"
              >
                {[
                  { value: "10+", key: "landing_stat_experience" },
                  { value: "500+", key: "landing_stat_clients" },
                  { value: "50+", key: "landing_stat_products" },
                  { value: "24/7", key: "landing_stat_support" },
                ].map((s) => (
                  <div key={s.key} className="text-center">
                    <div className="text-2xl font-bold text-amber-600">{s.value}</div>
                    <div className="text-xs text-muted-foreground mt-1 leading-tight">{t(s.key)}</div>
                  </div>
                ))}
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="flex-1 flex justify-center"
            >
              <div className="relative">
                <div className="absolute -inset-4 bg-gradient-to-br from-amber-400/20 to-orange-400/20 rounded-3xl blur-2xl" />
                <img
                  src={`${import.meta.env.BASE_URL}images/hero-box.png`}
                  alt={t("landing_hero_image_alt")}
                  className="relative w-full max-w-md object-contain drop-shadow-2xl"
                />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* About */}
      <section id="about" className="py-20 scroll-mt-24 bg-gradient-to-b from-background to-amber-50/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* About card with logo */}
          <div className="max-w-6xl mx-auto rounded-3xl overflow-hidden shadow-xl border border-amber-200 bg-white">
            <div className="flex flex-col lg:flex-row items-stretch">
              <div className="flex items-center justify-center p-10 lg:p-14 lg:w-96 shrink-0 bg-gradient-to-br from-amber-50 via-white to-orange-50">
                <img
                  src={`${import.meta.env.BASE_URL}images/logo-circle.png`}
                  alt='"SHOVOT CARTON PAPER" MChJ'
                  className="w-44 h-44 lg:w-56 lg:h-56 object-contain drop-shadow-2xl"
                />
              </div>
              <div className="flex-1 p-8 lg:p-12 flex flex-col justify-center">
                <div className="flex items-center gap-3 mb-4">
                  <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900">
                    {t("landing_about_section_title")}
                  </h2>
                  <div className="h-1 w-10 rounded-full bg-amber-500" />
                </div>
                <p className="text-muted-foreground leading-relaxed text-base md:text-lg">
                  {t("landing_about_section_desc")}
                </p>
                <div className="flex flex-wrap gap-3 mt-6">
                  <span className="inline-flex items-center gap-2 rounded-full bg-amber-100 text-amber-800 px-4 py-1.5 text-sm font-semibold">
                    <Package className="w-4 h-4" /> {t("landing_service_boxes")}
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full bg-amber-100 text-amber-800 px-4 py-1.5 text-sm font-semibold">
                    <Truck className="w-4 h-4" /> {t("landing_service_delivery")}
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full bg-amber-100 text-amber-800 px-4 py-1.5 text-sm font-semibold">
                    <Stamp className="w-4 h-4" /> {t("landing_service_logo")}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services */}
      <section id="services" className="py-20 scroll-mt-24 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-10">
              <h3 className="text-2xl md:text-3xl font-extrabold text-gray-900">
                {t("landing_services_title")}
              </h3>
              <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">
                {t("landing_services_desc")}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                {
                  icon: PackageOpen,
                  title: t("landing_service_boxes"),
                  desc: t("landing_service_boxes_desc"),
                },
                {
                  icon: Boxes,
                  title: t("landing_service_packaging"),
                  desc: t("landing_service_packaging_desc"),
                },
                {
                  icon: Stamp,
                  title: t("landing_service_logo"),
                  desc: t("landing_service_logo_desc"),
                },
                {
                  icon: Palette,
                  title: t("landing_service_design"),
                  desc: t("landing_service_design_desc"),
                },
                {
                  icon: ArrowRightLeft,
                  title: t("landing_service_transport"),
                  desc: t("landing_service_transport_desc"),
                },
                {
                  icon: Truck,
                  title: t("landing_service_delivery"),
                  desc: t("landing_service_delivery_desc"),
                },
              ].map((s, i) => (
                <motion.div
                  key={s.title}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.08 }}
                  whileHover={{ y: -6 }}
                  className="group rounded-2xl bg-white border border-amber-100 p-7 shadow-sm hover:shadow-xl hover:border-amber-300 transition-all duration-300"
                >
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-white mb-5 shadow-md group-hover:scale-110 transition-transform duration-300">
                    <s.icon className="w-7 h-7" />
                  </div>
                  <h4 className="text-lg font-bold text-gray-900 mb-2">{s.title}</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
      </section>

      {/* About / Features */}
      <section id="features" className="py-20 scroll-mt-24 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold">{t("landing_why_us")}</h2>
            <p className="mt-4 text-muted-foreground max-w-2xl mx-auto text-lg">
              {t("landing_why_us_desc")}
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Award, titleKey: "landing_feature_quality", descKey: "landing_feature_quality_desc" },
              { icon: Truck, titleKey: "landing_feature_delivery", descKey: "landing_feature_delivery_desc" },
              { icon: Package, titleKey: "landing_feature_sizes", descKey: "landing_feature_sizes_desc" },
              { icon: Globe, titleKey: "landing_feature_export", descKey: "landing_feature_export_desc" },
            ].map((f, i) => (
              <motion.div
                key={f.titleKey}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="bg-amber-50 border border-amber-100 rounded-2xl p-6 text-center hover:shadow-lg hover:border-amber-200 transition-all duration-300"
              >
                <div className="w-14 h-14 rounded-2xl bg-amber-600/10 flex items-center justify-center text-amber-600 mx-auto mb-4">
                  <f.icon className="w-7 h-7" />
                </div>
                <h3 className="font-bold text-lg mb-2">{t(f.titleKey)}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{t(f.descKey)}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Catalog preview */}
      <section id="catalog" className="py-24 scroll-mt-24 bg-secondary/20 border-y border-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold">{t("landing_catalog_title")}</h2>
            <p className="mt-4 text-muted-foreground max-w-2xl mx-auto text-lg">
              {t("landing_catalog_desc")}
            </p>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {Array.isArray(products) && products.slice(0, 3).map((product: any, i: number) => {
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
                          <ArrowRightLeft className="ml-2 w-4 h-4" />
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

          <div className="text-center mt-12">
            <Link href="/catalog">
              <Button size="lg" className="rounded-full text-base px-10 h-13 bg-amber-600 hover:bg-amber-700 shadow-lg shadow-amber-500/25 group">
                {t("landing_view_all")}
                <ChevronRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="py-20 scroll-mt-24 bg-gradient-to-b from-background to-amber-50/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold">{t("landing_contact_title")}</h2>
            <p className="mt-4 text-muted-foreground max-w-xl mx-auto">
              {t("landing_contact_desc")}
            </p>
          </div>

          <ContactForm />
        </div>
      </section>

      {/* Floating social buttons (right side, hero area) */}
      <div className="fixed right-3 sm:right-4 top-[calc(50%+40px)] z-50 flex flex-col items-end gap-4">
        <a
          href="https://t.me/+998995054004"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Telegram"
          title="Telegram: yozish"
          className="relative flex h-12 w-12 items-center justify-center rounded-full bg-sky-500 text-white shadow-[0_0_18px_rgba(14,165,233,0.65)] ring-1 ring-white/20 hover:scale-110 hover:bg-sky-400 active:scale-95 transition-all"
        >
          <span className="pointer-events-none absolute inset-0 rounded-full ring-2 ring-sky-300/80 animate-pulse" />
          <span className="pointer-events-none absolute -inset-1 rounded-full border-2 border-sky-400 animate-ping" />
          <TelegramIcon className="relative h-6 w-6" />
        </a>
        <a
          href="https://www.instagram.com/shovotcarton/"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Instagram"
          title="Instagram: @shovotcarton"
          className="relative flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 text-white shadow-[0_0_18px_rgba(236,72,153,0.65)] ring-1 ring-white/20 hover:scale-110 active:scale-95 transition-all"
        >
          <span className="pointer-events-none absolute inset-0 rounded-full ring-2 ring-pink-300/80 animate-pulse" />
          <span className="pointer-events-none absolute -inset-1 rounded-full border-2 border-pink-400 animate-ping" />
          <InstagramIcon className="relative h-6 w-6" />
        </a>
        <div className="flex items-center justify-end gap-2">
          <AnimatePresence initial={false}>
            {phoneOpen && (
              <motion.a
                href="tel:+998995054004"
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 184 }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.25 }}
                aria-label="+998 99 505 40 04"
                className="flex h-12 shrink-0 items-center justify-center overflow-hidden whitespace-nowrap rounded-full bg-emerald-500 text-sm font-bold tracking-wide text-white shadow-[0_0_18px_rgba(16,185,129,0.6)]"
              >
                +998 99 505 40 04
              </motion.a>
            )}
          </AnimatePresence>
          <button
            type="button"
            onClick={() => setPhoneOpen(o => !o)}
            aria-label="Telefon raqam"
            aria-expanded={phoneOpen}
            title="Telefon raqam"
            className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white shadow-[0_0_18px_rgba(16,185,129,0.65)] ring-1 ring-white/20 hover:scale-110 hover:bg-emerald-400 active:scale-95 transition-all"
          >
            <span className="pointer-events-none absolute inset-0 rounded-full ring-2 ring-emerald-300/80 animate-pulse" />
            <span className="pointer-events-none absolute -inset-1 rounded-full border-2 border-emerald-400 animate-ping" />
            <Phone className="relative h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
          <div className="grid grid-cols-1 md:grid-cols-[1.05fr_1.1fr_0.65fr_1.45fr] gap-10">
            <div>
              <div className="flex items-center gap-3 mb-5">
                <img
                  src={`${import.meta.env.BASE_URL}images/logo-circle.png`}
                  alt="Shovot Carton"
                  className="w-14 h-14 rounded-full object-contain bg-white ring-2 ring-amber-400/40 p-1"
                />
                <div>
                  <div className="font-bold text-lg leading-tight">Shovot Carton</div>
                  <div className="text-xs text-gray-400">shovotcarton.uz</div>
                </div>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed">
                {t("landing_footer_desc")}
              </p>
            </div>

            <div>
              <h3 className="font-bold text-lg mb-5">{t("landing_contact_title")}</h3>
              <ul className="space-y-3 text-sm text-gray-400">
                <li className="flex items-center gap-3 hover:text-white transition-colors">
                  <Phone className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>+998 99 505 40 04</span>
                </li>
                <li className="flex items-center gap-3 hover:text-white transition-colors">
                  <Mail className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>shovotcartonpaper@gmail.com</span>
                </li>
                <li className="flex items-start gap-3 hover:text-white transition-colors">
                  <MapPin className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span>{t("landing_address_value")}</span>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-bold text-lg mb-5">{t("landing_links")}</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#about" className="hover:text-amber-400 transition-colors">{t("landing_about")}</a></li>
                <li><a href="#catalog" className="hover:text-amber-400 transition-colors">{t("landing_catalog")}</a></li>
                <li><a href="#contact" className="hover:text-amber-400 transition-colors">{t("landing_contact")}</a></li>
                <li><Link href="/login" className="hover:text-amber-400 transition-colors">{t("landing_system_login")}</Link></li>
              </ul>
            </div>

            <div className="flex flex-row flex-wrap items-start gap-2.5 md:mt-[42px]">
              <a
                href="https://www.instagram.com/shovotcarton/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-gradient-to-r from-purple-600 via-pink-500 to-orange-400 text-white text-xs font-semibold shadow-lg shadow-pink-500/25 hover:scale-105 hover:shadow-pink-500/40 transition-all"
              >
                <InstagramIcon className="w-4 h-4" />
                @shovotcarton
              </a>
              <a
                href="https://t.me/+998995054004"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-sky-500 text-white text-xs font-semibold shadow-lg shadow-sky-500/30 hover:scale-105 hover:bg-sky-400 transition-all"
              >
                <TelegramIcon className="w-4 h-4" />
                +998 99 505 40 04
              </a>
            </div>
          </div>

          <div className="mt-10 pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-gray-500 text-sm">
              © {new Date().getFullYear()} Shovot Carton. {t("landing_rights")}
            </p>
            <p className="text-gray-600 text-sm">shovotcarton.uz</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function TelegramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z" />
    </svg>
  );
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
    </svg>
  );
}

function ContactForm() {
  const { t } = useLang();
  const [form, setForm] = useState({ name: "", phone: "", message: "" });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSending(true);
    try {
      const res = await fetch("/api/public/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("error");
      setSent(true);
      setForm({ name: "", phone: "", message: "" });
    } catch {
      setError(t("landing_send_error"));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 max-w-6xl mx-auto">
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="bg-card border border-border/50 rounded-3xl p-8 shadow-md"
      >
        {sent ? (
          <div className="flex flex-col items-center justify-center h-full py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center text-green-600 mb-4">
              <Mail className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold mb-2">{t("landing_sent_title")}</h3>
            <p className="text-muted-foreground">{t("landing_sent_desc")}</p>
            <Button variant="outline" className="mt-6" onClick={() => setSent(false)}>
              {t("landing_new_message")}
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <Label htmlFor="name" className="text-sm font-medium">{t("landing_your_name")}</Label>
              <Input
                id="name"
                placeholder={t("landing_your_name_placeholder")}
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                required
              />
            </div>
            <div>
              <Label htmlFor="phone" className="text-sm font-medium">{t("landing_your_phone")}</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+998 XX XXX XX XX"
                value={form.phone}
                onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                required
              />
            </div>
            <div>
              <Label htmlFor="message" className="text-sm font-medium">{t("landing_your_message")}</Label>
              <Textarea
                id="message"
                placeholder={t("landing_your_message_placeholder")}
                rows={4}
                value={form.message}
                onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
                required
                className="resize-none"
              />
            </div>
            {error && (
              <p className="text-sm text-destructive font-medium">{error}</p>
            )}
            <Button
              type="submit"
              size="lg"
              className="w-full rounded-xl bg-amber-600 hover:bg-amber-700 shadow-lg shadow-amber-500/25"
              isLoading={sending}
            >
              {sending ? t("landing_sending") : (
                <>
                  {t("landing_send")}
                  <Send className="ml-2 w-4 h-4" />
                </>
              )}
            </Button>
          </form>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: 20 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.15 }}
        className="rounded-3xl overflow-hidden shadow-md border border-border/50 h-full min-h-[400px]"
      >
        <iframe
          src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d1105.1826004580191!2d60.28639662600843!3d41.69906329838502!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x41de49de0aea90ed%3A0x97a42ef7522e9210!2sShovot%20Carton%20Paper!5e1!3m2!1suz!2s!4v1782279758827!5m2!1suz!2s"
          width="100%"
          height="100%"
          style={{ border: 0, minHeight: "400px" }}
          allowFullScreen
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
          title={t("landing_map_title")}
        />
      </motion.div>
    </div>
  );
}

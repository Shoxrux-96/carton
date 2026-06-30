import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useQuery } from "@tanstack/react-query";
import customFetch from "@/lib/custom-fetch";
import { motion } from "framer-motion";
import { useState, useRef, useEffect } from "react";
import { Phone, Mail, MapPin, ChevronRight, Globe, Award, Truck, Package, Send, Loader2, ChevronDown } from "lucide-react";
import { useLang } from "@/lib/i18n";

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

  const { t, lang, setLang } = useLang();
  const [langOpen, setLangOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) setLangOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      {/* Navbar */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border/50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-600 to-amber-400 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-amber-500/30">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xl font-bold tracking-tight text-foreground leading-tight">Shovot Carton Paper</div>
              <div className="text-xs text-muted-foreground">shovotcartonpaper.uz</div>
            </div>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
            <a href="#about" className="hover:text-foreground transition-colors">{t("landing_about")}</a>
            <a href="#catalog" className="hover:text-foreground transition-colors">{t("landing_catalog")}</a>
            <a href="#contact" className="hover:text-foreground transition-colors">{t("landing_contact")}</a>
          </nav>
          <div className="flex items-center gap-3">
            {/* Language Dropdown */}
            <div className="relative" ref={langRef}>
              <button
                onClick={() => setLangOpen(!langOpen)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-full border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:border-amber-300 transition-colors"
              >
                <Globe className="w-4 h-4" />
                <span>{lang === "uz" ? "UZ" : "RU"}</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${langOpen ? "rotate-180" : ""}`} />
              </button>
              {langOpen && (
                <div className="absolute right-0 top-full mt-2 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden min-w-[140px]">
                  <button
                    onClick={() => { setLang("uz"); setLangOpen(false); }}
                    className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors flex items-center gap-2 ${lang === "uz" ? "bg-amber-50 text-amber-700" : "hover:bg-muted"}`}
                  >
                    🇺🇿 O'zbekcha
                  </button>
                  <button
                    onClick={() => { setLang("ru"); setLangOpen(false); }}
                    className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors flex items-center gap-2 ${lang === "ru" ? "bg-amber-50 text-amber-700" : "hover:bg-muted"}`}
                  >
                    🇷🇺 Русский
                  </button>
                </div>
              )}
            </div>
            <Link href="/login">
              <Button variant="outline" className="rounded-full border-amber-300 text-amber-700 hover:bg-amber-50 hover:text-amber-800 font-semibold">
                {t("landing_login")}
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative pt-16 pb-24 overflow-hidden bg-gradient-to-br from-amber-50 via-background to-orange-50">
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
                <a href="#catalog">
                  <Button size="lg" className="rounded-full w-full sm:w-auto text-base px-8 h-13 bg-amber-600 hover:bg-amber-700 shadow-lg shadow-amber-500/25 group">
                    {t("landing_view_catalog")}
                    <ChevronRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </a>
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
                  alt="Karton qutilар"
                  className="relative w-full max-w-md object-contain drop-shadow-2xl"
                />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* About / Features */}
      <section id="about" className="py-20 bg-background">
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

      {/* Catalog */}
      <section id="catalog" className="py-24 bg-secondary/20 border-y border-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {Array.isArray(products) && products.map((product: any, i) => {
                 const imgSrc = product.image || DEFAULT_IMAGES[i % DEFAULT_IMAGES.length];
                return (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: i * 0.1 }}
                    className="bg-card rounded-3xl overflow-hidden shadow-md border border-border/50 hover:shadow-xl hover:border-amber-200 transition-all duration-300 group"
                  >
                    <div className="aspect-[4/3] overflow-hidden bg-gradient-to-br from-amber-50 to-orange-50 relative flex items-center justify-center">
                      <img
                        src={imgSrc}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                    </div>
                    <div className="p-6">
                      <h3 className="text-xl font-bold mb-2">{product.name}</h3>
                      <p className="text-muted-foreground text-sm mb-4 min-h-[40px]">
                        {product.description || t("landing_product_detail")}
                      </p>
                      {(product.length || product.width || product.height || product.material) && (
                        <div className="flex flex-wrap gap-2 mb-4">
                          {product.length && <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-xs font-medium text-amber-700 border border-amber-100">{product.length}×{product.width || "—"}×{product.height || "—"} sm</span>}
                          {product.material && <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-xs font-medium text-amber-700 border border-amber-100">{product.material}</span>}
                          {product.color && <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-xs font-medium text-amber-700 border border-amber-100">{product.color}</span>}
                        </div>
                      )}
                      <div className="flex items-center justify-between pt-4 border-t border-border">
                        <span className="text-sm font-medium text-muted-foreground">{t("landing_price_label")}</span>
                        <span className="text-2xl font-bold text-amber-600">
                          {Number(product.price).toLocaleString("uz-UZ")} so'm
                        </span>
                      </div>
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

      {/* Contact */}
      <section id="contact" className="py-20 bg-gradient-to-b from-background to-amber-50/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold">{t("landing_contact_title")}</h2>
            <p className="mt-4 text-muted-foreground max-w-xl mx-auto">
              {t("landing_contact_desc")}
            </p>
          </div>

          <ContactForm />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto mt-12">
            <motion.a
              href="tel:+998935001234"
              whileHover={{ y: -4 }}
              className="flex flex-col items-center gap-4 p-8 bg-amber-50 border border-amber-100 rounded-2xl hover:shadow-lg hover:border-amber-200 transition-all duration-300 text-center"
            >
              <div className="w-14 h-14 rounded-full bg-amber-600 flex items-center justify-center text-white">
                <Phone className="w-6 h-6" />
              </div>
              <div>
                <p className="font-bold text-lg">{t("landing_phone")}</p>
                <p className="text-muted-foreground mt-1">+998 99 505 40 04</p>
                <p className="text-muted-foreground">+998 62 234 56 78</p>
              </div>
            </motion.a>

            <motion.a
              href="mailto:shovotcartonpaper@gmail.com"
              whileHover={{ y: -4 }}
              className="flex flex-col items-center gap-4 p-8 bg-amber-50 border border-amber-100 rounded-2xl hover:shadow-lg hover:border-amber-200 transition-all duration-300 text-center"
            >
              <div className="w-14 h-14 rounded-full bg-amber-600 flex items-center justify-center text-white">
                <Mail className="w-6 h-6" />
              </div>
              <div>
                <p className="font-bold text-lg">{t("landing_email")}</p>
                <p className="text-muted-foreground mt-1">shovotcartonpaper@gmail.com</p>
              </div>
            </motion.a>

            <motion.div
              whileHover={{ y: -4 }}
              className="flex flex-col items-center gap-4 p-8 bg-amber-50 border border-amber-100 rounded-2xl hover:shadow-lg hover:border-amber-200 transition-all duration-300 text-center"
            >
              <div className="w-14 h-14 rounded-full bg-amber-600 flex items-center justify-center text-white">
                <MapPin className="w-6 h-6" />
              </div>
              <div>
                <p className="font-bold text-lg">{t("landing_address")}</p>
                <p className="text-muted-foreground mt-1">{t("landing_address_value")}</p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            <div>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-amber-600 flex items-center justify-center text-white">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-lg leading-tight">Shovot Carton Paper</div>
                  <div className="text-xs text-gray-400">shovotcartonpaper.uz</div>
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
          </div>

          <div className="mt-10 pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-gray-500 text-sm">
              © {new Date().getFullYear()} Shovot Carton Paper. {t("landing_rights")}
            </p>
            <p className="text-gray-600 text-sm">shovotcartonpaper.uz</p>
          </div>
        </div>
      </footer>
    </div>
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
          title="Shovot Carton Paper manzili"
        />
      </motion.div>
    </div>
  );
}

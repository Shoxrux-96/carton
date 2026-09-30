import { useState } from "react";
import { DashboardLayout, PageHeader } from "@/components/layout/DashboardLayout";
import { Package, Layers, Beaker } from "lucide-react";
import { useLang } from "@/lib/i18n";
import ProductionCalc from "./ProductionCalc";
import GofraPaperCalc from "./GofraPaperCalc";
import GlueRecipeCalc from "./GlueRecipeCalc";

type Tab = "quti" | "gofra" | "kley";

export default function ProductionCalcPage() {
  const [tab, setTab] = useState<Tab>("quti");
  const { t } = useLang();

  return (
    <DashboardLayout>
      <PageHeader
        title={t('calc_title')}
        description={t('calc_desc')}
      />

      {/* Tab switcher */}
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={() => setTab("quti")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${
            tab === "quti"
              ? "bg-primary text-primary-foreground shadow-md"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          <Package className="w-4 h-4" />
          📦 {t('calc_tab_box')}
        </button>
        <button
          onClick={() => setTab("gofra")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${
            tab === "gofra"
              ? "bg-primary text-primary-foreground shadow-md"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          <Layers className="w-4 h-4" />
          📐 {t('calc_tab_gofra')}
        </button>
        <button
          onClick={() => setTab("kley")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${
            tab === "kley"
              ? "bg-primary text-primary-foreground shadow-md"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          <Beaker className="w-4 h-4" />
          🧪 {t('calc_tab_glue')}
        </button>
      </div>

      {tab === "quti" && <ProductionCalc />}
      {tab === "gofra" && <GofraPaperCalc />}
      {tab === "kley" && <GlueRecipeCalc />}
    </DashboardLayout>
  );
}

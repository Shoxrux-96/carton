import { DashboardLayout, PageHeader } from "@/components/layout/DashboardLayout";
import { Calculator } from "lucide-react";
import ProductionCalc from "./ProductionCalc";

export default function ProductionCalcPage() {
  return (
    <DashboardLayout>
      <PageHeader
        title="Ishlab chiqarish kalkulyatsiyasi"
        description="Quti ishlab chiqarish xarajatlarini hisoblang"
      />
      <ProductionCalc />
    </DashboardLayout>
  );
}

import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import ProductView from "@/components/Product3D";
import customFetch from "@/lib/custom-fetch";
import { ArrowLeft } from "lucide-react";

export default function ProductViewPage() {
  const { id } = useParams<{ id: string }>();

  const { data: product, isLoading } = useQuery({
    queryKey: ["/api/products", id],
    queryFn: () => customFetch(`/api/products/${id}`).then(r => r.json()),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-stone-100 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-foreground font-medium">Yuklanmoqda...</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-stone-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl font-bold text-foreground mb-2">Mahsulot topilmadi</p>
          <Link href="/dashboard/products" className="text-amber-600 hover:text-amber-700 font-medium underline underline-offset-2">
            Bosh sahifaga qaytish
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-stone-100 flex flex-col">
      <header className="px-6 py-4 flex items-center justify-between bg-white/60 backdrop-blur border-b border-border/50">
        <Link href="/dashboard/products" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-5 h-5" />
          <span className="font-medium">Mahsulotlar</span>
        </Link>
        <h1 className="text-lg font-bold text-foreground">{product.name}</h1>
      </header>

      <main className="flex-1 p-4 md:p-6">
        <div className="max-w-5xl mx-auto h-[calc(100vh-8rem)] rounded-2xl overflow-hidden shadow-xl border border-border/50 bg-white/40 backdrop-blur">
          <ProductView product={product} companyLogo={undefined} />
        </div>
      </main>
    </div>
  );
}

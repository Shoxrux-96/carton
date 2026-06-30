import { useState, useRef } from "react";
import { DashboardLayout, PageHeader } from "@/components/layout/DashboardLayout";
import { useAuthHeaders } from "@/hooks/use-auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import customFetch from "@/lib/custom-fetch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/utils";
import { Plus, Trash2, PackageSearch, Pencil, Package, Upload, X, Eye, EyeOff } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLang } from "@/lib/i18n";

const schema = z.object({
  name: z.string().min(1, "Nomi kiritilishi shart"),
  description: z.string().optional(),
  price: z.coerce.number().min(0, "Narx noto'g'ri"),
  image: z.string().optional(),
  length: z.coerce.number().min(0).optional(),
  width: z.coerce.number().min(0).optional(),
  height: z.coerce.number().min(0).optional(),
  material: z.string().optional(),
  color: z.string().optional(),
  clientLogo: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function Products() {
  const queryClient = useQueryClient();
  const authOpts = useAuthHeaders();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const { t } = useLang();

  const { data: products, isLoading } = useQuery({
    queryKey: ["/api/products"],
    queryFn: () => customFetch("/api/products").then(r => r.json()),
  });

  const { data: inventory } = useQuery({
    queryKey: ["/api/inventory"],
    queryFn: () => customFetch("/api/inventory", { headers: authOpts.headers }).then(r => r.json()),
  });

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [isLoadingSubmit, setIsLoadingSubmit] = useState(false);

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", description: "", price: 0, image: "", length: undefined, width: undefined, height: undefined, material: "", color: "", clientLogo: "" },
  });

  const stockMap = new Map<number, number>();
  if (Array.isArray(inventory)) {
    inventory.forEach((inv: any) => {
      stockMap.set(inv.productId, (stockMap.get(inv.productId) || 0) + inv.quantity);
    });
  }

  const toBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const base64 = await toBase64(file);
      setImagePreview(base64);
      setValue("image", base64);
    }
  };

  const clearImage = () => {
    setImagePreview(null);
    setValue("image", "");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const openEdit = (product: any) => {
    setEditingProduct(product);
    setImagePreview(product.image || null);
    setValue("name", product.name);
    setValue("description", product.description || "");
    setValue("price", product.price);
    setValue("image", product.image || "");
    setValue("length", product.length ?? undefined);
    setValue("width", product.width ?? undefined);
    setValue("height", product.height ?? undefined);
    setValue("weight", product.weight ?? undefined);
    setValue("material", product.material || "");
    setValue("color", product.color || "");
    setValue("clientLogo", product.clientLogo || "");
    setIsAddOpen(true);
  };

  const openAdd = () => {
    setEditingProduct(null);
    setImagePreview(null);
    reset({ name: "", description: "", price: 0, image: "", length: undefined, width: undefined, height: undefined, material: "", color: "", clientLogo: "" });
    setIsAddOpen(true);
  };

  const onSubmit = async (data: FormValues) => {
    setIsLoadingSubmit(true);
    try {
      const payload = { ...data };
      if (!payload.image) payload.image = undefined;
      if (editingProduct) {
        await customFetch(`/api/products/${editingProduct.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", ...authOpts.headers },
          body: JSON.stringify(payload),
        });
      } else {
        await customFetch("/api/products", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authOpts.headers },
          body: JSON.stringify(payload),
        });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      setIsAddOpen(false);
      reset();
      setImagePreview(null);
    } finally {
      setIsLoadingSubmit(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm(t('confirm_delete_product'))) {
      await customFetch(`/api/products/${id}`, {
        method: "DELETE",
        headers: authOpts.headers,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
    }
  };

  const togglePublish = async (product: any) => {
    await customFetch(`/api/products/${product.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...authOpts.headers },
      body: JSON.stringify({ isPublished: !product.isPublished }),
    });
    queryClient.invalidateQueries({ queryKey: ["/api/products"] });
  };

  const totalStock = Array.from(stockMap.values()).reduce((a, b) => a + b, 0);

  return (
    <DashboardLayout>
      <PageHeader
        title={t('products_title')}
        description={`${products?.length || 0} ${t('products_in_stock').replace('{count}', totalStock.toLocaleString())}`}
        action={
          <Button onClick={openAdd} className="rounded-xl px-6 h-12 shadow-lg shadow-amber-500/20 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white border-0">
            <Plus className="mr-2 h-5 w-5" /> {t('add_new')}
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-48 rounded-2xl bg-muted animate-pulse" />
          ))
        ) : !Array.isArray(products) || products.length === 0 ? (
          <div className="col-span-full text-center py-20">
            <PackageSearch className="w-16 h-16 mx-auto text-muted-foreground mb-4 opacity-20" />
            <p className="text-xl font-medium text-foreground">{t('no_products_title')}</p>
            <p className="text-muted-foreground mt-2">{t('no_products_desc')}</p>
          </div>
        ) : (
          products.map((product: any) => {
            const stock = stockMap.get(product.id) || 0;
            const stockColor = stock === 0 ? "text-red-500" : stock < 50 ? "text-amber-500" : "text-green-500";
            return (
              <div
                key={product.id}
                className="group bg-card rounded-2xl border border-border/50 shadow-sm hover:shadow-xl hover:border-amber-200/50 transition-all duration-300 overflow-hidden"
              >
                <div className="aspect-[4/3] bg-gradient-to-br from-amber-50 to-orange-50 relative overflow-hidden">
                  {product.image ? (
                    <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-16 h-16 text-amber-300/40" />
                    </div>
                  )}
                  <div className="absolute top-3 left-3">
                    {product.isPublished ? (
                      <span className="px-2.5 py-1 rounded-lg bg-green-500 text-white text-xs font-medium shadow-lg flex items-center gap-1">
                        <Eye className="w-3 h-3" /> {t('published')}
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-lg bg-gray-500 text-white text-xs font-medium shadow-lg flex items-center gap-1">
                        <EyeOff className="w-3 h-3" /> {t('hidden')}
                      </span>
                    )}
                  </div>
                  <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => togglePublish(product)} className="w-9 h-9 rounded-xl bg-white/90 backdrop-blur shadow-lg flex items-center justify-center hover:bg-white transition-colors" title={product.isPublished ? "Yashirish" : "Publishend qilish"}>
                      {product.isPublished ? <EyeOff className="w-4 h-4 text-amber-600" /> : <Eye className="w-4 h-4 text-green-600" />}
                    </button>
                    <button onClick={() => openEdit(product)} className="w-9 h-9 rounded-xl bg-white/90 backdrop-blur shadow-lg flex items-center justify-center text-primary hover:bg-white transition-colors">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(product.id)} className="w-9 h-9 rounded-xl bg-white/90 backdrop-blur shadow-lg flex items-center justify-center text-destructive hover:bg-white transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="p-5">
                  <h3 className="font-bold text-lg text-foreground mb-1">{product.name}</h3>
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2 min-h-[2.5rem]">
                    {product.description || t('no_info')}
                  </p>

                  {(product.length || product.width || product.height || product.material) && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {product.length && <DimensionBadge label="Uzunlik" value={`${product.length} sm`} />}
                      {product.width && <DimensionBadge label="Kenglik" value={`${product.width} sm`} />}
                      {product.height && <DimensionBadge label="Balandlik" value={`${product.height} sm`} />}
                      {product.material && <DimensionBadge label="Material" value={product.material} />}
                      {product.color && (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted text-xs font-medium text-muted-foreground">
                          <span className="w-3 h-3 rounded-full border" style={{ backgroundColor: product.color }} />
                          {product.color}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-4 border-t border-border/50">
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">{t('product_price')}</p>
                      <p className="font-bold text-lg text-amber-600">{formatCurrency(product.price)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground mb-0.5">{t('in_stock')}</p>
                      <p className={`font-bold text-lg ${stockColor}`}>{stock} ta</p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen} title={editingProduct ? t('edit_product') : t('new_product')}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-4 max-h-[70vh] overflow-y-auto pr-1">
          <div>
            <label className="text-sm font-semibold block mb-1.5 text-foreground">{t('name_label')}</label>
            <Input {...register("name")} error={errors.name?.message} placeholder="Mahsulot nomi" className="h-12" />
          </div>
          <div>
            <label className="text-sm font-semibold block mb-1.5 text-foreground">{t('description_input')}</label>
            <Input {...register("description")} error={errors.description?.message} placeholder="Qisqacha ma'lumot" className="h-12" />
          </div>

          <div>
            <label className="text-sm font-semibold block mb-1.5 text-foreground">{t('image_label')}</label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
            {imagePreview ? (
              <div className="relative w-full h-40 rounded-xl overflow-hidden border-2 border-border bg-muted">
                <img src={imagePreview} alt="Preview" className="w-full h-full object-contain" />
                <button
                  type="button"
                  onClick={clearImage}
                  className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center hover:bg-black/70 transition-colors"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-24 rounded-xl border-2 border-dashed border-border hover:border-primary/50 transition-colors flex flex-col items-center justify-center gap-1.5 bg-muted/30 hover:bg-muted/50"
              >
                <Upload className="w-6 h-6 text-muted-foreground" />
                <span className="text-sm text-muted-foreground font-medium">{t('upload_image')}</span>
              </button>
            )}
          </div>

          <div>
            <label className="text-sm font-semibold block mb-1.5 text-foreground">{t('client_logo')}</label>
            <input
              type="file"
              accept="image/*"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (file) setValue("clientLogo", await toBase64(file));
              }}
              className="block w-full text-sm text-muted-foreground file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-amber-50 file:text-amber-700 hover:file:bg-amber-100"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-sm font-semibold block mb-1.5 text-foreground">{t('length_label')}</label>
              <Input type="number" step="0.1" {...register("length")} error={errors.length?.message} placeholder="0" className="h-12" />
            </div>
            <div>
              <label className="text-sm font-semibold block mb-1.5 text-foreground">{t('width_label')}</label>
              <Input type="number" step="0.1" {...register("width")} error={errors.width?.message} placeholder="0" className="h-12" />
            </div>
            <div>
              <label className="text-sm font-semibold block mb-1.5 text-foreground">{t('height_label')}</label>
              <Input type="number" step="0.1" {...register("height")} error={errors.height?.message} placeholder="0" className="h-12" />
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold block mb-1.5 text-foreground">{t('material_label')}</label>
              <Input {...register("material")} error={errors.material?.message} placeholder="Karton, gofrokarton..." className="h-12" />
            </div>

          <div>
            <label className="text-sm font-semibold block mb-1.5 text-foreground">{t('color_label')}</label>
            <Input {...register("color")} error={errors.color?.message} placeholder="Oq, jigarrang..." className="h-12" />
          </div>

          <div>
            <label className="text-sm font-semibold block mb-1.5 text-foreground">{t('price_som')}</label>
            <Input type="number" {...register("price")} error={errors.price?.message} placeholder="0" className="h-12" />
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-border">
            <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)} className="h-12 px-6 rounded-xl">{t('cancel')}</Button>
            <Button type="submit" isLoading={isLoadingSubmit} className="h-12 px-6 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white border-0">
              {editingProduct ? t('save') : t('add')}
            </Button>
          </div>
        </form>
      </Dialog>
    </DashboardLayout>
  );
}

function DimensionBadge({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-2.5 py-1 rounded-lg bg-muted text-xs font-medium text-muted-foreground">
      {label}: {value}
    </div>
  );
}

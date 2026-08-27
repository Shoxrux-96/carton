import { useState, useMemo } from "react";
import { DashboardLayout, PageHeader } from "@/components/layout/DashboardLayout";
import { useAuthHeaders } from "@/hooks/use-auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import customFetch from "@/lib/custom-fetch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Plus, Trash2, ClipboardCheck, Pencil, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { format, subDays, startOfWeek, startOfMonth, isAfter } from "date-fns";
import { useLang } from "@/lib/i18n";
import { PRODUCTS_MATERIALS } from "./Products";

const schema = z.object({
  title: z.string().min(1, "Sarlavha talab qilinadi"),
  description: z.string().optional(),
  assigneeId: z.coerce.number().optional(),
  productId: z.coerce.number().optional(),
  materialName: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: "Kutilmoqda", color: "bg-amber-100 text-amber-700", icon: Clock },
  in_progress: { label: "Jarayonda", color: "bg-blue-100 text-blue-700", icon: AlertCircle },
  completed: { label: "Bajarildi", color: "bg-green-100 text-green-700", icon: CheckCircle2 },
};

type TimePeriod = "all" | "daily" | "weekly" | "monthly";

const TIME_LABELS: Record<TimePeriod, string> = {
  all: "Barchasi",
  daily: "Bugun",
  weekly: "Bu hafta",
  monthly: "Bu oy",
};

export default function Tasks() {
  const queryClient = useQueryClient();
  const authOpts = useAuthHeaders();
  const { t } = useLang();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [isLoadingSubmit, setIsLoadingSubmit] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "in_progress" | "completed">("all");
  const [timeFilter, setTimeFilter] = useState<TimePeriod>("all");
  const [selectedMaterials, setSelectedMaterials] = useState<string[]>([]);
  const [customMaterial, setCustomMaterial] = useState("");

  const { data: tasks, isLoading } = useQuery({
    queryKey: ["/api/tasks"],
    queryFn: () => customFetch("/api/tasks", { headers: authOpts.headers }).then(r => r.json()),
  });

  const { data: employees } = useQuery({
    queryKey: ["/api/employees"],
    queryFn: () => customFetch("/api/employees", { headers: authOpts.headers }).then(r => r.json()),
  });

  const { data: products } = useQuery({
    queryKey: ["/api/products"],
    queryFn: () => customFetch("/api/products").then(r => r.json()),
  });

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { title: "", description: "", assigneeId: undefined, productId: undefined, materialName: "" },
  });

  const openAdd = () => {
    setEditing(null);
    setSelectedMaterials([]);
    setCustomMaterial("");
    reset({ title: "", description: "", assigneeId: undefined, productId: undefined, materialName: "" });
    setIsAddOpen(true);
  };

  const openEdit = (task: any) => {
    setEditing(task);
    const matStr = task.materialName || "";
    if (matStr) {
      const mats = matStr.split(",").map((s: string) => s.trim()).filter(Boolean);
      const known = mats.filter((m: string) => PRODUCTS_MATERIALS.includes(m));
      const unknown = mats.filter((m: string) => !PRODUCTS_MATERIALS.includes(m));
      setSelectedMaterials(known);
      setCustomMaterial(unknown.join(", "));
    } else {
      setSelectedMaterials([]);
      setCustomMaterial("");
    }
    reset({
      title: task.title,
      description: task.description || "",
      assigneeId: task.assigneeId || undefined,
      productId: task.productId || undefined,
      materialName: task.materialName || "",
    });
    setIsAddOpen(true);
  };

  const toggleMaterial = (mat: string) => {
    setSelectedMaterials(prev =>
      prev.includes(mat) ? prev.filter(m => m !== mat) : [...prev, mat]
    );
  };

  const onSubmit = async (data: FormValues) => {
    setIsLoadingSubmit(true);
    try {
      const allMats = [...selectedMaterials];
      if (customMaterial.trim()) {
        customMaterial.split(",").map(s => s.trim()).filter(Boolean).forEach(m => allMats.push(m));
      }
      const materialName = allMats.length > 0 ? allMats.join(", ") : null;

      const payload = {
        ...data,
        materialName,
        productId: data.productId || null,
        assigneeId: data.assigneeId || null,
      };
      if (editing) {
        await customFetch(`/api/tasks/${editing.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", ...authOpts.headers },
          body: JSON.stringify(payload),
        });
      } else {
        await customFetch("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authOpts.headers },
          body: JSON.stringify(payload),
        });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      setIsAddOpen(false);
      reset();
      setSelectedMaterials([]);
      setCustomMaterial("");
    } finally {
      setIsLoadingSubmit(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Topshiriqni o'chirishni xohlaysizmi?")) return;
    await customFetch(`/api/tasks/${id}`, {
      method: "DELETE",
      headers: authOpts.headers,
    });
    queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
  };

  const updateStatus = async (id: number, status: string) => {
    try {
      await customFetch(`/api/tasks/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authOpts.headers },
        body: JSON.stringify({ status }),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
    } catch {}
  };

  const filteredTasks = useMemo(() => {
    if (!Array.isArray(tasks)) return [];
    let result = statusFilter === "all" ? tasks : tasks.filter((t: any) => t.status === statusFilter);

    if (timeFilter !== "all") {
      const now = new Date();
      let cutoff: Date;
      if (timeFilter === "daily") {
        cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      } else if (timeFilter === "weekly") {
        cutoff = startOfWeek(now, { weekStartsOn: 1 });
      } else {
        cutoff = startOfMonth(now);
      }
      result = result.filter((t: any) => {
        if (!t.date) return false;
        return isAfter(new Date(t.date), cutoff) || new Date(t.date).getTime() === cutoff.getTime();
      });
    }

    return result;
  }, [tasks, statusFilter, timeFilter]);

  const stats = Array.isArray(tasks) ? {
    total: tasks.length,
    pending: tasks.filter((t: any) => t.status === "pending").length,
    inProgress: tasks.filter((t: any) => t.status === "in_progress").length,
    completed: tasks.filter((t: any) => t.status === "completed").length,
  } : { total: 0, pending: 0, inProgress: 0, completed: 0 };

  const activeEmployees = Array.isArray(employees) ? employees.filter((e: any) => e.status === "active") : [];

  return (
    <DashboardLayout>
      <PageHeader
        title="Topshiriqlar"
        description={`${stats.total} ta topshiriq — ${stats.completed} bajarildi, ${stats.pending} kutilmoqda`}
        action={
          <Button onClick={openAdd} className="rounded-xl px-6 h-12 shadow-lg shadow-primary/20 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white border-0">
            <Plus className="mr-2 h-5 w-5" /> Yangi topshiriq
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-4 border-0 shadow-md bg-gradient-to-br from-gray-50 to-gray-100">
          <div className="text-2xl font-bold text-gray-800">{stats.total}</div>
          <div className="text-xs text-gray-600">Jami</div>
        </Card>
        <Card className="p-4 border-0 shadow-md bg-gradient-to-br from-amber-50 to-amber-100">
          <div className="text-2xl font-bold text-amber-700">{stats.pending}</div>
          <div className="text-xs text-amber-600">Kutilmoqda</div>
        </Card>
        <Card className="p-4 border-0 shadow-md bg-gradient-to-br from-blue-50 to-blue-100">
          <div className="text-2xl font-bold text-blue-700">{stats.inProgress}</div>
          <div className="text-xs text-blue-600">Jarayonda</div>
        </Card>
        <Card className="p-4 border-0 shadow-md bg-gradient-to-br from-green-50 to-green-100">
          <div className="text-2xl font-bold text-green-700">{stats.completed}</div>
          <div className="text-xs text-green-600">Bajarildi</div>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        {/* Status filter */}
        <div className="flex gap-2">
          {(["all", "pending", "in_progress", "completed"] as const).map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                statusFilter === s
                  ? "bg-primary text-white shadow-md"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {s === "all" ? "Barchasi" : STATUS_CONFIG[s]?.label}
            </button>
          ))}
        </div>

        {/* Time period filter */}
        <div className="flex gap-2 ml-auto">
          {(["all", "daily", "weekly", "monthly"] as const).map(p => (
            <button
              key={p}
              onClick={() => setTimeFilter(p)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all border ${
                timeFilter === p
                  ? "bg-indigo-500 text-white border-indigo-500 shadow-md"
                  : "bg-white text-gray-600 border-gray-200 hover:bg-indigo-50 hover:border-indigo-300"
              }`}
            >
              {TIME_LABELS[p]}
            </button>
          ))}
        </div>
      </div>

      {/* Tasks list */}
      <div className="space-y-3">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={`task-skeleton-${i}`} className="h-24 rounded-2xl bg-muted animate-pulse" />
          ))
        ) : filteredTasks.length === 0 ? (
          <div className="text-center py-20">
            <ClipboardCheck className="w-16 h-16 mx-auto text-muted-foreground mb-4 opacity-20" />
            <p className="text-xl font-medium">Topshiriqlar yo'q</p>
            <p className="text-muted-foreground mt-2">Yangi topshiriq qo'shish uchun "+" tugmasini bosing</p>
          </div>
        ) : (
          filteredTasks.map((task: any) => {
            const StatusIcon = STATUS_CONFIG[task.status]?.icon || Clock;
            const isCompleted = task.status === "completed";
            return (
              <Card key={task.id} className={`p-5 border-0 shadow-sm hover:shadow-md transition-all ${isCompleted ? "opacity-70" : ""}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className={`font-bold text-lg ${isCompleted ? "line-through text-muted-foreground" : "text-foreground"}`}>
                        {task.title}
                      </h3>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_CONFIG[task.status]?.color || "bg-gray-100"}`}>
                        {STATUS_CONFIG[task.status]?.label}
                      </span>
                    </div>

                    {task.description && (
                      <p className="text-sm text-muted-foreground mb-3 whitespace-pre-wrap">{task.description}</p>
                    )}

                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                      {task.assigneeName && (
                        <span className="px-2 py-1 rounded-lg bg-blue-50 text-blue-700 font-medium">
                          {task.assigneeName}
                        </span>
                      )}
                      {task.productName && (
                        <span className="px-2 py-1 rounded-lg bg-amber-50 text-amber-700 font-medium">
                          {task.productName}
                        </span>
                      )}
                      {task.materialName && (
                        <span className="px-2 py-1 rounded-lg bg-purple-50 text-purple-700 font-medium">
                          {task.materialName}
                        </span>
                      )}
                      <span className="px-2 py-1 rounded-lg bg-muted font-medium">
                        {task.date ? format(new Date(task.date), "dd.MM.yyyy") : "-"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {task.status !== "completed" && (
                      <select
                        value={task.status}
                        onChange={e => updateStatus(task.id, e.target.value)}
                        className="px-2 py-1 rounded-lg text-xs font-medium border border-border bg-background cursor-pointer"
                      >
                        {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                          <option key={k} value={k}>{v.label}</option>
                        ))}
                      </select>
                    )}
                    <button onClick={() => openEdit(task)} className="p-2 rounded-lg hover:bg-muted text-muted-foreground transition-colors">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(task.id)} className="p-2 rounded-lg hover:bg-destructive/10 text-destructive transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* Add/Edit dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen} title={editing ? "Topshiriqni tahrirlash" : "Yangi topshiriq"}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-4 max-h-[70vh] overflow-y-auto pr-1">
          <div>
            <label className="text-sm font-semibold block mb-1.5">Sarlavha *</label>
            <Input {...register("title")} error={errors.title?.message} placeholder="Topshiriq nomi" className="h-12" />
          </div>

          <div>
            <label className="text-sm font-semibold block mb-1.5">Izoh</label>
            <textarea
              {...register("description")}
              placeholder="Topshiriq haqida batafsil yozing..."
              rows={4}
              className="w-full rounded-xl border-2 border-border bg-background px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <div>
            <label className="text-sm font-semibold block mb-1.5">Mas'ul (hodim)</label>
            <select {...register("assigneeId")} className="flex h-12 w-full rounded-xl border-2 border-border bg-background px-4 py-2 text-sm">
              <option value="">Tanlang...</option>
              {activeEmployees.map((emp: any) => (
                <option key={emp.id} value={emp.id}>{emp.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-semibold block mb-1.5">Mahsulot (ixtiyoriy)</label>
            <select {...register("productId")} className="flex h-12 w-full rounded-xl border-2 border-border bg-background px-4 py-2 text-sm">
              <option value="">Tanlang...</option>
              {Array.isArray(products) && products.map((p: any) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-semibold block mb-1.5">Materiallar (bir nechta tanlash mumkin)</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {PRODUCTS_MATERIALS.map(mat => {
                const isSelected = selectedMaterials.includes(mat);
                return (
                  <button
                    key={mat}
                    type="button"
                    onClick={() => toggleMaterial(mat)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border-2 transition-all ${
                      isSelected
                        ? "bg-primary text-white border-primary"
                        : "bg-muted text-muted-foreground border-border hover:border-primary/50"
                    }`}
                  >
                    {mat}
                  </button>
                );
              })}
            </div>
            {selectedMaterials.length > 0 && (
              <p className="text-xs text-primary font-medium mb-2">{selectedMaterials.length} ta material tanlangan</p>
            )}
          </div>

          <div>
            <label className="text-sm font-semibold block mb-1.5">Boshqa materiallar (vergul bilan ajrating)</label>
            <input
              type="text"
              value={customMaterial}
              onChange={e => setCustomMaterial(e.target.value)}
              placeholder="Masalan: Zanglamas po'lat, Alyuminiy"
              className="flex h-12 w-full rounded-xl border-2 border-border bg-background px-4 py-2 text-sm"
            />
          </div>

          <div className="text-xs text-muted-foreground">
            Sana: <span className="font-semibold">{format(new Date(), "dd.MM.yyyy")}</span> (avtomatik)
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-border">
            <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)} className="h-12 px-6 rounded-xl">{t('cancel')}</Button>
            <Button type="submit" isLoading={isLoadingSubmit} className="h-12 px-6 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white border-0">
              {editing ? "Saqlash" : "Qo'shish"}
            </Button>
          </div>
        </form>
      </Dialog>
    </DashboardLayout>
  );
}

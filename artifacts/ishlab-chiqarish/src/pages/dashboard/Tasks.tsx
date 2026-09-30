import { useState, useMemo } from "react";
import { DashboardLayout, PageHeader } from "@/components/layout/DashboardLayout";
import { useAuthHeaders } from "@/hooks/use-auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import customFetch from "@/lib/custom-fetch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Plus, Trash2, ClipboardCheck, Pencil, Calendar } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { format, startOfWeek, startOfMonth, startOfYear, isAfter } from "date-fns";
import { useLang } from "@/lib/i18n";


const schema = z.object({
  title: z.string().min(1, "Sarlavha talab qilinadi"),
  description: z.string().optional(),
  assigneeId: z.coerce.number().optional(),
  productId: z.coerce.number().optional(),
  materialName: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

type TimePeriod = "all" | "daily" | "weekly" | "monthly" | "yearly";

const TIME_LABELS: Record<TimePeriod, string> = {
  all: "Barchasi",
  daily: "Bugun",
  weekly: "Bu hafta",
  monthly: "Bu oy",
  yearly: "Bu yil",
};

export default function Tasks() {
  const queryClient = useQueryClient();
  const authOpts = useAuthHeaders();
  const { t } = useLang();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [isLoadingSubmit, setIsLoadingSubmit] = useState(false);
  const [timeFilter, setTimeFilter] = useState<TimePeriod>("all");
  const [filterDate, setFilterDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [showDatePicker, setShowDatePicker] = useState(false);

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

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { title: "", description: "", assigneeId: undefined, productId: undefined, materialName: "" },
  });

  const openAdd = () => {
    setEditing(null);
    reset({ title: "", description: "", assigneeId: undefined, productId: undefined, materialName: "" });
    setIsAddOpen(true);
  };

  const openEdit = (task: any) => {
    setEditing(task);
    reset({
      title: task.title,
      description: task.description || "",
      assigneeId: task.assigneeId || undefined,
      productId: task.productId || undefined,
      materialName: task.materialName || "",
    });
    setIsAddOpen(true);
  };

  const onSubmit = async (data: FormValues) => {
    setIsLoadingSubmit(true);
    try {
      const payload = {
        ...data,
        materialName: null,
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

  const filteredTasks = useMemo(() => {
    if (!Array.isArray(tasks)) return [];
    let result = [...tasks];

    if (timeFilter === "daily") {
      const cutoff = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
      result = result.filter((t: any) => {
        if (!t.date) return false;
        return isAfter(new Date(t.date), cutoff) || new Date(t.date).getTime() === cutoff.getTime();
      });
    } else if (timeFilter === "weekly") {
      const cutoff = startOfWeek(new Date(), { weekStartsOn: 1 });
      result = result.filter((t: any) => {
        if (!t.date) return false;
        return isAfter(new Date(t.date), cutoff) || new Date(t.date).getTime() === cutoff.getTime();
      });
    } else if (timeFilter === "monthly") {
      const cutoff = startOfMonth(new Date());
      result = result.filter((t: any) => {
        if (!t.date) return false;
        return isAfter(new Date(t.date), cutoff) || new Date(t.date).getTime() === cutoff.getTime();
      });
    } else if (timeFilter === "yearly") {
      const cutoff = startOfYear(new Date());
      result = result.filter((t: any) => {
        if (!t.date) return false;
        return isAfter(new Date(t.date), cutoff) || new Date(t.date).getTime() === cutoff.getTime();
      });
    }

    return result;
  }, [tasks, timeFilter]);

  const countByPeriod = (period: TimePeriod) => {
    if (!Array.isArray(tasks)) return 0;
    const now = new Date();
    if (period === "all") return tasks.length;
    if (period === "daily") {
      const cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      return tasks.filter((t: any) => t.date && (isAfter(new Date(t.date), cutoff) || new Date(t.date).getTime() === cutoff.getTime())).length;
    }
    if (period === "weekly") {
      const cutoff = startOfWeek(now, { weekStartsOn: 1 });
      return tasks.filter((t: any) => t.date && (isAfter(new Date(t.date), cutoff) || new Date(t.date).getTime() === cutoff.getTime())).length;
    }
    if (period === "monthly") {
      const cutoff = startOfMonth(now);
      return tasks.filter((t: any) => t.date && (isAfter(new Date(t.date), cutoff) || new Date(t.date).getTime() === cutoff.getTime())).length;
    }
    if (period === "yearly") {
      const cutoff = startOfYear(now);
      return tasks.filter((t: any) => t.date && (isAfter(new Date(t.date), cutoff) || new Date(t.date).getTime() === cutoff.getTime())).length;
    }
    return 0;
  };

  const stats = {
    total: Array.isArray(tasks) ? tasks.length : 0,
    daily: countByPeriod("daily"),
    weekly: countByPeriod("weekly"),
    monthly: countByPeriod("monthly"),
    yearly: countByPeriod("yearly"),
  };

  const activeEmployees = Array.isArray(employees) ? employees.filter((e: any) => e.status === "active") : [];

  return (
    <DashboardLayout>
      <PageHeader
        title="Topshiriqlar"
        description={`${stats.total} ta topshiriq`}
        action={
          <Button onClick={openAdd} className="rounded-xl px-6 h-12 shadow-lg shadow-primary/20 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white border-0">
            <Plus className="mr-2 h-5 w-5" /> Yangi topshiriq
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-4 border-0 shadow-md bg-gradient-to-br from-indigo-50 to-indigo-100">
          <div className="text-2xl font-bold text-indigo-700">{stats.total}</div>
          <div className="text-xs text-indigo-600">Jami</div>
        </Card>
        <Card className="p-4 border-0 shadow-md bg-gradient-to-br from-blue-50 to-blue-100">
          <div className="text-2xl font-bold text-blue-700">{stats.daily}</div>
          <div className="text-xs text-blue-600">Bugun</div>
        </Card>
        <Card className="p-4 border-0 shadow-md bg-gradient-to-br from-amber-50 to-amber-100">
          <div className="text-2xl font-bold text-amber-700">{stats.monthly}</div>
          <div className="text-xs text-amber-600">Bu oy</div>
        </Card>
        <Card className="p-4 border-0 shadow-md bg-gradient-to-br from-green-50 to-green-100">
          <div className="text-2xl font-bold text-green-700">{stats.yearly}</div>
          <div className="text-xs text-green-600">Bu yil</div>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        {/* Time period filter */}
        <div className="flex gap-2">
          {(["all", "daily", "monthly", "yearly"] as const).map(p => (
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

        {/* Calendar filter */}
        <div className="relative">
          <button
            onClick={() => setShowDatePicker(!showDatePicker)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 border border-primary/30 text-sm font-semibold text-primary hover:bg-primary/20 transition-colors"
          >
            <Calendar className="w-4 h-4" />
            <span>Kalendar</span>
          </button>
          {showDatePicker && (
            <div className="absolute top-full left-0 mt-2 bg-card border-2 border-border rounded-2xl shadow-xl z-50 p-4">
              <input
                type="date"
                value={filterDate}
                onChange={e => { setFilterDate(e.target.value); setShowDatePicker(false); }}
                className="rounded-xl border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
          )}
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
            const isCompleted = task.status === "finished" || task.status === "completed";
            const isFinished = task.status === "finished" || task.status === "completed";
            return (
              <Card key={task.id} className={`p-5 border-0 shadow-sm hover:shadow-md transition-all ${isCompleted ? "opacity-70" : ""}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className={`font-bold text-lg ${isCompleted ? "line-through text-muted-foreground" : "text-foreground"}`}>
                        {task.title}
                      </h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold shrink-0 ${isFinished ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}`}>
                        {isFinished ? "✅ Yakunlandi" : "🔄 Boshlandi"}
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
                      <span className="px-2 py-1 rounded-lg bg-muted font-medium">
                        {task.date ? format(new Date(task.date), "dd.MM.yyyy") : "-"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
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

          <div className="grid grid-cols-2 gap-4">
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

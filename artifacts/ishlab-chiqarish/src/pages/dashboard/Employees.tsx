import { useState, useRef } from "react";
import { DashboardLayout, PageHeader } from "@/components/layout/DashboardLayout";
import { useAuthHeaders } from "@/hooks/use-auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import customFetch from "@/lib/custom-fetch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Plus, Users, Phone, Briefcase, Key, Camera, X, FileDown, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { exportToExcel, type ExcelColumn } from "@/lib/export-to-excel";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { useLang } from "@/lib/i18n";

const positions = [
  "Buxgalter",
  "Boshqaruvchi",
  "Ishchi",
  "Qorovul",
  "Haydovchi (dastavkachi)",
  "Oshpaz",
  "Boshqa",
];

const schema = z.object({
  name: z.string().min(1, "Ismi majburiy"),
  phone: z.string().optional(),
  position: z.string().optional(),
  salary: z.coerce.number().optional(),
  hireDate: z.string().optional(),
  notes: z.string().optional(),
  loginPhone: z.string().optional(),
  loginPassword: z.string().optional(),
  photo: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

const formatSum = (n: number) => n.toLocaleString("uz-UZ") + " so'm";

export default function Employees() {
  const queryClient = useQueryClient();
  const authOpts = useAuthHeaders();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [creatingLogin, setCreatingLogin] = useState<number | null>(null);
  const { t } = useLang();
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: employees } = useQuery({
    queryKey: ["/api/employees"],
    queryFn: () =>
      customFetch("/api/employees", { headers: authOpts.headers })
        .then(r => r.json()),
  });

  const toBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const base64 = await toBase64(file);
      setPhotoPreview(base64);
      setValue("photo", base64);
    }
  };

  const clearPhoto = () => {
    setPhotoPreview(null);
    setValue("photo", "");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const openAdd = () => {
    setEditing(null);
    setPhotoPreview(null);
    reset({ name: "", phone: "", position: "", salary: 0, hireDate: "", notes: "", loginPhone: "", loginPassword: "", photo: "" });
    setIsAddOpen(true);
  };

  const openEdit = (e: any) => {
    setEditing(e);
    setPhotoPreview(e.photo || e.faceImage || null);
    setValue("name", e.name);
    setValue("phone", e.phone || "");
    setValue("position", e.position || "");
    setValue("salary", e.salary || 0);
    setValue("hireDate", e.hireDate || "");
    setValue("notes", e.notes || "");
    setValue("loginPhone", e.loginPhone || e.phone || "");
    setValue("loginPassword", e.loginPassword || "");
    setValue("photo", e.photo || e.faceImage || "");
    setIsAddOpen(true);
  };

  const toggleStatus = async (id: number, current: string) => {
    const newStatus = current === "active" ? "inactive" : "active";
    try {
      await customFetch(`/api/employees/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authOpts.headers },
        body: JSON.stringify({ status: newStatus }),
      });
    } catch {}
    queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
  };

  const deleteEmployee = async (emp: any) => {
    if (emp.position === "Owner") { alert(t('owner_cannot_delete')); return; }
    if (!confirm(`${emp.name} ni o'chirmoqchimisiz?`)) return;
    try {
      await customFetch(`/api/employees/${emp.id}`, { method: "DELETE", headers: authOpts.headers });
    } catch {}
    queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
  };

  const createUserAccount = async (employeeId: number, phone: string) => {
    setCreatingLogin(employeeId);
    try {
      await customFetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authOpts.headers },
        body: JSON.stringify({ phone, password: "12345678", role: "employee" }),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
    } catch (e: any) {
      const msg = e.message || "";
      if (msg.includes("allaqachon")) {
        alert(t('login_already_exists'));
      } else {
        alert(msg || "Xatolik yuz berdi");
      }
    } finally {
      setCreatingLogin(null);
    }
  };

  const onSubmit = async (data: FormValues) => {
    setIsLoading(true);
    try {
      try {
        if (editing) {
          await customFetch(`/api/employees/${editing.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json", ...authOpts.headers },
            body: JSON.stringify(data),
          });
        } else {
          await customFetch("/api/employees", {
            method: "POST",
            headers: { "Content-Type": "application/json", ...authOpts.headers },
            body: JSON.stringify(data),
          });
        }
      } catch {}

      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      setIsAddOpen(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <PageHeader
        title={t('employees_title')}
        description={t('employees_description')}
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => {
              const cols: ExcelColumn[] = [
                { header: "Ism", key: "name" },
                { header: "Telefon", key: "phone" },
                { header: "Lavozim", key: "position" },
                { header: "Maosh", key: "salary", accessor: (r: any) => r.salary || 0 },
                { header: "Ishga kirgan", key: "hireDate", accessor: (r: any) => r.hireDate ? format(new Date(r.hireDate), "dd.MM.yyyy") : "" },
                { header: "Holat", key: "status" },
              ];
              if (Array.isArray(employees)) exportToExcel(employees, cols, "hodimlar");
            }} className="rounded-xl px-4 h-12">
              <FileDown className="mr-2 h-5 w-5" /> Excel
            </Button>
            <Button onClick={openAdd} className="rounded-xl px-6 h-12 shadow-lg shadow-primary/20">
              <Plus className="mr-2 h-5 w-5" /> {t('new_employee')}
            </Button>
          </div>
        }
      />

      <Card className="overflow-hidden border-0 shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
              <tr>
                <th className="px-6 py-4 font-semibold">{t('photo_label')}</th>
                <th className="px-6 py-4 font-semibold">{t('name_col')}</th>
                <th className="px-6 py-4 font-semibold">{t('phone_col')}</th>
                <th className="px-6 py-4 font-semibold">{t('position_col')}</th>
                <th className="px-6 py-4 font-semibold text-right">{t('salary_col')}</th>
                <th className="px-6 py-4 font-semibold">{t('hire_date_col')}</th>
                <th className="px-6 py-4 font-semibold">{t('status_col')}</th>
                <th className="px-6 py-4 font-semibold">{t('login_col')}</th>
                <th className="px-6 py-4 font-semibold text-right">{t('action_col')}</th>
              </tr>
            </thead>
            <tbody>
              {!Array.isArray(employees) ? (
                <tr><td colSpan={9} className="text-center py-10">{t('loading')}</td></tr>
              ) : employees.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-16">
                    <Users className="w-12 h-12 mx-auto text-muted-foreground mb-3 opacity-20" />
                    <p className="text-lg font-medium">{t('no_employees')}</p>
                  </td>
                </tr>
              ) : (
                employees.map((e: any) => (
                  <tr key={e.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4">
                      {e.photo ? (
                        <img src={e.photo} alt={e.name} className="w-12 h-16 object-cover rounded-lg border border-border" />
                      ) : (
                        <div className="w-12 h-16 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
                          <Camera className="w-4 h-4" />
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 font-medium">{e.name}</td>
                    <td className="px-6 py-4">
                      <a href={`tel:${e.phone}`} className="flex items-center gap-1.5 text-primary hover:underline">
                        <Phone className="w-3.5 h-3.5" />{e.phone || "-"}
                      </a>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5">
                        <Briefcase className="w-3.5 h-3.5 text-muted-foreground" />
                        {e.position || "-"}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right font-mono font-semibold">{formatSum(e.salary)}</td>
                    <td className="px-6 py-4 text-muted-foreground">{e.hireDate ? format(new Date(e.hireDate), 'dd.MM.yyyy') : "-"}</td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => toggleStatus(e.id, e.status)}
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          e.status === "active"
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {e.status === "active" ? t('active_status') : t('inactive_status')}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      {e.loginPhone ? (
                        <div className="text-xs space-y-0.5">
                          <p className="font-mono text-foreground">{e.loginPhone}</p>
                          <p className="font-mono text-muted-foreground">{e.loginPassword || "••••••••"}</p>
                        </div>
                      ) : e.phone ? (
                        <span className="text-xs text-muted-foreground italic">{t('not_set')}</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">{t('phone_required')}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(e)}>{t('edit')}</Button>
                        {e.position !== "Owner" && (
                          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => deleteEmployee(e)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen} title={editing ? t('edit_employee') : t('new_employee')}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-4">
          <div>
            <label className="text-sm font-semibold block mb-1.5">{t('name_required_label')}</label>
            <Input {...register("name")} error={errors.name?.message} placeholder={t('full_name_placeholder')} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold block mb-1.5">{t('phone_col')}</label>
              <Input {...register("phone")} placeholder="+998901234567" />
            </div>
            <div>
              <label className="text-sm font-semibold block mb-1.5">{t('position_select')}</label>
              <select {...register("position")} className="flex h-12 w-full rounded-xl border-2 border-border bg-background px-4 py-2 text-sm">
                <option value="">{t('select_product')}</option>
                {positions.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold block mb-1.5">{t('photo_3x4')}</label>
            <div className="flex items-center gap-4">
              {photoPreview ? (
                <div className="relative">
                  <img src={photoPreview} alt="Preview" className="w-24 h-32 object-cover rounded-lg border-2 border-border" />
                  <button type="button" onClick={clearPhoto} className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-destructive text-white flex items-center justify-center shadow">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div className="w-24 h-32 rounded-lg border-2 border-dashed border-border bg-muted/30 flex flex-col items-center justify-center gap-1 text-muted-foreground">
                  <Camera className="w-6 h-6" />
                  <span className="text-[10px]">3×4 rasm</span>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="text-sm file:mr-3 file:py-1.5 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary file:text-white hover:file:bg-primary/90 cursor-pointer"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold block mb-1.5">{t('salary_som')}</label>
              <Input type="number" {...register("salary")} placeholder="0" />
            </div>
            <div>
              <label className="text-sm font-semibold block mb-1.5">{t('hire_date_label')}</label>
              <Input type="date" {...register("hireDate")} />
            </div>
          </div>
          <div>
            <label className="text-sm font-semibold block mb-1.5">{t('note')}</label>
            <Input {...register("notes")} placeholder={t('additional_info')} />
          </div>

          {/* Login yaratish bo'limi */}
          <div className="border-t pt-4 mt-2">
            <h4 className="text-sm font-bold mb-3 flex items-center gap-2"><Key className="w-4 h-4" /> {t('mobile_login')}</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-semibold block mb-1.5">{t('login_phone')}</label>
                <Input {...register("loginPhone")} placeholder="+998901234567" />
              </div>
              <div>
                <label className="text-sm font-semibold block mb-1.5">{t('password_label')}</label>
                <Input {...register("loginPassword")} placeholder={t('min_8_chars')} />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">{t('auto_account_note')}</p>
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>{t('cancel')}</Button>
            <Button type="submit" isLoading={isLoading}>{t('save')}</Button>
          </div>
        </form>
      </Dialog>
    </DashboardLayout>
  );
}

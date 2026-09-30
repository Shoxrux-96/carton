import { useState, useEffect } from "react";
import { DashboardLayout, PageHeader } from "@/components/layout/DashboardLayout";
import { useAuthHeaders } from "@/hooks/use-auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import customFetch from "@/lib/custom-fetch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Search, Building2, Phone, MapPin, Plus, Map, Crosshair, Pencil, FileDown, Trash2, FileText } from "lucide-react";
import WaybillModal from "@/components/WaybillModal";
import { format } from "date-fns";
import { exportToExcel, type ExcelColumn } from "@/lib/export-to-excel";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useLang } from "@/lib/i18n";
import { pinIcon } from "@/lib/mapPin";

L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const schema = z.object({
  name: z.string().min(1, "To'liq ism majburiy"),
  phone: z.string().optional(),
  companyName: z.string().optional(),
  address: z.string().optional(),
  source: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

function MapPanel({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { t } = useLang();
  const [position, setPosition] = useState<[number, number] | null>(() => {
    if (value) {
      const [lat, lng] = value.split(",").map(Number);
      if (!isNaN(lat) && !isNaN(lng)) return [lat, lng];
    }
    return null;
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [satellite, setSatellite] = useState(false);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    if (value) {
      const [lat, lng] = value.split(",").map(Number);
      if (!isNaN(lat) && !isNaN(lng)) setPosition([lat, lng]);
    }
  }, [value]);

  function MapClickHandler() {
    useMapEvents({
      click(e) {
        const lat = e.latlng.lat.toFixed(6);
        const lng = e.latlng.lng.toFixed(6);
        setPosition([parseFloat(lat), parseFloat(lng)]);
        onChange(`${lat},${lng}`);
      },
    });
    return null;
  }

  const defaultCenter: [number, number] = [41.3, 69.2];

  const searchLocation = async () => {
    if (!searchQuery) return;
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`
      );
      const data = await res.json();
      if (data[0]) {
        const lat = parseFloat(data[0].lat);
        const lng = parseFloat(data[0].lon);
        setPosition([lat, lng]);
        onChange(`${lat.toFixed(6)},${lng.toFixed(6)}`);
      }
    } catch {}
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setPosition([lat, lng]);
        onChange(`${lat.toFixed(6)},${lng.toFixed(6)}`);
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true },
    );
  };

  return (
    <div className="rounded-xl overflow-hidden border-2 border-border">
      <div className="flex flex-wrap gap-2 p-2 bg-muted/50">
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          onKeyDown={e => e.key === "Enter" && searchLocation()}
          placeholder={t('enter_location_name')}
          className="flex-1 min-w-[150px] h-9 px-3 rounded-lg border border-border bg-background text-sm"
        />
        <Button type="button" variant="secondary" size="sm" onClick={searchLocation}>
          {t('search')}
        </Button>
        <div className="flex rounded-lg border border-border overflow-hidden">
          <button
            type="button"
            onClick={() => setSatellite(false)}
            className={`px-3 py-1.5 text-xs font-medium transition-colors ${!satellite ? "bg-primary text-white" : "bg-background hover:bg-muted"}`}
          >
            {t('street_view')}
          </button>
          <button
            type="button"
            onClick={() => setSatellite(true)}
            className={`px-3 py-1.5 text-xs font-medium transition-colors ${satellite ? "bg-primary text-white" : "bg-background hover:bg-muted"}`}
          >
            {t('satellite_view')}
          </button>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={getCurrentLocation}
          isLoading={locating}
          className="px-3"
          title="Joriy lokatsiyani belgilash"
        >
          <Crosshair className="w-4 h-4" />
        </Button>
      </div>
      <div className="h-[340px]">
        <MapContainer
          key={satellite ? "sat" : "street"}
          center={position || defaultCenter}
          zoom={position ? 15 : 12}
          className="h-full w-full"
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution={satellite ? "" : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'}
            url={satellite
              ? "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            }
          />
          <MapClickHandler />
          {position && <Marker position={position} icon={pinIcon} />}
        </MapContainer>
      </div>
      <div className="p-2 text-xs text-muted-foreground bg-muted/50">
        {t('mark_on_map')}
      </div>
    </div>
  );
}

function LocationPicker({ value, onChange, label, mapOpen, onToggleMap }: {
  value: string;
  onChange: (v: string) => void;
  label?: string;
  mapOpen: boolean;
  onToggleMap: () => void;
}) {
  const { t } = useLang();
  return (
    <div className="space-y-2">
      <label className="text-sm font-semibold block mb-1.5">{label || t('client_address')}</label>
      <div className="flex gap-2">
        <Input
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={t('coordinate_or_address')}
          className="flex-1"
        />
        <Button
          type="button"
          variant={mapOpen ? "default" : "outline"}
          onClick={onToggleMap}
          className="px-3"
          title="Xarita"
        >
          <Map className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

export default function Clients() {
  const queryClient = useQueryClient();
  const authOpts = useAuthHeaders();
  const [search, setSearch] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [coordinates, setCoordinates] = useState("");
  const [clientMapOpen, setClientMapOpen] = useState(false);
  const [companyMapOpen, setCompanyMapOpen] = useState(false);
  const { t } = useLang();

  // Korxonamiz (bir nechta korxona ma'lumotlari)
  const [isCompanyOpen, setIsCompanyOpen] = useState(false);
  const [isSavingCompany, setIsSavingCompany] = useState(false);
  const [editingCompanyId, setEditingCompanyId] = useState<number | null>(null);
  const [waybillCompany, setWaybillCompany] = useState<any | null>(null);
  const [company, setCompany] = useState<{ name: string; owner: string; phone: string; address: string }>({
    name: "",
    owner: "",
    phone: "",
    address: "",
  });

  const { data: clients } = useQuery({
    queryKey: ["/api/clients", "customer", search],
    queryFn: () => customFetch(`/api/clients?type=customer${search ? `&search=${search}` : ""}`, { headers: authOpts.headers }).then(r => r.json()),
  });

  const { data: companyData } = useQuery({
    queryKey: ["/api/company"],
    queryFn: () => customFetch("/api/company", { headers: authOpts.headers }).then(r => r.json()),
  });
  const companies: any[] = Array.isArray(companyData?.companies) ? companyData.companies : [];

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const openAdd = () => {
    setEditingClient(null);
    setCoordinates("");
    reset({ name: "", phone: "", companyName: "", address: "", source: "" });
    setIsAddOpen(true);
  };

  const openEdit = (client: any) => {
    setEditingClient(client);
    setCoordinates(client.address || "");
    reset({ name: client.name, phone: client.phone || "", companyName: client.companyName || "", address: client.address || "", source: client.source || "" });
    setIsAddOpen(true);
  };

  const closeDialog = () => {
    setIsAddOpen(false);
    setEditingClient(null);
    setCoordinates("");
    setClientMapOpen(false);
    reset();
  };

  const openCompany = (c?: any) => {
    if (c && c.id) {
      setEditingCompanyId(c.id);
      setCompany({
        name: c.name || "",
        owner: c.owner || "",
        phone: c.phone || "",
        address: c.address || "",
      });
    } else {
      setEditingCompanyId(null);
      setCompany({ name: "", owner: "", phone: "", address: "" });
    }
    setIsCompanyOpen(true);
  };

  const deleteCompany = async (id: number) => {
    if (!confirm(t('confirm_delete'))) return;
    await customFetch(`/api/company/${id}`, {
      method: "DELETE",
      headers: authOpts.headers,
    });
    queryClient.invalidateQueries({ queryKey: ["/api/company"] });
  };

  const deleteClient = async (c: any) => {
    if (!confirm(t('confirm_delete'))) return;
    await customFetch(`/api/clients/${c.id}`, {
      method: "DELETE",
      headers: authOpts.headers,
    });
    queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
  };

  const saveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingCompany(true);
    try {
      await customFetch(editingCompanyId ? `/api/company/${editingCompanyId}` : "/api/company", {
        method: editingCompanyId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json", ...authOpts.headers },
        body: JSON.stringify(company),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/company"] });
      setIsCompanyOpen(false);
      setCompanyMapOpen(false);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSavingCompany(false);
    }
  };

  const onSubmit = async (data: FormValues) => {
    setIsLoading(true);
    try {
      const address = coordinates || data.address;
      const body = { ...data, address, type: "customer" };
      if (editingClient) {
        await customFetch(`/api/clients/${editingClient.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", ...authOpts.headers },
          body: JSON.stringify(body),
        });
      } else {
        await customFetch("/api/clients", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authOpts.headers },
          body: JSON.stringify(body),
        });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      closeDialog();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <PageHeader
        title={t('clients_title')}
        description={t('clients_description')}
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => openCompany()} className="rounded-xl px-4 h-12">
              <Building2 className="mr-2 h-5 w-5" /> {t('our_company')}
            </Button>
            <Button variant="outline" onClick={() => {
              const cols: ExcelColumn[] = [
                { header: "Ism", key: "name" },
                { header: "Korxona", key: "companyName" },
                { header: "Telefon", key: "phone" },
                { header: "Manzil", key: "address" },
                { header: "Manba", key: "source" },
                { header: "Sana", key: "createdAt", accessor: (r: any) => format(new Date(r.createdAt), "dd.MM.yyyy") },
              ];
              if (Array.isArray(clients)) exportToExcel(clients, cols, "mijozlar");
            }} className="rounded-xl px-4 h-12">
              <FileDown className="mr-2 h-5 w-5" /> Excel
            </Button>
            <Button onClick={openAdd} className="rounded-xl px-6 h-12 shadow-lg shadow-primary/20">
              <Plus className="mr-2 h-5 w-5" /> {t('add_client')}
            </Button>
          </div>
        }
      />

      {/* KORXONAMIZ JADVALI */}
      <Card className="mb-6 overflow-hidden border-0 shadow-lg">
        <div className="px-6 py-4 flex items-center justify-between border-b border-border/50">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-primary" />
            <h3 className="font-bold text-sm">{t('our_company')}</h3>
            <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-semibold">{companies.length}</span>
          </div>
          <Button variant="outline" size="sm" onClick={() => openCompany()} className="rounded-xl h-9 px-3 gap-1">
            <Plus className="w-4 h-4" /> {t('add')}
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
              <tr>
                <th className="px-6 py-4 font-semibold">{t('company_name')}</th>
                <th className="px-6 py-4 font-semibold">{t('company_owner')}</th>
                <th className="px-6 py-4 font-semibold">{t('phone_col')}</th>
                <th className="px-6 py-4 font-semibold">{t('address')}</th>
                <th className="px-6 py-4 text-right font-semibold">{t('action')}</th>
              </tr>
            </thead>
            <tbody>
              {companies.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-10">
                    <Building2 className="w-10 h-10 mx-auto text-muted-foreground mb-3 opacity-20" />
                    <p className="font-medium">{t('company_empty')}</p>
                  </td>
                </tr>
              ) : (
                companies.map((c: any) => (
                  <tr key={c.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 font-medium">{c.name || "-"}</td>
                    <td className="px-6 py-4 text-muted-foreground">{c.owner || "-"}</td>
                    <td className="px-6 py-4">
                      <a href={`tel:${c.phone}`} className="flex items-center gap-1.5 text-primary hover:underline">
                        <Phone className="w-3.5 h-3.5" />
                        {c.phone || "-"}
                      </a>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <MapPin className="w-3.5 h-3.5" />
                        {c.address || "-"}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setWaybillCompany(c)}
                          className="rounded-lg h-8 px-2.5 text-xs gap-1"
                        >
                          <FileText className="w-3.5 h-3.5" /> {t('waybill_new')}
                        </Button>
                        <button onClick={() => openCompany(c)} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                          <Pencil className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                        </button>
                        <button onClick={() => deleteCompany(c.id)} className="p-1.5 rounded-lg hover:bg-red-50 transition-colors">
                          <Trash2 className="w-4 h-4 text-muted-foreground hover:text-red-600" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={t('search') + "..."}
            className="pl-9"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      <Card className="overflow-hidden border-0 shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
              <tr>
                <th className="px-6 py-4 font-semibold">{t('name_col')}</th>
                <th className="px-6 py-4 font-semibold">Korxona</th>
                <th className="px-6 py-4 font-semibold">{t('phone_col')}</th>
                <th className="px-6 py-4 font-semibold">{t('address')}</th>
                <th className="px-6 py-4 font-semibold">{t('source')}</th>
                <th className="px-6 py-4 font-semibold">{t('date')}</th>
                <th className="px-6 py-4 text-right font-semibold">{t('action')}</th>
              </tr>
            </thead>
            <tbody>
              {!Array.isArray(clients) ? (
                <tr><td colSpan={6} className="text-center py-10 text-muted-foreground">{t('loading')}</td></tr>
              ) : clients.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-16">
                    <Building2 className="w-12 h-12 mx-auto text-muted-foreground mb-3 opacity-20" />
                    <p className="text-lg font-medium">{t('no_clients')}</p>
                    <p className="text-muted-foreground mt-1">{t('no_clients_desc')}</p>
                  </td>
                </tr>
              ) : (
                clients.map((c: any) => (
                  <tr key={c.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 font-medium">{c.name}</td>
                    <td className="px-6 py-4 text-muted-foreground">{c.companyName || "-"}</td>
                    <td className="px-6 py-4">
                      <a href={`tel:${c.phone}`} className="flex items-center gap-1.5 text-primary hover:underline">
                        <Phone className="w-3.5 h-3.5" />
                        {c.phone || "-"}
                      </a>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <MapPin className="w-3.5 h-3.5" />
                        {c.address || "-"}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">
                        {c.source || t('unknown_source')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">{format(new Date(c.createdAt), 'dd.MM.yyyy')}</td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => openEdit(c)} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                        <Pencil className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
                      </button>
                      <button onClick={() => deleteClient(c)} className="p-1.5 rounded-lg hover:bg-red-50 transition-colors">
                        <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-red-600" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog
        open={isAddOpen}
        onOpenChange={open => { if (!open) closeDialog(); }}
        title={editingClient ? t('edit_client') : t('new_client')}
        className={clientMapOpen ? "max-w-5xl max-h-[85vh] overflow-y-auto" : undefined}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="pt-4">
          <div className="flex flex-col lg:flex-row items-start gap-5">
            <div className="flex-1 min-w-0 space-y-4">
              <div>
                <label className="text-sm font-semibold block mb-1.5">{t('client_full_name')}</label>
                <Input {...register("name")} placeholder="F.I.Sh" error={errors.name?.message} />
              </div>
              <div>
                <label className="text-sm font-semibold block mb-1.5">{t('client_phone')}</label>
                <Input {...register("phone")} placeholder="+998 XX XXX XX XX" />
              </div>
              <div>
                <label className="text-sm font-semibold block mb-1.5">Korxona nomi</label>
                <Input {...register("companyName")} placeholder="Korxona / firma nomi" />
              </div>
              <div>
                <LocationPicker
                  value={coordinates}
                  onChange={setCoordinates}
                  mapOpen={clientMapOpen}
                  onToggleMap={() => setClientMapOpen(v => !v)}
                />
              </div>
              <div>
                <label className="text-sm font-semibold block mb-1.5">{t('client_source')}</label>
                <select
                  {...register("source")}
                  className="flex h-12 w-full rounded-xl border-2 border-border bg-background px-4 py-2 text-sm focus-visible:outline-none focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/10 transition-all"
                >
                  <option value="">{t('select_product')}</option>
                  <option value="Telefon">Telefon</option>
                  <option value="Instagram">Instagram</option>
                  <option value="Facebook">Facebook</option>
                  <option value="Telegram">Telegram</option>
                  <option value="Web sayt">Web sayt</option>
                  <option value="Reklama">Reklama</option>
                  <option value="Boshqa">Boshqa</option>
                </select>
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={closeDialog}>{t('cancel')}</Button>
                <Button type="submit" isLoading={isLoading}>{editingClient ? t('save') : t('add')}</Button>
              </div>
            </div>
            {clientMapOpen && (
              <div className="w-full lg:w-[440px] shrink-0">
                <MapPanel value={coordinates} onChange={setCoordinates} />
              </div>
            )}
          </div>
        </form>
      </Dialog>
      {/* KORXONAMIZ — korxona ma'lumotlari (qo'shish / tahrirlash) */}
      <Dialog
        open={isCompanyOpen}
        onOpenChange={open => { if (!open) { setIsCompanyOpen(false); setCompanyMapOpen(false); } }}
        title={editingCompanyId ? t('our_company') : t('add_company')}
        className={companyMapOpen ? "max-w-5xl max-h-[85vh] overflow-y-auto" : undefined}
      >
        <form onSubmit={saveCompany} className="pt-4">
          <div className="flex flex-col lg:flex-row items-start gap-5">
            <div className="flex-1 min-w-0 space-y-4">
              <div>
                <label className="text-sm font-semibold block mb-1.5">{t('company_name')}</label>
                <Input
                  value={company.name}
                  onChange={e => setCompany(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Korxona / firma nomi"
                />
              </div>
              <div>
                <label className="text-sm font-semibold block mb-1.5">{t('company_owner')}</label>
                <Input
                  value={company.owner}
                  onChange={e => setCompany(prev => ({ ...prev, owner: e.target.value }))}
                  placeholder="F.I.Sh."
                />
              </div>
              <div>
                <label className="text-sm font-semibold block mb-1.5">{t('client_phone')}</label>
                <Input
                  value={company.phone}
                  onChange={e => setCompany(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="+998 XX XXX XX XX"
                />
              </div>
              <div>
                <LocationPicker
                  value={company.address}
                  onChange={v => setCompany(prev => ({ ...prev, address: v }))}
                  mapOpen={companyMapOpen}
                  onToggleMap={() => setCompanyMapOpen(v => !v)}
                />
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => { setIsCompanyOpen(false); setCompanyMapOpen(false); }}>{t('cancel')}</Button>
                <Button type="submit" isLoading={isSavingCompany}>{editingCompanyId ? t('save') : t('add')}</Button>
              </div>
            </div>
            {companyMapOpen && (
              <div className="w-full lg:w-[440px] shrink-0">
                <MapPanel value={company.address} onChange={v => setCompany(prev => ({ ...prev, address: v }))} />
              </div>
            )}
          </div>
        </form>
      </Dialog>

      {/* Korxona yuklari uchun YUK XATI */}
      <WaybillModal
        open={!!waybillCompany}
        onClose={() => setWaybillCompany(null)}
        onSave={() => queryClient.invalidateQueries({ queryKey: ["/api/waybills"] })}
        newDoc={waybillCompany ? { senderCompany: waybillCompany.name || "", senderPhone: waybillCompany.phone || "" } : null}
        headers={authOpts.headers}
      />
    </DashboardLayout>
  );
}

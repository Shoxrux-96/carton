import { useState, useEffect } from "react";
import { DashboardLayout, PageHeader } from "@/components/layout/DashboardLayout";
import { useAuthHeaders } from "@/hooks/use-auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import customFetch from "@/lib/custom-fetch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Search, Building2, Phone, MapPin, Plus, Map, Crosshair, Pencil, FileDown } from "lucide-react";
import { format } from "date-fns";
import { exportToExcel, type ExcelColumn } from "@/lib/export-to-excel";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useLang } from "@/lib/i18n";

L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const schema = z.object({
  name: z.string().min(1, "To'liq ism majburiy"),
  phone: z.string().optional(),
  address: z.string().optional(),
  source: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

function LocationPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { t } = useLang();
  const [position, setPosition] = useState<[number, number] | null>(() => {
    if (value) {
      const [lat, lng] = value.split(",").map(Number);
      if (!isNaN(lat) && !isNaN(lng)) return [lat, lng];
    }
    return null;
  });
  const [mapOpen, setMapOpen] = useState(false);
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
    <div className="space-y-2">
      <label className="text-sm font-semibold block mb-1.5">{t('client_address')}</label>
      <div className="flex gap-2">
        <Input
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={t('coordinate_or_address')}
          className="flex-1"
        />
        <Button type="button" variant="outline" onClick={() => setMapOpen(!mapOpen)} className="px-3">
          <Map className="w-4 h-4" />
        </Button>
      </div>

      {mapOpen && (
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
          <div className="h-[300px]">
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
              {position && <Marker position={position} />}
            </MapContainer>
          </div>
          <div className="p-2 text-xs text-muted-foreground bg-muted/50">
            {t('mark_on_map')}
          </div>
        </div>
      )}
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
  const { t } = useLang();

  const { data: clients } = useQuery({
    queryKey: ["/api/clients", "customer", search],
    queryFn: () => customFetch(`/api/clients?type=customer${search ? `&search=${search}` : ""}`, { headers: authOpts.headers }).then(r => r.json()),
  });

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const openAdd = () => {
    setEditingClient(null);
    setCoordinates("");
    reset({ name: "", phone: "", address: "", source: "" });
    setIsAddOpen(true);
  };

  const openEdit = (client: any) => {
    setEditingClient(client);
    setCoordinates(client.address || "");
    reset({ name: client.name, phone: client.phone || "", address: client.address || "", source: client.source || "" });
    setIsAddOpen(true);
  };

  const closeDialog = () => {
    setIsAddOpen(false);
    setEditingClient(null);
    setCoordinates("");
    reset();
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
            <Button variant="outline" onClick={() => {
              const cols: ExcelColumn[] = [
                { header: "Ism", key: "name" },
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
                  <td colSpan={6} className="text-center py-16">
                    <Building2 className="w-12 h-12 mx-auto text-muted-foreground mb-3 opacity-20" />
                    <p className="text-lg font-medium">{t('no_clients')}</p>
                    <p className="text-muted-foreground mt-1">{t('no_clients_desc')}</p>
                  </td>
                </tr>
              ) : (
                clients.map((c: any) => (
                  <tr key={c.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 font-medium">{c.name}</td>
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
                        <Pencil className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog open={isAddOpen} onOpenChange={open => { if (!open) closeDialog(); }} title={editingClient ? t('edit_client') : t('new_client')}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-4">
          <div>
            <label className="text-sm font-semibold block mb-1.5">{t('client_full_name')}</label>
            <Input {...register("name")} placeholder="F.I.Sh" error={errors.name?.message} />
          </div>
          <div>
            <label className="text-sm font-semibold block mb-1.5">{t('client_phone')}</label>
            <Input {...register("phone")} placeholder="+998 XX XXX XX XX" />
          </div>
          <div>
            <LocationPicker value={coordinates} onChange={setCoordinates} />
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
              <option value="Tanish">Tanish</option>
              <option value="Reklama">Reklama</option>
              <option value="Boshqa">Boshqa</option>
            </select>
          </div>
          <div className="pt-4 flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={closeDialog}>{t('cancel')}</Button>
            <Button type="submit" isLoading={isLoading}>{editingClient ? t('save') : t('add')}</Button>
          </div>
        </form>
      </Dialog>
    </DashboardLayout>
  );
}

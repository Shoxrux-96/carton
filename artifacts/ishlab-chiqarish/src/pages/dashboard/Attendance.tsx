import { useState, useMemo, useEffect } from "react";
import { DashboardLayout, PageHeader } from "@/components/layout/DashboardLayout";
import { useAuthHeaders } from "@/hooks/use-auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import customFetch from "@/lib/custom-fetch";
import { exportToExcel, type ExcelColumn } from "@/lib/export-to-excel";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ClipboardCheck, CalendarDays, Settings, Calculator, Sun, Moon, AlertCircle, FileDown, MapPin, Clock, Smartphone, CheckCircle2, XCircle, Crosshair, Map as MapIcon } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, parseISO, startOfYear, endOfYear } from "date-fns";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useLang } from "@/lib/i18n";

L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

function OfficeLocationPicker({ lat, lng, onLatChange, onLngChange }: { lat: number; lng: number; onLatChange: (v: number) => void; onLngChange: (v: number) => void }) {
  const { t } = useLang();
  const [draftLat, setDraftLat] = useState(lat);
  const [draftLng, setDraftLng] = useState(lng);
  const [mapOpen, setMapOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [satellite, setSatellite] = useState(false);
  const [locating, setLocating] = useState(false);
  const saved = lat === draftLat && lng === draftLng;

  useEffect(() => { setDraftLat(lat); setDraftLng(lng); }, [lat, lng]);

  const setDraft = (newLat: number, newLng: number) => {
    setDraftLat(newLat);
    setDraftLng(newLng);
  };

  const save = () => {
    onLatChange(draftLat);
    onLngChange(draftLng);
  };

  function MapClickHandler() {
    useMapEvents({
      click(e) {
        setDraft(parseFloat(e.latlng.lat.toFixed(6)), parseFloat(e.latlng.lng.toFixed(6)));
      },
    });
    return null;
  }

  const defaultCenter: [number, number] = [41.3, 69.2];

  const searchLocation = async () => {
    if (!searchQuery) return;
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`);
      const data = await res.json();
      if (data[0]) {
        setDraft(parseFloat(data[0].lat), parseFloat(data[0].lon));
      }
    } catch {}
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      pos => { setDraft(pos.coords.latitude, pos.coords.longitude); setLocating(false); },
      () => setLocating(false),
      { enableHighAccuracy: true },
    );
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2 items-center">
        <div className="grid grid-cols-2 gap-2 flex-1">
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1">{t('latitude_label')}</label>
            <Input type="number" step="0.000001" value={draftLat} onChange={e => setDraft(parseFloat(e.target.value) || 0, draftLng)} />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1">{t('longitude_label')}</label>
            <Input type="number" step="0.000001" value={draftLng} onChange={e => setDraft(draftLat, parseFloat(e.target.value) || 0)} />
          </div>
        </div>
        <Button type="button" variant="outline" onClick={() => setMapOpen(!mapOpen)} className="px-3 mt-5" title="Xaritada ko'rsatish">
          <MapIcon className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex items-center gap-2">
        {!saved && (
          <span className="text-xs text-amber-600 font-medium">{t('changes_not_saved')}</span>
        )}
        <Button type="button" size="sm" onClick={save} disabled={saved} className="ml-auto">
          {t('save')}
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
            <Button type="button" variant="secondary" size="sm" onClick={searchLocation}>{t('search')}</Button>
            <div className="flex rounded-lg border border-border overflow-hidden">
              <button type="button" onClick={() => setSatellite(false)} className={`px-3 py-1.5 text-xs font-medium transition-colors ${!satellite ? "bg-primary text-white" : "bg-background hover:bg-muted"}`}>{t('street_view')}</button>
              <button type="button" onClick={() => setSatellite(true)} className={`px-3 py-1.5 text-xs font-medium transition-colors ${satellite ? "bg-primary text-white" : "bg-background hover:bg-muted"}`}>{t('satellite_view')}</button>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={getCurrentLocation} isLoading={locating} className="px-3" title="Joriy lokatsiyani belgilash">
              <Crosshair className="w-4 h-4" />
            </Button>
          </div>
          <div className="h-[350px]">
            <MapContainer key={satellite ? "sat" : "street"} center={[draftLat, draftLng]} zoom={16} className="h-full w-full" scrollWheelZoom={true}>
              <TileLayer
                attribution={satellite ? "" : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'}
                url={satellite ? "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"}
              />
              <MapClickHandler />
              <Marker position={[draftLat, draftLng]} />
            </MapContainer>
          </div>
          <div className="p-2 flex gap-2 items-center bg-muted/50">
            <span className="text-xs text-muted-foreground flex-1">{t('mark_office_on_map')}</span>
            <Button type="button" size="sm" onClick={save} disabled={saved}>
              {t('save')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function formatSum(n: number) {
  return n.toLocaleString("uz-UZ") + " so'm";
}

function getLocal(key: string, fallback: any = null) {
  try { const d = localStorage.getItem(key); return d ? JSON.parse(d) : fallback; } catch { return fallback; }
}
function setLocal(key: string, data: any) {
  try { localStorage.setItem(key, JSON.stringify(data)); } catch {}
}

export default function Attendance() {
  const queryClient = useQueryClient();
  const authOpts = useAuthHeaders();
  const today = new Date().toISOString().split("T")[0];
  const { t } = useLang();

  const statusConfig: Record<string, { label: string; color: string }> = {
    present: { label: t('arrived'), color: "bg-green-100 text-green-700 border-green-200" },
    absent: { label: t('did_not_come_label'), color: "bg-red-100 text-red-700 border-red-200" },
    late: { label: t('was_late_label'), color: "bg-amber-100 text-amber-700 border-amber-200" },
  };

  const tabs = [
    { key: "daily", label: t('tab_attendance'), icon: ClipboardCheck },
    { key: "report", label: t('tab_report'), icon: CalendarDays },
    { key: "settings", label: t('tab_work_days'), icon: Settings },
    { key: "salary", label: t('tab_salary'), icon: Calculator },
  ];
  const [selectedDate, setSelectedDate] = useState(today);
  const [tab, setTab] = useState("daily");
  const [reportMonth, setReportMonth] = useState(today.slice(0, 7));
  const [reportYear, setReportYear] = useState(today.slice(0, 4));
  const [reportView, setReportView] = useState<"month" | "year">("month");
  const [offDate, setOffDate] = useState("");
  const [offReason, setOffReason] = useState("");
  const [salaryPeriod, setSalaryPeriod] = useState(today.slice(0, 7));

  // Office location & working hours settings
  const [officeSettings, setOfficeSettings] = useState(() => getLocal("carton_office_settings", {
    lat: 41.311081,
    lng: 69.240562,
    radius: 100,
    startTime: "09:00",
    endTime: "18:00",
    lateMinutes: 30,
  }));
  useEffect(() => { setLocal("carton_office_settings", officeSettings); }, [officeSettings]);

  const updateOfficeSetting = (key: string, value: any) => {
    setOfficeSettings((prev: any) => {
      const updated = { ...prev, [key]: value };
      // Sync to API
      customFetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authOpts.headers },
        body: JSON.stringify(updated),
      }).catch(() => {});
      return updated;
    });
  };

  const calcDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const isWithinOffice = (lat: number, lng: number) => {
    return calcDistance(lat, lng, officeSettings.lat, officeSettings.lng) <= officeSettings.radius;
  };

  const isWithinWorkingHours = () => {
    const now = new Date();
    const hh = now.getHours().toString().padStart(2, "0");
    const mm = now.getMinutes().toString().padStart(2, "0");
    const current = `${hh}:${mm}`;
    return current >= officeSettings.startTime && current <= officeSettings.endTime;
  };

  const getAutoStatus = () => {
    const now = new Date();
    const hh = now.getHours().toString().padStart(2, "0");
    const mm = now.getMinutes().toString().padStart(2, "0");
    const current = `${hh}:${mm}`;
    if (current < officeSettings.startTime) return "absent";
    const [startH, startM] = officeSettings.startTime.split(":").map(Number);
    const lateThreshold = new Date(now.getFullYear(), now.getMonth(), now.getDate(), startH, startM + officeSettings.lateMinutes);
    return now > lateThreshold ? "late" : "present";
  };

  const [checkInStatus, setCheckInStatus] = useState<{ ok: boolean; message: string } | null>(null);
  const [checkingIn, setCheckingIn] = useState(false);

  const handleCheckIn = async (employeeId: number) => {
    setCheckingIn(true);
    setCheckInStatus(null);
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000 });
      });
      const { latitude, longitude } = pos.coords;
      if (!isWithinOffice(latitude, longitude)) {
        setCheckInStatus({ ok: false, message: `Siz ishxonada emassiz! Masofa: ${Math.round(calcDistance(latitude, longitude, officeSettings.lat, officeSettings.lng))} m` });
        setCheckingIn(false);
        return;
      }
      if (!isWithinWorkingHours()) {
        setCheckInStatus({ ok: false, message: `Ish vaqti emas! ${officeSettings.startTime} - ${officeSettings.endTime}` });
        setCheckingIn(false);
        return;
      }
      const status = getAutoStatus();
      await setStatus(employeeId, status);
      setCheckInStatus({ ok: true, message: `✅ ${status === "present" ? "Keldi" : "Kechikdi"} deb belgilandi` });
    } catch (err: any) {
      setCheckInStatus({ ok: false, message: err.code === 1 ? "Geolokatsiya ruxsati yo'q" : "Joylashuv aniqlanmadi" });
    }
    setCheckingIn(false);
  };

  const { data: employees } = useQuery({
    queryKey: ["/api/employees"],
    queryFn: () => customFetch("/api/employees", { headers: authOpts.headers }).then(r => r.json()),
  });

  const activeEmployees = useMemo(
    () => (Array.isArray(employees) ? employees.filter((e: any) => e.status === "active") : []),
    [employees]
  );

  // Off days (dam olish kunlari)
  const [offDays, setOffDays] = useState<{ date: string; reason: string }[]>(() => getLocal("carton_off_days", []));

  useEffect(() => { setLocal("carton_off_days", offDays); }, [offDays]);

  const isDayOff = (date: string) => offDays.some(d => d.date === date);

  const addOffDay = () => {
    if (!offDate) return;
    if (isDayOff(offDate)) return;
    setOffDays(prev => [...prev, { date: offDate, reason: offReason || "Dam olish" }].sort((a, b) => a.date.localeCompare(b.date)));
    setOffDate("");
    setOffReason("");
  };

  const removeOffDay = (date: string) => {
    setOffDays(prev => prev.filter(d => d.date !== date));
  };

  // Attendance data (local + API)
  const { data: apiAttendance } = useQuery({
    queryKey: ["/api/attendance", selectedDate],
    queryFn: () => customFetch(`/api/attendance?date=${selectedDate}`, { headers: authOpts.headers }).then(r => r.json()),
    enabled: tab === "daily",
  });

  const [localAttendance, setLocalAttendance] = useState<Record<string, any[]>>(() => getLocal("carton_attendance", {}));

  useEffect(() => { setLocal("carton_attendance", localAttendance); }, [localAttendance]);

  const dailyAttendance = useMemo(() => {
    if (isDayOff(selectedDate)) return [];
    const api = Array.isArray(apiAttendance) ? apiAttendance : [];
    const local = localAttendance[selectedDate] || [];
    const merged = [...api];
    for (const l of local) {
      const idx = merged.findIndex((m: any) => m.employeeId === l.employeeId);
      if (idx >= 0) merged[idx] = l;
      else merged.push(l);
    }
    return merged;
  }, [apiAttendance, localAttendance, selectedDate, isDayOff]);

  const attendanceMap = useMemo(
    () => new Map(dailyAttendance.map((a: any) => [a.employeeId, a])),
    [dailyAttendance]
  );

  const setStatus = async (employeeId: number, status: string) => {
    const entry = { employeeId, date: selectedDate, status };
    // Try API
    try {
      await customFetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authOpts.headers },
        body: JSON.stringify(entry),
      });
    } catch {}
    // Local save
    setLocalAttendance(prev => {
      const day = [...(prev[selectedDate] || [])];
      const idx = day.findIndex((d: any) => d.employeeId === employeeId);
      if (idx >= 0) day[idx] = entry;
      else day.push(entry);
      return { ...prev, [selectedDate]: day };
    });
    queryClient.invalidateQueries({ queryKey: ["/api/attendance", selectedDate] });
  };

  const getMonthAttendance = (yearMonth: string) => {
    const [year, month] = yearMonth.split("-").map(Number);
    const days = eachDayOfInterval({ start: new Date(year, month - 1, 1), end: new Date(year, month, 0) });
    const records: Record<number, { date: string; status: string }[]> = {};
    // Load from localAttendance
    for (const [dateStr, entries] of Object.entries(localAttendance)) {
      if (!dateStr.startsWith(yearMonth)) continue;
      for (const e of entries) {
        if (!records[e.employeeId]) records[e.employeeId] = [];
        records[e.employeeId].push({ date: dateStr, status: e.status });
      }
    }
    // Try API monthly report
    return { days, records };
  };

  // Salary calculation
  const calcSalary = (yearMonth: string) => {
    const [year, month] = yearMonth.split("-").map(Number);
    const monthStart = startOfMonth(new Date(year, month - 1));
    const monthEnd = endOfMonth(monthStart);
    const allDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
    const workingDays = allDays.filter(d => {
      const dateStr = format(d, "yyyy-MM-dd");
      return !isDayOff(dateStr);
    });
    const totalWorkingDays = workingDays.length;

    const { records } = getMonthAttendance(yearMonth);
    const result = activeEmployees.map((emp: any) => {
      const empRecords = records[emp.id] || [];
      const present = empRecords.filter(r => r.status === "present").length;
      const late = empRecords.filter(r => r.status === "late").length;
      const absent = empRecords.filter(r => r.status === "absent").length;
      const attended = present + late;
      const monthlySalary = emp.salary || 0;
      const dailyRate = totalWorkingDays > 0 ? monthlySalary / totalWorkingDays : 0;
      const calculatedSalary = Math.round(dailyRate * attended);
      return {
        employeeId: emp.id,
        employeeName: emp.name,
        totalWorkingDays,
        present,
        late,
        absent,
        attended,
        monthlySalary,
        dailyRate: Math.round(dailyRate),
        calculatedSalary,
        deduction: monthlySalary - calculatedSalary,
      };
    });

    return { totalWorkingDays, result };
  };

  const statuses = ["present", "absent", "late"];

  const presentCount = dailyAttendance.filter((a: any) => a.status === "present").length;
  const absentCount = dailyAttendance.filter((a: any) => a.status === "absent").length;
  const lateCount = dailyAttendance.filter((a: any) => a.status === "late").length;

  // Yearly report
  const yearAttendance = (year: string) => {
    const yearStart = startOfYear(new Date(Number(year), 0));
    const yearEnd = endOfYear(yearStart);
    const months = [];
    for (let m = 0; m < 12; m++) {
      const ym = `${year}-${String(m + 1).padStart(2, "0")}`;
      const { totalWorkingDays, result } = calcSalary(ym);
      months.push({ month: m + 1, label: format(new Date(Number(year), m), "MMMM"), totalWorkingDays, result });
    }
    // Aggregate per employee
    const empMap: Record<number, any> = {};
    for (const m of months) {
      for (const r of m.result) {
        if (!empMap[r.employeeId]) {
          empMap[r.employeeId] = { employeeName: r.employeeName, totalWorkingDays: 0, present: 0, late: 0, absent: 0, attended: 0, calculatedSalary: 0, monthlySalary: r.monthlySalary };
        }
        empMap[r.employeeId].totalWorkingDays += r.totalWorkingDays;
        empMap[r.employeeId].present += r.present;
        empMap[r.employeeId].late += r.late;
        empMap[r.employeeId].absent += r.absent;
        empMap[r.employeeId].attended += r.attended;
        empMap[r.employeeId].calculatedSalary += r.calculatedSalary;
      }
    }
    return Object.values(empMap);
  };

  return (
    <DashboardLayout>
      <PageHeader
        title={t('attendance_title')}
        description={t('attendance_description')}
        action={
          <Button variant="outline" onClick={() => {
            if (tab === "daily") {
              const cols: ExcelColumn[] = [
                { header: "Hodim", key: "name" },
                { header: "Lavozim", key: "position" },
                { header: "Holat", key: "status", accessor: (r: any) => {
                  const record = attendanceMap.get(r.id);
                  const s = record?.status || "not_set";
                  return s === "not_set" ? t('not_set') : (statusConfig[s]?.label || s);
                }},
              ];
              exportToExcel(activeEmployees, cols, "davomat-kunlik");
            } else if (tab === "report") {
              if (reportView === "month") {
                const { result } = calcSalary(reportMonth);
                const cols: ExcelColumn[] = [
                  { header: "Hodim", key: "employeeName" },
                  { header: "Ish kuni", key: "totalWorkingDays" },
                  { header: "Kelgan", key: "present" },
                  { header: "Kechikkan", key: "late" },
                  { header: "Kelmagan", key: "absent" },
                  { header: "Qatnashish", key: "participation", accessor: (r: any) => {
                    const total = r.present + r.late + r.absent;
                    return total > 0 ? Math.round((r.present / total) * 100) + "%" : "0%";
                  }},
                  { header: "Maosh", key: "calculatedSalary" },
                ];
                exportToExcel(result, cols, "davomat-oylik");
              } else {
                const yearData = yearAttendance(reportYear);
                const cols: ExcelColumn[] = [
                  { header: "Hodim", key: "employeeName" },
                  { header: "Jami kun", key: "totalDays" },
                  { header: "Kelgan", key: "present" },
                  { header: "Kechikkan", key: "late" },
                  { header: "Kelmagan", key: "absent" },
                  { header: "Qatnashish", key: "participation", accessor: (r: any) => r.participation || "0%" },
                  { header: "Yillik maosh", key: "yearSalary" },
                  { header: "Oylik o'rtacha", key: "monthlyAvg" },
                ];
                exportToExcel(yearData, cols, "davomat-yillik");
              }
            } else if (tab === "salary") {
              const { result } = calcSalary(salaryPeriod);
              const cols: ExcelColumn[] = [
                { header: "Hodim", key: "employeeName" },
                { header: "Oylik maosh", key: "monthlySalary" },
                { header: "Kunlik stavka", key: "dailyRate" },
                { header: "Kelgan", key: "present" },
                { header: "Kechikkan", key: "late" },
                { header: "Kelmagan", key: "absent" },
                { header: "Hisoblangan", key: "calculatedSalary" },
                { header: "Ushlanma", key: "deduction" },
              ];
              exportToExcel(result, cols, "davomat-maosh");
            }
          }} className="rounded-xl px-4 h-12">
            <FileDown className="mr-2 h-5 w-5" /> Excel
          </Button>
        }
      />

      {/* Tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {tabs.map(tab_item => (
          <button
            key={tab_item.key}
            onClick={() => setTab(tab_item.key)}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold transition-all ${
              tab === tab_item.key
                ? "bg-primary text-white shadow-lg shadow-primary/30"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            <tab_item.icon className="w-4 h-4" />
            {tab_item.label}
          </button>
        ))}
      </div>

      {/* ===== TAB: Daily attendance ===== */}
      {tab === "daily" && (
        <>
          <div className="flex items-center gap-3 mb-6">
            <CalendarDays className="w-5 h-5 text-muted-foreground" />
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="h-12 px-4 rounded-xl border-2 border-border bg-background text-sm"
            />
            <Button variant="outline" size="sm" onClick={() => setSelectedDate(today)}>{t('today_btn')}</Button>
          </div>

          {isDayOff(selectedDate) ? (
            <Card className="p-10 text-center border-0 shadow-lg">
              <Sun className="w-16 h-16 mx-auto text-amber-400 mb-4" />
              <h3 className="text-xl font-bold">{t('day_off')}</h3>
              <p className="text-muted-foreground mt-2">
                {offDays.find(d => d.date === selectedDate)?.reason || t('day_off_desc')}
              </p>
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-4 mb-8">
                <Card className="p-5 text-center border-0 shadow-md bg-gradient-to-br from-green-50 to-green-100">
                  <div className="text-3xl font-bold text-green-700">{presentCount}</div>
                  <div className="text-sm text-green-600 font-medium">{t('arrived')}</div>
                </Card>
                <Card className="p-5 text-center border-0 shadow-md bg-gradient-to-br from-amber-50 to-amber-100">
                  <div className="text-3xl font-bold text-amber-700">{lateCount}</div>
                  <div className="text-sm text-amber-600 font-medium">{t('was_late_label')}</div>
                </Card>
                <Card className="p-5 text-center border-0 shadow-md bg-gradient-to-br from-red-50 to-red-100">
                  <div className="text-3xl font-bold text-red-700">{absentCount}</div>
                  <div className="text-sm text-red-600 font-medium">{t('did_not_come_label')}</div>
                </Card>
              </div>

              {checkInStatus && (
                <div className={`flex items-center gap-3 px-5 py-3 rounded-xl mb-4 text-sm font-medium border ${
                  checkInStatus.ok
                    ? "bg-green-50 border-green-200 text-green-800"
                    : "bg-red-50 border-red-200 text-red-800"
                }`}>
                  {checkInStatus.ok ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <XCircle className="w-5 h-5 shrink-0" />}
                  {checkInStatus.message}
                  <button onClick={() => setCheckInStatus(null)} className="ml-auto text-xs opacity-60 hover:opacity-100">{t('close_btn')}</button>
                </div>
              )}

              <Card className="overflow-hidden border-0 shadow-lg">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
                      <tr>
                        <th className="px-6 py-4 font-semibold">{t('employees')}</th>
                        <th className="px-6 py-4 font-semibold">{t('position_col')}</th>
                        <th className="px-6 py-4 font-semibold">{t('status_col')}</th>
                        <th className="px-6 py-4 font-semibold">{t('check_in_label')}</th>
                        <th className="px-6 py-4 font-semibold">{t('action')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeEmployees.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="text-center py-16">
                            <ClipboardCheck className="w-12 h-12 mx-auto text-muted-foreground mb-3 opacity-20" />
                            <p className="text-lg font-medium">{t('no_active_employees')}</p>
                          </td>
                        </tr>
                      ) : (
                        activeEmployees.map((emp: any) => {
                          const record = attendanceMap.get(emp.id);
                          const currentStatus = record?.status || "not_set";
                          return (
                            <tr key={emp.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                              <td className="px-6 py-4 font-medium">{emp.name}</td>
                              <td className="px-6 py-4 text-muted-foreground">{emp.position || "-"}</td>
                              <td className="px-6 py-4">
                                {currentStatus !== "not_set" ? (
                                  <span className={`px-3 py-1 rounded-full text-xs font-medium border ${statusConfig[currentStatus]?.color}`}>
                                    {statusConfig[currentStatus]?.label}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground text-xs">{t('not_set')}</span>
                                )}
                              </td>
                              <td className="px-6 py-4">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={checkingIn}
                                  onClick={() => handleCheckIn(emp.id)}
                                  className={`rounded-lg text-xs gap-1.5 ${
                                    checkInStatus?.ok ? "border-green-300 text-green-700 bg-green-50" : ""
                                  }`}
                                >
                                  {checkingIn ? (
                                    <span className="animate-spin">⌛</span>
                                  ) : (
                                    <Smartphone className="w-3.5 h-3.5" />
                                  )}
                                  {t('check_in')}
                                </Button>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex gap-2">
                                  {statuses.map(s => (
                                    <button
                                      key={s}
                                      onClick={() => setStatus(emp.id, s)}
                                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                                        currentStatus === s
                                          ? statusConfig[s].color + " border-2"
                                          : "border-border hover:border-foreground/30 text-muted-foreground"
                                      }`}
                                    >
                                      {statusConfig[s].label}
                                    </button>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            </>
          )}
        </>
      )}

      {/* ===== TAB: Report ===== */}
      {tab === "report" && (
        <div className="space-y-6">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex rounded-xl border border-border overflow-hidden">
              {(["month", "year"] as const).map(v => (
                <button
                  key={v}
                  onClick={() => setReportView(v)}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    reportView === v ? "bg-primary text-white" : "bg-background hover:bg-muted"
                  }`}
                >
                  {v === "month" ? t('monthly_report') : t('yearly_report')}
                </button>
              ))}
            </div>
            {reportView === "month" ? (
              <input
                type="month"
                value={reportMonth}
                onChange={e => setReportMonth(e.target.value)}
                className="h-10 px-4 rounded-xl border-2 border-border bg-background text-sm"
              />
            ) : (
              <input
                type="number"
                value={reportYear}
                onChange={e => setReportYear(e.target.value)}
                className="h-10 px-4 rounded-xl border-2 border-border bg-background text-sm"
              />
            )}
          </div>

          {reportView === "month" ? (
            (() => {
              const { totalWorkingDays, result } = calcSalary(reportMonth);
              const totalAttended = result.reduce((s, r) => s + r.attended, 0);
              return (
                <Card className="overflow-hidden border-0 shadow-lg">
                  <div className="p-6 border-b border-border/50 flex items-center justify-between">
                    <h3 className="font-bold text-lg">{format(parseISO(reportMonth + "-01"), "MMMM yyyy")} {t('report_title')}</h3>
                    <span className="text-sm text-muted-foreground">{t('work_days')}: {totalWorkingDays}</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
                        <tr>
                          <th className="px-4 py-3 font-semibold">{t('employees')}</th>
                          <th className="px-4 py-3 font-semibold text-center">{t('work_days_col')}</th>
                          <th className="px-4 py-3 font-semibold text-center text-green-600">{t('attended_col')}</th>
                          <th className="px-4 py-3 font-semibold text-center text-amber-600">{t('late_col')}</th>
                          <th className="px-4 py-3 font-semibold text-center text-red-600">{t('absent_col')}</th>
                          <th className="px-4 py-3 font-semibold text-center">{t('participation')}</th>
                          <th className="px-4 py-3 font-semibold text-right">{t('salary_label')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.map(r => (
                          <tr key={r.employeeId} className="border-b border-border/50">
                            <td className="px-4 py-3 font-medium">{r.employeeName}</td>
                            <td className="px-4 py-3 text-center font-mono">{r.totalWorkingDays}</td>
                            <td className="px-4 py-3 text-center font-mono text-green-600 font-semibold">{r.present}</td>
                            <td className="px-4 py-3 text-center font-mono text-amber-600 font-semibold">{r.late}</td>
                            <td className="px-4 py-3 text-center font-mono text-red-600 font-semibold">{r.absent}</td>
                            <td className="px-4 py-3 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                r.attended === r.totalWorkingDays ? "bg-green-100 text-green-700" :
                                r.attended >= r.totalWorkingDays * 0.8 ? "bg-blue-100 text-blue-700" :
                                "bg-red-100 text-red-700"
                              }`}>
                                {totalAttended > 0 ? Math.round((r.attended / r.totalWorkingDays) * 100) : 0}%
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right font-mono font-semibold">{formatSum(r.calculatedSalary)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              );
            })()
          ) : (
            <div className="space-y-4">
              {(() => {
                const yearData = yearAttendance(reportYear);
                return (
                  <Card className="overflow-hidden border-0 shadow-lg">
                    <div className="p-6 border-b border-border/50">
                      <h3 className="font-bold text-lg">{reportYear} {t('year_report_title')}</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
                          <tr>
                            <th className="px-4 py-3 font-semibold">{t('employees')}</th>
                            <th className="px-4 py-3 font-semibold text-center">{t('total_days')}</th>
                            <th className="px-4 py-3 font-semibold text-center text-green-600">{t('attended_col')}</th>
                            <th className="px-4 py-3 font-semibold text-center text-amber-600">{t('late_col')}</th>
                            <th className="px-4 py-3 font-semibold text-center text-red-600">{t('absent_col')}</th>
                            <th className="px-4 py-3 font-semibold text-center">{t('participation')}</th>
                            <th className="px-4 py-3 font-semibold text-right">{t('yearly_salary')}</th>
                            <th className="px-4 py-3 font-semibold text-right">{t('monthly_average')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {yearData.map((r: any, idx: number) => (
                            <tr key={r.employeeId || idx} className="border-b border-border/50">
                              <td className="px-4 py-3 font-medium">{r.employeeName}</td>
                              <td className="px-4 py-3 text-center font-mono">{r.totalWorkingDays}</td>
                              <td className="px-4 py-3 text-center font-mono text-green-600 font-semibold">{r.present}</td>
                              <td className="px-4 py-3 text-center font-mono text-amber-600 font-semibold">{r.late}</td>
                              <td className="px-4 py-3 text-center font-mono text-red-600 font-semibold">{r.absent}</td>
                              <td className="px-4 py-3 text-center">
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                  r.attended === r.totalWorkingDays ? "bg-green-100 text-green-700" :
                                  r.attended >= r.totalWorkingDays * 0.8 ? "bg-blue-100 text-blue-700" :
                                  "bg-red-100 text-red-700"
                                }`}>
                                  {r.totalWorkingDays > 0 ? Math.round((r.attended / r.totalWorkingDays) * 100) : 0}%
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right font-mono font-semibold">{formatSum(r.calculatedSalary)}</td>
                              <td className="px-4 py-3 text-right font-mono">{r.calculatedSalary > 0 ? formatSum(Math.round(r.calculatedSalary / 12)) : "-"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {/* ===== TAB: Working days settings ===== */}
      {tab === "settings" && (
        <div className="space-y-6">
          {/* OFFICE LOCATION & WORKING HOURS */}
          <Card className="border-0 shadow-lg p-6">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-red-500" />
              {t('office_location_settings')}
            </h3>
            <div className="space-y-4">
              <OfficeLocationPicker
                lat={officeSettings.lat}
                lng={officeSettings.lng}
                onLatChange={v => updateOfficeSetting("lat", v)}
                onLngChange={v => updateOfficeSetting("lng", v)}
              />
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">{t('radius_label')}</label>
                <Input
                  type="number"
                  value={officeSettings.radius}
                  onChange={e => updateOfficeSetting("radius", parseInt(e.target.value) || 100)}
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">{t('work_start')}</label>
                  <Input
                    type="time"
                    value={officeSettings.startTime}
                    onChange={e => updateOfficeSetting("startTime", e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">{t('work_end')}</label>
                  <Input
                    type="time"
                    value={officeSettings.endTime}
                    onChange={e => updateOfficeSetting("endTime", e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">{t('late_minutes')}</label>
                  <Input
                    type="number"
                    value={officeSettings.lateMinutes}
                    onChange={e => updateOfficeSetting("lateMinutes", parseInt(e.target.value) || 30)}
                  />
                </div>
              </div>
              <div className="bg-muted/30 rounded-xl p-3 text-xs text-muted-foreground space-y-1">
                <p className="flex items-center gap-2"><Clock className="w-3.5 h-3.5" /> {t('auto_attendance_note')}</p>
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border-0 shadow-lg p-6">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <Moon className="w-5 h-5 text-amber-500" />
              {t('off_days')}
            </h3>
            <div className="flex items-end gap-3 mb-6">
              <div className="flex-1">
                <label className="text-xs font-semibold text-muted-foreground block mb-1">{t('date')}</label>
                <input
                  type="date"
                  value={offDate}
                  onChange={e => setOffDate(e.target.value)}
                  className="h-10 w-full px-3 rounded-xl border-2 border-border bg-background text-sm"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs font-semibold text-muted-foreground block mb-1">{t('reason_label')}</label>
                <Input value={offReason} onChange={e => setOffReason(e.target.value)} placeholder="Dam olish" />
              </div>
              <Button onClick={addOffDay} className="shrink-0">{t('add')}</Button>
            </div>
            <div className="space-y-1 max-h-[400px] overflow-y-auto">
              {offDays.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">{t('no_off_days')}</p>
              ) : (
                offDays.map(d => (
                  <div key={d.date} className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border">
                    <div>
                      <span className="font-mono text-sm font-medium">{format(parseISO(d.date), "dd.MM.yyyy")}</span>
                      <span className="text-xs text-muted-foreground ml-2">({format(parseISO(d.date), "EEEE")})</span>
                      <span className="text-xs text-muted-foreground ml-2">- {d.reason}</span>
                    </div>
                    <button onClick={() => removeOffDay(d.date)} className="text-destructive hover:text-destructive/80 text-xs font-medium">
                      {t('delete')}
                    </button>
                  </div>
                ))
              )}
            </div>
          </Card>

          <Card className="border-0 shadow-lg p-6">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-primary" />
              {t('view_month')}
            </h3>
            <input
              type="month"
              value={today.slice(0, 7)}
              onChange={() => {}}
              className="h-10 px-3 rounded-xl border-2 border-border bg-background text-sm mb-4"
            />
            <div className="grid grid-cols-7 gap-1 text-center text-xs">
              {["Du", "Se", "Ch", "Pa", "Ju", "Sh", "Ya"].map(d => (
                <div key={d} className="font-semibold text-muted-foreground py-1">{d}</div>
              ))}
              {(() => {
                const [y, m] = today.split("-").map(Number);
                const days = eachDayOfInterval({ start: new Date(y, m - 1, 1), end: new Date(y, m, 0) });
                const startPad = getDay(new Date(y, m - 1, 1)) === 0 ? 6 : getDay(new Date(y, m - 1, 1)) - 1;
                const cells: React.ReactNode[] = [];
                for (let i = 0; i < startPad; i++) cells.push(<div key={`pad-${i}`} />);
                days.forEach(d => {
                  const dateStr = format(d, "yyyy-MM-dd");
                  const off = isDayOff(dateStr);
                  cells.push(
                    <div
                      key={dateStr}
                      className={`py-2 rounded-lg text-xs font-medium ${
                        off
                          ? "bg-red-100 text-red-600 line-through"
                          : dateStr === today
                          ? "bg-primary text-white"
                          : "hover:bg-muted"
                      }`}
                    >
                      {format(d, "d")}
                    </div>
                  );
                });
                return cells;
              })()}
            </div>
          </Card>
        </div>
        </div>
      )}

      {/* ===== TAB: Salary calculation ===== */}
      {tab === "salary" && (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <Calculator className="w-5 h-5 text-muted-foreground" />
            <input
              type="month"
              value={salaryPeriod}
              onChange={e => setSalaryPeriod(e.target.value)}
              className="h-10 px-4 rounded-xl border-2 border-border bg-background text-sm"
            />
          </div>

          {(() => {
            const { totalWorkingDays, result } = calcSalary(salaryPeriod);
            const totalSalary = result.reduce((s, r) => s + r.calculatedSalary, 0);
            const totalDeduction = result.reduce((s, r) => s + r.deduction, 0);
            return (
              <>
                <div className="grid grid-cols-3 gap-4">
                  <Card className="p-5 border-0 shadow-md bg-gradient-to-br from-blue-50 to-blue-100">
                    <div className="text-2xl font-bold text-blue-700">{formatSum(totalSalary)}</div>
                    <div className="text-sm text-blue-600 font-medium">{t('total_salary')}</div>
                  </Card>
                  <Card className="p-5 border-0 shadow-md bg-gradient-to-br from-green-50 to-green-100">
                    <div className="text-2xl font-bold text-green-700">{totalWorkingDays} kun</div>
                    <div className="text-sm text-green-600 font-medium">{t('total_work_days')}</div>
                  </Card>
                  <Card className="p-5 border-0 shadow-md bg-gradient-to-br from-red-50 to-red-100">
                    <div className="text-2xl font-bold text-red-700">{formatSum(totalDeduction)}</div>
                    <div className="text-sm text-red-600 font-medium">{t('total_deduction')}</div>
                  </Card>
                </div>

                <Card className="overflow-hidden border-0 shadow-lg">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
                        <tr>
                          <th className="px-4 py-3 font-semibold">{t('employees')}</th>
                          <th className="px-4 py-3 font-semibold text-right">{t('monthly_salary_col')}</th>
                          <th className="px-4 py-3 font-semibold text-right">{t('daily_rate_col')}</th>
                          <th className="px-4 py-3 font-semibold text-center">{t('attended_col')}</th>
                          <th className="px-4 py-3 font-semibold text-center">{t('late_col')}</th>
                          <th className="px-4 py-3 font-semibold text-center">{t('absent_col')}</th>
                          <th className="px-4 py-3 font-semibold text-right">{t('calculated_col')}</th>
                          <th className="px-4 py-3 font-semibold text-right">{t('deduction_col')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.map(r => (
                          <tr key={r.employeeId} className="border-b border-border/50">
                            <td className="px-4 py-3 font-medium">{r.employeeName}</td>
                            <td className="px-4 py-3 text-right font-mono">{formatSum(r.monthlySalary)}</td>
                            <td className="px-4 py-3 text-right font-mono">{formatSum(r.dailyRate)}</td>
                            <td className="px-4 py-3 text-center font-mono text-green-600 font-semibold">{r.present}</td>
                            <td className="px-4 py-3 text-center font-mono text-amber-600 font-semibold">{r.late}</td>
                            <td className="px-4 py-3 text-center font-mono text-red-600 font-semibold">{r.absent}</td>
                            <td className="px-4 py-3 text-right font-mono font-semibold">{formatSum(r.calculatedSalary)}</td>
                            <td className="px-4 py-3 text-right font-mono text-red-600">
                              {r.deduction > 0 ? `-${formatSum(r.deduction)}` : "-"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </>
            );
          })()}
        </div>
      )}
    </DashboardLayout>
  );
}

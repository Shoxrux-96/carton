import { useState, useEffect } from "react";
import { MobileLayout, MobilePageHeader } from "./MobileLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLang } from "@/lib/i18n";
import { Smartphone, MapPin, Clock, CheckCircle2, XCircle, Loader2, Navigation } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export default function MobileAttendance() {
  const { t } = useLang();
  const { user: rawUser } = useAuth();
  const user = rawUser as any;
  const [result, setResult] = useState<{ ok: boolean; message: string; distance?: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [todayStatus, setTodayStatus] = useState<string | null>(null);

  const statusConfig: Record<string, { label: string; color: string }> = {
    present: { label: t("came"), color: "bg-green-100 text-green-700" },
    absent: { label: t("did_not_come"), color: "bg-red-100 text-red-700" },
    late: { label: t("was_late"), color: "bg-amber-100 text-amber-700" },
  };

  const officeSettings = {
    lat: 41.311081,
    lng: 69.240562,
    radius: 100,
    startTime: "09:00",
    endTime: "18:00",
    lateMinutes: 30,
  };

  useEffect(() => {
    const raw = localStorage.getItem("carton_office_settings");
    if (raw) {
      try {
        Object.assign(officeSettings, JSON.parse(raw));
      } catch {}
    }
  }, []);

  useEffect(() => {
    const raw = localStorage.getItem("carton_attendance");
    if (raw) {
      try {
        const data = JSON.parse(raw);
        const today = new Date().toISOString().split("T")[0];
        const dayRecords = data[today] || [];
        const myRecord = dayRecords.find((r: any) => r.employeeId === user?.id);
        if (myRecord) setTodayStatus(myRecord.status);
      } catch {}
    }
  }, [user?.id]);

  const calcDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const handleCheckIn = async () => {
    setLoading(true);
    setResult(null);
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000 });
      });
      const { latitude, longitude } = pos.coords;
      const distance = Math.round(calcDistance(latitude, longitude, officeSettings.lat, officeSettings.lng));
      if (distance > officeSettings.radius) {
        setResult({ ok: false, message: t("not_at_office"), distance });
        setLoading(false);
        return;
      }
      const now = new Date();
      const hh = now.getHours().toString().padStart(2, "0");
      const mm = now.getMinutes().toString().padStart(2, "0");
      const current = `${hh}:${mm}`;
      if (current < officeSettings.startTime || current > officeSettings.endTime) {
        setResult({ ok: false, message: `${t("not_work_time")} (${officeSettings.startTime}-${officeSettings.endTime})`, distance });
        setLoading(false);
        return;
      }
      const [startH, startM] = officeSettings.startTime.split(":").map(Number);
      const lateThreshold = new Date(now.getFullYear(), now.getMonth(), now.getDate(), startH, startM + officeSettings.lateMinutes);
      const status = now > lateThreshold ? "late" : "present";
      const today = new Date().toISOString().split("T")[0];
      const raw = localStorage.getItem("carton_attendance");
      const data = raw ? JSON.parse(raw) : {};
      const day = data[today] || [];
      const idx = day.findIndex((r: any) => r.employeeId === user?.id);
      const entry = { employeeId: user?.id, employeeName: user?.name, date: today, status };
      if (idx >= 0) day[idx] = entry;
      else day.push(entry);
      data[today] = day;
      localStorage.setItem("carton_attendance", JSON.stringify(data));
      setTodayStatus(status);
      setResult({ ok: true, message: status === "present" ? `${t("came")} ✅` : `${t("was_late")} ⏰`, distance });
    } catch (err: any) {
      setResult({
        ok: false,
        message: err.code === 1 ? t("no_geo_permission") : t("location_not_found"),
      });
    }
    setLoading(false);
  };

  return (
    <MobileLayout title={t("attendance")}>
      <MobilePageHeader
        title={t("daily_attendance")}
        subtitle={new Date().toLocaleDateString("uz-UZ", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
      />

      {/* Status Card */}
      <Card className={`p-6 mb-4 border-0 shadow-md text-center ${
        todayStatus === "present" ? "bg-gradient-to-br from-green-50 to-green-100" :
        todayStatus === "late" ? "bg-gradient-to-br from-amber-50 to-amber-100" :
        todayStatus === "absent" ? "bg-gradient-to-br from-red-50 to-red-100" :
        "bg-gradient-to-br from-blue-50 to-blue-100"
      }`}>
        {todayStatus ? (
          <>
            <div className={`w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center ${
              todayStatus === "present" ? "bg-green-200" :
              todayStatus === "late" ? "bg-amber-200" : "bg-red-200"
            }`}>
              <CheckCircle2 className={`w-8 h-8 ${
                todayStatus === "present" ? "text-green-600" :
                todayStatus === "late" ? "text-amber-600" : "text-red-600"
              }`} />
            </div>
            <p className="text-lg font-bold">
              {t("marked_as").replace("{status}", statusConfig[todayStatus]?.label?.toLowerCase() || "")}
            </p>
            <p className="text-xs text-muted-foreground mt-1">{t("attendance_recorded")}</p>
          </>
        ) : (
          <>
            <div className="w-16 h-16 rounded-full mx-auto mb-3 bg-blue-200 flex items-center justify-center">
              <Smartphone className="w-8 h-8 text-blue-600" />
            </div>
            <p className="text-lg font-bold">{t("mark_arrival")}</p>
            <p className="text-xs text-muted-foreground mt-1">{t("confirm_at_office")}</p>
          </>
        )}
      </Card>

      {/* Check-in Button */}
      {!todayStatus && (
        <Button
          onClick={handleCheckIn}
          disabled={loading}
          className="w-full h-14 rounded-2xl text-base font-bold shadow-lg mb-4 bg-gradient-to-r from-amber-500 to-orange-500"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
          ) : (
            <Smartphone className="w-5 h-5 mr-2" />
          )}
          {loading ? t("checking") : t("mark_arrival")}
        </Button>
      )}

      {/* Info cards */}
      <div className="space-y-3 mb-4">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-white border border-amber-100">
          <MapPin className="w-5 h-5 text-red-500 shrink-0" />
          <div>
            <p className="text-xs font-semibold">{t("office_location")}</p>
            <p className="text-[11px] text-muted-foreground">{officeSettings.lat.toFixed(4)}, {officeSettings.lng.toFixed(4)} ({officeSettings.radius}m radius)</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3 rounded-xl bg-white border border-amber-100">
          <Clock className="w-5 h-5 text-blue-500 shrink-0" />
          <div>
            <p className="text-xs font-semibold">{t("work_hours")}</p>
            <p className="text-[11px] text-muted-foreground">{officeSettings.startTime} - {officeSettings.endTime}</p>
          </div>
        </div>
      </div>

      {/* Result */}
      {result && (
        <div className={`flex items-start gap-3 p-4 rounded-2xl border ${
          result.ok ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"
        }`}>
          {result.ok ? (
            <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
          ) : (
            <XCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          )}
          <div>
            <p className={`text-sm font-semibold ${result.ok ? "text-green-800" : "text-red-800"}`}>
              {result.ok ? t("success") : t("error")}
            </p>
            <p className="text-xs text-muted-foreground">{result.message}</p>
            {result.distance !== undefined && (
              <p className="text-xs text-muted-foreground mt-0.5">{t("distance")}: {result.distance} m</p>
            )}
          </div>
        </div>
      )}

      {/* Link to report */}
      <button
        onClick={() => window.location.href = "/mobile/attendance/report"}
        className="w-full mt-4 text-center text-sm text-amber-600 font-medium"
      >
        {t("view_attendance_report")}
      </button>
    </MobileLayout>
  );
}

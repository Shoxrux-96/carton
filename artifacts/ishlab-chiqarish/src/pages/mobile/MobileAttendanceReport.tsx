import { useState, useMemo } from "react";
import { MobileLayout, MobilePageHeader } from "./MobileLayout";
import { useLang } from "@/lib/i18n";
import { Card } from "@/components/ui/card";
import { CalendarDays, CheckCircle2, Clock, XCircle } from "lucide-react";
import { format, eachDayOfInterval, startOfMonth, endOfMonth } from "date-fns";

export default function MobileAttendanceReport() {
  const { t } = useLang();
  const today = new Date().toISOString().split("T")[0];
  const [month, setMonth] = useState(today.slice(0, 7));

  const attendanceData = useMemo(() => {
    const raw = localStorage.getItem("carton_attendance");
    if (!raw) return {};
    try {
      const data = JSON.parse(raw);
      const result: Record<string, { status: string; employeeName?: string }[]> = {};
      for (const [dateStr, entries] of Object.entries(data)) {
        if (!dateStr.startsWith(month)) continue;
        result[dateStr] = entries as any[];
      }
      return result;
    } catch { return {}; }
  }, [month]);

  const stats = useMemo(() => {
    let present = 0, late = 0, absent = 0;
    for (const entries of Object.values(attendanceData)) {
      for (const e of entries) {
        if (e.status === "present") present++;
        else if (e.status === "late") late++;
        else if (e.status === "absent") absent++;
      }
    }
    return { present, late, absent, total: present + late + absent };
  }, [attendanceData]);

  const [year, monthNum] = month.split("-").map(Number);
  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(new Date(year, monthNum - 1)),
    end: endOfMonth(new Date(year, monthNum - 1)),
  });

  const weekDays = [t("mon"), t("tue"), t("wed"), t("thu"), t("fri"), t("sat"), t("sun")];

  return (
    <MobileLayout title={t("report")}>
      <MobilePageHeader
        title={t("attendance_report")}
        action={
          <input
            type="month"
            value={month}
            onChange={e => setMonth(e.target.value)}
            className="h-8 px-2 rounded-lg border border-amber-200 bg-white text-xs font-medium"
          />
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <Card className="p-3 text-center border-0 shadow-sm bg-green-50">
          <CheckCircle2 className="w-4 h-4 text-green-600 mx-auto mb-1" />
          <div className="text-lg font-bold text-green-700">{stats.present}</div>
          <div className="text-[10px] text-green-600 font-medium">{t("present")}</div>
        </Card>
        <Card className="p-3 text-center border-0 shadow-sm bg-amber-50">
          <Clock className="w-4 h-4 text-amber-600 mx-auto mb-1" />
          <div className="text-lg font-bold text-amber-700">{stats.late}</div>
          <div className="text-[10px] text-amber-600 font-medium">{t("late")}</div>
        </Card>
        <Card className="p-3 text-center border-0 shadow-sm bg-red-50">
          <XCircle className="w-4 h-4 text-red-600 mx-auto mb-1" />
          <div className="text-lg font-bold text-red-700">{stats.absent}</div>
          <div className="text-[10px] text-red-600 font-medium">{t("absent")}</div>
        </Card>
      </div>

      {/* Calendar */}
      <Card className="border-0 shadow-md p-3">
        <div className="grid grid-cols-7 gap-1 text-center mb-2">
          {weekDays.map(d => (
            <div key={d} className="text-[10px] font-semibold text-muted-foreground py-1">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1 text-center">
          {(() => {
            const startDay = new Date(year, monthNum - 1, 1).getDay();
            const startPad = startDay === 0 ? 6 : startDay - 1;
            const cells: React.ReactNode[] = [];
            for (let i = 0; i < startPad; i++) cells.push(<div key={`pad-${i}`} />);
            daysInMonth.forEach(d => {
              const dateStr = format(d, "yyyy-MM-dd");
              const dayData = attendanceData[dateStr];
              const isOff = (() => {
                const raw = localStorage.getItem("carton_off_days");
                if (raw) {
                  try {
                    return JSON.parse(raw).some((o: any) => o.date === dateStr);
                  } catch {}
                }
                return false;
              })();
              let cellClass = "py-2 rounded-lg text-xs font-medium ";
              if (isOff) {
                cellClass += "bg-red-50 text-red-400 line-through";
              } else if (dayData && dayData.length > 0) {
                const hasPresent = dayData.some(e => e.status === "present");
                const hasLate = dayData.some(e => e.status === "late");
                const hasAbsent = dayData.some(e => e.status === "absent");
                if (hasPresent && !hasLate) cellClass += "bg-green-100 text-green-700";
                else if (hasLate) cellClass += "bg-amber-100 text-amber-700";
                else cellClass += "bg-red-100 text-red-700";
              } else if (dateStr === today) {
                cellClass += "bg-amber-200 text-amber-800 font-bold";
              } else {
                cellClass += "hover:bg-muted";
              }
              cells.push(<div key={dateStr} className={cellClass}>{format(d, "d")}</div>);
            });
            return cells;
          })()}
        </div>
      </Card>
    </MobileLayout>
  );
}

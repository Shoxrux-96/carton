import { useState, useEffect, useMemo } from "react";
import { DashboardLayout, PageHeader } from "@/components/layout/DashboardLayout";
import { useAuthHeaders } from "@/hooks/use-auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import customFetch from "@/lib/custom-fetch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { exportToExcel, type ExcelColumn } from "@/lib/export-to-excel";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Users, Search, Phone, Globe, MessageCircle, Instagram, Facebook, ExternalLink, CheckCircle2, Copy, ChevronLeft, ChevronRight, FileDown } from "lucide-react";
import { format } from "date-fns";
import { useLang } from "@/lib/i18n";

const PAGE_SIZES = [10, 30, 50];

const platforms = [
  { key: "telegram", label: "Telegram", icon: MessageCircle, color: "from-sky-400 to-blue-500" },
  { key: "instagram", label: "Instagram", icon: Instagram, color: "from-pink-400 to-purple-500" },
  { key: "facebook", label: "Facebook", icon: Facebook, color: "from-blue-500 to-blue-700" },
];

export default function Leads() {
  const queryClient = useQueryClient();
  const authOpts = useAuthHeaders();
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [sourceFilter, setSourceFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [confirmConvert, setConfirmConvert] = useState<number | null>(null);
  const { t } = useLang();

  const { data: leads } = useQuery({
    queryKey: ["/api/clients", "lead", search],
    queryFn: () => customFetch(`/api/clients?type=lead${search ? `&search=${search}` : ""}`, { headers: authOpts.headers }).then(r => r.json()),
  });

  const { data: socialLinks } = useQuery({
    queryKey: ["/api/social-links"],
    queryFn: () => customFetch("/api/social-links", { headers: authOpts.headers }).then(r => r.json()),
  });

  const [urls, setUrls] = useState<Record<string, string>>({});

  const socialLinksMap = Array.isArray(socialLinks)
    ? Object.fromEntries(socialLinks.map((l: any) => [l.platform, l.url]))
    : {};

  useEffect(() => {
    if (socialLinksMap) {
      setUrls(prev => {
        const next = { ...prev };
        for (const [k, v] of Object.entries(socialLinksMap)) {
          if (!(k in prev)) next[k] = v as string;
        }
        return next;
      });
    }
  }, [socialLinks]);

  const updateUrl = (platform: string, url: string) => {
    setUrls(prev => ({ ...prev, [platform]: url }));
  };

  const saveUrl = async (platform: string) => {
    setSaving(platform);
    try {
      await customFetch(`/api/social-links/${platform}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authOpts.headers },
        body: JSON.stringify({ url: urls[platform] || "" }),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/social-links"] });
    } finally {
      setSaving(null);
    }
  };

  const convertToCustomer = async (lead: any) => {
    await customFetch(`/api/clients/${lead.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...authOpts.headers },
      body: JSON.stringify({ type: "customer", source: lead.source === "contact_form" ? "Web sayt" : lead.source || "Noma'lum" }),
    });
    queryClient.refetchQueries({ queryKey: ["/api/clients"] });
    setConfirmConvert(null);
  };

  const webhookUrl = `${window.location.protocol}//${window.location.hostname}${window.location.port ? `:${window.location.port}` : ""}/api/public/ads-lead`;

  const copyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filtered = useMemo(() => {
    if (!Array.isArray(leads)) return [];
    return leads.filter((l: any) => {
      const displaySource = l.source === "contact_form" ? "Web sayt" : l.source || "Noma'lum";
      if (sourceFilter && displaySource !== sourceFilter) return false;
      if (dateFrom && new Date(l.createdAt) < new Date(dateFrom)) return false;
      if (dateTo) {
        const end = new Date(dateTo);
        end.setDate(end.getDate() + 1);
        if (new Date(l.createdAt) > end) return false;
      }
      return true;
    });
  }, [leads, sourceFilter, dateFrom, dateTo]);

  const sources = useMemo(() => {
    if (!Array.isArray(leads)) return [];
    const s = new Set(leads.map((l: any) => l.source === "contact_form" ? "Web sayt" : l.source || "Noma'lum"));
    return Array.from(s).sort();
  }, [leads]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [totalPages, page]);

  return (
    <DashboardLayout>
      <PageHeader
        title={t('leads_title')}
        description={t('leads_description')}
        action={
          <Button variant="outline" onClick={() => {
            const cols: ExcelColumn[] = [
              { header: "Ism", key: "name" },
              { header: "Telefon", key: "phone" },
              { header: "Manba", key: "source", accessor: (r: any) => r.source === "contact_form" ? "Web sayt" : r.source || "Noma'lum" },
              { header: "Izoh", key: "notes", accessor: (r: any) => r.notes || "" },
              { header: "Sana", key: "createdAt", accessor: (r: any) => format(new Date(r.createdAt), "dd.MM.yyyy") },
            ];
            exportToExcel(filtered, cols, "leadlar");
          }} className="rounded-xl px-4 h-12">
            <FileDown className="mr-2 h-5 w-5" /> Excel
          </Button>
        }
      />

      <Card className="overflow-hidden border-0 shadow-lg mb-8">
        <div className="p-5 border-b border-border/50">
          <h3 className="text-lg font-bold">{t('lead_sources')}</h3>
          <p className="text-sm text-muted-foreground mt-1">{t('lead_sources_desc')}</p>
        </div>
        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          {platforms.map(({ key, label, icon: Icon, color }) => {
            const val = urls[key] ?? socialLinksMap[key] ?? "";
            return (
              <div key={key} className="flex items-center gap-3">
                {val ? (
                  <a href={val} target="_blank" rel="noopener noreferrer" className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center shrink-0 hover:scale-105 transition-transform`}>
                    <Icon className="w-5 h-5 text-white" />
                  </a>
                ) : (
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center shrink-0`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  {val ? (
                    <a href={val} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-muted-foreground block mb-1 hover:text-primary transition-colors">{label}</a>
                  ) : (
                    <label className="text-xs font-semibold text-muted-foreground block mb-1">{label}</label>
                  )}
                  <div className="flex gap-2">
                    <Input
                      value={val}
                      onChange={e => updateUrl(key, e.target.value)}
                      placeholder={`${label} URL`}
                      className="flex-1 h-9 text-sm"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => saveUrl(key)}
                      isLoading={saving === key}
                      className="h-9 shrink-0"
                    >
                      {t('save')}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shrink-0">
              <Globe className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <label className="text-xs font-semibold text-muted-foreground block mb-1">{t('web_site')}</label>
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1.5 text-sm font-medium text-success">
                  <CheckCircle2 className="w-4 h-4" />
                  {t('web_auto')}
                </span>
              </div>
            </div>
          </div>

          <div className="md:col-span-2 p-4 bg-muted/30 rounded-xl border border-border/60">
            <h4 className="text-sm font-semibold mb-2">{t('ad_webhook')}</h4>
            <p className="text-xs text-muted-foreground mb-2">
              {t('ad_webhook_desc')}
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs bg-background px-3 py-2 rounded-lg border border-border truncate">{webhookUrl}</code>
              <Button type="button" size="sm" variant="secondary" onClick={copyWebhook} className="h-8 shrink-0">
                {copied ? <CheckCircle2 className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              POST so'rov: <code className="bg-background px-1 rounded">{`{"name":"Ism","phone":"+998...","message":"Xabar","source":"Google Ads"}`}</code>
            </p>
          </div>
        </div>
      </Card>

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={t('search_leads')}
            className="pl-9"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          value={sourceFilter}
          onChange={e => { setSourceFilter(e.target.value); setPage(1); }}
          className="h-10 rounded-xl border-2 border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:border-primary transition-colors"
        >
          <option value="">{t('all_sources')}</option>
          {sources.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground">{t('from_date')}</label>
          <input
            type="date"
            value={dateFrom}
            onChange={e => { setDateFrom(e.target.value); setPage(1); }}
            className="h-10 rounded-xl border-2 border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:border-primary transition-colors"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground">{t('to_date')}</label>
          <input
            type="date"
            value={dateTo}
            onChange={e => { setDateTo(e.target.value); setPage(1); }}
            className="h-10 rounded-xl border-2 border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:border-primary transition-colors"
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
                <th className="px-6 py-4 font-semibold">{t('source')}</th>
                <th className="px-6 py-4 font-semibold">{t('note')}</th>
                <th className="px-6 py-4 font-semibold">{t('date')}</th>
                <th className="px-6 py-4 font-semibold text-right">{t('action')}</th>
              </tr>
            </thead>
            <tbody>
              {!Array.isArray(leads) ? (
                <tr><td colSpan={6} className="text-center py-10 text-muted-foreground">{t('loading')}</td></tr>
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-16">
                    <Users className="w-12 h-12 mx-auto text-muted-foreground mb-3 opacity-20" />
                    <p className="text-lg font-medium">{t('no_leads')}</p>
                    <p className="text-muted-foreground mt-1">{t('no_leads_desc')}</p>
                  </td>
                </tr>
              ) : (
                paginated.map((lead: any) => (
                  <tr key={lead.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 font-medium">{lead.name}</td>
                    <td className="px-6 py-4">
                      <a href={`tel:${lead.phone}`} className="flex items-center gap-1.5 text-primary hover:underline">
                        <Phone className="w-3.5 h-3.5" />
                        {lead.phone || "-"}
                      </a>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-medium">
                        {lead.source === "contact_form" ? t('web_site') : lead.source || t('unknown_source')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground max-w-[200px] truncate">{lead.notes || "-"}</td>
                    <td className="px-6 py-4 text-muted-foreground">{format(new Date(lead.createdAt), 'dd.MM.yyyy')}</td>
                    <td className="px-6 py-4 text-right">
                      <AlertDialog open={confirmConvert === lead.id} onOpenChange={open => !open && setConfirmConvert(null)}>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm" onClick={() => setConfirmConvert(lead.id)}>
                            {t('convert_to_client')}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>{t('convert_confirm_title')}</AlertDialogTitle>
                            <AlertDialogDescription>
                              "{lead.name}" {t('convert_confirm_desc')}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel onClick={() => setConfirmConvert(null)}>{t('cancel')}</AlertDialogCancel>
                            <AlertDialogAction onClick={() => convertToCustomer(lead)}>{t('yes_convert')}</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {Array.isArray(leads) && leads.length > 0 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-border/50">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{t('rows')}:</span>
              {PAGE_SIZES.map(s => (
                <button
                  key={s}
                  onClick={() => { setPageSize(s); setPage(1); }}
                  className={`px-2 py-1 rounded-md text-xs font-medium transition-colors ${pageSize === s ? "bg-primary text-white" : "hover:bg-muted"}`}
                >
                  {s}
                </button>
              ))}
              <span className="ml-2">
                {filtered.length} {t('of_total')} {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, filtered.length)} {t('showing_records')}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-2 rounded-lg hover:bg-muted transition-colors disabled:opacity-30"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                .map((p, idx, arr) => (
                  <span key={p} className="flex items-center">
                    {idx > 0 && arr[idx - 1] !== p - 1 && <span className="px-1 text-muted-foreground">...</span>}
                    <button
                      onClick={() => setPage(p)}
                      className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${page === p ? "bg-primary text-white" : "hover:bg-muted"}`}
                    >
                      {p}
                    </button>
                  </span>
                ))}
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="p-2 rounded-lg hover:bg-muted transition-colors disabled:opacity-30"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </Card>
    </DashboardLayout>
  );
}

import { useState, useEffect, useRef, useMemo } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Printer, FileText } from "lucide-react";
import { useAuthHeaders } from "@/hooks/use-auth";
import customFetch from "@/lib/custom-fetch";
import { getWaybillCategory } from "@/lib/waybill-category";

interface WaybillRow {
  id: number;
  productId?: number;
  name: string;
  format: string;
  unit: string;
  quantity: string;
  price: string;
}

interface WaybillData {
  docNumber: number;
  date: string;
  senderCompany: string;
  senderPhone: string;
  receiverCompany: string;
  receiverPhone: string;
  vehicle: string;
  rows: WaybillRow[];
}

const defaultData: WaybillData = {
  docNumber: 1,
  date: new Date().toISOString().split("T")[0],
  senderCompany: "Shovot Carton Paper",
  senderPhone: "+998 99 505 40 04",
  receiverCompany: "",
  receiverPhone: "",
  vehicle: "",
  rows: [{ id: 1, name: "", format: "", unit: "Kg", quantity: "", price: "" }],
};

const fmt = (n: number) => n.toLocaleString("uz-UZ");
const months = ["Января","Февраля","Марта","Апреля","Мая","Июня","Июля","Августа","Сентября","Октября","Ноября","Декабря"];

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: () => void;
  onView?: number | null;
  onEdit?: number | null;
  printOnOpen?: boolean;
  headers?: Record<string, string>;
  /** Yangi hujjat ochilganda oldindan to'ldiriladigan maydonlar */
  newDoc?: {
    senderCompany?: string;
    senderPhone?: string;
    receiverCompany?: string;
    receiverPhone?: string;
  } | null;
}

export default function WaybillModal({ open, onClose, onSave, onView, onEdit, printOnOpen, headers, newDoc }: Props) {
  const isViewMode = !!onView;
  const isEditMode = !!onEdit;
  const [doc, setDoc] = useState<WaybillData>(defaultData);
  const [printing, setPrinting] = useState(false);
  const [loading, setLoading] = useState(false);
  const hasPrinted = useRef(false);

  const authHeaders = headers || {};
  const [clients, setClients] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);

  useEffect(() => {
    if (!open) return;
    customFetch("/api/clients", { headers: authHeaders })
      .then(r => r.json())
      .then(data => setClients(Array.isArray(data) ? data : []))
      .catch(() => setClients([]));
    customFetch("/api/company", { headers: authHeaders })
      .then(r => r.json())
      .then(data => setCompanies(Array.isArray(data?.companies) ? data.companies : []))
      .catch(() => setCompanies([]));
    customFetch("/api/products", { headers: authHeaders })
      .then(r => r.json())
      .then(data => setProducts(Array.isArray(data) ? data : []))
      .catch(() => setProducts([]));
    customFetch("/api/inventory", { headers: authHeaders })
      .then(r => r.json())
      .then(data => setInventory(Array.isArray(data) ? data : []))
      .catch(() => setInventory([]));
  }, [open, authHeaders]);

  useEffect(() => {
    if (!open) return;
    const targetId = onEdit ?? onView;
    if (targetId) {
      setLoading(true);
      fetch(`/api/waybills/${targetId}`, { headers: authHeaders })
        .then(r => r.json())
        .then(data => {
          setDoc({
            docNumber: data.docNumber || 1,
            date: data.date || new Date().toISOString().split("T")[0],
            senderCompany: data.senderCompany || "Shovot Carton Paper",
            senderPhone: data.senderPhone || "+998 99 505 40 04",
            receiverCompany: data.receiverCompany || "",
            receiverPhone: data.receiverPhone || "",
            vehicle: data.vehicle || "",
            rows: (data.items || []).map((r: any, i: number) => ({
              id: i + 1,
              name: r.name || "",
              format: r.format || "",
              unit: r.unit || "Kg",
              quantity: String(r.quantity || 0),
              price: String(r.price || 0),
            })),
          });
        })
        .catch(() => setDoc(defaultData))
        .finally(() => setLoading(false));
    } else {
      fetch("/api/waybills", { headers: authHeaders })
        .then(r => r.json())
        .then((list: any[]) => {
          const maxDoc = list.reduce((m, w) => Math.max(m, w.docNumber || 0), 0);
          setDoc({
            ...defaultData,
            ...(newDoc || {}),
            docNumber: maxDoc + 1,
            rows: [{ id: 1, name: "", format: "", unit: "Kg", quantity: "", price: "" }],
          });
        })
        .catch(() => setDoc({
          ...defaultData,
          ...(newDoc || {}),
          docNumber: 1,
          rows: [{ id: 1, name: "", format: "", unit: "Kg", quantity: "", price: "" }],
        }));
    }
  }, [open, onView, onEdit, authHeaders]);

  useEffect(() => {
    if (printOnOpen && open && !loading && !hasPrinted.current) {
      hasPrinted.current = true;
      const timer = setTimeout(() => {
        window.print();
      }, 300);
      return () => clearTimeout(timer);
    }
    if (!open) {
      hasPrinted.current = false;
    }
    return undefined;
  }, [printOnOpen, open, loading]);

  const setField = (key: keyof WaybillData, value: any) => setDoc(prev => ({ ...prev, [key]: value }));

  const setRow = (id: number, key: keyof WaybillRow, value: string) => {
    setDoc(prev => ({
      ...prev,
      rows: prev.rows.map(r => r.id === id ? { ...r, [key]: value } : r),
    }));
  };

  const addRow = () => {
    setDoc(prev => ({
      ...prev,
      rows: [...prev.rows, { id: Date.now(), name: "", format: "", unit: "Kg", quantity: "", price: "" }],
    }));
  };

  const removeRow = (id: number) => {
    if (doc.rows.length <= 1) return;
    setDoc(prev => ({ ...prev, rows: prev.rows.filter(r => r.id !== id) }));
  };

  const rowSum = (r: WaybillRow) => (parseFloat(r.quantity) || 0) * (parseFloat(r.price) || 0);
  const totalSum = doc.rows.reduce((s, r) => s + rowSum(r), 0);
  const totalQty = doc.rows.reduce((s, r) => s + (parseFloat(r.quantity) || 0), 0);
  const category = getWaybillCategory(doc.senderCompany, doc.receiverCompany, companies, doc.rows.map(r => r.name), products.map(p => p.name));

  const handleSave = async () => {
    setLoading(true);
    try {
      const method = isEditMode ? "PUT" : "POST";
      const url = isEditMode && onEdit ? `/api/waybills/${onEdit}` : "/api/waybills";
      await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({
          docNumber: doc.docNumber,
          date: doc.date,
          senderCompany: doc.senderCompany,
          senderPhone: doc.senderPhone,
          receiverCompany: doc.receiverCompany,
          receiverPhone: doc.receiverPhone,
          vehicle: doc.vehicle,
          items: doc.rows.filter(r => r.name || r.quantity).map(r => ({
            name: r.name,
            format: r.format,
            unit: r.unit,
            quantity: r.quantity,
            price: r.price,
          })),
        }),
      });
      onSave();
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    setPrinting(true);
    setTimeout(() => {
      window.print();
      setPrinting(false);
    }, 100);
  };

  const dateObj = new Date(doc.date);
  const day = dateObj.getDate();
  const monthName = months[dateObj.getMonth()];
  const year = dateObj.getFullYear();

  return (
    <Dialog open={open} onOpenChange={onClose} title="Yuk xati (Nakladnaya)" className="max-w-[780px]">
      <div className="space-y-4 pt-2 max-h-[85vh] overflow-y-auto pr-1" id="waybill-content">
        {/* SARLAVHA */}
        <div className="text-center border-b-2 border-black pb-3">
          <h2 className="text-xl font-black uppercase tracking-wide">НАКЛАДНАЯ</h2>
          <p className="text-sm mt-1">
            № {doc.docNumber} от "{day}" {monthName} {year} г.
          </p>
        </div>

        {/* KORXONA MA'LUMOTLARI */}
        <div className="space-y-2 text-sm border-b border-border pb-3">
          <div className="flex items-center gap-3">
            <span className="font-bold w-32 shrink-0">Грузоотправитель:</span>
            {isViewMode ? (
              <span className="flex-1 font-medium">{doc.senderCompany}</span>
            ) : (
              <CompanyAutocomplete
                value={doc.senderCompany}
                phone={doc.senderPhone}
                clients={clients}
                onChange={(name, phone) => {
                  setField("senderCompany", name);
                  setField("senderPhone", phone);
                }}
                placeholder="Kompaniya nomi"
              />
            )}
            <span className="font-bold">Тел:</span>
            {isViewMode ? (
              <span className="w-44 font-medium">{doc.senderPhone}</span>
            ) : (
              <Input value={doc.senderPhone} onChange={e => setField("senderPhone", e.target.value)}
                placeholder="+998 XX XXX XX XX" className="h-10 text-sm w-[200px] rounded-xl" />
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="font-bold w-32 shrink-0">Грузополучатель:</span>
            {isViewMode ? (
              <span className="flex-1 font-medium">{doc.receiverCompany || "—"}</span>
            ) : (
              <CompanyAutocomplete
                value={doc.receiverCompany}
                phone={doc.receiverPhone}
                clients={clients}
                onChange={(name, phone) => {
                  setField("receiverCompany", name);
                  setField("receiverPhone", phone);
                }}
                placeholder="Qabul qiluvchi nomi"
              />
            )}
            <span className="font-bold">Тел:</span>
            {isViewMode ? (
              <span className="w-44 font-medium">{doc.receiverPhone || "—"}</span>
            ) : (
              <Input value={doc.receiverPhone} onChange={e => setField("receiverPhone", e.target.value)}
                placeholder="+998 XX XXX XX XX" className="h-10 text-sm w-[200px] rounded-xl" />
            )}
          </div>
          <div className="flex items-center gap-3 no-print">
            <span className="font-bold w-32 shrink-0">Sana:</span>
            {isViewMode ? (
              <span className="w-44 font-medium">{day} {monthName} {year}</span>
            ) : (
              <Input type="date" value={doc.date} onChange={e => setField("date", e.target.value)}
                className="h-10 text-sm w-[200px] rounded-xl" />
            )}
          </div>
          <div className="flex items-center gap-3 no-print">
            <span className="font-bold w-32 shrink-0">Kategoriya:</span>
            <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
              category === "Sotuv"
                ? "bg-green-100 text-green-700"
                : category === "Xarid"
                ? "bg-red-100 text-red-700"
                : "bg-muted text-muted-foreground"
            }`}>{category}</span>
            <span className="text-[11px] text-muted-foreground">Korxonamiz bo'yicha avtomatik (yuboruvchi → Sotuv, qabul qiluvchi → Xarid)</span>
          </div>
        </div>

        {/* JADVAL */}
        <div className="border border-black">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-gray-100 border-b-2 border-black">
                <th className="border border-black px-2 py-2 text-center w-10">№</th>
                <th className="border border-black px-2 py-2 text-left">Наименование товара</th>
                <th className="border border-black px-2 py-2 text-center w-20">Формат (см)</th>
                <th className="border border-black px-2 py-2 text-center w-16">Ед. изм.</th>
                <th className="border border-black px-2 py-2 text-center w-20">Количество</th>
                <th className="border border-black px-2 py-2 text-center w-24">Цена (сом)</th>
                <th className="border border-black px-2 py-2 text-center w-28">Сумма (сом)</th>
                {!isViewMode && <th className="border border-black px-2 py-2 w-8"></th>}
              </tr>
            </thead>
            <tbody>
              {doc.rows.map((row, i) => (
                <tr key={row.id} className="hover:bg-gray-50">
                  <td className="border border-black px-2 py-1.5 text-center font-bold">{i + 1}</td>
                  <td className="border border-black px-1 py-1">
                    {isViewMode ? (
                      <span className="px-1 py-1 text-xs">{row.name || "—"}</span>
                    ) : (
                      <ProductAutocomplete
                        value={row.name}
                        products={products}
                        inventory={inventory}
                        onSelect={(p) => {
                          setRow(row.id, "name", p.name);
                          setRow(row.id, "productId", String(p.id));
                          if (p.format) setRow(row.id, "format", String(p.format));
                        }}
                        onChange={(v) => {
                          setRow(row.id, "name", v);
                          setRow(row.id, "productId", "");
                        }}
                      />
                    )}
                  </td>
                  <td className="border border-black px-1 py-1">
                    {isViewMode ? (
                      <span className="px-1 py-1 text-xs text-center block">{row.format || "—"}</span>
                    ) : (
                      <input value={row.format} onChange={e => setRow(row.id, "format", e.target.value)}
                        placeholder="135"
                        className="w-full bg-transparent text-xs px-1 py-1 text-center outline-none border-b border-transparent focus:border-amber-400" />
                    )}
                  </td>
                  <td className="border border-black px-1 py-1">
                    {isViewMode ? (
                      <span className="px-1 py-1 text-xs text-center block">{row.unit}</span>
                    ) : (
                      <select value={row.unit} onChange={e => setRow(row.id, "unit", e.target.value)}
                        className="w-full bg-transparent text-xs px-1 py-1 text-center outline-none cursor-pointer">
                        <option value="Kg">Kg</option>
                        <option value="Дона">Дона</option>
                        <option value="М">М</option>
                        <option value="Л">Л</option>
                      </select>
                    )}
                  </td>
                  <td className="border border-black px-1 py-1">
                    {isViewMode ? (
                      <span className="px-1 py-1 text-xs text-right block">{row.quantity || "0"}</span>
                    ) : (() => {
                      const stock = row.productId ? (inventory.find((i: any) => i.productId === Number(row.productId))?.quantity ?? 0) : 0;
                      const qty = parseFloat(row.quantity) || 0;
                      const overStock = qty > stock && stock > 0;
                      return (
                        <div>
                          <input type="number" value={row.quantity}
                            onChange={e => {
                              const val = e.target.value;
                              const num = parseFloat(val) || 0;
                              if (row.productId && stock > 0 && num > stock) return;
                              setRow(row.id, "quantity", val);
                            }}
                            placeholder="0"
                            className={`w-full bg-transparent text-xs px-1 py-1 text-right outline-none border-b border-transparent focus:border-amber-400 ${overStock ? "text-red-500 font-bold" : ""}`} />
                          {row.productId && stock > 0 && (
                            <div className="text-[8px] text-muted-foreground text-right">Ombor: {stock}</div>
                          )}
                        </div>
                      );
                    })()}
                  </td>
                  <td className="border border-black px-1 py-1">
                    {isViewMode ? (
                      <span className="px-1 py-1 text-xs text-right block">{row.price || "0"}</span>
                    ) : (
                      <input type="number" value={row.price} onChange={e => setRow(row.id, "price", e.target.value)}
                        placeholder="0"
                        className="w-full bg-transparent text-xs px-1 py-1 text-right outline-none border-b border-transparent focus:border-amber-400" />
                    )}
                  </td>
                  <td className="border border-black px-2 py-1.5 text-right font-bold text-[11px]">
                    {fmt(rowSum(row))}
                  </td>
                  {!isViewMode && (
                    <td className="border border-black px-1 py-1 text-center">
                      <button onClick={() => removeRow(row.id)}
                        className="text-red-400 hover:text-red-600 transition-colors p-0.5">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-100 font-bold border-t-2 border-black">
                <td className="border border-black px-2 py-2 text-center" colSpan={4}>Общие</td>
                <td className="border border-black px-2 py-2 text-right">{fmt(totalQty)}</td>
                <td className="border border-black px-2 py-2"></td>
                <td className="border border-black px-2 py-2 text-right text-sm">{fmt(totalSum)}</td>
                {!isViewMode && <td className="border border-black"></td>}
              </tr>
            </tfoot>
          </table>
        </div>

        {/* QATOR QO'SHISH */}
        {!isViewMode && (
          <Button variant="outline" onClick={addRow} className="w-full rounded-xl border-dashed border-2 h-10 no-print">
            <Plus className="w-4 h-4 mr-2" /> Yangi qator
          </Button>
        )}

        {/* IMZO VA PECHAT — eng pastida */}
        <div className="flex gap-8 pt-3">
          {[
            { uz: "Berdim", ru: "Передал" },
            { uz: "Oldim", ru: "Принял" },
          ].map(s => (
            <div key={s.uz} className="flex-1">
              <div className="flex items-end gap-3">
                <span className="font-bold text-sm shrink-0">{s.uz} / {s.ru}</span>
                <div className="flex-1">
                  <div className="border-b border-black h-7" />
                  <div className="text-[9px] text-muted-foreground text-center mt-0.5">Imzo / Подпись</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* TUGMALAR */}
        <div className="flex justify-end gap-3 pt-3 border-t border-border no-print">
          <Button variant="outline" onClick={onClose} className="rounded-xl">
            {isViewMode ? "Yopish" : "Bekor qilish"}
          </Button>
          <Button onClick={handlePrint} variant="outline" className="rounded-xl gap-1">
            <Printer className="w-4 h-4" /> Chop etish
          </Button>
          {!isViewMode && (
            <Button onClick={handleSave} disabled={loading} className="rounded-xl bg-amber-600 hover:bg-amber-700 text-white gap-1">
              <FileText className="w-4 h-4" /> {loading ? "Saqlanmoqda..." : "Saqlash"}
            </Button>
          )}
        </div>
      </div>

      {/* PRINT STYLES */}
      <style>{`
        @media print {
          body, html { background: white !important; color: black !important; }
          body * { visibility: hidden !important; }
          #waybill-content, #waybill-content * { visibility: visible !important; color: black !important; }
          #waybill-content { position: absolute; left: 0; top: 0; width: 100%; background: white !important; padding: 10mm !important; }
          #waybill-content input, #waybill-content select { border: none !important; background: transparent !important; }
          #waybill-content .no-print { display: none !important; }
          @page { margin: 10mm; size: A4 portrait; }
        }
      `}</style>
    </Dialog>
  );
}

function CompanyAutocomplete({ value, phone, clients, onChange, placeholder }: {
  value: string;
  phone: string;
  clients: any[];
  onChange: (name: string, phone: string) => void;
  placeholder: string;
}) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setQuery(value); }, [value]);

  const filtered = useMemo(() => {
    if (!query.trim()) return clients.slice(0, 10);
    const q = query.toLowerCase();
    return clients.filter(c =>
      (c.name || "").toLowerCase().includes(q) ||
      (c.companyName || "").toLowerCase().includes(q) ||
      (c.phone || "").includes(q)
    ).slice(0, 10);
  }, [query, clients]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const select = (c: any) => {
    const name = c.companyName || c.name || "";
    const ph = c.phone || "";
    setQuery(name);
    setOpen(false);
    setHighlighted(-1);
    onChange(name, ph);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted(h => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted(h => Math.max(h - 1, 0));
    } else if (e.key === "Enter" && highlighted >= 0) {
      e.preventDefault();
      select(filtered[highlighted]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div ref={ref} className="relative flex-1">
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={e => { setQuery(e.target.value); setOpen(true); setHighlighted(-1); onChange(e.target.value, phone || ""); }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="flex h-10 w-[200px] rounded-xl border-2 border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-400/20 transition-all"
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-[60] top-full left-0 right-0 mt-1 bg-white border-2 border-border rounded-xl shadow-xl max-h-52 overflow-y-auto">
          {filtered.map((c, i) => (
            <button
              key={c.id}
              type="button"
              onMouseDown={e => { e.preventDefault(); select(c); }}
              className={`w-full text-left px-4 py-2.5 text-sm hover:bg-amber-50 transition-colors flex items-center justify-between ${
                i === highlighted ? "bg-amber-50" : ""
              }`}
            >
              <div>
                <div className="font-semibold">{c.companyName || c.name}</div>
                {c.phone && <div className="text-xs text-muted-foreground mt-0.5">{c.phone}</div>}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ProductAutocomplete({ value, products, inventory, onSelect, onChange }: {
  value: string;
  products: any[];
  inventory: any[];
  onSelect: (product: any) => void;
  onChange: (value: string) => void;
}) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setQuery(value); }, [value]);

  const filtered = useMemo(() => {
    if (!query.trim()) return products.slice(0, 8);
    const q = query.toLowerCase();
    return products.filter(p =>
      (p.name || "").toLowerCase().includes(q)
    ).slice(0, 8);
  }, [query, products]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const select = (p: any) => {
    setQuery(p.name);
    setOpen(false);
    setHighlighted(-1);
    onSelect(p);
    setTimeout(() => inputRef.current?.blur(), 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted(h => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted(h => Math.max(h - 1, 0));
    } else if (e.key === "Enter" && highlighted >= 0) {
      e.preventDefault();
      select(filtered[highlighted]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const getStock = (productId: number) => {
    const inv = inventory.find((i: any) => i.productId === productId);
    return inv ? Number(inv.quantity) || 0 : 0;
  };

  return (
    <div ref={ref} className="relative w-full">
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={e => { setQuery(e.target.value); onChange(e.target.value); setOpen(true); setHighlighted(-1); }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder="Mahsulot nomi"
        className="w-full bg-transparent text-xs px-1 py-1.5 outline-none border-b border-transparent focus:border-amber-400"
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-[60] top-full left-0 right-0 mt-1 bg-white border border-border rounded-lg shadow-xl max-h-40 overflow-y-auto">
          {filtered.map((p, i) => {
            const stock = getStock(p.id);
            return (
              <button
                key={p.id}
                type="button"
                onMouseDown={e => { e.preventDefault(); select(p); }}
                className={`w-full text-left px-3 py-1.5 text-xs hover:bg-amber-50 transition-colors ${
                  i === highlighted ? "bg-amber-50" : ""
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{p.name}</span>
                  <span className="text-muted-foreground">Ombor: {stock}</span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

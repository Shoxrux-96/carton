import { Router } from "express";
import { authMiddleware } from "../lib/auth.js";
import fs from "fs";
import path from "path";

const router = Router();
const COMPANY_FILE = path.join(process.cwd(), "company.json");

type Company = { id: number; name: string; owner: string; phone: string; address: string };

function rawFile(): any {
  try {
    if (fs.existsSync(COMPANY_FILE)) {
      return JSON.parse(fs.readFileSync(COMPANY_FILE, "utf-8"));
    }
  } catch {}
  return null;
}

export function loadCompanies(): Company[] {
  const raw = rawFile();
  if (!raw) return [];
  if (Array.isArray(raw.companies)) return raw.companies;
  // Eski format — yagona korxona
  if (raw.name || raw.owner || raw.phone || raw.address) {
    return [{
      id: 1,
      name: raw.name || "",
      owner: raw.owner || "",
      phone: raw.phone || "",
      address: raw.address || "",
    }];
  }
  return [];
}

function saveCompanies(companies: Company[]) {
  fs.writeFileSync(COMPANY_FILE, JSON.stringify({ companies }, null, 2));
}

function sanitize(body: any) {
  // Faqat body'da haqiqatan kelgan maydonlarni qaytaramiz —
  // aks holda qisman PUT bo'sh string bilan mavjud maydonlarni o'chirib yuboradi.
  const out: Partial<Company> = {};
  if (typeof body?.name === "string") out.name = body.name;
  if (typeof body?.owner === "string") out.owner = body.owner;
  if (typeof body?.phone === "string") out.phone = body.phone;
  if (typeof body?.address === "string") out.address = body.address;
  return out;
}

function parseId(raw: string | string[]): number {
  return parseInt(Array.isArray(raw) ? raw[0] ?? "" : raw);
}

router.get("/", authMiddleware, (_req, res) => {
  res.json({ companies: loadCompanies() });
});

router.post("/", authMiddleware, (req, res) => {
  const companies = loadCompanies();
  const fields = sanitize(req.body);
  const company: Company = {
    id: Date.now(),
    name: fields.name ?? "",
    owner: fields.owner ?? "",
    phone: fields.phone ?? "",
    address: fields.address ?? "",
  };
  companies.push(company);
  saveCompanies(companies);
  res.status(201).json(company);
});

router.put("/:id", authMiddleware, (req, res) => {
  const id = parseId(req.params.id);
  const companies = loadCompanies();
  const idx = companies.findIndex(c => c.id === id);
  if (idx < 0) {
    res.status(404).json({ error: "Korxona topilmadi" });
    return;
  }
  companies[idx] = { ...companies[idx], ...sanitize(req.body) };
  saveCompanies(companies);
  res.json(companies[idx]);
});

router.delete("/:id", authMiddleware, (req, res) => {
  const id = parseId(req.params.id);
  saveCompanies(loadCompanies().filter(c => c.id !== id));
  res.json({ success: true });
});

export default router;

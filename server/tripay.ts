import { and, asc, desc, eq, gte, sql } from "drizzle-orm";
import { db, pool } from "./db";
import { storage } from "./storage";
import { kasRwcoin, rwcoinTransaksi, rwcoinWallet, tripayCategory, tripayOperator, tripayProduct, tripayTransaction, warga } from "@shared/schema";

type TripayKind = "pulsa" | "data" | "electricity";
type TripayProductGroup =
  | "pulsa"
  | "data"
  | "electricity"
  | "game"
  | "ewallet"
  | "streaming"
  | "finance"
  | "voucher"
  | "other";

type TripayConfig = {
  apiKey: string;
  pin: string;
  callbackSecret: string;
  baseUrl: string;
  sandbox: boolean;
};

const SAFE_VISIBLE_GROUPS: TripayProductGroup[] = ["pulsa", "data", "electricity"];

function formatOperatorDisplayName(value?: string | null) {
  const normalized = String(value ?? "").trim();
  if (!normalized) return null;
  const map: Record<string, string> = {
    pln: "PLN",
    telkomsel: "Telkomsel",
    indosat: "Indosat",
    xl: "XL",
    axis: "AXIS",
    tri: "Tri",
    smartfren: "Smartfren",
    mobile_legends: "Mobile Legends",
    free_fire: "Free Fire",
    pubg: "PUBG",
    valorant: "Valorant",
    point_blank: "Point Blank",
    grab_driver: "Grab Driver",
    call_of_duty: "Call of Duty",
    roblox: "Roblox",
    genshin_impact: "Genshin Impact",
    aov: "AOV",
    google_play: "Google Play",
    steam: "Steam",
    gopay: "GoPay",
    ovo: "OVO",
    dana: "DANA",
    shopeepay: "ShopeePay",
    linkaja: "LinkAja",
  };
  if (map[normalized]) return map[normalized];
  return normalized
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function isGeneratedOperatorName(value?: string | null) {
  const name = String(value ?? "").trim();
  if (!name) return true;
  return /^operator\b/i.test(name) || /tidak dikenal/i.test(name);
}

function resolveTripayOperatorDisplayName(args: {
  operatorName?: string | null;
  operatorNormalized?: string | null;
  productName?: string | null;
  code?: string | null;
}) {
  const normalized = args.operatorNormalized
    ?? normalizeTripayOperator(args.operatorName, args.productName, args.code);
  const formattedFromNormalized = formatOperatorDisplayName(normalized);
  const rawOperatorName = String(args.operatorName ?? "").trim();

  if (formattedFromNormalized) return formattedFromNormalized;
  if (rawOperatorName && !isGeneratedOperatorName(rawOperatorName)) return rawOperatorName;
  return null;
}

function deriveCategoryMetaFromGroup(group: TripayProductGroup, fallbackName?: string | null) {
  if (fallbackName?.trim()) {
    return { name: fallbackName.trim(), type: normalizeCategoryType(fallbackName) || null };
  }
  switch (group) {
    case "electricity":
      return { name: "Token PLN", type: "PLN" };
    case "data":
      return { name: "Paket Data", type: "DATA" };
    case "pulsa":
      return { name: "Pulsa", type: "PULSA" };
    case "game":
      return { name: "Voucher Game", type: "GAME" };
    case "ewallet":
      return { name: "E-Wallet", type: "EWALLET" };
    case "streaming":
      return { name: "Streaming", type: "STREAMING" };
    case "finance":
      return { name: "Tagihan & Finansial", type: "FINANCE" };
    case "voucher":
      return { name: "Voucher", type: "VOUCHER" };
    default:
      return { name: "Produk Digital Lainnya", type: "OTHER" };
  }
}

function getTripayConfig(): TripayConfig {
  const apiKey = process.env.TRIPAY_API_KEY ?? "";
  const pin = process.env.TRIPAY_API_PIN ?? "";
  const callbackSecret = process.env.TRIPAY_CALLBACK_SECRET ?? "";
  const sandbox = process.env.TRIPAY_USE_SANDBOX === "true";
  const baseUrl = process.env.TRIPAY_BASE_URL ?? (sandbox ? "https://tripay.id/api-sandbox/v2" : "https://tripay.id/api/v2");

  return { apiKey, pin, callbackSecret, baseUrl, sandbox };
}

export function getTripayPublicConfig() {
  const cfg = getTripayConfig();
  return {
    isConfigured: Boolean(cfg.apiKey && cfg.pin && cfg.callbackSecret),
    sandbox: cfg.sandbox,
    baseUrl: cfg.baseUrl,
  };
}

function assertTripayConfigured() {
  const cfg = getTripayConfig();
  if (!cfg.apiKey || !cfg.pin || !cfg.callbackSecret) {
    throw new Error("Tripay belum dikonfigurasi. Isi TRIPAY_API_KEY, TRIPAY_API_PIN, dan TRIPAY_CALLBACK_SECRET.");
  }
  return cfg;
}

async function tripayRequest<T>(path: string, init?: { method?: "GET" | "POST"; body?: Record<string, string | number | undefined> }): Promise<T> {
  const cfg = assertTripayConfigured();
  const method = init?.method ?? "GET";
  const headers: Record<string, string> = {
    Accept: "application/json",
    Authorization: `Bearer ${cfg.apiKey}`,
  };
  let url = `${cfg.baseUrl}${path}`;
  let body: string | undefined;

  if (method === "GET" && init?.body) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(init.body)) {
      if (value != null && value !== "") params.append(key, String(value));
    }
    const qs = params.toString();
    if (qs) url += `?${qs}`;
  }

  if (method === "POST") {
    headers["Content-Type"] = "application/x-www-form-urlencoded";
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(init?.body ?? {})) {
      if (value != null && value !== "") params.append(key, String(value));
    }
    body = params.toString();
  }

  const response = await fetch(url, { method, headers, body });
  const json = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(json?.message ?? `Tripay error ${response.status}`);
  }
  return json as T;
}

function normalizeCategoryType(categoryType?: string | null) {
  return String(categoryType ?? "").trim().toUpperCase();
}

function normalizeTripayOperator(operatorName?: string | null, productName?: string | null, code?: string | null) {
  const op = String(operatorName ?? "").toLowerCase();
  const name = String(productName ?? "").toLowerCase();
  const cd = String(code ?? "").toLowerCase();
  const text = `${op} ${name} ${cd}`;

  if (text.includes("pln")) return "pln";
  if (text.includes("telkomsel") || text.includes("simpati") || text.includes("kartu as") || text.includes("halo") || text.includes("by.u") || text.includes("byu")) return "telkomsel";
  if (text.includes("indosat") || text.includes("im3") || text.includes("mentari") || text.includes("matrix") || text.includes("ooredoo")) return "indosat";
  if ((/\bxl\b/.test(text) || text.includes("xtra") || text.includes("xlsmart")) && !text.includes("axis")) return "xl";
  if (text.includes("axis")) return "axis";
  if (/\btri\b/.test(text) || text.includes("three") || text.includes("3 indonesia") || text.includes("hutch")) return "tri";
  if (text.includes("smartfren")) return "smartfren";
  if (text.includes("mobile legends") || text.includes("mobilelegend") || text.includes("mlbb")) return "mobile_legends";
  if (text.includes("free fire")) return "free_fire";
  if (text.includes("pubg")) return "pubg";
  if (text.includes("valorant")) return "valorant";
  if (text.includes("google play")) return "google_play";
  if (text.includes("steam")) return "steam";
  if (text.includes("point blank") || /\bpb\b/.test(text) || text.includes("pb cash")) return "point_blank";
  if (text.includes("grab driver") || text.includes("voucher grab driver") || text.includes("gbd")) return "grab_driver";
  if (text.includes("codm") || text.includes("call of duty")) return "call_of_duty";
  if (text.includes("roblox")) return "roblox";
  if (text.includes("genshin")) return "genshin_impact";
  if (text.includes("arena of valor") || /\baov\b/.test(text)) return "aov";
  if (text.includes("gopay")) return "gopay";
  if (text.includes("ovo")) return "ovo";
  if (text.includes("dana")) return "dana";
  if (text.includes("shopeepay")) return "shopeepay";
  if (text.includes("linkaja")) return "linkaja";
  return String(operatorName ?? "").trim().toLowerCase() || null;
}

export function classifyTripayProduct(args: {
  categoryName?: string | null;
  categoryType?: string | null;
  operatorName?: string | null;
  productName?: string | null;
  code?: string | null;
  description?: string | null;
}): { kind: TripayKind; productGroup: TripayProductGroup; operatorNormalized: string | null } {
  const cat = String(args.categoryName ?? "").toLowerCase();
  const catType = normalizeCategoryType(args.categoryType);
  const op = String(args.operatorName ?? "").toLowerCase();
  const name = String(args.productName ?? "").toLowerCase();
  const cd = String(args.code ?? "").toLowerCase();
  const desc = String(args.description ?? "").toLowerCase();
  const text = `${cat} ${op} ${name} ${cd} ${desc}`;
  const operatorNormalized = normalizeTripayOperator(args.operatorName, args.productName, args.code);

  if (catType === "PLN" || text.includes("token listrik") || text.includes("meter pln") || text.includes("id pelanggan")) {
    return { kind: "electricity", productGroup: "electricity", operatorNormalized };
  }

  if (catType === "GAME" || text.includes("voucher game") || text.includes("diamond") || text.includes("garena") || text.includes("mobile legends") || text.includes("free fire") || text.includes("pubg")) {
    return { kind: "pulsa", productGroup: "game", operatorNormalized };
  }

  if (text.includes("gopay") || text.includes("ovo") || text.includes("dana") || text.includes("shopeepay") || text.includes("linkaja")) {
    return { kind: "pulsa", productGroup: "ewallet", operatorNormalized };
  }

  if (text.includes("netflix") || text.includes("spotify") || text.includes("youtube") || text.includes("vidio") || text.includes("disney")) {
    return { kind: "pulsa", productGroup: "streaming", operatorNormalized };
  }

  if (text.includes("bpjs") || text.includes("pdam") || text.includes("multifinance") || text.includes("angsuran") || text.includes("asuransi")) {
    return { kind: "pulsa", productGroup: "finance", operatorNormalized };
  }

  const hasDataSignal = [
    "data", "internet", "paket data", "paket internet", "kuota", "unlimited",
    "4g", "5g", "lte", "flash", "combo", "bronet", "freedom", "yellow", "xtra combo",
  ].some((kw) => text.includes(kw))
    || /\b\d+(\.\d+)?\s?(gb|mb)\b/.test(text)
    || /\bmini ?pack\b/.test(text);
  if (hasDataSignal) {
    return { kind: "data", productGroup: "data", operatorNormalized };
  }

  const pulsaSignals = [
    "pulsa", "regular", "all operator", "transfer pulsa",
  ];
  if (catType === "PULSA" || pulsaSignals.some((kw) => text.includes(kw))) {
    return { kind: "pulsa", productGroup: "pulsa", operatorNormalized };
  }

  if (operatorNormalized && ["telkomsel", "indosat", "xl", "axis", "tri", "smartfren"].includes(operatorNormalized)) {
    return { kind: "pulsa", productGroup: "pulsa", operatorNormalized };
  }

  if (text.includes("voucher")) {
    return { kind: "pulsa", productGroup: "voucher", operatorNormalized };
  }

  return { kind: "pulsa", productGroup: "other", operatorNormalized };
}

// Daftar operator telco resmi (termasuk sub-brand) yang boleh masuk sebagai pulsa/data
const TELCO_OPERATORS = [
  // Telkomsel & sub-brand
  "telkomsel", "simpati", "kartu as", "kartu halo", "halo", "by.u", "byu",
  // Indosat Ooredoo & sub-brand
  "indosat", "im3", "im3 ooredoo", "indosat ooredoo", "ooredoo", "mentari", "matrix",
  // XL & sub-brand
  "xl axiata", "xl smart", "xlsmart", "xl", "xtra",
  // AXIS (anak usaha XL)
  "axis",
  // Tri / 3 / Hutchison
  "tri", "three", "3 indonesia", "hutch", "hutchison",
  // Smartfren
  "smartfren", "smart",
];

// Keyword produk NON-telco yang harus otomatis dinonaktifkan
const NON_TELCO_KEYWORDS = [
  // e-money & dompet digital
  "gopay", "ovo", "dana", "shopeepay", "linkaja", "tcash", "brizzi", "flazz",
  "jakcard", "emoney", "e-money", "mandiri e",
  // game voucher
  "game", "steam", "pubg", "mobile legend", "free fire", "garena", "codm",
  "point blank", "ragnarok", "higgs", "domino", "google play", "app store",
  "itunes", "roblox", "valorant", "genshin", "league of legend",
  // streaming / TV
  "netflix", "disney", "spotify", "youtube", "vidio", "mola", "viu",
  "usee", "vision+", "indovision", "top tv", "nexmedia", "k-vision",
  "transvision", "mnc vision",
  // lainnya
  "bpjs", "pdam", "multifinance", "kredit", "angsuran", "asuransi",
];

function shouldAutoActivate(args: {
  categoryName?: string | null;
  operatorName?: string | null;
  productName?: string | null;
  kind?: TripayKind;
  productGroup?: TripayProductGroup;
  operatorNormalized?: string | null;
}): boolean {
  if (args.productGroup === "electricity" || args.kind === "electricity") return true;
  if (args.productGroup !== "pulsa" && args.productGroup !== "data") return false;

  const text = [args.categoryName, args.operatorName, args.productName].filter(Boolean).join(" ").toLowerCase();

  // Cek apakah ada keyword non-telco di seluruh teks
  if (NON_TELCO_KEYWORDS.some(kw => text.includes(kw))) return false;

  if (args.operatorNormalized) {
    return ["telkomsel", "indosat", "xl", "axis", "tri", "smartfren", "pln"].includes(args.operatorNormalized);
  }

  // Untuk pulsa/data: cocokkan operator name ke daftar telco resmi
  if (args.operatorName) {
    const opLower = args.operatorName.toLowerCase();
    // Sub-brand khusus yang perlu exact atau prefix match agar tidak salah
    // "xl" bisa kecocok di "axle" — pakai word-boundary sederhana
    const isXl = /\bxl\b/.test(opLower) || opLower.includes("xlsmart") || opLower.includes("xl smart") || opLower.includes("xtra");
    const isAxis = opLower.includes("axis") && !isXl; // AXIS ≠ XL
    if (isXl || isAxis) return true;

    // Tri/3: cocok "tri" tapi tidak "tripay" atau "distribusi"
    const isTri = /\btri\b/.test(opLower) || opLower === "3" || opLower.includes("three") || opLower.includes("hutchison") || opLower.includes("hutch");
    if (isTri) return true;

    // Sisanya pakai contains match dari TELCO_OPERATORS
    if (TELCO_OPERATORS.some(op => op !== "xl" && op !== "axis" && op !== "tri" && opLower.includes(op))) return true;

    // Operator dikenal tapi tidak cocok satu pun → nonaktifkan
    return false;
  }

  // Tidak ada nama operator → nonaktifkan (aman)
  return false;
}

function makeReference(prefix: string) {
  return `${prefix}${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`.slice(0, 25);
}

function makeTripayPurchaseNote(productName: string, target: string, noMeterPln?: string | null) {
  if (noMeterPln) return `Tripay • ${productName} • HP ${target} • Meter ${noMeterPln}`;
  return `Tripay • ${productName} • ${target}`;
}

function deriveStatusDetail(status: string | number | null | undefined, note?: string | null) {
  const statusText = String(status ?? "").trim();
  const noteText = String(note ?? "").toLowerCase();

  if (statusText === "1" || statusText === "success") return "delivered";
  if (statusText === "2" || statusText === "3" || statusText === "refunded" || statusText === "failed") return "failed";
  if (noteText.includes("callback")) return "waiting_callback";
  if (noteText.includes("antri") || noteText.includes("queue")) return "queued";
  if (noteText.includes("proses")) return "processing";
  return "processing";
}

export async function ensureTripaySchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS tripay_category (
      id serial PRIMARY KEY,
      tripay_category_id integer NOT NULL UNIQUE,
      name text NOT NULL,
      type text,
      is_active boolean NOT NULL DEFAULT true,
      is_visible_to_warga boolean NOT NULL DEFAULT true,
      display_order integer NOT NULL DEFAULT 0,
      icon_key text,
      admin_label text,
      synced_at timestamp DEFAULT now(),
      updated_at timestamp DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS tripay_operator (
      id serial PRIMARY KEY,
      tripay_operator_id integer NOT NULL UNIQUE,
      tripay_category_id integer,
      category_ref_id integer REFERENCES tripay_category(id),
      name text NOT NULL,
      normalized_name text,
      is_active boolean NOT NULL DEFAULT true,
      is_visible_to_warga boolean NOT NULL DEFAULT true,
      display_order integer NOT NULL DEFAULT 0,
      synced_at timestamp DEFAULT now(),
      updated_at timestamp DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS tripay_product (
      id serial PRIMARY KEY,
      kind text NOT NULL,
      category_id integer,
      category_name text,
      category_type text,
      category_ref_id integer REFERENCES tripay_category(id),
      operator_id integer,
      operator_name text,
      operator_ref_id integer REFERENCES tripay_operator(id),
      operator_normalized text,
      product_group text NOT NULL DEFAULT 'other',
      product_code text NOT NULL UNIQUE,
      product_name text NOT NULL,
      harga_modal integer NOT NULL,
      margin_flat integer NOT NULL DEFAULT 0,
      is_active boolean NOT NULL DEFAULT true,
      is_visible_to_warga boolean NOT NULL DEFAULT true,
      is_featured boolean NOT NULL DEFAULT false,
      is_recommended boolean NOT NULL DEFAULT false,
      display_order integer NOT NULL DEFAULT 0,
      sales_count integer NOT NULL DEFAULT 0,
      last_sold_at timestamp,
      hidden_reason text,
      admin_note text,
      tripay_status integer NOT NULL DEFAULT 1,
      raw_data jsonb,
      synced_at timestamp DEFAULT now(),
      updated_at timestamp DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS tripay_transaction (
      id serial PRIMARY KEY,
      reference text NOT NULL UNIQUE,
      tripay_trx_id integer,
      warga_id integer NOT NULL REFERENCES warga(id),
      rwcoin_transaksi_id integer NOT NULL REFERENCES rwcoin_transaksi(id),
      refunded_rwcoin_transaksi_id integer REFERENCES rwcoin_transaksi(id),
      product_id integer REFERENCES tripay_product(id),
      kind text NOT NULL,
      category_ref_id integer REFERENCES tripay_category(id),
      category_name_snapshot text,
      category_type_snapshot text,
      operator_ref_id integer REFERENCES tripay_operator(id),
      operator_name_snapshot text,
      operator_normalized_snapshot text,
      product_group_snapshot text,
      product_code text NOT NULL,
      product_name text NOT NULL,
      target text NOT NULL,
      no_meter_pln text,
      harga_modal integer NOT NULL,
      margin_flat integer NOT NULL DEFAULT 0,
      harga_jual integer NOT NULL,
      status text NOT NULL DEFAULT 'pending',
      status_detail text DEFAULT 'queued',
      tripay_status integer NOT NULL DEFAULT 0,
      note text,
      failure_reason text,
      admin_note text,
      source_channel text NOT NULL DEFAULT 'warga_web',
      reconcile_count integer NOT NULL DEFAULT 0,
      last_reconcile_at timestamp,
      finalized_at timestamp,
      serial_number text,
      request_payload jsonb,
      response_payload jsonb,
      callback_payload jsonb,
      success_at timestamp,
      failed_at timestamp,
      refunded_at timestamp,
      created_at timestamp DEFAULT now(),
      updated_at timestamp DEFAULT now()
    );

    ALTER TABLE tripay_category ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
    ALTER TABLE tripay_category ADD COLUMN IF NOT EXISTS is_visible_to_warga boolean NOT NULL DEFAULT true;
    ALTER TABLE tripay_category ADD COLUMN IF NOT EXISTS display_order integer NOT NULL DEFAULT 0;
    ALTER TABLE tripay_category ADD COLUMN IF NOT EXISTS icon_key text;
    ALTER TABLE tripay_category ADD COLUMN IF NOT EXISTS admin_label text;
    ALTER TABLE tripay_category ADD COLUMN IF NOT EXISTS synced_at timestamp DEFAULT now();
    ALTER TABLE tripay_category ADD COLUMN IF NOT EXISTS updated_at timestamp DEFAULT now();

    ALTER TABLE tripay_operator ADD COLUMN IF NOT EXISTS tripay_category_id integer;
    ALTER TABLE tripay_operator ADD COLUMN IF NOT EXISTS category_ref_id integer REFERENCES tripay_category(id);
    ALTER TABLE tripay_operator ADD COLUMN IF NOT EXISTS normalized_name text;
    ALTER TABLE tripay_operator ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
    ALTER TABLE tripay_operator ADD COLUMN IF NOT EXISTS is_visible_to_warga boolean NOT NULL DEFAULT true;
    ALTER TABLE tripay_operator ADD COLUMN IF NOT EXISTS display_order integer NOT NULL DEFAULT 0;
    ALTER TABLE tripay_operator ADD COLUMN IF NOT EXISTS synced_at timestamp DEFAULT now();
    ALTER TABLE tripay_operator ADD COLUMN IF NOT EXISTS updated_at timestamp DEFAULT now();

    ALTER TABLE tripay_product ADD COLUMN IF NOT EXISTS category_ref_id integer REFERENCES tripay_category(id);
    ALTER TABLE tripay_product ADD COLUMN IF NOT EXISTS operator_ref_id integer REFERENCES tripay_operator(id);
    ALTER TABLE tripay_product ADD COLUMN IF NOT EXISTS is_visible_to_warga boolean NOT NULL DEFAULT true;
    ALTER TABLE tripay_product ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false;
    ALTER TABLE tripay_product ADD COLUMN IF NOT EXISTS is_recommended boolean NOT NULL DEFAULT false;
    ALTER TABLE tripay_product ADD COLUMN IF NOT EXISTS display_order integer NOT NULL DEFAULT 0;
    ALTER TABLE tripay_product ADD COLUMN IF NOT EXISTS sales_count integer NOT NULL DEFAULT 0;
    ALTER TABLE tripay_product ADD COLUMN IF NOT EXISTS last_sold_at timestamp;
    ALTER TABLE tripay_product ADD COLUMN IF NOT EXISTS hidden_reason text;
    ALTER TABLE tripay_product ADD COLUMN IF NOT EXISTS admin_note text;
    ALTER TABLE tripay_product ADD COLUMN IF NOT EXISTS category_type text;
    ALTER TABLE tripay_product ADD COLUMN IF NOT EXISTS operator_normalized text;
    ALTER TABLE tripay_product ADD COLUMN IF NOT EXISTS product_group text NOT NULL DEFAULT 'other';

    ALTER TABLE tripay_transaction ADD COLUMN IF NOT EXISTS status_detail text DEFAULT 'queued';
    ALTER TABLE tripay_transaction ADD COLUMN IF NOT EXISTS failure_reason text;
    ALTER TABLE tripay_transaction ADD COLUMN IF NOT EXISTS admin_note text;
    ALTER TABLE tripay_transaction ADD COLUMN IF NOT EXISTS source_channel text NOT NULL DEFAULT 'warga_web';
    ALTER TABLE tripay_transaction ADD COLUMN IF NOT EXISTS reconcile_count integer NOT NULL DEFAULT 0;
    ALTER TABLE tripay_transaction ADD COLUMN IF NOT EXISTS last_reconcile_at timestamp;
    ALTER TABLE tripay_transaction ADD COLUMN IF NOT EXISTS finalized_at timestamp;
    ALTER TABLE tripay_transaction ADD COLUMN IF NOT EXISTS category_ref_id integer REFERENCES tripay_category(id);
    ALTER TABLE tripay_transaction ADD COLUMN IF NOT EXISTS category_name_snapshot text;
    ALTER TABLE tripay_transaction ADD COLUMN IF NOT EXISTS category_type_snapshot text;
    ALTER TABLE tripay_transaction ADD COLUMN IF NOT EXISTS operator_ref_id integer REFERENCES tripay_operator(id);
    ALTER TABLE tripay_transaction ADD COLUMN IF NOT EXISTS operator_name_snapshot text;
    ALTER TABLE tripay_transaction ADD COLUMN IF NOT EXISTS operator_normalized_snapshot text;
    ALTER TABLE tripay_transaction ADD COLUMN IF NOT EXISTS product_group_snapshot text;
  `);
}

export async function syncTripayProducts() {
  const [categoryRes, operatorRes, productRes] = await Promise.all([
    tripayRequest<any>("/pembelian/category"),
    tripayRequest<any>("/pembelian/operator"),
    tripayRequest<any>("/pembelian/produk"),
  ]);

  const existingCategories = await db.select().from(tripayCategory);
  const existingOperators = await db.select().from(tripayOperator);
  const existing = await db.select().from(tripayProduct);

  const existingCategoryByRemoteId = new Map(existingCategories.map((row) => [row.tripayCategoryId, row]));
  const existingOperatorByRemoteId = new Map(existingOperators.map((row) => [row.tripayOperatorId, row]));
  const existingMap = new Map(existing.map((row) => [row.productCode, row]));
  const categoryLocalMap = new Map<number, typeof existingCategories[number]>();
  const operatorLocalMap = new Map<number, typeof existingOperators[number]>();

  let insertedCategories = 0;
  let updatedCategories = 0;
  let insertedOperators = 0;
  let updatedOperators = 0;

  for (const item of categoryRes?.data ?? []) {
    const remoteId = Number(item.id);
    if (!remoteId) continue;
    const name = String(item.category_name ?? item.product_name ?? item.name ?? "").trim();
    const type = item.type != null ? String(item.type) : null;
    const prev = existingCategoryByRemoteId.get(remoteId);
    const shouldVisible = ["PULSA", "DATA", "PLN"].includes(normalizeCategoryType(type));
    if (prev) {
      const [row] = await db.update(tripayCategory).set({
        name,
        type,
        isActive: prev.isActive,
        isVisibleToWarga: prev.isVisibleToWarga,
        syncedAt: new Date(),
        updatedAt: new Date(),
      }).where(eq(tripayCategory.id, prev.id)).returning();
      if (row) categoryLocalMap.set(remoteId, row);
      updatedCategories += 1;
    } else {
      const [row] = await db.insert(tripayCategory).values({
        tripayCategoryId: remoteId,
        name,
        type,
        isActive: true,
        isVisibleToWarga: shouldVisible,
        displayOrder: insertedCategories,
        syncedAt: new Date(),
        updatedAt: new Date(),
      }).returning();
      if (row) categoryLocalMap.set(remoteId, row);
      insertedCategories += 1;
    }
  }

  for (const item of operatorRes?.data ?? []) {
    const remoteId = Number(item.id);
    if (!remoteId) continue;
    const remoteCategoryId = item.pembeliankategori_id != null ? Number(item.pembeliankategori_id) : null;
    const linkedCategory = remoteCategoryId != null ? categoryLocalMap.get(remoteCategoryId) ?? existingCategoryByRemoteId.get(remoteCategoryId) ?? null : null;
    const name = String(item.operator_name ?? item.name ?? "").trim();
    const normalizedName = normalizeTripayOperator(name);
    const prev = existingOperatorByRemoteId.get(remoteId);
    const shouldVisible = linkedCategory ? Boolean(linkedCategory.isVisibleToWarga) : SAFE_VISIBLE_GROUPS.includes(classifyTripayProduct({ operatorName: name }).productGroup);
    if (prev) {
      const [row] = await db.update(tripayOperator).set({
        tripayCategoryId: remoteCategoryId,
        categoryRefId: linkedCategory?.id ?? prev.categoryRefId ?? null,
        name,
        normalizedName: prev.normalizedName ?? normalizedName,
        isActive: prev.isActive,
        isVisibleToWarga: prev.isVisibleToWarga,
        syncedAt: new Date(),
        updatedAt: new Date(),
      }).where(eq(tripayOperator.id, prev.id)).returning();
      if (row) operatorLocalMap.set(remoteId, row);
      updatedOperators += 1;
    } else {
      const [row] = await db.insert(tripayOperator).values({
        tripayOperatorId: remoteId,
        tripayCategoryId: remoteCategoryId,
        categoryRefId: linkedCategory?.id ?? null,
        name,
        normalizedName,
        isActive: true,
        isVisibleToWarga: shouldVisible,
        displayOrder: insertedOperators,
        syncedAt: new Date(),
        updatedAt: new Date(),
      }).returning();
      if (row) operatorLocalMap.set(remoteId, row);
      insertedOperators += 1;
    }
  }

  let inserted = 0;
  let updated = 0;

  for (const item of productRes?.data ?? []) {
    const productCode = String(item.code ?? "").trim().toUpperCase();
    if (!productCode) continue;

    const categoryId = item.pembeliankategori_id != null ? Number(item.pembeliankategori_id) : null;
    const operatorId = item.pembelianoperator_id != null ? Number(item.pembelianoperator_id) : null;
    const categoryRow = categoryId != null ? categoryLocalMap.get(categoryId) ?? existingCategoryByRemoteId.get(categoryId) ?? null : null;
    const operatorRow = operatorId != null ? operatorLocalMap.get(operatorId) ?? existingOperatorByRemoteId.get(operatorId) ?? null : null;
    const categoryName = categoryRow?.name ?? null;
    const categoryType = categoryRow?.type ?? null;
    const operatorName = operatorRow?.name ?? null;
    const productName = String(item.product_name ?? item.nama_produk ?? productCode);
    const description = String(item.desc ?? item.description ?? "");
    const classified = classifyTripayProduct({
      categoryName,
      categoryType,
      operatorName,
      productName,
      code: productCode,
      description,
    });
    const kind = classified.kind;
    const hargaModal = Number(item.price ?? 0);
    const tripayStatusNum = Number(item.status ?? 0);
    const prev = existingMap.get(productCode);

    const payload = {
      kind,
      categoryId,
      categoryName,
      categoryType,
      categoryRefId: categoryRow?.id ?? null,
      operatorId,
      operatorName,
      operatorRefId: operatorRow?.id ?? null,
      operatorNormalized: classified.operatorNormalized,
      productGroup: classified.productGroup,
      productCode,
      productName,
      hargaModal,
      tripayStatus: tripayStatusNum,
      rawData: item,
      syncedAt: new Date(),
      updatedAt: new Date(),
    };

    const autoActive = tripayStatusNum === 1 && shouldAutoActivate({
      categoryName,
      operatorName,
      productName,
      kind,
      productGroup: classified.productGroup,
      operatorNormalized: classified.operatorNormalized,
    });
    const visibleByStructure = Boolean(categoryRow?.isVisibleToWarga) && (!operatorRow || operatorRow.isVisibleToWarga) && SAFE_VISIBLE_GROUPS.includes(classified.productGroup);

    if (prev) {
      const newIsActive = prev.isActive && autoActive ? true : autoActive ? prev.isActive : false;
      await db.update(tripayProduct).set({
        ...payload,
        isActive: newIsActive,
        isVisibleToWarga: Boolean(prev.isVisibleToWarga) && visibleByStructure,
        hiddenReason: autoActive ? prev.hiddenReason : (prev.hiddenReason ?? "auto_filtered"),
      }).where(eq(tripayProduct.id, prev.id));
      updated += 1;
    } else {
      await db.insert(tripayProduct).values({
        ...payload,
        marginFlat: 0,
        isActive: autoActive,
        isVisibleToWarga: visibleByStructure,
        hiddenReason: autoActive ? null : "auto_filtered",
      });
      inserted += 1;
    }
  }

  return {
    insertedCategories,
    updatedCategories,
    insertedOperators,
    updatedOperators,
    inserted,
    updated,
    totalRemote: (productRes?.data ?? []).length,
  };
}

async function backfillTripayCatalogMastersFromProducts() {
  await ensureTripaySchema();
  const categories = await db.select().from(tripayCategory);
  const operators = await db.select().from(tripayOperator);
  if (categories.length > 0 && operators.length > 0) return;

  const products = await db.select().from(tripayProduct).orderBy(
    asc(tripayProduct.categoryName),
    asc(tripayProduct.operatorName),
    asc(tripayProduct.productName),
  );
  if (products.length === 0) return;

  const categoryByRemoteId = new Map<number, any>();
  const categoryBySignature = new Map<string, any>();
  const operatorByRemoteId = new Map<number, any>();
  const operatorBySignature = new Map<string, any>();

  for (const row of categories) {
    categoryByRemoteId.set(row.tripayCategoryId, row);
    categoryBySignature.set(`${row.name}::${row.type ?? ""}`, row);
  }
  for (const row of operators) {
    operatorByRemoteId.set(row.tripayOperatorId, row);
    operatorBySignature.set(`${row.name}::${row.tripayCategoryId ?? 0}`, row);
  }

  let nextSyntheticCategoryId = -1;
  let nextSyntheticOperatorId = -1;
  const categoryBuckets = new Map<number, Array<typeof products[number]>>();
  const operatorBuckets = new Map<number, Array<typeof products[number]>>();

  for (const product of products) {
    const categoryKey = product.categoryId ?? nextSyntheticCategoryId - product.id;
    const operatorKey = product.operatorId ?? nextSyntheticOperatorId - product.id;
    if (!categoryBuckets.has(categoryKey)) categoryBuckets.set(categoryKey, []);
    if (!operatorBuckets.has(operatorKey)) operatorBuckets.set(operatorKey, []);
    categoryBuckets.get(categoryKey)!.push(product);
    operatorBuckets.get(operatorKey)!.push(product);
  }

  for (const product of products) {
    const classified = classifyTripayProduct({
      categoryName: product.categoryName,
      categoryType: product.categoryType,
      operatorName: product.operatorName,
      productName: product.productName,
      code: product.productCode,
    });
    const bucketCategoryProducts = categoryBuckets.get(product.categoryId ?? nextSyntheticCategoryId - product.id) ?? [product];
    const dominantGroup = bucketCategoryProducts.reduce((map, row) => {
      const rowGroup = classifyTripayProduct({
        categoryName: row.categoryName,
        categoryType: row.categoryType,
        operatorName: row.operatorName,
        productName: row.productName,
        code: row.productCode,
      }).productGroup;
      map.set(rowGroup, (map.get(rowGroup) ?? 0) + 1);
      return map;
    }, new Map<TripayProductGroup, number>());
    const dominantCategoryGroup = Array.from(dominantGroup.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? classified.productGroup;
    const categoryMeta = deriveCategoryMetaFromGroup(dominantCategoryGroup, product.categoryName);
    const categoryName = categoryMeta.name;
    const categoryType = product.categoryType?.trim() || categoryMeta.type || null;
    let categoryRow = product.categoryId != null ? categoryByRemoteId.get(product.categoryId) ?? null : null;
    if (!categoryRow && categoryName) {
      categoryRow = categoryBySignature.get(`${categoryName}::${categoryType ?? ""}`) ?? null;
    }
    if (!categoryRow && categoryName) {
      const shouldVisible = SAFE_VISIBLE_GROUPS.includes(dominantCategoryGroup);
      const [insertedCategory] = await db.insert(tripayCategory).values({
        tripayCategoryId: product.categoryId ?? nextSyntheticCategoryId--,
        name: categoryName,
        type: categoryType,
        isActive: true,
        isVisibleToWarga: shouldVisible,
        syncedAt: new Date(),
        updatedAt: new Date(),
      }).returning();
      categoryRow = insertedCategory;
      categoryByRemoteId.set(insertedCategory.tripayCategoryId, insertedCategory);
      categoryBySignature.set(`${insertedCategory.name}::${insertedCategory.type ?? ""}`, insertedCategory);
    }

    const bucketOperatorProducts = operatorBuckets.get(product.operatorId ?? nextSyntheticOperatorId - product.id) ?? [product];
    const operatorNormalized = product.operatorNormalized
      ?? classified.operatorNormalized
      ?? bucketOperatorProducts.map((row) => classifyTripayProduct({
        categoryName: row.categoryName,
        categoryType: row.categoryType,
        operatorName: row.operatorName,
        productName: row.productName,
        code: row.productCode,
      }).operatorNormalized).find(Boolean)
      ?? null;
    const operatorName = resolveTripayOperatorDisplayName({
      operatorName: product.operatorName,
      operatorNormalized,
      productName: product.productName,
      code: product.productCode,
    }) || `Operator ${product.operatorId ?? product.id}`;
    let operatorRow = product.operatorId != null ? operatorByRemoteId.get(product.operatorId) ?? null : null;
    if (!operatorRow && operatorName) {
      const categoryRemoteId = categoryRow?.tripayCategoryId ?? product.categoryId ?? 0;
      operatorRow = operatorBySignature.get(`${operatorName}::${categoryRemoteId}`) ?? null;
    }
    if (!operatorRow && operatorName) {
      const [insertedOperator] = await db.insert(tripayOperator).values({
        tripayOperatorId: product.operatorId ?? nextSyntheticOperatorId--,
        tripayCategoryId: categoryRow?.tripayCategoryId ?? product.categoryId ?? null,
        categoryRefId: categoryRow?.id ?? null,
        name: operatorName,
        normalizedName: operatorNormalized ?? normalizeTripayOperator(operatorName, product.productName, product.productCode),
        isActive: true,
        isVisibleToWarga: Boolean(categoryRow?.isVisibleToWarga) && SAFE_VISIBLE_GROUPS.includes(classified.productGroup),
        syncedAt: new Date(),
        updatedAt: new Date(),
      }).returning();
      operatorRow = insertedOperator;
      operatorByRemoteId.set(insertedOperator.tripayOperatorId, insertedOperator);
      operatorBySignature.set(`${insertedOperator.name}::${insertedOperator.tripayCategoryId ?? 0}`, insertedOperator);
    }

    const needsUpdate = product.categoryRefId !== (categoryRow?.id ?? null)
      || product.operatorRefId !== (operatorRow?.id ?? null);
    const needsMetadataUpdate = !product.categoryName || !product.operatorName || !product.operatorNormalized || product.productGroup === "other";
    if (needsUpdate || needsMetadataUpdate) {
      await db.update(tripayProduct).set({
        kind: classified.kind,
        categoryName,
        categoryType,
        categoryRefId: categoryRow?.id ?? null,
        operatorName,
        operatorRefId: operatorRow?.id ?? null,
        operatorNormalized: operatorNormalized ?? null,
        productGroup: classified.productGroup,
        isVisibleToWarga: SAFE_VISIBLE_GROUPS.includes(classified.productGroup) && Boolean(categoryRow?.isVisibleToWarga) && Boolean(operatorRow?.isVisibleToWarga ?? true),
        updatedAt: new Date(),
      }).where(eq(tripayProduct.id, product.id));
    }
  }
}

export async function listTripayProducts(kind?: TripayKind, includeInactive = false) {
  const rows = await db.select().from(tripayProduct).orderBy(
    tripayProduct.kind,
    tripayProduct.displayOrder,
    tripayProduct.operatorName,
    tripayProduct.hargaModal,
  );
  return rows
    .filter((row) => !kind || row.kind === kind)
    .filter((row) => includeInactive || (row.isActive && row.tripayStatus === 1))
    .sort((a, b) => {
      const featuredScoreA = a.isFeatured ? 1 : 0;
      const featuredScoreB = b.isFeatured ? 1 : 0;
      if (featuredScoreA !== featuredScoreB) return featuredScoreB - featuredScoreA;

      const recommendedScoreA = a.isRecommended ? 1 : 0;
      const recommendedScoreB = b.isRecommended ? 1 : 0;
      if (recommendedScoreA !== recommendedScoreB) return recommendedScoreB - recommendedScoreA;

      const displayOrderA = a.displayOrder ?? 0;
      const displayOrderB = b.displayOrder ?? 0;
      if (displayOrderA !== displayOrderB) return displayOrderA - displayOrderB;

      const salesCountA = a.salesCount ?? 0;
      const salesCountB = b.salesCount ?? 0;
      if (salesCountA !== salesCountB) return salesCountB - salesCountA;

      return (a.hargaModal ?? 0) - (b.hargaModal ?? 0);
    })
    .map((row) => ({
      ...row,
      operatorName: resolveTripayOperatorDisplayName({
        operatorName: row.operatorName,
        operatorNormalized: row.operatorNormalized,
        productName: row.productName,
        code: row.productCode,
      }) || row.operatorName,
      hargaJual: row.hargaModal + (row.marginFlat ?? 0),
    }));
}

export async function listTripayCategories() {
  await backfillTripayCatalogMastersFromProducts();
  const categories = await db.select().from(tripayCategory).orderBy(
    asc(tripayCategory.displayOrder),
    asc(tripayCategory.name),
  );
  const operators = await db.select().from(tripayOperator);
  const products = await db.select().from(tripayProduct);

  return categories.map((category) => {
    const operatorCount = operators.filter((row) => row.categoryRefId === category.id).length;
    const productCount = products.filter((row) => row.categoryRefId === category.id).length;
    const activeProductCount = products.filter((row) => row.categoryRefId === category.id && row.isActive).length;
    return {
      ...category,
      operatorCount,
      productCount,
      activeProductCount,
    };
  });
}

export async function updateTripayCategorySetting(id: number, data: {
  isActive?: boolean;
  isVisibleToWarga?: boolean;
  displayOrder?: number;
  iconKey?: string | null;
  adminLabel?: string | null;
}) {
  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if (data.isActive != null) patch.isActive = data.isActive;
  if (data.isVisibleToWarga != null) patch.isVisibleToWarga = data.isVisibleToWarga;
  if (data.displayOrder != null) patch.displayOrder = Math.max(0, data.displayOrder);
  if (data.iconKey !== undefined) patch.iconKey = data.iconKey?.trim() || null;
  if (data.adminLabel !== undefined) patch.adminLabel = data.adminLabel?.trim() || null;
  const [row] = await db.update(tripayCategory).set(patch).where(eq(tripayCategory.id, id)).returning();
  if (!row) throw new Error("Kategori Tripay tidak ditemukan");
  return row;
}

export async function listTripayOperators(categoryRefId?: number) {
  await backfillTripayCatalogMastersFromProducts();
  const operators = await db.select().from(tripayOperator).orderBy(
    asc(tripayOperator.displayOrder),
    asc(tripayOperator.name),
  );
  const categories = await db.select().from(tripayCategory);
  const products = await db.select().from(tripayProduct);
  const categoryMap = new Map(categories.map((row) => [row.id, row]));

  return operators
    .filter((row) => !categoryRefId || row.categoryRefId === categoryRefId)
    .map((row) => ({
      ...row,
      name: resolveTripayOperatorDisplayName({
        operatorName: row.name,
        operatorNormalized: row.normalizedName,
      }) || row.name,
      categoryName: row.categoryRefId ? categoryMap.get(row.categoryRefId)?.name ?? null : null,
      productCount: products.filter((product) => product.operatorRefId === row.id).length,
      activeProductCount: products.filter((product) => product.operatorRefId === row.id && product.isActive).length,
    }));
}

export async function updateTripayOperatorSetting(id: number, data: {
  isActive?: boolean;
  isVisibleToWarga?: boolean;
  displayOrder?: number;
  normalizedName?: string | null;
}) {
  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if (data.isActive != null) patch.isActive = data.isActive;
  if (data.isVisibleToWarga != null) patch.isVisibleToWarga = data.isVisibleToWarga;
  if (data.displayOrder != null) patch.displayOrder = Math.max(0, data.displayOrder);
  if (data.normalizedName !== undefined) patch.normalizedName = data.normalizedName?.trim() || null;
  const [row] = await db.update(tripayOperator).set(patch).where(eq(tripayOperator.id, id)).returning();
  if (!row) throw new Error("Operator Tripay tidak ditemukan");
  return row;
}

export async function listTripayCatalogCategoriesForWarga() {
  await backfillTripayCatalogMastersFromProducts();
  const rows = await db.select().from(tripayCategory).orderBy(
    asc(tripayCategory.displayOrder),
    asc(tripayCategory.name),
  );
  const products = await db.select().from(tripayProduct);
  return rows
    .filter((row) => row.isActive && row.isVisibleToWarga)
    .map((row) => ({
      ...row,
      label: row.adminLabel?.trim() || row.name,
      productCount: products.filter((product) => product.categoryRefId === row.id && product.isActive && product.isVisibleToWarga && product.tripayStatus === 1).length,
    }))
    .filter((row) => row.productCount > 0);
}

export async function listTripayCatalogOperatorsForWarga(categoryRefId: number) {
  await backfillTripayCatalogMastersFromProducts();
  const categoryRows = await db.select().from(tripayCategory).where(eq(tripayCategory.id, categoryRefId));
  const category = categoryRows[0];
  if (!category || !category.isActive || !category.isVisibleToWarga) return [];

  const operators = await db.select().from(tripayOperator).where(eq(tripayOperator.categoryRefId, categoryRefId)).orderBy(
    asc(tripayOperator.displayOrder),
    asc(tripayOperator.name),
  );
  const products = await db.select().from(tripayProduct);

  return operators
    .filter((row) => row.isActive && row.isVisibleToWarga)
    .map((row) => ({
      ...row,
      name: resolveTripayOperatorDisplayName({
        operatorName: row.name,
        operatorNormalized: row.normalizedName,
      }) || row.name,
      productCount: products.filter((product) => product.operatorRefId === row.id && product.isActive && product.isVisibleToWarga && product.tripayStatus === 1).length,
    }))
    .filter((row) => row.productCount > 0);
}

export async function listTripayCatalogProductsForWarga(args: { categoryRefId: number; operatorRefId?: number | null }) {
  await backfillTripayCatalogMastersFromProducts();
  const rows = await listTripayProducts(undefined, false);
  return rows
    .filter((row) => row.categoryRefId === args.categoryRefId)
    .filter((row) => !args.operatorRefId || row.operatorRefId === args.operatorRefId)
    .filter((row) => row.isVisibleToWarga);
}

export async function updateTripayProductSetting(id: number, data: {
  marginFlat?: number;
  isActive?: boolean;
  isVisibleToWarga?: boolean;
  isFeatured?: boolean;
  isRecommended?: boolean;
  displayOrder?: number;
  adminNote?: string | null;
  kind?: TripayKind;
  productGroup?: string | null;
  operatorNormalized?: string | null;
}) {
  const [current] = await db.select().from(tripayProduct).where(eq(tripayProduct.id, id));
  if (!current) throw new Error("Produk Tripay tidak ditemukan");

  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if (data.marginFlat != null) patch.marginFlat = Math.max(0, data.marginFlat);
  if (data.isActive != null) {
    patch.isActive = data.isActive;
    patch.hiddenReason = data.isActive ? null : "manual_hidden";
  }
  if (data.isVisibleToWarga != null) patch.isVisibleToWarga = data.isVisibleToWarga;
  if (data.isFeatured != null) patch.isFeatured = data.isFeatured;
  if (data.isRecommended != null) patch.isRecommended = data.isRecommended;
  if (data.displayOrder != null) patch.displayOrder = Math.max(0, data.displayOrder);
  if (data.adminNote !== undefined) patch.adminNote = data.adminNote?.trim() || null;
  if (data.kind != null) patch.kind = data.kind;
  if (data.productGroup !== undefined) patch.productGroup = data.productGroup?.trim() || "other";
  if (data.operatorNormalized !== undefined) {
    const operatorNormalized = data.operatorNormalized?.trim() || null;
    patch.operatorNormalized = operatorNormalized;
    const resolvedName = resolveTripayOperatorDisplayName({
      operatorName: current.operatorName,
      operatorNormalized,
      productName: current.productName,
      code: current.productCode,
    });
    if (resolvedName) patch.operatorName = resolvedName;
  }
  const [row] = await db.update(tripayProduct).set(patch).where(eq(tripayProduct.id, id)).returning();
  return row;
}

export async function bulkUpdateTripayProducts(args: {
  marginFlat: number;
  kind?: TripayKind;
  operatorName?: string;
  isActive?: boolean;
}) {
  const rows = await db.select().from(tripayProduct).orderBy(tripayProduct.id);
  const matched = rows.filter((row) =>
    (!args.kind || row.kind === args.kind) &&
    (!args.operatorName || row.operatorName === args.operatorName)
  );

  if (matched.length === 0) {
    return { matched: 0, updated: 0 };
  }

  const marginFlat = Math.max(0, args.marginFlat);
  let updated = 0;
  for (const row of matched) {
    await db.update(tripayProduct).set({
      marginFlat,
      ...(args.isActive != null ? { isActive: args.isActive } : {}),
      updatedAt: new Date(),
    }).where(eq(tripayProduct.id, row.id));
    updated += 1;
  }

  return { matched: matched.length, updated };
}

async function getTripayDetailByReference(reference: string) {
  return tripayRequest<any>("/histori/transaksi/detail", {
    method: "POST",
    body: { api_trxid: reference },
  });
}

async function markTripaySuccess(reference: string, payload: any) {
  const [trx] = await db.select().from(tripayTransaction).where(eq(tripayTransaction.reference, reference));
  if (!trx) throw new Error("Transaksi Tripay tidak ditemukan");
  if (trx.status === "success") return trx;

  await db.transaction(async (tx) => {
    await tx.update(tripayTransaction).set({
      tripayTrxId: payload.trxid ? Number(payload.trxid) : trx.tripayTrxId,
      status: "success",
      statusDetail: deriveStatusDetail("success", payload.note),
      tripayStatus: Number(payload.status ?? 1),
      note: String(payload.note ?? trx.note ?? ""),
      failureReason: null,
      serialNumber: String(payload.token ?? trx.serialNumber ?? ""),
      callbackPayload: payload,
      responsePayload: payload,
      successAt: new Date(),
      finalizedAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(tripayTransaction.id, trx.id));

    if (trx.productId) {
      await tx.update(tripayProduct).set({
        salesCount: sql`${tripayProduct.salesCount} + 1`,
        lastSoldAt: new Date(),
        updatedAt: new Date(),
      }).where(eq(tripayProduct.id, trx.productId));
    }

    if (trx.status !== "success") {
      await tx.insert(kasRwcoin).values({
        tipe: "pengeluaran",
        tipeDetail: "tripay_modal",
        jumlah: trx.hargaModal,
        referensiId: trx.reference,
        keterangan: `Tripay modal ${trx.productName} (${trx.target})`,
      });
    }
  });

  const [updated] = await db.select().from(tripayTransaction).where(eq(tripayTransaction.id, trx.id));
  return updated;
}

async function refundTripayTransaction(reference: string, reason: string, payload?: any) {
  const [trx] = await db.select().from(tripayTransaction).where(eq(tripayTransaction.reference, reference));
  if (!trx) throw new Error("Transaksi Tripay tidak ditemukan");
  if (trx.status === "refunded" || trx.refundedRwcoinTransaksiId) return trx;

  await db.transaction(async (tx) => {
    const [wallet] = await tx.select().from(rwcoinWallet).where(and(eq(rwcoinWallet.ownerType, "warga"), eq(rwcoinWallet.wargaId, trx.wargaId)));
    if (!wallet) throw new Error("Wallet warga tidak ditemukan");

    await tx.update(rwcoinWallet).set({
      saldo: sql`${rwcoinWallet.saldo} + ${trx.hargaJual}`,
      totalBelanja: sql`GREATEST(${rwcoinWallet.totalBelanja} - ${trx.hargaJual}, 0)`,
      updatedAt: new Date(),
    }).where(eq(rwcoinWallet.id, wallet.id));

    const [refundRow] = await tx.insert(rwcoinTransaksi).values({
      kodeTransaksi: makeReference("RF"),
      tipe: "refund",
      wargaId: trx.wargaId,
      jumlahBruto: trx.hargaJual,
      jumlahBayar: trx.hargaJual,
      keterangan: `Refund Tripay • ${trx.productName} • ${reason}`.slice(0, 255),
    }).returning();

    if (trx.status === "success") {
      await tx.insert(kasRwcoin).values({
        tipe: "pemasukan",
        tipeDetail: "tripay_refund",
        jumlah: trx.hargaModal,
        referensiId: trx.reference,
        keterangan: `Refund modal Tripay ${trx.productName} (${trx.target})`,
      });
    }

    await tx.update(tripayTransaction).set({
      status: "refunded",
      statusDetail: deriveStatusDetail("refunded", reason),
      note: reason,
      tripayStatus: Number(payload?.status ?? trx.tripayStatus ?? 2),
      failureReason: reason,
      refundedRwcoinTransaksiId: refundRow.id,
      refundedAt: new Date(),
      failedAt: new Date(),
      finalizedAt: new Date(),
      callbackPayload: payload ?? trx.callbackPayload,
      responsePayload: payload ?? trx.responsePayload,
      updatedAt: new Date(),
    }).where(eq(tripayTransaction.id, trx.id));
  });

  const [updated] = await db.select().from(tripayTransaction).where(eq(tripayTransaction.reference, reference));
  return updated;
}

export async function createTripayPurchase(args: {
  wargaId: number;
  productCode: string;
  target: string;
  noMeterPln?: string;
}) {
  const cfg = assertTripayConfigured();
  const productCode = args.productCode.trim().toUpperCase();
  const [product] = await db.select().from(tripayProduct).where(eq(tripayProduct.productCode, productCode));
  if (!product || !product.isActive || !product.isVisibleToWarga || product.tripayStatus !== 1) {
    throw new Error("Produk Tripay tidak tersedia atau belum diaktifkan admin");
  }

  if (!args.target?.trim()) throw new Error("Nomor tujuan wajib diisi");
  if (product.kind === "electricity" && !args.noMeterPln?.trim()) {
    throw new Error("Nomor meter PLN wajib diisi");
  }

  const wallet = await storage.getOrCreateWargaWallet(args.wargaId);
  const hargaJual = product.hargaModal + (product.marginFlat ?? 0);
  if (wallet.saldo < hargaJual) throw new Error("Saldo RWcoin tidak cukup");

  const reference = makeReference("TPY");
  const note = makeTripayPurchaseNote(product.productName, args.target.trim(), args.noMeterPln?.trim());

  const [reserved] = await db.transaction(async (tx) => {
    const debited = await tx.update(rwcoinWallet).set({
      saldo: sql`${rwcoinWallet.saldo} - ${hargaJual}`,
      totalBelanja: sql`${rwcoinWallet.totalBelanja} + ${hargaJual}`,
      updatedAt: new Date(),
    }).where(and(eq(rwcoinWallet.id, wallet.id), gte(rwcoinWallet.saldo, hargaJual))).returning({ id: rwcoinWallet.id });
    if (!debited[0]) throw new Error("Saldo RWcoin tidak cukup atau sedang berubah, silakan coba lagi");

    const [rwcoinRow] = await tx.insert(rwcoinTransaksi).values({
      kodeTransaksi: reference,
      tipe: "tripay",
      wargaId: args.wargaId,
      jumlahBruto: hargaJual,
      jumlahBayar: hargaJual,
      keterangan: note,
    }).returning();

    const [tripayRow] = await tx.insert(tripayTransaction).values({
      reference,
      wargaId: args.wargaId,
      rwcoinTransaksiId: rwcoinRow.id,
      productId: product.id,
      kind: product.kind,
      categoryRefId: product.categoryRefId,
      categoryNameSnapshot: product.categoryName,
      categoryTypeSnapshot: product.categoryType,
      operatorRefId: product.operatorRefId,
      operatorNameSnapshot: product.operatorName,
      operatorNormalizedSnapshot: product.operatorNormalized,
      productGroupSnapshot: product.productGroup,
      productCode: product.productCode,
      productName: product.productName,
      target: args.target.trim(),
      noMeterPln: args.noMeterPln?.trim() || null,
      hargaModal: product.hargaModal,
      marginFlat: product.marginFlat ?? 0,
      hargaJual,
      statusDetail: "queued",
      sourceChannel: "warga_web",
      requestPayload: {
        inquiry: product.kind === "electricity" ? "PLN" : "I",
        code: product.productCode,
        phone: args.target.trim(),
        no_meter_pln: args.noMeterPln?.trim() || undefined,
        api_trxid: reference,
      },
    }).returning();

    return [tripayRow];
  });

  try {
    const response = await tripayRequest<any>("/transaksi/pembelian", {
      method: "POST",
      body: {
        inquiry: product.kind === "electricity" ? "PLN" : "I",
        code: product.productCode,
        phone: args.target.trim(),
        no_meter_pln: args.noMeterPln?.trim() || undefined,
        api_trxid: reference,
        pin: cfg.pin,
      },
    });

    if (!response?.success) {
      await refundTripayTransaction(reference, String(response?.message ?? "Transaksi Tripay ditolak"), response);
      throw new Error(String(response?.message ?? "Transaksi Tripay ditolak"));
    }

    await db.update(tripayTransaction).set({
      tripayTrxId: response?.trxid ? Number(response.trxid) : null,
      responsePayload: response,
      note: String(response?.message ?? "Transaksi diantrikan"),
      status: "pending",
      statusDetail: deriveStatusDetail("pending", response?.message),
      updatedAt: new Date(),
    }).where(eq(tripayTransaction.reference, reference));
  } catch (error: any) {
    try {
      const detail = await getTripayDetailByReference(reference);
      const item = Array.isArray(detail?.data) ? detail.data[0] : detail?.data;
      if (item?.api_trxid === reference) {
        if (String(item.status) === "1") {
          await markTripaySuccess(reference, item);
        } else if (String(item.status) === "2" || String(item.status) === "3") {
          await refundTripayTransaction(reference, String(item.note ?? error?.message ?? "Tripay gagal"), item);
        } else {
          await db.update(tripayTransaction).set({
            responsePayload: detail,
            note: String(item?.note ?? error?.message ?? "Menunggu callback Tripay"),
            statusDetail: deriveStatusDetail(item?.status, item?.note ?? error?.message),
            updatedAt: new Date(),
          }).where(eq(tripayTransaction.reference, reference));
        }
      } else {
        await refundTripayTransaction(reference, String(error?.message ?? "Gagal terhubung ke Tripay"));
        throw error;
      }
    } catch {
      await refundTripayTransaction(reference, String(error?.message ?? "Gagal terhubung ke Tripay"));
      throw error;
    }
  }

  const [finalRow] = await db.select().from(tripayTransaction).where(eq(tripayTransaction.reference, reference));
  return {
    ...finalRow,
    hargaJual,
  };
}

export async function handleTripayCallback(payload: any) {
  const reference = String(payload?.api_trxid ?? "").trim();
  if (!reference) throw new Error("api_trxid tidak ditemukan");

  const status = String(payload?.status ?? "0");
  if (status === "1") {
    return markTripaySuccess(reference, payload);
  }
  if (status === "2" || status === "3") {
    return refundTripayTransaction(reference, String(payload?.note ?? "Tripay gagal"), payload);
  }

  await db.update(tripayTransaction).set({
    tripayTrxId: payload?.trxid ? Number(payload.trxid) : null,
    tripayStatus: Number(payload?.status ?? 0),
    note: String(payload?.note ?? "Menunggu proses"),
    statusDetail: deriveStatusDetail(payload?.status, payload?.note),
    callbackPayload: payload,
    responsePayload: payload,
    updatedAt: new Date(),
  }).where(eq(tripayTransaction.reference, reference));

  const [row] = await db.select().from(tripayTransaction).where(eq(tripayTransaction.reference, reference));
  return row;
}

export async function reconcileTripayTransaction(reference: string) {
  const [trx] = await db.select().from(tripayTransaction).where(eq(tripayTransaction.reference, reference));
  if (!trx) throw new Error("Transaksi Tripay tidak ditemukan");
  if (trx.status === "success" || trx.status === "refunded") return trx;

  const detail = await getTripayDetailByReference(reference);
  const item = Array.isArray(detail?.data) ? detail.data[0] : detail?.data;
  if (!item) {
    throw new Error("Detail transaksi Tripay tidak ditemukan");
  }

  const status = String(item.status ?? trx.tripayStatus ?? "0");
  if (status === "1") {
    return markTripaySuccess(reference, item);
  }
  if (status === "2" || status === "3") {
    return refundTripayTransaction(reference, String(item.note ?? "Tripay gagal"), item);
  }

  await db.update(tripayTransaction).set({
    tripayTrxId: item?.trxid ? Number(item.trxid) : trx.tripayTrxId,
    tripayStatus: Number(item?.status ?? trx.tripayStatus ?? 0),
    note: String(item?.note ?? trx.note ?? "Masih menunggu proses Tripay"),
    statusDetail: deriveStatusDetail(item?.status, item?.note ?? trx.note),
    reconcileCount: sql`${tripayTransaction.reconcileCount} + 1`,
    lastReconcileAt: new Date(),
    responsePayload: detail,
    updatedAt: new Date(),
  }).where(eq(tripayTransaction.id, trx.id));

  const [updated] = await db.select().from(tripayTransaction).where(eq(tripayTransaction.id, trx.id));
  return updated;
}

export async function reconcilePendingTripayTransactions(limit = 25) {
  const pending = await db.select().from(tripayTransaction)
    .where(eq(tripayTransaction.status, "pending"))
    .orderBy(desc(tripayTransaction.createdAt))
    .limit(limit);

  const result = {
    checked: pending.length,
    success: 0,
    refunded: 0,
    pending: 0,
    failed: 0,
  };

  for (const row of pending) {
    try {
      const updated = await reconcileTripayTransaction(row.reference);
      if (updated?.status === "success") result.success += 1;
      else if (updated?.status === "refunded") result.refunded += 1;
      else result.pending += 1;
    } catch {
      result.failed += 1;
    }
  }

  return result;
}

export async function listTripayTransactions(limit = 100) {
  const rows = await db.select({
    id: tripayTransaction.id,
    reference: tripayTransaction.reference,
    tripayTrxId: tripayTransaction.tripayTrxId,
    wargaId: tripayTransaction.wargaId,
    namaWarga: warga.namaLengkap,
    kind: tripayTransaction.kind,
    categoryNameSnapshot: tripayTransaction.categoryNameSnapshot,
    categoryTypeSnapshot: tripayTransaction.categoryTypeSnapshot,
    operatorNameSnapshot: tripayTransaction.operatorNameSnapshot,
    operatorNormalizedSnapshot: tripayTransaction.operatorNormalizedSnapshot,
    productGroupSnapshot: tripayTransaction.productGroupSnapshot,
    productCode: tripayTransaction.productCode,
    productName: tripayTransaction.productName,
    target: tripayTransaction.target,
    noMeterPln: tripayTransaction.noMeterPln,
    hargaModal: tripayTransaction.hargaModal,
    marginFlat: tripayTransaction.marginFlat,
    hargaJual: tripayTransaction.hargaJual,
    status: tripayTransaction.status,
    statusDetail: tripayTransaction.statusDetail,
    tripayStatus: tripayTransaction.tripayStatus,
    note: tripayTransaction.note,
    failureReason: tripayTransaction.failureReason,
    sourceChannel: tripayTransaction.sourceChannel,
    reconcileCount: tripayTransaction.reconcileCount,
    lastReconcileAt: tripayTransaction.lastReconcileAt,
    finalizedAt: tripayTransaction.finalizedAt,
    serialNumber: tripayTransaction.serialNumber,
    createdAt: tripayTransaction.createdAt,
    updatedAt: tripayTransaction.updatedAt,
  }).from(tripayTransaction)
    .leftJoin(warga, eq(tripayTransaction.wargaId, warga.id))
    .orderBy(desc(tripayTransaction.createdAt))
    .limit(limit);
  return rows;
}

export async function listTripayTransactionsByWargaId(wargaId: number, limit = 50) {
  const rows = await db.select().from(tripayTransaction)
    .where(eq(tripayTransaction.wargaId, wargaId))
    .orderBy(desc(tripayTransaction.createdAt))
    .limit(limit);
  return rows;
}

export async function getTripayOverview() {
  const categories = await db.select().from(tripayCategory);
  const operators = await db.select().from(tripayOperator);
  const products = await db.select().from(tripayProduct);
  const transactions = await db.select().from(tripayTransaction);
  const success = transactions.filter((row) => row.status === "success");
  const pending = transactions.filter((row) => row.status === "pending");
  const refunded = transactions.filter((row) => row.status === "refunded");
  const stalePending = pending.filter((row) => {
    const createdAt = row.createdAt ? new Date(row.createdAt).getTime() : 0;
    return createdAt > 0 && Date.now() - createdAt > 5 * 60 * 1000;
  });
  const totalMargin = success.reduce((sum, row) => sum + Math.max(0, row.hargaJual - row.hargaModal), 0);
  const topOperators = Array.from(products.reduce((map, row) => {
    const key = row.operatorName ?? row.categoryName ?? "Lainnya";
    map.set(key, (map.get(key) ?? 0) + (row.salesCount ?? 0));
    return map;
  }, new Map<string, number>()).entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, salesCount]) => ({ name, salesCount }));

  const topProducts = products
    .filter((row) => (row.salesCount ?? 0) > 0)
    .sort((a, b) => (b.salesCount ?? 0) - (a.salesCount ?? 0))
    .slice(0, 5)
    .map((row) => ({
      id: row.id,
      productName: row.productName,
      operatorName: row.operatorName,
      salesCount: row.salesCount ?? 0,
      lastSoldAt: row.lastSoldAt,
    }));

  return {
    totalCategories: categories.length,
    visibleCategories: categories.filter((row) => row.isVisibleToWarga).length,
    totalOperators: operators.length,
    visibleOperators: operators.filter((row) => row.isVisibleToWarga).length,
    totalProducts: products.length,
    activeProducts: products.filter((row) => row.isActive && row.tripayStatus === 1).length,
    featuredProducts: products.filter((row) => row.isFeatured).length,
    recommendedProducts: products.filter((row) => row.isRecommended).length,
    pendingTransactions: pending.length,
    stalePendingTransactions: stalePending.length,
    successTransactions: success.length,
    refundedTransactions: refunded.length,
    totalMargin,
    topOperators,
    topProducts,
  };
}

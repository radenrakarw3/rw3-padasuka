/**
 * Smoke test: pengaturan Visit RW3 (load + simpan tarif).
 * Jalankan: npx tsx -r dotenv/config script/visitrw3-settings-smoke.ts
 */
import "dotenv/config";
import { loadVisitrw3SettingsRows, upsertVisitrw3Setting } from "../server/visitrw3-settings";

const REQUIRED_KEYS = [
  "tier_pintu_sedang_min",
  "tier_pintu_besar_min",
  "fee_bisnis_lapak_per_hari",
  "tata_tertib_masyarakat",
  "tata_tertib_penyewa",
  "tata_tertib_pemilik",
];

async function main() {
  const results: { step: string; ok: boolean; detail?: string }[] = [];

  try {
    const t0 = Date.now();
    const rows = await loadVisitrw3SettingsRows();
    const ms = Date.now() - t0;
    results.push({
      step: "loadVisitrw3SettingsRows",
      ok: rows.length >= 20,
      detail: `${rows.length} rows in ${ms}ms`,
    });

    const missing = REQUIRED_KEYS.filter((k) => !rows.some((r) => r.key === k));
    results.push({
      step: "required keys",
      ok: missing.length === 0,
      detail: missing.length ? `missing: ${missing.join(", ")}` : "all present",
    });

    const testKey = "fee_bisnis_lapak_per_hari";
    const before = rows.find((r) => r.key === testKey)?.value ?? "3000";
    const testVal = before === "3001" ? "3000" : "3001";
    const updated = await upsertVisitrw3Setting(testKey, testVal);
    results.push({
      step: "upsertVisitrw3Setting",
      ok: updated.value === testVal,
      detail: `${testKey}=${updated.value}`,
    });

    await upsertVisitrw3Setting(testKey, before);
    const restored = await loadVisitrw3SettingsRows();
    const back = restored.find((r) => r.key === testKey)?.value;
    results.push({
      step: "restore value",
      ok: back === before,
      detail: `${testKey}=${back}`,
    });
  } catch (e) {
    results.push({
      step: "fatal",
      ok: false,
      detail: e instanceof Error ? e.message : String(e),
    });
  }

  const failed = results.filter((r) => !r.ok);
  console.log(JSON.stringify(results, null, 2));
  if (failed.length) {
    console.error("\nGAGAL:", failed.length, "langkah");
    process.exit(1);
  }
  console.log("\nOK: Pengaturan Visit RW3 siap dipakai.");
}

main();

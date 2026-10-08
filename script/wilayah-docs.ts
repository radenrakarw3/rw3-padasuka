/** Menulis docs/wilayah/indikator-119.md dari registry (sumber kebenaran: shared/indikator-kecamatan.ts). */
import fs from "fs";
import path from "path";
import { BAGIAN_INDIKATOR, INDIKATOR_KECAMATAN } from "@shared/indikator-kecamatan";

const esc = (s: string | undefined) => (s ?? "").replace(/\|/g, "/").replace(/\n/g, " ");
const out: string[] = [
  "# Matriks 119 indikator laporan RT",
  "",
  "Dihasilkan otomatis oleh `npx tsx script/wilayah-docs.ts`. Jangan diedit manual.",
  "",
  `Siap dihitung: **${INDIKATOR_KECAMATAN.filter((i) => i.status === "siap").length}**. Menunggu konfirmasi kecamatan (tidak pernah diberi angka): **${INDIKATOR_KECAMATAN.filter((i) => i.status === "needs_confirmation").length}**.`,
  "",
];
for (const b of BAGIAN_INDIKATOR) {
  out.push(`## ${b.kode}. ${b.judul} (${b.jumlah})`, "", "| No | Kode | Indikator | Satuan | Periode | Sumber | Pengisi / Verifikasi | Scope | Status |", "|---|---|---|---|---|---|---|---|---|");
  for (const i of INDIKATOR_KECAMATAN.filter((x) => x.bagian === b.kode)) {
    const st = i.status === "siap" ? "siap" : `**perlu konfirmasi** — ${esc(i.catatan)}`;
    out.push(`| ${i.no} | ${i.kode} | ${esc(i.label)} | ${i.satuan} | ${i.periode} | ${esc(i.sumber)} | ${i.pengisi} / ${i.pemverifikasi} | ${i.scope} | ${st} |`);
  }
  out.push("");
}
const file = path.resolve(import.meta.dirname, "../docs/wilayah/indikator-119.md");
fs.mkdirSync(path.dirname(file), { recursive: true });
fs.writeFileSync(file, out.join("\n"));
console.log(`Ditulis ${file}`);

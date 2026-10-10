import { fieldJenis } from "./render";
import type { DataDokumen, JenisDokumen, Pihak } from "./tipe";

const PIHAK: Pihak[] = [
  { nama: "Budi Santoso", peran: "Sekretaris RW", jenis: "pengurus" },
  { nama: "Siti Aminah", peran: "Ketua RT 02", jenis: "rt", rt: 2 },
];

/** Data contoh lengkap untuk uji PDF & dokumentasi. `panjang` memperbanyak baris/daftar. */
export function contohData(j: JenisDokumen, panjang = false): DataDokumen {
  const n = panjang ? 40 : 3;
  const d: DataDokumen = { ...(j.awal ?? {}) };
  for (const f of fieldJenis(j)) {
    if (f.internal && f.tipe !== "centang") continue;
    switch (f.tipe) {
      case "teks": d[f.key] = `${f.label} contoh`; break;
      case "uraian": d[f.key] = panjang ? `${f.label}: ${"Uraian keadaan yang diamati di lapangan secara apa adanya. ".repeat(12)}` : `${f.label} contoh yang ditulis apa adanya.`; break;
      case "tanggal": d[f.key] = f.key.toLowerCase().includes("selesai") ? "2026-10-30" : "2026-10-12"; break;
      case "waktu": d[f.key] = "19:30"; break;
      case "angka": d[f.key] = f.key === "persentase" ? "60" : "4"; break;
      case "rupiah": d[f.key] = "1500000"; break;
      case "pilihan": d[f.key] = d[f.key] ?? f.opsi?.[0] ?? ""; break;
      case "centang": d[f.key] = true; break;
      case "pihak": d[f.key] = f.tunggal ? [PIHAK[0]] : PIHAK; break;
      case "daftar": d[f.key] = Array.from({ length: n }, (_, i) => `${f.label} butir ${i + 1}`); break;
      case "tabel":
        d[f.key] = Array.from({ length: panjang ? 60 : 3 }, (_, i) =>
          Object.fromEntries((f.kolom ?? []).map((k) => [k.key,
            k.tipe === "rupiah" ? String(250000 * (i + 1)) : k.tipe === "angka" ? String(i + 1) : k.tipe === "tanggal" ? "2026-10-15" : k.key === "ttd" ? "" : `${k.label} ${i + 1}${panjang && k.key !== "nama" ? " dengan keterangan yang cukup panjang agar baris membungkus" : ""}`])));
        break;
    }
  }
  return d;
}

import { barisTabel, daftarPihak, daftarStr, fieldJenis, renderDokumen, str, teksPolos } from "./render";
import { keAngka, POLA_PLACEHOLDER, POLA_SENSITIF, urai } from "./redaksi";
import type { DataDokumen, HasilValidasi, JenisDokumen } from "./tipe";

const PASANGAN_TANGGAL: [string, string][] = [
  ["mulaiTugas", "selesaiTugas"], ["masaKerjaMulai", "masaKerjaSelesai"], ["waktuMulai", "waktuSelesai"],
];

function terisi(tipe: string, v: unknown): boolean {
  switch (tipe) {
    case "daftar": return daftarStr(v).length > 0;
    case "pihak": return daftarPihak(v).length > 0;
    case "tabel": return barisTabel(v).length > 0;
    case "centang": return v === true;
    default: return str(v).length > 0;
  }
}

/** Validasi sebelum terbit. Galat memblokir terbit; peringatan wajib dibaca RW. */
export function validasiDokumen(j: JenisDokumen, d: DataDokumen, meta: { perihal: string; tanggal: string }): HasilValidasi {
  const galat: string[] = [];
  const peringatan: string[] = [];
  let perluPemeriksaan = false;

  if (str(meta.perihal).length < 3) galat.push("Perihal belum diisi");
  if (!urai(meta.tanggal)) galat.push("Tanggal dokumen tidak valid");

  for (const f of fieldJenis(j)) {
    const v = d[f.key];
    if (f.wajib && !terisi(f.tipe, v)) {
      if (f.tipe === "centang") continue; // ditangani aturan khusus di bawah
      galat.push(`${f.label} wajib diisi`);
      continue;
    }
    if (f.tipe === "tanggal" && str(v) && !urai(str(v))) galat.push(`${f.label}: tanggal tidak valid`);
    if (f.tipe === "waktu" && str(v) && !/^\d{2}[.:]\d{2}$/.test(str(v))) galat.push(`${f.label}: format jam HH:MM`);
    if ((f.tipe === "rupiah" || f.tipe === "angka") && str(v) && keAngka(v) == null) galat.push(`${f.label}: harus angka`);
    if (f.tipe === "angka" && f.key === "persentase" && str(v)) {
      const n = keAngka(v) ?? -1;
      if (n < 0 || n > 100) galat.push("Persentase harus 0–100");
    }
    if (f.tipe === "tabel") {
      for (const r of barisTabel(v)) {
        for (const k of f.kolom ?? []) {
          if ((k.tipe === "rupiah" || k.tipe === "angka") && r[k.key] && keAngka(r[k.key]) == null) galat.push(`${f.label}: kolom ${k.label} harus angka ("${r[k.key]}")`);
          if (k.tipe === "tanggal" && r[k.key] && /^\d{4}-/.test(r[k.key]) && !urai(r[k.key])) galat.push(`${f.label}: tanggal tidak valid`);
        }
      }
    }
  }
  for (const [a, b] of PASANGAN_TANGGAL) {
    const x = str(d[a]), y = str(d[b]);
    if (x && y && x > y) galat.push("Tanggal selesai tidak boleh sebelum tanggal mulai");
  }

  if (j.perluDasar) {
    const adaDasar = daftarStr(d.dasar).length > 0 || str(d.sumberMusyawarah).length > 0;
    if (!adaDasar || d.dasarDiperiksa !== true) {
      perluPemeriksaan = true;
      galat.push(adaDasar
        ? "Dasar keputusan belum ditandai sudah diperiksa Ketua RW"
        : "Dasar keputusan belum tersedia — isi rujukan yang benar-benar ada (Peraturan RW, notulen musyawarah) lalu periksa");
    }
  }
  if (j.perluPersetujuanPihak) {
    if (daftarPihak(d.paraPihak).length < 2) galat.push("Kesepakatan memerlukan sedikitnya dua pihak");
    if (d.konfirmasiPihak !== true) {
      perluPemeriksaan = true;
      galat.push("Kesepakatan belum dikonfirmasi para pihak — jangan terbitkan sebagai sudah disepakati");
    }
  }

  const teks = teksPolos(renderDokumen(j, d, { nomor: "000/X/RW.03", tanggal: meta.tanggal, perihal: meta.perihal, draft: false }));
  if (POLA_PLACEHOLDER.test(teks)) galat.push("Masih ada isian kosong/penanda placeholder di dokumen");
  if (POLA_SENSITIF.test(teks)) {
    peringatan.push("Dokumen memuat kata sanksi/denda/pungutan/izin/hak milik. RW tidak menetapkan hal tersebut tanpa dasar yang sah — periksa kembali.");
    perluPemeriksaan = true;
  }
  if (j.posisi === "eksternal" && /\b(memerintahkan|diperintahkan|wajib segera)\b/i.test(teks)) {
    peringatan.push("Surat kepada instansi/perusahaan sebaiknya berupa permohonan atau ajakan koordinasi, bukan perintah.");
  }
  if (j.kategori === "D" && str(d.nominal)) {
    peringatan.push("Nominal permohonan tidak dicatat sebagai pemasukan. Catat bantuan yang dijanjikan/diterima secara terpisah.");
  }
  return { galat: [...new Set(galat)], peringatan, perluPemeriksaan };
}

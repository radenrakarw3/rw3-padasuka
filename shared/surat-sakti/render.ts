import { KUNCI_TATA_LETAK, semuaField } from "./field";
import { PENUTUP } from "./katalog";
import { IDENTITAS_RW } from "./identitas";
import { hariTanggal, hariTanggalTerbilang, isiPola, keAngka, rupiah, rupiahTerbilang, tanggalPanjang } from "./redaksi";
import type { Blok, DataDokumen, Field, JenisDokumen, MetaRender, Pihak } from "./tipe";

export function kelompokJenis(j: JenisDokumen): string[] {
  return [...j.kelompok, "tindak"];
}

export function fieldJenis(j: JenisDokumen): Field[] {
  return semuaField(kelompokJenis(j));
}

// ------------------------------------------------------------------ pembaca nilai
export const str = (v: unknown): string => (typeof v === "string" ? v.trim() : typeof v === "number" ? String(v) : "");
export const daftarStr = (v: unknown): string[] => (Array.isArray(v) ? v.map(str).filter(Boolean) : []);
export function daftarPihak(v: unknown): Pihak[] {
  if (!Array.isArray(v)) return [];
  return v.filter((p): p is Pihak => !!p && typeof p === "object" && str((p as Pihak).nama).length > 0);
}
export function barisTabel(v: unknown): Record<string, string>[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((r) => r && typeof r === "object")
    .map((r) => Object.fromEntries(Object.entries(r as Record<string, unknown>).map(([k, x]) => [k, str(x)])))
    .filter((r) => Object.values(r).some(Boolean));
}

export function teksPihak(p: Pihak): string {
  const rt = p.rt && !/\bRT\b/i.test(p.peran ?? "") ? `RT ${String(p.rt).padStart(2, "0")}` : "";
  const ket = [p.peran, rt].filter(Boolean).join(", ");
  return ket ? `${p.nama} (${ket})` : p.nama;
}

function nilaiSel(tipe: string | undefined, v: string): string {
  if (!v) return "";
  if (tipe === "rupiah") {
    const n = keAngka(v);
    return n == null ? v : rupiah(n);
  }
  if (tipe === "tanggal" && /^\d{4}-\d{2}-\d{2}$/.test(v)) return tanggalPanjang(v);
  return v;
}

function nilaiSkalar(f: Field, v: unknown): string {
  const s = str(v);
  if (!s) return "";
  switch (f.tipe) {
    case "tanggal": return hariTanggal(s);
    case "waktu": return `${s} WIB`;
    case "rupiah": {
      const n = keAngka(s);
      return n == null ? s : rupiahTerbilang(n);
    }
    default: return s;
  }
}

/** Render field biasa (bukan tata letak) menjadi blok. Skalar berurutan digabung menjadi satu blok label. */
function renderFields(fields: Field[], d: DataDokumen, lewati: Set<string>): Blok[] {
  const out: Blok[] = [];
  let label: [string, string][] = [];
  const flush = () => {
    if (label.length) out.push({ t: "label", baris: label });
    label = [];
  };
  for (const f of fields) {
    if (f.internal || f.tipe === "centang" || KUNCI_TATA_LETAK.has(f.key) || lewati.has(f.key)) continue;
    const v = d[f.key];
    if (f.tipe === "daftar") {
      const item = daftarStr(v);
      if (!item.length) continue;
      flush();
      out.push({ t: "sub", teks: f.label }, { t: "daftar", item, bernomor: true });
    } else if (f.tipe === "pihak") {
      const ps = daftarPihak(v);
      if (!ps.length) continue;
      if (ps.length === 1) label.push([f.label, teksPihak(ps[0])]);
      else {
        flush();
        out.push({ t: "sub", teks: f.label }, { t: "daftar", item: ps.map(teksPihak), bernomor: true });
      }
    } else if (f.tipe === "tabel") {
      const rows = barisTabel(v);
      const kosong = f.barisKosong ?? 0;
      if (!rows.length && !kosong) continue;
      flush();
      const kolom = f.kolom ?? [];
      const baris = rows.map((r, i) => [String(i + 1), ...kolom.map((k) => nilaiSel(k.tipe, r[k.key] ?? ""))]);
      for (let i = 0; i < Math.max(0, kosong - rows.length); i++) baris.push([String(rows.length + i + 1), ...kolom.map(() => "")]);
      const totalKolom = kolom.map((k) => k.tipe === "rupiah");
      let total: string[] | undefined;
      if (totalKolom.some(Boolean) && rows.length) {
        total = ["", ...kolom.map((k, i) => {
          if (i === 0 && !totalKolom[0]) return "Jumlah";
          if (!totalKolom[i]) return "";
          return rupiah(rows.reduce((s, r) => s + (keAngka(r[k.key]) ?? 0), 0));
        })];
      }
      out.push({ t: "sub", teks: f.label }, { t: "tabel", kolom: ["No", ...kolom.map((k) => k.label)], lebar: [0.6, ...kolom.map((k) => k.lebar ?? 2)], baris, total });
    } else if (f.tipe === "uraian") {
      const s = str(v);
      if (!s) continue;
      if (s.length <= 90 && !s.includes("\n")) label.push([f.label, s]);
      else {
        flush();
        out.push({ t: "sub", teks: f.label }, { t: "paragraf", teks: s });
      }
    } else {
      const s = nilaiSkalar(f, v);
      if (s) label.push([f.label, s]);
    }
  }
  flush();
  return out;
}

type KolomTtd = { atas: string; nama: string; jabatan?: string };

const RW_TTD = (atas: string): KolomTtd => ({ atas, nama: IDENTITAS_RW.ketua.nama, jabatan: IDENTITAS_RW.ketua.jabatan });
const ttdPihak = (p: Pihak, atas: string): KolomTtd => ({ atas, nama: p.nama, jabatan: p.peran || undefined });

export function penandatangan(j: JenisDokumen, d: DataDokumen): KolomTtd[] {
  const kol: KolomTtd[] = [];
  const mengetahui = () => {
    if (!kol.some((k) => k.nama === IDENTITAS_RW.ketua.nama)) kol.push(RW_TTD("Mengetahui,"));
  };
  if (j.kelompok.includes("serah")) {
    const a = daftarPihak(d.pihakMenyerahkan)[0];
    const b = daftarPihak(d.pihakMenerima)[0];
    if (a) kol.push(ttdPihak(a, "Yang menyerahkan,"));
    if (b) kol.push(ttdPihak(b, "Yang menerima,"));
    mengetahui();
    return kol;
  }
  if (j.perluPersetujuanPihak) {
    daftarPihak(d.paraPihak).forEach((p, i) => kol.push(ttdPihak(p, `Pihak ${i + 1},`)));
    mengetahui();
    return kol;
  }
  const ba = daftarPihak(d.penandatanganBA);
  if (ba.length) {
    ba.forEach((p) => kol.push(ttdPihak(p, p.peran ? `${p.peran},` : "Yang hadir,")));
    mengetahui();
    return kol;
  }
  const custom = daftarPihak(d.penandatangan);
  const atas = j.posisi === "pengurus" ? "Yang menugaskan," : j.posisi === "internal" ? "Dibuat oleh," : "Hormat kami,";
  if (custom.length) return custom.map((p, i) => ttdPihak(p, i === 0 ? atas : "Mengetahui,"));
  return [RW_TTD(atas)];
}

function judulDokumen(j: JenisDokumen, meta: MetaRender): Blok {
  return { t: "judul", teks: j.judulCetak ?? j.label.toUpperCase(), sub: [`Nomor: ${meta.nomor ?? "(belum bernomor — draf)"}`] };
}

const URUTAN = ["KESATU", "KEDUA", "KETIGA", "KEEMPAT", "KELIMA", "KEENAM", "KETUJUH", "KEDELAPAN", "KESEMBILAN", "KESEPULUH"];

/** Isi dokumen sebagai blok terstruktur. Dipakai untuk pratinjau, snapshot final, dan PDF. */
export function renderDokumen(j: JenisDokumen, d: DataDokumen, meta: MetaRender, akses: string = "internal"): Blok[] {
  const fields = fieldJenis(j);
  const nilai = (k: string) => (k === "perihal" ? meta.perihal : str(d[k]));
  const pembuka = j.pembuka ? isiPola(j.pembuka, nilai) : "";
  const penutup = j.penutup ?? PENUTUP[j.posisi];
  const tempatTanggal = `${IDENTITAS_RW.tempat}, ${tanggalPanjang(meta.tanggal)}`;
  const out: Blok[] = [];
  const tembusan = daftarStr(d.tembusan);
  const ttd = penandatangan(j, d);

  if (j.layout === "kustom") {
    const penerima = daftarPihak(d.penerima);
    const isi = str(d.isiSurat).replace(/\r/g, "").split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
    if (penerima.length) {
      out.push({
        t: "kepala",
        tempatTanggal,
        baris: [
          ["Nomor", meta.nomor ?? "(belum bernomor — draf)"],
          ["Sifat", akses === "terbatas" ? "Terbatas" : "Biasa"],
          ["Lampiran", meta.jumlahLampiran ? `${meta.jumlahLampiran} berkas` : "-"],
          ["Perihal", meta.perihal],
        ],
      });
      out.push({ t: "alamat", baris: ["Kepada Yth.", ...(penerima.length > 1 ? penerima.map((p, i) => `${i + 1}. ${teksPihak(p)}`) : penerima.map(teksPihak)), "di", "Tempat"] });
      if (!/^dengan hormat/i.test(isi[0] ?? "")) out.push({ t: "paragraf", teks: "Dengan hormat," });
    } else {
      out.push({ t: "judul", teks: (str(d.judulSurat) || meta.perihal).toUpperCase(), sub: [`Nomor: ${meta.nomor ?? "(belum bernomor — draf)"}`] });
    }
    for (const p of isi) out.push({ t: "paragraf", teks: p });
    const poin = daftarStr(d.poinSurat);
    if (poin.length) out.push({ t: "daftar", item: poin, bernomor: true });
    const tutup = str(d.penutupSurat);
    if (tutup !== "-") out.push({ t: "paragraf", teks: tutup || penutup });
    out.push({ t: "ttd", tempatTanggal: penerima.length ? undefined : tempatTanggal, kolom: ttd });
  } else if (j.layout === "surat") {
    const penerima = daftarPihak(d.penerima);
    if (j.kelompok.includes("penerima")) {
      out.push({
        t: "kepala",
        tempatTanggal,
        baris: [
          ["Nomor", meta.nomor ?? "(belum bernomor — draf)"],
          ["Sifat", akses === "terbatas" ? "Terbatas" : "Biasa"],
          ["Lampiran", meta.jumlahLampiran ? `${meta.jumlahLampiran} berkas` : "-"],
          ["Perihal", meta.perihal],
        ],
      });
      out.push({ t: "alamat", baris: ["Kepada Yth.", ...(penerima.length > 1 ? penerima.map((p, i) => `${i + 1}. ${teksPihak(p)}`) : penerima.map(teksPihak)), "di", "Tempat"] });
      if (j.posisi !== "pengurus" && !pembuka.startsWith("Dengan hormat")) out.push({ t: "paragraf", teks: "Dengan hormat," });
    } else {
      out.push(judulDokumen(j, meta));
    }
    if (pembuka) out.push({ t: "paragraf", teks: pembuka });
    out.push(...renderFields(fields, d, new Set()));
    out.push({ t: "paragraf", teks: penutup });
    out.push({ t: "ttd", tempatTanggal: j.kelompok.includes("penerima") ? undefined : tempatTanggal, kolom: ttd });
  } else if (j.layout === "keputusan") {
    out.push({ t: "judul", teks: j.judulCetak ?? "KEPUTUSAN", sub: [`Nomor: ${meta.nomor ?? "(belum bernomor — draf)"}`, "TENTANG", meta.perihal.toUpperCase()] });
    const menimbang = daftarStr(d.menimbang);
    const dasar = [...daftarStr(d.dasar), ...(str(d.sumberMusyawarah) ? [`Hasil ${str(d.sumberMusyawarah)}`] : [])];
    if (menimbang.length) out.push({ t: "sub", teks: "Menimbang" }, { t: "daftar", item: menimbang, bernomor: true });
    else if (pembuka) out.push({ t: "paragraf", teks: pembuka });
    if (dasar.length) out.push({ t: "sub", teks: "Memperhatikan" }, { t: "daftar", item: dasar, bernomor: true });
    out.push({ t: "judul", teks: "MEMUTUSKAN" }, { t: "label", baris: [["Menetapkan", meta.perihal]] });
    const butir = daftarStr(d.butirKeputusan);
    if (butir.length) out.push({ t: "label", baris: butir.map((b, i) => [URUTAN[i] ?? `KE-${i + 1}`, b] as [string, string]) });
    out.push(...renderFields(fields, d, new Set(["menimbang", "dasar", "sumberMusyawarah", "butirKeputusan"])));
    out.push({ t: "ttd", tempatTanggal: `Ditetapkan di ${IDENTITAS_RW.tempat}, ${tanggalPanjang(meta.tanggal)}`, kolom: ttd });
  } else if (j.layout === "berita_acara") {
    out.push(judulDokumen(j, meta));
    const tglAktual = str(d.waktuAktual) || str(d.waktuSerah) || meta.tanggal;
    const tempat = str(d.tempatAcara) || str(d.lokasi) || "wilayah RW 03 Kelurahan Padasuka";
    out.push({ t: "paragraf", teks: `${hariTanggalTerbilang(tglAktual)}, bertempat di ${tempat}, ${pembuka}` });
    out.push(...renderFields(fields, d, new Set(["waktuAktual", "tempatAcara", "waktuSerah"])));
    out.push({ t: "paragraf", teks: penutup });
    out.push({ t: "ttd", tempatTanggal, kolom: ttd });
  } else {
    out.push(judulDokumen(j, meta));
    if (pembuka) out.push({ t: "paragraf", teks: pembuka });
    out.push(...renderFields(fields, d, new Set()));
    if (j.layout === "laporan") out.push({ t: "paragraf", teks: penutup });
    out.push({ t: "ttd", tempatTanggal, kolom: ttd });
  }
  if (tembusan.length) out.push({ t: "tembusan", item: tembusan });
  return out;
}

/** Arsip lama (tanpa snapshot): isi teks bebas → blok paragraf. */
export function renderTeksLama(isi: string, meta: MetaRender): Blok[] {
  const out: Blok[] = [{ t: "judul", teks: "SURAT RW 03", sub: [`Nomor: ${meta.nomor ?? "-"}`] }];
  for (const p of isi.replace(/\r/g, "").split(/\n{2,}/)) {
    const t = p.trim();
    if (t) out.push({ t: "paragraf", teks: t });
  }
  return out;
}

export function teksPolos(bloks: Blok[]): string {
  const out: string[] = [];
  for (const b of bloks) {
    switch (b.t) {
      case "judul": out.push(b.teks, ...(b.sub ?? [])); break;
      case "kepala": out.push(...b.baris.map(([a, c]) => `${a}: ${c}`), b.tempatTanggal ?? ""); break;
      case "alamat": out.push(...b.baris); break;
      case "sub": case "paragraf": case "catatan": out.push(b.teks); break;
      case "label": out.push(...b.baris.map(([a, c]) => `${a}: ${c}`)); break;
      case "daftar": out.push(...b.item); break;
      case "tabel": out.push(b.kolom.join(" | "), ...b.baris.map((r) => r.join(" | "))); break;
      case "ttd": out.push(b.tempatTanggal ?? "", ...b.kolom.map((k) => `${k.atas} ${k.nama} ${k.jabatan ?? ""}`)); break;
      case "tembusan": out.push(...b.item); break;
    }
  }
  return out.filter(Boolean).join("\n");
}
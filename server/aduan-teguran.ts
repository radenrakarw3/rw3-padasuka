/**
 * Teguran resmi bertingkat (Lisan → SP-1 → SP-2 → SP-3) atas aduan warga, diterbitkan lewat Surat Sakti
 * sehingga bernomor resmi, ber-QR verifikasi, dan terarsip. Nama pelapor tidak pernah masuk surat.
 */
import { z } from "zod";
import { pool } from "./db";
import { WilayahError, type Aktor } from "./wilayah-auth";
import { denganTransaksi } from "./wilayah-data";
import * as layanan from "./surat-sakti/layanan";
import { buatPdf } from "./surat-sakti/pdf";
import { PETA_JENIS, renderDokumen, TINGKAT_TEGURAN_CETAK, type DataDokumen, type JenisPihak } from "@shared/surat-sakti";
import {
  JENIS_TERADU, KATEGORI_ADUAN_INFO, KATEGORI_KE_PELANGGARAN_BIZ, STATUS_TEGURAN, TINGKAT_TEGURAN, TINGKAT_TEGURAN_INFO,
  CARA_SERAH_TEGURAN, kunciTeradu, type KategoriAduan, type TingkatTeguran,
} from "@shared/aduan";
import { ambilAduan, catatTimeline, petakanTeguran, riwayatTeguran, saranDariRiwayat } from "./aduan";

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const hariIniWib = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });

function tanggalPendek(iso: string | Date | null) {
  if (!iso) return "-";
  const d = typeof iso === "string" && DATE_REGEX.test(iso) ? new Date(`${iso}T00:00:00`) : new Date(iso);
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jakarta" });
}

// ---------------------------------------------------------------- Susun surat
const teguranSchema = z.object({
  aduanId: z.number().int().positive().optional().nullable(),
  teradu: z
    .object({
      jenis: z.enum(JENIS_TERADU),
      refId: z.number().int().positive().optional().nullable(),
      nama: z.string().trim().min(2).max(150),
      alamat: z.string().trim().max(300).optional().nullable(),
      rt: z.number().int().min(1).max(7).optional().nullable(),
    })
    .optional()
    .nullable(),
  tingkat: z.enum(TINGKAT_TEGURAN),
  pelanggaran: z.string().trim().min(10, "Uraikan hal yang ditegur minimal 10 huruf").max(2000),
  kewajiban: z.array(z.string().trim().min(3).max(300)).min(1, "Tulis minimal satu hal yang wajib dilakukan").max(10),
  tenggat: z.string().regex(DATE_REGEX, "Pilih batas waktu perbaikan"),
  lokasi: z.string().trim().max(300).optional().nullable(),
});
type InputTeguran = z.infer<typeof teguranSchema>;

async function susunTeguran(v: InputTeguran) {
  const a = v.aduanId ? await ambilAduan(v.aduanId) : null;
  const teradu = v.teradu ?? (a?.teradu_nama
    ? { jenis: a.teradu_jenis, refId: a.teradu_ref_id ?? a.usaha_id, nama: a.teradu_nama, alamat: a.teradu_alamat, rt: a.rt_lokasi }
    : null);
  if (!teradu?.nama) throw new WilayahError(400, "Tetapkan dulu pihak yang diadukan (nama) sebelum menerbitkan teguran");
  const kunci = (v.teradu ? kunciTeradu(teradu.jenis, teradu.refId, teradu.nama) : a?.teradu_kunci) ?? kunciTeradu(teradu.jenis, teradu.refId, teradu.nama);
  if (!kunci) throw new WilayahError(400, "Nama pihak yang ditegur terlalu pendek");
  if (v.tenggat < hariIniWib()) throw new WilayahError(400, "Batas waktu perbaikan tidak boleh sebelum hari ini");

  const riwayat = await riwayatTeguran(kunci);
  const info = TINGKAT_TEGURAN_INFO[v.tingkat];
  const judul = a?.judul ?? v.pelanggaran.slice(0, 80);
  const perihal = `${info.label} — ${judul}`;
  const riwayatTeks = riwayat
    .filter((r) => r.status !== "dicabut")
    .slice(0, 5)
    .map((r) => `${TINGKAT_TEGURAN_INFO[r.tingkat as TingkatTeguran]?.label ?? r.tingkat}${r.nomorSurat ? ` nomor ${r.nomorSurat}` : ""} tanggal ${tanggalPendek(r.dibuat)}`);
  const rt = teradu.rt ?? a?.rt_lokasi ?? null;
  const umum: DataDokumen = {
    tingkatTeguran: TINGKAT_TEGURAN_CETAK[TINGKAT_TEGURAN.indexOf(v.tingkat)],
    dasarTeguran: a ? `Aduan warga nomor ${a.nomor} yang telah diperiksa pengurus RW 03` : "Hasil pemantauan pengurus RW 03",
    pelanggaran: v.pelanggaran,
    kewajibanPerbaikan: v.kewajiban,
    tenggatPerbaikan: v.tenggat,
    riwayatTeguran: riwayatTeks,
    konsekuensi: info.konsekuensi,
    lokasi: v.lokasi || a?.lokasi || "",
    sumberFakta: a ? `Aduan ${a.nomor}` : "Temuan pengurus",
  };
  const jenisPihak: JenisPihak = teradu.jenis === "usaha" ? "usaha" : teradu.jenis === "pihak_lain" ? "eksternal" : "warga";
  const dataForm: DataDokumen = v.tingkat === "lisan"
    ? { ...umum, pihakDitegur: teradu.nama, alamatDitegur: teradu.alamat ?? "" }
    : {
        ...umum,
        penerima: [{ nama: teradu.nama, jenis: jenisPihak, rt, peran: teradu.alamat ?? undefined }],
        tembusan: [...(rt ? [`Ketua RT ${String(rt).padStart(2, "0")} RW 03`] : []), ...(v.tingkat === "sp3" ? ["Lurah Padasuka"] : []), "Arsip"],
      };
  return {
    aduan: a,
    teradu: { ...teradu, kunci },
    kodeJenis: v.tingkat === "lisan" ? "b_teguran_lisan" : "b_sp",
    perihal,
    dataForm,
    rt,
  };
}

export async function pratinjauTeguran(raw: unknown) {
  const v = teguranSchema.parse(raw);
  const s = await susunTeguran(v);
  const jenis = PETA_JENIS[s.kodeJenis];
  const bloks = renderDokumen(jenis, s.dataForm, { nomor: null, tanggal: hariIniWib(), perihal: s.perihal, draft: true }, "terbatas");
  const { buffer } = await buatPdf({ bloks, nomor: null, draft: true, judul: s.perihal });
  return { buffer, nama: "pratinjau-teguran.pdf" };
}

export async function terbitkanTeguran(aktor: Aktor, raw: unknown) {
  const v = teguranSchema.parse(raw);
  const s = await susunTeguran(v);
  const draft = await layanan.simpanDraft(aktor, {
    kodeJenis: s.kodeJenis,
    perihal: s.perihal,
    tanggalSurat: hariIniWib(),
    dataForm: s.dataForm,
    akses: "terbatas",
    rtTerkait: s.rt && s.rt <= 7 ? [s.rt] : [],
  });
  let nomorSurat: string;
  try {
    nomorSurat = (await layanan.terbitkan(aktor, draft.id)).nomorSurat;
  } catch (e) {
    await layanan.hapusDraft(aktor, draft.id).catch(() => undefined);
    throw e;
  }
  const label = TINGKAT_TEGURAN_INFO[v.tingkat].label;
  const teguran = await denganTransaksi(async (c) => {
    const { rows } = await c.query(
      `INSERT INTO aduan_teguran (aduan_id, teradu_kunci, teradu_jenis, teradu_nama, teradu_alamat, tingkat, pelanggaran, kewajiban,
                                  tenggat, surat_id, nomor_surat, status, oleh)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'aktif',$12) RETURNING *`,
      [s.aduan?.id ?? null, s.teradu.kunci, s.teradu.jenis, s.teradu.nama, s.teradu.alamat ?? null, v.tingkat, v.pelanggaran,
        v.kewajiban.join("\n"), v.tenggat, draft.id, nomorSurat, aktor.label],
    );
    if (s.aduan) {
      await c.query(`UPDATE aduan SET status = 'teguran', ditangani_oleh = $2, updated_at = now(), selesai_at = NULL WHERE id = $1`, [s.aduan.id, aktor.label]);
      await catatTimeline(c, s.aduan.id, "teguran", `${label} resmi telah diterbitkan kepada pihak yang diadukan, dengan batas waktu perbaikan ${tanggalPendek(v.tenggat)}.`, true, aktor.label);
      await catatTimeline(c, s.aduan.id, "surat", `Surat ${nomorSurat} terbit (${label}).`, false, aktor.label);
    }
    return rows[0];
  });
  return petakanTeguran(teguran);
}

// ---------------------------------------------------------------- Daftar & status teguran
export async function daftarTeguran(filter: string) {
  const hariIni = hariIniWib();
  const syarat =
    filter === "semua" ? "TRUE"
    : filter === "lewat" ? `t.status = 'aktif' AND t.tenggat IS NOT NULL AND t.tenggat < $1`
    : `t.status = 'aktif' AND $1::text IS NOT NULL`;
  const { rows } = await pool.query(
    `SELECT t.*, a.nomor AS aduan_nomor, a.judul AS aduan_judul
       FROM aduan_teguran t LEFT JOIN aduan a ON a.id = t.aduan_id
      WHERE ${syarat}
      ORDER BY ${filter === "semua" ? "t.created_at DESC" : "t.tenggat NULLS LAST, t.created_at"} LIMIT 300`,
    filter === "semua" ? [] : [hariIni],
  );
  return rows.map((r) => ({
    ...petakanTeguran(r),
    aduanNomor: r.aduan_nomor,
    aduanJudul: r.aduan_judul,
    lewat: r.status === "aktif" && !!r.tenggat && r.tenggat < hariIni,
  }));
}

const ubahTeguranSchema = z.object({
  status: z.enum(STATUS_TEGURAN).optional(),
  caraSerah: z.enum(CARA_SERAH_TEGURAN).optional().nullable(),
  diserahkanAt: z.string().regex(DATE_REGEX).optional().nullable(),
  catatan: z.string().trim().max(1000).optional().nullable(),
});

export async function ubahTeguran(aktor: Aktor, id: number, raw: unknown) {
  const v = ubahTeguranSchema.parse(raw);
  const { rows } = await pool.query(`SELECT * FROM aduan_teguran WHERE id = $1`, [id]);
  const t = rows[0];
  if (!t) throw new WilayahError(404, "Teguran tidak ditemukan");
  if (v.status === "dicabut" && !v.catatan?.trim()) throw new WilayahError(400, "Tulis alasan pencabutan teguran");
  const label = TINGKAT_TEGURAN_INFO[t.tingkat as TingkatTeguran]?.label ?? t.tingkat;
  await denganTransaksi(async (c) => {
    await c.query(
      `UPDATE aduan_teguran SET status = COALESCE($2, status), cara_serah = COALESCE($3, cara_serah),
              diserahkan_at = COALESCE($4::timestamp, diserahkan_at), catatan = COALESCE($5, catatan), updated_at = now()
        WHERE id = $1`,
      [id, v.status ?? null, v.caraSerah ?? null, v.diserahkanAt ?? null, v.catatan || null],
    );
    if (!t.aduan_id) return;
    if (v.caraSerah) await catatTimeline(c, t.aduan_id, "serah", `${label} sudah disampaikan kepada pihak yang diadukan.`, true, aktor.label);
    if (v.status && v.status !== t.status) {
      if (v.status === "dipatuhi") {
        await catatTimeline(c, t.aduan_id, "dipatuhi", "Pihak yang diadukan sudah melakukan perbaikan sesuai teguran.", true, aktor.label);
        const sisa = await c.query(`SELECT 1 FROM aduan_teguran WHERE aduan_id = $1 AND status = 'aktif' AND id <> $2`, [t.aduan_id, id]);
        if (!sisa.rows[0]) {
          await c.query(`UPDATE aduan SET status = 'selesai', selesai_at = now(), updated_at = now() WHERE id = $1 AND status = 'teguran'`, [t.aduan_id]);
          await catatTimeline(c, t.aduan_id, "status", "Aduan selesai ditangani", true, aktor.label);
        }
      } else if (v.status === "tidak_dipatuhi") {
        await catatTimeline(c, t.aduan_id, "tidak_dipatuhi", `${label} tidak diindahkan sampai batas waktu. Tindakan lanjutan disiapkan.`, true, aktor.label);
      } else if (v.status === "dicabut") {
        await catatTimeline(c, t.aduan_id, "dicabut", `${label} dicabut. Alasan: ${v.catatan}`, false, aktor.label);
      }
    }
  });
  const { rows: baru } = await pool.query(`SELECT * FROM aduan_teguran WHERE id = $1`, [id]);
  const riwayat = await riwayatTeguran(baru[0].teradu_kunci);
  return { teguran: petakanTeguran(baru[0]), saranBerikut: saranDariRiwayat(riwayat) };
}

// ---------------------------------------------------------------- Undangan klarifikasi
const klarifikasiSchema = z.object({
  tanggal: z.string().regex(DATE_REGEX, "Pilih tanggal pertemuan"),
  jam: z.string().regex(/^\d{2}[.:]\d{2}$/, "Isi jam, contoh 19:30"),
  tempat: z.string().trim().min(3).max(200),
  terbit: z.boolean().default(false),
});

export async function undangKlarifikasi(aktor: Aktor, aduanId: number, raw: unknown) {
  const v = klarifikasiSchema.parse(raw);
  const a = await ambilAduan(aduanId);
  if (!a.teradu_nama) throw new WilayahError(400, "Tetapkan dulu pihak yang diadukan sebelum mengundang klarifikasi");
  const kategori = KATEGORI_ADUAN_INFO[a.kategori as KategoriAduan]?.label.toLowerCase() ?? "permasalahan lingkungan";
  const jenisPihak: JenisPihak = a.teradu_jenis === "usaha" ? "usaha" : a.teradu_jenis === "pihak_lain" ? "eksternal" : "warga";
  const perihal = `Klarifikasi mengenai ${kategori}${a.lokasi ? ` di ${a.lokasi}` : ""}`.slice(0, 280);
  const draft = await layanan.simpanDraft(aktor, {
    kodeJenis: "b_klarifikasi",
    perihal,
    tanggalSurat: hariIniWib(),
    dataForm: {
      penerima: [{ nama: a.teradu_nama, jenis: jenisPihak, rt: a.rt_lokasi ?? undefined, peran: a.teradu_alamat ?? undefined }],
      waktuAcara: v.tanggal,
      jamAcara: v.jam.replace(".", ":"),
      tempatAcara: v.tempat,
      pokokPenjelasan: [`Informasi mengenai ${kategori} yang disampaikan kepada pengurus RW 03`],
      lokasi: a.lokasi ?? "",
      sumberFakta: `Aduan ${a.nomor}`,
    },
    akses: "terbatas",
    rtTerkait: a.rt_lokasi ? [a.rt_lokasi] : [],
  });
  let nomorSurat: string | null = null;
  if (v.terbit) nomorSurat = (await layanan.terbitkan(aktor, draft.id)).nomorSurat;
  await denganTransaksi(async (c) => {
    await c.query(`UPDATE aduan SET status = 'klarifikasi', ditangani_oleh = $2, updated_at = now() WHERE id = $1`, [aduanId, aktor.label]);
    await catatTimeline(c, aduanId, "status", `Pihak yang diadukan diundang memberi keterangan pada ${tanggalPendek(v.tanggal)}.`, true, aktor.label);
    await catatTimeline(c, aduanId, "surat", nomorSurat ? `Undangan klarifikasi ${nomorSurat} terbit.` : `Draf undangan klarifikasi dibuat di Surat Sakti (#${draft.id}).`, false, aktor.label);
  });
  return { suratId: draft.id, nomorSurat };
}

// ---------------------------------------------------------------- Teruskan ke RW3BIZ (denda usaha)
export async function teruskanKeRw3biz(aktor: Aktor, aduanId: number) {
  const a = await ambilAduan(aduanId);
  if (a.rw3biz_pelanggaran_id) throw new WilayahError(409, "Aduan ini sudah diteruskan ke RW3BIZ");
  if (a.teradu_jenis !== "usaha") throw new WilayahError(400, "Hanya aduan terhadap usaha yang dapat diteruskan ke RW3BIZ");
  const { rows: foto } = await pool.query(`SELECT mime, data FROM aduan_bukti WHERE aduan_id = $1 ORDER BY id LIMIT 1`, [aduanId]);
  const fotoData = foto[0] ? `data:${foto[0].mime};base64,${(foto[0].data as Buffer).toString("base64")}` : null;
  const tingkat = a.dampak === "membahayakan" ? "berat" : a.dampak === "merugikan" ? "sedang" : "ringan";
  const id = await denganTransaksi(async (c) => {
    const { rows } = await c.query(
      `INSERT INTO rw3biz_pelanggaran (usaha_id, nama_usaha_lain, jenis, tingkat, sumber, tanggal_kejadian, lokasi, uraian, foto_data,
                                       status, dicatat_oleh)
       VALUES ($1, $2, $3, $4, 'aduan_warga', $5, $6, $7, $8, 'menunggu_verifikasi', $9) RETURNING id`,
      [a.usaha_id, a.usaha_id ? null : a.teradu_nama, KATEGORI_KE_PELANGGARAN_BIZ[a.kategori as KategoriAduan] ?? "lainnya", tingkat,
        a.tanggal_kejadian || hariIniWib(), a.lokasi, `[${a.nomor}] ${a.judul}\n\n${a.uraian}`, fotoData, aktor.label],
    );
    await c.query(`UPDATE aduan SET rw3biz_pelanggaran_id = $2, updated_at = now() WHERE id = $1`, [aduanId, rows[0].id]);
    await catatTimeline(c, aduanId, "rw3biz", "Aduan diteruskan ke penanganan pelanggaran usaha RW3BIZ.", true, aktor.label);
    return rows[0].id as number;
  });
  return { pelanggaranId: id };
}

/**
 * Surat Sakti v2: draft → pratinjau → terbit (nomor atomik + snapshot + PDF, satu transaksi)
 * → distribusi & tindak lanjut (lihat tindak.ts). Dokumen final tidak pernah ditimpa;
 * koreksi = dokumen pengganti, pembatalan tercatat.
 */
import crypto from "crypto";
import { z } from "zod";
import { pool } from "../db";
import { catatAudit, WilayahError, type Aktor } from "../wilayah-auth";
import { denganTransaksi } from "../wilayah-data";
import { alokasiNomorUrut } from "../wilayah-surat";
import { formatNomorKode } from "@shared/surat-nomor";
import {
  barisTabel, daftarPihak, jenisDariKode, jenisDariLabelLama, PETA_JENIS, prefillLanjutan, renderDokumen, renderTeksLama,
  statusDistribusi, statusDokumen, statusPekerjaan, str, teksPihak, teksPolos, validasiDokumen, isoHariIni, terlambat,
  type Blok, type DataDokumen, type JenisDokumen,
} from "@shared/surat-sakti";
import { buatPdf } from "./pdf";
import { hanyaRw, kondisiBacaRt, pastikanBoleh } from "./akses";

export function situs(): string {
  return (process.env.PUBLIC_SITE_URL || "https://rw3padasukacimahi.org").replace(/\/+$/, "");
}

const KOLOM = `s.id, s.nomor_surat, s.jenis_surat, s.kode_jenis, s.perihal, s.tujuan, s.tanggal_surat, s.status, s.data_form,
  s.dibuat_oleh, s.diterbitkan_at, s.dibatalkan_at, s.alasan_batal, s.mengganti_id, s.kejadian_id, s.kegiatan_id, s.permintaan_id,
  s.rangkaian_id, s.induk_id, s.akses, s.rt_terkait, s.template_versi, s.perlu_pemeriksaan, s.created_at, s.updated_at,
  (s.snapshot IS NOT NULL) AS final_v2`;

function petakan(r: any) {
  return {
    id: r.id, nomorSurat: r.nomor_surat, jenisSurat: r.jenis_surat, kodeJenis: r.kode_jenis, perihal: r.perihal, tujuan: r.tujuan,
    tanggalSurat: r.tanggal_surat, status: r.status, dataForm: r.data_form ?? {}, dibuatOleh: r.dibuat_oleh,
    diterbitkanAt: r.diterbitkan_at, dibatalkanAt: r.dibatalkan_at, alasanBatal: r.alasan_batal, menggantiId: r.mengganti_id,
    kejadianId: r.kejadian_id, kegiatanId: r.kegiatan_id, permintaanId: r.permintaan_id, rangkaianId: r.rangkaian_id, indukId: r.induk_id,
    akses: r.akses, rtTerkait: r.rt_terkait ?? [], templateVersi: r.template_versi, perluPemeriksaan: r.perlu_pemeriksaan,
    finalV2: r.final_v2, createdAt: r.created_at, updatedAt: r.updated_at,
  };
}

/** Status turunan dari catatan distribusi/tindak (bukan diisi manual). */
function statusTurunan(r: any, hariIni: string) {
  const kirim: { status: string }[] = r.kirim_status ?? [];
  const tindak: { status: string; tenggat: string | null }[] = r.tindak_ringkas ?? [];
  return {
    statusDokumen: statusDokumen({ status: r.status }),
    statusDistribusi: statusDistribusi(kirim),
    statusPekerjaan: statusPekerjaan(tindak),
    terlambat: tindak.filter((t) => terlambat(t, hariIni)).length,
  };
}

const AGREGAT = `,
  (SELECT COALESCE(json_agg(json_build_object('status', k.status)), '[]') FROM wil_surat_kirim k WHERE k.surat_id = s.id) AS kirim_status,
  (SELECT COALESCE(json_agg(json_build_object('status', t.status, 'tenggat', to_char(t.tenggat, 'YYYY-MM-DD'))), '[]') FROM wil_surat_tindak t WHERE t.surat_id = s.id) AS tindak_ringkas`;

export async function daftarSurat(aktor: Aktor, q: { bagian?: string; cari?: string; rangkaianId?: number }) {
  const cari = q.cari?.trim() ? `%${q.cari.trim()}%` : null;
  const syarat: string[] = [];
  const param: unknown[] = [cari];
  if (aktor.role === "rt") {
    param.push(aktor.rt);
    syarat.push(kondisiBacaRt(`$${param.length}::int`));
  } else {
    const bagian: Record<string, string> = {
      draft: `s.status = 'draft'`,
      arsip: `s.status <> 'draft'`,
      belum_distribusi: `s.status = 'terbit' AND NOT EXISTS (SELECT 1 FROM wil_surat_kirim k WHERE k.surat_id = s.id AND k.status IN ('diserahkan', 'diterima'))`,
      perlu_pemeriksaan: `s.status = 'draft' AND s.perlu_pemeriksaan`,
      semua: `TRUE`,
    };
    syarat.push(bagian[q.bagian ?? "arsip"] ?? bagian.arsip);
  }
  if (q.rangkaianId) {
    param.push(q.rangkaianId);
    syarat.push(`s.rangkaian_id = $${param.length}`);
  }
  const { rows } = await pool.query(
    `SELECT ${KOLOM} ${AGREGAT}
       FROM surat_rw s
      WHERE ${syarat.join(" AND ")}
        AND ($1::text IS NULL OR s.perihal ILIKE $1 OR s.nomor_surat ILIKE $1 OR s.tujuan ILIKE $1 OR s.jenis_surat ILIKE $1)
      ORDER BY COALESCE(s.diterbitkan_at, s.updated_at, s.created_at) DESC LIMIT 300`,
    param,
  );
  const hariIni = isoHariIni();
  return rows.map((r) => {
    const p = petakan(r);
    // RT tidak menerima isi form (bisa memuat catatan internal); cukup metadata dan PDF.
    return { ...p, dataForm: aktor.role === "rw" ? p.dataForm : undefined, ...statusTurunan(r, hariIni) };
  });
}

export async function detailSurat(aktor: Aktor, id: number) {
  await pastikanBoleh(aktor, id);
  const { rows } = await pool.query(`SELECT ${KOLOM} ${AGREGAT}, s.snapshot FROM surat_rw s WHERE s.id = $1`, [id]);
  if (!rows[0]) throw new WilayahError(404, "Dokumen tidak ditemukan");
  const r = rows[0];
  const rw = aktor.role === "rw";
  const [lampiran, kirim, tindak, update, terkait, masuk, bantuan] = await Promise.all([
    pool.query(`SELECT id, nama, mime, length(data) AS ukuran, created_at FROM wil_surat_lampiran WHERE surat_id = $1 ORDER BY id`, [id]),
    rw ? pool.query(`SELECT id, kanal, penerima, status, catatan, (bukti IS NOT NULL) AS ada_bukti, CASE WHEN bukti LIKE 'data:%' THEN NULL ELSE bukti END AS bukti_teks,
                       dikirim_pada, diterima_pada, dicatat_oleh FROM wil_surat_kirim WHERE surat_id = $1 ORDER BY dikirim_pada`, [id]) : { rows: [] },
    pool.query(`SELECT id, COALESCE(tindakan, catatan) AS tindakan, status, progres, pic_nama, pic_jenis, pic_rt, to_char(tenggat, 'YYYY-MM-DD') AS tenggat,
                       evaluasi, (bukti IS NOT NULL) AS ada_bukti, oleh, created_at, updated_at
                  FROM wil_surat_tindak WHERE surat_id = $1 AND ($2::int IS NULL OR pic_rt = $2) ORDER BY id`, [id, rw ? null : aktor.rt]),
    pool.query(`SELECT u.id, u.tindak_id, u.progres, u.status, u.catatan, u.sumber, u.oleh, u.created_at, (u.bukti IS NOT NULL) AS ada_bukti
                  FROM wil_surat_tindak_update u JOIN wil_surat_tindak t ON t.id = u.tindak_id WHERE t.surat_id = $1 ORDER BY u.id`, [id]),
    pool.query(`SELECT id, nomor_surat, kode_jenis, jenis_surat, perihal, status, induk_id, mengganti_id FROM surat_rw
                 WHERE (induk_id = $1 OR mengganti_id = $1 OR id = $2 OR id = $3) AND id <> $1 ORDER BY id`, [id, r.induk_id ?? 0, r.mengganti_id ?? 0]),
    rw ? pool.query(`SELECT id, pengirim, nomor, to_char(tanggal, 'YYYY-MM-DD') AS tanggal, perihal, ringkasan, berkas_nama, created_at FROM wil_surat_masuk WHERE membalas_id = $1 ORDER BY tanggal`, [id]) : { rows: [] },
    rw ? pool.query(`SELECT id, tahap, uraian, jumlah, satuan, nominal, pemberi, to_char(tanggal, 'YYYY-MM-DD') AS tanggal, (bukti IS NOT NULL) AS ada_bukti FROM wil_surat_bantuan WHERE surat_id = $1 ORDER BY tanggal, id`, [id]) : { rows: [] },
  ]);
  const p = petakan(r);
  const jenis = jenisDariKode(p.kodeJenis);
  const validasi = rw && p.status === "draft" && jenis
    ? validasiDokumen(jenis, p.dataForm, { perihal: p.perihal, tanggal: p.tanggalSurat ?? "" })
    : null;
  const snapshot = r.snapshot as { bloks?: Blok[]; peringatan?: string[] } | null;
  const updatePerTindak = new Map<number, any[]>();
  for (const u of update.rows) updatePerTindak.set(u.tindak_id, [...(updatePerTindak.get(u.tindak_id) ?? []), u]);
  return {
    ...p,
    dataForm: rw ? p.dataForm : undefined,
    ...statusTurunan(r, isoHariIni()),
    pratinjau: rw ? (snapshot?.bloks ?? (jenis ? renderDokumen(jenis, p.dataForm, { nomor: p.nomorSurat, tanggal: p.tanggalSurat ?? "", perihal: p.perihal, draft: p.status === "draft", jumlahLampiran: lampiran.rows.length }, p.akses) : null)) : undefined,
    peringatanTerbit: snapshot?.peringatan ?? [],
    validasi,
    lampiran: lampiran.rows,
    kirim: kirim.rows,
    tindak: tindak.rows.map((t) => ({ ...t, update: updatePerTindak.get(t.id) ?? [] })),
    terkait: rw ? terkait.rows : [],
    masuk: masuk.rows,
    bantuan: bantuan.rows,
  };
}

// ------------------------------------------------------------------ draft
const pihakSchema = z.object({
  nama: z.string().trim().min(1).max(200), peran: z.string().max(200).optional(), jenis: z.string().max(30),
  rt: z.number().int().min(1).max(7).nullable().optional(), kontak: z.string().max(100).optional(), sumber: z.string().max(40).optional(),
  sumberId: z.number().int().optional(),
});

const draftSchema = z.object({
  kodeJenis: z.string().refine((k) => !!PETA_JENIS[k], "Jenis dokumen tidak dikenal"),
  perihal: z.string().trim().min(3).max(300),
  tanggalSurat: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dataForm: z.record(z.string(), z.unknown()).default({}),
  akses: z.enum(["internal", "rt_terkait", "terbatas"]).default("rt_terkait"),
  rtTerkait: z.array(z.number().int().min(1).max(7)).max(7).default([]),
  rangkaianId: z.number().int().positive().nullable().optional(),
  indukId: z.number().int().positive().nullable().optional(),
  kejadianId: z.number().int().positive().nullable().optional(),
  kegiatanId: z.number().int().positive().nullable().optional(),
  permintaanId: z.number().int().positive().nullable().optional(),
  idempotencyKey: z.string().min(16).max(64).optional(),
});

function cekUkuranData(d: DataDokumen) {
  if (JSON.stringify(d).length > 400_000) throw new WilayahError(400, "Isian terlalu besar. Lampirkan dokumen sebagai berkas.");
  for (const [k, v] of Object.entries(d)) {
    if (Array.isArray(v) && v.length > 500) throw new WilayahError(400, `Isian ${k} terlalu banyak baris`);
  }
}

function tujuanDari(d: DataDokumen): string | null {
  const ps = daftarPihak(d.penerima);
  return ps.length ? ps.map(teksPihak).join("; ").slice(0, 500) : null;
}

export async function simpanDraft(aktor: Aktor, input: unknown, id?: number) {
  hanyaRw(aktor);
  const d = draftSchema.parse(input);
  cekUkuranData(d.dataForm);
  for (const p of daftarPihak(d.dataForm.penerima)) pihakSchema.parse(p);
  const jenis = PETA_JENIS[d.kodeJenis];
  const v = validasiDokumen(jenis, d.dataForm, { perihal: d.perihal, tanggal: d.tanggalSurat });
  const isi = teksPolos(renderDokumen(jenis, d.dataForm, { nomor: null, tanggal: d.tanggalSurat, perihal: d.perihal, draft: true }, d.akses));
  const nilai = [d.kodeJenis, jenis.label, d.perihal, tujuanDari(d.dataForm), d.tanggalSurat, isi, JSON.stringify(d.dataForm), d.akses, d.rtTerkait,
    d.rangkaianId ?? null, d.kejadianId ?? null, d.kegiatanId ?? null, v.perluPemeriksaan];
  if (id) {
    const { rows } = await pool.query(
      `UPDATE surat_rw SET kode_jenis = $2, jenis_surat = $3, perihal = $4, tujuan = $5, tanggal_surat = $6, isi_surat = $7, data_form = $8,
              akses = $9, rt_terkait = $10, rangkaian_id = $11, kejadian_id = $12, kegiatan_id = $13, perlu_pemeriksaan = $14, updated_at = now()
        WHERE id = $1 AND status = 'draft' RETURNING ${KOLOM.replace(/s\./g, "")}`,
      [id, ...nilai],
    );
    if (!rows[0]) throw new WilayahError(409, "Hanya draft yang dapat diubah. Dokumen terbit bersifat tetap.");
    return { ...petakan(rows[0]), validasi: v };
  }
  if (d.idempotencyKey) {
    const { rows } = await pool.query(`SELECT ${KOLOM} FROM surat_rw s WHERE s.idempotency_key = $1`, [d.idempotencyKey]);
    if (rows[0]) return { ...petakan(rows[0]), validasi: v };
  }
  const { rows } = await pool.query(
    `INSERT INTO surat_rw (kode_jenis, jenis_surat, perihal, tujuan, tanggal_surat, isi_surat, data_form, akses, rt_terkait, rangkaian_id,
                           kejadian_id, kegiatan_id, perlu_pemeriksaan, status, dibuat_oleh, induk_id, permintaan_id, idempotency_key, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'draft', $14, $15, $16, $17, now())
     ON CONFLICT (idempotency_key) WHERE idempotency_key IS NOT NULL DO NOTHING
     RETURNING ${KOLOM.replace(/s\./g, "")}`,
    [...nilai, aktor.label, d.indukId ?? null, d.permintaanId ?? null, d.idempotencyKey ?? null],
  );
  if (!rows[0]) {
    const again = await pool.query(`SELECT ${KOLOM} FROM surat_rw s WHERE s.idempotency_key = $1`, [d.idempotencyKey]);
    return { ...petakan(again.rows[0]), validasi: v };
  }
  if (d.permintaanId) {
    await pool.query(`UPDATE wil_permintaan_surat SET status = 'diproses', surat_id = $2, updated_at = now() WHERE id = $1 AND status = 'baru'`, [d.permintaanId, rows[0].id]);
  }
  await catatAudit(aktor, "buat_draft_surat", "surat", rows[0].id, null, null, { kode: d.kodeJenis });
  return { ...petakan(rows[0]), validasi: v };
}

export async function hapusDraft(aktor: Aktor, id: number) {
  hanyaRw(aktor);
  await denganTransaksi(async (c) => {
    const { rows } = await c.query(`SELECT status FROM surat_rw WHERE id = $1 FOR UPDATE`, [id]);
    if (rows[0]?.status !== "draft") throw new WilayahError(409, "Hanya draft yang dapat dihapus");
    // Permintaan RT kembali ke antrean, bukan ikut hilang.
    await c.query(`UPDATE wil_permintaan_surat SET status = 'baru', surat_id = NULL, updated_at = now() WHERE surat_id = $1 AND status = 'diproses'`, [id]);
    await c.query(`DELETE FROM surat_rw WHERE id = $1 AND status = 'draft'`, [id]);
    await catatAudit(aktor, "hapus_draft_surat", "surat", id, null, null, null, c);
  });
  return { ok: true };
}

// ------------------------------------------------------------------ PDF
function jenisBaris(r: { kode_jenis: string | null; jenis_surat: string }): JenisDokumen | undefined {
  return jenisDariKode(r.kode_jenis) ?? undefined;
}

export async function pratinjauPdf(aktor: Aktor, id: number): Promise<{ buffer: Buffer; nama: string }> {
  hanyaRw(aktor);
  const { rows } = await pool.query(
    `SELECT s.*, (SELECT COUNT(*)::int FROM wil_surat_lampiran l WHERE l.surat_id = s.id) AS n_lampiran FROM surat_rw s WHERE s.id = $1`, [id]);
  const s = rows[0];
  if (!s) throw new WilayahError(404, "Dokumen tidak ditemukan");
  if (s.status !== "draft") return unduhPdf(aktor, id);
  const jenis = jenisBaris(s);
  const meta = { nomor: null, tanggal: s.tanggal_surat ?? isoHariIni(), perihal: s.perihal, draft: true, jumlahLampiran: s.n_lampiran };
  const bloks = jenis ? renderDokumen(jenis, s.data_form ?? {}, meta, s.akses) : renderTeksLama(s.isi_surat ?? "", meta);
  const { buffer } = await buatPdf({ bloks, nomor: null, draft: true, judul: s.perihal });
  return { buffer, nama: `DRAF-${namaBerkas(s.perihal)}.pdf` };
}

function namaBerkas(s: string) {
  return s.replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "_").slice(0, 60) || "dokumen";
}

export async function unduhPdf(aktor: Aktor, id: number): Promise<{ buffer: Buffer; nama: string }> {
  await pastikanBoleh(aktor, id);
  const { rows } = await pool.query(
    `SELECT s.id, s.status, s.nomor_surat, s.perihal, s.isi_surat, s.tanggal_surat, b.pdf_data
       FROM surat_rw s LEFT JOIN wil_surat_berkas b ON b.surat_id = s.id WHERE s.id = $1`, [id]);
  const s = rows[0];
  if (!s) throw new WilayahError(404, "Dokumen tidak ditemukan");
  if (s.status === "draft") throw new WilayahError(409, "Draft hanya dapat dipratinjau");
  if (aktor.role === "rt") await catatAudit(aktor, "unduh_surat", "surat", id, aktor.rt);
  const nama = `${namaBerkas(s.nomor_surat ?? String(s.id))}.pdf`;
  if (s.pdf_data) return { buffer: Buffer.from(s.pdf_data, "base64"), nama };
  // Arsip lama (sebelum v2): dibentuk dari teks tersimpan, tidak disimpan ulang, nomor tidak diubah.
  const bloks = renderTeksLama(s.isi_surat ?? "", { nomor: s.nomor_surat, tanggal: s.tanggal_surat ?? "", perihal: s.perihal, draft: false });
  const { buffer } = await buatPdf({ bloks, nomor: s.nomor_surat, draft: false, judul: s.perihal });
  return { buffer, nama };
}

// ------------------------------------------------------------------ terbit
/** "Ketua RT 02" / "RT 2 (Budi)" → 2. PIC RT dapat melaporkan progres dari akun RT-nya. */
export function rtDariTeks(s: string | undefined): number | null {
  const m = /\bRT\s*0?([1-7])\b/i.exec(s ?? "");
  return m ? Number(m[1]) : null;
}

export async function terbitkan(aktor: Aktor, id: number) {
  hanyaRw(aktor);
  return denganTransaksi(async (c) => {
    const { rows } = await c.query(`SELECT * FROM surat_rw WHERE id = $1 FOR UPDATE`, [id]);
    const s = rows[0];
    if (!s) throw new WilayahError(404, "Dokumen tidak ditemukan");
    if (s.status !== "draft") throw new WilayahError(409, `Dokumen sudah ${s.status}${s.nomor_surat ? ` dengan nomor ${s.nomor_surat}` : ""}`);
    const jenis = jenisBaris(s);
    if (!jenis) {
      const lama = jenisDariLabelLama(s.jenis_surat);
      throw new WilayahError(400, `Draft format lama. Buka draft lalu pilih jenis dokumen${lama ? ` (${lama.label})` : ""} dan lengkapi formulir sebelum terbit.`);
    }
    const data: DataDokumen = s.data_form ?? {};
    const v = validasiDokumen(jenis, data, { perihal: s.perihal, tanggal: s.tanggal_surat });
    if (v.galat.length) throw new WilayahError(400, `Belum dapat terbit: ${v.galat.join("; ")}`);
    const [y, m] = String(s.tanggal_surat).split("-").map(Number);
    const urut = await alokasiNomorUrut(c, y);
    const nomor = formatNomorKode(urut, jenis.nomorKode, y, m);
    const token = crypto.randomBytes(18).toString("base64url");
    const { rows: lamp } = await c.query(`SELECT COUNT(*)::int AS n FROM wil_surat_lampiran WHERE surat_id = $1`, [id]);
    const meta = { nomor, tanggal: s.tanggal_surat, perihal: s.perihal, draft: false, jumlahLampiran: lamp[0].n };
    const bloks = renderDokumen(jenis, data, meta, s.akses);
    const verifikasiUrl = `${situs()}/verify/surat/${token}`;
    const { buffer, halaman } = await buatPdf({ bloks, nomor, draft: false, verifikasiUrl, judul: s.perihal });
    const sha = crypto.createHash("sha256").update(buffer).digest("hex");
    const snapshot = {
      format: 1, kode: jenis.kode, label: jenis.label, templateVersi: jenis.versi, meta, data, bloks,
      peringatan: v.peringatan, penerbit: aktor.label, diterbitkanPada: new Date().toISOString(), pdfSha256: sha,
    };
    await c.query(
      `UPDATE surat_rw SET status = 'terbit', nomor_surat = $2, nomor_urut = $3, tahun_nomor = $4, diterbitkan_at = now(), updated_at = now(),
              snapshot = $5, template_versi = $6, verifikasi_token = $7, isi_surat = $8, perlu_pemeriksaan = false
        WHERE id = $1`,
      [id, nomor, urut, y, JSON.stringify(snapshot), jenis.versi, token, teksPolos(bloks)],
    );
    await c.query(`INSERT INTO wil_surat_berkas (surat_id, pdf_data, sha256, halaman) VALUES ($1, $2, $3, $4)`, [id, buffer.toString("base64"), sha, halaman]);
    if (s.mengganti_id) {
      await c.query(
        `UPDATE surat_rw SET status = 'digantikan', dibatalkan_at = now(), alasan_batal = TRIM(COALESCE(alasan_batal, '') || ' Digantikan oleh ' || $2::text), updated_at = now()
          WHERE id = $1 AND status = 'terbit'`,
        [s.mengganti_id, nomor],
      );
    }
    if (s.permintaan_id) await c.query(`UPDATE wil_permintaan_surat SET status = 'selesai', surat_id = $2, updated_at = now() WHERE id = $1`, [s.permintaan_id, id]);
    // Rencana tindak lanjut dari wizard → catatan tindak lanjut nyata.
    for (const t of barisTabel(data.tindakRencana)) {
      if (!t.tindakan) continue;
      await c.query(
        `INSERT INTO wil_surat_tindak (surat_id, catatan, tindakan, pic_nama, pic_rt, tenggat, oleh, status, updated_at)
         VALUES ($1, $2, $2, $3, $4, $5, $6, 'menunggu', now())`,
        [id, t.tindakan, t.pic || null, rtDariTeks(t.pic), /^\d{4}-\d{2}-\d{2}$/.test(t.tenggat ?? "") ? t.tenggat : null, aktor.label],
      );
    }
    // Permohonan dukungan: catat yang DIMOHONKAN saja (bukan pemasukan).
    if (jenis.kelompok.includes("bantuan")) {
      const nominal = Number(String(data.nominal ?? "").replace(/[^\d]/g, "")) || null;
      await c.query(
        `INSERT INTO wil_surat_bantuan (surat_id, rangkaian_id, tahap, uraian, nominal, pemberi, tanggal, dicatat_oleh)
         VALUES ($1, $2, 'dimohonkan', $3, $4, $5, $6, $7)`,
        [id, s.rangkaian_id, `${str(data.bentukBantuan) || "Bantuan"}: ${s.perihal}`, nominal, s.tujuan, s.tanggal_surat, aktor.label],
      );
    }
    await catatAudit(aktor, "terbit_surat", "surat", id, null, null, { nomor, kode: jenis.kode, sha256: sha }, c);
    return { id, nomorSurat: nomor, peringatan: v.peringatan };
  });
}

export async function batalkan(aktor: Aktor, id: number, alasan: string) {
  hanyaRw(aktor);
  if (!alasan?.trim() || alasan.trim().length < 5) throw new WilayahError(400, "Tulis alasan pembatalan");
  const { rows } = await pool.query(
    `UPDATE surat_rw SET status = 'dibatalkan', dibatalkan_at = now(), alasan_batal = $2, updated_at = now() WHERE id = $1 AND status = 'terbit' RETURNING id`,
    [id, alasan.trim()],
  );
  if (!rows[0]) throw new WilayahError(409, "Hanya dokumen terbit yang dapat dibatalkan");
  await catatAudit(aktor, "batal_surat", "surat", id, null, null, { alasan });
  return { ok: true };
}

/** Koreksi: draft baru menyalin isi; dokumen lama tetap tersimpan dan berstatus 'digantikan' saat pengganti terbit. */
export async function buatPengganti(aktor: Aktor, id: number) {
  hanyaRw(aktor);
  const ada = await pool.query(`SELECT ${KOLOM} FROM surat_rw s WHERE s.mengganti_id = $1 AND s.status = 'draft' LIMIT 1`, [id]);
  if (ada.rows[0]) return petakan(ada.rows[0]);
  const { rows } = await pool.query(
    `INSERT INTO surat_rw (kode_jenis, jenis_surat, perihal, tujuan, tanggal_surat, isi_surat, data_form, status, dibuat_oleh, mengganti_id, induk_id,
                           rangkaian_id, kejadian_id, kegiatan_id, akses, rt_terkait, updated_at)
     SELECT kode_jenis, jenis_surat, perihal, tujuan, to_char(current_date, 'YYYY-MM-DD'), isi_surat, data_form, 'draft', $2, id, induk_id,
            rangkaian_id, kejadian_id, kegiatan_id, akses, rt_terkait, now()
       FROM surat_rw WHERE id = $1 AND status = 'terbit' RETURNING ${KOLOM.replace(/s\./g, "")}`,
    [id, aktor.label],
  );
  if (!rows[0]) throw new WilayahError(409, "Hanya dokumen terbit yang dapat dikoreksi");
  await catatAudit(aktor, "buat_pengganti_surat", "surat", rows[0].id, null, null, { mengganti: id });
  return petakan(rows[0]);
}

/** Dokumen lanjutan dalam rangkaian yang sama. Tidak mengubah status dokumen/tindak induk. */
export async function buatLanjutan(aktor: Aktor, id: number, kode: string) {
  hanyaRw(aktor);
  const tujuan = PETA_JENIS[kode];
  if (!tujuan) throw new WilayahError(400, "Jenis dokumen tidak dikenal");
  return denganTransaksi(async (c) => {
    const { rows } = await c.query(`SELECT * FROM surat_rw WHERE id = $1 FOR UPDATE`, [id]);
    const s = rows[0];
    if (!s) throw new WilayahError(404, "Dokumen tidak ditemukan");
    if (s.status === "draft") throw new WilayahError(409, "Terbitkan dokumen ini dahulu sebelum membuat dokumen lanjutan");
    const ada = await c.query(`SELECT ${KOLOM} FROM surat_rw s WHERE s.induk_id = $1 AND s.kode_jenis = $2 AND s.status = 'draft' LIMIT 1`, [id, kode]);
    if (ada.rows[0]) return { ...petakan(ada.rows[0]), sudahAda: true };
    let rangkaianId = s.rangkaian_id;
    if (!rangkaianId) {
      const r = await c.query(
        `INSERT INTO wil_surat_rangkaian (judul, jenis, kejadian_id, kegiatan_id, rt_terkait, dibuat_oleh)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [s.perihal, s.kejadian_id ? "kasus" : s.kegiatan_id ? "kegiatan" : "lainnya", s.kejadian_id, s.kegiatan_id, s.rt_terkait ?? [], aktor.label],
      );
      rangkaianId = r.rows[0].id;
      await c.query(`UPDATE surat_rw SET rangkaian_id = $2 WHERE id = $1`, [id, rangkaianId]);
    }
    const data = prefillLanjutan({ jenis: jenisDariKode(s.kode_jenis), data: s.snapshot?.data ?? s.data_form ?? {}, nomor: s.nomor_surat, perihal: s.perihal, tanggal: s.tanggal_surat }, tujuan);
    const { rows: baru } = await c.query(
      `INSERT INTO surat_rw (kode_jenis, jenis_surat, perihal, tujuan, tanggal_surat, data_form, status, dibuat_oleh, induk_id, rangkaian_id,
                             kejadian_id, kegiatan_id, akses, rt_terkait, updated_at)
       VALUES ($1, $2, $3, $4, to_char(current_date, 'YYYY-MM-DD'), $5, 'draft', $6, $7, $8, $9, $10, $11, $12, now())
       RETURNING ${KOLOM.replace(/s\./g, "")}`,
      [kode, tujuan.label, s.perihal, tujuanDari(data), JSON.stringify(data), aktor.label, id, rangkaianId, s.kejadian_id, s.kegiatan_id, s.akses, s.rt_terkait ?? []],
    );
    await catatAudit(aktor, "buat_lanjutan_surat", "surat", baru[0].id, null, null, { induk: id, kode }, c);
    return petakan(baru[0]);
  });
}

/** Teks pengantar WhatsApp untuk disalin. Tidak mengirim apa pun. Isi lengkap tidak disertakan. */
export async function pengantarWa(aktor: Aktor, id: number): Promise<string> {
  hanyaRw(aktor);
  const { rows } = await pool.query(`SELECT jenis_surat, nomor_surat, perihal, tujuan, tanggal_surat, status, verifikasi_token FROM surat_rw WHERE id = $1`, [id]);
  const s = rows[0];
  if (!s) throw new WilayahError(404, "Dokumen tidak ditemukan");
  if (s.status !== "terbit") throw new WilayahError(409, "Pengantar hanya untuk dokumen terbit");
  return [
    "Assalamu'alaikum / Salam sejahtera,",
    "",
    `Bersama ini kami sampaikan *${s.jenis_surat}* dari Ketua RW 03 Kelurahan Padasuka.`,
    `Nomor: ${s.nomor_surat}`,
    `Perihal: ${s.perihal}`,
    s.tujuan ? `Kepada: ${s.tujuan}` : null,
    "",
    "Dokumen lengkap terlampir dalam bentuk PDF. Mohon konfirmasi bila sudah diterima.",
    s.verifikasi_token ? `Cek keaslian nomor: ${situs()}/verify/surat/${s.verifikasi_token}` : null,
    "",
    "Terima kasih.",
  ].filter((x) => x !== null).join("\n");
}

/**
 * Laporan bulanan kecamatan: tarik data terverifikasi → hitung → finalkan (snapshot berversi) → ekspor.
 * Snapshot final tidak pernah diubah; koreksi menjadi versi baru dengan alasan.
 */
import crypto from "crypto";
import * as XLSX from "xlsx";
import { pool } from "./db";
import { catatAudit, WilayahError, type Aktor } from "./wilayah-auth";
import { BAGIAN_INDIKATOR, INDIKATOR_KECAMATAN, JUMLAH_INDIKATOR_RESMI } from "@shared/indikator-kecamatan";
import { hitungLaporan, hitungTotal, type DatasetWilayah, type HasilIndikator } from "@shared/wilayah-hitung";
import { SINGKAT_BULAN, NAMA_BULAN, isoTanggal, labelRt, tanggalAcuan, WILAYAH_RT_NUMBERS } from "@shared/wilayah";

export const ID_TEMPLATE = "format-laporan-rt-2026";

export async function muatDataset(): Promise<DatasetWilayah> {
  const q = (sql: string) => pool.query(sql).then((r) => r.rows);
  const [kk, warga, rumah, usaha, fasilitas, kelompok, kegiatan, peserta, kejadian, fakta, konfirmasi] = await Promise.all([
    q(`SELECT id, rt FROM kartu_keluarga WHERE rt BETWEEN 1 AND 7`),
    q(`SELECT w.id, w.kk_id, k.rt, w.jenis_kelamin, w.tanggal_lahir
         FROM warga w JOIN kartu_keluarga k ON k.id = w.kk_id
        WHERE w.status_kependudukan = 'Aktif' AND k.rt BETWEEN 1 AND 7`),
    q(`SELECT DISTINCT r.id, r.rt FROM wil_rumah r JOIN wil_rumah_kk rk ON rk.rumah_id = r.id AND rk.sampai IS NULL WHERE r.status_verifikasi = 'terverifikasi'`),
    q(`SELECT u.id, u.rt, u.kategori, to_char(u.mulai, 'YYYY-MM-DD') AS mulai, to_char(u.sampai, 'YYYY-MM-DD') AS sampai,
              EXISTS (SELECT 1 FROM wil_usaha_pemilik p JOIN warga w ON w.id = p.warga_id WHERE p.usaha_id = u.id AND w.jenis_kelamin = 'Perempuan') AS perempuan
         FROM wil_usaha u WHERE u.status_verifikasi = 'terverifikasi'`),
    q(`SELECT id, jenis, rt_lokasi, pengelola, rt_layanan, to_char(mulai, 'YYYY-MM-DD') AS mulai, to_char(sampai, 'YYYY-MM-DD') AS sampai
         FROM wil_fasilitas WHERE status_verifikasi = 'terverifikasi'`),
    q(`SELECT id, jenis, rt_basis, pengelola, rt_terlibat, to_char(mulai, 'YYYY-MM-DD') AS mulai, to_char(sampai, 'YYYY-MM-DD') AS sampai
         FROM wil_kelompok WHERE status_verifikasi = 'terverifikasi'`),
    q(`SELECT id, jenis, to_char(tanggal, 'YYYY-MM-DD') AS tanggal, pengelola, rt_pengelola, rt_terlibat FROM wil_kegiatan WHERE status_verifikasi = 'terverifikasi'`),
    q(`SELECT kegiatan_id, rt, jumlah_hadir FROM wil_kegiatan_peserta`),
    q(`SELECT id, jenis, to_char(tanggal, 'YYYY-MM-DD') AS tanggal, rt, jumlah_pelaku FROM wil_kejadian WHERE status_verifikasi = 'terverifikasi'`),
    q(`SELECT subjek, subjek_id, kunci, nilai, to_char(mulai, 'YYYY-MM-DD') AS mulai, to_char(sampai, 'YYYY-MM-DD') AS sampai
         FROM wil_fakta WHERE status_verifikasi = 'terverifikasi' AND (sampai IS NULL OR sampai >= mulai)`),
    q(`SELECT rt, tahun, bulan, bagian FROM wil_konfirmasi`),
  ]);
  const jk = (v: string | null): "L" | "P" | null => (v === "Laki-laki" ? "L" : v === "Perempuan" ? "P" : null);
  return {
    kk: kk.map((r) => ({ id: r.id, rt: r.rt })),
    warga: warga.map((r) => ({ id: r.id, kkId: r.kk_id, rt: r.rt, jk: jk(r.jenis_kelamin), tanggalLahir: r.tanggal_lahir || null })),
    rumah: rumah.map((r) => ({ id: r.id, rt: r.rt })),
    usaha: usaha.map((r) => ({ id: r.id, rt: r.rt, kategori: r.kategori, pemilikPerempuan: r.perempuan, mulai: r.mulai, sampai: r.sampai })),
    fasilitas: fasilitas.map((r) => ({ id: r.id, jenis: r.jenis, rtLokasi: r.rt_lokasi, pengelola: r.pengelola, rtLayanan: r.rt_layanan ?? [], mulai: r.mulai, sampai: r.sampai })),
    kelompok: kelompok.map((r) => ({ id: r.id, jenis: r.jenis, rtBasis: r.rt_basis, pengelola: r.pengelola, rtTerlibat: r.rt_terlibat ?? [], mulai: r.mulai, sampai: r.sampai })),
    kegiatan: kegiatan.map((r) => ({ id: r.id, jenis: r.jenis, tanggal: r.tanggal, pengelola: r.pengelola, rtPengelola: r.rt_pengelola, rtTerlibat: r.rt_terlibat ?? [] })),
    peserta: peserta.map((r) => ({ kegiatanId: r.kegiatan_id, rt: r.rt, jumlahHadir: r.jumlah_hadir })),
    kejadian: kejadian.map((r) => ({ id: r.id, jenis: r.jenis, tanggal: r.tanggal, rt: r.rt, jumlahPelaku: r.jumlah_pelaku })),
    fakta: fakta.map((r) => ({ subjek: r.subjek, subjekId: r.subjek_id, kunci: r.kunci, nilai: r.nilai, mulai: r.mulai, sampai: r.sampai })),
    konfirmasi: konfirmasi.map((r) => ({ rt: r.rt, tahun: r.tahun, bulan: r.bulan, bagian: r.bagian })),
  };
}

/** Potong dataset ke satu RT (untuk disimpan sebagai sumber snapshot). Objek bersama ikut agar bisa dihitung ulang. */
function datasetUntukRt(ds: DatasetWilayah, rt: number | null): DatasetWilayah {
  if (rt == null) return ds;
  const wargaIds = new Set(ds.warga.filter((w) => w.rt === rt).map((w) => w.id));
  const kkIds = new Set(ds.kk.filter((k) => k.rt === rt).map((k) => k.id));
  const rumahIds = new Set(ds.rumah.filter((r) => r.rt === rt).map((r) => r.id));
  const usahaIds = new Set(ds.usaha.filter((u) => u.rt === rt).map((u) => u.id));
  return {
    ...ds,
    kk: ds.kk.filter((k) => kkIds.has(k.id)),
    warga: ds.warga.filter((w) => wargaIds.has(w.id)),
    rumah: ds.rumah.filter((r) => rumahIds.has(r.id)),
    usaha: ds.usaha.filter((u) => usahaIds.has(u.id)),
    kejadian: ds.kejadian.filter((k) => k.rt === rt),
    peserta: ds.peserta.filter((p) => p.rt === rt),
    konfirmasi: ds.konfirmasi.filter((k) => k.rt === rt || k.rt == null),
    fakta: ds.fakta.filter((f) =>
      (f.subjek === "warga" && wargaIds.has(f.subjekId)) || (f.subjek === "kk" && kkIds.has(f.subjekId)) ||
      (f.subjek === "rumah" && rumahIds.has(f.subjekId)) || (f.subjek === "usaha" && usahaIds.has(f.subjekId)) || f.subjek === "fasilitas"),
  };
}

function scopeRt(aktor: Aktor, rtDiminta: number | null): number | null {
  return aktor.role === "rt" ? aktor.rt : rtDiminta;
}

function cekBulan(tahun: number, bulan: number) {
  const awal = `${tahun}-${String(bulan).padStart(2, "0")}-01`;
  if (awal > isoTanggal(new Date())) throw new WilayahError(400, "Bulan ini belum dimulai");
}

interface SnapshotRow {
  id: number;
  versi: number;
  hasil: HasilIndikator[];
  created_at: Date;
  dibuat_oleh: string;
  alasan_koreksi: string | null;
  acuan: string;
}

async function snapshotTerakhir(rt: number | null, tahun: number, bulan: number): Promise<SnapshotRow | null> {
  const { rows } = await pool.query(
    `SELECT id, versi, hasil, created_at, dibuat_oleh, alasan_koreksi, to_char(acuan, 'YYYY-MM-DD') AS acuan
       FROM wil_laporan WHERE COALESCE(rt, 0) = COALESCE($1::int, 0) AND tahun = $2 AND bulan = $3
      ORDER BY versi DESC LIMIT 1`,
    [rt, tahun, bulan],
  );
  return rows[0] ?? null;
}

export async function pratinjauLaporan(aktor: Aktor, rtDiminta: number | null, tahun: number, bulan: number) {
  cekBulan(tahun, bulan);
  const rt = scopeRt(aktor, rtDiminta);
  const ds = await muatDataset();
  const acuan = tanggalAcuan(tahun, bulan);
  const hasil = hitungLaporan(ds, { rt, tahun, bulan, acuan });
  const final = await snapshotTerakhir(rt, tahun, bulan);
  const konfirmasi = ds.konfirmasi.filter((k) => k.tahun === tahun && k.bulan === bulan && (k.rt === rt || k.rt == null)).map((k) => ({ rt: k.rt, bagian: k.bagian }));
  const bulanLalu = acuan < isoTanggal(new Date());
  return {
    rt, tahun, bulan, acuan,
    hasil,
    ringkas: ringkasStatus(hasil),
    konfirmasi,
    final: final ? { versi: final.versi, dibuat: final.created_at, oleh: final.dibuat_oleh, acuan: final.acuan, berbeda: berbedaDari(final.hasil, hasil) } : null,
    peringatanHistoris: bulanLalu && !final
      ? "Bulan ini sudah lewat dan belum difinalkan. Data kependudukan dihitung dari keadaan sekarang; fakta berwaktu (kesehatan, bantuan, dll.) tetap mengikuti tanggal acuan."
      : null,
  };
}

function ringkasStatus(hasil: HasilIndikator[]) {
  const r: Record<string, number> = { lengkap: 0, sebagian: 0, belum_diketahui: 0, menunggu_rw: 0, needs_confirmation: 0 };
  for (const h of hasil) r[h.status]++;
  return r;
}

function berbedaDari(a: HasilIndikator[], b: HasilIndikator[]): number {
  const m = new Map(a.map((x) => [x.id, x]));
  return b.filter((x) => {
    const y = m.get(x.id);
    return !y || y.nilai !== x.nilai || y.status !== x.status;
  }).length;
}

export async function finalkanLaporan(aktor: Aktor, tahun: number, bulan: number, alasanKoreksi?: string) {
  cekBulan(tahun, bulan);
  const rt = aktor.role === "rt" ? aktor.rt : null;
  const ds = await muatDataset();
  const acuan = tanggalAcuan(tahun, bulan);
  const hasil = hitungLaporan(ds, { rt, tahun, bulan, acuan });
  if (hasil.length !== JUMLAH_INDIKATOR_RESMI) throw new WilayahError(500, "Registry indikator tidak lengkap");
  const sumberDs = datasetUntukRt(ds, rt);
  const sidikJari = crypto.createHash("sha256").update(JSON.stringify(sumberDs)).digest("hex");

  const c = await pool.connect();
  try {
    await c.query("BEGIN");
    await c.query(`SELECT pg_advisory_xact_lock(hashtext('wil_laporan'), $1)`, [(rt ?? 0) * 1000000 + tahun * 100 + bulan]);
    const { rows } = await c.query(
      `SELECT COALESCE(MAX(versi), 0)::int AS v FROM wil_laporan WHERE COALESCE(rt, 0) = COALESCE($1::int, 0) AND tahun = $2 AND bulan = $3`,
      [rt, tahun, bulan],
    );
    const versi = rows[0].v + 1;
    if (versi > 1 && !alasanKoreksi?.trim()) throw new WilayahError(409, "Laporan bulan ini sudah final. Untuk koreksi, tulis alasannya — akan dibuat versi baru.");
    const sumber = {
      template: ID_TEMPLATE,
      jumlahIndikator: hasil.length,
      dihitungPada: new Date().toISOString(),
      acuan,
      sidikJari,
      hitungan: { kk: sumberDs.kk.length, warga: sumberDs.warga.length, rumah: sumberDs.rumah.length, fakta: sumberDs.fakta.length, kejadian: sumberDs.kejadian.length, kegiatan: sumberDs.kegiatan.length },
      dataset: sumberDs,
    };
    const { rows: ins } = await c.query(
      `INSERT INTO wil_laporan (rt, tahun, bulan, versi, acuan, hasil, sumber, alasan_koreksi, dibuat_oleh)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
      [rt, tahun, bulan, versi, acuan, JSON.stringify(hasil), JSON.stringify(sumber), alasanKoreksi?.trim() || null, aktor.label],
    );
    await catatAudit(aktor, versi > 1 ? "koreksi_laporan" : "finalkan_laporan", "laporan", ins[0].id, rt, null, { tahun, bulan, versi, ringkas: ringkasStatus(hasil) }, c);
    await c.query("COMMIT");
    return { id: ins[0].id as number, versi, ringkas: ringkasStatus(hasil) };
  } catch (e) {
    await c.query("ROLLBACK");
    throw e;
  } finally {
    c.release();
  }
}

export async function daftarVersi(aktor: Aktor, rtDiminta: number | null, tahun: number, bulan: number) {
  const rt = scopeRt(aktor, rtDiminta);
  const { rows } = await pool.query(
    `SELECT id, versi, created_at, dibuat_oleh, alasan_koreksi, to_char(acuan, 'YYYY-MM-DD') AS acuan, sumber->'hitungan' AS hitungan, sumber->>'sidikJari' AS sidik_jari
       FROM wil_laporan WHERE COALESCE(rt, 0) = COALESCE($1::int, 0) AND tahun = $2 AND bulan = $3 ORDER BY versi DESC`,
    [rt, tahun, bulan],
  );
  return rows;
}

/** Status laporan semua RT untuk satu bulan (dashboard RW). */
export async function statusLaporanSemuaRt(tahun: number, bulan: number) {
  const { rows } = await pool.query(
    `SELECT rt, MAX(versi)::int AS versi, MAX(created_at) AS terakhir FROM wil_laporan WHERE tahun = $1 AND bulan = $2 GROUP BY rt`,
    [tahun, bulan],
  );
  const m = new Map(rows.map((r) => [r.rt ?? 0, r]));
  return [...WILAYAH_RT_NUMBERS.map((rt) => ({ rt, ...(m.get(rt) ?? { versi: null, terakhir: null }) })), { rt: null, ...(m.get(0) ?? { versi: null, terakhir: null }) }];
}

// ===========================================================================
// Ekspor
// ===========================================================================

export interface BarisEkspor {
  no: number;
  bagian: string;
  kode: string;
  label: string;
  satuan: string;
  nilai: (number | null)[];
  status: string[];
  total: number | null;
  catatanTotal: string;
  catatan: string;
}

export interface DataEkspor {
  judul: string;
  scope: string;
  tahun: number;
  bulan: number[];
  kolomBulan: string[];
  bulanFinal: boolean[];
  bagian: { kode: string; judul: string }[];
  baris: BarisEkspor[];
  dibuat: string;
}

export async function dataEkspor(aktor: Aktor, rtDiminta: number | null, tahun: number, bulanList: number[]): Promise<DataEkspor> {
  const rt = scopeRt(aktor, rtDiminta);
  const sekarang = isoTanggal(new Date());
  let ds: DatasetWilayah | null = null;
  const perBulan: { hasil: HasilIndikator[] | null; final: boolean }[] = [];
  for (const b of bulanList) {
    const awal = `${tahun}-${String(b).padStart(2, "0")}-01`;
    if (awal > sekarang) {
      perBulan.push({ hasil: null, final: false });
      continue;
    }
    const snap = await snapshotTerakhir(rt, tahun, b);
    if (snap) {
      perBulan.push({ hasil: snap.hasil, final: true });
    } else {
      ds = ds ?? (await muatDataset());
      perBulan.push({ hasil: hitungLaporan(ds, { rt, tahun, bulan: b, acuan: tanggalAcuan(tahun, b) }), final: false });
    }
  }
  const baris: BarisEkspor[] = INDIKATOR_KECAMATAN.map((ind) => {
    const sel = perBulan.map((p) => p.hasil?.find((h) => h.id === ind.id) ?? null);
    const nilai = sel.map((s) => s?.nilai ?? null);
    const tersedia = perBulan.map((p, i) => (p.hasil ? nilai[i] : undefined)).filter((v) => v !== undefined) as (number | null)[];
    const total = hitungTotal(ind, tersedia.length === bulanList.length ? tersedia : [...tersedia, null]);
    const catatanSel = sel.map((s, i) => (s && s.status !== "lengkap" ? `${SINGKAT_BULAN[bulanList[i] - 1]}: ${s.catatan || s.status}` : null)).filter(Boolean);
    return {
      no: ind.no, bagian: ind.bagian, kode: ind.kode, label: ind.label, satuan: ind.satuan,
      nilai, status: sel.map((s) => s?.status ?? "belum_ada"),
      total: total.nilai, catatanTotal: total.catatan,
      catatan: [ind.status === "needs_confirmation" ? `Menunggu konfirmasi definisi: ${ind.catatan ?? ""}` : "", ...catatanSel].filter(Boolean).join(" | "),
    };
  });
  return {
    judul: `FORMAT LAPORAN RT TAHUN ${tahun}`,
    scope: rt ? `${labelRt(rt)} / RW 03 Kelurahan Padasuka` : "Rekap RW 03 Kelurahan Padasuka (objek unik)",
    tahun,
    bulan: bulanList,
    kolomBulan: bulanList.map((b) => SINGKAT_BULAN[b - 1]),
    bulanFinal: perBulan.map((p) => p.final),
    bagian: BAGIAN_INDIKATOR.map((b) => ({ kode: b.kode, judul: b.judul })),
    baris,
    dibuat: new Date().toISOString(),
  };
}

export function eksporXlsx(d: DataEkspor): Buffer {
  const header = ["NO", "SUB", "INDIKATOR", ...d.kolomBulan.map((k, i) => (d.bulanFinal[i] ? k : `${k}*`)), "TOTAL"];
  const aoa: (string | number | null)[][] = [
    [d.judul],
    [d.scope],
    [`Dicetak ${new Date(d.dibuat).toLocaleString("id-ID")} — * = belum final; sel kosong = belum diketahui (bukan 0)`],
    [],
    header,
  ];
  for (const b of d.bagian) {
    aoa.push([b.kode, "", b.judul]);
    for (const r of d.baris.filter((x) => x.bagian === b.kode)) {
      aoa.push([r.no, r.kode, r.label, ...r.nilai.map((v) => (v == null ? "" : v)), r.total == null ? "" : r.total]);
    }
  }
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws["!cols"] = [{ wch: 5 }, { wch: 6 }, { wch: 52 }, ...d.kolomBulan.map(() => ({ wch: 8 })), { wch: 9 }];
  ws["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: header.length - 1 } }, { s: { r: 1, c: 0 }, e: { r: 1, c: header.length - 1 } }];

  const catatan = [["NO", "SUB", "INDIKATOR", "SATUAN", "STATUS PER BULAN", "TOTAL", "CATATAN"]];
  for (const r of d.baris) {
    catatan.push([String(r.no), r.kode, r.label, r.satuan, r.status.join(", "), r.catatanTotal, r.catatan]);
  }
  const ws2 = XLSX.utils.aoa_to_sheet(catatan);
  ws2["!cols"] = [{ wch: 5 }, { wch: 6 }, { wch: 48 }, { wch: 10 }, { wch: 40 }, { wch: 40 }, { wch: 80 }];

  const wb = XLSX.utils.book_new();
  wb.Props = { Title: d.judul, Author: "RW 03 Padasuka" };
  XLSX.utils.book_append_sheet(wb, ws, "Laporan");
  XLSX.utils.book_append_sheet(wb, ws2, "Catatan");
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

export function namaFileEkspor(d: DataEkspor, rt: number | null, ext: string): string {
  const scope = rt ? `RT${String(rt).padStart(2, "0")}` : "RekapRW03";
  return `Laporan-${scope}-${d.tahun}-${d.kolomBulan.join("-")}.${ext}`;
}

export { NAMA_BULAN };

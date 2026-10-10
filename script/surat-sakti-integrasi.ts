/**
 * Uji integrasi Surat Sakti v2 — hanya di database UJI (WILAYAH_TEST_DATABASE_URL) yang sudah dimigrasi 0023–0025.
 * Membuat dokumen berawalan "Uji SS" lalu menghapusnya.
 */
import type { Pool } from "pg";

type Uji = (nama: string, fn: () => unknown | Promise<unknown>) => Promise<void>;
type Pastikan = (kondisi: unknown, pesan: string) => asserts kondisi;

/** Hapus dokumen uji termasuk berkas final (trigger penjaga dimatikan sementara, hanya di DB uji). */
export async function hapusSuratUji(pool: Pool, ids: number[]) {
  if (!ids.length) return;
  const c = await pool.connect();
  try {
    await c.query("BEGIN");
    await c.query(`ALTER TABLE wil_surat_berkas DISABLE TRIGGER trg_wil_surat_berkas_tetap`);
    await c.query(`DELETE FROM wil_surat_berkas WHERE surat_id = ANY($1::int[])`, [ids]);
    await c.query(`ALTER TABLE wil_surat_berkas ENABLE TRIGGER trg_wil_surat_berkas_tetap`);
    await c.query(`DELETE FROM wil_surat_bantuan WHERE surat_id = ANY($1::int[])`, [ids]);
    await c.query(`DELETE FROM wil_surat_masuk WHERE membalas_id = ANY($1::int[])`, [ids]);
    await c.query(`UPDATE wil_permintaan_surat SET surat_id = NULL WHERE surat_id = ANY($1::int[])`, [ids]);
    await c.query(`UPDATE surat_rw SET induk_id = NULL WHERE induk_id = ANY($1::int[])`, [ids]);
    const { rows } = await c.query(`SELECT DISTINCT rangkaian_id FROM surat_rw WHERE id = ANY($1::int[]) AND rangkaian_id IS NOT NULL`, [ids]);
    await c.query(`DELETE FROM surat_rw WHERE id = ANY($1::int[])`, [ids]);
    for (const r of rows) {
      await c.query(`DELETE FROM wil_surat_fakta WHERE rangkaian_id = $1`, [r.rangkaian_id]);
      await c.query(`DELETE FROM wil_surat_masuk WHERE rangkaian_id = $1`, [r.rangkaian_id]);
      await c.query(`DELETE FROM wil_surat_rangkaian r WHERE r.id = $1 AND NOT EXISTS (SELECT 1 FROM surat_rw s WHERE s.rangkaian_id = r.id)`, [r.rangkaian_id]);
    }
    await c.query("COMMIT");
  } catch (e) {
    await c.query("ROLLBACK").catch(() => {});
    console.log("  (pembersihan dokumen uji gagal:", (e as Error).message, ")");
  } finally {
    c.release();
  }
}

export async function ujiIntegrasi(uji: Uji, pastikan: Pastikan) {
  console.log("\n== Integrasi DB (Surat Sakti) ==");
  const { pool } = await import("../server/db");
  const { rows: cek } = await pool.query(`SELECT to_regclass('wil_surat_berkas') AS t`);
  if (!cek[0].t) {
    console.log("  dilewati: migrasi 0025 belum diterapkan di database uji");
    return;
  }
  const L = await import("../server/surat-sakti/layanan");
  const T = await import("../server/surat-sakti/tindak");
  const W = await import("../server/wilayah-surat");
  const ss = await import("../shared/surat-sakti");
  const { contohData } = await import("../shared/surat-sakti/contoh");

  const rw = { role: "rw" as const, rt: null, label: "Uji SS RW" };
  const rt7 = { role: "rt" as const, rt: 7, label: "Uji SS RT 07" };
  const rt6 = { role: "rt" as const, rt: 6, label: "Uji SS RT 06" };
  const ids: number[] = [];
  const permintaan: number[] = [];
  const gagalDengan = async (fn: () => Promise<unknown>, status: number, ket: string) => {
    try {
      await fn();
    } catch (e: any) {
      if (e?.status === status || (status === 409 && /tidak dapat diubah/.test(e?.message))) return;
      throw new Error(`${ket}: status ${e?.status ?? "?"} (${e?.message})`);
    }
    throw new Error(`${ket}: seharusnya ditolak`);
  };
  const draft = async (kode: string, perihal: string, extra: Record<string, unknown> = {}) => {
    const s = await L.simpanDraft(rw, { kodeJenis: kode, perihal: `Uji SS ${perihal}`, tanggalSurat: "2026-10-08", dataForm: contohData(ss.PETA_JENIS[kode]), ...extra });
    ids.push(s.id);
    return s;
  };

  try {
    await uji("RT tidak dapat membuat/menerbitkan dokumen atas nama RW", async () => {
      await gagalDengan(() => L.simpanDraft(rt7, { kodeJenis: "a_tugas", perihal: "Uji SS RT", tanggalSurat: "2026-10-08", dataForm: {} }), 403, "RT membuat draft");
      const s = await draft("a_tugas", "tugas");
      await gagalDengan(() => L.terbitkan(rt7, s.id), 403, "RT menerbitkan");
    });

    await uji("20 penerbitan bersamaan → nomor unik, tanpa konflik", async () => {
      const ds = await Promise.all(Array.from({ length: 20 }, (_, i) => draft("c_undangan", `paralel ${i}`)));
      const hasil = await Promise.all(ds.map((d) => L.terbitkan(rw, d.id)));
      pastikan(new Set(hasil.map((h) => h.nomorSurat)).size === 20, "nomor ganda");
      await gagalDengan(() => L.terbitkan(rw, ds[0].id), 409, "terbit dua kali");
    });

    await uji("dokumen final tetap setelah sumber berubah; DB menolak perubahan isi/berkas", async () => {
      const { rows: k } = await pool.query(`INSERT INTO wil_kejadian (jenis, judul, tanggal, rt, pengelola, dibuat_oleh) VALUES ('lingkungan', 'Uji SS saluran', '2026-10-01', 7, 'rt', 'uji') RETURNING id`);
      const s = await draft("b_imbauan", "final", { kejadianId: k[0].id, akses: "rt_terkait", rtTerkait: [7] });
      await L.terbitkan(rw, s.id);
      const a = await pool.query(`SELECT snapshot, (SELECT sha256 FROM wil_surat_berkas WHERE surat_id = $1) AS sha FROM surat_rw WHERE id = $1`, [s.id]);
      await pool.query(`UPDATE wil_kejadian SET judul = 'Uji SS diubah' WHERE id = $1`, [k[0].id]);
      const b = await pool.query(`SELECT snapshot, (SELECT sha256 FROM wil_surat_berkas WHERE surat_id = $1) AS sha FROM surat_rw WHERE id = $1`, [s.id]);
      pastikan(JSON.stringify(a.rows[0].snapshot) === JSON.stringify(b.rows[0].snapshot) && a.rows[0].sha === b.rows[0].sha, "snapshot berubah");
      await gagalDengan(() => pool.query(`UPDATE surat_rw SET perihal = 'ubah' WHERE id = $1`, [s.id]), 409, "ubah isi final");
      await gagalDengan(() => pool.query(`UPDATE wil_surat_berkas SET sha256 = 'x' WHERE surat_id = $1`, [s.id]), 409, "ubah berkas final");
      await gagalDengan(() => L.simpanDraft(rw, { kodeJenis: "b_imbauan", perihal: "Uji SS ubah", tanggalSurat: "2026-10-08", dataForm: {} }, s.id), 409, "simpan draft atas dokumen final");
      const pdf = await L.unduhPdf(rw, s.id);
      pastikan(pdf.buffer.subarray(0, 5).toString() === "%PDF-", "PDF final");
      await pool.query(`UPDATE surat_rw SET kejadian_id = NULL WHERE id = $1`, [s.id]);
      await pool.query(`DELETE FROM wil_kejadian WHERE id = $1`, [k[0].id]);
    });

    await uji("akses RT: hanya dokumen terbit yang relevan dengan RT-nya", async () => {
      const a = await draft("c_edaran", "akses rt7", { akses: "rt_terkait", rtTerkait: [7] });
      const b = await draft("c_edaran", "akses terbatas", { akses: "terbatas", rtTerkait: [7] });
      await gagalDengan(() => L.detailSurat(rt7, a.id), 404, "RT membaca draft");
      await L.terbitkan(rw, a.id);
      await L.terbitkan(rw, b.id);
      await L.detailSurat(rt7, a.id);
      await gagalDengan(() => L.detailSurat(rt6, a.id), 404, "RT lain membaca");
      await gagalDengan(() => L.unduhPdf(rt6, a.id), 404, "RT lain mengunduh PDF");
      await gagalDengan(() => L.detailSurat(rt7, b.id), 404, "RT membaca dokumen terbatas");
      const daftar7 = await L.daftarSurat(rt7, {});
      pastikan(daftar7.some((x) => x.id === a.id) && !daftar7.some((x) => x.id === b.id), "daftar RT");
      pastikan(!(await L.daftarSurat(rt6, {})).some((x) => x.id === a.id), "daftar RT lain");
      pastikan(daftar7.every((x) => x.dataForm === undefined), "isi form bocor ke RT");
    });

    await uji("status dokumen, distribusi, pekerjaan independen; terlambat dari tenggat", async () => {
      const s = await draft("d_perbaikan", "status");
      await L.terbitkan(rw, s.id);
      let d = await L.detailSurat(rw, s.id);
      pastikan(d.statusDistribusi === "belum" && d.statusPekerjaan === "tidak_diperlukan", "awal");
      await gagalDengan(() => T.catatKirim(rw, s.id, { kanal: "WhatsApp", penerima: "Dinas", dikirimPada: new Date().toISOString() }), 400, "kirim tanpa bukti");
      await T.catatKirim(rw, s.id, { kanal: "WhatsApp", penerima: "Dinas", status: "gagal", catatan: "Nomor tidak aktif", dikirimPada: new Date().toISOString() });
      d = await L.detailSurat(rw, s.id);
      pastikan(d.statusDistribusi === "gagal", "gagal");
      await T.catatKirim(rw, s.id, { kanal: "Diantar langsung", penerima: "Dinas", bukti: "Diterima staf TU", dikirimPada: new Date().toISOString() });
      const t = await T.tambahTindak(rw, s.id, { tindakan: "Tanyakan jadwal survei", picNama: "Ketua RT 07", picRt: 7, tenggat: "2026-01-01" });
      d = await L.detailSurat(rw, s.id);
      pastikan(d.statusDistribusi === "diserahkan" && d.statusPekerjaan === "menunggu" && d.terlambat === 1, `campur: ${d.statusDistribusi}/${d.statusPekerjaan}/${d.terlambat}`);
      await gagalDengan(() => T.perbaruiTindak(rt6, t.id, { catatan: "bukan PIC", progres: 50 }), 404, "RT bukan PIC melapor");
      await gagalDengan(() => T.perbaruiTindak(rt7, t.id, { catatan: "selesai tanpa bukti", status: "selesai" }), 400, "selesai tanpa bukti");
      await T.perbaruiTindak(rt7, t.id, { catatan: "Sudah ditanyakan", status: "selesai", bukti: "Jawaban dinas: survei 20 Okt" });
      d = await L.detailSurat(rw, s.id);
      pastikan(d.statusPekerjaan === "selesai" && d.statusDistribusi === "diserahkan" && d.terlambat === 0, "pekerjaan selesai");
      await L.batalkan(rw, s.id, "Uji pembatalan");
      d = await L.detailSurat(rw, s.id);
      pastikan(d.statusDokumen === "dibatalkan" && d.statusPekerjaan === "selesai" && d.statusDistribusi === "diserahkan", "batal mengubah status lain");
    });

    await uji("dokumen lanjutan: rangkaian sama, tanpa duplikasi, induk tidak berubah", async () => {
      const s = await draft("b_klarifikasi", "lanjutan");
      await L.terbitkan(rw, s.id);
      const a = await L.buatLanjutan(rw, s.id, "b_ba_klarifikasi");
      const b = await L.buatLanjutan(rw, s.id, "b_ba_klarifikasi");
      ids.push(a.id);
      pastikan(a.id === b.id, "lanjutan ganda");
      const induk = await L.detailSurat(rw, s.id);
      pastikan(induk.status === "terbit" && a.rangkaianId === induk.rangkaianId && a.indukId === s.id, "relasi");
      pastikan(a.perihal === induk.perihal && a.status === "draft" && !a.nomorSurat, "draft lanjutan");
      const r = await T.detailRangkaian(rw, induk.rangkaianId!);
      pastikan(r.dokumen.length === 2, "rangkaian");
      await T.catatSuratMasuk(rw, { membalasId: s.id, pengirim: "Pihak uji", tanggal: "2026-10-09", perihal: "Balasan uji" });
      pastikan((await T.detailRangkaian(rw, induk.rangkaianId!)).masuk.length === 1, "surat masuk tertaut");
    });

    await uji("kesepakatan tanpa konfirmasi tidak dapat terbit; pengganti menandai lama 'digantikan'", async () => {
      const k = await draft("b_kesepakatan", "kesepakatan");
      await pool.query(`UPDATE surat_rw SET data_form = data_form || '{"konfirmasiPihak": false}' WHERE id = $1`, [k.id]);
      await gagalDengan(() => L.terbitkan(rw, k.id), 400, "kesepakatan tanpa konfirmasi");
      const s = await draft("c_undangan", "pengganti");
      const t = await L.terbitkan(rw, s.id);
      const g = await L.buatPengganti(rw, s.id);
      ids.push(g.id);
      await L.terbitkan(rw, g.id);
      const lama = await L.detailSurat(rw, s.id);
      pastikan(lama.status === "digantikan" && lama.nomorSurat === t.nomorSurat, "pengganti");
    });

    await uji("permintaan RT + fakta → draft → selesai; bantuan bertahap tidak menjadi pemasukan", async () => {
      const p = await W.ajukanPermintaan(rt7, { kodeJenis: "d_material_bekas", perihal: "Uji SS material", uraian: "Butuh material bekas untuk BetterBlock", idempotencyKey: `ss-${Date.now()}-kunci-uji` });
      await T.tambahFakta(rt7, { permintaanId: p.id, isi: "Lokasi taman RT 07 rusak" });
      await gagalDengan(() => T.tambahFakta(rt6, { permintaanId: p.id, isi: "RT lain menambah" }), 404, "RT lain menambah fakta");
      const s = await draft("d_material_bekas", "material", { permintaanId: p.id });
      await L.terbitkan(rw, s.id);
      const { rows } = await pool.query(`SELECT status FROM wil_permintaan_surat WHERE id = $1`, [p.id]);
      pastikan(rows[0].status === "selesai", "permintaan");
      const { rows: b } = await pool.query(`SELECT tahap FROM wil_surat_bantuan WHERE surat_id = $1`, [s.id]);
      pastikan(b.length === 1 && b[0].tahap === "dimohonkan", "bantuan dimohonkan");
      await gagalDengan(() => T.catatBantuan(rw, { suratId: s.id, tahap: "diterima", uraian: "Paving bekas", tanggal: "2026-10-10" }), 400, "diterima tanpa bukti");
      permintaan.push(p.id);
    });

    await uji("ringkasan dashboard & pengantar WA (tanpa kirim)", async () => {
      const r = await T.ringkasan(rw);
      pastikan(typeof r.draft === "number" && Array.isArray(r.permohonan), "ringkasan");
      const s = await draft("c_edaran", "wa");
      await L.terbitkan(rw, s.id);
      const teks = await L.pengantarWa(rw, s.id);
      pastikan(teks.includes("/verify/surat/") && !teks.includes("Isian"), "pengantar WA");
      const { rows } = await pool.query(`SELECT verifikasi_token FROM surat_rw WHERE id = $1`, [s.id]);
      const v = await T.verifikasi({ token: rows[0].verifikasi_token });
      pastikan(v && Object.keys(v).sort().join() === "jenis_surat,nomor_surat,status,tanggal_surat", "verifikasi minimum");
    });
  } finally {
    await hapusSuratUji(pool, ids);
    if (permintaan.length) {
      await pool.query(`DELETE FROM wil_surat_fakta WHERE permintaan_id = ANY($1::int[])`, [permintaan]).catch(() => {});
      await pool.query(`DELETE FROM wil_permintaan_surat WHERE id = ANY($1::int[])`, [permintaan]).catch(() => {});
    }
  }
}

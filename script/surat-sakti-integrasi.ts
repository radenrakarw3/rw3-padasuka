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
    await c.query(`DELETE FROM surat_rw WHERE id = ANY($1::int[])`, [ids]);
    await c.query("COMMIT");
  } catch (e) {
    await c.query("ROLLBACK").catch(() => {});
    console.log("  (pembersihan dokumen uji gagal:", (e as Error).message, ")");
  } finally {
    c.release();
  }
}

/** Surat hanya terbit bila ada tanda tangan aktif; DB uji diberi tanda tangan contoh bila belum ada. Mengembalikan pembersih. */
export async function pastikanTtdUji(pool: Pool): Promise<() => Promise<void>> {
  const { rows: t } = await pool.query(`SELECT to_regclass('wil_surat_ttd') AS t`);
  if (!t[0].t) {
    const fs = await import("fs");
    const path = await import("path");
    await pool.query(fs.readFileSync(path.join(process.cwd(), "migrations", "0032_surat_ttd.sql"), "utf8"));
  }
  const { rows } = await pool.query(`SELECT 1 FROM wil_surat_ttd WHERE aktif`);
  if (rows[0]) return async () => {};
  const { ttdContohDataUrl } = await import("./ttd-contoh");
  const data = ttdContohDataUrl().split(",")[1];
  const { rows: baru } = await pool.query(
    `INSERT INTO wil_surat_ttd (mime, data, sha256, aktif, diunggah_oleh) VALUES ('image/png', $1, 'uji', true, 'Uji SS') RETURNING id`, [data]);
  return async () => {
    await pool.query(`DELETE FROM wil_surat_ttd WHERE id = $1`, [baru[0].id]).catch(() => {});
  };
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
  const ss = await import("../shared/surat-sakti");
  const { contohData } = await import("../shared/surat-sakti/contoh");

  const rw = { role: "rw" as const, rt: null, label: "Uji SS RW" };
  const rt7 = { role: "rt" as const, rt: 7, label: "Uji SS RT 07" };
  const rt6 = { role: "rt" as const, rt: 6, label: "Uji SS RT 06" };
  const ids: number[] = [];
  const bersihTtd = await pastikanTtdUji(pool);
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
      await gagalDengan(() => L.simpanDraft(rt7, { kodeJenis: "c_edaran", perihal: "Uji SS RT", tanggalSurat: "2026-10-08", dataForm: {} }), 403, "RT membuat draft");
      const s = await draft("c_edaran", "tugas");
      await gagalDengan(() => L.terbitkan(rt7, s.id), 403, "RT menerbitkan");
    });

    await uji("20 penerbitan bersamaan → nomor unik, tanpa konflik", async () => {
      const ds = await Promise.all(Array.from({ length: 20 }, (_, i) => draft("c_edaran", `paralel ${i}`)));
      const hasil = await Promise.all(ds.map((d) => L.terbitkan(rw, d.id)));
      pastikan(new Set(hasil.map((h) => h.nomorSurat)).size === 20, "nomor ganda");
      await gagalDengan(() => L.terbitkan(rw, ds[0].id), 409, "terbit dua kali");
    });

    await uji("dokumen final tetap setelah sumber berubah; DB menolak perubahan isi/berkas", async () => {
      const { rows: k } = await pool.query(`INSERT INTO wil_kejadian (jenis, judul, tanggal, rt, pengelola, dibuat_oleh) VALUES ('lingkungan', 'Uji SS saluran', '2026-10-01', 7, 'rt', 'uji') RETURNING id`);
      const s = await draft("c_edaran", "final", { kejadianId: k[0].id, akses: "rt_terkait", rtTerkait: [7] });
      await L.terbitkan(rw, s.id);
      const a = await pool.query(`SELECT snapshot, (SELECT sha256 FROM wil_surat_berkas WHERE surat_id = $1) AS sha FROM surat_rw WHERE id = $1`, [s.id]);
      pastikan(a.rows[0].snapshot.penandatangan?.nama === ss.IDENTITAS_RW.ketua.nama && a.rows[0].snapshot.penandatangan?.ttdId, "snapshot tanpa penandatangan/tanda tangan");
      await pool.query(`UPDATE wil_kejadian SET judul = 'Uji SS diubah' WHERE id = $1`, [k[0].id]);
      const b = await pool.query(`SELECT snapshot, (SELECT sha256 FROM wil_surat_berkas WHERE surat_id = $1) AS sha FROM surat_rw WHERE id = $1`, [s.id]);
      pastikan(JSON.stringify(a.rows[0].snapshot) === JSON.stringify(b.rows[0].snapshot) && a.rows[0].sha === b.rows[0].sha, "snapshot berubah");
      await gagalDengan(() => pool.query(`UPDATE surat_rw SET perihal = 'ubah' WHERE id = $1`, [s.id]), 409, "ubah isi final");
      await gagalDengan(() => pool.query(`UPDATE wil_surat_berkas SET sha256 = 'x' WHERE surat_id = $1`, [s.id]), 409, "ubah berkas final");
      await gagalDengan(() => L.simpanDraft(rw, { kodeJenis: "c_edaran", perihal: "Uji SS ubah", tanggalSurat: "2026-10-08", dataForm: {} }, s.id), 409, "simpan draft atas dokumen final");
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
      const s = await draft("mt_instansi", "status");
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

    await uji("kesepakatan tanpa konfirmasi tidak dapat terbit; salin jadi draft baru tanpa keterkaitan", async () => {
      const k = await draft("b_kesepakatan", "kesepakatan");
      await pool.query(`UPDATE surat_rw SET data_form = data_form || '{"konfirmasiPihak": false}' WHERE id = $1`, [k.id]);
      await gagalDengan(() => L.terbitkan(rw, k.id), 400, "kesepakatan tanpa konfirmasi");
      const s = await draft("mt_instansi", "salin");
      const t = await L.terbitkan(rw, s.id);
      const g = await L.salinJadiDraft(rw, s.id);
      ids.push(g.id);
      pastikan(g.status === "draft" && !g.nomorSurat && g.perihal === "Uji SS salin", "draft salinan");
      const t2 = await L.terbitkan(rw, g.id);
      const lama = await L.detailSurat(rw, s.id);
      pastikan(lama.status === "terbit" && lama.nomorSurat === t.nomorSurat && t2.nomorSurat !== t.nomorSurat, "dokumen asal tidak berubah");
      const { rows } = await pool.query(`SELECT mengganti_id, induk_id, rangkaian_id, permintaan_id FROM surat_rw WHERE id = $1`, [g.id]);
      pastikan(Object.values(rows[0]).every((v) => v == null), "salinan masih tertaut ke surat lain");
    });

    await uji("surat berdiri sendiri: rujukan surat lama opsional; surat kustom langsung terbit", async () => {
      const p = await L.simpanDraft(rw, { kodeJenis: "mt_susulan", perihal: "Uji SS pengingat tanpa rujukan", tanggalSurat: "2026-10-08",
        dataForm: { ...contohData(ss.PETA_JENIS.mt_susulan), suratRujukan: "", tanggalRujukan: "" } });
      ids.push(p.id);
      await L.terbitkan(rw, p.id);
      const kustom = await L.simpanDraft(rw, { kodeJenis: "f_kustom", perihal: "Uji SS kustom", tanggalSurat: "2026-10-08", dataForm: { judulSurat: "Surat Keterangan", isiSurat: "Yang bertanda tangan di bawah ini menerangkan hal uji.\n\nDemikian." , penutupSurat: "-" } });
      ids.push(kustom.id);
      const h = await L.terbitkan(rw, kustom.id);
      pastikan(/\/SRT\//.test(h.nomorSurat), `nomor kustom ${h.nomorSurat}`);
      const pdf = await L.unduhPdf(rw, kustom.id);
      pastikan(pdf.buffer.subarray(0, 5).toString() === "%PDF-", "PDF kustom");
      await gagalDengan(() => L.simpanDraft(rw, { kodeJenis: "f_kustom", perihal: "Uji SS kustom kosong", tanggalSurat: "2026-10-08", dataForm: {} }).then(async (x) => { ids.push(x.id); await L.terbitkan(rw, x.id); }), 400, "kustom tanpa isi");
    });

    await uji("bantuan bertahap tidak menjadi pemasukan", async () => {
      const s = await draft("mt_bantuan", "material");
      await L.terbitkan(rw, s.id);
      const { rows: b } = await pool.query(`SELECT tahap FROM wil_surat_bantuan WHERE surat_id = $1`, [s.id]);
      pastikan(b.length === 1 && b[0].tahap === "dimohonkan", "bantuan dimohonkan");
      await gagalDengan(() => T.catatBantuan(rw, { suratId: s.id, tahap: "diterima", uraian: "Paving bekas", tanggal: "2026-10-10" }), 400, "diterima tanpa bukti");
    });

    await uji("ringkasan dashboard & pengantar WA (tanpa kirim)", async () => {
      const r = await T.ringkasan(rw);
      pastikan(typeof r.draft === "number" && typeof r.tindak_terlambat === "number", "ringkasan");
      const s = await draft("c_edaran", "wa");
      await L.terbitkan(rw, s.id);
      const teks = await L.pengantarWa(rw, s.id);
      pastikan(teks.includes("/verify/surat/") && !teks.includes("Isian"), "pengantar WA");
      const { rows } = await pool.query(`SELECT verifikasi_token FROM surat_rw WHERE id = $1`, [s.id]);
      const v = await T.verifikasi({ token: rows[0].verifikasi_token });
      pastikan(v && Object.keys(v).sort().join() === "jenis_surat,nomor_surat,penandatangan,status,tanggal_surat", "verifikasi minimum");
    });

    await uji("jenis lama: draft dipetakan, arsip terbit tetap dan bisa disalin", async () => {
      const { rows: d } = await pool.query(
        `INSERT INTO surat_rw (kode_jenis, jenis_surat, perihal, tanggal_surat, isi_surat, data_form, status, akses)
         VALUES ('c_ba_musyawarah', 'Berita Acara Keputusan Musyawarah', 'Uji SS draft lama', '2026-10-08', 'isi', '{"hasil": ["Sepakat"]}', 'draft', 'internal') RETURNING id`);
      ids.push(d[0].id);
      const bloks = [{ t: "judul", teks: "SURAT UNDANGAN" }, { t: "paragraf", teks: "Kami mengundang Bapak/Ibu." }, { t: "label", baris: [["Tempat", "Balai RW"]] }];
      const { rows: a } = await pool.query(
        `INSERT INTO surat_rw (kode_jenis, jenis_surat, perihal, tanggal_surat, isi_surat, data_form, status, akses, nomor_surat, snapshot)
         VALUES ('c_undangan', 'Undangan Rapat/Kegiatan', 'Uji SS arsip lama', '2026-10-08', 'isi', '{}', 'terbit', 'internal', '999/UND/RW.03/X/2026', $1) RETURNING id`,
        [JSON.stringify({ data: { penerima: [{ nama: "Warga RW 03", jenis: "warga" }], agenda: ["Rapat"] }, bloks })]);
      ids.push(a[0].id);
      await L.rapikanDraftJenisLama();
      const { rows: d2 } = await pool.query(`SELECT kode_jenis, data_form, perlu_pemeriksaan FROM surat_rw WHERE id = $1`, [d[0].id]);
      pastikan(d2[0].kode_jenis === "jb_berita_acara" && d2[0].data_form.jenisBA === "Musyawarah" && d2[0].perlu_pemeriksaan, JSON.stringify(d2[0]));
      const { rows: a2 } = await pool.query(`SELECT kode_jenis FROM surat_rw WHERE id = $1`, [a[0].id]);
      pastikan(a2[0].kode_jenis === "c_undangan", "arsip terbit ikut diubah");
      pastikan((await L.detailSurat(rw, a[0].id)).pratinjau, "pratinjau arsip lama hilang");
      const g = await L.salinJadiDraft(rw, a[0].id);
      ids.push(g.id);
      pastikan(g.kodeJenis === "f_kustom" && String(g.dataForm.isiSurat).includes("Kami mengundang") && Array.isArray(g.dataForm.penerima) && !("agenda" in g.dataForm), JSON.stringify(g.dataForm));
    });
  } finally {
    await hapusSuratUji(pool, ids);
    await bersihTtd();
  }
}

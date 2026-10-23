/**
 * Dashboard Ketua RW — hanya baca. Semua angka dihitung dari standar data RW 03 yang aktif.
 */
import { pool } from "./db";
import { indukKeluarga, ringkasKeluarga, type PerhatianKeluarga } from "./wilayah-data";
import { standarAktif } from "./wilayah-standar";
import { berlakuUntukWarga, isoTanggal, kenaPerhatian, nilaiBanyak, umurTahun, type TipeFakta } from "@shared/wilayah";
import { isNomorHpValid, looksLikeNik } from "@shared/kontak";
import { ACTIVE_RT_NUMBERS } from "@shared/rt";

const RT_DASHBOARD = [...ACTIVE_RT_NUMBERS];

export interface RingkasAngka { total: number; rata: number | null; median: number | null; min: number | null; maks: number | null }

export interface SebaranJawaban {
  kunci: string;
  subjek: "kk" | "warga";
  kelompok: string;
  label: string;
  tipe: TipeFakta;
  terjawab: number;
  /** KK / warga aktif yang seharusnya menjawab (sesuai syarat usia & jenis kelamin). */
  sasaran: number;
  opsi: { nilai: string; label: string; jumlah: number; perhatian: boolean }[];
  angka: RingkasAngka | null;
}

export interface DistribusiDasar {
  kunci: string;
  label: string;
  satuan: "orang" | "KK";
  keterangan: string;
  opsi: { label: string; jumlah: number; perhatian?: boolean; kosong?: boolean }[];
}

export interface DataDasar {
  indeks: { label: string; nilai: string; ket: string }[];
  distribusi: DistribusiDasar[];
}

export interface KotakMasukRt { rt: number; usulan: number; pindah: number }

/** Yang menunggu keputusan per RT: isian QR warga dan permintaan pindah RT yang masuk. */
export async function kotakMasukRw(): Promise<{ total: number; perRt: KotakMasukRt[] }> {
  const { rows } = await pool.query(
    `SELECT r.rt,
       (SELECT COUNT(*)::int FROM wil_usulan u WHERE u.rt = r.rt AND u.status = 'menunggu') AS usulan,
       (SELECT COUNT(*)::int FROM wil_serah_terima s WHERE s.rt_tujuan = r.rt AND s.status = 'diajukan') AS pindah
     FROM unnest($1::int[]) AS r(rt)`,
    [RT_DASHBOARD],
  );
  const perRt = rows.map((r) => ({ rt: r.rt as number, usulan: r.usulan as number, pindah: r.pindah as number }));
  return { total: perRt.reduce((n, r) => n + r.usulan + r.pindah, 0), perRt };
}

export async function ringkasanRw() {
  const { rows: kks } = await pool.query(
    `SELECT k.id, k.rt, k.alamat,
            (SELECT nama_lengkap FROM warga w WHERE w.kk_id = k.id AND w.kedudukan_keluarga = 'Kepala Keluarga' ORDER BY w.id LIMIT 1) AS kepala
       FROM kartu_keluarga k WHERE k.rt = ANY($1)`,
    [RT_DASHBOARD],
  );
  const ringkas = await ringkasKeluarga(kks.map((k) => k.id));
  const { rows: antre } = await pool.query(
    `SELECT r.rt,
       (SELECT COUNT(*)::int FROM wil_usulan u WHERE u.rt = r.rt AND u.status = 'menunggu') AS usulan,
       (SELECT COUNT(*)::int FROM wil_serah_terima s WHERE (s.rt_asal = r.rt OR s.rt_tujuan = r.rt) AND s.status = 'diajukan') AS pindah
     FROM unnest($1::int[]) AS r(rt)`,
    [RT_DASHBOARD],
  );

  const jumlah = (list: typeof kks, f: (r: NonNullable<ReturnType<typeof ringkas.get>>) => number) =>
    list.reduce((n, k) => n + f(ringkas.get(k.id)!), 0);
  const persen = (list: typeof kks) => {
    const tanya = jumlah(list, (r) => r.pertanyaan);
    return tanya ? Math.round((jumlah(list, (r) => r.terjawab) / tanya) * 100) : null;
  };

  const total = {
    kk: kks.length,
    warga: jumlah(kks, (r) => r.anggota),
    lakiLaki: jumlah(kks, (r) => r.lakiLaki),
    perempuan: jumlah(kks, (r) => r.perempuan),
    balita: jumlah(kks, (r) => r.balita),
    anak: jumlah(kks, (r) => r.anak),
    lansia: jumlah(kks, (r) => r.lansia),
    kelengkapan: persen(kks),
    kkPerhatian: kks.filter((k) => ringkas.get(k.id)!.perhatian.length).length,
    kkBelumDiisi: kks.filter((k) => ringkas.get(k.id)!.terjawab === 0).length,
  };

  const perRt = RT_DASHBOARD.map((rt) => {
    const list = kks.filter((k) => k.rt === rt);
    const a = antre.find((x) => x.rt === rt);
    return {
      rt,
      kk: list.length,
      warga: jumlah(list, (r) => r.anggota),
      kelengkapan: persen(list),
      kkPerhatian: list.filter((k) => ringkas.get(k.id)!.perhatian.length).length,
      kkBelumDiisi: list.filter((k) => ringkas.get(k.id)!.terjawab === 0).length,
      usulanMenunggu: a?.usulan ?? 0,
      pindahMenunggu: a?.pindah ?? 0,
    };
  }).filter((r) => r.kk > 0 || r.usulanMenunggu > 0 || r.pindahMenunggu > 0);

  const perhatianPerKunci = new Map<string, { label: string; kk: number }>();
  for (const k of kks) {
    for (const p of ringkas.get(k.id)!.perhatian) {
      const x = perhatianPerKunci.get(p.kunci) ?? { label: p.label, kk: 0 };
      x.kk++;
      perhatianPerKunci.set(p.kunci, x);
    }
  }

  const prioritas: { id: number; rt: number; kepala: string | null; alamat: string; perhatian: PerhatianKeluarga[] }[] = kks
    .filter((k) => ringkas.get(k.id)!.perhatian.length)
    .map((k) => ({ id: k.id, rt: k.rt, kepala: k.kepala, alamat: k.alamat, perhatian: ringkas.get(k.id)!.perhatian }))
    .sort((a, b) => b.perhatian.length - a.perhatian.length || a.rt - b.rt)
    .slice(0, 30);

  return {
    total,
    perRt,
    perhatian: Array.from(perhatianPerKunci, ([kunci, v]) => ({ kunci, ...v })).sort((a, b) => b.kk - a.kk),
    prioritas,
    sebaran: await sebaranJawaban(kks.map((k) => k.id)),
    dasar: await dataDasar(kks.map((k) => k.id)),
  };
}

function ringkasAngka(nilai: number[]): RingkasAngka {
  if (!nilai.length) return { total: 0, rata: null, median: null, min: null, maks: null };
  const urut = [...nilai].sort((a, b) => a - b);
  const tengah = urut.length >> 1;
  const total = urut.reduce((s, n) => s + n, 0);
  return {
    total,
    rata: Math.round((total / urut.length) * 10) / 10,
    median: urut.length % 2 ? urut[tengah] : (urut[tengah - 1] + urut[tengah]) / 2,
    min: urut[0],
    maks: urut[urut.length - 1],
  };
}

function kelasAngka(nilai: number[]): { nilai: string; label: string; jumlah: number; perhatian: boolean }[] {
  if (!nilai.length) return [];
  const maks = Math.max(...nilai);
  if (maks <= 10) {
    return Array.from({ length: maks + 1 }, (_, i) => ({ nilai: String(i), label: String(i), jumlah: nilai.filter((n) => n === i).length, perhatian: false }));
  }
  const lebar = Math.ceil((maks + 1) / 5);
  return Array.from({ length: 5 }, (_, i) => {
    const a = i * lebar, b = a + lebar - 1;
    return { nilai: `${a}-${b}`, label: `${a.toLocaleString("id-ID")}–${b.toLocaleString("id-ID")}`, jumlah: nilai.filter((n) => n >= a && n <= b).length, perhatian: false };
  });
}

async function sebaranJawaban(kkIds: number[]): Promise<SebaranJawaban[]> {
  const defs = (await standarAktif()).filter((d) => d.subjek === "kk" || d.subjek === "warga");
  if (!kkIds.length || !defs.length) return [];
  const kunciDef = new Set(defs.map((d) => d.kunci));
  const hariIni = isoTanggal(new Date());
  const { rows: wargaAktif } = await pool.query(
    `SELECT jenis_kelamin, tanggal_lahir FROM warga WHERE kk_id = ANY($1) AND status_kependudukan = 'Aktif'`,
    [kkIds],
  );
  const profil = wargaAktif.map((w) => ({ jenisKelamin: w.jenis_kelamin, umur: umurTahun(w.tanggal_lahir, hariIni) }));
  const [{ rows }, induk] = await Promise.all([
    pool.query(
      `SELECT f.subjek, f.subjek_id, f.kunci, f.nilai
         FROM wil_fakta f LEFT JOIN warga w ON f.subjek = 'warga' AND w.id = f.subjek_id
        WHERE f.sampai IS NULL AND f.nilai IS NOT NULL AND f.status_verifikasi IN ('terverifikasi', 'perlu_cek') AND f.kunci = ANY($2)
          AND ((f.subjek = 'kk' AND f.subjek_id = ANY($1)) OR (f.subjek = 'warga' AND w.kk_id = ANY($1) AND w.status_kependudukan = 'Aktif'))
        ORDER BY (f.status_verifikasi = 'terverifikasi'), f.mulai, f.id`,
      [kkIds, Array.from(kunciDef)],
    ),
    indukKeluarga(kkIds),
  ]);
  // Satu jawaban per subjek+kunci: fakta tercatat (terverifikasi menang) didahulukan, data induk sebagai cadangan.
  const jawaban = new Map<string, string>();
  for (const [k, v] of induk.jawaban) if (kunciDef.has(k.slice(k.lastIndexOf(":") + 1))) jawaban.set(k, v);
  for (const r of rows) jawaban.set(`${r.subjek}:${r.subjek_id}:${r.kunci}`, r.nilai);
  const perKunci = new Map<string, string[]>();
  for (const [k, v] of jawaban) {
    const kunci = k.slice(k.lastIndexOf(":") + 1);
    perKunci.set(kunci, [...(perKunci.get(kunci) ?? []), v]);
  }

  return defs.map((d) => {
    const nilaiList = perKunci.get(d.kunci) ?? [];
    const terjawab = nilaiList.length;
    const sasaran = Math.max(terjawab, d.subjek === "kk" ? kkIds.length : profil.filter((w) => berlakuUntukWarga(d, w)).length);
    const dasar = { kunci: d.kunci, subjek: d.subjek as "kk" | "warga", kelompok: d.kelompok, label: d.label, tipe: d.tipe, terjawab, sasaran };
    if (d.tipe === "angka") {
      const angka = nilaiList.map(Number).filter((n) => Number.isFinite(n));
      return { ...dasar, opsi: kelasAngka(angka), angka: ringkasAngka(angka) };
    }
    if (d.tipe === "teks") {
      return { ...dasar, opsi: [{ nilai: "terisi", label: "Sudah diisi", jumlah: terjawab, perhatian: false }], angka: null };
    }
    const hitung = new Map<string, number>();
    for (const n of nilaiList) {
      for (const v of d.tipe === "banyak" ? nilaiBanyak(n) : [n]) hitung.set(v, (hitung.get(v) ?? 0) + 1);
    }
    const pilihan = d.tipe === "yatidak" ? [{ nilai: "ya", label: "Ya" }, { nilai: "tidak", label: "Tidak" }] : d.pilihan ?? [];
    return {
      ...dasar,
      opsi: pilihan.map((o) => ({ nilai: o.nilai, label: o.label, jumlah: hitung.get(o.nilai) ?? 0, perhatian: kenaPerhatian(d, o.nilai) })),
      angka: null,
    };
  });
}

const KEDUDUKAN = ["Kepala Keluarga", "Istri", "Suami", "Anak", "Menantu", "Cucu", "Orang Tua", "Mertua", "Famili Lain", "Lainnya"];
const KAWIN = ["Belum Kawin", "Kawin", "Cerai Hidup", "Cerai Mati"];

/** Hitung per nilai dengan urutan tetap; nilai di luar daftar digabung ke "Lainnya", kosong ke "Belum diisi". */
function hitungUrut(nilai: (string | null | undefined)[], urutan: string[]) {
  const peta = new Map<string, number>();
  let kosong = 0;
  for (const v of nilai) {
    const t = (v ?? "").trim();
    if (!t) { kosong++; continue; }
    const kunci = urutan.find((u) => u.toLowerCase() === t.toLowerCase()) ?? "Lainnya";
    peta.set(kunci, (peta.get(kunci) ?? 0) + 1);
  }
  const daftar = [...urutan, ...(urutan.includes("Lainnya") ? [] : ["Lainnya"])];
  return [
    ...daftar.filter((u) => peta.get(u)).map((u) => ({ label: u, jumlah: peta.get(u)! })),
    ...(kosong ? [{ label: "Belum diisi", jumlah: kosong, kosong: true }] : []),
  ];
}

const desimal = (n: number) => n.toLocaleString("id-ID", { maximumFractionDigits: 1 });

/** Data dasar formulir warga & KK (di luar standar data): jenis kelamin, hubungan, perkawinan, NIK, HP, rumah, QR. */
async function dataDasar(kkIds: number[]): Promise<DataDasar> {
  if (!kkIds.length) return { indeks: [], distribusi: [] };
  const hariIni = isoTanggal(new Date());
  const [{ rows: warga }, { rows: kk }, { rows: rumah }] = await Promise.all([
    pool.query(
      `SELECT kk_id, nik, jenis_kelamin, tanggal_lahir, kedudukan_keluarga, status_perkawinan, status_kependudukan, nomor_whatsapp
         FROM warga WHERE kk_id = ANY($1)`,
      [kkIds],
    ),
    pool.query(
      `SELECT k.id, k.nomor_kk,
              EXISTS (SELECT 1 FROM wil_rumah_kk rk WHERE rk.kk_id = k.id AND rk.sampai IS NULL) AS punya_rumah,
              EXISTS (SELECT 1 FROM wil_kk_token t WHERE t.kk_id = k.id AND t.dicabut_at IS NULL AND t.expires_at > now()) AS punya_qr
         FROM kartu_keluarga k WHERE k.id = ANY($1)`,
      [kkIds],
    ),
    pool.query(
      `SELECT rk.rumah_id, COUNT(*)::int AS kk FROM wil_rumah_kk rk WHERE rk.sampai IS NULL AND rk.kk_id = ANY($1) GROUP BY rk.rumah_id`,
      [kkIds],
    ),
  ]);
  const aktif = warga.filter((w) => w.status_kependudukan === "Aktif");
  const dewasa = aktif.filter((w) => { const u = umurTahun(w.tanggal_lahir, hariIni); return u == null || u >= 17; });
  const anggotaPerKk = new Map<number, number>(kk.map((k) => [k.id, 0]));
  for (const w of aktif) anggotaPerKk.set(w.kk_id, (anggotaPerKk.get(w.kk_id) ?? 0) + 1);
  const ukuran = Array.from(anggotaPerKk.values());
  const kelasUkuran = ["0", "1", "2", "3", "4", "5", "6+"];
  const hpStatus = (v: string | null) => (!v?.trim() ? "Belum diisi" : looksLikeNik(v) ? "Berisi NIK / salah" : isNomorHpValid(v) ? "Nomor valid" : "Format tidak valid");
  const nikStatus = (v: string | null) => (!v?.trim() ? "Belum diisi" : /^\d{16}$/.test(v.trim()) ? "16 digit" : "Tidak 16 digit");
  const kkRumah = rumah.reduce((s, r) => s + r.kk, 0);

  const distribusi: DistribusiDasar[] = [
    { kunci: "jenis_kelamin", label: "Jenis kelamin", satuan: "orang", keterangan: "warga aktif", opsi: hitungUrut(aktif.map((w) => w.jenis_kelamin), ["Laki-laki", "Perempuan"]) },
    { kunci: "kedudukan", label: "Hubungan dalam keluarga", satuan: "orang", keterangan: "warga aktif", opsi: hitungUrut(aktif.map((w) => w.kedudukan_keluarga), KEDUDUKAN) },
    { kunci: "perkawinan", label: "Status perkawinan", satuan: "orang", keterangan: "warga aktif usia 17+", opsi: hitungUrut(dewasa.map((w) => w.status_perkawinan), KAWIN) },
    { kunci: "kependudukan", label: "Status kependudukan", satuan: "orang", keterangan: "semua warga tercatat", opsi: hitungUrut(warga.map((w) => w.status_kependudukan), ["Aktif", "Pindah", "Meninggal"]) },
    { kunci: "ukuran_kk", label: "Jumlah anggota per KK", satuan: "KK", keterangan: "anggota aktif", opsi: kelasUkuran.map((l, i) => ({ label: l === "6+" ? "6 orang atau lebih" : `${l} orang`, jumlah: ukuran.filter((n) => (i === 6 ? n >= 6 : n === i)).length, perhatian: i === 0 })).filter((o) => o.jumlah) },
    {
      kunci: "nomor_hp", label: "Nomor HP / WhatsApp", satuan: "orang", keterangan: "warga aktif usia 17+",
      opsi: ["Nomor valid", "Format tidak valid", "Berisi NIK / salah", "Belum diisi"].map((l) => ({ label: l, jumlah: dewasa.filter((w) => hpStatus(w.nomor_whatsapp) === l).length, perhatian: l === "Berisi NIK / salah" || l === "Format tidak valid", kosong: l === "Belum diisi" })).filter((o) => o.jumlah),
    },
    {
      kunci: "nik", label: "NIK", satuan: "orang", keterangan: "warga aktif",
      opsi: ["16 digit", "Tidak 16 digit", "Belum diisi"].map((l) => ({ label: l, jumlah: aktif.filter((w) => nikStatus(w.nik) === l).length, perhatian: l === "Tidak 16 digit", kosong: l === "Belum diisi" })).filter((o) => o.jumlah),
    },
    {
      kunci: "tanggal_lahir", label: "Tanggal lahir", satuan: "orang", keterangan: "warga aktif",
      opsi: [
        { label: "Sudah diisi", jumlah: aktif.filter((w) => umurTahun(w.tanggal_lahir, hariIni) != null).length },
        { label: "Belum diisi", jumlah: aktif.filter((w) => umurTahun(w.tanggal_lahir, hariIni) == null).length, kosong: true },
      ].filter((o) => o.jumlah),
    },
    {
      kunci: "nomor_kk", label: "Nomor KK", satuan: "KK", keterangan: "semua KK",
      opsi: ["16 digit", "Tidak 16 digit", "Belum diisi"].map((l) => ({ label: l, jumlah: kk.filter((k) => nikStatus(k.nomor_kk) === l).length, perhatian: l === "Tidak 16 digit", kosong: l === "Belum diisi" })).filter((o) => o.jumlah),
    },
    {
      kunci: "rumah", label: "Terhubung ke rumah", satuan: "KK", keterangan: "semua KK",
      opsi: [
        { label: "Sudah terhubung", jumlah: kk.filter((k) => k.punya_rumah).length },
        { label: "Belum terhubung", jumlah: kk.filter((k) => !k.punya_rumah).length, kosong: true },
      ].filter((o) => o.jumlah),
    },
    {
      kunci: "qr", label: "QR pemberitahuan", satuan: "KK", keterangan: "semua KK",
      opsi: [
        { label: "QR aktif", jumlah: kk.filter((k) => k.punya_qr).length },
        { label: "Belum punya QR", jumlah: kk.filter((k) => !k.punya_qr).length, kosong: true },
      ].filter((o) => o.jumlah),
    },
  ];

  const indeks = [
    { label: "Rata-rata anggota per KK", nilai: kk.length ? desimal(aktif.length / kk.length) : "–", ket: `${aktif.length.toLocaleString("id-ID")} jiwa aktif / ${kk.length} KK` },
    { label: "Rumah tercatat", nilai: rumah.length.toLocaleString("id-ID"), ket: `${kkRumah} KK sudah terhubung` },
    { label: "Rata-rata KK per rumah", nilai: rumah.length ? desimal(kkRumah / rumah.length) : "–", ket: `${rumah.filter((r) => r.kk > 1).length} rumah dihuni lebih dari 1 KK` },
    { label: "Kontak WA dewasa", nilai: dewasa.length ? `${Math.round((dewasa.filter((w) => isNomorHpValid(w.nomor_whatsapp)).length / dewasa.length) * 100)}%` : "–", ket: "warga 17+ dengan nomor valid" },
  ];
  return { indeks, distribusi };
}

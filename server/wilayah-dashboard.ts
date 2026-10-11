/**
 * Dashboard Ketua RW — hanya baca. Semua angka dihitung dari standar data RW 03 yang aktif.
 */
import { pool } from "./db";
import { indukKeluarga, ringkasKeluarga, type PerhatianKeluarga } from "./wilayah-data";
import { standarAktif } from "./wilayah-standar";
import { kenaPerhatian, nilaiBanyak } from "@shared/wilayah";
import { ACTIVE_RT_NUMBERS } from "@shared/rt";

const RT_DASHBOARD = [...ACTIVE_RT_NUMBERS];

export interface SebaranJawaban {
  kunci: string;
  subjek: "kk" | "warga";
  kelompok: string;
  label: string;
  terjawab: number;
  opsi: { nilai: string; label: string; jumlah: number; perhatian: boolean }[];
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
  };
}

async function sebaranJawaban(kkIds: number[]): Promise<SebaranJawaban[]> {
  const defs = (await standarAktif()).filter((d) => d.tipe === "pilihan" || d.tipe === "banyak" || d.tipe === "yatidak");
  if (!kkIds.length || !defs.length) return [];
  const kunciDef = new Set(defs.map((d) => d.kunci));
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
    const hitung = new Map<string, number>();
    const nilaiList = perKunci.get(d.kunci) ?? [];
    const terjawab = nilaiList.length;
    for (const n of nilaiList) {
      for (const v of d.tipe === "banyak" ? nilaiBanyak(n) : [n]) hitung.set(v, (hitung.get(v) ?? 0) + 1);
    }
    const pilihan = d.tipe === "yatidak" ? [{ nilai: "ya", label: "Ya" }, { nilai: "tidak", label: "Tidak" }] : d.pilihan ?? [];
    return {
      kunci: d.kunci,
      subjek: d.subjek as "kk" | "warga",
      kelompok: d.kelompok,
      label: d.label,
      terjawab,
      opsi: pilihan.map((o) => ({ nilai: o.nilai, label: o.label, jumlah: hitung.get(o.nilai) ?? 0, perhatian: kenaPerhatian(d, o.nilai) })),
    };
  });
}

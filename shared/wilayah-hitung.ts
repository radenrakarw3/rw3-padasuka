/**
 * Mesin hitung laporan kecamatan — fungsi murni di atas dataset terverifikasi.
 * Tidak menyentuh database, sehingga dapat diuji dan dihitung ulang dari snapshot sumber.
 */
import { INDIKATOR_KECAMATAN, type IndikatorKecamatan, type Rumus } from "./indikator-kecamatan";
import { akhirBulan, awalBulan, umurBulan, umurTahun, type BagianKonfirmasi, type SubjekFakta } from "./wilayah";

export interface DsKk { id: number; rt: number }
export interface DsWarga { id: number; kkId: number; rt: number; jk: "L" | "P" | null; tanggalLahir: string | null }
export interface DsRumah { id: number; rt: number }
export interface DsUsaha { id: number; rt: number; kategori: string | null; pemilikPerempuan: boolean; mulai: string | null; sampai: string | null }
export interface DsFasilitas { id: number; jenis: string; rtLokasi: number | null; pengelola: "rt" | "rw"; rtLayanan: number[]; mulai: string | null; sampai: string | null }
export interface DsKelompok { id: number; jenis: string; rtBasis: number | null; pengelola: "rt" | "rw"; rtTerlibat: number[]; mulai: string | null; sampai: string | null }
export interface DsKegiatan { id: number; jenis: string; tanggal: string; pengelola: "rt" | "rw"; rtPengelola: number | null; rtTerlibat: number[] }
export interface DsPeserta { kegiatanId: number; rt: number; jumlahHadir: number }
export interface DsKejadian { id: number; jenis: string; tanggal: string; rt: number | null; jumlahPelaku: number | null }
export interface DsFakta { subjek: SubjekFakta; subjekId: number; kunci: string; nilai: string; mulai: string; sampai: string | null }
export interface DsKonfirmasi { rt: number | null; tahun: number; bulan: number; bagian: BagianKonfirmasi | string }

/** Dataset hanya berisi data terverifikasi dan warga berstatus aktif. */
export interface DatasetWilayah {
  kk: DsKk[];
  warga: DsWarga[];
  rumah: DsRumah[];
  usaha: DsUsaha[];
  fasilitas: DsFasilitas[];
  kelompok: DsKelompok[];
  kegiatan: DsKegiatan[];
  peserta: DsPeserta[];
  kejadian: DsKejadian[];
  fakta: DsFakta[];
  konfirmasi: DsKonfirmasi[];
}

export type StatusSel = "lengkap" | "sebagian" | "belum_diketahui" | "menunggu_rw" | "needs_confirmation";

export interface HasilIndikator {
  id: string;
  no: number;
  bagian: string;
  kode: string;
  label: string;
  satuan: string;
  periode: string;
  /** null = belum diketahui / belum boleh difinalkan. 0 hanya bila diketahui nol. */
  nilai: number | null;
  status: StatusSel;
  /** 0..1, null bila tidak relevan. */
  kelengkapan: number | null;
  catatan: string;
  rincian: Record<string, number | string | null>;
}

export interface OpsiHitung {
  /** null = rekap RW (objek unik seluruh RW). */
  rt: number | null;
  tahun: number;
  bulan: number;
  /** Tanggal acuan stok (YYYY-MM-DD). */
  acuan: string;
}

const BATAS_USIA_SEKOLAH_USULAN: Record<"sd" | "smp" | "sma", [number, number]> = { sd: [7, 12], smp: [13, 15], sma: [16, 18] };

function berlakuPada(mulai: string | null, sampai: string | null, tgl: string): boolean {
  return (!mulai || mulai <= tgl) && (!sampai || sampai >= tgl);
}

function tumpangBulan(mulai: string | null, sampai: string | null, awal: string, akhir: string): boolean {
  return (!mulai || mulai <= akhir) && (!sampai || sampai >= awal);
}

/** Indeks fakta: subjek|id|kunci → daftar fakta (urut mulai naik). */
function indeksFakta(fakta: DsFakta[]) {
  const map = new Map<string, DsFakta[]>();
  for (const f of fakta) {
    const k = `${f.subjek}|${f.subjekId}|${f.kunci}`;
    const arr = map.get(k);
    if (arr) arr.push(f);
    else map.set(k, [f]);
  }
  map.forEach((arr) => arr.sort((a, b) => (a.mulai < b.mulai ? -1 : a.mulai > b.mulai ? 1 : 0)));
  return {
    /** Nilai yang berlaku pada tanggal; undefined = belum diketahui. */
    pada(subjek: SubjekFakta, id: number, kunci: string, tgl: string): string | undefined {
      const arr = map.get(`${subjek}|${id}|${kunci}`);
      if (!arr) return undefined;
      let hasil: string | undefined;
      for (const f of arr) if (berlakuPada(f.mulai, f.sampai, tgl)) hasil = f.nilai;
      return hasil;
    },
    /** Semua nilai yang berlaku kapan pun dalam rentang. */
    dalamRentang(subjek: SubjekFakta, id: number, kunci: string, awal: string, akhir: string): string[] | undefined {
      const arr = map.get(`${subjek}|${id}|${kunci}`);
      if (!arr) return undefined;
      const hit = arr.filter((f) => tumpangBulan(f.mulai, f.sampai, awal, akhir));
      return hit.length ? hit.map((f) => f.nilai) : undefined;
    },
    mulaiDalam(subjek: SubjekFakta, id: number, kunci: string, nilai: string[], awal: string, akhir: string): boolean {
      const arr = map.get(`${subjek}|${id}|${kunci}`);
      if (!arr) return false;
      return arr.some((f, i) => {
        if (!nilai.includes(f.nilai) || f.mulai < awal || f.mulai > akhir) return false;
        const sebelum = arr[i - 1];
        return !sebelum || !nilai.includes(sebelum.nilai) || (sebelum.sampai != null && sebelum.sampai < f.mulai);
      });
    },
    adaUntuk(subjek: SubjekFakta, id: number, kunci: string): boolean {
      return map.has(`${subjek}|${id}|${kunci}`);
    },
  };
}

function dalamRt(rtObj: number | null | undefined, rt: number | null): boolean {
  return rt == null || rtObj === rt;
}

function hasilFrom(ind: IndikatorKecamatan, part: Partial<HasilIndikator>): HasilIndikator {
  return {
    id: ind.id, no: ind.no, bagian: ind.bagian, kode: ind.kode, label: ind.label, satuan: ind.satuan, periode: ind.periode,
    nilai: null, status: "belum_diketahui", kelengkapan: null, catatan: "", rincian: {},
    ...part,
  };
}

/** Rasio kelengkapan → status & nilai. Tanpa satu pun jawaban diketahui = belum diketahui. */
function dariHitungan(ind: IndikatorKecamatan, cocok: number, diketahui: number, semesta: number, catatanTambahan = ""): HasilIndikator {
  const rincian = { cocok, diketahui, semesta };
  if (semesta === 0) {
    return hasilFrom(ind, { nilai: 0, status: "lengkap", kelengkapan: 1, rincian, catatan: `Tidak ada ${ind.entitas} tercatat${catatanTambahan}` });
  }
  if (diketahui === 0) {
    return hasilFrom(ind, { nilai: null, status: "belum_diketahui", kelengkapan: 0, rincian, catatan: `Belum ada jawaban dari ${semesta} ${ind.entitas}${catatanTambahan}` });
  }
  const kel = diketahui / semesta;
  return hasilFrom(ind, {
    nilai: cocok,
    status: kel >= 1 ? "lengkap" : "sebagian",
    kelengkapan: kel,
    rincian,
    catatan: kel >= 1 ? catatanTambahan.trim() : `${semesta - diketahui} dari ${semesta} ${ind.entitas} belum diketahui${catatanTambahan}`,
  });
}

export function hitungLaporan(ds: DatasetWilayah, opsi: OpsiHitung, daftar: IndikatorKecamatan[] = INDIKATOR_KECAMATAN): HasilIndikator[] {
  const { rt, tahun, bulan, acuan } = opsi;
  const awal = awalBulan(tahun, bulan);
  const akhir = akhirBulan(tahun, bulan);
  const fakta = indeksFakta(ds.fakta);

  const kkRt = ds.kk.filter((k) => dalamRt(k.rt, rt));
  const wargaRt = ds.warga.filter((w) => dalamRt(w.rt, rt));
  const kkBerAnggota = new Set(wargaRt.map((w) => w.kkId));
  const rumahRt = ds.rumah.filter((r) => dalamRt(r.rt, rt));
  const usahaRt = ds.usaha.filter((u) => dalamRt(u.rt, rt) && berlakuPada(u.mulai, u.sampai, acuan));

  const dikonfirmasi = (bagian: string, scopeRt: number | null) =>
    ds.konfirmasi.some((k) => k.tahun === tahun && k.bulan === bulan && k.bagian === bagian && k.rt === scopeRt);
  /** Untuk rekap RW: bagian RT dianggap lengkap bila ketujuh RT yang punya data sudah konfirmasi. */
  const rtTerkonfirmasi = (bagian: string): boolean => {
    if (rt != null) return dikonfirmasi(bagian, rt);
    const rtAktif = Array.from(new Set(ds.kk.map((k) => k.rt)));
    return rtAktif.length > 0 && rtAktif.every((r) => dikonfirmasi(bagian, r));
  };

  const hitungSatu = (ind: IndikatorKecamatan): HasilIndikator => {
    const r: Rumus = ind.rumus;
    switch (r.t) {
      case "warga_aktif": {
        if (!r.jk) return hasilFrom(ind, { nilai: wargaRt.length, status: "lengkap", kelengkapan: 1, rincian: { warga: wargaRt.length } });
        const diketahui = wargaRt.filter((w) => w.jk != null).length;
        return dariHitungan(ind, wargaRt.filter((w) => w.jk === r.jk).length, diketahui, wargaRt.length);
      }
      case "kk_aktif": {
        const n = kkRt.filter((k) => kkBerAnggota.has(k.id)).length;
        return hasilFrom(ind, { nilai: n, status: "lengkap", kelengkapan: 1, rincian: { kk: n, kkTanpaAnggotaAktif: kkRt.length - n } });
      }
      case "umur": {
        let cocok = 0;
        let diketahui = 0;
        for (const w of wargaRt) {
          const b = umurBulan(w.tanggalLahir, acuan);
          if (b == null) continue;
          diketahui++;
          if ((r.minBulan == null || b >= r.minBulan) && (r.maxBulan == null || b <= r.maxBulan)) cocok++;
        }
        return dariHitungan(ind, cocok, diketahui, wargaRt.length, " (tanggal lahir)");
      }
      case "fakta_warga": {
        let semesta = wargaRt;
        if (r.jk) semesta = semesta.filter((w) => w.jk === r.jk);
        let tanpaUmur = 0;
        if (r.minUmurTahun != null) {
          const min = r.minUmurTahun;
          semesta = semesta.filter((w) => {
            const u = umurTahun(w.tanggalLahir, acuan);
            if (u == null) tanpaUmur++;
            return u != null && u >= min;
          });
        }
        let cocok = 0;
        let diketahui = 0;
        for (const w of semesta) {
          if (r.periode === "mulai_dalam_bulan") {
            if (!fakta.adaUntuk("warga", w.id, r.kunci)) continue;
            diketahui++;
            if (fakta.mulaiDalam("warga", w.id, r.kunci, r.nilai, awal, akhir)) cocok++;
          } else if (r.periode === "bulan") {
            const vals = fakta.dalamRentang("warga", w.id, r.kunci, awal, akhir);
            if (!vals) continue;
            diketahui++;
            if (vals.some((v) => r.nilai.includes(v))) cocok++;
          } else {
            const v = fakta.pada("warga", w.id, r.kunci, acuan);
            if (v === undefined) continue;
            diketahui++;
            if (r.nilai.includes(v)) cocok++;
          }
        }
        const extra = tanpaUmur ? `; ${tanpaUmur} warga tanpa tanggal lahir tidak ikut dihitung` : "";
        return dariHitungan(ind, cocok, diketahui, semesta.length + tanpaUmur, extra);
      }
      case "fakta_kk": {
        let cocok = 0;
        let diketahui = 0;
        const semesta = kkRt.filter((k) => kkBerAnggota.has(k.id));
        for (const k of semesta) {
          const v = fakta.pada("kk", k.id, r.kunci, acuan);
          if (v === undefined) continue;
          diketahui++;
          if (r.nilai.includes(v)) cocok++;
        }
        return dariHitungan(ind, cocok, diketahui, semesta.length);
      }
      case "fakta_rumah": {
        let cocok = 0;
        let diketahui = 0;
        for (const h of rumahRt) {
          const v = fakta.pada("rumah", h.id, r.kunci, acuan);
          if (v === undefined) continue;
          diketahui++;
          if (r.nilai.includes(v)) cocok++;
        }
        const kkTanpaRumah = kkRt.filter((k) => kkBerAnggota.has(k.id)).length;
        const h = dariHitungan(ind, cocok, diketahui, rumahRt.length);
        if (rumahRt.length === 0 && kkTanpaRumah > 0) {
          return hasilFrom(ind, { nilai: null, status: "belum_diketahui", kelengkapan: 0, catatan: "Belum ada rumah yang dicatat; hubungkan KK ke rumah terlebih dahulu", rincian: { rumah: 0, kk: kkTanpaRumah } });
        }
        return h;
      }
      case "usaha": {
        if (r.kunci) {
          let cocok = 0;
          let diketahui = 0;
          for (const u of usahaRt) {
            const v = fakta.pada("usaha", u.id, r.kunci, acuan);
            if (v === undefined) continue;
            diketahui++;
            if (v === "ya") cocok++;
          }
          return dariHitungan(ind, cocok, diketahui, usahaRt.length);
        }
        if (r.kategori) {
          const diketahui = usahaRt.filter((u) => u.kategori != null).length;
          return dariHitungan(ind, usahaRt.filter((u) => u.kategori === r.kategori).length, diketahui, usahaRt.length);
        }
        if (r.pemilikPerempuan) {
          return hasilFrom(ind, { nilai: usahaRt.filter((u) => u.pemilikPerempuan).length, status: "lengkap", kelengkapan: 1, rincian: { usaha: usahaRt.length } });
        }
        return hasilFrom(ind, { nilai: usahaRt.length, status: "lengkap", kelengkapan: 1, rincian: { usaha: usahaRt.length } });
      }
      case "fasilitas": {
        const aktif = ds.fasilitas.filter((f) => f.jenis === r.jenis && berlakuPada(f.mulai, f.sampai, acuan));
        const diRt = aktif.filter((f) => dalamRt(f.rtLokasi, rt));
        const bersamaLintasRt = rt != null && aktif.some((f) => f.pengelola === "rw" && f.rtLayanan.length > 1 && (f.rtLayanan.includes(rt) || f.rtLokasi === rt));
        const lengkapRt = rtTerkonfirmasi("fasilitas_rt");
        const lengkapRw = dikonfirmasi(r.jenis === "posyandu" ? "posyandu_rw" : "fasilitas_rw", null);
        const adaRw = aktif.some((f) => f.pengelola === "rw");

        let nilai: number;
        let diketahui = diRt.length;
        const semesta = diRt.length;
        if (r.jumlahkan) {
          const jumlah = r.jumlahkan;
          nilai = 0;
          diketahui = 0;
          for (const f of diRt) {
            const v = fakta.pada("fasilitas", f.id, jumlah, acuan);
            if (v === undefined) continue;
            diketahui++;
            nilai += Number(v) || 0;
          }
        } else if (r.kunci) {
          nilai = 0;
          diketahui = 0;
          for (const f of diRt) {
            const v = fakta.pada("fasilitas", f.id, r.kunci, acuan);
            if (v === undefined) continue;
            diketahui++;
            if (r.nilai?.includes(v)) nilai++;
          }
        } else {
          nilai = diRt.length;
        }
        const rincian = { objek: diRt.length, bersamaRw: aktif.filter((f) => f.pengelola === "rw").length, diketahui };

        if (bersamaLintasRt) {
          return hasilFrom(ind, { nilai: null, status: "needs_confirmation", kelengkapan: null, rincian, catatan: "Ada fasilitas bersama RW yang melayani beberapa RT; alokasi ke RT menunggu konfirmasi kecamatan" });
        }
        const perluRw = rt == null ? adaRw || ind.scope === "rw_bersama" : adaRw;
        if (perluRw && !lengkapRw && diRt.length === 0) {
          return hasilFrom(ind, { nilai: null, status: "menunggu_rw", rincian, catatan: "Menunggu data tingkat RW" });
        }
        if (diRt.length === 0) {
          return lengkapRt || lengkapRw
            ? hasilFrom(ind, { nilai: 0, status: "lengkap", kelengkapan: 1, rincian })
            : hasilFrom(ind, { nilai: null, status: ind.scope === "rw_bersama" ? "menunggu_rw" : "belum_diketahui", rincian, catatan: ind.scope === "rw_bersama" ? "Menunggu data tingkat RW" : "Daftar fasilitas belum dikonfirmasi lengkap" });
        }
        if ((r.jumlahkan || r.kunci) && diketahui === 0) {
          return hasilFrom(ind, { nilai: null, status: "belum_diketahui", kelengkapan: 0, rincian, catatan: "Data rinci fasilitas belum diisi" });
        }
        const kel = semesta ? diketahui / semesta : 1;
        return hasilFrom(ind, { nilai, status: kel >= 1 ? "lengkap" : "sebagian", kelengkapan: kel, rincian, catatan: kel < 1 ? `${semesta - diketahui} fasilitas belum diisi rinciannya` : "" });
      }
      case "kelompok": {
        const aktif = ds.kelompok.filter((k) => k.jenis === r.jenis && berlakuPada(k.mulai, k.sampai, acuan));
        const diRt = aktif.filter((k) => dalamRt(k.rtBasis, rt));
        if (diRt.length > 0 || rtTerkonfirmasi("kelompok_rt")) {
          return hasilFrom(ind, { nilai: diRt.length, status: "lengkap", kelengkapan: 1, rincian: { kelompok: diRt.length } });
        }
        return hasilFrom(ind, { nilai: null, status: "belum_diketahui", catatan: "Daftar kelompok belum dikonfirmasi lengkap" });
      }
      case "kegiatan": {
        const dalam = ds.kegiatan.filter(
          (k) => k.jenis === r.jenis && k.tanggal >= awal && k.tanggal <= akhir && (!r.pengelola || k.pengelola === r.pengelola),
        );
        const relevan = rt == null ? dalam : dalam.filter((k) => k.rtPengelola === rt || k.rtTerlibat.includes(rt));
        const lengkapRt = rtTerkonfirmasi("kegiatan_rt");
        const lengkapRw = dikonfirmasi("kegiatan_rw", null);
        const butuhRw = r.pengelola !== "rt";
        const lengkap = lengkapRt && (!butuhRw || lengkapRw);
        const rincian = { kegiatan: relevan.length, olehRw: relevan.filter((k) => k.pengelola === "rw").length };
        if (lengkap) return hasilFrom(ind, { nilai: relevan.length, status: "lengkap", kelengkapan: 1, rincian });
        if (relevan.length > 0) return hasilFrom(ind, { nilai: relevan.length, status: "sebagian", rincian, catatan: "Bulan belum dikonfirmasi lengkap" });
        if (lengkapRt && butuhRw && !lengkapRw) return hasilFrom(ind, { nilai: null, status: "menunggu_rw", rincian, catatan: "Menunggu data tingkat RW" });
        return hasilFrom(ind, { nilai: null, status: "belum_diketahui", rincian, catatan: "Kegiatan bulan ini belum dikonfirmasi" });
      }
      case "kejadian": {
        const dalam = ds.kejadian.filter((k) => k.jenis === r.jenis && k.tanggal >= awal && k.tanggal <= akhir && dalamRt(k.rt, rt));
        const bagian = ind.bagian === "C" ? "kejadian_kesehatan" : "kejadian_keamanan";
        const nilai = r.ukur === "pelaku" ? dalam.reduce((s, k) => s + (k.jumlahPelaku ?? 0), 0) : dalam.length;
        const pelakuBelum = r.ukur === "pelaku" && dalam.some((k) => k.jumlahPelaku == null);
        const rincian = { kasus: dalam.length };
        if (pelakuBelum) return hasilFrom(ind, { nilai: null, status: "belum_diketahui", rincian, catatan: "Jumlah pelaku belum diisi pada sebagian kasus" });
        if (rtTerkonfirmasi(bagian)) return hasilFrom(ind, { nilai, status: "lengkap", kelengkapan: 1, rincian });
        if (dalam.length > 0) return hasilFrom(ind, { nilai, status: "sebagian", rincian, catatan: "Bulan belum dikonfirmasi lengkap" });
        return hasilFrom(ind, { nilai: null, status: "belum_diketahui", rincian, catatan: "Belum dikonfirmasi: tidak ada kejadian atau belum dicatat" });
      }
      case "kehadiran": {
        const rembug = ds.kegiatan.filter((k) => k.jenis === r.jenis && k.tanggal >= awal && k.tanggal <= akhir);
        const lengkapRw = dikonfirmasi("kegiatan_rw", null);
        if (rembug.length === 0) {
          return lengkapRw
            ? hasilFrom(ind, { nilai: 0, status: "lengkap", kelengkapan: 1, catatan: "Tidak ada Rembug RW bulan ini", rincian: { rembug: 0 } })
            : hasilFrom(ind, { nilai: null, status: "menunggu_rw", catatan: "Menunggu data tingkat RW", rincian: { rembug: 0 } });
        }
        const ids = new Set(rembug.map((k) => k.id));
        const catatanHadir = ds.peserta.filter((p) => ids.has(p.kegiatanId) && dalamRt(p.rt, rt));
        const nilai = catatanHadir.reduce((s, p) => s + p.jumlahHadir, 0);
        const rtWajib = rt == null ? Array.from(new Set(rembug.flatMap((k) => k.rtTerlibat))) : [rt];
        const kurang = rembug.length * rtWajib.length - catatanHadir.length;
        if (kurang > 0) {
          return hasilFrom(ind, { nilai: catatanHadir.length ? nilai : null, status: catatanHadir.length ? "sebagian" : "belum_diketahui", rincian: { rembug: rembug.length, catatanHadir: catatanHadir.length }, catatan: "Jumlah hadir belum diisi RT untuk sebagian Rembug RW" });
        }
        return hasilFrom(ind, { nilai, status: "lengkap", kelengkapan: 1, rincian: { rembug: rembug.length } });
      }
      case "usia_sekolah": {
        const [min, max] = BATAS_USIA_SEKOLAH_USULAN[r.jenjang];
        let usulan = 0;
        for (const w of wargaRt) {
          const u = umurTahun(w.tanggalLahir, acuan);
          if (u == null || u < min || u > max) continue;
          if (!r.tidakSekolah) usulan++;
          else if (fakta.pada("warga", w.id, "sekolah_aktif", acuan) === "tidak") usulan++;
        }
        return hasilFrom(ind, { nilai: null, status: "needs_confirmation", rincian: { usulanSementara: usulan, usiaMin: min, usiaMax: max }, catatan: ind.catatan ?? "" });
      }
      case "pengangguran": {
        let usulan = 0;
        for (const w of wargaRt) {
          const u = umurTahun(w.tanggalLahir, acuan);
          if (u == null || u < 15) continue;
          if (fakta.pada("warga", w.id, "status_kerja", acuan) === "mencari_kerja") usulan++;
        }
        return hasilFrom(ind, { nilai: null, status: "needs_confirmation", rincian: { usulanSementara: usulan }, catatan: ind.catatan ?? "" });
      }
      case "frekuensi_mingguan": {
        const dalam = ds.kegiatan.filter((k) => k.jenis === r.jenis && k.tanggal >= awal && k.tanggal <= akhir && (rt == null || k.rtPengelola === rt || k.rtTerlibat.includes(rt)));
        const hari = Number(akhir.slice(8, 10));
        return hasilFrom(ind, { nilai: null, status: "needs_confirmation", rincian: { kegiatanBulanIni: dalam.length, usulanPerMinggu: Math.round((dalam.length / (hari / 7)) * 10) / 10 }, catatan: ind.catatan ?? "" });
      }
    }
  };

  return daftar.map((ind) => {
    const h = hitungSatu(ind);
    if (ind.status === "needs_confirmation" && h.status !== "needs_confirmation") {
      return { ...h, rincian: { ...h.rincian, usulanSementara: h.nilai }, nilai: null, status: "needs_confirmation" as const, catatan: ind.catatan ?? "Definisi menunggu konfirmasi kecamatan" };
    }
    return h;
  });
}

// ---------------------------------------------------------------------------
// Kolom TOTAL
// ---------------------------------------------------------------------------

/**
 * Arti TOTAL untuk indikator stok/kondisi belum ditetapkan kecamatan → dikosongkan.
 * Ubah ke "posisi_akhir" setelah ada konfirmasi resmi.
 */
export const MODE_TOTAL_STOK: "kosong" | "posisi_akhir" = "kosong";

export function hitungTotal(ind: Pick<IndikatorKecamatan, "periode" | "status">, nilaiBulan: (number | null)[]): { nilai: number | null; catatan: string } {
  if (ind.status === "needs_confirmation") return { nilai: null, catatan: "Definisi menunggu konfirmasi" };
  if (ind.periode === "kejadian" || ind.periode === "kehadiran") {
    if (nilaiBulan.length === 0 || nilaiBulan.some((v) => v == null)) return { nilai: null, catatan: "Ada bulan yang belum diketahui" };
    return { nilai: nilaiBulan.reduce<number>((s, v) => s + (v ?? 0), 0), catatan: "Jumlah kejadian seluruh bulan" };
  }
  if (MODE_TOTAL_STOK === "posisi_akhir") {
    const terakhir = nilaiBulan[nilaiBulan.length - 1];
    return { nilai: terakhir ?? null, catatan: "Posisi bulan terakhir" };
  }
  return { nilai: null, catatan: "TOTAL indikator posisi/populasi tidak dijumlahkan antarbulan (menunggu konfirmasi kecamatan)" };
}

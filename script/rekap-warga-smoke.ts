/**
 * Uji murni Rekap Warga (tanpa database):
 *   npx tsx script/rekap-warga-smoke.ts
 *
 * Memastikan nilai efektif (Standar data didahulukan), batas umur per hari ini (lansia 60+),
 * dan jumlah matriks = panjang daftar untuk setiap kategori.
 */
import { terapkanFaktaKk, terapkanFaktaWarga, type FaktaSubjek } from "@shared/warga-efektif";
import { KATEGORI_REKAP, daftarRekap, getKategoriRekap, ringkasanRekap, type KkRekap } from "@shared/rekap-kategori";
import { hitungStatistikWarga, type StatistikWargaSlice } from "@shared/statistik-warga";
import { isWargaPengangguran } from "@shared/pekerjaan-labor";
import { isStatusLamaNaikUsia } from "@shared/warga-data-issues";
import { resolveKategoriUmur } from "@shared/kategori-umur";
import { isoTanggal } from "@shared/wilayah";

let lulus = 0;
let gagal = 0;

function uji(nama: string, fn: () => void) {
  try {
    fn();
    lulus++;
    console.log(`  ok  ${nama}`);
  } catch (e) {
    gagal++;
    console.log(`  GAGAL ${nama}\n        ${(e as Error).message}`);
  }
}

function sama<T>(a: T, b: T, pesan: string) {
  if (a !== b) throw new Error(`${pesan}: dapat ${JSON.stringify(a)}, harap ${JSON.stringify(b)}`);
}

/** Tanggal lahir untuk umur `tahun` yang berulang tahun `geserHari` dari hari ini (0 = hari ini). */
function lahir(tahun: number, geserHari = 0): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - tahun);
  d.setDate(d.getDate() + geserHari);
  return isoTanggal(d);
}

const fakta = (isi: Record<string, string>, perluCek: string[] = []): FaktaSubjek => ({
  terverifikasi: Object.fromEntries(Object.entries(isi).map(([k, nilai]) => [k, { nilai, mulai: "2026-01-01" }])),
  perluCek,
});

let idWarga = 1;
function warga(kkId: number, p: Partial<StatistikWargaSlice> = {}): StatistikWargaSlice {
  return {
    id: idWarga++, kkId, namaLengkap: `Uji ${idWarga}`, nik: `99${String(idWarga).padStart(14, "0")}`, jenisKelamin: "Laki-laki",
    kedudukanKeluarga: "Anak", statusKependudukan: "Aktif", tanggalLahir: lahir(30), pekerjaan: "Karyawan Swasta", statusPekerjaan: "Bekerja", ...p,
  };
}

console.log("Rekap warga — uji murni");

uji("fakta mencari_kerja mengalahkan kolom lama Karyawan", () => {
  const w = terapkanFaktaWarga(warga(1), fakta({ s_pekerjaan: "mencari_kerja" }));
  sama(w.statusPekerjaan, "Mencari Kerja", "status");
  sama(isWargaPengangguran(w), true, "pengangguran");
  sama(w.sumber?.pekerjaan?.asal, "standar", "sumber");
});

uji("fakta perlu_cek tidak dihitung, hanya ditandai", () => {
  const w = terapkanFaktaWarga(warga(1), fakta({}, ["s_pekerjaan"]));
  sama(w.statusPekerjaan, "Bekerja", "status tetap data lama");
  sama(w.perluCek?.includes("s_pekerjaan"), true, "ditandai perlu cek");
});

uji("jabatan lama dipertahankan bila kode standarnya sama", () => {
  const w = terapkanFaktaWarga(warga(1, { pekerjaan: "Karyawan BUMN" }), fakta({ s_pekerjaan: "asn" }));
  sama(w.pekerjaan, "Karyawan BUMN", "jabatan");
});

uji("bansos dari Standar data menimpa kolom penerima_bansos", () => {
  const k = terapkanFaktaKk({ id: 1, rt: 1, penerimaBansos: false }, fakta({ s_bansos: "pkh,bpnt" }));
  sama(k.penerimaBansos, true, "penerima");
  sama(k.bansos?.join(","), "pkh,bpnt", "jenis");
  const tidak = terapkanFaktaKk({ id: 2, rt: 1, penerimaBansos: true, jenisBansos: "PKH" }, fakta({ s_bansos: "tidak_ada" }));
  sama(tidak.penerimaBansos, false, "tidak_ada");
});

uji("ulang tahun ke-60 hari ini = lansia, besok baru 60 = belum", () => {
  sama(resolveKategoriUmur(lahir(60)), "60-64", "hari ini 60");
  sama(resolveKategoriUmur(lahir(60, 1)), "56-59", "besok 60");
  sama(resolveKategoriUmur(lahir(65)), "65+", "65");
  const kk: KkRekap[] = [{ id: 10, rt: 2 }];
  const daftar = daftarRekap(getKategoriRekap("lansia")!, kk, [warga(10, { tanggalLahir: lahir(60) }), warga(10, { tanggalLahir: lahir(60, 1) })], null);
  sama(daftar.length, 1, "jumlah lansia");
});

uji("19+ masih «Pelajar» tanpa kuliah masuk kualitas data; mahasiswa tidak", () => {
  sama(isStatusLamaNaikUsia({ tanggalLahir: lahir(19), pekerjaan: "Pelajar", statusPekerjaan: null }), true, "19 pelajar");
  sama(isStatusLamaNaikUsia({ tanggalLahir: lahir(19), pekerjaan: "Pelajar", statusPekerjaan: null, sedangKuliah: true }), false, "kuliah");
  sama(isStatusLamaNaikUsia({ tanggalLahir: lahir(18), pekerjaan: "Pelajar", statusPekerjaan: null }), false, "18 pelajar");
  sama(isStatusLamaNaikUsia({ tanggalLahir: lahir(8), pekerjaan: "Bimbingan Orang Tua", statusPekerjaan: null }), true, "8 BOT");
  const kk: KkRekap[] = [{ id: 11, rt: 3 }];
  const daftar = daftarRekap(getKategoriRekap("status_tidak_sesuai_umur")!, kk, [warga(11, { tanggalLahir: lahir(20), pekerjaan: "Pelajar", statusPekerjaan: null })], 3);
  sama(daftar.length, 1, "masuk daftar");
});

uji("jumlah matriks = panjang daftar untuk setiap kategori dan RT", () => {
  const kk: KkRekap[] = [
    terapkanFaktaKk({ id: 1, rt: 1, nomorKk: "3277000000000001", alamat: "Gg. A", layakBansos: true }, fakta({ s_penghasilan: "kurang_1jt", s_jamban: "tidak_ada" })),
    terapkanFaktaKk({ id: 2, rt: 2, penerimaBansos: true, jenisBansos: "PKH", alamat: "Gg. B" }, undefined),
    { id: 3, rt: 4, alamat: "Gg. C" },
    { id: 4, rt: 7, alamat: "Luar pemukiman" },
  ];
  const semua = [
    warga(1, { kedudukanKeluarga: "Kepala Keluarga", nomorWhatsapp: "081234567890" }),
    terapkanFaktaWarga(warga(1, { tanggalLahir: lahir(25), jenisKelamin: "Perempuan" }), fakta({ s_pekerjaan: "mencari_kerja", s_hamil: "ya" })),
    warga(1, { tanggalLahir: lahir(3), pekerjaan: "Bimbingan Orang Tua", statusPekerjaan: null }),
    warga(2, { tanggalLahir: lahir(70), pekerjaan: "Pensiunan", statusPekerjaan: "Pensiun", kedudukanKeluarga: "Kepala Keluarga" }),
    warga(3, { tanggalLahir: null, pekerjaan: null, statusPekerjaan: null, nik: "123" }),
    warga(3, { tanggalLahir: lahir(17), pekerjaan: "Pelajar", statusPekerjaan: "Pelajar" }),
    warga(3, { statusKependudukan: "Pindah" }),
    warga(4, { tanggalLahir: lahir(40) }),
  ];
  const r = ringkasanRekap(kk, semua);
  sama(r.totalKk.total, 3, "KK di RT 01–04");
  sama(r.totalWarga.total, 6, "warga aktif di RT 01–04");
  for (const def of KATEGORI_REKAP) {
    const j = r.kategori.find((x) => x.id === def.id)!;
    sama(j.total, daftarRekap(def, kk, semua, null).length, `${def.id} total`);
    for (const rt of r.rt) sama(j.perRt[rt], daftarRekap(def, kk, semua, rt).length, `${def.id} ${rt}`);
  }
  const ambil = (id: string) => r.kategori.find((x) => x.id === id)!.total;
  sama(ambil("pengangguran"), 2, "pengangguran (fakta + usia kosong)");
  sama(ambil("lansia_sendiri"), 1, "lansia sendiri");
  sama(ambil("wajib_ektp"), 1, "umur 17");
  sama(ambil("hamil"), 1, "hamil");
  sama(ambil("kk_bansos"), 1, "bansos");
  sama(ambil("layak_belum_bansos"), 1, "layak belum");
  sama(ambil("jamban_tidak_layak"), 1, "jamban");
  sama(ambil("nik_tidak_valid"), 1, "NIK");
  const daftarPengangguran = daftarRekap(getKategoriRekap("pengangguran")!, kk, semua, 1);
  sama(daftarPengangguran[0].nikSamar?.includes("•"), true, "NIK tersamar");
});

uji("statistik dashboard memakai lansia 60+ dan nilai efektif", () => {
  const kk = [{ id: 20, rt: 1 }];
  const s = hitungStatistikWarga(kk, [
    warga(20, { tanggalLahir: lahir(62) }),
    terapkanFaktaWarga(warga(20), fakta({ s_pekerjaan: "mencari_kerja" })),
  ]);
  sama(s.total.umur.lansia, 1, "lansia");
  sama(s.total.pengangguran, 1, "pengangguran");
});

console.log(`\n${lulus} lulus, ${gagal} gagal`);
if (gagal) process.exit(1);

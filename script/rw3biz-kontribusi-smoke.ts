import assert from "node:assert/strict";
import {
  CHARTER_BIZ,
  TARIF_DEFAULT,
  alokasiKePos,
  dendaRazia,
  hitungCharter,
  hitungDendaPelanggaran,
  hitungSurplusVoucher,
  batasAtasOmzet,
  cariFaktorTarget,
  hitungKontribusiRw3biz,
  nominalTagihan,
  parseTarifKontribusi,
  penyesuaianPeriode,
  turunkanOperasionalMalam,
  type InputKontribusi,
} from "../shared/rw3biz-kontribusi";

const tarif = { ...TARIF_DEFAULT, programMulai: "2026-10" };
let lulus = 0;
function uji(nama: string, fn: () => void) {
  fn();
  lulus++;
  console.log(`ok - ${nama}`);
}

const pemilikRw3 = { peran: "pemilik", asal: "rw3" };
const pemilikLuar = { peran: "pemilik", asal: "luar" };

uji("pedagang keliling omzet kecil kena minimal Rp10.000", () => {
  const h = hitungKontribusiRw3biz({ jenisTempatUsaha: "keliling", rentangOmzet: "lt3", orang: [pemilikLuar] }, tarif);
  assert.equal(h.total, 10_000);
  assert.equal(h.diskonLokalPersen, 0);
});

uji("pekerja lokal 100% dapat diskon 25%, tetap tidak di bawah minimal", () => {
  const h = hitungKontribusiRw3biz({ jenisTempatUsaha: "keliling", rentangOmzet: "lt3", orang: [pemilikRw3] }, tarif);
  assert.equal(h.diskonLokalPersen, 25);
  assert.equal(h.total, 10_000);
});

uji("diskon 15% saat minimal separuh pekerja warga RW 03", () => {
  const h = hitungKontribusiRw3biz(
    {
      jenisTempatUsaha: "toko",
      rentangOmzet: "30_100",
      orang: [pemilikRw3, { peran: "pekerja_tetap", asal: "luar" }],
    },
    tarif,
  );
  assert.equal(h.persenPekerjaRw3, 50);
  assert.equal(h.diskonLokalPersen, 15);
  // 60k dasar + 120k omzet + 2k pegawai + 5k pegawai luar = 187k, diskon 15% = 158.950 -> 159.000
  assert.equal(h.subtotal, 187_000);
  assert.equal(h.total, 159_000);
});

uji("setiap pegawai (bukan pemilik) dihitung Rp2.000, pemilik tidak", () => {
  const h = hitungKontribusiRw3biz(
    {
      jenisTempatUsaha: "toko",
      rentangOmzet: "gt100",
      orang: [
        pemilikLuar,
        { peran: "penanggung_jawab", asal: "luar" },
        { peran: "pekerja_tetap", asal: "rw3" },
        { peran: "pekerja_harian", asal: "rw3" },
        { peran: "pekerja_harian", asal: "luar", isAnak: true },
      ],
    },
    tarif,
  );
  assert.equal(h.jumlahPegawai, 3);
  assert.equal(h.komponen.find((k) => k.kode === "pegawai")?.nominal, 6_000);
  assert.equal(h.komponen.find((k) => k.kode === "pekerja_luar")?.nominal, 5_000);
});

uji("truk tetap ditagih di luar batas omzet kecil", () => {
  const h = hitungKontribusiRw3biz(
    { jenisTempatUsaha: "gudang", rentangOmzet: "lt3", kendaraanTruk: 1, kendaraanKolbak: 1, orang: [pemilikRw3] },
    tarif,
  );
  // dasar terpotong batas omzet kecil 20k, beban jalan 50k + 25k tetap ditambah
  assert.equal(h.bebanJalan, 75_000);
  assert.equal(h.terkenaBatasAtas, true);
  assert.equal(h.total, 95_000);
});

uji("beban jalan tidak kena diskon lokal maupun faktor", () => {
  const h = hitungKontribusiRw3biz(
    { jenisTempatUsaha: "keliling", rentangOmzet: "gt100", kendaraanTrukBesar: 1, orang: [pemilikRw3] },
    { ...tarif, faktorPenyesuaian: 2 },
  );
  // (10k + 250k) × 75% × 2 = 390k, ditambah truk besar 100k
  assert.equal(h.diskonLokalPersen, 25);
  assert.equal(h.total, 490_000);
});

uji("total dengan banyak truk tetap dibatasi maksimal Rp500.000", () => {
  const h = hitungKontribusiRw3biz(
    { jenisTempatUsaha: "gudang", rentangOmzet: "10_30", kendaraanTrukBesar: 6, orang: [pemilikLuar] },
    tarif,
  );
  assert.equal(h.total, 500_000);
  assert.match(h.batasAtasAlasan, /maksimal/);
});

uji("truk besar charter 4×/minggu dihitung per kedatangan, di luar batas omzet", () => {
  const h = hitungKontribusiRw3biz(
    { jenisTempatUsaha: "gudang", rentangOmzet: "lt3", charterTrukBesar: 4, orang: [pemilikRw3] },
    tarif,
  );
  // 4 × 4 minggu × Rp6.000 = 96k (< tarif truk besar milik sendiri 100k)
  assert.equal(h.komponen.find((k) => k.kode === "charterTrukBesar")?.nominal, 96_000);
  assert.equal(h.bebanJalan, 96_000);
  assert.equal(h.total, 20_000 + 96_000);
});

uji("charter setiap hari dibatasi setara unit milik sendiri per 7 kedatangan", () => {
  const c = CHARTER_BIZ.find((x) => x.kode === "charterKolbak")!;
  assert.equal(hitungCharter(2, c, tarif), 12_000);
  assert.equal(hitungCharter(7, c, tarif), 25_000);
  assert.equal(hitungCharter(10, c, tarif), 50_000);
  assert.equal(hitungCharter(0, c, tarif), 0);
});

uji("denda razia = tarif bulanan × pengali", () => {
  assert.equal(dendaRazia("kendaraanTrukBesar", tarif), 100_000);
  assert.equal(dendaRazia("kendaraanKolbak", { ...tarif, dendaRaziaKali: 2 }), 50_000);
});

uji("denda razia naik saat berulang (ke-2 tetap 1×, ke-3 2×, ke-5 3×)", () => {
  assert.equal(dendaRazia("kendaraanTrukBesar", tarif, 2), 100_000);
  assert.equal(dendaRazia("kendaraanTrukBesar", tarif, 3), 200_000);
  assert.equal(dendaRazia("kendaraanTrukBesar", tarif, 5), 300_000);
});

uji("pelanggaran pertama ringan/sedang = teguran, berat langsung denda", () => {
  const a = hitungDendaPelanggaran({ jenis: "sampah_tercecer", tingkat: "sedang", keBerapa: 1 }, tarif);
  assert.equal(a.denda, 0);
  assert.ok(a.teguran);
  const b = hitungDendaPelanggaran({ jenis: "limbah_bau", tingkat: "berat", keBerapa: 1 }, tarif);
  assert.equal(b.denda, 200_000);
});

uji("denda pelanggaran = dasar × tingkat × pengulangan, dibatasi maksimal", () => {
  assert.equal(hitungDendaPelanggaran({ jenis: "sampah_tercecer", tingkat: "sedang", keBerapa: 2 }, tarif).denda, 50_000);
  assert.equal(hitungDendaPelanggaran({ jenis: "ketertiban", tingkat: "ringan", keBerapa: 3 }, tarif).denda, 50_000);
  assert.equal(hitungDendaPelanggaran({ jenis: "kerusakan_fasum", tingkat: "berat", keBerapa: 4 }, tarif).denda, 900_000);
  assert.equal(hitungDendaPelanggaran({ jenis: "kerusakan_fasum", tingkat: "berat", keBerapa: 9 }, tarif).denda, 900_000);
  assert.equal(
    hitungDendaPelanggaran({ jenis: "kerusakan_fasum", tingkat: "berat", keBerapa: 4 }, { ...tarif, dendaMaks: 500_000 }).denda,
    500_000,
  );
  assert.equal(hitungDendaPelanggaran({ jenis: "lainnya", tingkat: "sedang", keBerapa: 2, dasarManual: 75_000 }, tarif).denda, 75_000);
});

uji("surplus di atas target menjadi dana voucher warga", () => {
  assert.deepEqual(hitungSurplusVoucher({ kontribusi: 5_200_000, denda: 300_000, target: 5_000_000 }), {
    terkumpul: 5_500_000,
    surplus: 500_000,
  });
  assert.equal(hitungSurplusVoucher({ kontribusi: 4_000_000, denda: 0, target: 5_000_000 }).surplus, 0);
});

uji("konfigurasi denda tersimpan diparse dengan batas aman", () => {
  const t = parseTarifKontribusi(JSON.stringify({ dendaPengulangan: [1, 99], dendaTingkat: { berat: 3 }, dendaPelanggaran: { sampah_tercecer: 20_000 } }));
  assert.deepEqual(t.dendaPengulangan, [1, 10]);
  assert.equal(t.dendaTingkat.berat, 3);
  assert.equal(t.dendaTingkat.ringan, 0.5);
  assert.equal(t.dendaPelanggaran.sampah_tercecer, 20_000);
  assert.equal(t.dendaPelanggaran.limbah_bau, 100_000);
});

uji("batas 1% omzet melindungi toko omzet 3-10 juta (maks Rp30.000)", () => {
  const h = hitungKontribusiRw3biz(
    { jenisTempatUsaha: "toko", rentangOmzet: "3_10", operasionalMalam: "malam", orang: [pemilikLuar] },
    tarif,
  );
  assert.equal(batasAtasOmzet("3_10", tarif), 30_000);
  assert.equal(h.terkenaBatasAtas, true);
  assert.equal(h.total, 30_000);
});

uji("omzet di bawah 3 juta dibatasi Rp20.000", () => {
  const h = hitungKontribusiRw3biz(
    { jenisTempatUsaha: "gudang", rentangOmzet: "lt3", pakaiBahuJalan: true, orang: [pemilikLuar] },
    tarif,
  );
  assert.equal(h.total, 20_000);
});

uji("usaha besar dibatasi Rp500.000", () => {
  const input: InputKontribusi = {
    jenisTempatUsaha: "gudang",
    rentangOmzet: "gt100",
    luasM2: 500,
    operasionalMalam: "24jam",
    sampahKantongHari: 10,
    pakaiBahuJalan: true,
    kendaraanMotor: 5,
    kendaraanMobil: 10,
    orang: Array.from({ length: 10 }, () => ({ peran: "pekerja_tetap", asal: "luar" })),
  };
  const h = hitungKontribusiRw3biz(input, tarif);
  assert.equal(h.total, 500_000);
  assert.ok(h.terkenaBatasAtas);
});

uji("luas dibatasi maksimal tambahan Rp50.000", () => {
  const h = hitungKontribusiRw3biz(
    { jenisTempatUsaha: "gudang", rentangOmzet: "gt100", luasM2: 1000, orang: [pemilikLuar] },
    tarif,
  );
  assert.equal(h.komponen.find((k) => k.kode === "luas")?.nominal, 50_000);
});

uji("pembulatan ke Rp1.000", () => {
  const h = hitungKontribusiRw3biz(
    { jenisTempatUsaha: "kiosk", rentangOmzet: "10_30", orang: [pemilikRw3, { peran: "pekerja_harian", asal: "luar" }] },
    { ...tarif, faktorPenyesuaian: 1.03 },
  );
  assert.equal(h.total % 1000, 0);
});

uji("jam operasional diturunkan otomatis", () => {
  assert.equal(turunkanOperasionalMalam("07:00", "17:00"), "tidak");
  assert.equal(turunkanOperasionalMalam("16:00", "23:00"), "malam");
  assert.equal(turunkanOperasionalMalam("18:00", "02:00"), "malam");
  assert.equal(turunkanOperasionalMalam("00:00", "00:00"), "24jam");
});

uji("usaha baru gratis bulan pertama, lalu masa transisi 50/50/75", () => {
  const p = (periode: string) =>
    penyesuaianPeriode({
      periode,
      periodeMulaiUsaha: "2026-10",
      usahaBaru: true,
      tahapTransisiMulai: "2026-10",
      tarif,
    }).persenBayar;
  assert.equal(p("2026-10"), 0);
  assert.equal(p("2026-11"), 50);
  assert.equal(p("2026-12"), 75);
  assert.equal(p("2027-01"), 100);
});

uji("keringanan 50% dan bebas sementara sampai tanggal tertentu", () => {
  const setengah = penyesuaianPeriode({
    periode: "2027-03",
    periodeMulaiUsaha: "2026-01",
    usahaBaru: false,
    keringananPersen: 50,
    keringananSampai: "2027-04-30",
    tarif,
  });
  assert.equal(setengah.persenBayar, 50);
  const lewat = penyesuaianPeriode({
    periode: "2027-05",
    periodeMulaiUsaha: "2026-01",
    usahaBaru: false,
    keringananPersen: 100,
    keringananSampai: "2027-04-30",
    tarif,
  });
  assert.equal(lewat.persenBayar, 100);
  assert.equal(nominalTagihan(40_000, 0, 0, tarif), 0);
});

uji("potongan termin 12 bulan 10%", () => {
  assert.equal(nominalTagihan(50_000, 100, 10, tarif), 45_000);
});

uji("alokasi pos anggaran proporsional dan jumlahnya tepat", () => {
  const a = alokasiKePos(45_000, tarif.posAnggaran);
  assert.equal(a.reduce((s, x) => s + x.nominal, 0), 45_000);
  const linmas = a.find((x) => x.id === "linmas_ronda")!;
  assert.ok(linmas.nominal >= 7_200 && linmas.nominal <= 7_201);
  assert.equal(tarif.posAnggaran.reduce((s, x) => s + x.nominal, 0), 5_000_000);
});

uji("parse konfigurasi rusak kembali ke default", () => {
  const t = parseTarifKontribusi("{bukan json");
  assert.equal(t.minimal, 10_000);
  const t2 = parseTarifKontribusi(JSON.stringify({ minimal: 15_000, maksimal: 5_000 }));
  assert.equal(t2.maksimal, 15_000);
});

uji("faktor penyesuaian dicari agar mencapai target", () => {
  const inputs: InputKontribusi[] = Array.from({ length: 70 }, (_, i) => ({
    jenisTempatUsaha: (["toko", "kiosk", "usaha_rumahan", "gudang"] as const)[i % 4],
    rentangOmzet: (["10_30", "30_100", "gt100"] as const)[i % 3],
    orang: [pemilikLuar],
  }));
  const hasil = cariFaktorTarget(inputs, tarif, 5_000_000);
  assert.ok(hasil.tercapai);
  assert.ok(hasil.proyeksi >= 5_000_000);
});

console.log(`\n${lulus} uji lulus`);

export type KependudukanLegacySummary = {
  totalKk: number;
  totalWarga: number;
  jenisKelamin: Record<string, number>;
  kelompokUsia: Record<string, number>;
  pendidikan: Record<string, number>;
  pekerjaan: { name: string; count: number }[];
  pengangguran: {
    total: number;
    perUsia: Record<string, number>;
    daftarNama: { nama: string; usia: number | null; rt: number | null }[];
  };
  bansos: { penerima: number; bukan: number };
  totalDisabilitas: number;
  totalIbuHamil: number;
  totalLayakBansos: number;
  kkEkonomiTerisi: number;
  kategoriEkonomi: Record<string, number>;
  literasi: Record<string, number>;
  statusPekerjaan: Record<string, number>;
  capaian: {
    waPercent: number;
    bansosPercent: number;
    literasiPercent: number;
    iloPercent: number;
    crvsPercent: number;
    wgDetailPercent: number;
  };
  crvs: { anak: number; punyaAkta: number; punyaKia: number; punyaSalahSatu: number };
  peristiwa: {
    aktif: number;
    lahir: number;
    pindahMasuk: number;
    pindahKeluar: number;
    meninggal: number;
    domisiliAktif: number;
  };
  perRt: { rt: number; kk: number; warga: number; bansos: number; lakiLaki: number; perempuan: number }[];
  rtList: number[];
};

export type MonthlySnapshot = {
  month: string;
  totalKk: number;
  totalWarga: number;
  pengangguran: number;
  penerimaBansos: number;
  indeksKemajuan: number;
};

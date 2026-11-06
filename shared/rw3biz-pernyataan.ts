/**
 * Surat Pernyataan / teks sumbangsih RW3BIZ — satu sumber untuk form online, PDF, dan formulir kertas.
 * Acuan: Formulir Sumbangsih Pengusaha RW3BIZ (versi November 2026).
 * Naikkan PERNYATAAN_VERSI setiap kali isi pasal berubah: versi yang disetujui pemohon dicatat di pengajuan.
 */
import { terbilang } from "./surat-sakti/redaksi";

export const PERNYATAAN_VERSI = "SPS-RW3BIZ-2026.11.1";

export type AyatPerwal = { no: string; teks: string; huruf?: readonly string[] };

export const PERWAL_RW = {
  /** Kepala peraturan sesuai naskah resmi. */
  kepala: ["WALI KOTA CIMAHI", "PROVINSI JAWA BARAT", "PERATURAN WALI KOTA CIMAHI", "NOMOR 53 TAHUN 2021", "TENTANG", "PENGATURAN DAN PENETAPAN LEMBAGA KEMASYARAKATAN DI KELURAHAN"],
  judul: "Peraturan Wali Kota Cimahi Nomor 53 Tahun 2021 tentang Pengaturan dan Penetapan Lembaga Kemasyarakatan di Kelurahan",
  singkat: "Perwal Cimahi Nomor 53 Tahun 2021",
  bab: "BAB IX Sumber Pembiayaan dan Administrasi RT atau RW",
  pasal: "Pasal 114",
  ayat: [
    {
      no: "(1)",
      teks: "Sumber pembiayaan RT atau RW dapat diperoleh dari:",
      huruf: [
        "a. swadaya masyarakat;",
        "b. bantuan dari anggaran Kelurahan; dan/atau",
        "c. bantuan lain yang sah dan/atau tidak mengikat sesuai ketentuan peraturan perundang-undangan.",
      ],
    },
    {
      no: "(2)",
      teks: "Besarnya iuran atau sumbangan serta pendapatan lainnya yang sah berikut penggunaannya ditentukan berdasarkan hasil musyawarah RT dan/atau RW yang bersangkutan yang dimuat dalam berita acara musyawarah.",
    },
    { no: "(3)", teks: "Berita acara musyawarah sebagaimana dimaksud pada ayat (2) dilaporkan kepada Lurah." },
    {
      no: "(4)",
      teks: "Pengelolaan keuangan yang diperoleh dari sumber biaya sebagaimana dimaksud pada ayat (1), dapat digunakan untuk biaya operasional, pengadaan sarana dan prasarana masyarakat sesuai dengan kebutuhan/kegiatan RT dan/atau RW yang dapat menunjang kelancaran tugas yang pengaturannya ditetapkan dalam Anggaran Penerimaan dan Pengeluaran RT dan/atau RW.",
    },
  ] as readonly AyatPerwal[],
  /** Bagaimana tiap ayat diterapkan pada sumbangsih RW3BIZ. */
  penerapan: [
    {
      ayat: "Ayat (1) huruf a",
      teks: "Sumbangsih usaha RW3BIZ adalah swadaya masyarakat: diberikan sukarela dan besarnya ditentukan sendiri oleh pengusaha. Bukan pajak, retribusi, atau pungutan wajib.",
    },
    {
      ayat: "Ayat (2)",
      teks: "Daftar program dan anggarannya ditetapkan melalui musyawarah RW 03 dan dimuat dalam berita acara musyawarah — bukan nominal per usaha.",
    },
    { ayat: "Ayat (3)", teks: "Berita acara musyawarah tersebut dilaporkan kepada Lurah Padasuka." },
    {
      ayat: "Ayat (4)",
      teks: "Dana hanya dipakai untuk biaya operasional serta pengadaan sarana dan prasarana masyarakat RW 03 sesuai Anggaran Penerimaan dan Pengeluaran RW 03, dan dilaporkan terbuka setiap bulan.",
    },
  ],
} as const;

/** Bunyi satu ayat dalam satu baris (untuk PDF / teks polos). */
export function teksAyat(a: AyatPerwal): string {
  return [`${a.no} ${a.teks}`, ...(a.huruf ?? [])].join(" ");
}

/** Setor resmi: tunai kepada Bendahara RW 03 (Formulir Sumbangsih Nov 2026). */
export const SETOR_SUMBANGSIH = {
  cara: "tunai",
  penerima: "Bendahara RW 03, Ibu Tini",
  bukti: "kwitansi bernomor",
} as const;

/** Label singkat cara setor untuk UI/cetak. */
export const LABEL_SETOR_SUMBANGSIH = `tunai kepada ${SETOR_SUMBANGSIH.penerima} (langsung terima ${SETOR_SUMBANGSIH.bukti})`;

/** Alias lama — diarahkan ke cara setor baru. */
export const REKENING_SUMBANGSIH = SETOR_SUMBANGSIH;
export const LABEL_REKENING_SUMBANGSIH = LABEL_SETOR_SUMBANGSIH;

/**
 * Manfaat bagi pengusaha (bagian E Formulir Sumbangsih).
 * Dipakai di form online, formulir kertas, dan panel kebutuhan.
 */
export const MANFAAT_SUMBANGSIH: { manfaat: string; untuk: string }[] = [
  { manfaat: "Izin usaha RW3BIZ dan nomor usaha yang bisa dicek online", untuk: "Semua usaha, berapa pun sumbangsihnya" },
  { manfaat: "Keamanan: patroli Linmas, CCTV, nomor darurat Linmas", untuk: "Semua usaha" },
  { manfaat: "Surat pengantar usaha dilayani tanpa biaya", untuk: "Semua usaha" },
  { manfaat: "Tercantum di Peta Usaha RW 03 di rw3padasukacimahi.org", untuk: "Semua usaha yang mendaftar" },
  { manfaat: "Pelatihan jualan online, QRIS, dan bantuan mengurus izin PIRT atau sertifikat halal", untuk: "Semua usaha" },
  { manfaat: "Calon pekerja dari warga RW 03 yang sudah ikut pelatihan", untuk: "Usaha yang mencari karyawan" },
  { manfaat: "Dipromosikan di TikTok dan Instagram RW 03, bergiliran tiap bulan", untuk: "Usaha kontributor (uang atau barang/jasa)" },
  { manfaat: "Menerima voucher belanja warga dan menukarnya penuh ke kas RW", untuk: "Usaha kontributor" },
  { manfaat: "Lapak gratis di bazar 17-an dan acara RW", untuk: "Usaha kontributor" },
  { manfaat: "Laporan dana per program setiap bulan", untuk: "Semua usaha dan warga" },
];

/** Ringkas untuk hero / kotak manfaat. */
export const ALASAN_SUMBANGSIH = MANFAAT_SUMBANGSIH.map(
  (m) => `${m.manfaat} (${m.untuk.toLowerCase()}).`,
);

/**
 * Cara kerja voucher belanja warga (bagian F Formulir Sumbangsih).
 */
export const CARA_KERJA_VOUCHER = [
  "Kelebihan dana program dan sumbangsih untuk program voucher masuk ke kas RW 03.",
  "Kas RW menerbitkan voucher bernomor untuk keluarga prasejahtera yang terdata.",
  "Warga membelanjakan voucher di usaha kontributor untuk kebutuhan pokok. Voucher tidak bisa ditukar uang tunai.",
  "Pengusaha menyerahkan voucher ke kas RW dan dibayar penuh sesuai nilainya, paling lambat 7 hari.",
  "Jumlah voucher yang terbit dan ditukar diumumkan dalam laporan bulanan.",
] as const;

export const ALASAN_VOUCHER =
  "Kenapa voucher, bukan uang tunai? Uang tunai mudah terpakai untuk pinjol, judi online, atau hal lain yang merugikan keluarga. Voucher memastikan bantuan menjadi kebutuhan pokok dan menjadi omzet bagi usaha di RW 03.";

/**
 * Transparansi & anti-oknum (bagian G Formulir Sumbangsih).
 */
export const TRANSPARANSI_SUMBANGSIH = [
  `Sumbangsih diberikan secara tunai kepada ${SETOR_SUMBANGSIH.penerima}, dan Anda langsung menerima ${SETOR_SUMBANGSIH.bukti}.`,
  "Setiap kwitansi tercatat dan bisa dicek online.",
  "Setiap pengeluaran kas disetujui dua orang: Ketua RW dan Bendahara RW.",
  "Penerimaan dan pemakaian dana per program diumumkan setiap bulan di rw3padasukacimahi.org dan grup WhatsApp warga.",
  "Tidak ada petugas lain yang boleh memungut atas nama RW 03. Tolak dan laporkan ke Ketua RW 03 atau Lurah Padasuka.",
  "Tidak ada denda, bunga, atau teguran karena besar kecilnya sumbangsih.",
] as const;

export function teksCaraSetor(_tenggangHari = 0): string {
  return (
    `Sumbangsih disetor secara ${LABEL_SETOR_SUMBANGSIH}. ` +
    "Sumbangsih boleh diubah, dikurangi, atau dihentikan kapan saja lewat WhatsApp sekretariat."
  );
}

export const GARANSI_ANTI_OKNUM =
  `GARANSI: Sumbangsih RW3BIZ hanya disetor ${LABEL_SETOR_SUMBANGSIH}. ` +
  "Tidak ada petugas lain yang boleh memungut atas nama RW 03. Tolak dan laporkan ke Ketua RW 03 atau Lurah Padasuka. Tidak ada denda, bunga, atau teguran karena besar kecilnya sumbangsih.";

/** Empat manfaat paling ringkas — untuk hero & kotak di formulir cetak. */
export const MANFAAT_RINGKAS = [
  "Izin usaha RW3BIZ berlaku berapa pun sumbangsihnya — termasuk Rp0.",
  "Keamanan Linmas & CCTV, surat pengantar tanpa biaya, Peta Usaha online.",
  "Usaha kontributor: promo TikTok/IG, voucher belanja warga, lapak bazar gratis.",
  `Setor tunai ke ${SETOR_SUMBANGSIH.penerima} + kwitansi bernomor — anti-oknum.`,
] as const;

/** Rekognisi singkat untuk usaha kontributor. */
export const REKOGNISI_USAHA_TERTIB =
  "Usaha kontributor (uang atau barang/jasa) berhak dipromosikan bergiliran, menerima voucher belanja warga, dan lapak gratis di bazar 17-an.";

/** Pengantar formulir: sumbangsih seikhlasnya. */
export const PENGANTAR_SUMBANGSIH =
  "Sumbangsih RW3BIZ adalah seikhlasnya, boleh berapa pun, termasuk Rp0. Tidak ada tarif dan tidak ada nominal minimal. Izin usaha RW3BIZ tetap berlaku berapa pun yang Anda isi. Nominal ditentukan sendiri sesuai kemampuan usaha.";

export const ANJURAN_RP0 =
  "Usaha yang sedang sepi, pemilik lansia, penyandang disabilitas, dan keluarga penerima bansos dianjurkan mengisi Rp0.";

/** Ringkas daftar program untuk UI admin, WA, dan panduan. */
export const RINGKASAN_PROGRAM_SUMBANGSIH =
  "Keamanan & CCTV, kebersihan & sampah, solokan, voucher belanja warga, pelatihan UMKM, santunan & darurat, beasiswa, posyandu, pemuda & bazar, penerangan jalan, dan promosi UMKM";

/** Satu kalimat setor resmi — untuk pengingat WA / admin. */
export const RINGKASAN_SETOR_SUMBANGSIH =
  `Setor tunai kepada ${SETOR_SUMBANGSIH.penerima}; Anda langsung menerima ${SETOR_SUMBANGSIH.bukti}. Tidak ada petugas lain yang boleh memungut.`;

export type PasalPernyataan = { judul: string; ayat: string[] };

const rp = (n: number) => `Rp${Math.round(n).toLocaleString("id-ID")}`;
const kosong = "....................";

/** Tanggal setor bulanan: 1 + tenggang (tenggang 0 = setiap tanggal 1). */
export function tanggalSetorBulanan(tenggangHari: number): number {
  return Math.max(1, Math.min(28, 1 + Math.max(0, Math.floor(tenggangHari))));
}

export type DataPernyataan = {
  /** Total sumbangsih per bulan; null = formulir kosong untuk ditulis tangan. */
  total: number | null;
  tenggangHari: number;
  /** Kebutuhan RAB RW 03 per bulan. */
  target: number;
  terminBulan?: number | null;
};

export function pasalPernyataanSumbangsih(d: DataPernyataan): PasalPernyataan[] {
  const total =
    d.total != null ? `${rp(d.total)} (${terbilang(d.total)} rupiah)` : `Rp ${kosong} (sesuai jumlah pada tabel sumbangsih)`;
  const masa = d.terminBulan ? `${d.terminBulan} bulan` : "sesuai masa berlaku yang dipilih";
  return [
    {
      judul: "Pengertian",
      ayat: [
        `Sumbangsih adalah dana swadaya masyarakat yang diberikan PIHAK PERTAMA secara sukarela setiap bulan untuk program RW 03, sebagaimana dimaksud ${PERWAL_RW.pasal} ayat (1) huruf a ${PERWAL_RW.singkat}.`,
        "Sumbangsih seikhlasnya: boleh berapa pun termasuk Rp0, boleh juga dalam bentuk barang/jasa. Tidak ada tarif atau nominal minimal.",
        "Program RW 03 adalah pos kebutuhan dalam Anggaran Penerimaan dan Pengeluaran (RAB) RW 03 yang tercantum pada formulir pendaftaran.",
        "Kas RW 03 adalah kas resmi yang dikelola bendahara RW 03 dan dicatat terbuka di sistem rw3padasukacimahi.org.",
        "Kwitansi resmi adalah bukti setor bernomor (KW/RW03/BIZ/...) yang diterbitkan sistem untuk setiap setoran.",
      ],
    },
    {
      judul: "Dasar Hukum",
      ayat: [
        `${PERWAL_RW.judul}, ${PERWAL_RW.bab}, ${PERWAL_RW.pasal} ayat (1) sampai dengan ayat (4), yang bunyi lengkapnya dimuat pada bagian Dasar Hukum surat pernyataan ini dan menjadi bagian yang tidak terpisahkan dari surat pernyataan ini.`,
        `Berdasarkan ${PERWAL_RW.pasal} ayat (1) huruf a, sumbangsih ini merupakan sumber pembiayaan RW dari swadaya masyarakat, bukan pajak, retribusi, atau pungutan wajib.`,
        `Berdasarkan ${PERWAL_RW.pasal} ayat (2) dan ayat (3), daftar program dan anggarannya ditetapkan melalui musyawarah RW 03 yang dimuat dalam berita acara musyawarah dan dilaporkan kepada Lurah Padasuka. Yang dimusyawarahkan adalah daftar program dan anggarannya, bukan nominal per usaha.`,
        `Berdasarkan ${PERWAL_RW.pasal} ayat (4), dana yang terkumpul hanya digunakan untuk biaya operasional serta pengadaan sarana dan prasarana masyarakat sesuai Anggaran Penerimaan dan Pengeluaran RW 03.`,
        "Tata tertib lingkungan RW 03 dan ketentuan layanan RW3BIZ yang berlaku.",
        "Kesepakatan sukarela PARA PIHAK sebagaimana tertuang dalam surat pernyataan ini.",
      ],
    },
    {
      judul: "Maksud dan Tujuan",
      ayat: [
        "PIHAK PERTAMA menjalankan usaha di wilayah RW 03 dan memperoleh manfaat: izin usaha RW3BIZ, keamanan Linmas & CCTV, surat pengantar tanpa biaya, Peta Usaha online, serta pelatihan UMKM.",
        "Atas dasar itu PIHAK PERTAMA dapat ikut mendukung program RW 03 secara sukarela sesuai kemampuan masing-masing — tanpa kewajiban menanggung bagian tertentu dari anggaran program.",
        "Izin usaha RW3BIZ tetap berlaku berapa pun sumbangsih yang diisi, termasuk Rp0.",
        "Bagi usaha kontributor (uang atau barang/jasa), manfaat tambahan meliputi promosi bergiliran, voucher belanja warga, dan lapak gratis di bazar.",
      ],
    },
    {
      judul: "Besaran dan Peruntukan",
      ayat: [
        `PIHAK PERTAMA menyanggupi sumbangsih sebesar ${total} per bulan, dengan rincian program sebagaimana tercantum dalam tabel sumbangsih (program yang tidak disetujui dikosongkan).`,
        "Besaran sumbangsih ditentukan sendiri oleh PIHAK PERTAMA tanpa paksaan. Tidak ada tarif atau hitungan dari PIHAK KEDUA.",
        "Sumbangsih boleh diubah, dikurangi, atau dihentikan kapan saja lewat WhatsApp sekretariat.",
        "PIHAK KEDUA menggunakan sumbangsih untuk program yang dipilih. Anggaran adalah usulan dan baru berlaku setelah ditetapkan dalam musyawarah RW 03.",
        "Kelebihan dana program dan sumbangsih untuk program voucher masuk ke kas RW dan disalurkan sebagai voucher belanja warga.",
      ],
    },
    {
      judul: "Tata Cara Penyetoran",
      ayat: [
        `Sumbangsih uang disetor secara ${LABEL_SETOR_SUMBANGSIH}.`,
        "Setiap setoran wajib diberi kwitansi resmi. Setoran tanpa kwitansi resmi atau kepada pihak di luar Bendahara RW 03 bukan tanggung jawab PIHAK KEDUA dan tidak dihitung sebagai sumbangsih.",
        "Tidak ada petugas lain yang boleh memungut atas nama RW 03. Tolak dan laporkan ke Ketua RW 03 atau Lurah Padasuka.",
        "PIHAK PERTAMA dapat memeriksa riwayat setoran dan kwitansi kapan saja melalui halaman cek status dengan Nomor Induk Usaha.",
      ],
    },
    {
      judul: "Kewajiban PIHAK PERTAMA",
      ayat: [
        "Memberikan data kontak yang benar (nama dan WhatsApp aktif); tidak perlu fotokopi KTP dan tidak perlu meterai.",
        "Menyetor sumbangsih sesuai Pasal 4 dan Pasal 5 serta menyimpan kwitansi resmi, bila menyumbang uang.",
        "Menjaga kebersihan, ketertiban, dan keamanan lingkungan usaha.",
        "Melaporkan perubahan usaha (pindah, tutup, atau ganti penanggung jawab) paling lambat 14 hari sejak perubahan.",
        "Memperbarui izin usaha beserta surat pernyataan ini sebelum masa berlakunya habis.",
      ],
    },
    {
      judul: "Kewajiban PIHAK KEDUA",
      ayat: [
        "Menerbitkan kwitansi resmi untuk setiap setoran dan mencatatnya di Kas RW 03.",
        `Menetapkan daftar program dan anggarannya melalui musyawarah RW 03 yang dimuat dalam berita acara musyawarah, sesuai ${PERWAL_RW.pasal} ayat (2) ${PERWAL_RW.singkat}.`,
        `Melaporkan berita acara musyawarah tersebut kepada Lurah Padasuka, sesuai ${PERWAL_RW.pasal} ayat (3).`,
        `Menggunakan dana hanya untuk biaya operasional serta pengadaan sarana dan prasarana masyarakat sesuai Anggaran Penerimaan dan Pengeluaran RW 03, sesuai ${PERWAL_RW.pasal} ayat (4).`,
        "Setiap pengeluaran kas disetujui dua orang: Ketua RW dan Bendahara RW.",
        "Mengumumkan laporan penerimaan dan pemakaian dana per program setiap bulan secara terbuka di rw3padasukacimahi.org dan grup WhatsApp warga.",
        "Memberikan pelayanan administrasi kepada PIHAK PERTAMA tanpa pungutan tambahan.",
        "Menjaga kerahasiaan data pribadi PIHAK PERTAMA.",
      ],
    },
    {
      judul: "Hak PIHAK PERTAMA",
      ayat: [
        "Menerima Surat Izin Usaha RW 03 dan Nomor Induk Usaha yang dapat dicek online, berapa pun sumbangsihnya termasuk Rp0.",
        "Memperoleh manfaat lingkungan (keamanan, kebersihan, jalan, penerangan) serta laporan terbuka penggunaan dana.",
        "Mengubah, mengurangi, atau menghentikan sumbangsih kapan saja lewat WhatsApp sekretariat.",
        "Sebagai usaha kontributor: menerima voucher belanja warga dan menukarkannya ke Kas RW 03 senilai penuh paling lambat 7 hari.",
        "Menolak setiap permintaan uang dari oknum atau pihak di luar Bendahara RW 03 / Ketua RW 03 yang mengaku mewakili RW / RW3BIZ.",
        "Mengajukan keberatan atau aduan atas pelayanan maupun dugaan penyimpangan dana.",
      ],
    },
    {
      judul: "Larangan Pungutan di Luar Ketentuan & Garansi Anti-Oknum",
      ayat: [
        "Ketua RW 03 dan bendahara dilarang memungut atau meminta uang dari PIHAK PERTAMA di luar sumbangsih yang tercatat dengan kwitansi.",
        "Siapa pun di luar kepengurusan resmi RW 03 tidak berwenang meminta uang, barang, atau jasa atas nama RW 03 atau RW3BIZ.",
        "PIHAK PERTAMA berhak dan dianjurkan menolak pungutan tanpa kwitansi resmi, dan melaporkannya segera kepada Ketua RW 03 atau Lurah Padasuka.",
        "Tidak ada denda, bunga, atau teguran karena besar kecilnya sumbangsih.",
        "Pembayaran kepada oknum tanpa kwitansi resmi tidak diakui sebagai sumbangsih.",
      ],
    },
    {
      judul: "Perubahan dan Penghentian",
      ayat: [
        "Besaran sumbangsih dapat diubah, dikurangi, atau dihentikan kapan saja lewat WhatsApp sekretariat, dan berlaku mulai bulan berikutnya.",
        "Usaha yang sedang sepi, pemilik lansia, penyandang disabilitas, dan keluarga penerima bansos dianjurkan mengisi Rp0.",
        "Bila usaha tutup atau pindah, PIHAK PERTAMA memberitahukan PIHAK KEDUA. Sumbangsih yang telah disetor tidak dapat ditarik kembali.",
      ],
    },
    {
      judul: "Keterlambatan",
      ayat: [
        "Tidak ada bunga, denda, atau biaya tambahan atas keterlambatan penyetoran sumbangsih.",
        "PIHAK KEDUA dapat mengingatkan melalui nomor WhatsApp yang terdaftar.",
      ],
    },
    {
      judul: "Ketertiban Lingkungan",
      ayat: [
        "Pelanggaran tata tertib lingkungan yang terbukti dari aduan warga atau temuan Ketua RW / Linmas ditangani melalui teguran resmi bertingkat (teguran lisan, Surat Peringatan SP-1 sampai SP-3) tanpa denda uang.",
        "Teguran tidak berkaitan dengan besar kecilnya sumbangsih.",
      ],
    },
    {
      judul: "Data Pribadi",
      ayat: [
        "Cukup data kontak. Tidak perlu fotokopi KTP dan tidak perlu meterai.",
        "Data PIHAK PERTAMA hanya dipakai untuk pelayanan dan pendataan RW 03, dan tidak diberikan kepada pihak lain kecuali diwajibkan peraturan perundang-undangan.",
        "Nomor WhatsApp disamarkan pada dokumen yang dapat diakses umum.",
      ],
    },
    {
      judul: "Jangka Waktu",
      ayat: [
        `Surat pernyataan ini berlaku sejak disetujui Ketua RW 03 selama masa izin ${masa}, dan diperbarui setiap kali izin diperpanjang dengan besaran terbaru.`,
        "Surat pernyataan berakhir bila usaha tutup atau pindah dan telah diberitahukan, atau bila izin usaha tidak diperpanjang.",
      ],
    },
    {
      judul: "Penyelesaian Perselisihan",
      ayat: [
        "Perselisihan diselesaikan secara musyawarah untuk mufakat.",
        "Bila musyawarah tidak mencapai kesepakatan, PARA PIHAK sepakat meminta mediasi Lurah Padasuka.",
      ],
    },
    {
      judul: "Persetujuan Elektronik",
      ayat: [
        "Persetujuan melalui formulir online (mencentang seluruh pernyataan persetujuan) atau tanda tangan pada formulir kertas dianggap sebagai tanda persetujuan yang sah dari PIHAK PERTAMA.",
        "Sistem mencatat versi surat pernyataan, waktu persetujuan, dan nomor pengajuan sebagai bukti persetujuan.",
        "PIHAK PERTAMA dapat mengunduh salinan surat pernyataan ini kapan saja melalui halaman cek status.",
      ],
    },
    {
      judul: "Penutup",
      ayat: [
        "Saya mengisi formulir ini dengan sukarela dan tanpa paksaan. Saya memahami bahwa nominal sumbangsih saya tentukan sendiri, dapat saya ubah kapan saja, dan tidak memengaruhi izin usaha saya.",
        "Hal-hal yang belum diatur akan ditetapkan kemudian melalui musyawarah PARA PIHAK.",
      ],
    },
  ];
}

/** Poin yang wajib dicentang satu per satu sebelum mengirim. */
export function poinPersetujuan(d: { total: number; tenggangHari: number }): string[] {
  const nominal =
    d.total > 0
      ? `Saya menyanggupi sumbangsih sukarela ${rp(d.total)} per bulan, disetor ${LABEL_SETOR_SUMBANGSIH}.`
      : "Saya belum bisa menyumbang uang sekarang; saya memahami izin usaha RW3BIZ tetap berlaku.";
  return [
    PENGANTAR_SUMBANGSIH,
    nominal,
    `Saya mengerti cara setor resmi: hanya ${LABEL_SETOR_SUMBANGSIH}. Petugas lain yang memungut atas nama RW 03 wajib ditolak dan dilaporkan.`,
    `Saya telah membaca bunyi lengkap ${PERWAL_RW.pasal} ${PERWAL_RW.judul}, dan memahami bahwa sumbangsih ini adalah swadaya masyarakat — bukan pajak, retribusi, atau pungutan wajib.`,
    "Saya mengisi formulir ini dengan sukarela dan tanpa paksaan. Nominal sumbangsih saya tentukan sendiri, dapat saya ubah kapan saja, dan tidak memengaruhi izin usaha saya.",
    "Saya menyetujui seluruh pasal Surat Pernyataan Sumbangsih serta tata tertib lingkungan RW 03, dan persetujuan ini sah sebagai tanda tangan saya.",
  ];
}

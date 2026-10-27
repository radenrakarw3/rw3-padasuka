/**
 * Surat Pernyataan Sumbangsih RW3BIZ — satu sumber teks untuk form online, PDF, dan formulir kertas.
 * Naikkan PERNYATAAN_VERSI setiap kali isi pasal berubah: versi yang disetujui pemohon dicatat di pengajuan.
 */
import { terbilang } from "./surat-sakti/redaksi";

export const PERNYATAAN_VERSI = "SPS-RW3BIZ-2026.10.2";

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
      teks: "Kebutuhan RW 03 (RAB) beserta penggunaannya ditetapkan melalui musyawarah RW 03 dan dimuat dalam berita acara musyawarah.",
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

/** Alasan singkat mengapa usaha ikut menanggung kebutuhan lingkungan. */
export const ALASAN_SUMBANGSIH = [
  "Usaha Anda ikut dijaga Linmas saat ronda malam, dan jalannya dilewati pembeli, kurir, serta kendaraan barang.",
  "Sampah usaha, selokan, dan lampu jalan di sekitar tempat usaha dirawat dari kas RW.",
  "Surat izin, survey, data, dan sistem online RW 03 berjalan dari biaya administrasi yang sama.",
  "Dana sosial & darurat menolong warga — termasuk pelanggan dan pegawai Anda — saat sakit, duka, atau bencana.",
  "Uang tidak hilang: setiap setoran berkwitansi, laporannya terbuka per program, dan kelebihannya kembali sebagai voucher belanja di usaha RW3BIZ.",
];

export type PasalPernyataan = { judul: string; ayat: string[] };

const rp = (n: number) => `Rp${Math.round(n).toLocaleString("id-ID")}`;
const kosong = "....................";

export type DataPernyataan = {
  /** Total sumbangsih per bulan; null = formulir kosong untuk ditulis tangan. */
  total: number | null;
  tenggangHari: number;
  /** Kebutuhan RAB RW 03 per bulan. */
  target: number;
  terminBulan?: number | null;
};

export function pasalPernyataanSumbangsih(d: DataPernyataan): PasalPernyataan[] {
  const tglSetor = 1 + d.tenggangHari;
  const total =
    d.total != null ? `${rp(d.total)} (${terbilang(d.total)} rupiah)` : `Rp ${kosong} (sesuai jumlah pada tabel sumbangsih)`;
  const masa = d.terminBulan ? `${d.terminBulan} bulan` : "sesuai masa berlaku yang dipilih";
  return [
    {
      judul: "Pengertian",
      ayat: [
        `Sumbangsih adalah dana swadaya masyarakat yang diberikan PIHAK PERTAMA secara sukarela setiap bulan untuk program RW 03, sebagaimana dimaksud ${PERWAL_RW.pasal} ayat (1) huruf a ${PERWAL_RW.singkat}.`,
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
        `Berdasarkan ${PERWAL_RW.pasal} ayat (2) dan ayat (3), besaran kebutuhan RW 03 berikut penggunaannya ditetapkan melalui musyawarah RW 03 yang dimuat dalam berita acara musyawarah dan dilaporkan kepada Lurah Padasuka.`,
        `Berdasarkan ${PERWAL_RW.pasal} ayat (4), dana yang terkumpul hanya digunakan untuk biaya operasional serta pengadaan sarana dan prasarana masyarakat sesuai Anggaran Penerimaan dan Pengeluaran RW 03.`,
        "Tata tertib lingkungan RW 03 dan ketentuan layanan RW3BIZ yang berlaku.",
        "Kesepakatan sukarela PARA PIHAK sebagaimana tertuang dalam surat pernyataan ini.",
      ],
    },
    {
      judul: "Maksud dan Tujuan",
      ayat: [
        "PIHAK PERTAMA menjalankan usaha di wilayah RW 03 dan ikut memanfaatkan keamanan, kebersihan, jalan, penerangan, serta layanan administrasi lingkungan.",
        `Atas dasar itu PIHAK PERTAMA ikut menanggung kebutuhan bersama RW 03 sebesar ${rp(d.target)} per bulan (${rp(d.target * 12)} per tahun) secara gotong royong dan sesuai kemampuan.`,
      ],
    },
    {
      judul: "Besaran dan Peruntukan",
      ayat: [
        `PIHAK PERTAMA menyanggupi sumbangsih sebesar ${total} per bulan, dengan rincian program sebagaimana tercantum dalam tabel sumbangsih.`,
        "Besaran sumbangsih ditentukan sendiri oleh PIHAK PERTAMA tanpa paksaan. Tidak ada tarif atau hitungan dari PIHAK KEDUA.",
        "PIHAK KEDUA menggunakan sumbangsih untuk program yang dipilih. Bila kebutuhan program tersebut telah terpenuhi pada bulan berjalan, kelebihannya digunakan untuk program lain dalam RAB RW 03 dan dilaporkan terbuka.",
        "Kelebihan dana di atas kebutuhan RAB bulanan dikembalikan kepada warga dalam bentuk voucher belanja yang hanya berlaku di usaha RW3BIZ yang tertib.",
      ],
    },
    {
      judul: "Tata Cara Penyetoran",
      ayat: [
        `Sumbangsih disetor setiap bulan paling lambat tanggal ${tglSetor}, mulai bulan izin usaha berlaku.`,
        "Sumbangsih hanya disetor kepada bendahara atau pengurus RW 03 yang ditunjuk dan wajib diberi kwitansi resmi. Setoran tanpa kwitansi resmi bukan tanggung jawab PIHAK KEDUA.",
        "Sumbangsih boleh dicicil dalam bulan berjalan dan boleh dibayar beberapa bulan di muka.",
        "PIHAK PERTAMA dapat memeriksa riwayat setoran dan kwitansi kapan saja melalui halaman cek status dengan Nomor Induk Usaha.",
      ],
    },
    {
      judul: "Kewajiban PIHAK PERTAMA",
      ayat: [
        "Memberikan data yang benar mengenai identitas, usaha, dan kendaraan operasional, serta bersedia disurvey.",
        "Menyetor sumbangsih sesuai Pasal 4 dan Pasal 5 serta menyimpan kwitansi resmi.",
        "Menjaga kebersihan, ketertiban, dan keamanan; tidak memakai bahu jalan atau fasilitas umum tanpa izin; dan tidak merusak fasilitas umum.",
        "Melaporkan perubahan usaha (pindah, tutup, ganti penanggung jawab, atau perubahan kendaraan operasional) paling lambat 14 hari sejak perubahan.",
        "Memperbarui izin usaha beserta surat pernyataan ini sebelum masa berlakunya habis.",
      ],
    },
    {
      judul: "Kewajiban PIHAK KEDUA",
      ayat: [
        "Menerbitkan kwitansi resmi untuk setiap setoran dan mencatatnya di Kas RW 03.",
        `Menetapkan RAB RW 03 dan penggunaannya melalui musyawarah RW 03 yang dimuat dalam berita acara musyawarah, sesuai ${PERWAL_RW.pasal} ayat (2) ${PERWAL_RW.singkat}.`,
        `Melaporkan berita acara musyawarah tersebut kepada Lurah Padasuka, sesuai ${PERWAL_RW.pasal} ayat (3).`,
        `Menggunakan dana hanya untuk biaya operasional serta pengadaan sarana dan prasarana masyarakat sesuai Anggaran Penerimaan dan Pengeluaran RW 03, sesuai ${PERWAL_RW.pasal} ayat (4).`,
        "Mengumumkan laporan penerimaan dan pemakaian dana per program setiap bulan secara terbuka di rw3padasukacimahi.org/rw3biz/panduan.",
        "Memberikan pelayanan administrasi kepada PIHAK PERTAMA tanpa pungutan tambahan.",
        "Menjaga kerahasiaan data pribadi PIHAK PERTAMA.",
      ],
    },
    {
      judul: "Hak PIHAK PERTAMA",
      ayat: [
        "Menerima Surat Izin Usaha RW 03 dan Nomor Induk Usaha.",
        "Memperoleh laporan terbuka penggunaan dana.",
        "Mengajukan perubahan besaran, keringanan, atau penghentian sementara sebagaimana Pasal 10.",
        "Menerima voucher belanja warga di tempat usahanya dan menukarkannya ke Kas RW 03 senilai penuh, selama tertib menyetor.",
        "Mengajukan keberatan atau aduan atas pelayanan maupun dugaan penyimpangan dana.",
      ],
    },
    {
      judul: "Larangan Pungutan di Luar Ketentuan",
      ayat: [
        "Pengurus RW 03 dilarang memungut atau meminta uang dari PIHAK PERTAMA di luar sumbangsih dan denda resmi yang tercatat dengan kwitansi.",
        "PIHAK PERTAMA berhak menolak pungutan tanpa kwitansi resmi dan melaporkannya kepada Ketua RW 03 atau Lurah Padasuka.",
      ],
    },
    {
      judul: "Perubahan, Keringanan, dan Penghentian",
      ayat: [
        "Besaran sumbangsih dapat diubah saat memperbarui izin, atau sewaktu-waktu melalui pengajuan di halaman cek status, dan berlaku mulai bulan berikutnya setelah disetujui.",
        "PIHAK PERTAMA yang usahanya sedang sepi, lansia, penyandang disabilitas, atau keluarga penerima bansos dapat diberi keringanan sementara sebesar 50% atau 100%.",
        "Bila usaha tutup atau pindah, PIHAK PERTAMA memberitahukan PIHAK KEDUA dan kewajiban berhenti mulai bulan berikutnya. Sumbangsih yang telah disetor tidak dapat ditarik kembali.",
      ],
    },
    {
      judul: "Keterlambatan",
      ayat: [
        "Tidak ada bunga, denda, atau biaya tambahan atas keterlambatan penyetoran sumbangsih.",
        "PIHAK KEDUA dapat mengingatkan melalui nomor WhatsApp yang terdaftar.",
        "Tunggakan tetap tercatat. Selama ada tunggakan, usaha tidak dapat menerima voucher belanja warga, kecuali telah diberi keringanan.",
        "Tunggakan lebih dari 3 bulan tanpa pemberitahuan dibicarakan secara musyawarah dengan PIHAK PERTAMA sebelum izin diperpanjang.",
      ],
    },
    {
      judul: "Ketertiban Lingkungan",
      ayat: [
        "Pelanggaran tata tertib lingkungan (sampah tercecer, kebisingan, parkir menghalangi jalan, limbah atau bau, melanggar jam operasional, merusak fasilitas umum, atau data tidak sesuai) yang terbukti dari aduan warga atau temuan petugas dikenai teguran tertulis dan/atau denda sesuai ketentuan RW3BIZ, dengan kwitansi resmi.",
        "Kendaraan menuju tempat usaha yang tidak terdaftar saat razia dapat dikenai denda sesuai ketentuan RW3BIZ.",
        "Teguran dan denda tidak berkaitan dengan besar kecilnya sumbangsih.",
      ],
    },
    {
      judul: "Data Pribadi",
      ayat: [
        "Data PIHAK PERTAMA hanya dipakai untuk pelayanan dan pendataan RW 03, dan tidak diberikan kepada pihak lain kecuali diwajibkan peraturan perundang-undangan.",
        "NIK dan nomor WhatsApp disamarkan pada dokumen yang dapat diakses umum.",
      ],
    },
    {
      judul: "Jangka Waktu",
      ayat: [
        `Surat pernyataan ini berlaku sejak disetujui pengurus selama masa izin ${masa}, dan diperbarui setiap kali izin diperpanjang dengan besaran terbaru.`,
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
        "Surat pernyataan ini dibuat dengan sadar, tanpa paksaan dari pihak mana pun, setelah PIHAK PERTAMA membaca dan memahami seluruh isinya.",
        "Hal-hal yang belum diatur akan ditetapkan kemudian melalui musyawarah PARA PIHAK.",
      ],
    },
  ];
}

/** Poin yang wajib dicentang satu per satu sebelum mengirim (gaya persetujuan aplikasi keuangan). */
export function poinPersetujuan(d: { total: number; tenggangHari: number }): string[] {
  return [
    `Saya menyumbang secara sukarela ${rp(d.total)} per bulan untuk program RW 03 yang saya pilih, tanpa paksaan.`,
    `Saya akan menyetor setiap bulan paling lambat tanggal ${1 + d.tenggangHari} hanya kepada pengurus RW 03 dan meminta kwitansi resmi.`,
    `Saya telah membaca bunyi lengkap ${PERWAL_RW.pasal} ${PERWAL_RW.judul}, dan memahami bahwa sumbangsih ini adalah swadaya masyarakat yang dipakai sesuai Anggaran Penerimaan dan Pengeluaran RW 03.`,
    "Saya menyetujui seluruh pasal Surat Pernyataan Sumbangsih serta tata tertib lingkungan RW 03, dan persetujuan ini sah sebagai tanda tangan saya.",
  ];
}

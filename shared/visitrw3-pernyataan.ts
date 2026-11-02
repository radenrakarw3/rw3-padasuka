/**
 * Surat Pernyataan Kesepakatan Tata Tertib Bermasyarakat Visit RW3 —
 * fokus ketertiban wilayah (bukan kontribusi). Dipakai formulir kertas halaman 2.
 * Naikkan PERNYATAAN_TINGGAL_VERSI bila isi pasal berubah.
 */

export const PERNYATAAN_TINGGAL_VERSI = "SPT-VISITRW3-2026.11.2";

export type PasalPernyataanTinggal = {
  judul: string;
  ayat: readonly string[];
};

/** Kewajiban bermasyarakat di wilayah RW 03. */
export const POIN_TATA_TERTIB = [
  "Menghormati norma, adat, dan nilai bermasyarakat yang berlaku di lingkungan RT/RW 03 Padasuka.",
  "Menjaga ketertiban, ketenteraman, kebersihan, dan kenyamanan tetangga serta fasilitas umum.",
  "Bersikap sopan kepada warga, pengurus RT/RW, dan petugas yang bertugas di wilayah.",
  "Membuang sampah pada tempatnya dan tidak mencemari saluran air / selokan.",
  "Memarkir kendaraan dengan tertib; tidak menghalangi jalan, gang, atau akses tetangga.",
  "Mengendalikan suara (musik, karaoke, percakapan) agar tidak mengganggu tetangga, terutama malam hari.",
  "Menerima tamu dengan wajar; tidak menyelenggarakan keramaian yang mengganggu tanpa sepengetahuan pengurus setempat.",
  "Melapor kepada pengurus RT/RW bila pindah, berhenti tinggal, atau ada penambahan penghuni di unit yang sama.",
  "Bersedia dihubungi dan hadir bila dipanggil pengurus terkait laporan warga atau dugaan pelanggaran.",
] as const;

/**
 * Larangan — ditonjolkan perbuatan yang sering jadi sumber masalah di kost/kontrakan
 * (asusila, narkoba, keributan, dll.) agar ada dasar kesepakatan tertulis saat kejadian.
 */
export const POIN_LARANGAN = [
  "Melakukan perbuatan asusila, pencabulan, prostitusi / transaksi seksual, atau menyediakan tempat untuk kegiatan tersebut.",
  "Membawa dan menginapkan lawan jenis yang bukan suami/istri/keluarga sah di unit tinggal, apabila melanggar ketentuan pemilik unit atau mengganggu ketertiban tetangga.",
  "Menyimpan, mengedarkan, memakai, atau memfasilitasi narkotika, psikotropika, dan zat terlarang lainnya.",
  "Berjudi dalam bentuk apa pun di lokasi tinggal atau lingkungan RW.",
  "Mengonsumsi minuman beralkohol berlebihan hingga menimbulkan keributan, mabuk di muka umum, atau mengganggu tetangga.",
  "Melakukan kekerasan, ancaman, intimidasi, perundungan, atau perbuatan yang meresahkan warga.",
  "Membuat keributan, pesta, atau kebisingan yang mengganggu ketenteraman lingkungan.",
  "Menyebarkan ujaran kebencian, fitnah, atau konten yang merusak kerukunan warga.",
  "Menyelenggarakan kegiatan ilegal atau usaha tanpa izin yang merugikan / mengganggu warga.",
  "Memalsukan data pada formulir atau dokumen terkait izin tinggal di RW 03.",
] as const;

export function pasalPernyataanTinggal(): PasalPernyataanTinggal[] {
  return [
    {
      judul: "Kesepakatan bermasyarakat",
      ayat: [
        "Sebagai penghuni / penanggung jawab yang tinggal di wilayah RW 03, saya menyatakan memahami bahwa tinggal di lingkungan warga membawa kewajiban mengikuti aturan wilayah setempat.",
        "Saya sepakat mematuhi tata tertib bermasyarakat RW 03 Kelurahan Padasuka, Kecamatan Cimahi Tengah, Kota Cimahi, termasuk:",
        ...POIN_TATA_TERTIB,
      ],
    },
    {
      judul: "Larangan",
      ayat: [
        "Saya sepakat tidak melakukan, tidak memfasilitasi, dan tidak membiarkan di unit tinggal saya perbuatan yang dilarang di lingkungan RW 03, termasuk tetapi tidak terbatas pada:",
        ...POIN_LARANGAN,
      ],
    },
    {
      judul: "Pengendalian & akibat pelanggaran",
      ayat: [
        "Surat pernyataan ini merupakan kesepakatan tertulis. Jika terjadi kejadian atau laporan warga yang berkaitan dengan poin di atas, pengurus RT/RW berwenang memanggil, menegur, mencatat, dan menindak sesuai tata tertib serta peraturan perundang-undangan.",
        "Saya bertanggung jawab atas perilaku sendiri dan anggota penghuni yang saya cantumkan / bawa di unit tinggal terkait kepatuhan terhadap tata tertib dan larangan ini.",
        "Pelanggaran dapat berakibat teguran lisan/tertulis, mediasi, pencabutan izin tinggal Visit RW3, pelaporan kepada pihak berwenang, dan/atau tindakan lain sesuai kewenangan pengurus RW.",
        "Saya tidak akan menghalangi proses klarifikasi atau penindakan yang sah terkait dugaan pelanggaran atas kesepakatan ini.",
      ],
    },
  ];
}

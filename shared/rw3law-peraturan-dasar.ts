/**
 * Peraturan dasar tingkat RW 03 Padasuka — rancangan standar komunitas perkotaan Indonesia.
 * Format isi: MENIMBANG, PASAL N — Judul, ayat bernomor (sama dengan editor RW3LAW).
 */

import { canonicalizeRw3lawIsi } from "./rw3law-structured";

export type Rw3lawPeraturanSeed = {
  judul: string;
  slug: string;
  kategori: "ketertiban" | "lingkungan" | "keamanan" | "umum";
  versi: string;
  tanggalBerlaku: string;
  urutan: number;
  rtAsal?: number | null;
  isi: string;
};

const RW3LAW_PERATURAN_DASAR_RAW: Rw3lawPeraturanSeed[] = [
  {
    judul: "Peraturan Ketua RW 03 Padasuka Nomor 1 Tahun 2026 tentang Ketertiban dan Keharmonisan Warga",
    slug: "peraturan-ketertiban-keharmonisan",
    kategori: "ketertiban",
    versi: "1.0",
    tanggalBerlaku: "2026-06-01",
    urutan: 1,
    isi: `MENIMBANG Rukun Warga 03 Kelurahan Padasuka berwenang mengatur ketertiban dan kehidupan bermasyarakat di wilayahnya sesuai musyawarah dan peraturan yang berlaku; dan

MENIMBANG terciptanya lingkungan yang aman, tertib, dan saling menghormati merupakan kepentingan bersama seluruh warga;

PASAL 1 — Asas dan Ruang Lingkup

1. Peraturan ini berlaku bagi seluruh warga dan unit hunian di wilayah RW 03 Padasuka, meliputi RT 01 sampai RT 04.
2. Setiap warga wajib menjunjung tinggi norma kesopanan, toleransi, dan gotong royong.
3. Keputusan musyawarah RW dan RT yang telah disepakati wajib dihormati oleh warga yang bersangkutan.

PASAL 2 — Ketertiban Umum

1. Warga dilarang melakukan perbuatan yang mengganggu ketenteraman, termasuk cekcok, ancaman, atau pelecehan di ruang publik lingkungan.
2. Penggunaan pengeras suara, karaoke, atau kegiatan hiburan di area pemukiman dibatasi pukul 22.00–05.00 WIB, kecuali kegiatan resmi RW/RT yang diumumkan sebelumnya.
3. Anak di bawah pengawasan orang tua dilarang merusak fasilitas umum, menimbulkan kegaduhan, atau berkumpul hingga larut malam tanpa izin orang tua.

PASAL 3 — Penyelesaian Perselisihan

1. Perselisihan antarwarga diutamakan diselesaikan melalui musyawarah di tingkat RT terlebih dahulu.
2. Apabila tidak tercapai kesepakatan, perkara dapat dinaikkan ke musyawarah RW dengan hadir ketua RT terkait.
3. Pengurus RW mencatat hasil musyawarah dan menindaklanjuti sesuai kesepakatan atau rujukan ke pihak berwenang apabila diperlukan.

PASAL 4 — Ketentuan Penutup

1. Peraturan ini mulai berlaku pada tanggal ditetapkan dan diumumkan melalui saluran resmi RW.
2. Perubahan hanya dapat dilakukan melalui mekanisme pembahasan dan persetujuan pengurus RW.`,
  },
  {
    judul: "Peraturan Ketua RW 03 Padasuka Nomor 2 Tahun 2026 tentang Kebersihan dan Pengelolaan Lingkungan",
    slug: "peraturan-kebersihan-lingkungan",
    kategori: "lingkungan",
    versi: "1.0",
    tanggalBerlaku: "2026-06-01",
    urutan: 2,
    isi: `MENIMBANG kebersihan lingkungan berkaitan langsung dengan kesehatan dan kenyamanan warga; dan

MENIMBANG pengelolaan sampah dan drainase perlu dilakukan secara disiplin di tingkat RT dan RW;

PASAL 1 — Kebersihan Halaman dan Jalan Lingkungan

1. Setiap KK wajib menjaga kebersihan halaman rumah, selokan depan rumah, dan tidak menumpuk sampah di pinggir jalan.
2. Dilarang membuang sampah, sampah organik, atau limbah bangunan ke selokan, badan jalan, atau lahan kosong lingkungan.
3. Pohon atau tanaman yang mengganggu jalur pejalan kaki, pandangan lalu lintas, atau jaringan listrik wajib dipangkas oleh pemilik.

PASAL 2 — Pengelolaan Sampah

1. Warga wajib memilah sampah rumah tangga (organik dan anorganik) sesuai kebijakan RT masing-masing.
2. Pengangkutan sampah mengikuti jadwal dan titik pengumpulan yang ditetapkan RT; dilarang membakar sampah di area pemukiman.
3. Limbah B3 skala rumah tangga (baterai, lampu, obat kadaluarsa) diserahkan pada kegiatan pengumpulan yang diinformasikan RW/RT.

PASAL 3 — Kerja Bakti Lingkungan

1. Kerja bakti lingkungan diselenggarakan minimal sesuai jadwal RT; keikutsertaan warga dihimbau penuh.
2. Ketua RT mencatat kehadiran dan menindaklanjuti warga yang berulang kali tidak berpartisipasi tanpa alasan yang wajar.
3. Pengurus RW dapat mengkoordinasikan kerja bakti berskala RW untuk saluran utama, trotoar, atau fasilitas bersama.

PASAL 4 — Air dan Drainase

1. Warga dilarang membuang minyak, bahan kimia, atau limbah yang mencemari air ke selokan dan saluran drainase.
2. Penambahan atau perubahan saluran air yang memengaruhi aliran tetangga wajib bermusyawarah dengan RT terlebih dahulu.`,
  },
  {
    judul: "Peraturan Ketua RW 03 Padasuka Nomor 3 Tahun 2026 tentang Keamanan dan Ketertiban Lingkungan",
    slug: "peraturan-keamanan-lingkungan",
    kategori: "keamanan",
    versi: "1.0",
    tanggalBerlaku: "2026-06-01",
    urutan: 3,
    isi: `MENIMBANG keamanan lingkungan merupakan tanggung jawab bersama warga dan pengurus RT/RW; dan

MENIMBANG koordinasi ronda, pelaporan, dan kewaspadaan dini perlu diatur secara jelas;

PASAL 1 — Ronda Malam dan Pengawasan

1. Pelaksanaan ronda malam mengikuti jadwal dan skema yang ditetapkan RT masing-masing.
2. Warga yang mendapat giliran ronda wajib hadir atau mengganti dengan warga lain yang disetujui ketua RT.
3. Petugas ronda berwenang mencatat kejadian mencurigakan dan melaporkan kepada ketua RT atau pengurus RW.

PASAL 2 — Tamu, Penyewa, dan Pendatang

1. Tamu yang menginap lebih dari satu malam di unit hunian dihimbau dilaporkan kepada ketua RT oleh penanggung jawab rumah.
2. Penyewa kost, kontrakan, atau Visit RW3 wajib mematuhi peraturan RW dan proses pendaftaran yang berlaku.
3. Dilarang membuka atau menyediakan akses jalan lingkungan kepada pihak luar tanpa koordinasi RT/RW.

PASAL 3 — Keadaan Darurat dan Pelaporan

1. Kejadian kebakaran, kecelakaan, kejahatan, atau bencana segera dilaporkan ke ketua RT dan nomor darurat (110/112/113) bila diperlukan.
2. Warga dihimbau mengenal titik kumpul darurat dan kontak pengurus RT/RW yang dipublikasikan resmi.
3. Hoaks atau kabar tidak benar yang memicu kepanikan dilarang disebarkan; verifikasi melalui pengurus RT/RW.

PASAL 4 — CCTV dan Privasi

1. Pemasangan CCTV di fasilitas umum lingkungan mengikuti keputusan musyawarah RT/RW.
2. CCTV pribadi di halaman rumah tidak boleh mengarah langsung ke dalam rumah tetangga tanpa kesepakatan.`,
  },
  {
    judul: "Peraturan Ketua RW 03 Padasuka Nomor 4 Tahun 2026 tentang Parkir, Lalu Lintas, dan Penggunaan Jalan Lingkungan",
    slug: "peraturan-parkir-jalan-lingkungan",
    kategori: "ketertiban",
    versi: "1.0",
    tanggalBerlaku: "2026-06-01",
    urutan: 4,
    isi: `MENIMBANG jalan lingkungan RW merupakan akses bersama yang harus aman dan lancar; dan

MENIMBANG penataan parkir perlu dijaga agar tidak menghambat darurat dan aktivitas warga;

PASAL 1 — Parkir Kendaraan

1. Parkir kendaraan roda empat dan roda dua tidak boleh menghalangi trotoar, pintu masuk umum, hydrant, atau akses ambulans/pemadam.
2. Parkir di badan jalan sempit hanya diperbolehkan pada sisi yang ditetapkan RT dan tidak menghalangi kendaraan lain.
3. Kendaraan tidak laik jalan yang dititip lama di jalan lingkungan wajib ditindak melalui ketua RT setelah peringatan tertulis.

PASAL 2 — Kecepatan dan Keselamatan

1. Pengendara wajib mengurangi kecepatan di jalan lingkungan dan memberi prioritas pejalan kaki serta anak-anak.
2. Dilarang balap liar, uji coba kendaraan, atau kegiatan yang membahayakan di jalan lingkungan.
3. Anak di bawah usia yang diizinkan mengemudikan kendaraan bermotor wajib dalam pengawasan orang tua dan peraturan lalu lintas nasional.

PASAL 3 — Muatan dan Konstruksi Sementara

1. Penggunaan jalan untuk bongkar muat material bangunan wajib berkoordinasi dengan RT dan tidak merusak permukaan jalan.
2. Penempatan material, scaffolding, atau kontainer sementara tidak boleh menghalangi lebih dari waktu yang disepakati RT.`,
  },
  {
    judul: "Peraturan Ketua RW 03 Padasuka Nomor 5 Tahun 2026 tentang Hewan Peliharaan dan Kenyamanan Lingkungan",
    slug: "peraturan-hewan-peliharaan",
    kategori: "lingkungan",
    versi: "1.0",
    tanggalBerlaku: "2026-06-01",
    urutan: 5,
    isi: `MENIMBANG hewan peliharaan dapat menimbulkan gangguan apabila tidak dikelola dengan baik; dan

MENIMBANG hak memelihara hewan harus seimbang dengan hak warga lain atas ketenangan dan kebersihan;

PASAL 1 — Kewajiban Pemilik

1. Pemilik wajib menjaga kebersihan kandang, kotoran hewan, dan tidak membiarkan hewan berkeliaran tanpa pengawasan.
2. Anjing peliharaan di area pemukiman wajib dalam pengawasan; dihimbau menggunakan tali kekang saat di luar halaman.
3. Hewan yang menggigit atau mengganggu warga wajib ditangani pemilik; kerugian ditindaklanjuti melalui musyawarah atau jalur hukum yang berlaku.

PASAL 2 — Gangguan Suara dan Bau

1. Dilarang memelihara unggas atau hewan yang menimbulkan bau menyengat atau suara berlebihan di pemukiman padat, kecuali izin khusus RT setelah musyawarah tetangga terdampak.
2. Pemeliharaan banyak ekor hewan komersial di unit hunian wajib izin RT dan memenuhi ketentuan kesehatan lingkungan setempat.

PASAL 3 — Kesejahteraan Hewan

1. Pemilik dilarang menganiaya, membiarkan kelaparan, atau melepas hewan peliharaan secara sengaja di lingkungan RW.
2. Hewan liar atau terlantar dilaporkan ke ketua RT untuk koordinasi penanganan bersama dinas terkait bila perlu.`,
  },
  {
    judul: "Peraturan Ketua RW 03 Padasuka Nomor 6 Tahun 2026 tentang Renovasi Bangunan dan Kegiatan Konstruksi",
    slug: "peraturan-renovasi-bangunan",
    kategori: "umum",
    versi: "1.0",
    tanggalBerlaku: "2026-06-01",
    urutan: 6,
    isi: `MENIMBANG kegiatan bangun dan renovasi dapat mengganggu tetangga serta infrastruktur lingkungan; dan

MENIMBANG koordinasi dengan RT/RW diperlukan agar tertib dan aman;

PASAL 1 — Pemberitahuan dan Koordinasi

1. Warga yang akan melakukan renovasi berat, penambahan lantai, atau penggalian wajib memberitahu ketua RT minimal tujuh hari sebelum pekerjaan dimulai.
2. Material, perancah, dan tumpukan pasir/batu tidak boleh menutup lebih dari setengah lebar jalan lingkungan tanpa kesepakatan RT.
3. Pekerjaan yang memerlukan izin resmi dari pemerintah kota tetap wajib memenuhi peraturan daerah yang berlaku.

PASAL 2 — Jam Kerja dan Kebisingan

1. Pekerjaan konstruksi yang berisik dibatasi pukul 08.00–17.00 WIB pada hari kerja, dan pukul 08.00–12.00 pada hari Minggu/libur nasional, kecuali pekerjaan darurat struktur.
2. Dilarang menggunakan mesin berisik tinggi di malam hari tanpa izin RT setelah musyawarah tetangga terdekat.

PASAL 3 — Keamanan Lokasi Kerja

1. Lokasi kerja wajib memasang pembatas dan rambu peringatan apabila mengganggu pejalan kaki.
2. Sampah puing dan limbah konstruksi wajib dikelola dan tidak ditumpuk di lahan umum atau selokan.`,
  },
  {
    judul: "Peraturan Ketua RW 03 Padasuka Nomor 7 Tahun 2026 tentang Kependudukan, Data Warga, dan Partisipasi",
    slug: "peraturan-kependudukan-data-warga",
    kategori: "umum",
    versi: "1.0",
    tanggalBerlaku: "2026-06-01",
    urutan: 7,
    isi: `MENIMBANG data kependudukan yang akurat diperlukan untuk pelayanan RW, bansos, dan keadaan darurat; dan

MENIMBANG setiap KK berkewajiban menjaga kefaktualan data di sistem informasi warga RW;

PASAL 1 — Kewajiban Pendataan

1. Kepala keluarga wajib memastikan data anggota keluarga, alamat, nomor WhatsApp, dan status hunian sesuai kondisi terkini.
2. Perubahan besar (pindah, meninggal, kelahiran, penambahan anggota) wajib dilaporkan kepada ketua RT dalam waktu selambat-lambatnya tujuh hari.
3. Pengurus RW berwenang memverifikasi data melalui kunjungan atau konfirmasi RT apabila diperlukan untuk program sosial.

PASAL 2 — Kerahasiaan Data

1. Data pribadi warga digunakan untuk kepentingan administrasi RW/RT dan program resmi, bukan untuk perdagangan atau penyalahgunaan.
2. Penyebaran data warga tanpa persetujuan yang bersangkutan dilarang, kecuali untuk keperluan hukum atau instruksi pihak berwenang.

PASAL 3 — Partisipasi dan Musyawarah

1. Warga dihimbau hadir pada pertemuan warga, sosialisasi program, dan musyawarah besar RW apabila diumumkan.
2. Usulan kebijakan lingkungan dapat disampaikan melalui ketua RT atau pengurus RW untuk dibahas pada forum yang ditentukan.`,
  },
  {
    judul: "Peraturan Ketua RW 03 Padasuka Nomor 8 Tahun 2026 tentang Pengaduan Warga dan Penegakan Peraturan",
    slug: "peraturan-pengaduan-penegakan",
    kategori: "umum",
    versi: "1.0",
    tanggalBerlaku: "2026-06-01",
    urutan: 8,
    isi: `MENIMBANG saluran pengaduan yang jelas mempercepat penanganan masalah lingkungan; dan

MENIMBANG penegakan peraturan RW harus proporsional, edukatif, dan berlapis;

PASAL 1 — Saluran Pengaduan

1. Warga dapat menyampaikan pengaduan melalui formulir resmi RW, WhatsApp pengurus, atau pertemuan RT.
2. Pengaduan wajib memuat uraian kejadian, lokasi, waktu, dan bukti yang wajar apabila ada.
3. Pengurus RW mencatat status pengaduan: diterima, ditindaklanjuti RT, musyawarah RW, atau dirujuk ke pihak berwenang.

PASAL 2 — Tahapan Penegakan

1. Penegakan diawali teguran lisan atau tertulis oleh ketua RT kepada yang bersangkutan.
2. Apabila berulang, dilakukan musyawarah RT; bila perlu, musyawarah RW dengan dokumentasi hasil.
3. Sanksi sosial lingkungan (misalnya pengumuman teguran resmi, pembatasan sementara fasilitas RT) hanya setelah musyawarah dan tidak menggantikan proses hukum negara.

PASAL 3 — Pencabutan dan Revisi

1. Peraturan RW dapat direvisi melalui pembahasan pengurus RW dan musyawarah perwakilan RT.
2. Peraturan yang dicabut tidak berlaku sejak tanggal pencabutan diumumkan melalui saluran resmi RW.`,
  },
];

/** Isi dinormalisasi ke format terstruktur (tampilan publik & editor). */
export const RW3LAW_PERATURAN_DASAR: Rw3lawPeraturanSeed[] = RW3LAW_PERATURAN_DASAR_RAW.map(
  (p) => ({
    ...p,
    isi: canonicalizeRw3lawIsi(p.isi),
  }),
);

export const RW3LAW_PERATURAN_DASAR_SLUGS = new Set(RW3LAW_PERATURAN_DASAR.map((p) => p.slug));

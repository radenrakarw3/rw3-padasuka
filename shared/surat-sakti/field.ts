import type { Field, KelompokField, KolomTabel } from "./tipe";

const teks = (key: string, label: string, o: Partial<Field> = {}): Field => ({ key, label, tipe: "teks", ...o });
const uraian = (key: string, label: string, o: Partial<Field> = {}): Field => ({ key, label, tipe: "uraian", ...o });
const tgl = (key: string, label: string, o: Partial<Field> = {}): Field => ({ key, label, tipe: "tanggal", ...o });
const jam = (key: string, label: string, o: Partial<Field> = {}): Field => ({ key, label, tipe: "waktu", ...o });
const daftar = (key: string, label: string, o: Partial<Field> = {}): Field => ({ key, label, tipe: "daftar", ...o });
const pihak = (key: string, label: string, o: Partial<Field> = {}): Field => ({ key, label, tipe: "pihak", ...o });
const pilihan = (key: string, label: string, opsi: readonly string[], o: Partial<Field> = {}): Field => ({ key, label, tipe: "pilihan", opsi, ...o });
const tabel = (key: string, label: string, kolom: KolomTabel[], o: Partial<Field> = {}): Field => ({ key, label, tipe: "tabel", kolom, ...o });
const rp = (key: string, label: string, o: Partial<Field> = {}): Field => ({ key, label, tipe: "rupiah", ...o });
const angka = (key: string, label: string, o: Partial<Field> = {}): Field => ({ key, label, tipe: "angka", ...o });
const centang = (key: string, label: string, o: Partial<Field> = {}): Field => ({ key, label, tipe: "centang", internal: true, ...o });

const K = (key: string, label: string, tipe?: KolomTabel["tipe"], lebar?: number): KolomTabel => ({ key, label, tipe, lebar });

export const BENTUK_BANTUAN = [
  "Dana", "Barang", "Material baru", "Material bekas layak pakai", "Alat", "Kendaraan", "Tempat", "Jasa/tenaga ahli", "Kolaborasi/CSR",
] as const;

/** Urutan sama dengan TINGKAT_TEGURAN di shared/aduan.ts (lisan, sp1, sp2, sp3). */
export const TINGKAT_TEGURAN_CETAK = [
  "Teguran Lisan",
  "Peringatan Pertama (SP-1)",
  "Peringatan Kedua (SP-2)",
  "Peringatan Ketiga (SP-3) — peringatan terakhir",
] as const;

/** Kunci yang ditangani tata letak (tidak dirender sebagai isi biasa). */
export const KUNCI_TATA_LETAK = new Set(["penerima", "tembusan", "penandatangan", "penandatanganBA", "tindakRencana"]);

export const KELOMPOK: Record<string, KelompokField> = {
  // ------------------------------------------------------------ bersama
  penerima: { id: "penerima", judul: "Penerima", fields: [
    pihak("penerima", "Kepada (penerima)", { wajib: true, bantuan: "Pilih dari data yang ada atau tulis pihak luar." }),
    daftar("tembusan", "Tembusan"),
  ] },
  konteks: { id: "konteks", judul: "Fakta dan lokasi", fields: [
    teks("lokasi", "Lokasi"),
    uraian("fakta", "Fakta / latar belakang", { bantuan: "Tulis yang diketahui atau diamati, bukan kesimpulan atau tuduhan." }),
    teks("sumberFakta", "Sumber fakta (catatan internal, tidak dicetak)", { internal: true, bantuan: "Mis. laporan RT 02 tgl 3 Okt, pengamatan lapangan, foto. Tidak dicetak agar pelapor terlindungi." }),
  ] },
  permintaan: { id: "permintaan", judul: "Tindakan yang diminta", fields: [
    uraian("tindakanDiminta", "Tindakan yang diminta", { wajib: true }),
    uraian("hasilDiharapkan", "Hasil / bukti yang diharapkan"),
    tgl("tenggat", "Tenggat"),
  ] },
  pic: { id: "pic", judul: "Penanggung jawab", fields: [
    pihak("pic", "Penanggung jawab"),
    teks("kontak", "Kontak koordinasi"),
  ] },
  rujukan: { id: "rujukan", judul: "Surat sebelumnya (opsional)", fields: [
    teks("suratRujukan", "Nomor/perihal surat sebelumnya", { bantuan: "Boleh dikosongkan bila tidak merujuk surat lain." }),
    tgl("tanggalRujukan", "Tanggal surat sebelumnya"),
  ] },
  ttd: { id: "ttd", judul: "Penandatangan", fields: [
    pihak("penandatangan", "Penandatangan", { bantuan: "Kosongkan untuk Ketua RW. Tanda tangan dibubuhkan basah setelah dicetak." }),
  ] },
  tindak: { id: "tindak", judul: "Langkah tindak lanjut", fields: [
    tabel("tindakRencana", "Rencana tindak lanjut (dicatat saat terbit)", [K("tindakan", "Tindakan"), K("pic", "PIC"), K("tenggat", "Tenggat", "tanggal")], { internal: true }),
  ] },

  // ------------------------------------------------------------ A. menggerakkan pengurus
  tugas: { id: "tugas", judul: "Penugasan", fields: [
    pihak("petugas", "Petugas", { wajib: true }),
    teks("peranTugas", "Peran", { wajib: true }),
    daftar("lingkupTugas", "Lingkup tugas", { wajib: true }),
    tgl("mulaiTugas", "Mulai", { wajib: true }),
    tgl("selesaiTugas", "Selesai"),
    uraian("hasilTugas", "Hasil yang diharapkan"),
    teks("caraMelapor", "Cara melapor"),
    daftar("kebutuhanSumberDaya", "Kebutuhan sumber daya"),
  ] },
  pemeriksaan: { id: "pemeriksaan", judul: "Objek pemeriksaan", fields: [
    teks("objekPemeriksaan", "Objek yang diperiksa", { wajib: true }),
    daftar("aspekDiperiksa", "Hal yang diperiksa", { wajib: true }),
  ] },
  tim: { id: "tim", judul: "Tim / panitia", fields: [
    teks("namaTim", "Nama tim/panitia", { wajib: true }),
    tabel("anggotaTim", "Susunan", [K("nama", "Nama", undefined, 3), K("peran", "Peran", undefined, 2), K("unsur", "Unsur/RT", undefined, 2)], { wajib: true }),
    daftar("tugasTim", "Tugas tim", { wajib: true }),
    tgl("masaKerjaMulai", "Masa kerja mulai"),
    tgl("masaKerjaSelesai", "Masa kerja selesai"),
  ] },
  koordinator: { id: "koordinator", judul: "Koordinator", fields: [
    pihak("koordinator", "Koordinator", { wajib: true, tunggal: true }),
    teks("bidangKoordinasi", "Bidang/wilayah koordinasi", { wajib: true }),
    daftar("tugasKoordinator", "Tugas koordinator", { wajib: true }),
    tgl("masaKerjaMulai", "Masa kerja mulai"),
    tgl("masaKerjaSelesai", "Masa kerja selesai"),
  ] },
  instruksi: { id: "instruksi", judul: "Pembagian peran", fields: [
    teks("program", "Program", { wajib: true }),
    tabel("instruksiPeran", "Tugas per peran", [K("peran", "Peran", undefined, 2), K("pelaksana", "Pelaksana", undefined, 2), K("tugas", "Tugas", undefined, 4), K("tenggat", "Tenggat", "tanggal", 2)], { wajib: true }),
  ] },
  mintaLaporan: { id: "mintaLaporan", judul: "Laporan yang diminta", fields: [
    teks("penugasanRujukan", "Penugasan yang dilaporkan"),
    daftar("isiLaporan", "Isi laporan", { wajib: true }),
    tgl("batasLaporan", "Batas penyampaian", { wajib: true }),
    pilihan("formatLaporan", "Bentuk laporan", ["Tertulis", "Foto dan keterangan", "Lisan, dicatat pengurus"]),
  ] },
  evaluasi: { id: "evaluasi", judul: "Evaluasi", fields: [
    teks("objekEvaluasi", "Yang dievaluasi", { wajib: true }),
    teks("periodeLaporan", "Periode"),
    daftar("target", "Target"),
    daftar("capaian", "Capaian", { wajib: true }),
    daftar("temuan", "Temuan"),
    pilihan("nilaiUmum", "Penilaian umum", ["Tercapai", "Sebagian tercapai", "Belum tercapai"]),
    daftar("rekomendasi", "Rekomendasi", { wajib: true }),
  ] },
  ubahTugas: { id: "ubahTugas", judul: "Perubahan penugasan", fields: [
    teks("penugasanRujukan", "Penugasan semula"),
    pilihan("jenisPerubahan", "Jenis perubahan", ["Perubahan lingkup", "Perpanjangan", "Pengakhiran"], { wajib: true }),
    uraian("alasanPerubahan", "Alasan", { wajib: true }),
    daftar("ketentuanBaru", "Ketentuan baru"),
    tgl("berlakuMulai", "Berlaku mulai", { wajib: true }),
  ] },
  serah: { id: "serah", judul: "Serah-terima", fields: [
    pihak("pihakMenyerahkan", "Pihak yang menyerahkan", { wajib: true, tunggal: true }),
    pihak("pihakMenerima", "Pihak yang menerima", { wajib: true, tunggal: true }),
    tgl("waktuSerah", "Tanggal serah-terima", { wajib: true }),
    tabel("daftarBarang", "Daftar barang/hasil/dokumen", [K("nama", "Uraian", undefined, 4), K("jumlah", "Jumlah", "angka", 1), K("satuan", "Satuan", undefined, 1), K("kondisi", "Kondisi", undefined, 2), K("catatan", "Catatan", undefined, 2)]),
    uraian("catatanSerah", "Catatan"),
  ] },
  serahTugas: { id: "serahTugas", judul: "Tugas yang diserahkan", fields: [
    daftar("tugasDiserahkan", "Tugas yang diserahkan", { wajib: true }),
    uraian("statusPekerjaan", "Keadaan pekerjaan saat diserahkan"),
  ] },

  // ------------------------------------------------------------ B. masalah
  acara: { id: "acara", judul: "Waktu dan tempat", fields: [
    tgl("waktuAcara", "Hari/tanggal", { wajib: true }),
    jam("jamAcara", "Pukul", { wajib: true }),
    teks("tempatAcara", "Tempat", { wajib: true }),
    daftar("agenda", "Acara/agenda"),
  ] },
  klarifikasi: { id: "klarifikasi", judul: "Pokok klarifikasi", fields: [
    daftar("pokokPenjelasan", "Hal yang perlu dijelaskan", { wajib: true, bantuan: "Tulis netral: 'informasi mengenai …', bukan 'pelanggaran yang dilakukan'." }),
    daftar("pertanyaan", "Pertanyaan"),
    daftar("dokumenDibawa", "Dokumen yang mohon dibawa"),
  ] },
  penjelasanTertulis: { id: "penjelasanTertulis", judul: "Penjelasan tertulis", fields: [
    daftar("pokokPenjelasan", "Hal yang perlu dijelaskan", { wajib: true }),
    daftar("pertanyaan", "Pertanyaan"),
    tgl("batasJawaban", "Batas penyampaian", { wajib: true }),
    teks("caraMenyampaikan", "Cara menyampaikan"),
  ] },
  mediasi: { id: "mediasi", judul: "Para pihak", fields: [
    pihak("paraPihak", "Para pihak", { wajib: true }),
    uraian("pokokMasalah", "Pokok masalah", { wajib: true }),
    pihak("fasilitator", "Fasilitator"),
  ] },
  beritaAcara: { id: "beritaAcara", judul: "Berita acara", fields: [
    tgl("waktuAktual", "Tanggal pelaksanaan (aktual)", { wajib: true }),
    jam("jamMulai", "Mulai pukul"),
    jam("jamSelesai", "Selesai pukul"),
    teks("tempatAcara", "Tempat", { wajib: true }),
    tabel("peserta", "Peserta", [K("nama", "Nama", undefined, 3), K("peran", "Peran", undefined, 2), K("unsur", "Unsur/RT", undefined, 2)], { wajib: true }),
    daftar("sumberKeterangan", "Sumber keterangan"),
    daftar("faktaPengamatan", "Fakta yang diamati/disampaikan", { wajib: true }),
    tabel("pendapatPihak", "Pendapat para pihak", [K("pihak", "Pihak", undefined, 2), K("pendapat", "Pendapat", undefined, 5)]),
    daftar("hasil", "Hasil", { wajib: true }),
    daftar("belumDisepakati", "Hal yang belum disepakati"),
    pihak("penandatanganBA", "Yang menandatangani", { wajib: true }),
  ] },
  kesepakatan: { id: "kesepakatan", judul: "Kesepakatan", fields: [
    pihak("paraPihak", "Para pihak", { wajib: true }),
    daftar("butirSepakat", "Butir yang disepakati", { wajib: true }),
    tabel("kewajiban", "Kewajiban masing-masing", [K("pihak", "Pihak", undefined, 2), K("kewajiban", "Kewajiban", undefined, 5), K("batas", "Batas waktu", "tanggal", 2)], { wajib: true }),
    uraian("pemantauan", "Cara pemantauan", { wajib: true }),
    centang("konfirmasiPihak", "Para pihak sudah membaca dan menyetujui seluruh butir di hadapan RW", { wajib: true }),
  ] },
  perkembangan: { id: "perkembangan", judul: "Perkembangan", fields: [
    daftar("perkembangan", "Perkembangan terakhir", { wajib: true }),
    daftar("langkahBerikut", "Langkah berikutnya"),
  ] },
  teguranPihak: { id: "teguranPihak", judul: "Pihak yang ditegur", fields: [
    teks("pihakDitegur", "Pihak yang ditegur", { wajib: true }),
    teks("alamatDitegur", "Alamat"),
  ] },
  teguran: { id: "teguran", judul: "Teguran", fields: [
    pilihan("tingkatTeguran", "Tingkat teguran", TINGKAT_TEGURAN_CETAK, { wajib: true }),
    teks("dasarTeguran", "Dasar", { wajib: true, bantuan: "Mis. Aduan warga nomor ADU-2026-0001 dan hasil pemeriksaan pengurus. Jangan tulis nama pelapor." }),
    uraian("pelanggaran", "Hal yang ditegur", { wajib: true, bantuan: "Tulis perbuatan/kondisinya, bukan siapa yang melapor." }),
    daftar("kewajibanPerbaikan", "Yang wajib dilakukan", { wajib: true }),
    tgl("tenggatPerbaikan", "Batas waktu perbaikan", { wajib: true }),
    daftar("riwayatTeguran", "Teguran sebelumnya"),
    uraian("konsekuensi", "Apabila tidak diindahkan"),
  ] },
  imbauan: { id: "imbauan", judul: "Imbauan", fields: [
    uraian("kondisiDiamati", "Kondisi yang diamati", { wajib: true }),
    daftar("imbauan", "Imbauan", { wajib: true }),
    tgl("batasWaktu", "Diharapkan sebelum"),
  ] },
  perbaikan: { id: "perbaikan", judul: "Kondisi dan penanganan", fields: [
    teks("aset", "Aset/objek", { wajib: true }),
    uraian("kondisi", "Kondisi", { wajib: true }),
    uraian("dampak", "Dampak", { wajib: true }),
    daftar("buktiKondisi", "Bukti (foto/dokumen terlampir)"),
    daftar("langkahSebelumnya", "Langkah yang sudah dilakukan"),
    uraian("penangananDimohon", "Penanganan yang dimohonkan", { wajib: true }),
  ] },

  // ------------------------------------------------------------ C. keputusan dan penataan
  keputusan: { id: "keputusan", judul: "Keputusan", fields: [
    teks("objekKeputusan", "Objek keputusan", { wajib: true }),
    daftar("menimbang", "Menimbang", { wajib: true }),
    daftar("butirKeputusan", "Butir keputusan", { wajib: true }),
    pihak("pelaksana", "Penanggung jawab pelaksanaan"),
    teks("masaBerlaku", "Masa berlaku"),
    teks("evaluasiKeputusan", "Waktu/cara evaluasi"),
    teks("dokumenDiganti", "Dokumen yang diganti"),
  ] },
  dasarCek: { id: "dasarCek", judul: "Dasar (wajib diperiksa)", fields: [
    daftar("dasar", "Dasar/rujukan", { bantuan: "Hanya rujukan yang benar-benar ada: Peraturan RW (RW3LAW), notulen musyawarah, surat instansi. Jangan mengarang dasar hukum." }),
    teks("sumberMusyawarah", "Musyawarah sumber keputusan", { bantuan: "Mis. Musyawarah RW tgl 5 Okt 2026, notulen no. …" }),
    centang("dasarDiperiksa", "Dasar sudah diperiksa Ketua RW dan dokumen rujukannya tersedia", { wajib: true }),
  ] },
  edaran: { id: "edaran", judul: "Isi edaran", fields: [
    teks("sasaran", "Ditujukan kepada", { wajib: true }),
    uraian("informasi", "Informasi", { wajib: true }),
    daftar("tindakanWarga", "Yang perlu dilakukan", { wajib: true }),
    teks("jadwalEdaran", "Jadwal"),
    teks("kontak", "Kontak koordinasi"),
  ] },
  jadwal: { id: "jadwal", judul: "Jadwal", fields: [
    teks("namaJadwal", "Nama jadwal", { wajib: true }),
    teks("periode", "Periode", { wajib: true }),
    tabel("jadwal", "Jadwal", [K("hari", "Hari/tanggal", undefined, 2), K("waktu", "Waktu", undefined, 2), K("petugas", "Petugas/kegiatan", undefined, 4), K("lokasi", "Lokasi", undefined, 2)], { wajib: true }),
    daftar("ketentuan", "Ketentuan"),
    teks("kontak", "Kontak koordinasi"),
  ] },
  tataFasilitas: { id: "tataFasilitas", judul: "Tata penggunaan", fields: [
    teks("fasilitas", "Fasilitas", { wajib: true }),
    daftar("ketentuan", "Ketentuan penggunaan", { wajib: true }),
    teks("jamPenggunaan", "Waktu penggunaan"),
    teks("kontak", "Pengelola/kontak"),
  ] },
  aksesPekerjaan: { id: "aksesPekerjaan", judul: "Pekerjaan dan akses", fields: [
    teks("pekerjaan", "Pekerjaan", { wajib: true }),
    teks("pelaksana", "Pelaksana"),
    tgl("waktuMulai", "Mulai", { wajib: true }),
    tgl("waktuSelesai", "Perkiraan selesai"),
    uraian("dampakAkses", "Dampak pada akses", { wajib: true }),
    teks("jalurAlternatif", "Jalur alternatif"),
    teks("kontak", "Kontak koordinasi"),
  ] },
  koordinasi: { id: "koordinasi", judul: "Koordinasi", fields: [
    uraian("halKoordinasi", "Hal yang perlu dikoordinasikan", { wajib: true }),
    daftar("usulanLangkah", "Usulan langkah bersama"),
    teks("usulanWaktu", "Usulan waktu pertemuan"),
  ] },
  ubahKeputusan: { id: "ubahKeputusan", judul: "Perubahan keputusan", fields: [
    teks("keputusanDiubah", "Keputusan yang diubah/dicabut"),
    pilihan("jenisPerubahanKeputusan", "Jenis", ["Perubahan", "Pencabutan"], { wajib: true }),
    uraian("alasanPerubahan", "Alasan", { wajib: true }),
    daftar("perubahan", "Ketentuan setelah perubahan"),
  ] },

  // ------------------------------------------------------------ D. dukungan pihak luar
  audiensi: { id: "audiensi", judul: "Audiensi", fields: [
    uraian("maksudAudiensi", "Maksud audiensi", { wajib: true }),
    daftar("pokokBahasan", "Pokok bahasan", { wajib: true }),
    teks("usulanWaktu", "Usulan waktu", { wajib: true }),
    tabel("delegasi", "Delegasi RW", [K("nama", "Nama", undefined, 3), K("jabatan", "Jabatan", undefined, 3)]),
  ] },
  bantuan: { id: "bantuan", judul: "Bantuan yang dimohonkan", fields: [
    teks("program", "Program/kegiatan", { wajib: true }),
    uraian("manfaat", "Manfaat bagi warga", { wajib: true }),
    pilihan("bentukBantuan", "Bentuk bantuan", BENTUK_BANTUAN, { wajib: true }),
    tabel("rincian", "Rincian (jumlah/spesifikasi/RAB)", [K("uraian", "Uraian", undefined, 4), K("spesifikasi", "Spesifikasi", undefined, 3), K("jumlah", "Jumlah", "angka", 1), K("satuan", "Satuan", undefined, 1), K("biaya", "Perkiraan biaya", "rupiah", 2)]),
    rp("nominal", "Nominal yang dimohonkan"),
    teks("jadwalPelaksanaan", "Jadwal pelaksanaan"),
    daftar("dukunganLain", "Dukungan lain yang sudah ada"),
    uraian("pertanggungjawaban", "Cara pertanggungjawaban", { wajib: true }),
  ] },
  kolaborasi: { id: "kolaborasi", judul: "Kolaborasi", fields: [
    teks("program", "Program", { wajib: true }),
    uraian("manfaat", "Manfaat bagi warga", { wajib: true }),
    daftar("bentukKolaborasi", "Bentuk kolaborasi yang ditawarkan", { wajib: true }),
    daftar("kontribusiRw", "Kontribusi RW 03"),
    uraian("pertanggungjawaban", "Pelaporan kepada mitra"),
  ] },
  penawaranHarga: { id: "penawaranHarga", judul: "Kebutuhan", fields: [
    tabel("kebutuhan", "Kebutuhan", [K("uraian", "Uraian", undefined, 4), K("spesifikasi", "Spesifikasi", undefined, 3), K("jumlah", "Jumlah", "angka", 1), K("satuan", "Satuan", undefined, 1)], { wajib: true }),
    tgl("batasPenawaran", "Batas penyampaian penawaran", { wajib: true }),
    teks("caraMenyampaikan", "Cara menyampaikan"),
  ] },
  pengingat: { id: "pengingat", judul: "Pengingat", fields: [
    uraian("halBelum", "Hal yang belum mendapat tanggapan", { wajib: true }),
  ] },
  terimaKasih: { id: "terimaKasih", judul: "Dukungan yang diterima", fields: [
    uraian("bentukDukungan", "Dukungan yang sudah diterima", { wajib: true, bantuan: "Hanya dukungan nyata yang sudah diterima." }),
    tgl("tanggalDukungan", "Tanggal diterima", { wajib: true }),
    uraian("manfaatDirasakan", "Manfaat yang dirasakan"),
  ] },

  // ------------------------------------------------------------ E. pelaksanaan dan pertanggungjawaban
  kegiatan: { id: "kegiatan", judul: "Kegiatan", fields: [
    teks("namaKegiatan", "Nama kegiatan", { wajib: true }),
  ] },
  rencana: { id: "rencana", judul: "Rencana", fields: [
    uraian("tujuanKegiatan", "Tujuan", { wajib: true }),
    teks("sasaranKegiatan", "Sasaran/peserta"),
    tabel("susunan", "Susunan kegiatan", [K("kegiatan", "Kegiatan", undefined, 4), K("waktu", "Waktu", undefined, 2), K("pic", "PIC", undefined, 2)]),
    tabel("anggaran", "Rencana anggaran", [K("uraian", "Uraian", undefined, 4), K("jumlah", "Jumlah", "angka", 1), K("satuan", "Satuan", undefined, 1), K("biaya", "Biaya", "rupiah", 2)]),
    teks("sumberDana", "Sumber dana"),
  ] },
  daftarHadir: { id: "daftarHadir", judul: "Peserta", fields: [
    tabel("peserta", "Daftar hadir", [K("nama", "Nama", undefined, 4), K("unsur", "Unsur/RT", undefined, 2), K("ttd", "Tanda tangan", undefined, 3)], { barisKosong: 15 }),
  ] },
  notulen: { id: "notulen", judul: "Notulen", fields: [
    teks("pimpinanRapat", "Pimpinan rapat", { wajib: true }),
    teks("notulis", "Notulis", { wajib: true }),
    teks("pesertaRingkas", "Peserta"),
    tabel("pembahasan", "Pembahasan", [K("agenda", "Agenda", undefined, 2), K("pembahasan", "Pembahasan", undefined, 5)], { wajib: true }),
    daftar("keputusanRapat", "Keputusan/kesimpulan"),
    tabel("tindakLanjutRapat", "Tindak lanjut", [K("tindakan", "Tindakan", undefined, 4), K("pic", "PIC", undefined, 2), K("tenggat", "Tenggat", "tanggal", 2)]),
  ] },
  progres: { id: "progres", judul: "Progres", fields: [
    teks("namaPekerjaan", "Pekerjaan/program", { wajib: true }),
    teks("periodeLaporan", "Periode", { wajib: true }),
    daftar("target", "Target", { wajib: true }),
    daftar("realisasi", "Realisasi", { wajib: true }),
    angka("persentase", "Persentase capaian (%)"),
    rp("biaya", "Biaya terpakai"),
    daftar("kendala", "Kendala"),
    daftar("buktiProgres", "Bukti (terlampir)"),
    daftar("sisaPekerjaan", "Pekerjaan tersisa"),
  ] },
  penggunaan: { id: "penggunaan", judul: "Penggunaan dana/barang", fields: [
    teks("sumberDanaRujukan", "Sumber dana/barang", { wajib: true }),
    rp("danaDiterima", "Dana diterima"),
    tabel("penggunaanDana", "Penggunaan dana", [K("tanggal", "Tanggal", "tanggal", 2), K("uraian", "Uraian", undefined, 5), K("jumlah", "Jumlah", "rupiah", 2)]),
    tabel("penggunaanBarang", "Penggunaan barang", [K("barang", "Barang", undefined, 3), K("diterima", "Diterima", "angka", 1), K("digunakan", "Digunakan", "angka", 1), K("sisa", "Sisa", "angka", 1), K("keterangan", "Keterangan", undefined, 3)]),
    daftar("buktiPenggunaan", "Bukti (terlampir)"),
  ] },

  // ------------------------------------------------------------ F. surat kustom
  kustom: { id: "kustom", judul: "Isi surat", fields: [
    pihak("penerima", "Kepada (opsional)", { bantuan: "Isi untuk surat ber-\"Kepada Yth.\". Kosongkan untuk dokumen berjudul (mis. surat keterangan, pengumuman)." }),
    teks("judulSurat", "Judul dokumen", { bantuan: "Dipakai bila penerima kosong. Mis. SURAT KETERANGAN, PENGUMUMAN. Kosongkan untuk memakai perihal." }),
    uraian("isiSurat", "Isi surat", { wajib: true, bantuan: "Tulis bebas. Pisahkan paragraf dengan satu baris kosong." }),
    daftar("poinSurat", "Butir/poin (opsional)", { bantuan: "Dicetak sebagai daftar bernomor sesudah isi surat." }),
    uraian("penutupSurat", "Kalimat penutup", { bantuan: "Kosongkan untuk penutup baku. Tulis \"-\" bila tanpa penutup." }),
    daftar("tembusan", "Tembusan"),
  ] },
};

export function semuaField(kelompokIds: string[]): Field[] {
  const seen = new Set<string>();
  const out: Field[] = [];
  for (const id of kelompokIds) {
    for (const f of KELOMPOK[id]?.fields ?? []) {
      if (seen.has(f.key)) continue;
      seen.add(f.key);
      out.push(f);
    }
  }
  return out;
}

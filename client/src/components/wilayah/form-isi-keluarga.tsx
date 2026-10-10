import { Plus, Trash2 } from "lucide-react";
import { useDraft, useKirimSekali } from "@/lib/wilayah-api";
import { BarisRingkas, IsianPanjang, IsianTeks, Langkah, Pesan, PilihFakta, PilihTombol, TombolBesar } from "@/components/wilayah/ui";
import {
  FAKTA_BY_KUNCI, FAKTA_FORM_KK, FAKTA_FORM_RUMAH, FAKTA_FORM_USAHA, FAKTA_FORM_WARGA, HUBUNGAN_KELUARGA, KATEGORI_USAHA,
  labelNilaiFakta, umurTahun, isoTanggal, type IsiUsulan, type UsulanAnggota, type UsulanUsaha,
} from "@shared/wilayah";

const anggotaKosong = (): UsulanAnggota => ({ nama: "", hubungan: "Anak", jenisKelamin: "Laki-laki", tanggalLahir: null, jawaban: {}, keterangan: "tetap" });

function tampilWarga(kunci: string, a: UsulanAnggota): boolean {
  const usia = umurTahun(a.tanggalLahir, isoTanggal(new Date()));
  const p = a.jenisKelamin === "Perempuan";
  if (kunci === "hamil" || kunci === "nifas_menyusui") return p && (usia == null || (usia >= 10 && usia <= 55));
  if (kunci === "sekolah_aktif") return usia == null || usia <= 30;
  if (kunci === "profesi_pendidik") return a.jawaban.status_kerja === "bekerja";
  return true;
}

function FormAnggota({ a, ubah }: { a: UsulanAnggota; ubah: (a: UsulanAnggota) => void }) {
  const jawab = (k: string, v: string | null) => {
    const j = { ...a.jawaban };
    if (v == null) delete j[k];
    else j[k] = v;
    ubah({ ...a, jawaban: j });
  };
  return (
    <div>
      <IsianTeks label="Nama" nilai={a.nama} onChange={(v) => ubah({ ...a, nama: v })} />
      <PilihTombol label="Hubungan dalam keluarga" belumTahu={false} nilai={a.hubungan} onChange={(v) => v && ubah({ ...a, hubungan: v })} pilihan={HUBUNGAN_KELUARGA.map((h) => ({ nilai: h, label: h }))} />
      <PilihTombol label="Jenis kelamin" belumTahu={false} nilai={a.jenisKelamin} onChange={(v) => v && ubah({ ...a, jenisKelamin: v as UsulanAnggota["jenisKelamin"] })}
        pilihan={[{ nilai: "Laki-laki", label: "Laki-laki" }, { nilai: "Perempuan", label: "Perempuan" }]} />
      <IsianTeks label="Tanggal lahir" tipe="date" nilai={a.tanggalLahir ?? ""} onChange={(v) => ubah({ ...a, tanggalLahir: v || null })} bantuan="Kosongkan bila tidak ingat." />
      <PilihTombol label="Keterangan" belumTahu={false} nilai={a.keterangan ?? "tetap"} onChange={(v) => v && ubah({ ...a, keterangan: v as UsulanAnggota["keterangan"] })}
        pilihan={[{ nilai: "tetap", label: "Tinggal di sini" }, { nilai: "baru", label: "Anggota baru" }, { nilai: "pindah", label: "Sudah pindah" }, { nilai: "meninggal", label: "Meninggal" }]} />
      {(a.keterangan ?? "tetap") === "tetap" || a.keterangan === "baru" ? (
        <>
          <p className="text-base text-gray-600 mb-3">Pertanyaan kesehatan: jawab “Ya” hanya bila sudah dinyatakan dokter / tenaga kesehatan.</p>
          {FAKTA_FORM_WARGA.filter((k) => tampilWarga(k, a)).map((k) => <PilihFakta key={k} kunci={k} nilai={a.jawaban[k] ?? null} onChange={(v) => jawab(k, v)} />)}
        </>
      ) : null}
    </div>
  );
}

interface Draft { i: number; isi: IsiUsulan; buka: number | null }
const isiKosong = (): IsiUsulan => ({ versiForm: 1, namaPengisi: "", hubunganPengisi: "Kepala Keluarga", nomorHp: "", rumahTangga: {}, anggota: [anggotaKosong()], usaha: [], catatan: "" });

/**
 * Formulir pendataan keluarga 5 langkah. Dipakai warga (kartu QR) dan admin RW (warga datang langsung).
 * Hasilnya selalu berupa usulan yang diperiksa Ketua RT sebelum data resmi berubah.
 */
export function FormIsiKeluarga({ draftKey, pembuka, labelPengisi = "Nama Anda", kirimKe, selesai, batal }: {
  draftKey: string;
  pembuka: React.ReactNode;
  labelPengisi?: string;
  kirimKe: (isi: IsiUsulan, kunci: string) => Promise<{ kodeTerima: string }>;
  selesai: (kode: string) => void;
  batal?: () => void;
}) {
  const { nilai: d, setNilai, hapus } = useDraft<Draft>(draftKey, { i: 1, isi: isiKosong(), buka: 0 });
  const set = (p: Partial<Draft>) => { setNilai({ ...d, ...p }); window.scrollTo(0, 0); };
  const setIsi = (p: Partial<IsiUsulan>) => setNilai({ ...d, isi: { ...d.isi, ...p } });
  const total = 5;
  const { kirim, mengirim, error } = useKirimSekali(async (kunci) => {
    const isi: IsiUsulan = {
      ...d.isi,
      nomorHp: d.isi.nomorHp?.trim() || null,
      catatan: d.isi.catatan?.trim() || null,
      anggota: d.isi.anggota.filter((a) => a.nama.trim().length >= 2),
      usaha: d.isi.usaha.filter((u) => u.nama.trim().length >= 2 && u.pemilik.trim().length >= 2),
    };
    const r = await kirimKe(isi, kunci);
    hapus();
    return r;
  });

  if (d.i === 1) {
    return (
      <Langkah langkah={1} total={total} judul="Siapa yang mengisi?" onKembali={batal} onLanjut={() => set({ i: 2 })} bisaLanjut={d.isi.namaPengisi.trim().length >= 2}>
        {pembuka}
        <div className="mt-4" />
        <IsianTeks label={labelPengisi} nilai={d.isi.namaPengisi} onChange={(v) => setIsi({ namaPengisi: v })} />
        <PilihTombol label="Hubungan dengan keluarga" belumTahu={false} nilai={d.isi.hubunganPengisi} onChange={(v) => v && setIsi({ hubunganPengisi: v })} pilihan={HUBUNGAN_KELUARGA.map((h) => ({ nilai: h, label: h }))} />
        <IsianTeks label="Nomor HP / WhatsApp (boleh kosong)" inputMode="tel" nilai={d.isi.nomorHp ?? ""} onChange={(v) => setIsi({ nomorHp: v })} placeholder="08…" bantuan="Jangan isi dengan NIK." />
      </Langkah>
    );
  }
  if (d.i === 2) {
    const jawab = (k: string, v: string | null) => {
      const j = { ...d.isi.rumahTangga };
      if (v == null) delete j[k];
      else j[k] = v;
      setIsi({ rumahTangga: j });
    };
    return (
      <Langkah langkah={2} total={total} judul="Rumah tangga" onKembali={() => set({ i: 1 })} onLanjut={() => set({ i: 3 })}>
        {[...FAKTA_FORM_KK, ...FAKTA_FORM_RUMAH].map((k) => <PilihFakta key={k} kunci={k} nilai={d.isi.rumahTangga[k] ?? null} onChange={(v) => jawab(k, v)} />)}
      </Langkah>
    );
  }
  if (d.i === 3) {
    const ubah = (idx: number, a: UsulanAnggota) => setIsi({ anggota: d.isi.anggota.map((x, n) => (n === idx ? a : x)) });
    return (
      <Langkah langkah={3} total={total} judul="Anggota keluarga" onKembali={() => set({ i: 2 })} onLanjut={() => set({ i: 4 })}
        bisaLanjut={d.isi.anggota.some((a) => a.nama.trim().length >= 2)}>
        {d.isi.anggota.map((a, idx) => (
          <div key={idx} className="bg-white rounded-2xl border-2 border-gray-200 mb-3">
            <button type="button" className="w-full min-h-[60px] px-4 text-left text-lg font-semibold flex justify-between items-center" onClick={() => setNilai({ ...d, buka: d.buka === idx ? null : idx })}>
              <span>{a.nama || `Anggota ${idx + 1}`}</span><span className="text-base text-gray-500">{d.buka === idx ? "Tutup" : "Buka"}</span>
            </button>
            {d.buka === idx && (
              <div className="px-4 pb-4">
                <FormAnggota a={a} ubah={(x) => ubah(idx, x)} />
                {d.isi.anggota.length > 1 && (
                  <TombolBesar varian="bahaya" ikon={<Trash2 className="w-5 h-5" />} onClick={() => setNilai({ ...d, buka: null, isi: { ...d.isi, anggota: d.isi.anggota.filter((_, n) => n !== idx) } })}>Hapus dari isian</TombolBesar>
                )}
              </div>
            )}
          </div>
        ))}
        {d.isi.anggota.length < 20 && (
          <TombolBesar varian="kedua" ikon={<Plus className="w-6 h-6" />} onClick={() => setNilai({ ...d, buka: d.isi.anggota.length, isi: { ...d.isi, anggota: [...d.isi.anggota, anggotaKosong()] } })}>Tambah anggota</TombolBesar>
        )}
      </Langkah>
    );
  }
  if (d.i === 4) {
    const ubah = (idx: number, u: UsulanUsaha) => setIsi({ usaha: d.isi.usaha.map((x, n) => (n === idx ? u : x)) });
    return (
      <Langkah langkah={4} total={total} judul="Usaha keluarga (bila ada)" onKembali={() => set({ i: 3 })} onLanjut={() => set({ i: 5 })}>
        {d.isi.usaha.length === 0 && <Pesan>Lewati bila tidak punya usaha.</Pesan>}
        {d.isi.usaha.map((u, idx) => (
          <div key={idx} className="bg-white rounded-2xl border-2 border-gray-200 p-4 my-3">
            <IsianTeks label="Nama usaha" nilai={u.nama} onChange={(v) => ubah(idx, { ...u, nama: v })} />
            <IsianTeks label="Nama pemilik" nilai={u.pemilik} onChange={(v) => ubah(idx, { ...u, pemilik: v })} />
            <PilihTombol label="Jenis usaha" kolom={1} nilai={u.kategori} onChange={(v) => ubah(idx, { ...u, kategori: v })} pilihan={KATEGORI_USAHA.map((k) => ({ nilai: k.nilai, label: k.label }))} />
            {FAKTA_FORM_USAHA.map((k) => (
              <PilihFakta key={k} kunci={k} nilai={u.jawaban[k] ?? null} onChange={(v) => {
                const j = { ...u.jawaban };
                if (v == null) delete j[k]; else j[k] = v;
                ubah(idx, { ...u, jawaban: j });
              }} />
            ))}
            <TombolBesar varian="bahaya" onClick={() => setIsi({ usaha: d.isi.usaha.filter((_, n) => n !== idx) })}>Hapus usaha ini</TombolBesar>
          </div>
        ))}
        {d.isi.usaha.length < 5 && <div className="mt-3"><TombolBesar varian="kedua" ikon={<Plus className="w-6 h-6" />} onClick={() => setIsi({ usaha: [...d.isi.usaha, { nama: "", kategori: null, pemilik: "", jawaban: {} }] })}>Tambah usaha</TombolBesar></div>}
      </Langkah>
    );
  }
  const anggota = d.isi.anggota.filter((a) => a.nama.trim().length >= 2);
  return (
    <Langkah langkah={5} total={total} judul="Periksa lalu kirim" onKembali={() => set({ i: 4 })} labelLanjut="Kirim" memuat={mengirim}
      onLanjut={async () => { const r = await kirim(); if (r) selesai(r.kodeTerima); }}>
      <BarisRingkas label="Pengisi" nilai={`${d.isi.namaPengisi} (${d.isi.hubunganPengisi})`} />
      <BarisRingkas label="Anggota" nilai={`${anggota.length} orang`} />
      {Object.entries(d.isi.rumahTangga).map(([k, v]) => <BarisRingkas key={k} label={FAKTA_BY_KUNCI.get(k)?.label ?? k} nilai={labelNilaiFakta(FAKTA_BY_KUNCI.get(k), v)} />)}
      <div className="mt-4" />
      <IsianPanjang label="Catatan untuk Ketua RT (boleh kosong)" nilai={d.isi.catatan ?? ""} onChange={(v) => setIsi({ catatan: v })} />
      {error && <Pesan jenis="error">{error}</Pesan>}
    </Langkah>
  );
}

import { Plus, Trash2 } from "lucide-react";
import { useDraft, useKirimSekali } from "@/lib/wilayah-api";
import { BarisRingkas, IsianPanjang, IsianTeks, Langkah, Pesan, PilihFakta, PilihTombol, TombolBesar } from "@/components/wilayah/ui";
import {
  HUBUNGAN_KELUARGA, berlakuUntukWarga, kelompokkan, labelNilaiFakta, umurTahun, isoTanggal,
  type DefinisiFakta, type IsiUsulan, type UsulanAnggota,
} from "@shared/wilayah";

const anggotaKosong = (): UsulanAnggota => ({ nama: "", hubungan: "Anak", jenisKelamin: "Laki-laki", tanggalLahir: null, jawaban: {}, keterangan: "tetap" });

function Kelompok({ judul }: { judul: string }) {
  return <h3 className="mt-6 mb-3 text-sm font-bold uppercase tracking-wide text-[hsl(163,55%,22%)] border-b border-[hsl(163,55%,22%)]/20 pb-1 first:mt-0">{judul}</h3>;
}

function FormAnggota({ a, ubah, pertanyaan }: { a: UsulanAnggota; ubah: (a: UsulanAnggota) => void; pertanyaan: DefinisiFakta[] }) {
  const jawab = (k: string, v: string | null) => {
    const j = { ...a.jawaban };
    if (v == null) delete j[k];
    else j[k] = v;
    ubah({ ...a, jawaban: j });
  };
  const umur = umurTahun(a.tanggalLahir, isoTanggal(new Date()));
  const berlaku = pertanyaan.filter((d) => berlakuUntukWarga(d, { jenisKelamin: a.jenisKelamin, umur }));
  return (
    <div>
      <IsianTeks label="Nama" nilai={a.nama} onChange={(v) => ubah({ ...a, nama: v })} />
      <PilihTombol label="Hubungan dalam keluarga" belumTahu={false} nilai={a.hubungan} onChange={(v) => v && ubah({ ...a, hubungan: v })} pilihan={HUBUNGAN_KELUARGA.map((h) => ({ nilai: h, label: h }))} />
      <PilihTombol label="Jenis kelamin" belumTahu={false} nilai={a.jenisKelamin} onChange={(v) => v && ubah({ ...a, jenisKelamin: v as UsulanAnggota["jenisKelamin"] })}
        pilihan={[{ nilai: "Laki-laki", label: "Laki-laki" }, { nilai: "Perempuan", label: "Perempuan" }]} />
      <IsianTeks label="Tanggal lahir" tipe="date" nilai={a.tanggalLahir ?? ""} onChange={(v) => ubah({ ...a, tanggalLahir: v || null })} bantuan="Kosongkan bila tidak ingat. Pertanyaan menyesuaikan usia." />
      <PilihTombol label="Keterangan" belumTahu={false} nilai={a.keterangan ?? "tetap"} onChange={(v) => v && ubah({ ...a, keterangan: v as UsulanAnggota["keterangan"] })}
        pilihan={[{ nilai: "tetap", label: "Tinggal di sini" }, { nilai: "baru", label: "Anggota baru" }, { nilai: "pindah", label: "Sudah pindah" }, { nilai: "meninggal", label: "Meninggal" }]} />
      {(a.keterangan ?? "tetap") === "tetap" || a.keterangan === "baru"
        ? kelompokkan(berlaku).map((g) => (
          <div key={g.kelompok}>
            <Kelompok judul={g.kelompok} />
            {g.daftar.map((d) => <PilihFakta key={d.kunci} kunci={d.kunci} def={d} nilai={a.jawaban[d.kunci] ?? null} onChange={(v) => jawab(d.kunci, v)} />)}
          </div>
        ))
        : null}
    </div>
  );
}

interface Draft { i: number; isi: IsiUsulan; buka: number | null }
const isiKosong = (): IsiUsulan => ({ versiForm: 1, namaPengisi: "", hubunganPengisi: "Kepala Keluarga", nomorHp: "", rumahTangga: {}, anggota: [anggotaKosong()], catatan: "" });
const TOTAL = 4;

/** Ambil hanya jawaban untuk pertanyaan yang masih berlaku (draft lama bisa memuat kunci yang sudah dihapus). */
function saring(jawaban: Record<string, string>, kunci: Set<string>) {
  return Object.fromEntries(Object.entries(jawaban).filter(([k]) => kunci.has(k)));
}

/**
 * Formulir pendataan keluarga 4 langkah sesuai standar data RW 03.
 * Hasilnya selalu berupa usulan yang diperiksa pengurus RW sebelum data resmi berubah.
 */
export function FormIsiKeluarga({ draftKey, pembuka, pertanyaan, labelPengisi = "Nama Anda", kirimKe, selesai, batal }: {
  draftKey: string;
  pembuka: React.ReactNode;
  pertanyaan: DefinisiFakta[];
  labelPengisi?: string;
  kirimKe: (isi: IsiUsulan, kunci: string) => Promise<{ kodeTerima: string }>;
  selesai: (kode: string) => void;
  batal?: () => void;
}) {
  const { nilai: draft, setNilai, hapus } = useDraft<Draft>(draftKey, { i: 1, isi: isiKosong(), buka: 0 });
  const d = draft.i > TOTAL ? { ...draft, i: TOTAL } : draft;
  const set = (p: Partial<Draft>) => { setNilai({ ...d, ...p }); window.scrollTo(0, 0); };
  const setIsi = (p: Partial<IsiUsulan>) => setNilai({ ...d, isi: { ...d.isi, ...p } });
  const tanyaKk = pertanyaan.filter((x) => x.subjek === "kk");
  const tanyaWarga = pertanyaan.filter((x) => x.subjek === "warga");
  const kunciKk = new Set(tanyaKk.map((x) => x.kunci));
  const kunciWarga = new Set(tanyaWarga.map((x) => x.kunci));
  const { kirim, mengirim, error } = useKirimSekali(async (kunci) => {
    const isi: IsiUsulan = {
      versiForm: 1,
      namaPengisi: d.isi.namaPengisi,
      hubunganPengisi: d.isi.hubunganPengisi,
      nomorHp: d.isi.nomorHp?.trim() || null,
      catatan: d.isi.catatan?.trim() || null,
      rumahTangga: saring(d.isi.rumahTangga, kunciKk),
      anggota: d.isi.anggota.filter((a) => a.nama.trim().length >= 2).map((a) => ({ ...a, jawaban: saring(a.jawaban, kunciWarga) })),
    };
    const r = await kirimKe(isi, kunci);
    hapus();
    return r;
  });

  if (d.i === 1) {
    return (
      <Langkah langkah={1} total={TOTAL} judul="Siapa yang mengisi?" onKembali={batal} onLanjut={() => set({ i: 2 })} bisaLanjut={d.isi.namaPengisi.trim().length >= 2}>
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
      <Langkah langkah={2} total={TOTAL} judul="Tentang keluarga & rumah" onKembali={() => set({ i: 1 })} onLanjut={() => set({ i: 3 })}>
        <p className="mb-4 text-base text-gray-600">Jawab yang Anda ketahui. Pilih “Belum tahu” bila ragu.</p>
        {kelompokkan(tanyaKk).map((g) => (
          <div key={g.kelompok}>
            <Kelompok judul={g.kelompok} />
            {g.daftar.map((x) => <PilihFakta key={x.kunci} kunci={x.kunci} def={x} nilai={d.isi.rumahTangga[x.kunci] ?? null} onChange={(v) => jawab(x.kunci, v)} />)}
          </div>
        ))}
      </Langkah>
    );
  }
  if (d.i === 3) {
    const ubah = (idx: number, a: UsulanAnggota) => setIsi({ anggota: d.isi.anggota.map((x, n) => (n === idx ? a : x)) });
    return (
      <Langkah langkah={3} total={TOTAL} judul="Anggota keluarga" onKembali={() => set({ i: 2 })} onLanjut={() => set({ i: 4 })}
        bisaLanjut={d.isi.anggota.some((a) => a.nama.trim().length >= 2)}>
        {d.isi.anggota.map((a, idx) => (
          <div key={idx} className="bg-white rounded-2xl border-2 border-gray-200 mb-3">
            <button type="button" className="w-full min-h-[60px] px-4 text-left text-lg font-semibold flex justify-between items-center" onClick={() => setNilai({ ...d, buka: d.buka === idx ? null : idx })}>
              <span>{a.nama || `Anggota ${idx + 1}`}</span><span className="text-base text-gray-500">{d.buka === idx ? "Tutup" : "Buka"}</span>
            </button>
            {d.buka === idx && (
              <div className="px-4 pb-4">
                <FormAnggota a={a} ubah={(x) => ubah(idx, x)} pertanyaan={tanyaWarga} />
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
  const anggota = d.isi.anggota.filter((a) => a.nama.trim().length >= 2);
  const defKk = new Map(tanyaKk.map((x) => [x.kunci, x]));
  return (
    <Langkah langkah={TOTAL} total={TOTAL} judul="Periksa lalu kirim" onKembali={() => set({ i: 3 })} labelLanjut="Kirim" memuat={mengirim}
      onLanjut={async () => { const r = await kirim(); if (r) selesai(r.kodeTerima); }}>
      <BarisRingkas label="Pengisi" nilai={`${d.isi.namaPengisi} (${d.isi.hubunganPengisi})`} />
      <BarisRingkas label="Anggota" nilai={`${anggota.length} orang`} />
      {Object.entries(saring(d.isi.rumahTangga, kunciKk)).map(([k, v]) => <BarisRingkas key={k} label={defKk.get(k)?.label ?? k} nilai={labelNilaiFakta(defKk.get(k), v)} />)}
      <div className="mt-4" />
      <IsianPanjang label="Catatan untuk pengurus RW (boleh kosong)" nilai={d.isi.catatan ?? ""} onChange={(v) => setIsi({ catatan: v })} />
      {error && <Pesan jenis="error">{error}</Pesan>}
    </Langkah>
  );
}

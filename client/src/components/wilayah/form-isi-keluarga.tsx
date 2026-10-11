import { Plus, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import { useDraft, useKirimSekali } from "@/lib/wilayah-api";
import { BarisRingkas, IsianPanjang, IsianTeks, Langkah, Pesan, PilihFakta, PilihTombol, TombolBesar } from "@/components/wilayah/ui";
import {
  HUBUNGAN_KELUARGA, berlakuUntukWarga, kelompokkan, labelNilaiFakta, umurTahun, isoTanggal,
  type DefinisiFakta, type IsiUsulan, type UsulanAnggota,
} from "@shared/wilayah";
import { looksLikeNik, normalizeNomorHp } from "@shared/kontak";

const anggotaKosong = (): UsulanAnggota => ({ nama: "", hubungan: "Anak", jenisKelamin: "Laki-laki", tanggalLahir: null, jawaban: {}, keterangan: "tetap" });

const LABEL_KETERANGAN: Record<string, string> = { tetap: "Tinggal di sini", baru: "Anggota baru", pindah: "Sudah pindah", meninggal: "Meninggal" };

/** Pesan galat nomor WA; `null` bila sah atau belum cukup panjang untuk dinilai. */
function galatNomorWa(v: string): string | null {
  const angka = v.replace(/\D/g, "");
  if (looksLikeNik(v)) return "Ini terlihat seperti NIK. Isi dengan nomor WhatsApp, contoh 0812 3456 7890.";
  if (angka.length < 10) return null;
  return normalizeNomorHp(v) ? null : "Nomor belum benar. Awali dengan 08 atau +62, panjang 10–13 angka.";
}
const nomorWaSah = (v: string) => !looksLikeNik(v) && normalizeNomorHp(v) !== null;

function Kelompok({ judul }: { judul: string }) {
  return <h3 className="mt-6 mb-3 text-sm font-bold uppercase tracking-wide text-[hsl(163,55%,22%)] border-b border-[hsl(163,55%,22%)]/20 pb-1 first:mt-0">{judul}</h3>;
}

function BagianRingkas({ judul, onUbah, children }: { judul: string; onUbah: () => void; children: ReactNode }) {
  return (
    <section className="mb-4 rounded-2xl border-2 border-gray-200 bg-white px-4 pb-2 pt-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-lg font-bold">{judul}</h3>
        <button type="button" onClick={onUbah} className="min-h-[44px] px-3 text-base font-semibold text-[hsl(163,55%,22%)] underline">Ubah</button>
      </div>
      {children}
    </section>
  );
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
      <IsianTeks label="Nama lengkap" wajib autoComplete="off" nilai={a.nama} onChange={(v) => ubah({ ...a, nama: v })}
        galat={a.nama.length > 0 && a.nama.trim().length < 2 ? "Nama minimal 2 huruf." : null} />
      <PilihTombol label="Hubungan dalam keluarga" belumTahu={false} nilai={a.hubungan} onChange={(v) => v && ubah({ ...a, hubungan: v })} pilihan={HUBUNGAN_KELUARGA.map((h) => ({ nilai: h, label: h }))} />
      <PilihTombol label="Jenis kelamin" belumTahu={false} nilai={a.jenisKelamin} onChange={(v) => v && ubah({ ...a, jenisKelamin: v as UsulanAnggota["jenisKelamin"] })}
        pilihan={[{ nilai: "Laki-laki", label: "Laki-laki" }, { nilai: "Perempuan", label: "Perempuan" }]} />
      <IsianTeks label="Tanggal lahir" tipe="date" nilai={a.tanggalLahir ?? ""} onChange={(v) => ubah({ ...a, tanggalLahir: v || null })} bantuan="Kosongkan bila tidak ingat. Pertanyaan menyesuaikan usia." />
      <PilihTombol label="Keterangan" belumTahu={false} nilai={a.keterangan ?? "tetap"} onChange={(v) => v && ubah({ ...a, keterangan: v as UsulanAnggota["keterangan"] })}
        pilihan={Object.entries(LABEL_KETERANGAN).map(([nilai, label]) => ({ nilai, label }))} />
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
const isiKosong = (): IsiUsulan => ({ versiForm: 1, namaPengisi: "", hubunganPengisi: "Kepala Keluarga", nomorHp: "", rumahTangga: {}, anggota: [{ ...anggotaKosong(), hubungan: "Kepala Keluarga" }], catatan: "" });
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
  const nomorWa = d.isi.nomorHp ?? "";
  const { kirim, mengirim, error } = useKirimSekali(async (kunci) => {
    const isi: IsiUsulan = {
      versiForm: 1,
      namaPengisi: d.isi.namaPengisi,
      hubunganPengisi: d.isi.hubunganPengisi,
      nomorHp: normalizeNomorHp(nomorWa) ?? nomorWa.trim(),
      catatan: d.isi.catatan?.trim() || null,
      rumahTangga: saring(d.isi.rumahTangga, kunciKk),
      anggota: d.isi.anggota.filter((a) => a.nama.trim().length >= 2).map((a) => ({ ...a, jawaban: saring(a.jawaban, kunciWarga) })),
    };
    const r = await kirimKe(isi, kunci);
    hapus();
    return r;
  });

  if (d.i === 1) {
    const namaOk = d.isi.namaPengisi.trim().length >= 2;
    const waOk = nomorWaSah(nomorWa);
    const lanjut = () => {
      const [pertama, ...lain] = d.isi.anggota;
      const isiKepala = lain.length === 0 && pertama && !pertama.nama.trim() && d.isi.hubunganPengisi === "Kepala Keluarga";
      set({
        i: 2,
        isi: isiKepala ? { ...d.isi, anggota: [{ ...pertama, nama: d.isi.namaPengisi.trim(), hubungan: "Kepala Keluarga" }] } : d.isi,
      });
    };
    return (
      <Langkah lengket langkah={1} total={TOTAL} judul="Siapa yang mengisi?" onKembali={batal} onLanjut={lanjut} bisaLanjut={namaOk && waOk}
        alasan={!namaOk ? "Isi nama Anda dulu." : "Isi nomor WhatsApp yang aktif untuk lanjut."}>
        {pembuka}
        <p className="mt-3 text-base text-gray-600">Isian tersimpan otomatis di HP ini. Bila terputus, buka lagi tautan atau kode yang sama.</p>
        <div className="mt-4" />
        <IsianTeks label={labelPengisi} wajib autoComplete="name" nilai={d.isi.namaPengisi} onChange={(v) => setIsi({ namaPengisi: v })} />
        <PilihTombol label="Hubungan dengan keluarga" belumTahu={false} nilai={d.isi.hubunganPengisi} onChange={(v) => v && setIsi({ hubunganPengisi: v })} pilihan={HUBUNGAN_KELUARGA.map((h) => ({ nilai: h, label: h }))} />
        <IsianTeks label="Nomor WhatsApp" wajib tipe="tel" inputMode="tel" autoComplete="tel" maks={20} nilai={nomorWa}
          onChange={(v) => setIsi({ nomorHp: v.replace(/[^\d+\s-]/g, "") })} placeholder="0812 3456 7890"
          bantuan="Pengurus RW menghubungi lewat nomor ini bila ada data yang perlu dicek. Jangan isi dengan NIK."
          galat={galatNomorWa(nomorWa)} />
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
    const terjawab = Object.keys(saring(d.isi.rumahTangga, kunciKk)).length;
    return (
      <Langkah lengket langkah={2} total={TOTAL} judul="Tentang keluarga & rumah" onKembali={() => set({ i: 1 })} onLanjut={() => set({ i: 3 })}>
        <p className="mb-1 text-base text-gray-600">Jawab yang Anda ketahui. Pilih “Belum tahu” bila ragu.</p>
        <p className="mb-4 text-base font-semibold text-[hsl(163,55%,22%)]">{terjawab} dari {tanyaKk.length} pertanyaan terjawab</p>
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
      <Langkah lengket langkah={3} total={TOTAL} judul="Anggota keluarga" onKembali={() => set({ i: 2 })} onLanjut={() => set({ i: 4 })}
        bisaLanjut={d.isi.anggota.some((a) => a.nama.trim().length >= 2)} alasan="Isi nama minimal satu anggota keluarga.">
        <p className="mb-4 text-base text-gray-600">Ketuk nama untuk membuka. Tulis semua orang yang tercatat di Kartu Keluarga.</p>
        {d.isi.anggota.map((a, idx) => {
          const terbuka = d.buka === idx;
          const ket = a.keterangan ?? "tetap";
          return (
            <div key={idx} className={`bg-white rounded-2xl border-2 mb-3 ${terbuka ? "border-[hsl(163,55%,22%)]" : "border-gray-200"}`}>
              <button type="button" aria-expanded={terbuka} className="w-full min-h-[64px] px-4 py-2 text-left flex justify-between items-center gap-3"
                onClick={() => setNilai({ ...d, buka: terbuka ? null : idx })}>
                <span className="min-w-0">
                  <span className={`block text-lg font-semibold truncate ${a.nama.trim() ? "" : "text-gray-500"}`}>{a.nama.trim() || `Anggota ${idx + 1} (belum diberi nama)`}</span>
                  <span className="block text-base text-gray-600">
                    {a.hubungan}
                    {ket !== "tetap" && <span className={`ml-2 rounded-md px-2 py-0.5 text-sm font-semibold ${ket === "baru" ? "bg-green-100 text-green-800" : "bg-gray-200 text-gray-700"}`}>{LABEL_KETERANGAN[ket]}</span>}
                  </span>
                </span>
                <span className="shrink-0 text-base font-semibold text-[hsl(163,55%,22%)]">{terbuka ? "Tutup" : "Buka"}</span>
              </button>
              {terbuka && (
                <div className="px-4 pb-4">
                  <FormAnggota a={a} ubah={(x) => ubah(idx, x)} pertanyaan={tanyaWarga} />
                  <div className="grid gap-3">
                    <TombolBesar varian="kedua" onClick={() => setNilai({ ...d, buka: null })}>Selesai, tutup</TombolBesar>
                    {d.isi.anggota.length > 1 && (
                      <TombolBesar varian="bahaya" ikon={<Trash2 className="w-5 h-5" />} onClick={() => setNilai({ ...d, buka: null, isi: { ...d.isi, anggota: d.isi.anggota.filter((_, n) => n !== idx) } })}>Hapus dari isian</TombolBesar>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {d.isi.anggota.length < 20 && (
          <TombolBesar varian="kedua" ikon={<Plus className="w-6 h-6" />} onClick={() => setNilai({ ...d, buka: d.isi.anggota.length, isi: { ...d.isi, anggota: [...d.isi.anggota, anggotaKosong()] } })}>Tambah anggota</TombolBesar>
        )}
      </Langkah>
    );
  }
  const anggota = d.isi.anggota.filter((a) => a.nama.trim().length >= 2);
  const tanpaNama = d.isi.anggota.length - anggota.length;
  const defKk = new Map(tanyaKk.map((x) => [x.kunci, x]));
  const jawabanKk = Object.entries(saring(d.isi.rumahTangga, kunciKk));
  const waOk = nomorWaSah(nomorWa);
  return (
    <Langkah lengket langkah={TOTAL} total={TOTAL} judul="Periksa lalu kirim" onKembali={() => set({ i: 3 })} labelLanjut="Kirim" memuat={mengirim}
      bisaLanjut={waOk && anggota.length > 0} alasan={!waOk ? "Nomor WhatsApp belum benar. Ketuk Ubah di bagian Pengisi." : "Isi nama minimal satu anggota keluarga."}
      onLanjut={async () => { const r = await kirim(); if (r) selesai(r.kodeTerima); }}>
      <p className="mb-4 text-base text-gray-600">Periksa sekali lagi. Ketuk <b>Ubah</b> bila ada yang salah.</p>
      <BagianRingkas judul="Pengisi" onUbah={() => set({ i: 1 })}>
        <BarisRingkas label="Nama" nilai={`${d.isi.namaPengisi} (${d.isi.hubunganPengisi})`} />
        <BarisRingkas label="WhatsApp" nilai={waOk ? normalizeNomorHp(nomorWa) : <span className="text-red-700">Belum benar</span>} />
      </BagianRingkas>
      <BagianRingkas judul={`Anggota (${anggota.length} orang)`} onUbah={() => set({ i: 3 })}>
        {anggota.map((a, n) => (
          <BarisRingkas key={n} label={a.hubungan} nilai={<>{a.nama}{(a.keterangan ?? "tetap") !== "tetap" && <span className="block text-sm font-normal text-gray-600">{LABEL_KETERANGAN[a.keterangan ?? "tetap"]}</span>}</>} />
        ))}
        {tanpaNama > 0 && <p className="py-2 text-base text-amber-800">{tanpaNama} anggota tanpa nama tidak ikut terkirim.</p>}
      </BagianRingkas>
      <BagianRingkas judul="Keluarga & rumah" onUbah={() => set({ i: 2 })}>
        {jawabanKk.length === 0
          ? <p className="py-2 text-base text-gray-600">Belum ada jawaban.</p>
          : jawabanKk.map(([k, v]) => <BarisRingkas key={k} label={defKk.get(k)?.label ?? k} nilai={labelNilaiFakta(defKk.get(k), v)} />)}
      </BagianRingkas>
      <IsianPanjang label="Catatan untuk pengurus RW (boleh kosong)" nilai={d.isi.catatan ?? ""} onChange={(v) => setIsi({ catatan: v })} />
      {error && <Pesan jenis="error">{error}</Pesan>}
    </Langkah>
  );
}

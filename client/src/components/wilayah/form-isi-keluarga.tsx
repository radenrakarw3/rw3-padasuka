import { CheckCircle2, Plus, Trash2 } from "lucide-react";
import { useState, type ReactNode } from "react";
import { useDraft, useKirimSekali } from "@/lib/wilayah-api";
import { BarisRingkas, HIJAU, IsianPanjang, IsianTeks, Langkah, Pesan, PilihFakta, PilihTombol, TombolBesar } from "@/components/wilayah/ui";
import {
  BANTUAN_STATUS_TINGGAL, HUBUNGAN_KELUARGA, berlakuUntukWarga, kelompokkan, labelNilaiFakta, umurTahun, isoTanggal,
  type DefinisiFakta, type IsiUsulan, type UsulanAnggota,
} from "@shared/wilayah";
import { looksLikeNik, normalizeNomorHp } from "@shared/kontak";

/** Ringkasan data yang sudah tercatat (dari `/api/isi/buka`). Tanpa NIK dan tanpa nilai jawaban. */
export interface KeluargaTercatat {
  anggota: { nama: string; hubungan: string; jenisKelamin: string | null; umur: number | null; adaTanggalLahir: boolean; terisi: string[] }[];
  terisiKk: string[];
  adaWa: boolean;
  kelengkapan: number;
  terjawab: number;
  pertanyaan: number;
}
type InfoAnggota = KeluargaTercatat["anggota"][number];

/** `idx` menunjuk anggota tercatat; tidak ikut terkirim. */
type AnggotaDraft = UsulanAnggota & { idx?: number };

const anggotaKosong = (keterangan: UsulanAnggota["keterangan"] = "tetap"): AnggotaDraft => ({ nama: "", hubungan: "Anak", jenisKelamin: "Laki-laki", tanggalLahir: null, jawaban: {}, keterangan });

const LABEL_KETERANGAN: Record<string, string> = { tetap: "Tinggal di sini", baru: "Anggota baru", pindah: "Sudah pindah", meninggal: "Meninggal" };
const KETERANGAN_TERCATAT = ["tetap", "pindah", "meninggal"];

/** Pesan galat nomor WA; `null` bila sah atau belum cukup panjang untuk dinilai. */
function galatNomorWa(v: string): string | null {
  const angka = v.replace(/\D/g, "");
  if (looksLikeNik(v)) return "Ini terlihat seperti NIK. Isi dengan nomor WhatsApp, contoh 0812 3456 7890.";
  if (angka.length < 10) return null;
  return normalizeNomorHp(v) ? null : "Nomor belum benar. Awali dengan 08 atau +62, panjang 10–13 angka.";
}
const nomorWaSah = (v: string) => !looksLikeNik(v) && normalizeNomorHp(v) !== null;

const HUBUNGAN_UTAMA = ["Kepala Keluarga", "Istri", "Suami", "Anak"];

/** Empat hubungan yang paling sering tampil dulu; sisanya dibuka lewat "Lainnya". */
function PilihHubungan({ label, nilai, onChange }: { label: string; nilai: string; onChange: (v: string) => void }) {
  const [semua, setSemua] = useState(() => !HUBUNGAN_UTAMA.includes(nilai));
  const daftar = semua ? HUBUNGAN_KELUARGA : HUBUNGAN_UTAMA;
  return (
    <div>
      <PilihTombol label={label} belumTahu={false} nilai={nilai} onChange={(v) => v && onChange(v)} pilihan={daftar.map((h) => ({ nilai: h, label: h }))} />
      {!semua && (
        <button type="button" onClick={() => setSemua(true)} className="-mt-3 mb-5 text-base font-semibold text-[hsl(163,55%,22%)] underline">
          Lainnya (menantu, cucu, orang tua, …)
        </button>
      )}
    </div>
  );
}

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

function SudahLengkap({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border-2 border-green-300 bg-green-50 px-4 py-3 text-green-900">
      <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0" />
      <p className="text-base">{children}</p>
    </div>
  );
}

/** Kartu kemajuan: kelengkapan data tercatat dan perkiraan setelah isian ini. */
function KartuKemajuan({ sekarang, nanti }: { sekarang: number; nanti: number }) {
  const persen = (x: number) => Math.round(Math.min(1, x) * 100);
  const a = persen(sekarang), b = persen(nanti);
  return (
    <div className="mb-4 rounded-2xl border-2 border-[hsl(163,55%,22%)]/25 bg-white px-4 py-3">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-base font-semibold">Kelengkapan data keluarga</p>
        <p className="text-lg font-bold" style={{ color: HIJAU }}>
          {a}%{b > a && <span className="text-[hsl(40,45%,40%)]"> → {b}%</span>}
        </p>
      </div>
      <div className="relative mt-2 h-3 overflow-hidden rounded-full bg-gray-200" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={b}>
        <div className="absolute inset-y-0 left-0 rounded-full bg-[hsl(40,45%,55%)] transition-all" style={{ width: `${b}%` }} />
        <div className="absolute inset-y-0 left-0 rounded-full transition-all" style={{ width: `${a}%`, backgroundColor: HIJAU }} />
      </div>
      <p className="mt-1 text-sm text-gray-600">
        {b >= 100 ? "Lengkap! Tinggal kirim." : b > a ? "Bagian emas = tambahan dari isian Anda." : "Data yang sudah tercatat tidak ditanyakan lagi."}
      </p>
    </div>
  );
}

/** Pertanyaan warga yang masih perlu diisi untuk satu anggota. */
function sisaAnggota(a: AnggotaDraft, info: InfoAnggota | undefined, pertanyaan: DefinisiFakta[]) {
  const umur = info?.umur ?? umurTahun(a.tanggalLahir, isoTanggal(new Date()));
  const jk = info?.jenisKelamin ?? a.jenisKelamin;
  const terisi = new Set(info?.terisi ?? []);
  const tanya = pertanyaan.filter((d) => !terisi.has(d.kunci) && berlakuUntukWarga(d, { jenisKelamin: jk, umur }));
  const tanyaTanggal = !!info && !info.adaTanggalLahir;
  const kosong = tanya.filter((d) => a.jawaban[d.kunci] == null).length + (tanyaTanggal && !a.tanggalLahir ? 1 : 0);
  return { tanya, tanyaTanggal, kosong };
}

function FormAnggota({ a, ubah, pertanyaan, info }: { a: AnggotaDraft; ubah: (a: AnggotaDraft) => void; pertanyaan: DefinisiFakta[]; info?: InfoAnggota }) {
  const jawab = (k: string, v: string | null) => {
    const j = { ...a.jawaban };
    if (v == null) delete j[k];
    else j[k] = v;
    ubah({ ...a, jawaban: j });
  };
  const ket = a.keterangan ?? "tetap";
  const masihDiSini = ket === "tetap" || ket === "baru";

  if (info) {
    const { tanya, tanyaTanggal } = sisaAnggota(a, info, pertanyaan);
    return (
      <div>
        <PilihTombol label="Keterangan" belumTahu={false} nilai={ket} onChange={(v) => v && ubah({ ...a, keterangan: v as UsulanAnggota["keterangan"] })}
          pilihan={KETERANGAN_TERCATAT.map((nilai) => ({ nilai, label: LABEL_KETERANGAN[nilai] }))} />
        {masihDiSini && (
          tanya.length === 0 && !tanyaTanggal
            ? <SudahLengkap>Data {a.nama.split(" ")[0]} sudah lengkap. Tidak perlu diisi lagi.</SudahLengkap>
            : (
              <>
                {tanyaTanggal && (
                  <IsianTeks label="Tanggal lahir" tipe="date" nilai={a.tanggalLahir ?? ""} onChange={(v) => ubah({ ...a, tanggalLahir: v || null })} bantuan="Belum tercatat. Kosongkan bila tidak ingat." />
                )}
                {kelompokkan(tanya).map((g) => (
                  <div key={g.kelompok}>
                    <Kelompok judul={g.kelompok} />
                    {g.daftar.map((d) => <PilihFakta key={d.kunci} kunci={d.kunci} def={d} nilai={a.jawaban[d.kunci] ?? null} onChange={(v) => jawab(d.kunci, v)} />)}
                  </div>
                ))}
              </>
            )
        )}
      </div>
    );
  }

  const umur = umurTahun(a.tanggalLahir, isoTanggal(new Date()));
  const berlaku = pertanyaan.filter((d) => berlakuUntukWarga(d, { jenisKelamin: a.jenisKelamin, umur }));
  return (
    <div>
      <IsianTeks label="Nama lengkap" wajib autoComplete="off" nilai={a.nama} onChange={(v) => ubah({ ...a, nama: v })}
        galat={a.nama.length > 0 && a.nama.trim().length < 2 ? "Nama minimal 2 huruf." : null} />
      <PilihHubungan label="Hubungan dalam keluarga" nilai={a.hubungan} onChange={(v) => ubah({ ...a, hubungan: v })} />
      <PilihTombol label="Jenis kelamin" belumTahu={false} nilai={a.jenisKelamin} onChange={(v) => v && ubah({ ...a, jenisKelamin: v as UsulanAnggota["jenisKelamin"] })}
        pilihan={[{ nilai: "Laki-laki", label: "Laki-laki" }, { nilai: "Perempuan", label: "Perempuan" }]} />
      <IsianTeks label="Tanggal lahir" tipe="date" nilai={a.tanggalLahir ?? ""} onChange={(v) => ubah({ ...a, tanggalLahir: v || null })} bantuan="Kosongkan bila tidak ingat. Pertanyaan menyesuaikan usia." />
      <PilihTombol label="Keterangan" belumTahu={false} nilai={ket} onChange={(v) => v && ubah({ ...a, keterangan: v as UsulanAnggota["keterangan"] })}
        pilihan={Object.entries(LABEL_KETERANGAN).map(([nilai, label]) => ({ nilai, label }))} />
      {masihDiSini
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

interface Draft { i: number; isi: Omit<IsiUsulan, "anggota"> & { anggota: AnggotaDraft[] }; buka: number | null }
const isiKosong = (): Draft["isi"] => ({ versiForm: 1, namaPengisi: "", hubunganPengisi: "Kepala Keluarga", nomorHp: "", rumahTangga: {}, anggota: [{ ...anggotaKosong(), hubungan: "Kepala Keluarga" }], catatan: "" });
const isiDariTercatat = (k: KeluargaTercatat): Draft["isi"] => ({
  ...isiKosong(),
  anggota: k.anggota.map((a, idx) => ({
    nama: a.nama, hubungan: a.hubungan, jenisKelamin: (a.jenisKelamin ?? "Laki-laki") as UsulanAnggota["jenisKelamin"],
    tanggalLahir: null, jawaban: {}, keterangan: "tetap", idx,
  })),
});
const TOTAL = 4;

/** Ambil hanya jawaban untuk pertanyaan yang masih berlaku (draft lama bisa memuat kunci yang sudah dihapus). */
function saring(jawaban: Record<string, string>, kunci: Set<string>) {
  return Object.fromEntries(Object.entries(jawaban).filter(([k]) => kunci.has(k)));
}

/**
 * Formulir pendataan keluarga 4 langkah sesuai standar data RW 03.
 * Bila `keluarga` diberikan (mode lengkapi), anggota tercatat sudah tampil dan hanya data yang belum ada yang ditanyakan.
 * Hasilnya selalu berupa usulan yang diperiksa pengurus RW sebelum data resmi berubah.
 */
export function FormIsiKeluarga({ draftKey, pembuka, pertanyaan: pertanyaanMentah, keluarga, labelPengisi = "Nama Anda", kirimKe, selesai, batal }: {
  draftKey: string;
  pembuka: React.ReactNode;
  pertanyaan: DefinisiFakta[];
  keluarga?: KeluargaTercatat | null;
  labelPengisi?: string;
  kirimKe: (isi: IsiUsulan, kunci: string) => Promise<{ kodeTerima: string }>;
  selesai: (kode: string) => void;
  batal?: () => void;
}) {
  const tercatat = keluarga && keluarga.anggota.length ? keluarga : null;
  const { nilai: draft, setNilai, hapus } = useDraft<Draft>(draftKey, { i: 1, isi: tercatat ? isiDariTercatat(tercatat) : isiKosong(), buka: tercatat ? null : 0 });
  const d = draft.i > TOTAL ? { ...draft, i: TOTAL } : draft;
  const set = (p: Partial<Draft>) => { setNilai({ ...d, ...p }); window.scrollTo(0, 0); };
  const setIsi = (p: Partial<Draft["isi"]>) => setNilai({ ...d, isi: { ...d.isi, ...p } });
  const pertanyaan = pertanyaanMentah.map((x) => (x.kunci === "s_status_tinggal" && !x.bantuan ? { ...x, bantuan: BANTUAN_STATUS_TINGGAL } : x));
  const tanyaWarga = pertanyaan.filter((x) => x.subjek === "warga");
  const terisiKk = new Set(tercatat?.terisiKk ?? []);
  const semuaKk = pertanyaan.filter((x) => x.subjek === "kk");
  const tanyaKk = semuaKk.filter((x) => !terisiKk.has(x.kunci));
  const kunciKk = new Set(tanyaKk.map((x) => x.kunci));
  const kunciWarga = new Set(tanyaWarga.map((x) => x.kunci));
  const nomorWa = d.isi.nomorHp ?? "";
  const infoDari = (a: AnggotaDraft) => (tercatat && a.idx != null ? tercatat.anggota[a.idx] : undefined);

  const kemajuan = (() => {
    if (!tercatat || !tercatat.pertanyaan) return null;
    let tambah = Object.keys(saring(d.isi.rumahTangga, kunciKk)).length + (!tercatat.adaWa && nomorWaSah(nomorWa) ? 1 : 0);
    for (const a of d.isi.anggota) {
      const info = infoDari(a);
      if (!info || (a.keterangan ?? "tetap") !== "tetap") continue;
      const { tanya, tanyaTanggal } = sisaAnggota(a, info, tanyaWarga);
      tambah += tanya.filter((q) => a.jawaban[q.kunci] != null).length + (tanyaTanggal && a.tanggalLahir ? 1 : 0);
    }
    return <KartuKemajuan sekarang={tercatat.kelengkapan} nanti={(tercatat.terjawab + tambah) / tercatat.pertanyaan} />;
  })();

  const { kirim, mengirim, error } = useKirimSekali(async (kunci) => {
    const isi: IsiUsulan = {
      versiForm: 1,
      namaPengisi: d.isi.namaPengisi,
      hubunganPengisi: d.isi.hubunganPengisi,
      nomorHp: normalizeNomorHp(nomorWa) ?? nomorWa.trim(),
      catatan: d.isi.catatan?.trim() || null,
      rumahTangga: saring(d.isi.rumahTangga, kunciKk),
      anggota: d.isi.anggota.filter((a) => a.nama.trim().length >= 2).map(({ idx: _idx, ...a }) => ({ ...a, jawaban: saring(a.jawaban, kunciWarga) })),
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
      const isiKepala = !tercatat && lain.length === 0 && pertama && !pertama.nama.trim() && d.isi.hubunganPengisi === "Kepala Keluarga";
      set({
        i: 2,
        isi: isiKepala ? { ...d.isi, anggota: [{ ...pertama, nama: d.isi.namaPengisi.trim(), hubungan: "Kepala Keluarga" }] } : d.isi,
      });
    };
    return (
      <Langkah lengket langkah={1} total={TOTAL} judul="Siapa yang mengisi?" onKembali={batal} onLanjut={lanjut} bisaLanjut={namaOk && waOk}
        alasan={!namaOk ? "Isi nama Anda dulu." : "Isi nomor WhatsApp yang aktif untuk lanjut."}>
        {pembuka}
        {tercatat && (
          <div className="mt-3">
            {kemajuan}
            <p className="text-base text-gray-700">Keluarga ini sudah tercatat dengan <b>{tercatat.anggota.length} anggota</b>. Anda cukup <b>melengkapi yang belum ada</b> — data yang sudah tercatat tidak ditanyakan lagi.</p>
          </div>
        )}
        <div className="mt-4" />
        <IsianTeks label={labelPengisi} wajib autoComplete="name" nilai={d.isi.namaPengisi} onChange={(v) => setIsi({ namaPengisi: v })} />
        <PilihHubungan label="Anda di keluarga ini sebagai" nilai={d.isi.hubunganPengisi} onChange={(v) => setIsi({ hubunganPengisi: v })} />
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
    const sudahAda = semuaKk.length - tanyaKk.length;
    return (
      <Langkah lengket langkah={2} total={TOTAL} judul="Tentang keluarga & rumah" onKembali={() => set({ i: 1 })} onLanjut={() => set({ i: 3 })}>
        {kemajuan}
        {tanyaKk.length === 0 ? (
          <SudahLengkap>Data keluarga & rumah sudah lengkap. Langsung lanjut ke anggota keluarga.</SudahLengkap>
        ) : (
          <>
            <p className="mb-1 text-base text-gray-600">Jawab yang Anda ketahui saja. Yang ragu boleh dilewati.</p>
            {sudahAda > 0 && <p className="mb-1 text-base text-green-800">✓ {sudahAda} pertanyaan sudah terisi dari data sebelumnya — tidak ditanyakan lagi.</p>}
            <p className="mb-4 text-base font-semibold text-[hsl(163,55%,22%)]">{terjawab} dari {tanyaKk.length} pertanyaan terjawab</p>
            {kelompokkan(tanyaKk).map((g) => (
              <div key={g.kelompok}>
                <Kelompok judul={g.kelompok} />
                {g.daftar.map((x) => <PilihFakta key={x.kunci} kunci={x.kunci} def={x} nilai={d.isi.rumahTangga[x.kunci] ?? null} onChange={(v) => jawab(x.kunci, v)} />)}
              </div>
            ))}
          </>
        )}
      </Langkah>
    );
  }
  if (d.i === 3) {
    const ubah = (idx: number, a: AnggotaDraft) => setIsi({ anggota: d.isi.anggota.map((x, n) => (n === idx ? a : x)) });
    return (
      <Langkah lengket langkah={3} total={TOTAL} judul="Anggota keluarga" onKembali={() => set({ i: 2 })} onLanjut={() => set({ i: 4 })}
        bisaLanjut={d.isi.anggota.some((a) => a.nama.trim().length >= 2)} alasan="Isi nama minimal satu anggota keluarga.">
        {kemajuan}
        <p className="mb-4 text-base text-gray-600">
          {tercatat
            ? "Anggota yang sudah tercatat tampil di bawah. Buka yang bertanda kuning untuk melengkapi. Tambahkan bila ada anggota baru."
            : "Ketuk nama untuk membuka. Tulis semua orang yang tercatat di Kartu Keluarga."}
        </p>
        {d.isi.anggota.map((a, idx) => {
          const terbuka = d.buka === idx;
          const ket = a.keterangan ?? "tetap";
          const info = infoDari(a);
          const sisa = info && (ket === "tetap") ? sisaAnggota(a, info, tanyaWarga).kosong : null;
          return (
            <div key={idx} className={`bg-white rounded-2xl border-2 mb-3 ${terbuka ? "border-[hsl(163,55%,22%)]" : "border-gray-200"}`}>
              <button type="button" aria-expanded={terbuka} className="w-full min-h-[64px] px-4 py-2 text-left flex justify-between items-center gap-3"
                onClick={() => setNilai({ ...d, buka: terbuka ? null : idx })}>
                <span className="min-w-0">
                  <span className={`block text-lg font-semibold truncate ${a.nama.trim() ? "" : "text-gray-500"}`}>{a.nama.trim() || `Anggota ${idx + 1} (belum diberi nama)`}</span>
                  <span className="flex flex-wrap items-center gap-2 text-base text-gray-600">
                    {a.hubungan}{info?.umur != null && ` · ${info.umur} th`}
                    {sisa === 0 && <span className="inline-flex items-center gap-1 rounded-md bg-green-100 px-2 py-0.5 text-sm font-semibold text-green-800"><CheckCircle2 className="h-4 w-4" />Lengkap</span>}
                    {sisa != null && sisa > 0 && <span className="rounded-md bg-amber-100 px-2 py-0.5 text-sm font-semibold text-amber-900">{sisa} belum diisi</span>}
                    {ket !== "tetap" && <span className={`rounded-md px-2 py-0.5 text-sm font-semibold ${ket === "baru" ? "bg-green-100 text-green-800" : "bg-gray-200 text-gray-700"}`}>{LABEL_KETERANGAN[ket]}</span>}
                  </span>
                </span>
                <span className="shrink-0 text-base font-semibold text-[hsl(163,55%,22%)]">{terbuka ? "Tutup" : "Buka"}</span>
              </button>
              {terbuka && (
                <div className="px-4 pb-4">
                  <FormAnggota a={a} ubah={(x) => ubah(idx, x)} pertanyaan={tanyaWarga} info={info} />
                  <div className="mt-3 grid gap-3">
                    <TombolBesar varian="kedua" onClick={() => setNilai({ ...d, buka: null })}>Selesai, tutup</TombolBesar>
                    {!info && d.isi.anggota.length > 1 && (
                      <TombolBesar varian="bahaya" ikon={<Trash2 className="w-5 h-5" />} onClick={() => setNilai({ ...d, buka: null, isi: { ...d.isi, anggota: d.isi.anggota.filter((_, n) => n !== idx) } })}>Hapus dari isian</TombolBesar>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {d.isi.anggota.length < 20 && (
          <TombolBesar varian="kedua" ikon={<Plus className="w-6 h-6" />}
            onClick={() => setNilai({ ...d, buka: d.isi.anggota.length, isi: { ...d.isi, anggota: [...d.isi.anggota, anggotaKosong(tercatat ? "baru" : "tetap")] } })}>
            {tercatat ? "Tambah anggota baru" : "Tambah anggota"}
          </TombolBesar>
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
      {kemajuan}
      <p className="mb-4 text-base text-gray-600">Periksa sekali lagi. Ketuk <b>Ubah</b> bila ada yang salah.</p>
      <BagianRingkas judul="Pengisi" onUbah={() => set({ i: 1 })}>
        <BarisRingkas label="Nama" nilai={`${d.isi.namaPengisi} (${d.isi.hubunganPengisi})`} />
        <BarisRingkas label="WhatsApp" nilai={waOk ? normalizeNomorHp(nomorWa) : <span className="text-red-700">Belum benar</span>} />
      </BagianRingkas>
      <BagianRingkas judul={`Anggota (${anggota.length} orang)`} onUbah={() => set({ i: 3 })}>
        {anggota.map((a, n) => {
          const ket = a.keterangan ?? "tetap";
          const info = infoDari(a);
          const diisi = Object.keys(saring(a.jawaban, kunciWarga)).length + (info && !info.adaTanggalLahir && a.tanggalLahir ? 1 : 0);
          const catatan = ket !== "tetap" ? LABEL_KETERANGAN[ket] : info ? (diisi ? `${diisi} data dilengkapi` : null) : null;
          return <BarisRingkas key={n} label={a.hubungan} nilai={<>{a.nama}{catatan && <span className="block text-sm font-normal text-gray-600">{catatan}</span>}</>} />;
        })}
        {tanpaNama > 0 && <p className="py-2 text-base text-amber-800">{tanpaNama} anggota tanpa nama tidak ikut terkirim.</p>}
      </BagianRingkas>
      <BagianRingkas judul="Keluarga & rumah" onUbah={() => set({ i: 2 })}>
        {jawabanKk.length === 0
          ? <p className="py-2 text-base text-gray-600">{tercatat && tanyaKk.length === 0 ? "Sudah lengkap sebelumnya." : "Belum ada jawaban."}</p>
          : jawabanKk.map(([k, v]) => <BarisRingkas key={k} label={defKk.get(k)?.label ?? k} nilai={labelNilaiFakta(defKk.get(k), v)} />)}
      </BagianRingkas>
      <IsianPanjang label="Catatan untuk pengurus RW (boleh kosong)" nilai={d.isi.catatan ?? ""} onChange={(v) => setIsi({ catatan: v })} />
      {error && <Pesan jenis="error">{error}</Pesan>}
    </Langkah>
  );
}

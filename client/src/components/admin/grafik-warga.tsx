import { useState } from "react";
import { useLocation } from "wouter";
import { ChevronRight, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DaftarWargaDialog } from "@/components/admin/daftar-warga-dialog";
import { jalurKelolaRt } from "@/pages/admin/kelola-warga/konteks";
import type { AngkaWarga, Jumlah, PilihanDaftar, RincianWarga } from "@shared/statistik-warga";
import { useStatistikWarga } from "./statistik-satu-pintu";

const HIJAU = "hsl(163,55%,22%)";
const EMAS = "hsl(40,45%,55%)";
const LAKI = "hsl(205,65%,45%)";
const PEREMPUAN = "hsl(340,60%,55%)";

const WARNA_KEGIATAN: Record<string, string> = {
  Bekerja: HIJAU,
  "Ibu Rumah Tangga": "hsl(340,50%,60%)",
  "Pelajar/Mahasiswa": "hsl(205,65%,45%)",
  "Bimbingan Orang Tua": "hsl(190,55%,60%)",
  Pensiun: "hsl(265,40%,58%)",
  "Belum/Tidak bekerja": "hsl(350,70%,52%)",
  "Belum diisi": "hsl(0,0%,75%)",
};

const angka = (n: number) => n.toLocaleString("id-ID");
const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0);
const desimal = (n: number | null) => (n == null ? "–" : n.toLocaleString("id-ID", { maximumFractionDigits: 1 }));
const rt2 = (rt: number) => `RT ${String(rt).padStart(2, "0")}`;

type Tab = "umur" | "pekerjaan" | "pendidikan" | "kelengkapan";
const TAB: { id: Tab; label: string }[] = [
  { id: "umur", label: "Umur" },
  { id: "pekerjaan", label: "Pekerjaan" },
  { id: "pendidikan", label: "Pendidikan" },
  { id: "kelengkapan", label: "Kelengkapan" },
];

function Chip({ aktif, onClick, children }: { aktif: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={aktif}
      className={`min-h-10 shrink-0 rounded-full border px-3.5 text-sm font-medium transition-colors sm:min-h-9 ${
        aktif ? "border-transparent text-white" : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
      }`}
      style={aktif ? { backgroundColor: HIJAU } : undefined}
    >
      {children}
    </button>
  );
}

function KartuIndeks({ label, nilai, ket, nada }: { label: string; nilai: string; ket: string; nada?: "baik" | "waspada" }) {
  return (
    <div className="min-w-0 rounded-2xl border border-gray-200 bg-white p-3">
      <p className="text-xs leading-tight text-gray-500">{label}</p>
      <p className={`mt-1 text-xl font-bold tabular-nums ${nada === "waspada" ? "text-rose-700" : nada === "baik" ? "text-emerald-700" : "text-gray-900"}`}>{nilai}</p>
      <p className="mt-0.5 text-[11px] leading-snug text-gray-500">{ket}</p>
    </div>
  );
}

type Buka = (p: PilihanDaftar) => void;

function BarisBatang({ data, total, warna = HIJAU, onPilih }: { data: Jumlah[]; total: number; warna?: string | ((label: string) => string); onPilih?: (label: string) => void }) {
  const maks = Math.max(1, ...data.map((d) => d.jumlah));
  if (!data.length) return <p className="py-6 text-center text-sm text-gray-500">Belum ada data.</p>;
  return (
    <ul className="space-y-1">
      {data.map((d) => (
        <li key={d.label}>
          <button type="button" onClick={() => onPilih?.(d.label)} disabled={!onPilih || !d.jumlah}
            className="group w-full rounded-lg px-1.5 py-1 text-left transition hover:bg-gray-50 disabled:cursor-default disabled:hover:bg-transparent">
            <div className="flex items-baseline justify-between gap-2 text-sm">
              <span className="min-w-0 truncate text-gray-700">{d.label}</span>
              <span className="flex shrink-0 items-center gap-1 tabular-nums font-semibold text-gray-900">
                {angka(d.jumlah)} <span className="text-xs font-normal text-gray-400">{pct(d.jumlah, total)}%</span>
                {onPilih && d.jumlah > 0 && <ChevronRight className="h-3.5 w-3.5 text-gray-300 group-hover:text-emerald-600" />}
              </span>
            </div>
            <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full"
                style={{ width: `${(d.jumlah / maks) * 100}%`, backgroundColor: typeof warna === "function" ? warna(d.label) : warna }}
              />
            </div>
          </button>
        </li>
      ))}
    </ul>
  );
}

function Piramida({ data, onPilih }: { data: RincianWarga["piramida"]; onPilih: Buka }) {
  const maks = Math.max(1, ...data.flatMap((d) => [d.laki, d.perempuan]));
  const baris = [...data].reverse();
  return (
    <div>
      <div className="mb-2 flex items-center justify-center gap-4 text-xs text-gray-600">
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: LAKI }} />Laki-laki</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: PEREMPUAN }} />Perempuan</span>
      </div>
      <div className="space-y-[3px]">
        {baris.map((d) => (
          <div key={d.label} className="grid grid-cols-[1fr_3.25rem_1fr] items-center gap-1.5 text-[11px]">
            <button type="button" disabled={!d.laki} onClick={() => onPilih({ kategori: "pita", nilai: `${d.label}|Laki-laki` })} aria-label={`Laki-laki umur ${d.label}: ${d.laki}`}
              className="flex items-center justify-end gap-1 rounded hover:bg-sky-50 disabled:hover:bg-transparent">
              <span className="tabular-nums text-gray-500">{d.laki || ""}</span>
              <div className="h-3.5 rounded-l-sm" style={{ width: `${(d.laki / maks) * 80}%`, backgroundColor: LAKI }} />
            </button>
            <button type="button" disabled={!d.laki && !d.perempuan} onClick={() => onPilih({ kategori: "pita", nilai: d.label })}
              className="rounded text-center tabular-nums text-gray-600 hover:bg-gray-100 disabled:hover:bg-transparent">{d.label}</button>
            <button type="button" disabled={!d.perempuan} onClick={() => onPilih({ kategori: "pita", nilai: `${d.label}|Perempuan` })} aria-label={`Perempuan umur ${d.label}: ${d.perempuan}`}
              className="flex items-center gap-1 rounded hover:bg-pink-50 disabled:hover:bg-transparent">
              <div className="h-3.5 rounded-r-sm" style={{ width: `${(d.perempuan / maks) * 80}%`, backgroundColor: PEREMPUAN }} />
              <span className="tabular-nums text-gray-500">{d.perempuan || ""}</span>
            </button>
          </div>
        ))}
      </div>
      <p className="mt-2 text-center text-[11px] text-gray-500">Kelompok umur (tahun) · ketuk batang untuk melihat daftar warganya</p>
    </div>
  );
}

function Kegiatan({ data, onPilih }: { data: Jumlah[]; onPilih: Buka }) {
  const total = data.reduce((s, d) => s + d.jumlah, 0);
  return (
    <div className="space-y-3">
      <div className="flex h-5 overflow-hidden rounded-full bg-gray-100" role="img" aria-label="Komposisi kegiatan utama warga">
        {data.map((d) => (
          <div key={d.label} title={`${d.label}: ${d.jumlah}`} style={{ width: `${(d.jumlah / Math.max(1, total)) * 100}%`, backgroundColor: WARNA_KEGIATAN[d.label] ?? EMAS }} />
        ))}
      </div>
      <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
        {data.map((d) => (
          <li key={d.label}>
            <button type="button" onClick={() => onPilih({ kategori: "kegiatan", nilai: d.label })} disabled={!d.jumlah}
              className="group flex w-full items-center gap-2 rounded-lg border border-transparent bg-gray-50 px-2.5 py-2 text-left text-sm transition hover:border-emerald-300 hover:bg-white">
              <span className="h-3 w-3 shrink-0 rounded-sm" style={{ backgroundColor: WARNA_KEGIATAN[d.label] ?? EMAS }} />
              <span className="min-w-0 flex-1 truncate text-gray-700">{d.label}</span>
              <span className="shrink-0 tabular-nums font-semibold">{angka(d.jumlah)}</span>
              <span className="w-9 shrink-0 text-right text-xs tabular-nums text-gray-400">{pct(d.jumlah, total)}%</span>
              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-gray-300 group-hover:text-emerald-600" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Kelengkapan({ data, rt, onPilih }: { data: RincianWarga["kelengkapan"]; rt?: number; onPilih: Buka }) {
  const [, go] = useLocation();
  return (
    <div className="space-y-3">
      <ul className="space-y-1">
        {data.map((d) => {
          const p = pct(d.terisi, d.total);
          const kosong = d.total - d.terisi;
          const warna = p >= 90 ? "hsl(152,55%,38%)" : p >= 70 ? EMAS : "hsl(350,70%,52%)";
          return (
            <li key={d.label}>
              <button type="button" disabled={!kosong} onClick={() => onPilih({ kategori: "kolomKosong", nilai: d.label })}
                className="group w-full rounded-lg px-1.5 py-1 text-left transition hover:bg-gray-50 disabled:cursor-default disabled:hover:bg-transparent">
                <div className="flex items-baseline justify-between gap-2 text-sm">
                  <span className="min-w-0 text-gray-700">{d.label}</span>
                  <span className="flex shrink-0 items-center gap-1 tabular-nums">
                    <span className="font-semibold">{p}%</span>
                    <span className="text-xs text-gray-400">{angka(d.terisi)}/{angka(d.total)}</span>
                    {kosong > 0 && <span className="rounded-full bg-rose-50 px-1.5 text-[11px] text-rose-700">{angka(kosong)} kosong</span>}
                    {kosong > 0 && <ChevronRight className="h-3.5 w-3.5 text-gray-300 group-hover:text-emerald-600" />}
                  </span>
                </div>
                <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-gray-100">
                  <div className="h-full rounded-full" style={{ width: `${p}%`, backgroundColor: warna }} />
                </div>
              </button>
            </li>
          );
        })}
      </ul>
      <p className="text-[11px] text-gray-500">Ketuk baris untuk melihat siapa yang belum mengisi, lalu kirim WA atau cetak QR agar dilengkapi.</p>
      {rt != null && (
        <Button variant="outline" size="sm" className="w-full sm:w-auto" onClick={() => go(jalurKelolaRt(rt, "/warga"))}>
          Lengkapi data {rt2(rt)}
        </Button>
      )}
    </div>
  );
}

/** Grafik & indeks warga (umur, pekerjaan, pendidikan, kelengkapan) dari statistik satu pintu. */
export function GrafikWarga({ rt: rtLuar, onPilihRt }: { rt?: number; onPilihRt?: (rt: number | undefined) => void }) {
  const { data } = useStatistikWarga();
  const [rtDalam, setRtDalam] = useState<number | undefined>();
  const rt = onPilihRt ? rtLuar : rtDalam;
  const setRt = onPilihRt ?? setRtDalam;
  const [tab, setTab] = useState<Tab>("umur");
  const [pilih, setPilih] = useState<PilihanDaftar | null>(null);

  if (!data?.rincian) return null;
  const rincian: RincianWarga = (rt != null && data.rincian.perRt[rt]) || data.rincian.total;
  const angkaFokus: AngkaWarga = (rt != null && data.perRt.find((r) => r.rt === rt)) || data.total;
  const jumlahKegiatan = rincian.kegiatan.reduce((s, d) => s + d.jumlah, 0);
  const jumlahBekerja = rincian.jenisPekerjaan.reduce((s, d) => s + d.jumlah, 0);
  const jumlahPendidikan = rincian.pendidikan.reduce((s, d) => s + d.jumlah, 0);
  const indeksData = Math.round(
    rincian.kelengkapan.reduce((s, k) => s + pct(k.terisi, k.total), 0) / Math.max(1, rincian.kelengkapan.length),
  );
  const { rasioKetergantungan, indeksPenuaan, rasioJenisKelamin, medianUmur } = rincian.indeks;

  return (
    <section className="space-y-4 rounded-3xl border border-gray-200 bg-gray-50/60 p-3 sm:p-4" data-testid="grafik-warga">
      <div>
        <h2 className="text-base font-bold sm:text-lg" style={{ color: HIJAU }}>Grafik & indeks warga</h2>
        <p className="flex items-start gap-1 text-xs text-gray-500">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Umur, pekerjaan, dan pendidikan {angka(angkaFokus.warga)} warga aktif {rt != null ? rt2(rt) : "RT 01–04"}.
        </p>
      </div>

      <div className="no-scrollbar -mx-3 flex gap-2 overflow-x-auto px-3 pb-1 sm:mx-0 sm:flex-wrap sm:px-0" role="group" aria-label="Pilih wilayah">
        <Chip aktif={rt == null} onClick={() => setRt(undefined)}>Semua RT</Chip>
        {data.perRt.map((r) => (
          <Chip key={r.rt} aktif={rt === r.rt} onClick={() => setRt(r.rt)}>{rt2(r.rt)}</Chip>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <KartuIndeks
          label="Rasio ketergantungan"
          nilai={desimal(rasioKetergantungan)}
          ket={rasioKetergantungan == null ? "Belum ada data umur" : `Tiap 100 usia 15–64 menanggung ${Math.round(rasioKetergantungan)} anak & lansia`}
          nada={rasioKetergantungan != null && rasioKetergantungan > 50 ? "waspada" : undefined}
        />
        <KartuIndeks
          label="Indeks penuaan"
          nilai={desimal(indeksPenuaan)}
          ket={indeksPenuaan == null ? "Belum ada anak 0–14" : `${Math.round(indeksPenuaan)} lansia 65+ per 100 anak 0–14`}
        />
        <KartuIndeks
          label="Rasio jenis kelamin"
          nilai={desimal(rasioJenisKelamin)}
          ket={rasioJenisKelamin == null ? "Belum ada data" : `${Math.round(rasioJenisKelamin)} laki-laki per 100 perempuan`}
        />
        <KartuIndeks label="Umur tengah (median)" nilai={medianUmur == null ? "–" : `${desimal(medianUmur)} th`} ket="Separuh warga lebih muda dari ini" />
        <KartuIndeks
          label="Tingkat pengangguran"
          nilai={`${angkaFokus.tingkatPengangguran}%`}
          ket={`${angka(angkaFokus.pengangguran)} dari ${angka(angkaFokus.angkatanKerjaEligible)} usia kerja 19–64`}
          nada={angkaFokus.tingkatPengangguran >= 10 ? "waspada" : undefined}
        />
        <KartuIndeks
          label="Indeks kelengkapan data"
          nilai={`${indeksData}%`}
          ket="Rata-rata kolom penting yang terisi"
          nada={indeksData >= 90 ? "baik" : indeksData < 70 ? "waspada" : undefined}
        />
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-3 sm:p-4">
        <div className="mb-4 grid grid-cols-2 gap-1 rounded-xl bg-gray-100 p-1 sm:flex" role="tablist" aria-label="Jenis grafik">
          {TAB.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={`min-h-10 flex-1 rounded-lg px-3 text-sm font-medium sm:min-h-9 ${tab === t.id ? "bg-white text-gray-900 shadow-sm" : "text-gray-600"}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "umur" && <Piramida data={rincian.piramida} onPilih={setPilih} />}

        {tab === "pekerjaan" && (
          <div className="space-y-5">
            <div>
              <h3 className="mb-2 text-sm font-semibold text-gray-900">Kegiatan utama warga</h3>
              <Kegiatan data={rincian.kegiatan} onPilih={setPilih} />
            </div>
            <div>
              <h3 className="mb-2 text-sm font-semibold text-gray-900">
                Jenis pekerjaan <span className="font-normal text-gray-500">· {angka(jumlahBekerja)} warga bekerja</span>
              </h3>
              <BarisBatang data={rincian.jenisPekerjaan} total={jumlahBekerja} onPilih={(l) => setPilih({ kategori: "pekerjaan", nilai: l })} />
            </div>
            <p className="text-[11px] text-gray-500">
              Total kegiatan {angka(jumlahKegiatan)} warga. «Belum/Tidak bekerja» mencakup semua usia; angka pengangguran resmi hanya usia 19–64.
            </p>
          </div>
        )}

        {tab === "pendidikan" && (
          <div>
            <h3 className="mb-2 text-sm font-semibold text-gray-900">
              Pendidikan terakhir <span className="font-normal text-gray-500">· usia 19+ ({angka(jumlahPendidikan)} warga)</span>
            </h3>
            <BarisBatang data={rincian.pendidikan} total={jumlahPendidikan} warna={(l) => (l === "Belum diisi" ? "hsl(0,0%,75%)" : EMAS)} onPilih={(l) => setPilih({ kategori: "pendidikan", nilai: l })} />
          </div>
        )}

        {tab === "kelengkapan" && <Kelengkapan data={rincian.kelengkapan} rt={rt} onPilih={setPilih} />}
      </div>
      <DaftarWargaDialog kategori={pilih} rtAwal={rt} onTutup={() => setPilih(null)} />
    </section>
  );
}
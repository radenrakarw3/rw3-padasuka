import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { CheckCircle2, ClipboardPen, Search } from "lucide-react";
import { wil } from "@/lib/wilayah-api";
import { useStandar } from "@/lib/standar";
import { Judul, Memuat, Pesan, TombolBesar, rt2 } from "@/components/wilayah/ui";
import { berlakuUntukWarga, kelompokkan, nilaiBanyak, type DefinisiFakta } from "@shared/wilayah";
import { useRtKelola } from "./konteks";

interface Fakta { kunci: string; nilai: string; statusVerifikasi: string }
interface Anggota { id: number; nama: string; jenisKelamin: string; umur: number | null; kedudukan: string; status: string; fakta: Fakta[] }
interface Detail { kk: { id: number; rt: number; alamat: string }; anggota: Anggota[]; fakta: Fakta[]; jawabanInduk?: Record<string, string>; qr: { kodeKartu: string } | null }
type Nilai = Record<string, string | null>;

const HIJAU = "hsl(163,55%,22%)";

/** Pilihan ringkas satu baris, bisa dipakai dengan Tab + Spasi/Enter. */
function Jawab({ def, nilai, onChange }: { def: DefinisiFakta; nilai: string | null; onChange: (v: string | null) => void }) {
  if (def.tipe === "angka" || def.tipe === "teks") {
    return (
      <input value={nilai ?? ""} inputMode={def.tipe === "angka" ? "numeric" : "text"} maxLength={def.tipe === "angka" ? 6 : 200}
        onChange={(e) => onChange(e.target.value.trim() === "" ? null : def.tipe === "angka" ? e.target.value.replace(/\D/g, "") : e.target.value)}
        className="w-full max-w-sm rounded-lg border px-3 py-1.5 text-base" placeholder="Kosongkan bila tidak diisi" />
    );
  }
  const pilihan = def.tipe === "yatidak" ? [{ nilai: "ya", label: "Ya" }, { nilai: "tidak", label: "Tidak" }] : def.pilihan ?? [];
  const terpilih = new Set(def.tipe === "banyak" ? nilaiBanyak(nilai) : nilai ? [nilai] : []);
  const tekan = (v: string) => {
    if (def.tipe !== "banyak") return onChange(terpilih.has(v) ? null : v);
    const eksklusif = v === "tidak_ada" || v === "tidak";
    let baru = new Set(terpilih);
    if (baru.has(v)) baru.delete(v);
    else if (eksklusif) baru = new Set([v]);
    else { baru.delete("tidak_ada"); baru.delete("tidak"); baru.add(v); }
    const urut = pilihan.map((p) => p.nilai).filter((x) => baru.has(x));
    onChange(urut.length ? urut.join(",") : null);
  };
  return (
    <div className="flex flex-wrap gap-1.5">
      {pilihan.map((p) => {
        const on = terpilih.has(p.nilai);
        return (
          <button key={p.nilai} type="button" onClick={() => tekan(p.nilai)} aria-pressed={on}
            className={`rounded-lg border px-2.5 py-1 text-sm font-medium transition-colors ${on ? "text-white" : "bg-white hover:bg-gray-50"}`}
            style={on ? { backgroundColor: HIJAU, borderColor: HIJAU } : undefined}>
            {p.label}
          </button>
        );
      })}
    </div>
  );
}

function Bagian({ judul, sub, defs, prefix, nilai, awal, set }: {
  judul: string; sub?: string; defs: DefinisiFakta[]; prefix: string; nilai: Nilai; awal: Nilai; set: (k: string, v: string | null) => void;
}) {
  return (
    <section className="rounded-2xl border bg-white p-4">
      <p className="text-base font-bold">{judul}</p>
      {sub && <p className="text-sm text-gray-600">{sub}</p>}
      {kelompokkan(defs).map((g) => (
        <div key={g.kelompok} className="mt-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{g.kelompok}</p>
          <div className="mt-1 divide-y">
            {g.daftar.map((d) => {
              const k = `${prefix}:${d.kunci}`;
              const berubah = (awal[k] ?? null) !== (nilai[k] ?? null);
              return (
                <div key={d.kunci} className={`grid gap-1.5 py-2 sm:grid-cols-[11rem_1fr] ${berubah ? "bg-amber-50/70" : ""}`}>
                  <p className="text-sm font-medium text-gray-800">{d.label}{berubah && <span className="ml-1 text-xs text-amber-700">· diubah</span>}</p>
                  <Jawab def={d} nilai={nilai[k] ?? null} onChange={(v) => set(k, v)} />
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </section>
  );
}

function awalDari(d: Detail): Nilai {
  const out: Nilai = { ...d.jawabanInduk };
  for (const f of d.fakta) out[`kk:${d.kk.id}:${f.kunci}`] = f.nilai;
  for (const a of d.anggota) for (const f of a.fakta) out[`warga:${a.id}:${f.kunci}`] = f.nilai;
  return out;
}

export default function InputKertas() {
  const [, go] = useLocation();
  const params = new URLSearchParams(useSearch());
  const rt = useRtKelola();
  const { data: standar } = useStandar();
  const [kode, setKode] = useState("");
  const [kkId, setKkId] = useState<number | null>(Number(params.get("kk")) || null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [nilai, setNilai] = useState<Nilai>({});
  const [err, setErr] = useState<string | null>(null);
  const [memuat, setMemuat] = useState(false);
  const [menyimpan, setMenyimpan] = useState(false);
  const [terakhir, setTerakhir] = useState<string | null>(null);
  const inputKode = useRef<HTMLInputElement>(null);

  const awal = useMemo(() => (detail ? awalDari(detail) : {}), [detail]);

  useEffect(() => {
    if (!kkId) return;
    let batal = false;
    setMemuat(true);
    setErr(null);
    wil<Detail>(`/api/wilayah/keluarga/${kkId}`)
      .then((d) => { if (!batal) { setDetail(d); setNilai(awalDari(d)); } })
      .catch((e) => !batal && setErr((e as Error).message))
      .finally(() => !batal && setMemuat(false));
    return () => { batal = true; };
  }, [kkId]);

  const cari = async () => {
    const k = kode.trim().toUpperCase();
    if (!k) return;
    setErr(null);
    setTerakhir(null);
    try {
      const r = await wil<{ kkId: number }>(`/api/wilayah/rt/kartu/${encodeURIComponent(k)}`);
      setKkId(r.kkId);
    } catch (e) {
      setErr((e as Error).message);
    }
  };

  const ulang = () => {
    setKkId(null);
    setDetail(null);
    setNilai({});
    setKode("");
    setTimeout(() => inputKode.current?.focus(), 0);
  };

  const perubahan = Object.keys(nilai).filter((k) => (awal[k] ?? null) !== (nilai[k] ?? null));
  const kepala = detail?.anggota.find((a) => a.kedudukan === "Kepala Keluarga")?.nama ?? detail?.anggota[0]?.nama ?? "Keluarga";

  const simpan = async () => {
    if (!detail || !perubahan.length) return;
    setMenyimpan(true);
    setErr(null);
    try {
      const catatan = `Formulir kertas${detail.qr ? ` ${detail.qr.kodeKartu}` : ""}`;
      const r = await wil<{ disimpan: number }>("/api/wilayah/rt/fakta/banyak", {
        body: perubahan.map((k) => {
          const [subjek, id, kunci] = k.split(":");
          return { subjek, subjekId: Number(id), kunci, nilai: nilai[k] ?? null, sumber: "formulir_kertas", catatan };
        }),
      });
      setTerakhir(`${r.disimpan} jawaban tersimpan untuk ${kepala}.`);
      ulang();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setMenyimpan(false);
    }
  };

  if (!standar) return <Memuat />;
  const defKk = standar.filter((d) => d.subjek === "kk");
  const defWarga = standar.filter((d) => d.subjek === "warga");
  const anggota = (detail?.anggota ?? []).filter((a) => !a.status || a.status === "Aktif");

  return (
    <div className="space-y-4">
      <Judul kembali={() => go("/warga")} sub={`${rt2(rt)} · urutan sama dengan formulir kertas`}>Input dari kertas</Judul>
      {terakhir && <Pesan jenis="sukses">{terakhir} Lanjut ke formulir berikutnya.</Pesan>}
      {!detail && (
        <div className="rounded-2xl border bg-white p-4">
          <label className="text-sm font-semibold" htmlFor="kode-kartu">Kode kartu (pojok kanan atas formulir)</label>
          <div className="mt-2 flex gap-2">
            <input id="kode-kartu" ref={inputKode} autoFocus value={kode} onChange={(e) => setKode(e.target.value.toUpperCase())}
              onKeyDown={(e) => { if (e.key === "Enter") cari(); }} placeholder={`RT${String(rt ?? 1).padStart(2, "0")}-XXXXX`}
              className="flex-1 rounded-xl border px-3 py-2 font-mono text-lg tracking-wider" />
            <button type="button" onClick={cari} className="inline-flex items-center gap-1 rounded-xl px-4 text-white" style={{ backgroundColor: HIJAU }}>
              <Search className="h-4 w-4" /> Cari
            </button>
          </div>
          <p className="mt-2 text-sm text-gray-600">Formulir tanpa kode (keluarga baru)? Tambahkan dulu di <button type="button" className="underline" onClick={() => go("/warga")}>Data warga & KK</button>, lalu buka keluarganya.</p>
        </div>
      )}
      {memuat && <Memuat />}
      {err && <Pesan jenis="error">{err}</Pesan>}
      {detail && (
        <>
          <div className="rounded-2xl border bg-white p-4">
            <p className="text-lg font-bold">{kepala}</p>
            <p className="text-sm text-gray-600">{rt2(detail.kk.rt)} · {detail.kk.alamat}{detail.qr ? ` · ${detail.qr.kodeKartu}` : ""}</p>
            <p className="mt-2 text-sm text-gray-600">
              Anggota pindah, meninggal, atau baru? Ubah di <button type="button" className="underline" onClick={() => go(`/keluarga/${detail.kk.id}`)}>halaman keluarga</button>.
            </p>
          </div>
          <Bagian judul="A. Keluarga & rumah" defs={defKk} prefix={`kk:${detail.kk.id}`} nilai={nilai} awal={awal} set={(k, v) => setNilai({ ...nilai, [k]: v })} />
          {anggota.map((a, i) => (
            <Bagian key={a.id} judul={`B${i + 1}. ${a.nama}`} sub={`${a.kedudukan} · ${a.jenisKelamin}${a.umur != null ? ` · ${a.umur} th` : ""}`}
              defs={defWarga.filter((d) => berlakuUntukWarga(d, { jenisKelamin: a.jenisKelamin, umur: a.umur }))}
              prefix={`warga:${a.id}`} nilai={nilai} awal={awal} set={(k, v) => setNilai({ ...nilai, [k]: v })} />
          ))}
          <div className="sticky bottom-3 z-10 flex flex-wrap items-center gap-2 rounded-2xl border bg-white/95 p-3 shadow-lg backdrop-blur">
            <p className="flex-1 text-sm text-gray-700">{perubahan.length ? `${perubahan.length} jawaban diubah` : "Belum ada perubahan"}</p>
            <button type="button" onClick={ulang} className="rounded-xl border px-4 py-2 text-sm">Batal</button>
            <TombolBesar ikon={perubahan.length ? <ClipboardPen className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />} memuat={menyimpan} onClick={perubahan.length ? simpan : ulang}>
              {perubahan.length ? "Simpan & lanjut" : "Tidak ada perubahan, lanjut"}
            </TombolBesar>
          </div>
        </>
      )}
    </div>
  );
}

import { useMemo } from "react";
import { labelNilaiFakta, isoTanggal } from "@shared/wilayah";
import { useDraft, useKirimSekali, wil } from "@/lib/wilayah-api";
import { defStandar } from "@/lib/standar";
import { BarisRingkas, IsianTeks, Langkah, PilihFakta, Pesan } from "./ui";

export interface LangkahFakta {
  judul: string;
  subjek: "warga" | "kk";
  /** Keterangan kecil di bawah judul langkah, mis. kelompok pertanyaan. */
  sub?: string;
  subjekId: number;
  kunci: string[];
}

type Nilai = Record<string, string | null>;

const k = (s: LangkahFakta, kunci: string) => `${s.subjek}:${s.subjekId}:${kunci}`;

/**
 * Form bertahap untuk mencatat fakta. Hanya jawaban yang berubah yang dikirim.
 * Draft tersimpan otomatis; dihapus setelah server mengonfirmasi.
 */
export function FormFakta({
  draftKey, langkah, awal, selesai, batal,
}: {
  draftKey: string; langkah: LangkahFakta[]; awal: Nilai; selesai: (jumlah: number) => void; batal: () => void;
}) {
  const { nilai: d, setNilai, hapus, adaDraft } = useDraft(draftKey, { i: 0, jawab: { ...awal } as Nilai, mulai: isoTanggal(new Date()) });
  const total = langkah.length + 1;
  const set = (p: Partial<typeof d>) => setNilai({ ...d, ...p });

  const perubahan = useMemo(() => {
    const out: { s: LangkahFakta; kunci: string; nilai: string | null }[] = [];
    for (const s of langkah) {
      for (const kunci of s.kunci) {
        const key = k(s, kunci);
        if (!(key in d.jawab)) continue;
        const v = d.jawab[key] ?? null;
        if ((awal[key] ?? null) !== v) out.push({ s, kunci, nilai: v });
      }
    }
    return out;
  }, [d.jawab, awal, langkah]);

  const { kirim, mengirim, error } = useKirimSekali(async () => {
    if (!perubahan.length) return { disimpan: 0 };
    const r = await wil<{ disimpan: number }>("/api/wilayah/rt/fakta/banyak", {
      body: perubahan.map((p) => ({ subjek: p.s.subjek, subjekId: p.s.subjekId, kunci: p.kunci, nilai: p.nilai, mulai: d.mulai })),
    });
    hapus();
    return r;
  });

  if (d.i < langkah.length) {
    const s = langkah[d.i];
    return (
      <div>
        {adaDraft && d.i === 0 && <div className="mb-4"><Pesan jenis="info">Melanjutkan isian yang belum selesai.</Pesan></div>}
        <Langkah langkah={d.i + 1} total={total} judul={s.judul} onKembali={d.i === 0 ? batal : () => set({ i: d.i - 1 })} onLanjut={() => set({ i: d.i + 1 })}>
          {s.sub && <p className="-mt-2 mb-4 text-base text-gray-600">{s.sub}</p>}
          {s.kunci.map((kunci) => (
            <PilihFakta key={kunci} kunci={kunci} nilai={d.jawab[k(s, kunci)] ?? null}
              onChange={(v) => set({ jawab: { ...d.jawab, [k(s, kunci)]: v } })} />
          ))}
        </Langkah>
      </div>
    );
  }

  return (
    <Langkah langkah={total} total={total} judul="Periksa sebelum menyimpan" onKembali={() => set({ i: d.i - 1 })}
      labelLanjut={perubahan.length ? "Simpan" : "Selesai"} memuat={mengirim}
      onLanjut={async () => {
        if (!perubahan.length) { hapus(); return selesai(0); }
        const r = await kirim();
        if (r) selesai(r.disimpan);
      }}>
      {perubahan.length === 0 && <Pesan>Tidak ada perubahan.</Pesan>}
      {perubahan.map((p) => {
        const def = defStandar(p.kunci);
        return <BarisRingkas key={k(p.s, p.kunci)} label={def?.label ?? p.kunci} nilai={labelNilaiFakta(def, p.nilai)} />;
      })}
      {perubahan.length > 0 && (
        <div className="mt-5">
          <IsianTeks label="Berlaku sejak tanggal" tipe="date" nilai={d.mulai} onChange={(v) => set({ mulai: v })} bantuan="Biarkan hari ini bila tidak tahu tanggal pastinya." />
        </div>
      )}
      {error && <div className="mt-4"><Pesan jenis="error">{error}</Pesan></div>}
    </Langkah>
  );
}

export function kunciAwal(subjek: string, subjekId: number, fakta: { kunci: string; nilai: string; statusVerifikasi: string }[]): Nilai {
  const out: Nilai = {};
  for (const f of fakta) if (f.statusVerifikasi === "terverifikasi") out[`${subjek}:${subjekId}:${f.kunci}`] = f.nilai;
  return out;
}

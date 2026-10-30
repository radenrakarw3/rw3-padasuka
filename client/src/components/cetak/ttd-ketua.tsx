import type { CSSProperties, ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { IDENTITAS_RW } from "@shared/surat-sakti/identitas";

export type StatusAtributKetua = {
  ttd: { ada: false } | { ada: true; gambar: string };
  cap: { ada: false } | { ada: true; gambar: string };
};

export const KUNCI_TTD_PUBLIK = ["/api/public/ketua-ttd"] as const;

export function useAtributKetuaPublik() {
  return useQuery<StatusAtributKetua>({
    queryKey: KUNCI_TTD_PUBLIK,
    queryFn: async () => {
      const res = await fetch("/api/public/ketua-ttd");
      if (!res.ok) return { ttd: { ada: false }, cap: { ada: false } };
      const j = await res.json();
      // Kompatibel dengan respons lama `{ ada, gambar }` bila ada cache lama.
      if (j && typeof j === "object" && "ttd" in j) return j as StatusAtributKetua;
      if (j?.ada && j.gambar) return { ttd: { ada: true, gambar: j.gambar }, cap: { ada: false } };
      return { ttd: { ada: false }, cap: { ada: false } };
    },
    staleTime: 5 * 60_000,
  });
}

/** @deprecated gunakan useAtributKetuaPublik */
export const useTtdKetuaPublik = useAtributKetuaPublik;

/** Ruang tanda tangan + cap Ketua RW dari unggahan Surat Sakti. */
export function RuangTtdKetua({ tinggi = "22mm", lebarMaks = "52mm" }: { tinggi?: string; lebarMaks?: string }) {
  const { data } = useAtributKetuaPublik();
  const ttd = data?.ttd.ada ? data.ttd.gambar : null;
  const cap = data?.cap.ada ? data.cap.gambar : null;
  return (
    <div className="relative flex items-center justify-center overflow-hidden" style={{ height: tinggi }}>
      {cap ? (
        <img
          src={cap}
          alt="Cap Ketua RW 03"
          style={{
            position: "absolute",
            left: "8%",
            maxHeight: "95%",
            maxWidth: "55%",
            objectFit: "contain",
            opacity: 0.92,
          }}
        />
      ) : null}
      {ttd ? (
        <img
          src={ttd}
          alt="Tanda tangan Ketua RW 03"
          style={{
            position: "relative",
            zIndex: 1,
            maxHeight: "100%",
            maxWidth: lebarMaks,
            objectFit: "contain",
            marginLeft: cap ? "12%" : 0,
          }}
        />
      ) : null}
    </div>
  );
}

type KolomTtd = {
  /** Label di atas ruang TTD, mis. "Pemohon," / "Ketua RW 03," */
  atas: string;
  /** Sub-label kecil di bawah atas (opsional), mis. jabatan panjang */
  atasSub?: string;
  /** Nama di bawah ruang TTD; kosong = garis titik untuk diisi tangan */
  nama?: string | null;
  /** Keterangan di bawah nama (jabatan lengkap) */
  keterangan?: string | null;
  /** Petunjuk kecil di bawah garis titik */
  petunjuk?: string;
  /** Isi ruang TTD kustom (mis. kotak meterai); default kosong / gambar Ketua */
  ruang?: ReactNode;
  /** Tampilkan gambar TTD + cap Ketua di ruang ini */
  ttdKetua?: boolean;
};

const huruf = (pt: number): CSSProperties => ({ fontSize: `${pt}pt` });

/**
 * Blok tanda tangan dua kolom ala surat resmi RW:
 * tempat-tanggal di kanan → label → ruang TTD tetap → nama digarisbawahi → jabatan.
 */
export function BlokTtdDuaKolom({
  kiri,
  kanan,
  tempatTanggal,
  tinggiRuang = "22mm",
  style,
}: {
  kiri: KolomTtd;
  kanan: KolomTtd;
  tempatTanggal?: string;
  tinggiRuang?: string;
  style?: CSSProperties;
}) {
  return (
    <div className="jaga flex justify-between" style={{ marginTop: "3mm", ...huruf(10.5), ...style }}>
      <Kolom kolom={kiri} tinggiRuang={tinggiRuang} tanggalAtas={null} />
      <Kolom
        kolom={kanan}
        tinggiRuang={tinggiRuang}
        tanggalAtas={tempatTanggal ?? `${IDENTITAS_RW.tempat}, ........................ 20.....`}
      />
    </div>
  );
}

function Kolom({
  kolom,
  tinggiRuang,
  tanggalAtas,
}: {
  kolom: KolomTtd;
  tinggiRuang: string;
  tanggalAtas: string | null;
}) {
  return (
    <div className="text-center" style={{ width: "46%" }}>
      <p style={{ minHeight: "5mm", lineHeight: 1.25 }}>{tanggalAtas ?? "\u00a0"}</p>
      <p style={{ lineHeight: 1.25 }}>{kolom.atas}</p>
      {kolom.atasSub ? <p style={{ ...huruf(8.5), lineHeight: 1.2 }}>{kolom.atasSub}</p> : null}
      {kolom.ruang != null ? (
        <div className="flex items-center justify-center" style={{ height: tinggiRuang }}>
          {kolom.ruang}
        </div>
      ) : kolom.ttdKetua ? (
        <RuangTtdKetua tinggi={tinggiRuang} />
      ) : (
        <div style={{ height: tinggiRuang }} />
      )}
      {kolom.nama ? (
        <p className="font-bold underline" style={{ lineHeight: 1.3 }}>
          {kolom.nama}
        </p>
      ) : (
        <p style={{ lineHeight: 1.3 }}>(........................................................)</p>
      )}
      {kolom.keterangan ? (
        <p style={{ ...huruf(8.5), lineHeight: 1.25, marginTop: "0.5mm" }}>{kolom.keterangan}</p>
      ) : null}
      {kolom.petunjuk ? <p style={{ ...huruf(8), lineHeight: 1.2 }}>{kolom.petunjuk}</p> : null}
    </div>
  );
}

/** Kolom kanan standar Ketua RW 03 (TTD + cap dari Surat Sakti). */
export function kolomKetuaRw(opsi?: { atas?: string }): KolomTtd {
  return {
    atas: opsi?.atas ?? "Ketua RW 03,",
    nama: IDENTITAS_RW.ketua.nama,
    keterangan: IDENTITAS_RW.ketua.jabatan,
    ttdKetua: true,
  };
}

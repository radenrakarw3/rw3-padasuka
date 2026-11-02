import { useMemo, type CSSProperties } from "react";
import { Printer } from "lucide-react";
import { ACTIVE_RT_NUMBERS } from "@shared/rt";
import { maskNik } from "@shared/kontak";
import { getWargaAge } from "@shared/warga-form-tier";
import { IDENTITAS_RW } from "@shared/surat-sakti/identitas";
import {
  ringkasKurang,
  type VerifikasiBaris,
} from "@shared/verifikasi-kelengkapan";
import { AlirF4, AreaCetak, GayaCetakF4, KopHemat, KotakCentang } from "@/components/cetak/lembar-f4";
import { Button } from "@/components/ui/button";
import { formatNumber } from "@/components/admin/kependudukan-stats-ui";

const sel: CSSProperties = {
  border: "1px solid #000",
  padding: "1.2mm 1.5mm",
  verticalAlign: "top",
};
const selKepala: CSSProperties = {
  ...sel,
  fontWeight: 700,
  background: "#f3f3f3",
  fontSize: "7.5pt",
};

function rtLabel(rt: number) {
  return `RT ${String(rt).padStart(2, "0")}`;
}

function tanggalPanjang() {
  return new Date().toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function LembarTanpaWa({ rt, baris }: { rt: number; baris: VerifikasiBaris[] }) {
  return (
    <AlirF4>
      <KopHemat kecil />
      <p style={{ fontSize: "12pt", fontWeight: 700, marginTop: "2mm" }}>
        FORMULIR ISIAN: WARGA TANPA KONTAK WHATSAPP · {rtLabel(rt)} / RW 03
      </p>
      <p style={{ fontSize: "8pt" }}>
        Dicetak {tanggalPanjang()} · {baris.length} orang · untuk diisi Ketua RT / petugas lapangan
      </p>
      <p style={{ fontSize: "8pt", marginTop: "1mm" }}>
        <b>Petunjuk:</b> Warga berikut belum punya nomor WhatsApp (diri sendiri maupun kepala keluarga).
        Isikan <i>No. WA</i> dan lengkapi data yang masih kosong di kolom isian. Centang{" "}
        <i>Selesai</i> bila sudah diinput ke sistem.
      </p>

      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "7.5pt", marginTop: "2mm" }}>
        <thead style={{ display: "table-header-group" }}>
          <tr>
            <td style={{ ...selKepala, width: "5mm" }}>No</td>
            <td style={{ ...selKepala, width: "28mm" }}>Nama / kedudukan</td>
            <td style={{ ...selKepala, width: "22mm" }}>NIK</td>
            <td style={{ ...selKepala, width: "6mm" }}>L/P</td>
            <td style={{ ...selKepala, width: "7mm" }}>Umur</td>
            <td style={{ ...selKepala, width: "28mm" }}>Alamat / No. KK</td>
            <td style={{ ...selKepala, minWidth: "28mm" }}>Data masih kurang</td>
            <td style={{ ...selKepala, width: "22mm" }}>No. WA (isi)</td>
            <td style={{ ...selKepala, width: "18mm" }}>Catatan / data lain</td>
            <td style={{ ...selKepala, width: "9mm", textAlign: "center" }}>Selesai</td>
          </tr>
        </thead>
        <tbody>
          {baris.map((b, i) => {
            const umur = getWargaAge(b.tanggalLahir);
            const jk =
              b.jenisKelamin === "Laki-laki" ? "L" : b.jenisKelamin === "Perempuan" ? "P" : "—";
            return (
              <tr key={b.id} className="jaga" style={{ height: "9mm" }}>
                <td style={sel}>{i + 1}</td>
                <td style={sel}>
                  <b>{b.namaLengkap}</b>
                  <span style={{ display: "block", fontSize: "6.5pt" }}>{b.kedudukanKeluarga}</span>
                </td>
                <td style={{ ...sel, fontFamily: "monospace", fontSize: "7pt" }}>
                  {maskNik(b.nik) || "—"}
                </td>
                <td style={{ ...sel, textAlign: "center" }}>{jk}</td>
                <td style={{ ...sel, textAlign: "center" }}>{umur ?? "?"}</td>
                <td style={sel}>
                  {b.alamat?.trim() || "—"}
                  {b.nomorKk ? (
                    <span style={{ display: "block", fontSize: "6.5pt", fontFamily: "monospace" }}>
                      KK {b.nomorKk}
                    </span>
                  ) : null}
                </td>
                <td style={{ ...sel, fontSize: "6.5pt" }}>{ringkasKurang(b, 5)}</td>
                <td style={sel} />
                <td style={sel} />
                <td style={{ ...sel, textAlign: "center" }}>
                  <KotakCentang teks="" />
                </td>
              </tr>
            );
          })}
          {Array.from({ length: 4 }).map((_, i) => (
            <tr key={`kosong-${i}`} className="jaga" style={{ height: "9mm" }}>
              <td style={sel}>{baris.length + i + 1}</td>
              {Array.from({ length: 9 }).map((__, j) => (
                <td key={j} style={sel} />
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <div
        className="jaga"
        style={{ display: "flex", justifyContent: "space-between", marginTop: "6mm", fontSize: "9pt" }}
      >
        <div style={{ width: "45%", textAlign: "center" }}>
          <p>Diisi / diverifikasi oleh,</p>
          <p>Ketua {rtLabel(rt)}</p>
          <div style={{ height: "14mm" }} />
          <p>( .................................................. )</p>
          <p style={{ fontSize: "8pt" }}>Tanggal: ........................</p>
        </div>
        <div style={{ width: "45%", textAlign: "center" }}>
          <p>Diterima untuk diinput,</p>
          <p>Admin RW 03</p>
          <div style={{ height: "14mm" }} />
          <p style={{ fontWeight: 700, textDecoration: "underline" }}>{IDENTITAS_RW.ketua.nama}</p>
        </div>
      </div>
      <p style={{ fontSize: "7pt", marginTop: "3mm" }}>
        Sumber: {IDENTITAS_RW.situs} · Verifikasi data · Warga tanpa kontak WhatsApp
      </p>
    </AlirF4>
  );
}

type Props = {
  rows: VerifikasiBaris[];
  /** Filter RT aktif di halaman (undefined = semua). */
  rtFilter?: number;
};

/** Akses cepat cetak formulir tanpa WA — pratinjau kertas disembunyikan di layar. */
export function VerifikasiTanpaWaCetak({ rows, rtFilter }: Props) {
  const perRt = useMemo(() => {
    const list =
      rtFilter == null ? rows : rows.filter((r) => r.rt === rtFilter);
    return ACTIVE_RT_NUMBERS.map((rt) => ({
      rt,
      baris: list.filter((r) => r.rt === rt).sort((a, b) => a.namaLengkap.localeCompare(b.namaLengkap, "id")),
    })).filter((x) => x.baris.length > 0);
  }, [rows, rtFilter]);

  const total = perRt.reduce((s, x) => s + x.baris.length, 0);
  if (total === 0) return null;

  const ringkasRt = perRt.map((x) => `${rtLabel(x.rt)} ${x.baris.length}`).join(" · ");

  return (
    <>
      <div className="print:hidden flex flex-wrap items-center gap-2 rounded-xl border border-amber-300/80 bg-amber-50/70 px-3 py-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-amber-950 leading-tight">
            Tanpa kontak WA · {formatNumber(total)} orang
          </p>
          <p className="text-[11px] text-amber-900/80 truncate" title={ringkasRt}>
            {ringkasRt}
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          className="shrink-0"
          onClick={() => window.print()}
        >
          <Printer className="mr-1.5 h-4 w-4" />
          Cetak formulir
        </Button>
      </div>

      {/* Hanya untuk printer — jangan tampilkan pratinjau F4 di layar (sangat panjang). */}
      <div className="hidden print:block">
        <GayaCetakF4 />
        <AreaCetak>
          {perRt.map(({ rt, baris }) => (
            <LembarTanpaWa key={rt} rt={rt} baris={baris} />
          ))}
        </AreaCetak>
      </div>
    </>
  );
}

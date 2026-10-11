import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Camera, Send, Smartphone } from "lucide-react";
import { KopHemat, LembarF4 } from "./lembar-f4";

const SITUS = "https://rw3padasukacimahi.org";

export type JenisPoster = "kost" | "kontrak" | "usaha" | "isi";

export const POSTER: Record<JenisPoster, { judul: string; sub: string; path: string; ajakan: string }> = {
  kost: { judul: "PENGHUNI KOST", sub: "Wajib lapor diri ke RW 03", path: "/visitrw3/pengajuan?jenis=kost", ajakan: "Daftar diri sebagai warga kost" },
  kontrak: { judul: "WARGA KONTRAKAN", sub: "Wajib lapor diri ke RW 03", path: "/visitrw3/pengajuan?jenis=kontrak", ajakan: "Daftar keluarga yang mengontrak" },
  usaha: { judul: "DAFTAR USAHA", sub: "Usaha, lapak & kiosk di RW 03", path: "/rw3biz/pengajuan", ajakan: "Daftarkan usaha Anda" },
  isi: { judul: "PERBARUI DATA KELUARGA", sub: "Pendataan warga RW 03", path: "/isi", ajakan: "Siapkan kode di kartu QR keluarga" },
};

function useQr(url: string) {
  const [svg, setSvg] = useState("");
  useEffect(() => {
    let batal = false;
    QRCode.toString(url, { type: "svg", errorCorrectionLevel: "M", margin: 1 }).then((s) => !batal && setSvg(s));
    return () => { batal = true; };
  }, [url]);
  return svg;
}

const TAMPIL: Record<JenisPoster, string> = { kost: "/visitrw3", kontrak: "/visitrw3", usaha: "/rw3biz", isi: "/isi" };
const tampilUrl = (jenis: JenisPoster) => `${SITUS.replace("https://", "")}${TAMPIL[jenis]}`;

function Langkah({ ikon, teks }: { ikon: React.ReactNode; teks: string }) {
  return (
    <div style={{ flex: 1, textAlign: "center" }}>
      <div style={{ width: "16mm", height: "16mm", border: "1.5px solid #000", borderRadius: "50%", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "center" }}>{ikon}</div>
      <p style={{ fontSize: "12pt", fontWeight: 700, marginTop: "2mm" }}>{teks}</p>
    </div>
  );
}

/** Poster satu lembar F4 untuk ditempel di pintu kost, kontrakan, warung, atau pos RW. */
export function PosterQr({ jenis, kontak }: { jenis: JenisPoster; kontak: string }) {
  const p = POSTER[jenis];
  const url = `${SITUS}${p.path}`;
  const svg = useQr(url);
  return (
    <LembarF4>
      <KopHemat />
      <div style={{ textAlign: "center", marginTop: "8mm" }}>
        <p style={{ fontSize: "34pt", fontWeight: 800, lineHeight: 1.05 }}>{p.judul}</p>
        <p style={{ fontSize: "16pt", marginTop: "2mm" }}>{p.sub}</p>
      </div>
      <div className="qr" style={{ width: "115mm", height: "115mm", margin: "8mm auto 0" }} dangerouslySetInnerHTML={{ __html: svg }} />
      <p style={{ textAlign: "center", fontSize: "13pt", fontWeight: 700, marginTop: "2mm" }}>{tampilUrl(jenis)}</p>
      <p style={{ textAlign: "center", fontSize: "12pt", marginTop: "1mm" }}>{p.ajakan}</p>
      <div className="flex gap-4" style={{ marginTop: "8mm" }}>
        <Langkah ikon={<Camera size={30} strokeWidth={1.5} />} teks="1. Buka kamera HP" />
        <Langkah ikon={<Smartphone size={30} strokeWidth={1.5} />} teks="2. Arahkan ke QR" />
        <Langkah ikon={<Send size={30} strokeWidth={1.5} />} teks="3. Isi & kirim" />
      </div>
      <div style={{ marginTop: "auto", border: "1.5px dashed #000", padding: "3mm 4mm", textAlign: "center" }}>
        <p style={{ fontSize: "12pt", fontWeight: 700 }}>Tidak punya HP / kesulitan mengisi?</p>
        <p style={{ fontSize: "11pt" }}>Minta formulir kertas ke pengurus RT/RW{jenis === "kost" || jenis === "kontrak" ? " atau pemilik kost/kontrakan" : ""}. Kami bantu isikan.</p>
        {kontak && <p style={{ fontSize: "12pt", fontWeight: 700, marginTop: "1mm" }}>{kontak}</p>}
      </div>
    </LembarF4>
  );
}

function Stiker({ jenis }: { jenis: JenisPoster }) {
  const p = POSTER[jenis];
  const svg = useQr(`${SITUS}${p.path}`);
  return (
    <div style={{ border: "1px dashed #000", padding: "4mm", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", boxSizing: "border-box" }}>
      <p style={{ fontSize: "8pt" }}>RW 03 PADASUKA</p>
      <p style={{ fontSize: "15pt", fontWeight: 800, lineHeight: 1.1 }}>{p.judul}</p>
      <p style={{ fontSize: "9pt" }}>{p.sub}</p>
      <div className="qr" style={{ width: "58mm", height: "58mm", marginTop: "2mm" }} dangerouslySetInnerHTML={{ __html: svg }} />
      <p style={{ fontSize: "8.5pt", fontWeight: 700, marginTop: "1mm" }}>{tampilUrl(jenis)}</p>
      <p style={{ fontSize: "8pt" }}>Scan dengan kamera HP</p>
    </div>
  );
}

/** Enam stiker per lembar F4 (2 x 3), potong di garis putus-putus. */
export function LembarStiker({ jenis }: { jenis: JenisPoster }) {
  return (
    <LembarF4>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gridTemplateRows: "repeat(3, 1fr)", height: "100%" }}>
        {Array.from({ length: 6 }).map((_, i) => <Stiker key={i} jenis={jenis} />)}
      </div>
    </LembarF4>
  );
}

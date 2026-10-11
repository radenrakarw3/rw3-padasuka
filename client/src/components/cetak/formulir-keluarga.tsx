import { forwardRef } from "react";
import { HUBUNGAN_KELUARGA, berlakuUntukWarga, isoTanggal, kelompokkan, nilaiBanyak, umurTahun, type DefinisiFakta } from "@shared/wilayah";
import { IDENTITAS_RW } from "@shared/surat-sakti/identitas";
import { SITUS_PENDEK } from "@shared/kertas";
import { AlirF4, Isian, KopHemat, KotakCentang, LembarF4 } from "./lembar-f4";

export interface AnggotaCetak { id: number; nama: string; hubungan: string | null; jenisKelamin: string | null; tanggalLahir: string | null }
export interface PaketKk {
  kkId: number; rt: number; kepala: string; alamatSingkat: string; kodeKartu: string; tokenTampil: string; url: string; qrSvg: string; berlakuSampai: string;
  anggota: AnggotaCetak[]; jawaban: Record<string, string>; kelengkapan: number;
}

const rt2 = (n: number) => `RT ${String(n).padStart(2, "0")}`;
const tglId = (iso: string | null | undefined) => {
  if (!iso) return "";
  const d = new Date(`${iso.slice(0, 10)}T00:00:00`);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
};

function Pertanyaan({ def, nilai }: { def: DefinisiFakta; nilai?: string }) {
  const terpilih = new Set(def.tipe === "banyak" ? nilaiBanyak(nilai) : nilai ? [nilai] : []);
  const pilihan = def.tipe === "yatidak" ? [{ nilai: "ya", label: "Ya" }, { nilai: "tidak", label: "Tidak" }] : def.pilihan ?? [];
  return (
    <div className="jaga" style={{ marginBottom: "1.6mm" }}>
      <p style={{ fontSize: "9pt" }}>
        <b>{def.label}.</b> {def.pertanyaan}
        {def.tipe === "banyak" && <i style={{ fontSize: "8pt" }}> (boleh lebih dari satu)</i>}
      </p>
      {def.tipe === "angka" || def.tipe === "teks"
        ? <p style={{ paddingLeft: "2mm", fontSize: "9pt" }}>{nilai ? <span>Saat ini: <b>{nilai}</b> · Ganti: </span> : null}<Isian lebar={nilai ? "45%" : "90%"} /></p>
        : <p style={{ paddingLeft: "2mm", fontSize: "8.5pt", lineHeight: 1.6 }}>{pilihan.map((p) => <KotakCentang key={p.nilai} teks={p.label} tercentang={terpilih.has(p.nilai)} />)}</p>}
    </div>
  );
}

function Daftar({ defs, jawab }: { defs: DefinisiFakta[]; jawab: (d: DefinisiFakta) => string | undefined }) {
  return (
    <>
      {kelompokkan(defs).map((g) => (
        <div key={g.kelompok}>
          <p className="jaga" style={{ fontSize: "9pt", fontWeight: 700, textDecoration: "underline", marginTop: "1.5mm" }}>{g.kelompok}</p>
          <div style={{ columnCount: 2, columnGap: "7mm" }}>{g.daftar.map((d) => <Pertanyaan key={d.kunci} def={d} nilai={jawab(d)} />)}</div>
        </div>
      ))}
    </>
  );
}

function BlokAnggota({ no, a, defs, jawaban }: { no: number; a?: AnggotaCetak; defs: DefinisiFakta[]; jawaban: Record<string, string> }) {
  const umur = a ? umurTahun(a.tanggalLahir, isoTanggal(new Date())) : null;
  const berlaku = a ? defs.filter((d) => berlakuUntukWarga(d, { jenisKelamin: a.jenisKelamin, umur })) : defs;
  return (
    <div style={{ borderTop: "1px solid #000", paddingTop: "1.5mm", marginTop: "2mm" }}>
      <div className="jaga">
        <p style={{ fontWeight: 700 }}>B{no}. {a ? a.nama : "ANGGOTA BARU / BELUM TERCATAT"}</p>
        {a ? (
          <>
            <p style={{ fontSize: "9pt" }}>{a.hubungan ?? "-"} · {a.jenisKelamin ?? "-"} · lahir {a.tanggalLahir ? tglId(a.tanggalLahir) : "-"}{umur != null ? ` (${umur} th)` : ""}</p>
            <p style={{ fontSize: "9pt" }}>
              Data di atas: <KotakCentang teks="Benar" /><KotakCentang teks="Perlu diperbaiki:" /><Isian lebar="38%" />
            </p>
            <p style={{ fontSize: "9pt" }}>Keterangan: <KotakCentang teks="Masih tinggal di sini" /><KotakCentang teks="Pindah" /><KotakCentang teks="Meninggal" /></p>
          </>
        ) : (
          <>
            <p style={{ fontSize: "9pt" }}><Isian label="Nama lengkap:" lebar="60%" /> <Isian label="Tgl lahir:" lebar="36%" /></p>
            <p style={{ fontSize: "9pt" }}>Hubungan: {HUBUNGAN_KELUARGA.slice(0, 6).map((h) => <KotakCentang key={h} teks={h} />)}</p>
            <p style={{ fontSize: "9pt" }}><KotakCentang teks="Laki-laki" /><KotakCentang teks="Perempuan" /> Keterangan: <KotakCentang teks="Baru lahir" /><KotakCentang teks="Pindah datang" /></p>
          </>
        )}
      </div>
      <Daftar defs={berlaku} jawab={(d) => (a ? jawaban[`warga:${a.id}:${d.kunci}`] : undefined)} />
    </div>
  );
}

/** Formulir data keluarga di F4. Dengan `paket`: data yang ada sudah tercetak/tercentang, warga cukup mengoreksi. */
export const FormulirKeluarga = forwardRef<HTMLDivElement, { defs: DefinisiFakta[]; paket?: PaketKk; anggotaKosong?: number }>(
  function FormulirKeluarga({ defs, paket, anggotaKosong }, ref) {
    const kk = defs.filter((d) => d.subjek === "kk" && d.diQr !== false);
    const warga = defs.filter((d) => d.subjek === "warga" && d.diQr !== false);
    const jawaban = paket?.jawaban ?? {};
    const kosong = anggotaKosong ?? (paket ? 1 : 5);
    return (
      <AlirF4>
        <div ref={ref}>
          <KopHemat kecil />
          <div className="flex items-start justify-between gap-3" style={{ marginTop: "2mm" }}>
            <div>
              <p style={{ fontSize: "13pt", fontWeight: 700 }}>FORMULIR DATA KELUARGA</p>
              {paket
                ? <p style={{ fontSize: "9.5pt" }}>Kepala keluarga: <b>{paket.kepala}</b> · {rt2(paket.rt)} / RW 03 · {paket.alamatSingkat}</p>
                : <p style={{ fontSize: "9.5pt" }}><Isian label="Kepala keluarga:" lebar="55%" /> RT ____ / RW 03 <Isian label="Alamat:" lebar="30%" /></p>}
            </div>
            <div style={{ border: "1.5px solid #000", padding: "1.5mm 3mm", textAlign: "center", minWidth: "40mm" }}>
              <p style={{ fontSize: "7.5pt" }}>KODE KARTU</p>
              <p style={{ fontSize: "12pt", fontWeight: 700, letterSpacing: "0.5px" }}>{paket?.kodeKartu ?? "RT__-_____"}</p>
            </div>
          </div>
          <p style={{ fontSize: "8.5pt", marginTop: "1.5mm", border: "1px dashed #000", padding: "1.5mm 2mm" }}>
            {paket
              ? <>Cara mengisi: tanda <b>✓</b> adalah data yang sudah kami catat. Bila salah, <b>coret</b> lalu centang yang benar. Kotak yang belum dicentang berarti belum ada data, mohon dicentang. Tidak perlu menulis NIK.</>
              : <>Cara mengisi: centang (✓) jawaban yang sesuai. Tulis dengan huruf cetak. Tidak perlu menulis NIK atau nomor KK.</>}
          </p>
          <p style={{ fontSize: "9pt", marginTop: "1.5mm" }}><Isian label="Diisi oleh:" lebar="42%" /> <Isian label="Hubungan:" lebar="24%" /> <Isian label="No. HP:" lebar="30%" /></p>

          <p style={{ fontWeight: 700, marginTop: "2.5mm" }}>A. KELUARGA & RUMAH</p>
          <Daftar defs={kk} jawab={(d) => jawaban[`kk:${paket?.kkId}:${d.kunci}`]} />

          <p className="jaga" style={{ fontWeight: 700, marginTop: "3mm" }}>B. ANGGOTA KELUARGA{paket ? " (sesuai data kami)" : ""}</p>
          {paket?.anggota.map((a, i) => <BlokAnggota key={a.id} no={i + 1} a={a} defs={warga} jawaban={jawaban} />)}
          {Array.from({ length: kosong }).map((_, i) => <BlokAnggota key={`k${i}`} no={(paket?.anggota.length ?? 0) + i + 1} defs={warga} jawaban={jawaban} />)}

          <div className="jaga" style={{ borderTop: "1px solid #000", marginTop: "3mm", paddingTop: "2mm", fontSize: "9pt" }}>
            <p><Isian label="Catatan / kebutuhan lain:" /></p>
            <p style={{ marginTop: "2mm" }}><Isian /></p>
            <div className="flex justify-between" style={{ marginTop: "4mm" }}>
              <div style={{ textAlign: "center", width: "45%" }}>
                <p>Pengisi,</p>
                <div style={{ height: "14mm" }} />
                <p>(..................................)</p>
              </div>
              <div style={{ textAlign: "center", width: "45%" }}>
                <p>Diterima pengurus, tgl ..........</p>
                <div style={{ height: "14mm" }} />
                <p>(..................................)</p>
              </div>
            </div>
            <p style={{ fontSize: "7.5pt", marginTop: "2mm" }}>Serahkan ke pengurus RT/RW 03. Data diperiksa pengurus RW sebelum dicatat. Data keluarga dijaga dan hanya untuk pelayanan warga RW 03.</p>
          </div>
        </div>
      </AlirF4>
    );
  },
);

/** Surat pemberitahuan per KK (halaman depan paket): cara isi lewat QR atau formulir di balik lembar ini. */
export function SuratPemberitahuan({ p, batas, kontak }: { p: PaketKk; batas: string; kontak: string }) {
  return (
    <LembarF4>
      <KopHemat />
      <p style={{ textAlign: "right", marginTop: "4mm" }}>{IDENTITAS_RW.tempat}, {tglId(isoTanggal(new Date()))}</p>
      <p style={{ marginTop: "2mm" }}>Kepada Yth.<br /><b style={{ fontSize: "12pt" }}>Bapak/Ibu {p.kepala}</b><br />{rt2(p.rt)} / RW 03 · {p.alamatSingkat}</p>
      <p style={{ textAlign: "center", fontSize: "13pt", fontWeight: 700, marginTop: "5mm", textDecoration: "underline" }}>PEMBERITAHUAN PENDATAAN KELUARGA</p>
      <div style={{ fontSize: "10.5pt", lineHeight: 1.5, marginTop: "4mm" }}>
        <p>Dengan hormat,</p>
        <p style={{ marginTop: "2mm", textAlign: "justify" }}>
          Pengurus RW 03 sedang memperbarui data keluarga agar bantuan, layanan kesehatan, dan kegiatan warga tepat sasaran.
          Mohon Bapak/Ibu memeriksa dan melengkapi data keluarga dengan <b>salah satu</b> cara berikut:
        </p>
      </div>
      <div className="flex gap-[6mm]" style={{ marginTop: "4mm" }}>
        <div style={{ flex: 1, border: "1.5px solid #000", padding: "3mm" }}>
          <p style={{ fontWeight: 700, fontSize: "11pt" }}>CARA 1 — Lewat HP</p>
          <ol style={{ listStyle: "decimal", paddingLeft: "5mm", fontSize: "10pt", lineHeight: 1.5 }}>
            <li>Buka kamera HP, arahkan ke kode QR.</li>
            <li>Ketuk tautan yang muncul.</li>
            <li>Jawab pertanyaan, lalu tekan <b>Kirim</b>.</li>
          </ol>
          <p style={{ fontSize: "9pt", marginTop: "2mm" }}>Tanpa scan: buka <b>{SITUS_PENDEK}/isi</b> lalu ketik kode:</p>
          <p style={{ fontSize: "12pt", fontWeight: 700, letterSpacing: "1px" }}>{p.tokenTampil}</p>
        </div>
        <div style={{ width: "58mm", textAlign: "center" }}>
          <div className="qr" style={{ width: "56mm", height: "56mm", margin: "0 auto" }} dangerouslySetInnerHTML={{ __html: p.qrSvg }} />
          <p style={{ fontSize: "8.5pt" }}>Kode kartu: <b>{p.kodeKartu}</b></p>
          <p style={{ fontSize: "7.5pt" }}>Berlaku s.d. {tglId(p.berlakuSampai)}</p>
        </div>
      </div>
      <div style={{ border: "1.5px solid #000", padding: "3mm", marginTop: "4mm" }}>
        <p style={{ fontWeight: 700, fontSize: "11pt" }}>CARA 2 — Isi formulir kertas</p>
        <p style={{ fontSize: "10pt", lineHeight: 1.5 }}>
          Balik lembar ini. Data yang sudah kami catat sudah tercetak; cukup periksa, coret yang salah, dan lengkapi yang kosong.
          Serahkan ke pengurus RT/RW paling lambat <b>{batas ? tglId(batas) : "................"}</b>. Pengurus siap membantu mengisi bila Bapak/Ibu kesulitan.
        </p>
      </div>
      <div style={{ fontSize: "9.5pt", marginTop: "4mm", lineHeight: 1.5 }}>
        <p>Data ini tidak memuat NIK maupun nomor KK, dan hanya dipakai untuk pelayanan warga RW 03. Jangan bagikan kode di atas ke orang lain.</p>
        {kontak && <p style={{ marginTop: "1mm" }}>Pertanyaan / bantuan: <b>{kontak}</b></p>}
      </div>
      <div className="flex justify-end" style={{ marginTop: "5mm" }}>
        <div style={{ textAlign: "center", width: "70mm" }}>
          <p>{IDENTITAS_RW.ketua.jabatan},</p>
          <div style={{ height: "18mm" }} />
          <p style={{ fontWeight: 700, textDecoration: "underline" }}>{IDENTITAS_RW.ketua.nama}</p>
        </div>
      </div>
      <div style={{ marginTop: "auto", borderTop: "1.5px dashed #000", paddingTop: "2.5mm", fontSize: "9pt" }}>
        <p style={{ fontSize: "7.5pt", textAlign: "center" }}>✂ potong di sini — bukti untuk warga</p>
        <div className="flex justify-between" style={{ marginTop: "1.5mm" }}>
          <p>BUKTI FORMULIR DITERIMA · Kode <b>{p.kodeKartu}</b> · {p.kepala}</p>
          <p>Tgl: ............ Paraf: ............</p>
        </div>
      </div>
    </LembarF4>
  );
}

/** Kartu QR setengah F4 (2 kartu per lembar). */
export function KartuQr({ k }: { k: Pick<PaketKk, "rt" | "kepala" | "alamatSingkat" | "kodeKartu" | "tokenTampil" | "qrSvg" | "berlakuSampai"> }) {
  return (
    <div style={{ height: "50%", boxSizing: "border-box", padding: "4mm 3mm", display: "flex", flexDirection: "column" }}>
      <KopHemat kecil />
      <p style={{ textAlign: "center", fontSize: "13pt", fontWeight: 700, marginTop: "3mm" }}>KARTU DATA KELUARGA</p>
      <div className="flex gap-[6mm]" style={{ marginTop: "3mm", flex: 1 }}>
        <div style={{ flex: 1, fontSize: "10.5pt", lineHeight: 1.45 }}>
          <p>Kepada Yth.<br /><b style={{ fontSize: "12pt" }}>Bapak/Ibu {k.kepala}</b></p>
          <p>{rt2(k.rt)} / RW 03 · {k.alamatSingkat}</p>
          <p style={{ marginTop: "2mm" }}>Mohon perbarui data keluarga:</p>
          <ol style={{ listStyle: "decimal", paddingLeft: "5mm", fontWeight: 700 }}>
            <li>Scan QR dengan kamera HP</li>
            <li>Jawab pertanyaan</li>
            <li>Tekan Kirim</li>
          </ol>
          <p style={{ fontSize: "9.5pt", marginTop: "2mm" }}>Tanpa scan: buka <b>{SITUS_PENDEK}/isi</b>, ketik kode:<br /><b style={{ fontSize: "11pt", letterSpacing: "1px" }}>{k.tokenTampil}</b></p>
          <p style={{ fontSize: "9pt", marginTop: "1mm" }}>Tidak punya HP? Minta formulir kertas ke pengurus RT/RW.</p>
        </div>
        <div style={{ width: "54mm", textAlign: "center" }}>
          <div className="qr" style={{ width: "52mm", height: "52mm", margin: "0 auto" }} dangerouslySetInnerHTML={{ __html: k.qrSvg }} />
          <p style={{ fontSize: "8.5pt" }}>Kode kartu: <b>{k.kodeKartu}</b></p>
          <p style={{ fontSize: "7.5pt" }}>Berlaku s.d. {tglId(k.berlakuSampai)}</p>
        </div>
      </div>
      <p style={{ fontSize: "7.5pt" }}>Kartu ini tidak memuat NIK atau nomor KK. Jangan bagikan kode ke orang lain.</p>
    </div>
  );
}

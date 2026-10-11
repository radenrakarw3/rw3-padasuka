import { getVisitrw3FormProfile } from "@shared/visitrw3-form-by-jenis";
import { rtOptions, jenisKendaraanOptions, visitrw3JenisTempatUsahaOptions, visitrw3KategoriUsahaOptions, visitrw3JenjangAnakOptions } from "@/lib/constants";
import { STATUS_KENDARAAN } from "@shared/visitrw3-kendaraan";
import { ATURAN_KEPERLUAN, STATUS_KERJA } from "@shared/visitrw3-keperluan";
import { AlirF4, Isian, KopHemat, KotakCentang, KotakDigit } from "./lembar-f4";

export type JenisFormSinggah = "kontrak" | "kost" | "jualan";

const JUDUL: Record<JenisFormSinggah, { judul: string; sub: string }> = {
  kontrak: { judul: "FORMULIR PENDAFTARAN WARGA KONTRAKAN", sub: "Visit RW3 · untuk penyewa rumah/kontrakan di RW 03" },
  kost: { judul: "FORMULIR PENDAFTARAN WARGA KOST", sub: "Visit RW3 · untuk penghuni kamar kost di RW 03" },
  jualan: { judul: "FORMULIR PENDAFTARAN USAHA", sub: "RW3 Biz · untuk usaha/lapak/kiosk di wilayah RW 03" },
};

const p9 = { fontSize: "9pt", marginTop: "1.6mm" } as const;
const sel = { border: "1px solid #000", padding: "0.8mm 1mm", height: "6.5mm" } as const;

/** Sama dengan isian online: tempat, alamat, peran, status, sampai kapan, untuk apa. */
function RincianKeperluan({ opsi }: { opsi: readonly string[] }) {
  const { Kerja, Kuliah, Usaha } = ATURAN_KEPERLUAN;
  return (
    <div style={{ marginTop: "1.6mm", fontSize: "9pt" }}>
      <p>Keperluan tinggal di RW 03: {opsi.map((k) => <KotakCentang key={k} teks={k} />)}</p>
      <p style={p9}><Isian label="Nama tempat kerja / kampus / usaha / instansi:" /></p>
      <p style={p9}><Isian label="Alamat tempat kerja / kampus / usaha:" /></p>
      <p style={p9}><Isian label={`${Kerja.peran!.label} · ${Kuliah.peran!.label.toLowerCase()} · ${Usaha.peran!.label.toLowerCase()}:`} /></p>
      <p style={p9}>Status kerja: {STATUS_KERJA.map((s) => <KotakCentang key={s} teks={s} />)}</p>
      <p style={p9}><Isian label="Bila kuliah, semester / tingkat:" lebar="55%" /></p>
      <p style={p9}>
        <Isian label="Sampai kapan (bulan/tahun):" lebar="50%" /> <KotakCentang teks="Tidak ada batas (karyawan tetap / usaha menetap)" />
      </p>
      <p style={p9}><Isian label="Untuk apa / keterangan (wajib bila Lainnya):" /></p>
      <p style={p9}><Isian /></p>
    </div>
  );
}

function TabelKendaraan() {
  const kolom = ["No", "Jenis", "Merek / tipe", "Warna", "Plat nomor", "Status*", "Nama di STNK", "Leasing & bln lunas (bila cicilan)"];
  const lebar = ["5%", "10%", "15%", "9%", "14%", "8%", "18%", "21%"];
  return (
    <div style={{ marginTop: "1.6mm", fontSize: "9pt" }}>
      <p>
        Punya kendaraan yang dibawa/dipakai di RW 03? <KotakCentang teks="Tidak punya" /><KotakCentang teks="Ya, isi tabel (tunjukkan STNK saat survey)" />
      </p>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "7.5pt", marginTop: "1mm", tableLayout: "fixed" }}>
        <thead>
          <tr>{kolom.map((k, i) => <th key={k} style={{ ...sel, height: "auto", width: lebar[i], fontWeight: 700, textAlign: "left" }}>{k}</th>)}</tr>
        </thead>
        <tbody>
          {[1, 2].map((n) => (
            <tr key={n}>{kolom.map((k, i) => <td key={k} style={sel}>{i === 0 ? n : ""}</td>)}</tr>
          ))}
        </tbody>
      </table>
      <p style={{ fontSize: "7.5pt", marginTop: "0.8mm" }}>
        *Status: {STATUS_KENDARAAN.map((s) => `${KODE_STATUS[s.value]} = ${s.label.toLowerCase()}`).join(" · ")}. Jenis: {jenisKendaraanOptions.join(" / ")}. Lebih dari 2 kendaraan: tulis di balik lembar.
      </p>
    </div>
  );
}

const KODE_STATUS: Record<(typeof STATUS_KENDARAAN)[number]["value"], string> = {
  lunas: "L",
  cicilan: "C",
  keluarga: "K",
  kantor: "D",
  sewa: "S",
};

function Orang({ no, judul, profil, jualan }: { no: number; judul: string; profil: ReturnType<typeof getVisitrw3FormProfile>; jualan: boolean }) {
  return (
    <div className="jaga" style={{ border: "1px solid #000", padding: "2mm 3mm", marginTop: "2mm" }}>
      <p style={{ fontWeight: 700, fontSize: "9.5pt" }}>{no}. {judul}</p>
      <p style={p9}><Isian label="Nama lengkap (sesuai KTP):" /></p>
      <p style={p9}>NIK: <KotakDigit jumlah={16} /> &nbsp; <KotakCentang teks="Laki-laki" /><KotakCentang teks="Perempuan" /></p>
      <p style={p9}><Isian label="Tanggal lahir:" lebar="44%" /> <Isian label="No. WhatsApp:" lebar="52%" /></p>
      {profil.requirePekerjaan && !profil.requireKeperluanTinggal && <p style={p9}><Isian label="Pekerjaan:" lebar="44%" /> <Isian label={`${profil.tempatKerjaLabel}:`} lebar="52%" /></p>}
      {profil.requirePekerjaan && profil.requireKeperluanTinggal && <p style={p9}><Isian label="Pekerjaan:" lebar="60%" /></p>}
      {!profil.requirePekerjaan && profil.requireTempatKerja && <p style={p9}><Isian label={`${profil.tempatKerjaLabel}:`} /></p>}
      {profil.requireKeperluanTinggal && <RincianKeperluan opsi={profil.keperluanTinggalOptions} />}
      <p style={p9}>Umur di bawah 21 tahun? <Isian label="Nama sekolah/kampus:" lebar="60%" /></p>
      <TabelKendaraan />
      {jualan && no === 1 && <p style={{ ...p9, fontStyle: "italic" }}>Orang no. 1 adalah penanggung jawab (PJ) usaha.</p>}
    </div>
  );
}

/** Formulir kosong F4 yang mengikuti isian form publik Visit RW3 / RW3 Biz, untuk warga yang tidak bisa mengisi sendiri. */
export function FormulirSinggah({ jenis }: { jenis: JenisFormSinggah }) {
  const profil = getVisitrw3FormProfile(jenis);
  const jualan = jenis === "jualan";
  const jumlahOrang = jenis === "kost" ? 2 : 3;
  return (
    <AlirF4>
      <KopHemat kecil />
      <div className="flex items-start justify-between gap-3" style={{ marginTop: "2mm" }}>
        <div>
          <p style={{ fontSize: "13pt", fontWeight: 700 }}>{JUDUL[jenis].judul}</p>
          <p style={{ fontSize: "9pt" }}>{JUDUL[jenis].sub}</p>
        </div>
        <div style={{ border: "1.5px solid #000", padding: "1.5mm 3mm", fontSize: "8pt", minWidth: "42mm" }}>
          <p>Diisi petugas:</p>
          <p>No. pengajuan: ...............</p>
          <p>Tgl input: ...............</p>
        </div>
      </div>
      <p style={{ fontSize: "8.5pt", marginTop: "1.5mm", border: "1px dashed #000", padding: "1.5mm 2mm" }}>
        Tulis dengan huruf cetak dan centang (✓) pilihan yang sesuai. <b>Lampirkan fotokopi KTP</b> setiap orang dewasa.
        Petugas RW akan memasukkan data ini ke sistem dan menghubungi Anda lewat WhatsApp.
      </p>

      <p style={{ fontWeight: 700, marginTop: "3mm" }}>A. {profil.lokasiTitle.toUpperCase()}</p>
      <p style={p9}>RT: {rtOptions.map((n) => <KotakCentang key={n} teks={String(n).padStart(2, "0")} />)} / RW 03</p>
      <p style={p9}><Isian label={`${profil.alamatLabel.replace(" *", "")}:`} /></p>
      {profil.nomorUnitMode !== "hidden" && <p style={p9}><Isian label={`${profil.nomorUnitLabel.replace(" *", "")}:`} lebar="70%" /></p>}

      {jualan && (
        <>
          <p style={{ fontWeight: 700, marginTop: "3mm" }}>B. DATA USAHA</p>
          <p style={p9}><Isian label="Nama usaha:" lebar="60%" /> <Isian label="Jam buka-tutup:" lebar="36%" /></p>
          <p style={p9}>Tempat usaha: {visitrw3JenisTempatUsahaOptions.map((o) => <KotakCentang key={o.value} teks={o.label} />)}<Isian lebar="22%" /></p>
          <p style={p9}>Jenis usaha (boleh lebih dari satu):</p>
          <div style={{ columnCount: 3, columnGap: "4mm", fontSize: "8pt", lineHeight: 1.55, marginTop: "1mm" }}>
            {visitrw3KategoriUsahaOptions.map((k) => <div key={k}><KotakCentang teks={k} /></div>)}
            <div><KotakCentang teks="Lainnya:" />........</div>
          </div>
          <p style={p9}><Isian label="Alamat usaha bila beda dengan lokasi:" /></p>
        </>
      )}

      <p style={{ fontWeight: 700, marginTop: "3mm" }}>{jualan ? "C. PENANGGUNG JAWAB & PEKERJA" : "B. DATA PENGHUNI"}</p>
      <p style={{ fontSize: "8.5pt" }}>{profil.jumlahHint} Jumlah dewasa: ...... {profil.showAnak ? "Jumlah anak: ......" : ""}</p>
      {Array.from({ length: jumlahOrang }).map((_, i) => (
        <Orang key={i} no={i + 1} judul={jualan ? (i === 0 ? "Penanggung jawab" : "Pekerja") : i === 0 ? "Penghuni utama" : "Penghuni lain"} profil={profil} jualan={jualan} />
      ))}

      {profil.showAnak && (
        <div className="jaga" style={{ marginTop: "2mm" }}>
          <p style={{ fontWeight: 700, fontSize: "9.5pt" }}>Anak (tidak perlu NIK)</p>
          {[1, 2, 3].map((n) => (
            <p key={n} style={p9}>
              {n}. <Isian label="Nama:" lebar="38%" /> <Isian label="Tgl lahir:" lebar="22%" /> Jenjang: {visitrw3JenjangAnakOptions.slice(0, 5).map((j) => <KotakCentang key={j} teks={j} />)}
            </p>
          ))}
        </div>
      )}

      <div className="jaga">
        <p style={{ fontWeight: 700, marginTop: "3mm" }}>{jualan ? "D" : "C"}. MASA BERLAKU & KONTRIBUSI</p>
        <p style={p9}>
          <Isian label="Tanggal bayar sewa/mulai:" lebar="48%" /> Masa: <KotakCentang teks="1 bulan" /><KotakCentang teks="3 bulan" /><KotakCentang teks="6 bulan" /><KotakCentang teks="1 tahun" />
        </p>
        <p style={p9}><Isian label="Catatan:" /></p>
        <p style={{ ...p9, lineHeight: 1.5 }}>
          <KotakCentang teks="" /> Saya menyatakan data di atas benar dan bersedia mematuhi tata tertib lingkungan RW 03.
        </p>
        <div className="flex justify-between" style={{ marginTop: "3mm", fontSize: "9pt" }}>
          <div style={{ textAlign: "center", width: "45%" }}>
            <p>Cimahi, ....................</p>
            <p>{jualan ? "Penanggung jawab" : "Penghuni"},</p>
            <div style={{ height: "14mm" }} />
            <p>(..................................)</p>
          </div>
          <div style={{ textAlign: "center", width: "45%" }}>
            <p>&nbsp;</p>
            <p>{jualan ? "Pemilik lokasi / saksi" : "Pemilik kost / kontrakan"},</p>
            <div style={{ height: "14mm" }} />
            <p>(..................................)</p>
          </div>
        </div>
        <p style={{ fontSize: "7.5pt", marginTop: "2mm" }}>Data dijaga pengurus RW 03 dan hanya untuk administrasi kependudukan & keamanan lingkungan. Bisa juga daftar sendiri: {jualan ? "rw3padasukacimahi.org/rw3biz" : "rw3padasukacimahi.org/visitrw3"}.</p>
      </div>
    </AlirF4>
  );
}

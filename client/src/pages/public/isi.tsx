import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { wil } from "@/lib/wilayah-api";
import { HIJAU, IsianTeks, Memuat, Pesan, TombolBesar, rt2 } from "@/components/wilayah/ui";
import { FormIsiKeluarga, type KeluargaTercatat } from "@/components/wilayah/form-isi-keluarga";
import type { DefinisiFakta } from "@shared/wilayah";

const KUNCI_TOKEN = "isi-token";

/** Huruf besar, tanpa simbol, dikelompokkan per 4: ABCD-EFGH-… */
function formatKode(v: string) {
  const bersih = v.toUpperCase().replace(/[^0-9A-Z]/g, "").slice(0, 16);
  return bersih.match(/.{1,4}/g)?.join("-") ?? "";
}

/** Aturan penyewa: KTP RW 03 → pendataan warga di sini; KTP luar → Visit RW3. */
function AturanPenyewa() {
  return (
    <div className="mt-3 rounded-2xl border-2 border-[hsl(40,45%,55%)] bg-[hsl(40,60%,96%)] px-4 py-3 text-base text-gray-900">
      <p className="font-bold">Ngekost atau ngontrak di RW 03?</p>
      <ul className="mt-1 space-y-1">
        <li>✅ <b>KTP RW 03 Padasuka</b> → isi di formulir ini (pendataan warga).</li>
        <li>➡️ <b>KTP luar RW 03</b> → daftar lewat{" "}
          <a href="/visitrw3" className="font-semibold text-[hsl(163,55%,22%)] underline">Visit RW3</a>, bukan di sini.
        </li>
      </ul>
    </div>
  );
}

function useNoReferrer() {
  useEffect(() => {
    const m = document.createElement("meta");
    m.name = "referrer";
    m.content = "no-referrer";
    document.head.appendChild(m);
    return () => { m.remove(); };
  }, []);
}

function Bingkai({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[hsl(163,30%,96%)] text-lg text-gray-900">
      <header className="text-white px-4 py-4" style={{ backgroundColor: HIJAU }}>
        <p className="text-xl font-bold">Pendataan Keluarga</p>
        <p className="text-base opacity-90">RW 03 Kelurahan Padasuka</p>
      </header>
      <main className="max-w-xl mx-auto px-4 py-5">{children}</main>
    </div>
  );
}

function CekStatus() {
  const [kode, setKode] = useState("");
  const [hasil, setHasil] = useState<{ status: string; pesanRt: string | null } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [proses, setProses] = useState(false);
  const label: Record<string, string> = { menunggu: "Menunggu diperiksa pengurus RW", diterima: "Sudah diterima", ditolak: "Tidak diterima", klarifikasi: "Pengurus RW meminta perbaikan", digantikan: "Digantikan kiriman yang lebih baru" };
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Cek status kiriman</h1>
      <IsianTeks label="Kode tanda terima" nilai={kode} onChange={(v) => setKode(v.toUpperCase())} />
      <TombolBesar memuat={proses} disabled={kode.replace(/\W/g, "").length !== 10} onClick={async () => {
        setProses(true); setErr(null); setHasil(null);
        try { setHasil(await wil(`/api/isi/status/${encodeURIComponent(kode.replace(/\W/g, ""))}`)); } catch (e) { setErr((e as Error).message); } finally { setProses(false); }
      }}>Cek</TombolBesar>
      {err && <Pesan jenis="error">{err}</Pesan>}
      {hasil && <Pesan jenis={hasil.status === "diterima" ? "sukses" : "info"}>{label[hasil.status] ?? hasil.status}{hasil.pesanRt ? <><br />Pesan pengurus: {hasil.pesanRt}</> : null}</Pesan>}
    </div>
  );
}

export default function IsiPage({ token: tokenUrl, status }: { token?: string; status?: boolean }) {
  useNoReferrer();
  const [, go] = useLocation();
  const [token, setToken] = useState<string | null>(null);
  const [ketik, setKetik] = useState("");
  const [rt, setRt] = useState<number | null>(null);
  const [pertanyaan, setPertanyaan] = useState<DefinisiFakta[]>([]);
  const [keluarga, setKeluarga] = useState<KeluargaTercatat | null>(null);
  const [memuat, setMemuat] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [kodeTerima, setKodeTerima] = useState<string | null>(null);

  const buka = async (t: string) => {
    setMemuat(true);
    setErr(null);
    try {
      const r = await wil<{ rt: number; pertanyaan: DefinisiFakta[]; keluarga?: KeluargaTercatat }>("/api/isi/buka", { body: { token: t } });
      sessionStorage.setItem(KUNCI_TOKEN, t);
      setToken(t);
      setRt(r.rt);
      setPertanyaan(r.pertanyaan ?? []);
      setKeluarga(r.keluarga ?? null);
    } catch (e) {
      sessionStorage.removeItem(KUNCI_TOKEN);
      setErr((e as Error).message);
    } finally {
      setMemuat(false);
    }
  };

  useEffect(() => {
    if (status) return;
    const t = tokenUrl || sessionStorage.getItem(KUNCI_TOKEN);
    if (tokenUrl) window.history.replaceState(null, "", "/isi");
    if (t) buka(t);
  }, [tokenUrl, status]);

  if (status) return <Bingkai><CekStatus /></Bingkai>;
  if (kodeTerima) {
    return (
      <Bingkai>
        <div className="space-y-4">
          <Pesan jenis="sukses">Terima kasih! Isian Anda sudah terkirim dan akan diperiksa pengurus RW.</Pesan>
          <p className="text-lg">Kode tanda terima (simpan / foto layar ini):</p>
          <p className="text-3xl font-bold tracking-widest text-center bg-white rounded-2xl border-2 p-4">{kodeTerima}</p>
          <TombolBesar varian="kedua" onClick={() => go("/isi/status")}>Cek status kiriman</TombolBesar>
        </div>
      </Bingkai>
    );
  }
  if (memuat) return <Bingkai><Memuat teks="Memeriksa kartu…" /></Bingkai>;
  if (token && rt) {
    return (
      <Bingkai>
        <FormIsiKeluarga
          draftKey={`isi:v2:${token.slice(-6)}`}
          pertanyaan={pertanyaan}
          keluarga={keluarga}
          pembuka={<Pesan>Keluarga di {rt2(rt)} / RW 03. Isian diperiksa pengurus RW dulu, dan tersimpan otomatis di HP ini bila terputus.</Pesan>}
          kirimKe={(isi, kunci) => wil<{ kodeTerima: string }>("/api/isi/kirim", { body: { token, idempotencyKey: kunci, isi } })}
          selesai={(k) => { sessionStorage.removeItem(KUNCI_TOKEN); setKodeTerima(k); }}
        />
      </Bingkai>
    );
  }
  return (
    <Bingkai>
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Masukkan kode kartu</h1>
        <p>Scan QR di kartu dari pengurus RW dengan kamera HP. Atau ketik 16 huruf/angka yang tertulis di kartu.</p>
        {err && <Pesan jenis="error">{err}</Pesan>}
        <IsianTeks label="Kode" nilai={ketik} onChange={(v) => setKetik(formatKode(v))} placeholder="XXXX-XXXX-XXXX-XXXX" autoComplete="off" />
        <TombolBesar disabled={ketik.replace(/[^0-9A-Za-z]/g, "").length !== 16} onClick={() => buka(ketik)}>Buka formulir</TombolBesar>
        <TombolBesar varian="kedua" onClick={() => go("/isi/status")}>Cek status kiriman</TombolBesar>
        <AturanPenyewa />
      </div>
    </Bingkai>
  );
}

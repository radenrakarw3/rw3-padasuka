import { useMemo, useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Visitrw3Shell } from "@/components/visitrw3-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { readJsonSafely } from "@/lib/queryClient";
import { formatKategoriUsahaLabel } from "@shared/visitrw3-kategori-usaha";
import { Loader2 } from "lucide-react";
import { StatusBadge, visitrw3StatusVariant } from "@/components/gov/status-badge";
import { StatusTimeline, buildVisitrw3Timeline } from "@/components/gov/status-timeline";
import { EmptyState } from "@/components/gov/empty-state";
import { FeatureExplain } from "@/components/gov/feature-explain";
import { Search, Printer, Download, RefreshCw } from "lucide-react";

type RingkasSurat = {
  nomor: string;
  tanggalTerbit: string;
  berlakuMulai: string;
  berlakuSampai: string;
  perpanjangPalingLambat: string;
  sisaHari: number;
  kedaluwarsa: boolean;
  nomorSebelumnya: string | null;
  digantiOleh: string | null;
  pemegang: { nama: string; nikSamar: string | null; anak: boolean }[];
};

function tglPanjang(iso: string) {
  const d = new Date(`${iso}T12:00:00`);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

function KartuSurat({ s }: { s: RingkasSurat }) {
  const tidakBerlaku = Boolean(s.digantiOleh) || s.kedaluwarsa;
  const wajibPerpanjang = !tidakBerlaku && s.sisaHari <= 14;
  const urlSurat = `/api/public/visitrw3/surat/${encodeURIComponent(s.nomor)}`;
  return (
    <div className="space-y-3">
      <div
        className="relative overflow-hidden rounded-2xl p-5 text-white shadow-lg border border-[hsl(40,55%,58%)]/50"
        style={{
          background:
            "linear-gradient(135deg, hsl(163, 52%, 12%) 0%, hsl(163, 48%, 20%) 45%, hsl(163, 55%, 16%) 100%)",
        }}
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[9px] uppercase tracking-[0.3em] text-[hsl(40,45%,72%)]">
              Surat izin tinggal sementara
            </p>
            <p className="text-2xl font-extrabold leading-tight">
              Visit<span className="text-[hsl(40,58%,68%)]">RW3</span>
            </p>
          </div>
          <span
            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full ${
              tidakBerlaku ? "bg-red-500/90" : wajibPerpanjang ? "bg-amber-500/90" : "bg-emerald-500/80"
            }`}
          >
            {s.digantiOleh ? "Diganti" : s.kedaluwarsa ? "Habis" : wajibPerpanjang ? "Segera perpanjang" : "Berlaku"}
          </span>
        </div>
        <p className="font-mono text-sm mt-2 text-white/85">{s.nomor}</p>
        <div className="mt-3 space-y-0.5 text-sm">
          {s.pemegang.map((x, i) => (
            <p key={i} className="truncate">
              {x.nama}
              <span className="text-white/55 text-xs">
                {x.anak ? " · anak" : x.nikSamar ? ` · ${x.nikSamar}` : ""}
              </span>
            </p>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 border-t border-white/15 pt-3">
          <div>
            <p className="text-[9px] uppercase tracking-widest text-[hsl(40,45%,72%)]">Terbit</p>
            <p className="text-sm font-semibold">{tglPanjang(s.tanggalTerbit)}</p>
          </div>
          <div>
            <p className="text-[9px] uppercase tracking-widest text-[hsl(40,45%,72%)]">Berlaku sampai</p>
            <p className="text-lg font-extrabold leading-tight">{tglPanjang(s.berlakuSampai)}</p>
          </div>
        </div>
      </div>

      {s.digantiOleh ? (
        <p className="text-sm rounded-lg border border-amber-300 bg-amber-50 p-3 text-amber-900">
          Surat ini sudah diganti dengan surat baru nomor <b className="font-mono">{s.digantiOleh}</b>. Gunakan
          surat yang baru.
        </p>
      ) : s.kedaluwarsa ? (
        <p className="text-sm rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-destructive" role="alert">
          Masa berlaku sudah habis sejak {tglPanjang(s.berlakuSampai)}. Segera ajukan perpanjang agar mendapat surat
          baru.
        </p>
      ) : (
        <p
          className={`text-sm rounded-lg border p-3 ${
            wajibPerpanjang ? "border-amber-300 bg-amber-50 text-amber-900" : "bg-muted/40"
          }`}
        >
          Sisa <b>{s.sisaHari} hari</b>. Wajib perpanjang paling lambat{" "}
          <b>{tglPanjang(s.perpanjangPalingLambat)}</b> — setelah disetujui Anda mendapat nomor dan surat baru.
        </p>
      )}

      <div className="grid grid-cols-2 gap-2">
        <a href={urlSurat} target="_blank" rel="noreferrer">
          <Button className="w-full gap-1.5" variant={tidakBerlaku ? "outline" : "default"}>
            <Printer className="w-4 h-4" /> Lihat & cetak
          </Button>
        </a>
        <a href={`${urlSurat}?unduh=1`}>
          <Button className="w-full gap-1.5" variant="outline">
            <Download className="w-4 h-4" /> Unduh PDF
          </Button>
        </a>
      </div>
      {!s.digantiOleh && (
        <Link href={`/visitrw3/perpanjang?nomor=${encodeURIComponent(s.nomor)}`}>
          <Button className="w-full gap-1.5" variant={wajibPerpanjang || s.kedaluwarsa ? "default" : "outline"}>
            <RefreshCw className="w-4 h-4" /> Perpanjang izin
          </Button>
        </Link>
      )}
      <p className="text-xs text-muted-foreground">
        Salinan ini menyamarkan NIK. Surat asli bertanda tangan Ketua RW dapat diambil di sekretariat RW 03.
      </p>
    </div>
  );
}

export default function Visitrw3Status() {
  const awal = useMemo(
    () => (new URLSearchParams(window.location.search).get("nomor") ?? "").trim().toUpperCase(),
    [],
  );
  const [nomor, setNomor] = useState(awal);
  const [search, setSearch] = useState(awal);

  const { data, isLoading, isFetched } = useQuery({
    queryKey: ["/api/public/visitrw3/status", search],
    queryFn: async () => {
      const res = await fetch(`/api/public/visitrw3/status/${encodeURIComponent(search)}`);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Gagal memuat status");
      return readJsonSafely<{
        pengajuan: {
          nomorVisitrw3: string;
          status: string;
          tipe: string;
          keperluanPengajuan: string;
          jenisWarga?: string | null;
          alamat?: string | null;
          rt: number;
          tanggalBerlakuSampai: string;
          terminBulan: number;
          nomorUnit?: string | null;
          alasanTolak?: string | null;
          namaUsaha?: string | null;
          kategoriUsaha?: string | null;
          jamBuka?: string | null;
          jamTutup?: string | null;
        };
        kost?: { namaKost: string } | null;
        kontrakAktif?: boolean;
        surat?: RingkasSurat | null;
      }>(res);
    },
    enabled: search.length >= 8,
  });

  return (
    <Visitrw3Shell title="Cek status" backHref="/visitrw3">
      <div className="space-y-4">
        <FeatureExplain title="Nomor apa yang dimasukkan?">
          <p>
            Nomor <strong>VRW3-…</strong> dari konfirmasi pengajuan baru atau perpanjang izin.
          </p>
          <p>
            Status umum: <strong>menunggu survey</strong> → admin memverifikasi data →{" "}
            <strong>disetujui</strong> (izin aktif) atau <strong>ditolak</strong> (ada alasan
            penolakan).
          </p>
        </FeatureExplain>

        <div className="space-y-2">
          <Label htmlFor="nomor">Nomor Visit RW3</Label>
          <Input
            id="nomor"
            value={nomor}
            onChange={(e) => setNomor(e.target.value.toUpperCase())}
            placeholder="VRW3-YYYYMMDD-XXXX"
            className="font-mono"
          />
        </div>
        <Button
          className="w-full touch-target"
          onClick={() => setSearch(nomor.trim())}
          disabled={nomor.trim().length < 8}
        >
          Cek status
        </Button>

        {isLoading && (
          <div className="flex justify-center py-8" role="status" aria-label="Memuat">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {isFetched && !isLoading && !data && (
          <EmptyState
            icon={Search}
            title="Nomor tidak ditemukan"
            description="Periksa kembali penulisan nomor Visit RW3. Nomor tertera pada konfirmasi pengajuan Anda."
          />
        )}

        {data?.surat && <KartuSurat s={data.surat} />}

        {data?.pengajuan && (
          <div className="rounded-xl border bg-card p-4 space-y-4 shadow-sm">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <code className="font-mono font-bold text-brand text-sm break-all">
                {data.pengajuan.nomorVisitrw3}
              </code>
              <StatusBadge variant={visitrw3StatusVariant(data.pengajuan.status)} />
            </div>

            <StatusTimeline
              steps={buildVisitrw3Timeline(data.pengajuan.status, data.pengajuan.alasanTolak)}
            />

            <dl className="text-sm space-y-2 border-t pt-3">
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Jenis</dt>
                <dd className="font-medium text-right">
                  {data.pengajuan.tipe === "perpanjang" ? "Perpanjang" : "Pengajuan baru"}
                  {data.pengajuan.jenisWarga
                    ? ` · ${data.pengajuan.jenisWarga === "jualan" ? "Jualan" : data.pengajuan.jenisWarga === "kost" ? "Ngekost" : "Ngontrak"}`
                    : ` · ${data.pengajuan.keperluanPengajuan === "bisnis" ? "Bisnis" : "Tinggal"}`}
                </dd>
              </div>
              {data.pengajuan.alamat && (
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Alamat</dt>
                  <dd className="font-medium text-right max-w-[65%]">{data.pengajuan.alamat}</dd>
                </div>
              )}
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">RT</dt>
                <dd className="font-medium">RT {String(data.pengajuan.rt).padStart(2, "0")}</dd>
              </div>
              {data.pengajuan.nomorUnit && (
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Nomor unit</dt>
                  <dd className="font-medium text-right">{data.pengajuan.nomorUnit}</dd>
                </div>
              )}
              {data.pengajuan.keperluanPengajuan === "bisnis" && data.pengajuan.namaUsaha && (
                <>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Usaha</dt>
                    <dd className="font-medium text-right">{data.pengajuan.namaUsaha}</dd>
                  </div>
                  {data.pengajuan.kategoriUsaha && (
                    <div className="flex justify-between gap-2">
                      <dt className="text-muted-foreground">Kategori usaha</dt>
                      <dd className="font-medium text-right max-w-[60%]">
                        {formatKategoriUsahaLabel(data.pengajuan.kategoriUsaha)}
                      </dd>
                    </div>
                  )}
                  {data.pengajuan.jamBuka && data.pengajuan.jamTutup && (
                    <div className="flex justify-between gap-2">
                      <dt className="text-muted-foreground">Jam operasional</dt>
                      <dd className="font-medium text-right">
                        {data.pengajuan.jamBuka} – {data.pengajuan.jamTutup}
                      </dd>
                    </div>
                  )}
                </>
              )}
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Berlaku sampai</dt>
                <dd className="font-medium">{tglPanjang(data.pengajuan.tanggalBerlakuSampai)}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Termin</dt>
                <dd className="font-medium">{data.pengajuan.terminBulan} bulan</dd>
              </div>
            </dl>

            {data.pengajuan.status === "ditolak" && data.pengajuan.alasanTolak && (
              <p className="text-sm text-destructive rounded-lg bg-destructive/10 p-3" role="alert">
                Alasan penolakan: {data.pengajuan.alasanTolak}
              </p>
            )}
            {data.kontrakAktif && (
              <p className="text-sm text-success font-medium">Kontrak aktif terdaftar di sistem RW.</p>
            )}
          </div>
        )}
      </div>
    </Visitrw3Shell>
  );
}

import { useMemo, useState } from "react";
import { Link } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Rw3bizShell } from "@/components/rw3biz-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest, getApiErrorMessage, readJsonSafely } from "@/lib/queryClient";
import { Download, FileText, Loader2, Printer, Receipt, RefreshCw, Search } from "lucide-react";
import { StatusBadge, visitrw3StatusVariant } from "@/components/gov/status-badge";
import { StatusTimeline, buildVisitrw3Timeline } from "@/components/gov/status-timeline";
import { EmptyState } from "@/components/gov/empty-state";
import { FeatureExplain } from "@/components/gov/feature-explain";
import { RW3BIZ_ROUTES } from "@/lib/rw3biz-routes";
import { formatKategoriUsahaLabel } from "@shared/visitrw3-kategori-usaha";
import { RincianKontribusi } from "@/components/rw3biz/koreksi-kontribusi";
import { formatRp, labelPeriode, type HasilKontribusi } from "@shared/rw3biz-kontribusi";
import { useToast } from "@/hooks/use-toast";

type TagihanPublik = {
  id: number;
  periode: string;
  jumlah: number;
  terbayar: number;
  status: string;
  catatan: string[];
  jatuhTempo: string;
  telat: boolean;
  pembayaran: { id: number; jumlah: number; tanggal: string; nomorKwitansi: string }[];
};

type RingkasSurat = {
  nomor: string;
  nomorInduk: string | null;
  namaUsaha: string;
  tanggalTerbit: string;
  berlakuMulai: string;
  berlakuSampai: string;
  perbaruiPalingLambat: string;
  terminBulan: number;
  sisaHari: number;
  kedaluwarsa: boolean;
  nomorSebelumnya: string | null;
  digantiOleh: string | null;
};

type StatusData = {
  pengajuan: {
    nomorBiz: string;
    status: string;
    tipe: string;
    namaUsaha: string;
    rt: number;
    alamat: string;
    tanggalBerlakuSampai: string;
    jamBuka?: string | null;
    jamTutup?: string | null;
    kategoriUsaha?: string | null;
    alasanTolak?: string | null;
    pjNama: string;
  } | null;
  usaha: { status: string; tanggalHabis: string; namaUsaha: string; nomorBiz: string; nomorInduk: string | null } | null;
  kontribusi: {
    bulanan: number;
    hasil: HasilKontribusi;
    alokasi: { id: string; label: string; nominal: number }[];
    final: boolean;
    keringanan: { persen: number; sampai: string | null } | null;
  } | null;
  tagihan: TagihanPublik[];
  surat: RingkasSurat | null;
  razia?: RaziaPublik[];
  pelanggaran?: PelanggaranPublik[];
};

type PelanggaranPublik = {
  id: number;
  tanggal: string;
  jenis: string;
  tingkat: string;
  keBerapa: number;
  sumber: string;
  denda: number;
  dendaRincian: string | null;
  dendaStatus: "tidak_ada" | "belum" | "lunas" | "dibebaskan";
  nomorKwitansi: string | null;
};

type RaziaPublik = {
  id: number;
  tanggal: string;
  plat: string;
  jenis: string;
  hasil: string;
  hasilLabel: string;
  keterangan: string | null;
  denda: number;
  dendaStatus: "tidak_ada" | "belum" | "lunas" | "dibebaskan";
  selesai: boolean;
  nomorKwitansi: string | null;
};

const STATUS_TAGIHAN: Record<string, string> = {
  belum: "Belum dibayar",
  sebagian: "Dicicil",
  lunas: "Lunas",
  dibebaskan: "Dibebaskan",
};

function tglPanjang(iso: string) {
  const d = new Date(`${iso}T12:00:00`);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

function KartuSurat({ s }: { s: RingkasSurat }) {
  const tidakBerlaku = Boolean(s.digantiOleh) || s.kedaluwarsa;
  const wajibPerbarui = !tidakBerlaku && s.sisaHari <= 14;
  const urlSurat = `/api/public/rw3biz/surat/${encodeURIComponent(s.nomor)}`;
  return (
    <div className="space-y-3">
      <div
        className="relative overflow-hidden rounded-2xl p-5 text-white shadow-lg border border-[hsl(40,55%,58%)]/50"
        style={{ background: "linear-gradient(135deg, hsl(163, 52%, 12%) 0%, hsl(163, 48%, 20%) 45%, hsl(163, 55%, 16%) 100%)" }}
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[9px] uppercase tracking-[0.3em] text-[hsl(40,45%,72%)]">Surat izin usaha</p>
            <p className="text-2xl font-extrabold leading-tight">
              RW3<span className="text-[hsl(40,58%,68%)]">BIZ</span>
            </p>
          </div>
          <span
            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full ${
              tidakBerlaku ? "bg-red-500/90" : wajibPerbarui ? "bg-amber-500/90" : "bg-emerald-500/80"
            }`}
          >
            {s.digantiOleh ? "Diganti" : s.kedaluwarsa ? "Habis" : wajibPerbarui ? "Segera perbarui" : "Berlaku"}
          </span>
        </div>
        {s.nomorInduk && (
          <div className="mt-3">
            <p className="text-[9px] uppercase tracking-widest text-[hsl(40,45%,72%)]">Nomor Induk Usaha</p>
            <p className="font-mono text-xl font-bold tracking-wide">{s.nomorInduk}</p>
          </div>
        )}
        <p className="mt-1 text-sm">{s.namaUsaha}</p>
        <p className="font-mono text-xs text-white/70">Surat No. {s.nomor}</p>
        <div className="mt-4 grid grid-cols-2 gap-3 border-t border-white/15 pt-3">
          <div>
            <p className="text-[9px] uppercase tracking-widest text-[hsl(40,45%,72%)]">Terbit</p>
            <p className="text-sm font-semibold">{tglPanjang(s.tanggalTerbit)}</p>
          </div>
          <div>
            <p className="text-[9px] uppercase tracking-widest text-[hsl(40,45%,72%)]">Berlaku sampai ({s.terminBulan} bln)</p>
            <p className="text-lg font-extrabold leading-tight">{tglPanjang(s.berlakuSampai)}</p>
          </div>
        </div>
      </div>

      {s.kedaluwarsa ? (
        <p className="text-sm rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-destructive" role="alert">
          Masa berlaku habis sejak {tglPanjang(s.berlakuSampai)}. Segera perbarui izin beserta data pegawai dan kendaraan.
        </p>
      ) : (
        <p className={`text-sm rounded-lg border p-3 ${wajibPerbarui ? "border-amber-300 bg-amber-50 text-amber-900" : "bg-muted/40"}`}>
          Sisa <b>{s.sisaHari} hari</b>. Wajib diperbarui paling lambat <b>{tglPanjang(s.perbaruiPalingLambat)}</b> — sekaligus
          memperbarui data pegawai dan kendaraan operasional.
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
      <Link href={`${RW3BIZ_ROUTES.perpanjang}?nomor=${encodeURIComponent(s.nomorInduk ?? s.nomor)}`}>
        <Button className="w-full gap-1.5" variant={wajibPerbarui || s.kedaluwarsa ? "default" : "outline"}>
          <RefreshCw className="w-4 h-4" /> Perbarui izin & data
        </Button>
      </Link>
      <p className="text-xs text-muted-foreground">
        Salinan ini menyamarkan NIK. Surat asli bertanda tangan Ketua RW dapat diambil di sekretariat RW 03.
      </p>
    </div>
  );
}

function FormKeberatan({ nomor }: { nomor: string }) {
  const { toast } = useToast();
  const [buka, setBuka] = useState(false);
  const [wa, setWa] = useState("");
  const [alasan, setAlasan] = useState("");
  const kirim = useMutation({
    mutationFn: async () =>
      readJsonSafely(await apiRequest("POST", "/api/public/rw3biz/keberatan", { nomorBiz: nomor, nomorWhatsapp: wa, alasan })),
    onSuccess: () => {
      toast({ title: "Terkirim", description: "Pengurus akan meninjau dan menghubungi Anda lewat WhatsApp." });
      setBuka(false);
      setAlasan("");
    },
    onError: (e: unknown) => toast({ title: "Gagal", description: getApiErrorMessage(e), variant: "destructive" }),
  });
  if (!buka) {
    return (
      <Button variant="outline" className="w-full" onClick={() => setBuka(true)}>
        Ajukan peninjauan kontribusi
      </Button>
    );
  }
  return (
    <div className="space-y-3 rounded-lg border p-3">
      <p className="text-xs text-muted-foreground">
        Jelaskan kenapa kontribusi terasa tidak sesuai (misalnya data survey keliru, usaha sedang sepi). Hanya penanggung jawab yang
        bisa mengajukan.
      </p>
      <div className="space-y-1">
        <Label>Nomor WhatsApp penanggung jawab</Label>
        <Input type="tel" inputMode="tel" value={wa} onChange={(e) => setWa(e.target.value)} placeholder="08xxxxxxxxxx" />
      </div>
      <div className="space-y-1">
        <Label>Alasan</Label>
        <Textarea rows={3} value={alasan} onChange={(e) => setAlasan(e.target.value)} maxLength={2000} />
      </div>
      <div className="flex gap-2">
        <Button variant="ghost" onClick={() => setBuka(false)}>
          Batal
        </Button>
        <Button className="flex-1" disabled={kirim.isPending || wa.trim().length < 8 || alasan.trim().length < 10} onClick={() => kirim.mutate()}>
          {kirim.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Kirim"}
        </Button>
      </div>
    </div>
  );
}

export default function Rw3bizStatus() {
  const awal = useMemo(() => (new URLSearchParams(window.location.search).get("nomor") ?? "").trim().toUpperCase(), []);
  const [nomor, setNomor] = useState(awal);
  const [search, setSearch] = useState(awal);

  const { data, isLoading, isFetched } = useQuery({
    queryKey: ["/api/public/rw3biz/status", search],
    queryFn: async () => {
      const res = await fetch(`/api/public/rw3biz/status?nomor=${encodeURIComponent(search)}`);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Gagal memuat status");
      return readJsonSafely<StatusData>(res);
    },
    enabled: search.length >= 8,
  });

  const pengajuan = data?.pengajuan;
  const kontribusi = data?.kontribusi;
  const tagihan = data?.tagihan ?? [];
  const niu = data?.usaha?.nomorInduk ?? null;
  const nomorUsaha = niu ?? data?.usaha?.nomorBiz ?? "";
  const tunggakan = tagihan.filter((t) => t.status === "belum" || t.status === "sebagian").reduce((s, t) => s + t.jumlah - t.terbayar, 0);

  return (
    <Rw3bizShell title="Cek status" backHref={RW3BIZ_ROUTES.hub}>
      <div className="space-y-4">
        <FeatureExplain title="Nomor apa yang dimasukkan?">
          <p>
            Pakai <strong>Nomor Induk Usaha (NIU-RW3-…)</strong> — nomor tetap usaha Anda yang tertera di surat izin. Nomor ini tidak
            berubah walau izin diperbarui.
          </p>
          <p>
            Baru mendaftar dan belum punya NIU? Pakai nomor pengajuan <strong>BIZ-…</strong> dari konfirmasi pendaftaran.
          </p>
        </FeatureExplain>
        <div className="space-y-2">
          <Label htmlFor="nomor">Nomor Induk Usaha atau nomor BIZ</Label>
          <Input
            id="nomor"
            value={nomor}
            onChange={(e) => setNomor(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === "Enter" && nomor.trim().length >= 8 && setSearch(nomor.trim())}
            placeholder="NIU-RW3-0001 atau BIZ-2026-0001"
            className="font-mono"
          />
        </div>
        <Button className="w-full touch-target" onClick={() => setSearch(nomor.trim())} disabled={nomor.trim().length < 8}>
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Cek status"}
        </Button>

        {isFetched && !pengajuan && !data?.usaha && (
          <EmptyState icon={Search} title="Tidak ditemukan" description="Periksa kembali Nomor Induk Usaha atau nomor BIZ Anda." />
        )}

        {data?.surat && <KartuSurat s={data.surat} />}

        {pengajuan && (
          <div className="space-y-3 rounded-xl border bg-card p-4">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-mono font-bold">{pengajuan.nomorBiz}</p>
              <StatusBadge variant={visitrw3StatusVariant(pengajuan.status)} />
              <span className="text-xs text-muted-foreground">{pengajuan.tipe === "perpanjang" ? "Pembaruan" : "Pendaftaran baru"}</span>
            </div>
            <StatusTimeline steps={buildVisitrw3Timeline(pengajuan.status)} />
            <p className="text-sm font-medium">{pengajuan.namaUsaha}</p>
            <p className="text-xs text-muted-foreground">
              RT {String(pengajuan.rt).padStart(2, "0")} · PJ {pengajuan.pjNama}
            </p>
            {pengajuan.kategoriUsaha && (
              <p className="text-xs text-muted-foreground">{formatKategoriUsahaLabel(pengajuan.kategoriUsaha)}</p>
            )}
            {pengajuan.jamBuka && pengajuan.jamTutup && (
              <p className="text-xs">
                Jam: {pengajuan.jamBuka} – {pengajuan.jamTutup}
              </p>
            )}
            {pengajuan.alasanTolak && <p className="text-sm text-destructive">Alasan tolak: {pengajuan.alasanTolak}</p>}
            <a href={`/api/public/rw3biz/formulir/${encodeURIComponent(pengajuan.nomorBiz)}`} target="_blank" rel="noreferrer">
              <Button variant="outline" size="sm" className="w-full gap-1.5">
                <FileText className="w-4 h-4" /> Cetak formulir pendaftaran
              </Button>
            </a>
          </div>
        )}

        {kontribusi && (
          <div className="space-y-3 rounded-xl border-2 border-brand/30 bg-card p-4">
            <div className="flex items-baseline justify-between gap-2">
              <p className="font-semibold text-sm">Kontribusi bulanan</p>
              <span className="text-xs text-muted-foreground">{kontribusi.final ? "Ditetapkan setelah survey" : "Estimasi — menunggu survey"}</span>
            </div>
            <RincianKontribusi hasil={kontribusi.hasil} />
            {kontribusi.final && kontribusi.bulanan !== kontribusi.hasil.total && (
              <p className="text-xs">
                Ditetapkan: <strong>{formatRp(kontribusi.bulanan)}</strong> / bulan
              </p>
            )}
            {kontribusi.keringanan && (
              <p className="text-xs text-success">
                Keringanan {kontribusi.keringanan.persen}% sampai {kontribusi.keringanan.sampai ?? "—"}
              </p>
            )}
            <details className="rounded-lg bg-muted/40 p-2">
              <summary className="cursor-pointer text-xs font-medium">Kontribusi Anda dipakai untuk</summary>
              <ul className="mt-2 space-y-0.5 text-xs">
                {kontribusi.alokasi
                  .filter((a) => a.nominal > 0)
                  .map((a) => (
                    <li key={a.id} className="flex justify-between gap-3">
                      <span>{a.label}</span>
                      <span className="tabular-nums">{formatRp(a.nominal)}</span>
                    </li>
                  ))}
              </ul>
            </details>
          </div>
        )}

        {tagihan.length > 0 && (
          <div className="space-y-2 rounded-xl border bg-card p-4">
            <div className="flex items-baseline justify-between gap-2">
              <p className="font-semibold text-sm">Riwayat tagihan & kwitansi</p>
              {tunggakan > 0 && <span className="text-xs text-warning">Sisa {formatRp(tunggakan)}</span>}
            </div>
            <ul className="divide-y text-xs">
              {tagihan.map((t) => (
                <li key={t.id} className="space-y-1 py-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{labelPeriode(t.periode)}</p>
                      {t.catatan.length > 0 && <p className="text-muted-foreground">{t.catatan.join(" · ")}</p>}
                    </div>
                    <div className="text-right">
                      <p className="tabular-nums">{formatRp(t.jumlah)}</p>
                      <p className={t.status === "lunas" ? "text-success" : t.telat ? "text-destructive" : "text-muted-foreground"}>
                        {STATUS_TAGIHAN[t.status] ?? t.status}
                        {t.status === "sebagian" ? ` (${formatRp(t.terbayar)})` : ""}
                        {t.telat ? " · lewat tempo" : ""}
                      </p>
                    </div>
                  </div>
                  {t.pembayaran.map((b) => (
                    <a
                      key={b.id}
                      href={`/api/public/rw3biz/kwitansi/${b.id}?nomor=${encodeURIComponent(nomorUsaha)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1.5 text-brand hover:underline"
                    >
                      <Receipt className="h-3.5 w-3.5" />
                      Kwitansi {b.nomorKwitansi} · {formatRp(b.jumlah)}
                    </a>
                  ))}
                </li>
              ))}
            </ul>
            <p className="text-[11px] text-muted-foreground">
              Setiap pembayaran masuk Kas RW 03 dan diberi kwitansi. Tanpa denda keterlambatan.
            </p>
          </div>
        )}

        {(data?.razia ?? []).length > 0 && (
          <div className="space-y-2 rounded-xl border bg-card p-4">
            <p className="font-semibold text-sm">Temuan razia kendaraan</p>
            {data!.razia!.some((r) => r.hasil === "tidak_terdaftar" && !r.selesai) && (
              <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
                Ada kendaraan menuju usaha ini yang belum terdaftar. Perbarui data kendaraan milik / charter agar tidak terkena denda
                lagi.
                <Link href={`${RW3BIZ_ROUTES.perpanjang}?nomor=${encodeURIComponent(nomorUsaha)}`}>
                  <Button size="sm" className="mt-2 w-full gap-1.5">
                    <RefreshCw className="w-4 h-4" /> Perbarui data kendaraan
                  </Button>
                </Link>
              </div>
            )}
            <ul className="divide-y text-xs">
              {data!.razia!.map((r) => (
                <li key={r.id} className="space-y-0.5 py-2">
                  <div className="flex items-start justify-between gap-3">
                    <p>
                      <span className="font-mono font-semibold">{r.plat}</span> · {r.jenis} · {tglPanjang(r.tanggal)}
                    </p>
                    {r.denda > 0 && (
                      <p className={r.dendaStatus === "belum" ? "text-destructive" : "text-muted-foreground"}>
                        {formatRp(r.denda)}
                        {r.dendaStatus === "lunas" ? " · lunas" : r.dendaStatus === "dibebaskan" ? " · dibebaskan" : " · belum dibayar"}
                      </p>
                    )}
                  </div>
                  <p className="text-muted-foreground">{r.hasilLabel}</p>
                  {r.nomorKwitansi && (
                    <a
                      href={`/api/public/rw3biz/razia/${r.id}/kwitansi?nomor=${encodeURIComponent(nomorUsaha)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1.5 text-brand hover:underline"
                    >
                      <Receipt className="h-3.5 w-3.5" /> Kwitansi {r.nomorKwitansi}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {(data?.pelanggaran ?? []).length > 0 && (
          <div className="space-y-2 rounded-xl border bg-card p-4">
            <p className="font-semibold text-sm">Catatan pelanggaran</p>
            <p className="text-xs text-muted-foreground">
              Dari aduan warga yang terbukti atau temuan petugas. Pelanggaran berulang dalam 12 bulan dendanya makin besar.
            </p>
            <ul className="divide-y text-xs">
              {data!.pelanggaran!.map((p) => (
                <li key={p.id} className="space-y-0.5 py-2">
                  <div className="flex items-start justify-between gap-3">
                    <p>
                      <span className="font-semibold">{p.jenis}</span> · {tglPanjang(p.tanggal)}
                    </p>
                    <p className={p.dendaStatus === "belum" ? "text-destructive" : "text-muted-foreground"}>
                      {p.denda > 0
                        ? `${formatRp(p.denda)}${p.dendaStatus === "lunas" ? " · lunas" : p.dendaStatus === "dibebaskan" ? " · dibebaskan" : " · belum dibayar"}`
                        : "Teguran tertulis"}
                    </p>
                  </div>
                  <p className="text-muted-foreground">
                    {p.sumber} · {p.tingkat.toLowerCase()} · pelanggaran ke-{p.keBerapa}
                  </p>
                  {p.dendaRincian && <p className="text-[11px] text-muted-foreground">{p.dendaRincian}</p>}
                  {p.nomorKwitansi && (
                    <a
                      href={`/api/public/rw3biz/pelanggaran/${p.id}/kwitansi?nomor=${encodeURIComponent(nomorUsaha)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1.5 text-brand hover:underline"
                    >
                      <Receipt className="h-3.5 w-3.5" /> Kwitansi {p.nomorKwitansi}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {data?.usaha && <FormKeberatan nomor={nomorUsaha} />}
      </div>
    </Rw3bizShell>
  );
}

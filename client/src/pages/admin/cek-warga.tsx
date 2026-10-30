import { useEffect, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  AlertTriangle,
  BadgeCheck,
  Briefcase,
  Car,
  ChevronRight,
  Home,
  MessageCircle,
  Search,
  ShieldAlert,
  ShieldCheck,
  Store,
  User,
  UserSearch,
  X,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusKependudukanBadge } from "@/components/kependudukan/status-kependudukan-badge";
import { toWhatsappLink } from "@/components/kependudukan/warga-form";
import { fetchPublicJson, getApiErrorMessage } from "@/lib/queryClient";
import { VISITRW3_ROUTES } from "@/lib/visitrw3-routes";
import { RW3BIZ_ROUTES } from "@/lib/rw3biz-routes";
import { cn } from "@/lib/utils";
import type { BizCek, HasilCekWarga, KkCek, VisitCek, VonisCek } from "@shared/cek-warga";

const VONIS: Record<VonisCek, { judul: string; kelas: string; icon: typeof ShieldCheck }> = {
  warga_rw3: { judul: "Warga RW 03", kelas: "border-emerald-600 bg-emerald-50 text-emerald-900", icon: ShieldCheck },
  warga_singgah_aktif: { judul: "Warga singgah Visit RW3 — izin aktif", kelas: "border-sky-600 bg-sky-50 text-sky-900", icon: BadgeCheck },
  visit_kedaluwarsa: { judul: "Izin Visit RW3 sudah habis", kelas: "border-orange-500 bg-orange-50 text-orange-900", icon: AlertTriangle },
  pj_usaha: { judul: "Pemilik / penanggung jawab usaha RW3BIZ", kelas: "border-[hsl(40,45%,55%)] bg-[hsl(40,45%,55%)]/10 text-[hsl(30,45%,25%)]", icon: Store },
  pekerja_usaha: { judul: "Pekerja usaha RW3BIZ", kelas: "border-[hsl(40,45%,55%)] bg-[hsl(40,45%,55%)]/10 text-[hsl(30,45%,25%)]", icon: Briefcase },
};

const STATUS_PENGAJUAN: Record<string, { label: string; kelas: string }> = {
  disetujui: { label: "Disetujui", kelas: "bg-emerald-100 text-emerald-800" },
  menunggu_survey: { label: "Menunggu keputusan", kelas: "bg-amber-100 text-amber-800" },
  ditolak: { label: "Ditolak", kelas: "bg-red-100 text-red-800" },
};

const PERAN: Record<string, string> = {
  pemilik: "Pemilik",
  penanggung_jawab: "Penanggung jawab",
  pekerja_tetap: "Pekerja tetap",
  pekerja_harian: "Pekerja harian",
};

/** Sama dengan aturan server: minimal 3 huruf, atau minimal 6 angka untuk NIK. */
function bisaDicari(s: string) {
  const digit = s.replace(/\D/g, "");
  return /^[\d\s.-]+$/.test(s) ? digit.length >= 6 : s.length >= 3;
}

const rt2 = (rt: number | null | undefined) => (rt == null ? "-" : String(rt).padStart(2, "0"));

function tgl(v: string | null | undefined) {
  if (!v) return "-";
  const d = new Date(`${v.slice(0, 10)}T00:00:00`);
  return Number.isNaN(d.getTime()) ? v : d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

function MasaBerlaku({ habis, sisa }: { habis: string | null; sisa: number | null }) {
  if (!habis) return null;
  const lewat = sisa != null && sisa < 0;
  const mepet = sisa != null && sisa >= 0 && sisa <= 7;
  return (
    <span className={cn("text-xs font-medium", lewat ? "text-red-700" : mepet ? "text-amber-700" : "text-emerald-700")}>
      s.d. {tgl(habis)}
      {sisa != null && (lewat ? ` · habis ${-sisa} hari lalu` : ` · sisa ${sisa} hari`)}
    </span>
  );
}

function TombolWa({ nomor }: { nomor: string | null }) {
  if (!nomor) return null;
  return (
    <a
      href={toWhatsappLink(nomor)}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-xs font-medium text-green-700"
    >
      <MessageCircle className="h-3.5 w-3.5" /> {nomor}
    </a>
  );
}

function Bagian({ judul, icon: Icon, jumlah, children }: { judul: string; icon: typeof Home; jumlah: number; children: React.ReactNode }) {
  if (!jumlah) return null;
  return (
    <section className="space-y-2">
      <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">
        <Icon className="h-4 w-4" /> {judul} <span className="font-normal">({jumlah})</span>
      </h2>
      {children}
    </section>
  );
}

function KartuKk({ kk, onBuka }: { kk: KkCek; onBuka: () => void }) {
  return (
    <Card className="overflow-hidden">
      <div className="flex items-start gap-3 border-b bg-muted/30 p-3">
        <div className="shrink-0 rounded-lg bg-brand/10 p-2">
          <Home className="h-4 w-4 text-brand" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold break-words">{kk.alamat}</p>
          <p className="text-xs text-muted-foreground">
            RT {rt2(kk.rt)}{kk.noUnit ? ` · No. ${kk.noUnit}` : ""} · KK {kk.nomorKk} · {kk.anggota.length} anggota
          </p>
        </div>
        <Badge
          variant="outline"
          className={cn(
            "shrink-0",
            kk.kelengkapan >= 90 ? "border-emerald-600 text-emerald-700" : kk.kelengkapan >= 60 ? "border-amber-500 text-amber-700" : "border-red-500 text-red-700",
          )}
        >
          {kk.kelengkapan}% lengkap
        </Badge>
      </div>
      <CardContent className="space-y-3 p-3">
        <ul className="space-y-2">
          {kk.anggota.map((a) => (
            <li
              key={a.id}
              className={cn("rounded-lg border p-2.5", a.cocok && "border-brand/50 bg-brand/[0.04] ring-1 ring-brand/30")}
            >
              <div className="flex items-start gap-2">
                <User className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="text-sm font-medium leading-tight break-words">
                    {a.nama}
                    {a.cocok && <span className="ml-1.5 text-[10px] font-bold uppercase text-brand">dicari</span>}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    NIK {a.nik} · {a.kedudukan}
                    {a.umur != null ? ` · ${a.umur} th` : ""}
                    {a.pekerjaan ? ` · ${a.pekerjaan}` : ""}
                  </p>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <StatusKependudukanBadge status={a.status} />
                    {a.nomorWa ? <TombolWa nomor={a.nomorWa} /> : null}
                  </div>
                  {a.kurang.length > 0 && (
                    <p className="text-xs text-amber-800">
                      <span className="font-medium">Belum lengkap:</span> {a.kurang.join(", ")}
                    </p>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
        {kk.kurangKeluarga.length > 0 && (
          <div className="rounded-lg bg-amber-50 p-2.5 text-xs text-amber-900">
            <p className="font-medium">Data keluarga belum lengkap:</p>
            <p>{kk.kurangKeluarga.join(", ")}</p>
          </div>
        )}
        <Button variant="outline" size="sm" className="w-full" onClick={onBuka}>
          Buka data keluarga <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}

function KartuVisit({ v, onBuka }: { v: VisitCek; onBuka: () => void }) {
  const st = STATUS_PENGAJUAN[v.status];
  return (
    <Card>
      <CardContent className="space-y-2.5 p-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-semibold">{v.nomorVisitrw3 ?? "Warga singgah"}</p>
            <p className="text-xs text-muted-foreground break-words">
              {v.jenisWarga ? `${v.jenisWarga[0].toUpperCase()}${v.jenisWarga.slice(1)} · ` : ""}RT {rt2(v.rt)}
              {v.alamat ? ` · ${v.alamat}` : ""}
              {v.nomorUnit ? ` · Unit ${v.nomorUnit}` : ""}
            </p>
          </div>
          <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", st?.kelas ?? "bg-muted")}>
            {st?.label ?? v.status}
          </span>
        </div>
        <div className="text-xs">
          <span className="text-muted-foreground">Masa tinggal: {tgl(v.tanggalMulai)} </span>
          <MasaBerlaku habis={v.tanggalHabis} sisa={v.sisaHari} />
        </div>
        {v.keperluan && <p className="text-xs text-muted-foreground">Keperluan: {v.keperluan}</p>}
        {v.alasanTolak && <p className="text-xs text-red-700">Alasan ditolak: {v.alasanTolak}</p>}
        <ul className="space-y-1.5">
          {v.penghuni.map((h, i) => (
            <li key={i} className={cn("rounded-md border p-2 text-xs", h.cocok && "border-sky-400 bg-sky-50/60")}>
              <p className="text-sm font-medium">
                {h.nama}
                {h.isAnak && <span className="ml-1 text-muted-foreground">(anak)</span>}
                {h.cocok && <span className="ml-1.5 text-[10px] font-bold uppercase text-sky-700">dicari</span>}
              </p>
              <p className="text-muted-foreground">
                {h.nik ? `NIK ${h.nik}` : "NIK -"}
                {h.pekerjaan ? ` · ${h.pekerjaan}` : ""}
              </p>
              <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5">
                <TombolWa nomor={h.nomorWa} />
                {h.kendaraan && (
                  <span className="inline-flex items-center gap-1"><Car className="h-3.5 w-3.5" /> {h.kendaraan}</span>
                )}
              </div>
            </li>
          ))}
        </ul>
        <Button variant="outline" size="sm" className="w-full" onClick={onBuka}>
          Buka Visit RW3 <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}

function KartuBiz({ b, onBuka }: { b: BizCek; onBuka: () => void }) {
  const st = STATUS_PENGAJUAN[b.statusPengajuan];
  return (
    <Card>
      <CardContent className="space-y-2.5 p-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-semibold break-words">{b.namaUsaha}</p>
            <p className="text-xs text-muted-foreground break-words">
              {b.nomorInduk ?? b.nomorBiz} · RT {rt2(b.rt)} · {b.alamat}
            </p>
          </div>
          <div className="flex flex-wrap gap-1">
            <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", st?.kelas ?? "bg-muted")}>
              {st?.label ?? b.statusPengajuan}
            </span>
            {b.statusUsaha && b.statusUsaha !== "aktif" && (
              <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-medium text-red-800">Usaha {b.statusUsaha}</span>
            )}
          </div>
        </div>
        <div className="text-xs">
          <span className="text-muted-foreground">Izin: {tgl(b.tanggalMulai)} </span>
          <MasaBerlaku habis={b.tanggalHabis} sisa={b.sisaHari} />
        </div>
        <p className="text-xs text-muted-foreground">
          PJ: {b.pjNama} {b.pjNomorWa ? <TombolWa nomor={b.pjNomorWa} /> : null}
        </p>
        {b.tagihanBelumLunas > 0 && (
          <p className="text-xs font-medium text-red-700">{b.tagihanBelumLunas} tagihan kontribusi belum lunas</p>
        )}
        {b.dataLama && (
          <p className="text-xs font-medium text-orange-700">Orang ini hanya ada di pengajuan lama — tidak tercatat di izin terbaru.</p>
        )}
        <ul className="space-y-1.5">
          {b.orang.map((o, i) => (
            <li key={i} className={cn("rounded-md border p-2 text-xs", o.cocok && "border-[hsl(40,45%,55%)] bg-[hsl(40,45%,55%)]/10")}>
              <p className="text-sm font-medium">
                {o.nama}
                {o.cocok && <span className="ml-1.5 text-[10px] font-bold uppercase text-[hsl(30,45%,30%)]">dicari</span>}
              </p>
              <p className="text-muted-foreground">
                {o.peran ? PERAN[o.peran] ?? o.peran : o.isPj ? "Penanggung jawab" : "Pekerja"}
                {o.asal ? ` · ${o.asal === "rw3" ? "Warga RW3" : "Luar RW3"}` : ""}
                {o.domisili ? ` · ${o.domisili}` : ""}
                {o.nik ? ` · NIK ${o.nik}` : ""}
              </p>
              <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5">
                <TombolWa nomor={o.nomorWa} />
                {o.kendaraan && (
                  <span className="inline-flex items-center gap-1"><Car className="h-3.5 w-3.5" /> {o.kendaraan}</span>
                )}
              </div>
            </li>
          ))}
        </ul>
        <Button variant="outline" size="sm" className="w-full" onClick={onBuka}>
          Buka RW3BIZ <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}

export default function AdminCekWarga() {
  const [, setLocation] = useLocation();
  const [q, setQ] = useState("");
  const [cari, setCari] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setCari(q.trim()), 400);
    return () => clearTimeout(t);
  }, [q]);

  const siap = bisaDicari(cari);
  const { data, isFetching, isError, error } = useQuery<HasilCekWarga>({
    queryKey: ["/api/admin/cek-warga", cari],
    queryFn: ({ signal }) => fetchPublicJson<HasilCekWarga>(`/api/admin/cek-warga?q=${encodeURIComponent(cari)}`, signal),
    enabled: siap,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    retry: 1,
    placeholderData: keepPreviousData,
  });

  const hasil = siap ? data : undefined;
  const memuatUlang = siap && isFetching && !!hasil && hasil.q !== cari;
  const kosong = !!hasil && hasil.mode !== "pendek" && !hasil.warga.length && !hasil.visit.length && !hasil.biz.length;
  const tanpaStatusAktif = !!hasil && !kosong && hasil.vonis.length === 0 && hasil.mode !== "pendek";

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="space-y-1">
        <h1 className="flex items-center gap-2 text-xl font-bold">
          <UserSearch className="h-6 w-6 text-brand" /> Cek Warga
        </h1>
        <p className="text-sm text-muted-foreground">
          Cek cepat siapa seseorang: warga RW 03, warga singgah Visit RW3, atau pemilik/pekerja usaha RW3BIZ.
        </p>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
        <Input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Nama, nama anggota keluarga, atau NIK KTP"
          type="search"
          enterKeyHint="search"
          aria-label="Cek warga"
          className="h-14 rounded-2xl pl-12 pr-12 text-base"
        />
        {q && (
          <button
            type="button"
            onClick={() => setQ("")}
            className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
            aria-label="Hapus"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {q.trim().length > 0 && !bisaDicari(q.trim()) && (
        <p className="text-sm text-muted-foreground">Ketik minimal 3 huruf (atau 6 angka NIK).</p>
      )}

      {siap && isFetching && !hasil && (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full rounded-2xl" />
          <Skeleton className="h-40 w-full rounded-2xl" />
        </div>
      )}

      {isError && <p className="text-sm text-destructive">{getApiErrorMessage(error, "Gagal mengecek warga.")}</p>}

      {hasil && (
        <div className={cn("space-y-4 transition-opacity", memuatUlang && "opacity-50")} aria-busy={memuatUlang}>
          <div className="space-y-2">
            {hasil.vonis.map((v) => {
              const c = VONIS[v];
              return (
                <div key={v} className={cn("flex items-center gap-3 rounded-2xl border-2 p-4", c.kelas)}>
                  <c.icon className="h-8 w-8 shrink-0" />
                  <p className="text-base font-bold leading-tight">{c.judul}</p>
                </div>
              );
            })}
            {kosong && (
              <div className="flex items-start gap-3 rounded-2xl border-2 border-red-600 bg-red-50 p-4 text-red-900">
                <ShieldAlert className="h-8 w-8 shrink-0" />
                <div>
                  <p className="text-base font-bold leading-tight">Tidak terdaftar di data RW 03</p>
                  <p className="mt-1 text-sm">
                    Bukan warga, bukan warga singgah Visit RW3, dan tidak tercatat di RW3BIZ. Tanyakan KTP, alamat tinggal,
                    dan keperluannya di wilayah RW 03.
                  </p>
                </div>
              </div>
            )}
            {tanpaStatusAktif && (
              <div className="flex items-start gap-3 rounded-2xl border-2 border-orange-500 bg-orange-50 p-4 text-orange-900">
                <AlertTriangle className="h-8 w-8 shrink-0" />
                <div>
                  <p className="text-base font-bold leading-tight">Tercatat, tapi tidak ada status aktif</p>
                  <p className="mt-1 text-sm">Lihat catatan di bawah sebelum mempercayai pengakuannya.</p>
                </div>
              </div>
            )}
          </div>

          {hasil.peringatan.length > 0 && (
            <ul className="space-y-1.5 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
              {hasil.peringatan.map((p, i) => (
                <li key={i} className="flex gap-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> <span>{p}</span>
                </li>
              ))}
            </ul>
          )}

          <Bagian judul="Warga RW 03" icon={Home} jumlah={hasil.warga.length}>
            {hasil.wargaTerpotong && (
              <p className="text-xs text-muted-foreground">Menampilkan 10 keluarga pertama — persempit kata kunci.</p>
            )}
            <div className="space-y-3">
              {hasil.warga.map((kk) => (
                <KartuKk key={kk.kkId} kk={kk} onBuka={() => setLocation(`/admin/kelola-warga/keluarga/${kk.kkId}`)} />
              ))}
            </div>
          </Bagian>

          <Bagian judul="Visit RW3" icon={BadgeCheck} jumlah={hasil.visit.length}>
            <div className="space-y-3">
              {hasil.visit.map((v) => (
                <KartuVisit
                  key={`${v.pengajuanId ?? "ws"}-${v.wargaSinggahId ?? ""}`}
                  v={v}
                  onBuka={() =>
                    setLocation(v.status === "menunggu_survey" ? VISITRW3_ROUTES.admin.antrianSurvey : VISITRW3_ROUTES.admin.penghuni)
                  }
                />
              ))}
            </div>
          </Bagian>

          <Bagian judul="RW3BIZ" icon={Store} jumlah={hasil.biz.length}>
            <div className="space-y-3">
              {hasil.biz.map((b) => (
                <KartuBiz
                  key={b.pengajuanId}
                  b={b}
                  onBuka={() =>
                    setLocation(b.statusPengajuan === "menunggu_survey" ? RW3BIZ_ROUTES.admin.antrianSurvey : RW3BIZ_ROUTES.admin.antrianSudah)
                  }
                />
              ))}
            </div>
          </Bagian>
        </div>
      )}
    </div>
  );
}

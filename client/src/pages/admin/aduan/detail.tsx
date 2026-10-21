import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import {
  ArrowLeft, CalendarClock, CheckCircle2, Eye, FileText, Gavel, GitMerge, Globe, Loader2, Lock, MessageCircle, Search,
  Send, Store, UserCog, XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { toWaMeUrl } from "@/lib/wa";
import { cn } from "@/lib/utils";
import { KUNCI_RINGKASAN_ADUAN, ambilAduanJson, kirimAduanJson } from "@/hooks/use-aduan-admin";
import {
  ADUAN_ROUTES, IKON_KATEGORI, IKON_MODE, LencanaPrioritas, LencanaStatus, PilihFotoBukti, formatTanggal, formatWaktu,
} from "@/components/aduan/aduan-ui";
import {
  DAMPAK_ADUAN_LABEL, FREKUENSI_ADUAN_LABEL, JENIS_TERADU, JENIS_TERADU_LABEL, KATEGORI_ADUAN_INFO, MODE_IDENTITAS_INFO,
  PRIORITAS_ADUAN, PRIORITAS_ADUAN_LABEL, STATUS_TEGURAN_LABEL, TINGKAT_TEGURAN, TINGKAT_TEGURAN_INFO,
  type DampakAduan, type FrekuensiAduan, type JenisTeradu, type KategoriAduan, type ModeIdentitas, type StatusTeguran, type TingkatTeguran,
} from "@shared/aduan";

type Teguran = {
  id: number; tingkat: TingkatTeguran; pelanggaran: string; kewajiban: string; tenggat: string | null; suratId: number | null;
  nomorSurat: string | null; status: StatusTeguran; caraSerah: string | null; dibuat: string;
};

type Detail = {
  id: number; nomor: string; kategori: KategoriAduan; judul: string; uraian: string; lokasi: string | null; rtLokasi: number | null;
  tanggalKejadian: string | null; frekuensi: FrekuensiAduan; dampak: DampakAduan; prioritas: string; status: string;
  teradu: { jenis: JenisTeradu; refId: number | null; nama: string | null; alamat: string | null; kunci: string | null; usahaId: number | null };
  pelapor: { mode: ModeIdentitas; tersedia: boolean; nama: string | null; wa: string | null; rt: number | null; tersamar?: boolean };
  pesanPublik: string | null; catatanInternal: string | null; ditanganiOleh: string | null; rw3bizPelanggaranId: number | null;
  dibuat: string;
  bukti: { id: number; sumber: string }[];
  timeline: { id: number; jenis: string; isi: string; publik: boolean; oleh: string | null; waktu: string }[];
  teguran: Teguran[];
  aksesIdentitas: { oleh: string; alasan: string | null; waktu: string }[];
  aduanLainTeradu: { id: number; nomor: string; judul: string; status: string }[];
  riwayatTeguran: { id: number; tingkat: TingkatTeguran; status: string; nomorSurat: string | null; dibuat: string }[];
  saranTingkat: TingkatTeguran | null;
};

const KEWAJIBAN_SARAN: Record<KategoriAduan, string[]> = {
  sampah: ["Tidak membuang sampah sembarangan", "Membersihkan sampah di lokasi paling lambat batas waktu"],
  kebisingan: ["Tidak menimbulkan suara keras di atas pukul 22.00", "Menghormati waktu istirahat tetangga"],
  keamanan: ["Menghentikan kegiatan yang meresahkan warga", "Melapor kepada pengurus RW bila menerima tamu menginap"],
  parkir: ["Tidak memarkir kendaraan menutup jalan/gang", "Memastikan akses rumah warga tidak terhalang"],
  usaha: ["Menjaga kebersihan dan ketertiban lokasi usaha", "Mengatur parkir pembeli agar tidak menghalangi jalan"],
  kost: ["Melaporkan seluruh penghuni kepada pengurus RW", "Menjaga ketenangan lingkungan setelah pukul 22.00"],
  bangunan: ["Mengamankan bangunan/material agar tidak membahayakan warga", "Memperbaiki kerusakan yang ditimbulkan"],
  ketertiban: ["Menjaga ketertiban dan menghormati tetangga", "Menyelesaikan perselisihan melalui musyawarah RW"],
  hewan: ["Menjaga hewan peliharaan agar tidak berkeliaran", "Membersihkan kotoran hewan di area umum"],
  lainnya: [],
};

const tambahHari = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
};

function Kartu({ judul, ikon: Ikon, children, aksi, className }: { judul: string; ikon?: typeof Eye; children: React.ReactNode; aksi?: React.ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-2xl border bg-card p-4 shadow-sm", className)}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-bold">{Ikon && <Ikon className="h-4 w-4 text-brand" />}{judul}</h2>
        {aksi}
      </div>
      {children}
    </section>
  );
}

export default function AdminAduanDetail({ id }: { id: number }) {
  const { toast } = useToast();
  const [, go] = useLocation();
  const kunci = ["/api/admin/aduan", id];
  const { data: a, isLoading, error } = useQuery<Detail>({ queryKey: kunci, queryFn: () => ambilAduanJson(`/api/admin/aduan/${id}`) });
  const [dialog, setDialog] = useState<null | "identitas" | "teradu" | "klarifikasi" | "teguran" | "tutup" | "gabung" | "rw3biz">(null);
  const [tutupStatus, setTutupStatus] = useState<"selesai" | "tidak_terbukti">("selesai");

  const segarkan = (d?: Detail) => {
    if (d) queryClient.setQueryData(kunci, d);
    else queryClient.invalidateQueries({ queryKey: kunci });
    queryClient.invalidateQueries({ queryKey: ["/api/admin/aduan"], exact: false });
    queryClient.invalidateQueries({ queryKey: KUNCI_RINGKASAN_ADUAN });
  };
  const gagal = (e: unknown) => toast({ title: "Gagal", description: (e as Error).message, variant: "destructive" });
  const ubah = useMutation({
    mutationFn: (body: Record<string, unknown>) => kirimAduanJson<Detail>(`/api/admin/aduan/${id}`, "PATCH", body),
    onSuccess: (d) => { segarkan(d); toast({ title: "Tersimpan" }); },
    onError: gagal,
  });

  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: KUNCI_RINGKASAN_ADUAN });
  }, [id]);

  if (isLoading) return <div className="max-w-6xl space-y-3"><Skeleton className="h-32 w-full" /><Skeleton className="h-64 w-full" /></div>;
  if (error || !a) return <p className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-destructive">{(error as Error)?.message ?? "Aduan tidak ditemukan"}</p>;

  const Ikon = IKON_KATEGORI[a.kategori];
  const IkonMode = IKON_MODE[a.pelapor.mode];
  const tutup = ["selesai", "tidak_terbukti", "digabung"].includes(a.status);
  const adaTeradu = !!a.teradu.nama;

  return (
    <div className="max-w-6xl space-y-4">
      <button type="button" onClick={() => go(ADUAN_ROUTES.admin)} className="inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline">
        <ArrowLeft className="h-4 w-4" /> Pusat aduan
      </button>

      <div className="flex flex-wrap items-start gap-3 rounded-2xl border bg-card p-4 shadow-sm">
        <span className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-brand text-white"><Ikon className="h-7 w-7" /></span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm font-bold text-muted-foreground">{a.nomor}</span>
            <LencanaPrioritas prioritas={a.prioritas} />
            <LencanaStatus status={a.status} />
          </div>
          <h1 className="mt-1 text-xl font-bold leading-snug sm:text-2xl">{a.judul}</h1>
          <p className="text-sm text-muted-foreground">
            {KATEGORI_ADUAN_INFO[a.kategori]?.label} · masuk {formatWaktu(a.dibuat)}{a.ditanganiOleh ? ` · ditangani ${a.ditanganiOleh}` : ""}
          </p>
        </div>
        <Select value={a.prioritas} onValueChange={(v) => ubah.mutate({ prioritas: v })}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>{PRIORITAS_ADUAN.map((p) => <SelectItem key={p} value={p}>Prioritas {PRIORITAS_ADUAN_LABEL[p]}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <Kartu judul="Isi aduan" ikon={FileText}>
            <dl className="mb-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
              <div><dt className="text-xs text-muted-foreground">Lokasi</dt><dd className="font-medium">{[a.rtLokasi ? `RT 0${a.rtLokasi}` : null, a.lokasi].filter(Boolean).join(" · ") || "-"}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Kejadian</dt><dd className="font-medium">{formatTanggal(a.tanggalKejadian)}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Frekuensi</dt><dd className="font-medium">{FREKUENSI_ADUAN_LABEL[a.frekuensi]}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Dampak</dt><dd className="font-medium">{DAMPAK_ADUAN_LABEL[a.dampak]}</dd></div>
            </dl>
            <p className="whitespace-pre-wrap rounded-xl bg-muted p-3 text-sm">{a.uraian}</p>
            {a.bukti.length > 0 && (
              <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
                {a.bukti.map((b) => (
                  <a key={b.id} href={`/api/admin/aduan/bukti/${b.id}`} target="_blank" rel="noreferrer" className="relative block aspect-square overflow-hidden rounded-xl border">
                    <img src={`/api/admin/aduan/bukti/${b.id}`} alt="Bukti" className="h-full w-full object-cover" loading="lazy" />
                    {b.sumber === "petugas" && <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 text-[10px] text-white">petugas</span>}
                  </a>
                ))}
              </div>
            )}
          </Kartu>

          <Kartu judul="Tindakan" ikon={Gavel}>
            {tutup ? (
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span>Aduan ini sudah ditutup.</span>
                <Button size="sm" variant="outline" onClick={() => ubah.mutate({ status: "diproses" })}>Buka kembali</Button>
              </div>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {a.status === "masuk" && (
                  <Button variant="outline" className="h-auto justify-start gap-2 py-3" onClick={() => ubah.mutate({ status: "diproses" })}>
                    <Search className="h-4 w-4" /> Tandai sedang diperiksa
                  </Button>
                )}
                <Button variant="outline" className="h-auto justify-start gap-2 py-3" onClick={() => setDialog("klarifikasi")} disabled={!adaTeradu}>
                  <CalendarClock className="h-4 w-4" /> Undang klarifikasi
                </Button>
                <Button className="h-auto justify-start gap-2 bg-red-700 py-3 hover:bg-red-800" onClick={() => setDialog("teguran")} disabled={!adaTeradu}>
                  <Gavel className="h-4 w-4" /> Terbitkan teguran{a.saranTingkat ? ` (${TINGKAT_TEGURAN_INFO[a.saranTingkat].label})` : ""}
                </Button>
                {a.teradu.jenis === "usaha" && !a.rw3bizPelanggaranId && (
                  <Button variant="outline" className="h-auto justify-start gap-2 py-3" onClick={() => setDialog("rw3biz")}>
                    <Store className="h-4 w-4" /> Teruskan ke denda RW3BIZ
                  </Button>
                )}
                {a.status !== "terbukti" && a.status !== "teguran" && (
                  <Button variant="outline" className="h-auto justify-start gap-2 py-3" onClick={() => ubah.mutate({ status: "terbukti" })}>
                    <CheckCircle2 className="h-4 w-4" /> Nyatakan terbukti
                  </Button>
                )}
                <Button variant="outline" className="h-auto justify-start gap-2 py-3" onClick={() => { setTutupStatus("selesai"); setDialog("tutup"); }}>
                  <CheckCircle2 className="h-4 w-4 text-green-700" /> Selesaikan
                </Button>
                <Button variant="outline" className="h-auto justify-start gap-2 py-3" onClick={() => { setTutupStatus("tidak_terbukti"); setDialog("tutup"); }}>
                  <XCircle className="h-4 w-4" /> Tidak terbukti
                </Button>
                <Button variant="outline" className="h-auto justify-start gap-2 py-3" onClick={() => setDialog("gabung")}>
                  <GitMerge className="h-4 w-4" /> Gabungkan (duplikat)
                </Button>
              </div>
            )}
            {!adaTeradu && !tutup && <p className="mt-2 text-xs text-amber-800">Tetapkan pihak teradu dulu untuk mengundang klarifikasi atau menerbitkan teguran.</p>}
            {a.rw3bizPelanggaranId && (
              <p className="mt-3 text-sm">Sudah diteruskan ke RW3BIZ. <Link href="/admin/rw3biz/pelanggaran" className="font-semibold text-brand underline">Buka pelanggaran usaha</Link></p>
            )}
          </Kartu>

          {a.teguran.length > 0 && (
            <Kartu judul="Teguran untuk aduan ini" ikon={Gavel}>
              <div className="space-y-2">{a.teguran.map((t) => <ItemTeguran key={t.id} t={t} onBerubah={() => segarkan()} />)}</div>
            </Kartu>
          )}

          <Kartu judul="Perjalanan aduan" ikon={Send}>
            <CatatanBaru id={id} onTersimpan={segarkan} />
            <ol className="relative mt-4 space-y-3 border-l-2 border-brand/20 pl-5">
              {[...a.timeline].reverse().map((t) => (
                <li key={t.id} className="relative">
                  <span className={cn("absolute -left-[27px] top-1 h-3.5 w-3.5 rounded-full border-2 border-card", t.publik ? "bg-brand" : "bg-gray-400")} />
                  <p className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    {formatWaktu(t.waktu)}{t.oleh ? ` · ${t.oleh}` : ""}
                    {t.publik ? <span className="inline-flex items-center gap-0.5 text-brand"><Globe className="h-3 w-3" />dilihat pelapor</span>
                      : <span className="inline-flex items-center gap-0.5"><Lock className="h-3 w-3" />internal</span>}
                  </p>
                  <p className="whitespace-pre-wrap text-sm">{t.isi}</p>
                </li>
              ))}
            </ol>
          </Kartu>
        </div>

        <div className="space-y-4">
          <Kartu judul="Pelapor" ikon={IkonMode} className={a.pelapor.mode === "rahasia" ? "border-amber-300" : undefined}>
            <p className="mb-2 inline-flex rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold">{MODE_IDENTITAS_INFO[a.pelapor.mode].label}</p>
            {a.pelapor.mode === "anonim" ? (
              <p className="text-sm text-muted-foreground">Pelapor anonim. Identitas tidak disimpan. Komunikasi hanya lewat pesan di halaman lacak.</p>
            ) : a.pelapor.mode === "terbuka" ? (
              <IdentitasTerbuka nama={a.pelapor.nama} wa={a.pelapor.wa} rt={a.pelapor.rt} nomor={a.nomor} />
            ) : (
              <div className="space-y-2 text-sm">
                <p className="font-mono">{a.pelapor.nama ?? "-"}</p>
                <p className="font-mono">{a.pelapor.wa ?? "-"}</p>
                <p className="text-xs text-amber-900">Identitas dirahasiakan. Membuka identitas wajib menulis alasan dan tercatat permanen.</p>
                <Button size="sm" variant="outline" className="w-full gap-2 border-amber-400" onClick={() => setDialog("identitas")}>
                  <Eye className="h-4 w-4" /> Buka identitas
                </Button>
              </div>
            )}
            {a.aksesIdentitas.length > 0 && (
              <div className="mt-3 border-t pt-2 text-xs text-muted-foreground">
                <p className="font-semibold">Riwayat dibuka:</p>
                {a.aksesIdentitas.map((x, i) => <p key={i}>{formatWaktu(x.waktu)} · {x.oleh}: {x.alasan}</p>)}
              </div>
            )}
          </Kartu>

          <Kartu judul="Pihak teradu" ikon={UserCog} aksi={!tutup && <Button size="sm" variant="ghost" onClick={() => setDialog("teradu")}>Ubah</Button>}>
            {adaTeradu ? (
              <div className="space-y-1 text-sm">
                <p className="text-base font-bold">{a.teradu.nama}</p>
                <p className="text-muted-foreground">{JENIS_TERADU_LABEL[a.teradu.jenis]}{a.teradu.alamat ? ` · ${a.teradu.alamat}` : ""}</p>
                {a.riwayatTeguran.length > 0 ? (
                  <p className="pt-1 font-semibold text-red-700">{a.riwayatTeguran.length} teguran tercatat · terakhir {TINGKAT_TEGURAN_INFO[a.riwayatTeguran[0].tingkat]?.label}</p>
                ) : <p className="pt-1 text-green-700">Belum pernah ditegur</p>}
                {a.aduanLainTeradu.length > 0 && <p className="text-muted-foreground">{a.aduanLainTeradu.length} aduan lain tentang pihak ini</p>}
                <p className="pt-1 text-xs">Saran tindakan: <b>{a.saranTingkat ? TINGKAT_TEGURAN_INFO[a.saranTingkat].label : "Teruskan ke Kelurahan (SP-3 sudah diberikan)"}</b></p>
                {a.teradu.kunci && (
                  <Link href={`${ADUAN_ROUTES.adminTeradu}?kunci=${encodeURIComponent(a.teradu.kunci)}`} className="inline-block pt-1 text-sm font-semibold text-brand underline">
                    Lihat rapor lengkap
                  </Link>
                )}
              </div>
            ) : (
              <div className="space-y-2 text-sm">
                <p className="text-muted-foreground">Belum ditetapkan ({JENIS_TERADU_LABEL[a.teradu.jenis]}).</p>
                <Button size="sm" className="w-full" onClick={() => setDialog("teradu")}>Tetapkan teradu</Button>
              </div>
            )}
          </Kartu>

          <PesanPelapor a={a} simpan={(body) => ubah.mutate(body)} memuat={ubah.isPending} />
        </div>
      </div>

      <DialogIdentitas buka={dialog === "identitas"} tutup={() => setDialog(null)} id={id} onDibuka={() => segarkan()} />
      <DialogTeradu buka={dialog === "teradu"} tutup={() => setDialog(null)} a={a} onSimpan={segarkan} />
      <DialogKlarifikasi buka={dialog === "klarifikasi"} tutup={() => setDialog(null)} id={id} onSelesai={() => segarkan()} />
      <DialogTeguran buka={dialog === "teguran"} tutup={() => setDialog(null)} a={a} onTerbit={() => segarkan()} />
      <DialogTutup buka={dialog === "tutup"} tutup={() => setDialog(null)} status={tutupStatus} kirim={(pesan) => ubah.mutate({ status: tutupStatus, pesanPublik: pesan }, { onSuccess: () => setDialog(null) })} memuat={ubah.isPending} />
      <DialogGabung buka={dialog === "gabung"} tutup={() => setDialog(null)} id={id} onSimpan={segarkan} />
      <DialogRw3biz buka={dialog === "rw3biz"} tutup={() => setDialog(null)} id={id} onSelesai={() => segarkan()} />
    </div>
  );
}

function IdentitasTerbuka({ nama, wa, rt, nomor }: { nama: string | null; wa: string | null; rt: number | null; nomor: string }) {
  return (
    <div className="space-y-1 text-sm">
      <p className="text-base font-bold">{nama ?? "-"}</p>
      <p>{wa ?? "-"}{rt ? ` · RT 0${rt}` : ""}</p>
      {wa && (
        <a href={toWaMeUrl(wa, `Assalamu'alaikum ${nama ?? ""}, kami pengurus RW 03 terkait aduan ${nomor}.`)} target="_blank" rel="noreferrer"
          className="inline-flex items-center gap-1 pt-1 font-semibold text-green-700 underline">
          <MessageCircle className="h-4 w-4" /> Hubungi via WhatsApp
        </a>
      )}
    </div>
  );
}

function PesanPelapor({ a, simpan, memuat }: { a: Detail; simpan: (b: Record<string, unknown>) => void; memuat: boolean }) {
  const [pesan, setPesan] = useState(a.pesanPublik ?? "");
  const [internal, setInternal] = useState(a.catatanInternal ?? "");
  useEffect(() => { setPesan(a.pesanPublik ?? ""); setInternal(a.catatanInternal ?? ""); }, [a.pesanPublik, a.catatanInternal]);
  return (
    <Kartu judul="Pesan & catatan" ikon={MessageCircle}>
      <div className="space-y-3">
        <div className="space-y-1">
          <Label className="text-xs">Pesan untuk pelapor (tampil di halaman lacak)</Label>
          <Textarea rows={3} value={pesan} maxLength={1000} onChange={(e) => setPesan(e.target.value)} placeholder="Mis. Terima kasih, petugas sudah mengecek ke lokasi." />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Catatan internal (hanya admin)</Label>
          <Textarea rows={3} value={internal} maxLength={3000} onChange={(e) => setInternal(e.target.value)} />
        </div>
        <Button size="sm" className="w-full" disabled={memuat} onClick={() => simpan({ pesanPublik: pesan, catatanInternal: internal })}>Simpan</Button>
      </div>
    </Kartu>
  );
}

function CatatanBaru({ id, onTersimpan }: { id: number; onTersimpan: (d: Detail) => void }) {
  const { toast } = useToast();
  const [isi, setIsi] = useState("");
  const [publik, setPublik] = useState(false);
  const [foto, setFoto] = useState<string[]>([]);
  const [buka, setBuka] = useState(false);
  const m = useMutation({
    mutationFn: () => kirimAduanJson<Detail>(`/api/admin/aduan/${id}/catatan`, "POST", { isi, publik, foto }),
    onSuccess: (d) => { onTersimpan(d); setIsi(""); setFoto([]); setBuka(false); toast({ title: "Catatan ditambahkan" }); },
    onError: (e) => toast({ title: "Gagal", description: (e as Error).message, variant: "destructive" }),
  });
  if (!buka) return <Button size="sm" variant="outline" onClick={() => setBuka(true)}>+ Catatan / hasil cek lapangan</Button>;
  return (
    <div className="space-y-2 rounded-xl border bg-muted/30 p-3">
      <Textarea rows={3} value={isi} onChange={(e) => setIsi(e.target.value)} placeholder="Hasil pengecekan, keterangan saksi, dll." />
      <PilihFotoBukti foto={foto} onChange={setFoto} />
      <label className="flex items-center gap-2 text-sm"><Switch checked={publik} onCheckedChange={setPublik} /> Tampilkan ke pelapor</label>
      <div className="flex gap-2">
        <Button size="sm" variant="ghost" onClick={() => setBuka(false)}>Batal</Button>
        <Button size="sm" disabled={isi.trim().length < 3 || m.isPending} onClick={() => m.mutate()}>Simpan catatan</Button>
      </div>
    </div>
  );
}

export function ItemTeguran({ t, onBerubah }: { t: Teguran & { teraduNama?: string; aduanNomor?: string | null; lewat?: boolean }; onBerubah: () => void }) {
  const { toast } = useToast();
  const m = useMutation({
    mutationFn: (body: Record<string, unknown>) => kirimAduanJson(`/api/admin/aduan/teguran/${t.id}`, "PATCH", body),
    onSuccess: () => { onBerubah(); toast({ title: "Teguran diperbarui" }); },
    onError: (e) => toast({ title: "Gagal", description: (e as Error).message, variant: "destructive" }),
  });
  const info = TINGKAT_TEGURAN_INFO[t.tingkat];
  return (
    <div className={cn("rounded-xl border p-3", t.lewat && "border-orange-400 bg-orange-50/60")}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-md bg-red-700 px-2 py-0.5 text-xs font-bold text-white">{info?.label ?? t.tingkat}</span>
        <span className="text-xs font-semibold">{STATUS_TEGURAN_LABEL[t.status]}</span>
        {t.lewat && <span className="text-xs font-bold text-orange-700">Tenggat lewat</span>}
      </div>
      {t.teraduNama && <p className="mt-1 font-semibold">{t.teraduNama}{t.aduanNomor ? <span className="font-normal text-muted-foreground"> · {t.aduanNomor}</span> : null}</p>}
      <p className="mt-1 text-sm">{t.pelanggaran}</p>
      <p className="text-xs text-muted-foreground">Tenggat {formatTanggal(t.tenggat)} · {t.nomorSurat ?? "tanpa nomor"}{t.caraSerah ? " · sudah diserahkan" : ""}</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {t.suratId && (
          <a href={`/api/wilayah/surat/${t.suratId}/pdf`} target="_blank" rel="noreferrer">
            <Button size="sm" variant="outline" className="h-8 gap-1"><FileText className="h-3.5 w-3.5" />Cetak surat</Button>
          </a>
        )}
        {t.status === "aktif" && (
          <>
            {!t.caraSerah && (
              <Select onValueChange={(v) => m.mutate({ caraSerah: v, diserahkanAt: new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" }) })}>
                <SelectTrigger className="h-8 w-auto text-xs"><SelectValue placeholder="Catat penyerahan" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="langsung">Diserahkan langsung</SelectItem>
                  <SelectItem value="titip_rt">Dititipkan lewat RT</SelectItem>
                  <SelectItem value="ditempel">Ditempel di lokasi</SelectItem>
                  <SelectItem value="lisan">Disampaikan lisan</SelectItem>
                </SelectContent>
              </Select>
            )}
            <Button size="sm" className="h-8 gap-1 bg-green-700 hover:bg-green-800" disabled={m.isPending} onClick={() => m.mutate({ status: "dipatuhi" })}>
              <CheckCircle2 className="h-3.5 w-3.5" />Dipatuhi
            </Button>
            <Button size="sm" variant="outline" className="h-8 border-red-300 text-red-700" disabled={m.isPending} onClick={() => m.mutate({ status: "tidak_dipatuhi" })}>
              Tidak dipatuhi
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Dialog
function DialogIdentitas({ buka, tutup, id, onDibuka }: { buka: boolean; tutup: () => void; id: number; onDibuka: () => void }) {
  const [alasan, setAlasan] = useState("");
  const [hasil, setHasil] = useState<{ nama: string | null; wa: string | null; rt: number | null } | null>(null);
  const m = useMutation({
    mutationFn: () => kirimAduanJson<{ nama: string | null; wa: string | null; rt: number | null }>(`/api/admin/aduan/${id}/identitas`, "POST", { alasan }),
    onSuccess: (h) => { setHasil(h); onDibuka(); },
  });
  useEffect(() => { if (!buka) { setAlasan(""); setHasil(null); m.reset(); } }, [buka]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Dialog open={buka} onOpenChange={(o) => !o && tutup()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Lock className="h-5 w-5 text-amber-600" />Buka identitas pelapor</DialogTitle>
          <DialogDescription>Pelapor memilih dirahasiakan. Pembukaan ini dicatat permanen beserta alasan dan nama Anda. Jangan sampaikan identitas kepada pihak yang diadukan.</DialogDescription>
        </DialogHeader>
        {hasil ? (
          <div className="space-y-1 rounded-xl border-2 border-amber-300 bg-amber-50 p-4">
            <p className="text-lg font-bold">{hasil.nama}</p>
            <p>{hasil.wa}{hasil.rt ? ` · RT 0${hasil.rt}` : ""}</p>
            {hasil.wa && (
              <a href={toWaMeUrl(hasil.wa, "Assalamu'alaikum, kami pengurus RW 03 terkait aduan yang Anda sampaikan.")} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-green-700 underline">
                <MessageCircle className="h-4 w-4" />Hubungi via WhatsApp
              </a>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <Label>Alasan membuka identitas</Label>
            <Textarea rows={3} value={alasan} onChange={(e) => setAlasan(e.target.value)} placeholder="Mis. Perlu konfirmasi waktu kejadian kepada pelapor." />
            {m.error && <p className="text-sm text-destructive">{(m.error as Error).message}</p>}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={tutup}>Tutup</Button>
          {!hasil && <Button disabled={alasan.trim().length < 5 || m.isPending} onClick={() => m.mutate()}>Buka & catat</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type CalonTeradu = { jenis: JenisTeradu; refId: number; nama: string; alamat: string | null; rt: number | null; keterangan: string };

function DialogTeradu({ buka, tutup, a, onSimpan }: { buka: boolean; tutup: () => void; a: Detail; onSimpan: (d: Detail) => void }) {
  const { toast } = useToast();
  const [cari, setCari] = useState("");
  const [jenis, setJenis] = useState<JenisTeradu>(a.teradu.jenis);
  const [nama, setNama] = useState(a.teradu.nama ?? "");
  const [alamat, setAlamat] = useState(a.teradu.alamat ?? "");
  const [refId, setRefId] = useState<number | null>(a.teradu.jenis === "usaha" ? a.teradu.usahaId : a.teradu.refId);
  useEffect(() => {
    if (!buka) return;
    setCari(a.teradu.nama ?? "");
    setJenis(a.teradu.jenis); setNama(a.teradu.nama ?? ""); setAlamat(a.teradu.alamat ?? "");
    setRefId(a.teradu.jenis === "usaha" ? a.teradu.usahaId : a.teradu.refId);
  }, [buka]); // eslint-disable-line react-hooks/exhaustive-deps
  const { data: calon = [], isFetching } = useQuery<CalonTeradu[]>({
    queryKey: ["/api/admin/aduan/cari-teradu", cari.trim()],
    queryFn: () => ambilAduanJson(`/api/admin/aduan/cari-teradu?q=${encodeURIComponent(cari.trim())}`),
    enabled: buka && cari.trim().length >= 3,
  });
  const m = useMutation({
    mutationFn: () => kirimAduanJson<Detail>(`/api/admin/aduan/${a.id}/teradu`, "POST", { jenis, refId, usahaId: jenis === "usaha" ? refId : null, nama, alamat }),
    onSuccess: (d) => { onSimpan(d); tutup(); toast({ title: "Teradu ditetapkan" }); },
    onError: (e) => toast({ title: "Gagal", description: (e as Error).message, variant: "destructive" }),
  });
  return (
    <Dialog open={buka} onOpenChange={(o) => !o && tutup()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Tetapkan pihak teradu</DialogTitle>
          <DialogDescription>Cari dari data warga, Visit RW3, dan RW3BIZ agar riwayat teguran tercatat pada orang yang tepat.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" value={cari} onChange={(e) => setCari(e.target.value)} placeholder="Nama, NIK, atau nama usaha (min. 3 huruf)" />
          </div>
          {isFetching && <p className="text-xs text-muted-foreground">Mencari…</p>}
          {calon.length > 0 && (
            <div className="max-h-56 space-y-1 overflow-y-auto">
              {calon.map((c) => (
                <button key={`${c.jenis}:${c.refId}`} type="button"
                  onClick={() => { setJenis(c.jenis); setRefId(c.refId); setNama(c.nama); setAlamat([c.alamat, c.rt ? `RT 0${c.rt}` : null].filter(Boolean).join(", ")); }}
                  className={cn("w-full rounded-lg border p-2 text-left text-sm", refId === c.refId && jenis === c.jenis ? "border-brand bg-brand/5" : "hover:bg-muted")}>
                  <p className="font-semibold">{c.nama}</p>
                  <p className="text-xs text-muted-foreground">{JENIS_TERADU_LABEL[c.jenis]} · {c.keterangan}</p>
                </button>
              ))}
            </div>
          )}
          <div className="grid gap-2 border-t pt-3">
            <Label>Jenis</Label>
            <Select value={jenis} onValueChange={(v) => { setJenis(v as JenisTeradu); setRefId(null); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{JENIS_TERADU.map((j) => <SelectItem key={j} value={j}>{JENIS_TERADU_LABEL[j]}</SelectItem>)}</SelectContent>
            </Select>
            <Label>Nama</Label>
            <Input value={nama} onChange={(e) => { setNama(e.target.value); }} />
            <Label>Alamat</Label>
            <Input value={alamat} onChange={(e) => setAlamat(e.target.value)} />
            <p className="text-xs text-muted-foreground">{refId ? "Terhubung ke data sistem." : "Ditulis manual — riwayat dicocokkan berdasarkan nama."}</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={tutup}>Batal</Button>
          <Button disabled={nama.trim().length < 2 || m.isPending} onClick={() => m.mutate()}>Simpan</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DialogKlarifikasi({ buka, tutup, id, onSelesai }: { buka: boolean; tutup: () => void; id: number; onSelesai: () => void }) {
  const { toast } = useToast();
  const [, go] = useLocation();
  const [tanggal, setTanggal] = useState(tambahHari(2));
  const [jam, setJam] = useState("19:30");
  const [tempat, setTempat] = useState("Sekretariat RW 03");
  const [terbit, setTerbit] = useState(true);
  const m = useMutation({
    mutationFn: () => kirimAduanJson<{ suratId: number; nomorSurat: string | null }>(`/api/admin/aduan/${id}/klarifikasi`, "POST", { tanggal, jam, tempat, terbit }),
    onSuccess: (h) => {
      onSelesai();
      tutup();
      if (h.nomorSurat) {
        toast({ title: "Undangan terbit", description: h.nomorSurat });
        window.open(`/api/wilayah/surat/${h.suratId}/pdf`, "_blank");
      } else go(`/admin/surat-rw?surat=${h.suratId}`);
    },
    onError: (e) => toast({ title: "Gagal", description: (e as Error).message, variant: "destructive" }),
  });
  return (
    <Dialog open={buka} onOpenChange={(o) => !o && tutup()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Undang klarifikasi</DialogTitle>
          <DialogDescription>Surat undangan berredaksi netral (aduan belum dianggap terbukti). Nama pelapor tidak dicantumkan.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1"><Label>Tanggal</Label><Input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} /></div>
            <div className="space-y-1"><Label>Pukul</Label><Input type="time" value={jam} onChange={(e) => setJam(e.target.value)} /></div>
          </div>
          <div className="space-y-1"><Label>Tempat</Label><Input value={tempat} onChange={(e) => setTempat(e.target.value)} /></div>
          <label className="flex items-center gap-2 text-sm"><Checkbox checked={terbit} onCheckedChange={(c) => setTerbit(Boolean(c))} />Langsung terbitkan bernomor (hapus centang untuk menyunting dulu di Surat Sakti)</label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={tutup}>Batal</Button>
          <Button disabled={m.isPending} onClick={() => m.mutate()}>{m.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : terbit ? "Terbitkan undangan" : "Buat draf"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DialogTeguran({ buka, tutup, a, onTerbit }: { buka: boolean; tutup: () => void; a: Detail; onTerbit: () => void }) {
  const { toast } = useToast();
  const [tingkat, setTingkat] = useState<TingkatTeguran>(a.saranTingkat ?? "sp3");
  const [pelanggaran, setPelanggaran] = useState("");
  const [kewajiban, setKewajiban] = useState("");
  const [tenggat, setTenggat] = useState(tambahHari(7));
  const [yakin, setYakin] = useState(false);
  const [pratinjau, setPratinjau] = useState(false);
  useEffect(() => {
    if (!buka) return;
    const t = a.saranTingkat ?? "sp3";
    setTingkat(t);
    setPelanggaran(`${a.judul}${a.lokasi ? ` di ${a.lokasi}` : ""}.`);
    setKewajiban(KEWAJIBAN_SARAN[a.kategori].join("\n"));
    setTenggat(tambahHari(TINGKAT_TEGURAN_INFO[t].tenggatHari));
    setYakin(false);
  }, [buka]); // eslint-disable-line react-hooks/exhaustive-deps
  const body = useMemo(() => ({
    aduanId: a.id, tingkat, pelanggaran, tenggat, lokasi: a.lokasi,
    kewajiban: kewajiban.split("\n").map((s) => s.trim()).filter(Boolean),
  }), [a.id, a.lokasi, tingkat, pelanggaran, kewajiban, tenggat]);
  const m = useMutation({
    mutationFn: () => kirimAduanJson<Teguran>("/api/admin/aduan/teguran", "POST", body),
    onSuccess: (t) => {
      onTerbit();
      tutup();
      toast({ title: `${TINGKAT_TEGURAN_INFO[t.tingkat].label} terbit`, description: t.nomorSurat ?? undefined });
      if (t.suratId) window.open(`/api/wilayah/surat/${t.suratId}/pdf`, "_blank");
    },
    onError: (e) => toast({ title: "Gagal menerbitkan", description: (e as Error).message, variant: "destructive" }),
  });
  const lihat = async () => {
    setPratinjau(true);
    try {
      const res = await fetch("/api/admin/aduan/teguran/pratinjau", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.message ?? "Gagal membentuk pratinjau");
      window.open(URL.createObjectURL(await res.blob()), "_blank");
    } catch (e) {
      toast({ title: "Pratinjau gagal", description: (e as Error).message, variant: "destructive" });
    } finally {
      setPratinjau(false);
    }
  };
  const info = TINGKAT_TEGURAN_INFO[tingkat];
  return (
    <Dialog open={buka} onOpenChange={(o) => !o && tutup()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Gavel className="h-5 w-5 text-red-700" />Terbitkan teguran resmi</DialogTitle>
          <DialogDescription>Kepada <b>{a.teradu.nama}</b>. Surat bernomor resmi dengan QR verifikasi. Nama pelapor tidak dicetak.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Tingkat</Label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {TINGKAT_TEGURAN.map((t) => (
                <button key={t} type="button" onClick={() => { setTingkat(t); setTenggat(tambahHari(TINGKAT_TEGURAN_INFO[t].tenggatHari)); }}
                  className={cn("rounded-xl border-2 p-2 text-sm font-bold", tingkat === t ? "border-red-700 bg-red-700 text-white" : "border-border hover:border-red-300")}>
                  {TINGKAT_TEGURAN_INFO[t].label}
                  {a.saranTingkat === t && <span className="block text-[10px] font-semibold opacity-80">disarankan</span>}
                </button>
              ))}
            </div>
            {a.riwayatTeguran.length > 0 && <p className="text-xs text-muted-foreground">Riwayat: {a.riwayatTeguran.map((r) => TINGKAT_TEGURAN_INFO[r.tingkat]?.label).join(" → ")}</p>}
          </div>
          <div className="space-y-1">
            <Label>Hal yang ditegur</Label>
            <Textarea rows={3} value={pelanggaran} onChange={(e) => setPelanggaran(e.target.value)} />
            <p className="text-xs text-muted-foreground">Tulis perbuatan/kondisinya, jangan menyebut siapa yang melapor.</p>
          </div>
          <div className="space-y-1">
            <Label>Yang wajib dilakukan (satu per baris)</Label>
            <Textarea rows={4} value={kewajiban} onChange={(e) => setKewajiban(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Batas waktu perbaikan</Label>
            <Input type="date" value={tenggat} onChange={(e) => setTenggat(e.target.value)} />
          </div>
          <p className="rounded-xl bg-muted p-3 text-sm"><b>Konsekuensi yang dicetak:</b> {info.konsekuensi}</p>
          <label className="flex items-start gap-2 rounded-xl border-2 border-red-200 bg-red-50 p-3 text-sm">
            <Checkbox checked={yakin} onCheckedChange={(c) => setYakin(Boolean(c))} className="mt-0.5" />
            Saya sudah memeriksa aduan ini dan teguran layak diterbitkan. Surat yang terbit tidak dapat diubah (hanya dibatalkan).
          </label>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={lihat} disabled={pratinjau}>{pratinjau ? <Loader2 className="h-4 w-4 animate-spin" /> : "Pratinjau PDF"}</Button>
          <Button className="bg-red-700 hover:bg-red-800" disabled={!yakin || m.isPending} onClick={() => m.mutate()}>
            {m.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : `Terbitkan ${info.label}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DialogTutup({ buka, tutup, status, kirim, memuat }: { buka: boolean; tutup: () => void; status: "selesai" | "tidak_terbukti"; kirim: (pesan: string) => void; memuat: boolean }) {
  const [pesan, setPesan] = useState("");
  useEffect(() => {
    if (buka) setPesan(status === "selesai" ? "Terima kasih atas laporannya. Permasalahan sudah ditangani pengurus RW 03." : "");
  }, [buka, status]);
  return (
    <Dialog open={buka} onOpenChange={(o) => !o && tutup()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{status === "selesai" ? "Selesaikan aduan" : "Nyatakan tidak terbukti"}</DialogTitle>
          <DialogDescription>Pesan ini tampil di halaman lacak pelapor.</DialogDescription>
        </DialogHeader>
        <Textarea rows={4} value={pesan} onChange={(e) => setPesan(e.target.value)}
          placeholder={status === "tidak_terbukti" ? "Mis. Petugas sudah mengecek 2 kali dan tidak menemukan kejadian tersebut." : ""} />
        <DialogFooter>
          <Button variant="outline" onClick={tutup}>Batal</Button>
          <Button disabled={memuat || (status === "tidak_terbukti" && pesan.trim().length < 5)} onClick={() => kirim(pesan)}>Simpan</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DialogGabung({ buka, tutup, id, onSimpan }: { buka: boolean; tutup: () => void; id: number; onSimpan: (d: Detail) => void }) {
  const { toast } = useToast();
  const [nomor, setNomor] = useState("");
  const m = useMutation({
    mutationFn: () => kirimAduanJson<Detail>(`/api/admin/aduan/${id}/gabung`, "POST", { nomor }),
    onSuccess: (d) => { onSimpan(d); tutup(); toast({ title: "Aduan digabungkan" }); },
    onError: (e) => toast({ title: "Gagal", description: (e as Error).message, variant: "destructive" }),
  });
  return (
    <Dialog open={buka} onOpenChange={(o) => !o && tutup()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Gabungkan dengan aduan lain</DialogTitle>
          <DialogDescription>Untuk aduan tentang hal yang sama. Aduan ini ditutup, penanganan dilanjutkan di aduan induk.</DialogDescription>
        </DialogHeader>
        <Input value={nomor} onChange={(e) => setNomor(e.target.value.toUpperCase())} placeholder="ADU-2026-0001" className="font-mono" />
        <DialogFooter>
          <Button variant="outline" onClick={tutup}>Batal</Button>
          <Button disabled={nomor.length < 8 || m.isPending} onClick={() => m.mutate()}>Gabungkan</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DialogRw3biz({ buka, tutup, id, onSelesai }: { buka: boolean; tutup: () => void; id: number; onSelesai: () => void }) {
  const { toast } = useToast();
  const [, go] = useLocation();
  const m = useMutation({
    mutationFn: () => kirimAduanJson<{ pelanggaranId: number }>(`/api/admin/aduan/${id}/rw3biz`, "POST", {}),
    onSuccess: () => { onSelesai(); tutup(); toast({ title: "Diteruskan ke RW3BIZ" }); go("/admin/rw3biz/pelanggaran"); },
    onError: (e) => toast({ title: "Gagal", description: (e as Error).message, variant: "destructive" }),
  });
  return (
    <Dialog open={buka} onOpenChange={(o) => !o && tutup()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Teruskan ke denda RW3BIZ</DialogTitle>
          <DialogDescription>
            Aduan dicatat sebagai pelanggaran usaha (menunggu verifikasi) beserta foto pertama. Denda dihitung di halaman Pelanggaran & aduan RW3BIZ.
            Identitas pelapor tidak ikut diteruskan.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={tutup}>Batal</Button>
          <Button disabled={m.isPending} onClick={() => m.mutate()}>Teruskan</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { useEffect, useId, useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Calculator, ChevronDown, Plus, Save, Trash2 } from "lucide-react";
import { Visitrw3AdminNav } from "@/components/admin/visitrw3-admin-nav";
import { Visitrw3AdminShell } from "@/components/admin/visitrw3-admin-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, getApiErrorMessage, queryClient, readJsonSafely } from "@/lib/queryClient";
import { useTarifAdmin } from "@/components/rw3biz/koreksi-kontribusi";
import { labelJenis, useRab } from "@/pages/admin/rw3biz-dashboard";
import {
  JENIS_PELANGGARAN_INFO,
  JENIS_TEMPAT_BIZ,
  JENIS_TEMPAT_BIZ_LABEL,
  RENTANG_OMZET,
  RENTANG_OMZET_LABEL,
  TINGKAT_PELANGGARAN,
  TINGKAT_PELANGGARAN_LABEL,
  bulanIni,
  formatRp,
  hitungDendaPelanggaran,
  type TarifKontribusi,
} from "@shared/rw3biz-kontribusi";

type Simulasi = {
  jumlahUsaha: number;
  proyeksi: number;
  terendah: number;
  tertinggi: number;
  rataRata: number;
  faktorDisarankan: { faktor: number; proyeksi: number; tercapai: boolean };
};

function Angka({
  label,
  value,
  onChange,
  hint,
  desimal,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  hint?: string;
  desimal?: boolean;
}) {
  const id = useId();
  const [teks, setTeks] = useState(String(value));
  useEffect(() => setTeks(String(value)), [value]);
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_8.5rem] items-center gap-x-3 gap-y-1 sm:block sm:space-y-1">
      <Label htmlFor={id} className="text-sm leading-snug sm:text-xs">
        {label}
      </Label>
      <Input
        id={id}
        className="text-right tabular-nums sm:h-9 sm:text-left sm:text-sm"
        inputMode={desimal ? "decimal" : "numeric"}
        value={teks}
        onChange={(e) => {
          const v = desimal ? e.target.value.replace(",", ".").replace(/[^\d.]/g, "") : e.target.value.replace(/\D/g, "");
          setTeks(v);
          const n = Number(v);
          if (v !== "" && Number.isFinite(n)) onChange(n);
        }}
      />
      {hint && <p className="col-span-2 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

/** Di HP tiap bagian bisa dilipat (default tertutup) agar halaman tidak ribuan piksel; di ≥ sm selalu terbuka. */
function Bagian({
  judul,
  keterangan,
  defaultOpen = false,
  children,
}: {
  judul: string;
  keterangan?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Collapsible asChild open={open} onOpenChange={setOpen}>
      <section className="rounded-2xl border bg-card p-4 space-y-3">
        <div>
          <h2 className="text-sm font-semibold">
            <CollapsibleTrigger className="-my-2 flex min-h-11 w-full items-center justify-between gap-2 text-left sm:pointer-events-none sm:my-0 sm:min-h-0">
              <span className="min-w-0">{judul}</span>
              <ChevronDown
                className={cn("h-5 w-5 shrink-0 text-muted-foreground transition-transform sm:hidden", open && "rotate-180")}
                aria-hidden
              />
            </CollapsibleTrigger>
          </h2>
          {keterangan && <p className={cn("text-xs text-muted-foreground", !open && "hidden sm:block")}>{keterangan}</p>}
        </div>
        <CollapsibleContent forceMount className="space-y-3 data-[state=closed]:hidden sm:data-[state=closed]:block">
          {children}
        </CollapsibleContent>
      </section>
    </Collapsible>
  );
}

export default function AdminRw3bizTarif() {
  const { toast } = useToast();
  const { data: tersimpan, isLoading } = useTarifAdmin();
  const { data: rab } = useRab(bulanIni());
  const [t, setT] = useState<TarifKontribusi | null>(null);
  const [transisiTeks, setTransisiTeks] = useState("");
  const [pengulanganTeks, setPengulanganTeks] = useState("");
  const [simulasi, setSimulasi] = useState<Simulasi | null>(null);

  useEffect(() => {
    if (!tersimpan) return;
    setT(tersimpan);
    setTransisiTeks(tersimpan.transisiPersen.join(", "));
    setPengulanganTeks(tersimpan.dendaPengulangan.join(", "));
  }, [tersimpan]);

  const ubah = (patch: Partial<TarifKontribusi>) => {
    setT((prev) => (prev ? { ...prev, ...patch } : prev));
    setSimulasi(null);
  };

  const totalPos = useMemo(() => (t ? t.posAnggaran.reduce((s, p) => s + p.nominal, 0) : 0), [t]);
  const draft = () => {
    if (!t) return null;
    const transisiPersen = transisiTeks
      .split(/[,\s]+/)
      .filter(Boolean)
      .map((s) => Number(s))
      .filter((n) => Number.isFinite(n) && n >= 0 && n <= 100);
    const dendaPengulangan = pengulanganTeks
      .split(/[,\s]+/)
      .filter(Boolean)
      .map((s) => Number(s.replace(",", ".")))
      .filter((n) => Number.isFinite(n) && n >= 0 && n <= 10);
    return { ...t, transisiPersen, dendaPengulangan: dendaPengulangan.length ? dendaPengulangan : t.dendaPengulangan };
  };
  const berubah = JSON.stringify(draft()) !== JSON.stringify(tersimpan);

  const simulasiMutation = useMutation({
    mutationFn: async () => readJsonSafely<Simulasi>(await apiRequest("POST", "/api/admin/rw3biz/settings/simulasi", draft())),
    onSuccess: (s) => {
      setSimulasi(s);
      requestAnimationFrame(() =>
        document.getElementById("hasil-simulasi-tarif")?.scrollIntoView({ behavior: "smooth", block: "nearest" }),
      );
    },
    onError: (e: unknown) => toast({ title: "Gagal simulasi", description: getApiErrorMessage(e), variant: "destructive" }),
  });

  const simpanMutation = useMutation({
    mutationFn: async () => readJsonSafely<TarifKontribusi>(await apiRequest("PUT", "/api/admin/rw3biz/settings", draft())),
    onSuccess: (baru) => {
      queryClient.setQueryData(["/api/admin/rw3biz/settings"], baru);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/rw3biz/rab"] });
      toast({
        title: "Tarif tersimpan",
        description: "Berlaku untuk pengajuan baru dan saat kontribusi usaha dihitung ulang. Tagihan yang sudah dibuat tidak berubah.",
      });
    },
    onError: (e: unknown) => toast({ title: "Gagal menyimpan", description: getApiErrorMessage(e), variant: "destructive" }),
  });

  if (isLoading || !t) {
    return (
      <Visitrw3AdminShell>
        <Skeleton className="h-64 w-full rounded-2xl" />
      </Visitrw3AdminShell>
    );
  }

  const ubahPos = (i: number, patch: Partial<TarifKontribusi["posAnggaran"][number]>) =>
    ubah({ posAnggaran: t.posAnggaran.map((p, j) => (j === i ? { ...p, ...patch } : p)) });

  return (
    <Visitrw3AdminShell>
      <Visitrw3AdminNav
        product="rw3biz"
        title="Tarif & pos anggaran"
        description="Rumus kontribusi bulanan RW3BIZ dan rincian RAB operasional. Simulasikan dulu sebelum menyimpan."
        actions={
          <div className="hidden gap-2 sm:flex">
            <Button variant="outline" className="h-9 gap-1" disabled={simulasiMutation.isPending} onClick={() => simulasiMutation.mutate()}>
              <Calculator className="w-4 h-4" /> Simulasi
            </Button>
            <Button className="h-9 gap-1" disabled={!berubah || simpanMutation.isPending} onClick={() => simpanMutation.mutate()}>
              <Save className="w-4 h-4" /> Simpan
            </Button>
          </div>
        }
      />

      <p className="text-xs text-muted-foreground sm:hidden">Ketuk judul bagian untuk membuka dan mengubah angka.</p>

      <div className="space-y-4">
        {simulasi && (
          <div id="hasil-simulasi-tarif" className="scroll-mt-20 rounded-2xl border-2 border-brand/30 bg-brand/5 p-4 space-y-2 text-sm">
            <p className="font-semibold">Hasil simulasi ({simulasi.jumlahUsaha} usaha aktif)</p>
            <p>
              Proyeksi per bulan: <strong>{formatRp(simulasi.proyeksi)}</strong> dari target {formatRp(t.targetBulanan)}
            </p>
            <p className="text-xs text-muted-foreground">
              Terendah {formatRp(simulasi.terendah)} · rata-rata {formatRp(simulasi.rataRata)} · tertinggi {formatRp(simulasi.tertinggi)}
            </p>
            {simulasi.jumlahUsaha > 0 &&
              (simulasi.faktorDisarankan.tercapai ? (
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span>
                    Faktor penyesuaian agar tepat target: <strong>× {simulasi.faktorDisarankan.faktor.toFixed(2)}</strong> (proyeksi{" "}
                    {formatRp(simulasi.faktorDisarankan.proyeksi)})
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full sm:h-7 sm:w-auto sm:text-xs"
                    onClick={() => ubah({ faktorPenyesuaian: simulasi.faktorDisarankan.faktor })}
                  >
                    Pakai faktor ini
                  </Button>
                </div>
              ) : (
                <p className="text-xs text-warning">
                  Target tidak tercapai bahkan dengan faktor maksimal karena batas atas per usaha — tambah pendataan usaha atau tinjau batas.
                </p>
              ))}
          </div>
        )}

        <Bagian defaultOpen judul="Target & batas keadilan" keterangan="Kontribusi tiap usaha selalu di antara minimal dan batas atas sesuai omzet.">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <Angka label="Target RAB / bulan" value={t.targetBulanan} onChange={(n) => ubah({ targetBulanan: n })} />
            <Angka label="Minimal / usaha" value={t.minimal} onChange={(n) => ubah({ minimal: n })} />
            <Angka label="Maksimal / usaha" value={t.maksimal} onChange={(n) => ubah({ maksimal: n })} />
            <Angka label="Pembulatan" value={t.pembulatan} onChange={(n) => ubah({ pembulatan: n })} />
            <Angka
              label="Batas % omzet"
              value={t.batasPersenOmzet}
              desimal
              onChange={(n) => ubah({ batasPersenOmzet: n })}
              hint="Dari omzet minimal rentang"
            />
            <Angka label="Batas omzet < 3 jt" value={t.batasOmzetKecil} onChange={(n) => ubah({ batasOmzetKecil: n })} />
            <Angka
              label="Faktor penyesuaian"
              value={t.faktorPenyesuaian}
              desimal
              onChange={(n) => ubah({ faktorPenyesuaian: n })}
              hint="Pengali seluruh tarif (1 = normal)"
            />
          </div>
        </Bagian>

        <Bagian judul="Tarif dasar per jenis tempat">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            {JENIS_TEMPAT_BIZ.map((j) => (
              <Angka
                key={j}
                label={JENIS_TEMPAT_BIZ_LABEL[j]}
                value={t.tarifDasar[j]}
                onChange={(n) => ubah({ tarifDasar: { ...t.tarifDasar, [j]: n } })}
              />
            ))}
          </div>
        </Bagian>

        <Bagian judul="Tambahan menurut omzet">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-5">
            {RENTANG_OMZET.map((r) => (
              <Angka
                key={r}
                label={RENTANG_OMZET_LABEL[r]}
                value={t.tambahanOmzet[r]}
                onChange={(n) => ubah({ tambahanOmzet: { ...t.tambahanOmzet, [r]: n } })}
              />
            ))}
          </div>
        </Bagian>

        <Bagian judul="Tambahan beban lingkungan" keterangan="Sesuai pemakaian layanan RW: keamanan malam, sampah, jalan, parkir.">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <Angka label="Luas bebas (m²)" value={t.luasBatasM2} onChange={(n) => ubah({ luasBatasM2: n })} />
            <Angka label="Per m² di atasnya" value={t.luasPerM2} onChange={(n) => ubah({ luasPerM2: n })} />
            <Angka label="Maks tambahan luas" value={t.luasMaks} onChange={(n) => ubah({ luasMaks: n })} />
            <Angka label="Buka lewat 21.00" value={t.tambahanMalam} onChange={(n) => ubah({ tambahanMalam: n })} />
            <Angka label="Buka 24 jam" value={t.tambahan24Jam} onChange={(n) => ubah({ tambahan24Jam: n })} />
            <Angka label="Per kantong sampah (>1/hari)" value={t.sampahPerKantong} onChange={(n) => ubah({ sampahPerKantong: n })} />
            <Angka label="Pakai bahu jalan" value={t.tambahanBahuJalan} onChange={(n) => ubah({ tambahanBahuJalan: n })} />
            <Angka label="Per motor operasional" value={t.kendaraanMotor} onChange={(n) => ubah({ kendaraanMotor: n })} />
            <Angka label="Per mobil operasional" value={t.kendaraanMobil} onChange={(n) => ubah({ kendaraanMobil: n })} />
          </div>
        </Bagian>

        <Bagian
          judul="Kendaraan berat (beban jalan)"
          keterangan="Per unit per bulan. Ditambahkan di luar batas omzet karena merusak jalan lingkungan; tetap tunduk pada batas maksimal."
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Angka label="Per kolbak / pick-up" value={t.kendaraanKolbak} onChange={(n) => ubah({ kendaraanKolbak: n })} />
            <Angka label="Per truk engkel / sedang" value={t.kendaraanTruk} onChange={(n) => ubah({ kendaraanTruk: n })} />
            <Angka label="Per truk besar" value={t.kendaraanTrukBesar} onChange={(n) => ubah({ kendaraanTrukBesar: n })} />
          </div>
        </Bagian>

        <Bagian
          judul="Kendaraan charter (per kedatangan)"
          keterangan="Dihitung datang/minggu × 4 × tarif. Paling tinggi setara tarif unit milik sendiri untuk setiap 7 kedatangan per minggu."
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Angka label="Kolbak charter / datang" value={t.charterKolbakPerDatang} onChange={(n) => ubah({ charterKolbakPerDatang: n })} />
            <Angka label="Truk charter / datang" value={t.charterTrukPerDatang} onChange={(n) => ubah({ charterTrukPerDatang: n })} />
            <Angka label="Truk besar charter / datang" value={t.charterTrukBesarPerDatang} onChange={(n) => ubah({ charterTrukBesarPerDatang: n })} />
          </div>
        </Bagian>

        <Bagian
          judul="Denda razia"
          keterangan="Kendaraan tidak terdaftar saat razia: denda = pengali × tarif bulanan jenis kendaraan. Bisa diubah per temuan."
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Angka
              label="Pengali denda"
              value={t.dendaRaziaKali}
              onChange={(n) => ubah({ dendaRaziaKali: n })}
              desimal
              hint={`Truk besar: ${formatRp(Math.round(t.kendaraanTrukBesar * t.dendaRaziaKali))}`}
            />
          </div>
        </Bagian>

        <Bagian
          judul="Denda pelanggaran (aduan warga & temuan petugas)"
          keterangan="Denda = dasar jenis × tingkat × pengulangan dalam 12 bulan, dibulatkan, paling banyak batas maksimal. Pengali pengulangan juga berlaku untuk razia (minimal 1×)."
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            {(Object.keys(t.dendaPelanggaran) as (keyof TarifKontribusi["dendaPelanggaran"])[]).map((j) => (
              <Angka
                key={j}
                label={JENIS_PELANGGARAN_INFO[j].label}
                value={t.dendaPelanggaran[j]}
                onChange={(n) => ubah({ dendaPelanggaran: { ...t.dendaPelanggaran, [j]: n } })}
              />
            ))}
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            {TINGKAT_PELANGGARAN.map((k) => (
              <Angka
                key={k}
                label={`Pengali ${TINGKAT_PELANGGARAN_LABEL[k].toLowerCase()}`}
                value={t.dendaTingkat[k]}
                desimal
                onChange={(n) => ubah({ dendaTingkat: { ...t.dendaTingkat, [k]: n } })}
              />
            ))}
            <Angka label="Denda maksimal" value={t.dendaMaks} onChange={(n) => ubah({ dendaMaks: n })} />
          </div>
          <div className="space-y-1">
            <Label className="text-sm sm:text-xs">Pengali pelanggaran ke-1, ke-2, … (0 = teguran tertulis)</Label>
            <Input
              className="sm:h-9 sm:text-sm sm:w-64"
              value={pengulanganTeks}
              onChange={(e) => {
                setPengulanganTeks(e.target.value);
                setSimulasi(null);
              }}
              placeholder="0, 1, 2, 3"
            />
            <p className="text-xs text-muted-foreground">
              Angka terakhir berlaku untuk pelanggaran seterusnya. Contoh sampah tercecer sedang ke-3:{" "}
              {formatRp(hitungDendaPelanggaran({ jenis: "sampah_tercecer", tingkat: "sedang", keBerapa: 3 }, draft() ?? t).denda)}.
            </p>
          </div>
        </Bagian>

        <Bagian judul="Insentif pekerja lokal" keterangan="Mendorong usaha mempekerjakan warga RW 03.">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Angka label="Per pegawai" value={t.pegawaiPerOrang} onChange={(n) => ubah({ pegawaiPerOrang: n })} hint="Semua kecuali pemilik" />
            <Angka label="Tambahan per pegawai luar RW 03" value={t.pekerjaLuar} onChange={(n) => ubah({ pekerjaLuar: n })} hint="Pemilik tidak dihitung" />
            <Angka
              label="Potongan ≥50% pekerja RW 03 (%)"
              value={t.diskonLokalSebagian}
              onChange={(n) => ubah({ diskonLokalSebagian: n })}
            />
            <Angka label="Potongan 100% pekerja RW 03 (%)" value={t.diskonLokalPenuh} onChange={(n) => ubah({ diskonLokalPenuh: n })} />
          </div>
        </Bagian>

        <Bagian judul="Kemudahan bayar">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <div className="space-y-1 sm:col-span-2">
              <Label className="text-sm sm:text-xs">Masa transisi (% bayar bulan ke-1, ke-2, …)</Label>
              <Input
                className="sm:h-9 sm:text-sm"
                value={transisiTeks}
                onChange={(e) => {
                  setTransisiTeks(e.target.value);
                  setSimulasi(null);
                }}
                placeholder="50, 50, 75"
              />
              <p className="text-xs text-muted-foreground">
                Dihitung dari awal program {t.programMulai || "(belum ditetapkan)"}. Kosongkan untuk langsung penuh.
              </p>
            </div>
            <Angka label="Bulan gratis usaha baru" value={t.bulanGratisUsahaBaru} onChange={(n) => ubah({ bulanGratisUsahaBaru: n })} />
            <Angka label="Tenggang (hari)" value={t.tenggangHari} onChange={(n) => ubah({ tenggangHari: n })} />
            {Object.keys(t.potonganTermin)
              .filter((k) => k !== "1")
              .map((k) => (
                <Angka
                  key={k}
                  label={`Potongan bayar ${k} bulan (%)`}
                  value={t.potonganTermin[k]}
                  onChange={(n) => ubah({ potonganTermin: { ...t.potonganTermin, [k]: n } })}
                />
              ))}
          </div>
        </Bagian>

        <Bagian
          judul="Pos anggaran (RAB operasional)"
          keterangan="Nama pos dipakai sebagai kategori pengeluaran Kas RW sehingga realisasi tiap pos terlacak otomatis."
        >
          <div className="space-y-2">
            {t.posAnggaran.map((p, i) => (
              <div
                key={p.id}
                className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 rounded-xl border p-2 sm:grid-cols-[1fr_1fr_8rem_auto] sm:rounded-none sm:border-0 sm:p-0"
              >
                <Input
                  className="order-1 font-medium sm:h-9 sm:text-sm sm:font-normal"
                  aria-label="Nama pos"
                  value={p.label}
                  onChange={(e) => ubahPos(i, { label: e.target.value })}
                  placeholder="Nama pos"
                />
                <Input
                  className="order-3 col-span-2 sm:order-2 sm:col-span-1 sm:h-9 sm:text-sm"
                  aria-label="Keterangan pos"
                  value={p.keterangan ?? ""}
                  onChange={(e) => ubahPos(i, { keterangan: e.target.value })}
                  placeholder="Keterangan"
                />
                <div className="order-4 col-span-2 grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 sm:order-3 sm:col-span-1 sm:block">
                  <span className="text-sm text-muted-foreground sm:hidden">Nominal (Rp)</span>
                  <Input
                    className="text-right tabular-nums sm:h-9 sm:text-left sm:text-sm"
                    aria-label="Nominal pos (Rp)"
                    inputMode="numeric"
                    value={String(p.nominal)}
                    onChange={(e) => ubahPos(i, { nominal: Number(e.target.value.replace(/\D/g, "")) || 0 })}
                  />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="order-2 text-destructive sm:order-4 sm:h-9 sm:w-9 sm:text-foreground"
                  onClick={() => ubah({ posAnggaran: t.posAnggaran.filter((_, j) => j !== i) })}
                  aria-label="Hapus pos"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-1 sm:w-auto"
              onClick={() =>
                ubah({ posAnggaran: [...t.posAnggaran, { id: `pos_${Date.now()}`, label: "", nominal: 0 }] })
              }
            >
              <Plus className="w-4 h-4" /> Tambah pos
            </Button>
            <p className={`text-sm ${totalPos === t.targetBulanan ? "text-success" : "text-warning"}`}>
              Total pos {formatRp(totalPos)} {totalPos === t.targetBulanan ? "= target" : `≠ target ${formatRp(t.targetBulanan)}`}
            </p>
          </div>
        </Bagian>

        {rab && rab.sebaran.length > 0 && (
          <Bagian judul="Sebaran kontribusi saat ini" keterangan="Gunakan untuk mengecek apakah satu jenis usaha menanggung beban berlebih.">
            <ul className="space-y-1 text-xs">
              {rab.sebaran.map((s) => (
                <li
                  key={s.jenis}
                  className={`flex flex-col gap-0.5 border-b pb-1 last:border-0 sm:flex-row sm:justify-between sm:gap-2 sm:border-0 sm:pb-0 ${s.terlaluBerat ? "text-warning" : ""}`}
                >
                  <span className="font-medium sm:font-normal">
                    {labelJenis(s.jenis)} ({s.jumlah})
                  </span>
                  <span className="tabular-nums">
                    rata-rata {formatRp(s.rataRata)} · beban {s.bebanPersenOmzet.toLocaleString("id-ID")}% omzet
                    {s.terlaluBerat ? " ⚠" : ""}
                  </span>
                </li>
              ))}
            </ul>
          </Bagian>
        )}
      </div>

      <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-20 -mx-1 space-y-1 rounded-xl border bg-background/95 p-2 shadow-lg backdrop-blur sm:hidden">
        {berubah && <p className="px-1 text-xs font-medium text-warning">Ada perubahan yang belum disimpan.</p>}
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" className="gap-1" disabled={simulasiMutation.isPending} onClick={() => simulasiMutation.mutate()}>
            <Calculator className="w-4 h-4" /> Simulasi
          </Button>
          <Button className="gap-1" disabled={!berubah || simpanMutation.isPending} onClick={() => simpanMutation.mutate()}>
            <Save className="w-4 h-4" /> Simpan
          </Button>
        </div>
      </div>
    </Visitrw3AdminShell>
  );
}

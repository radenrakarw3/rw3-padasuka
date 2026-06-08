import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { format, parseISO, startOfDay } from "date-fns";
import {
  AlertTriangle,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  RefreshCw,
  User,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Visitrw3AdminNav } from "@/components/admin/visitrw3-admin-nav";
import { Visitrw3AdminShell, Visitrw3Panel, Visitrw3StatCard } from "@/components/admin/visitrw3-admin-ui";
import { getApiErrorMessage, readJsonSafely } from "@/lib/queryClient";
import { rtOptions } from "@/lib/constants";
import { cn } from "@/lib/utils";

type Visitrw3KalenderPenghuni = {
  id: number;
  namaLengkap: string;
  nik: string;
  nomorWhatsapp: string;
  tanggalHabisKontrak: string;
  status: string;
  nomorVisitrw3: string | null;
  namaKost: string;
  rtKost: number;
};

type Visitrw3KalenderResponse = {
  penghuni: Visitrw3KalenderPenghuni[];
  antrianPerpanjang: {
    id: number;
    nomorVisitrw3: string;
    rt: number;
    tanggalBerlakuSampai: string;
    namaPenghuni: string | null;
    namaKost: string | null;
  }[];
  ringkasan: {
    sudahHabis: number;
    hariIni: number;
    dalam7Hari: number;
    dalam30Hari: number;
    antrianPerpanjang: number;
  };
};

async function fetchKalender(rt: string): Promise<Visitrw3KalenderResponse> {
  const qs = rt !== "semua" ? `?rt=${encodeURIComponent(rt)}` : "";
  const res = await fetch(`/api/admin/visitrw3/kalender${qs}`, { credentials: "include" });
  if (!res.ok) {
    const err = await readJsonSafely<{ message?: string }>(res).catch(() => null);
    throw new Error(err?.message || `Gagal memuat kalender (${res.status})`);
  }
  const data = await readJsonSafely<Visitrw3KalenderResponse>(res);
  if (!data) throw new Error("Respons kalender kosong");
  return data;
}

function parseKontrakDate(ymd: string): Date {
  return parseISO(`${ymd}T00:00:00`);
}

function toYmd(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

function getDaysRemaining(tanggalHabis: string): number {
  const today = startOfDay(new Date());
  const habis = startOfDay(parseKontrakDate(tanggalHabis));
  return Math.ceil((habis.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function getStatusKontrak(tanggalHabis: string): {
  label: string;
  variant: "default" | "secondary" | "destructive" | "outline";
} {
  const diff = getDaysRemaining(tanggalHabis);
  if (diff < 0) return { label: "Habis", variant: "destructive" };
  if (diff <= 7) return { label: diff === 0 ? "Hari ini" : `H-${diff}`, variant: "secondary" };
  return { label: "Aktif", variant: "default" };
}

function formatTanggal(ymd: string): string {
  return parseKontrakDate(ymd).toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function normalizeYmd(raw: string): string {
  const s = (raw || "").trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  return s;
}

const HARI_SINGKAT = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

function mondayIndex(date: Date): number {
  const d = date.getDay();
  return d === 0 ? 6 : d - 1;
}

function getDayTone(ymd: string, count: number): "habis" | "mendekati" | "berlaku" | "none" {
  if (count <= 0) return "none";
  const r = getDaysRemaining(ymd);
  if (r < 0) return "habis";
  if (r <= 7) return "mendekati";
  return "berlaku";
}

const dayToneClass: Record<string, string> = {
  habis: "bg-red-100 text-red-900 border-red-200 font-semibold",
  mendekati: "bg-amber-100 text-amber-900 border-amber-200 font-semibold",
  berlaku: "bg-[hsl(163,55%,88%)] text-[hsl(163,55%,22%)] border-[hsl(163,55%,70%)]",
  none: "text-foreground border-transparent hover:bg-muted/60",
};

function KontrakMonthGrid({
  month,
  onMonthChange,
  selected,
  onSelect,
  countByDate,
}: {
  month: Date;
  onMonthChange: (d: Date) => void;
  selected?: Date;
  onSelect: (d: Date) => void;
  countByDate: Record<string, number>;
}) {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const leading = mondayIndex(new Date(year, monthIndex, 1));
  const cells: ({ day: number; ymd: string } | null)[] = [];

  for (let i = 0; i < leading; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const ymd = `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    cells.push({ day: d, ymd });
  }
  while (cells.length % 7 !== 0) cells.push(null);

  const monthLabel = month.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
  const todayYmd = toYmd(new Date());

  const prev = () => onMonthChange(new Date(year, monthIndex - 1, 1));
  const next = () => onMonthChange(new Date(year, monthIndex + 1, 1));

  return (
    <div className="w-full max-w-[320px]" data-testid="kalender-kontrak-grid">
      <div className="flex items-center justify-between mb-3 px-1">
        <button
          type="button"
          onClick={prev}
          className="p-1.5 rounded-md border hover:bg-muted/50"
          aria-label="Bulan sebelumnya"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <p className="text-sm font-semibold capitalize">{monthLabel}</p>
        <button
          type="button"
          onClick={next}
          className="p-1.5 rounded-md border hover:bg-muted/50"
          aria-label="Bulan berikutnya"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-medium text-muted-foreground mb-1">
        {HARI_SINGKAT.map((h) => (
          <div key={h} className="py-1">
            {h}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell, idx) => {
          if (!cell) {
            return <div key={`empty-${idx}`} className="h-9" />;
          }
          const count = countByDate[cell.ymd] ?? 0;
          const tone = getDayTone(cell.ymd, count);
          const isSelected = selected && toYmd(selected) === cell.ymd;
          const isToday = cell.ymd === todayYmd;
          return (
            <button
              key={cell.ymd}
              type="button"
              onClick={() => onSelect(parseKontrakDate(cell.ymd))}
              className={cn(
                "relative h-9 rounded-md border text-xs transition-colors",
                dayToneClass[tone],
                isSelected && "ring-2 ring-[hsl(163,55%,22%)] ring-offset-1",
                isToday && !isSelected && "underline decoration-2",
              )}
              title={count > 0 ? `${count} kontrak habis` : undefined}
            >
              {cell.day}
              {count > 0 && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-current opacity-80" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function AdminVisitrw3Kalender() {
  const [month, setMonth] = useState(() => new Date());
  const [selected, setSelected] = useState<Date | undefined>(() => new Date());
  const [filterRt, setFilterRt] = useState("semua");

  const {
    data: kalender,
    isLoading,
    isError,
    error,
  } = useQuery<Visitrw3KalenderResponse>({
    queryKey: ["/api/admin/visitrw3/kalender", filterRt],
    queryFn: () => fetchKalender(filterRt),
  });

  const aktifFiltered = kalender?.penghuni ?? [];
  const antrianPerpanjang = kalender?.antrianPerpanjang ?? [];
  const ringkasan = kalender?.ringkasan ?? {
    sudahHabis: 0,
    hariIni: 0,
    dalam7Hari: 0,
    dalam30Hari: 0,
    antrianPerpanjang: 0,
  };

  const countByDate = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const w of aktifFiltered) {
      const key = normalizeYmd(w.tanggalHabisKontrak);
      if (!key) continue;
      counts[key] = (counts[key] ?? 0) + 1;
    }
    return counts;
  }, [aktifFiltered]);

  const byHabisDate = useMemo(() => {
    const map: Record<string, Visitrw3KalenderPenghuni[]> = {};
    for (const w of aktifFiltered) {
      const key = normalizeYmd(w.tanggalHabisKontrak);
      if (!key) continue;
      if (!map[key]) map[key] = [];
      map[key].push(w);
    }
    for (const key of Object.keys(map)) {
      map[key].sort((a, b) => a.namaLengkap.localeCompare(b.namaLengkap, "id"));
    }
    return map;
  }, [aktifFiltered]);

  const mendekatiList = useMemo(() => {
    return [...aktifFiltered]
      .filter((w) => {
        const key = normalizeYmd(w.tanggalHabisKontrak);
        if (!key) return false;
        return getDaysRemaining(key) <= 30;
      })
      .sort((a, b) =>
        normalizeYmd(a.tanggalHabisKontrak).localeCompare(normalizeYmd(b.tanggalHabisKontrak)),
      );
  }, [aktifFiltered]);

  const selectedKey = selected ? toYmd(selected) : null;
  const selectedPenghuni = selectedKey ? byHabisDate[selectedKey] || [] : [];

  return (
    <Visitrw3AdminShell>
      <Visitrw3AdminNav
        title="Kalender kontrak"
        description="Lihat jatuh tempo izin tinggal dan siapa yang perlu diingatkan untuk perpanjang"
        actions={
          <Select value={filterRt} onValueChange={setFilterRt}>
            <SelectTrigger className="w-32 h-8 text-xs" data-testid="select-filter-rt-kalender">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="semua">Semua RT</SelectItem>
              {rtOptions.map((rt) => (
                <SelectItem key={rt} value={String(rt)}>
                  RT {String(rt).padStart(2, "0")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      {isError && (
        <p className="text-sm text-destructive" data-testid="kalender-error">
          {getApiErrorMessage(error, "Gagal memuat data kalender dari server.")}
        </p>
      )}

      {!isLoading && !isError && (
        <p className="text-xs text-muted-foreground" data-testid="kalender-db-status">
          Terhubung ke database · {aktifFiltered.length} penghuni dengan jadwal kontrak
          {Object.keys(countByDate).length > 0
            ? ` · ${Object.keys(countByDate).length} tanggal jatuh tempo`
            : ""}
        </p>
      )}

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Visitrw3StatCard title="Sudah habis" value={String(ringkasan.sudahHabis)} icon={AlertTriangle} tone="warning" />
          <Visitrw3StatCard title="Habis hari ini" value={String(ringkasan.hariIni)} icon={Clock} tone="warning" />
          <Visitrw3StatCard title="7 hari ke depan" value={String(ringkasan.dalam7Hari)} icon={CalendarDays} tone="gold" />
          <div data-testid="stat-antrian-perpanjang">
            <Visitrw3StatCard title="Antrian perpanjang" value={String(antrianPerpanjang.length)} icon={RefreshCw} />
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-3 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
          Sudah habis
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
          ≤ 7 hari
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-[hsl(163,55%,35%)]" />
          &gt; 7 hari
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,340px)_1fr]">
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm flex items-center gap-1.5">
              <CalendarDays className="w-4 h-4 text-[hsl(163,55%,22%)]" />
              Tanggal habis kontrak
            </CardTitle>
          </CardHeader>
          <CardContent className="px-2 pb-4 flex justify-center">
            {isLoading ? (
              <Skeleton className="h-[280px] w-full max-w-[300px]" />
            ) : aktifFiltered.length === 0 ? (
              <div className="py-8 px-4 text-center text-sm text-muted-foreground max-w-[280px]">
                <p>Belum ada data penghuni di database.</p>
                <p className="mt-2 text-xs">
                  Setujui pengajuan Visit RW3 atau tambah penghuni di tab Penghuni.
                </p>
                <Link href="/admin/visitrw3/penghuni">
                  <Button size="sm" variant="outline" className="mt-3">
                    Ke Penghuni
                  </Button>
                </Link>
              </div>
            ) : (
              <KontrakMonthGrid
                month={month}
                onMonthChange={setMonth}
                selected={selected}
                onSelect={setSelected}
                countByDate={countByDate}
              />
            )}
          </CardContent>
        </Card>

        <div className="space-y-4 min-w-0">
          <Card>
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm">
                {selected
                  ? formatTanggal(toYmd(selected))
                  : "Pilih tanggal di kalender"}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {!selected ? (
                <p className="text-sm text-muted-foreground">Klik tanggal untuk melihat penghuni.</p>
              ) : selectedPenghuni.length === 0 ? (
                <p className="text-sm text-muted-foreground" data-testid="text-kosong-tanggal">
                  Tidak ada kontrak yang habis pada tanggal ini.
                </p>
              ) : (
                <ul className="space-y-2">
                  {selectedPenghuni.map((w) => {
                    const st = getStatusKontrak(w.tanggalHabisKontrak);
                    const days = getDaysRemaining(w.tanggalHabisKontrak);
                    return (
                      <li
                        key={w.id}
                        className={cn(
                          "rounded-lg border p-3",
                          st.label === "Habis"
                            ? "border-red-200 bg-red-50/40"
                            : st.label.startsWith("H-") || st.label === "Hari ini"
                              ? "border-amber-200 bg-amber-50/40"
                              : "border-green-200 bg-green-50/30",
                        )}
                        data-testid={`kalender-penghuni-${w.id}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <User className="w-3.5 h-3.5 text-[hsl(163,55%,22%)] shrink-0" />
                              <span className="font-semibold text-sm truncate">{w.namaLengkap}</span>
                              <Badge variant={st.variant} className="text-[10px]">
                                {st.label}
                              </Badge>
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              {w.namaKost} · RT {String(w.rtKost).padStart(2, "0")}
                            </p>
                            {w.nomorVisitrw3 && (
                              <p className="text-[10px] text-muted-foreground">{w.nomorVisitrw3}</p>
                            )}
                          </div>
                          <div className="text-right shrink-0">
                            {days >= 0 ? (
                              <p className="text-xs font-medium text-muted-foreground">
                                {days === 0 ? "Habis hari ini" : `${days} hari lagi`}
                              </p>
                            ) : (
                              <p className="text-xs font-medium text-red-700">
                                Lewat {Math.abs(days)} hari
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="mt-2 flex gap-2">
                          <Link href="/admin/visitrw3/penghuni">
                            <Button size="sm" variant="outline" className="h-7 text-xs">
                              <RefreshCw className="w-3 h-3 mr-1" />
                              Perpanjang
                            </Button>
                          </Link>
                          <Link href="/admin/visitrw3/antrian">
                            <Button size="sm" variant="ghost" className="h-7 text-xs">
                              Antrian
                              <ChevronRight className="w-3 h-3 ml-0.5" />
                            </Button>
                          </Link>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>

          {antrianPerpanjang.length > 0 && (
            <Card className="border-[hsl(163,55%,22%)]/30">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm flex items-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  Pengajuan perpanjang menunggu survey
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-2">
                {antrianPerpanjang.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between rounded-lg border p-2.5 text-sm"
                    data-testid={`antrian-perpanjang-${p.id}`}
                  >
                    <div>
                      <p className="font-medium">{p.nomorVisitrw3}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {p.namaPenghuni ? `${p.namaPenghuni} · ` : ""}
                        {p.namaKost ? `${p.namaKost} · ` : ""}
                        RT {String(p.rt).padStart(2, "0")} · berlaku sampai {p.tanggalBerlakuSampai}
                      </p>
                    </div>
                    <Link href="/admin/visitrw3/antrian">
                      <Button size="sm" variant="secondary" className="h-7 text-xs">
                        Proses
                      </Button>
                    </Link>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            Perlu perhatian — 30 hari ke depan
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : aktifFiltered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Belum ada penghuni — data kontrak akan muncul setelah pendaftaran disetujui.
            </p>
          ) : mendekatiList.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4" data-testid="text-mendekati-kosong">
              Tidak ada kontrak yang habis dalam 30 hari ke depan.
            </p>
          ) : (
            <div className="space-y-1.5 max-h-[320px] overflow-y-auto">
              {mendekatiList.map((w) => {
                const st = getStatusKontrak(w.tanggalHabisKontrak);
                const days = getDaysRemaining(w.tanggalHabisKontrak);
                return (
                  <button
                    key={w.id}
                    type="button"
                    className="w-full flex items-center justify-between rounded-lg border px-3 py-2 text-left hover:bg-muted/50 transition-colors"
                    onClick={() => {
                      const d = parseKontrakDate(w.tanggalHabisKontrak);
                      setSelected(d);
                      setMonth(d);
                    }}
                    data-testid={`mendekati-row-${w.id}`}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{w.namaLengkap}</p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {w.namaKost} · {formatTanggal(w.tanggalHabisKontrak)}
                      </p>
                    </div>
                    <Badge variant={st.variant} className="text-[10px] shrink-0 ml-2">
                      {days < 0 ? `Lewat ${Math.abs(days)}h` : days === 0 ? "Hari ini" : `${days} hari`}
                    </Badge>
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </Visitrw3AdminShell>
  );
}

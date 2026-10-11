import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { wil } from "@/lib/wilayah-api";
import { Galat, LencanaTindak, bacaFile } from "./dasar";

export function DaftarTindak({ peran, bukaSurat }: { peran: "rt" | "rw"; bukaSurat?: (id: number) => void }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [filter, setFilter] = useState("terbuka");
  const { data, error, isLoading } = useQuery<any[]>({
    queryKey: ["/api/wilayah/surat-tindak", peran, filter],
    queryFn: () => wil(`/api/wilayah/surat-tindak?filter=${filter}`, { peran }),
  });
  const [upd, setUpd] = useState<{ id: number; catatan: string; progres: string; status: string; bukti: string } | null>(null);
  const ubahUpd = (p: Partial<NonNullable<typeof upd>>) => setUpd((x) => (x ? { ...x, ...p } : x));
  const [err, setErr] = useState<unknown>(null);
  const [sibuk, setSibuk] = useState(false);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1">
        {[["terbuka", "Terbuka"], ["jatuh_tempo", "Jatuh tempo ≤3 hari / terlambat"], ["selesai", "Selesai"], ["semua", "Semua"]].map(([v, l]) => (
          <Button key={v} size="sm" variant={filter === v ? "default" : "outline"} onClick={() => setFilter(v)}>{l}</Button>
        ))}
      </div>
      <Galat e={error || err} />
      {isLoading && <p className="text-sm">Memuat…</p>}
      {data?.length === 0 && <p className="text-sm text-muted-foreground">{peran === "rt" ? "Tidak ada tugas untuk RT Anda." : "Tidak ada tindak lanjut."}</p>}
      <ul className="space-y-2">
        {data?.map((t) => (
          <li key={t.id} className="rounded-lg border bg-white p-3 text-sm space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium">{t.tindakan}</span>
              <LencanaTindak status={t.status} terlambat={t.terlambat} />
            </div>
            <p className="text-xs text-muted-foreground">
              {t.nomor_surat ?? "-"} · {t.perihal} · PIC {t.pic_nama ?? "-"} · tenggat {t.tenggat ?? "-"} · {t.progres ?? 0}%
            </p>
            {t.catatan_terakhir && <p className="text-xs">Terakhir: {t.catatan_terakhir}</p>}
            <div className="flex gap-3 text-xs">
              {bukaSurat && <button type="button" className="underline" onClick={() => bukaSurat(t.surat_id)}>buka dokumen</button>}
              {t.status !== "selesai" && t.status !== "tidak_diperlukan" && (
                <button type="button" className="underline" onClick={() => setUpd({ id: t.id, catatan: "", progres: String(t.progres ?? 0), status: t.status, bukti: "" })}>laporkan progres</button>
              )}
            </div>
            {upd && upd.id === t.id && (
              <div className="rounded border p-2 space-y-2 bg-stone-50">
                <div className="grid grid-cols-2 gap-2">
                  <select className="h-10 border rounded-md px-2 bg-white" value={upd.status} onChange={(e) => ubahUpd({ status: e.target.value })}>
                    <option value="menunggu">Menunggu</option><option value="berjalan">Berjalan</option><option value="selesai">Selesai</option>
                    {peran === "rw" && <option value="tidak_diperlukan">Tidak diperlukan</option>}
                  </select>
                  <Input inputMode="numeric" placeholder="Progres %" value={upd.progres} onChange={(e) => ubahUpd({ progres: e.target.value.replace(/\D/g, "").slice(0, 3) })} />
                </div>
                <Textarea rows={2} placeholder="Apa yang sudah dikerjakan?" value={upd.catatan} onChange={(e) => ubahUpd({ catatan: e.target.value })} />
                <div className="grid sm:grid-cols-2 gap-2">
                  <Input placeholder="Bukti: keterangan" value={upd.bukti.startsWith("data:") ? "(berkas terpilih)" : upd.bukti} onChange={(e) => ubahUpd({ bukti: e.target.value })} />
                  <Input type="file" accept="image/png,image/jpeg,image/webp,application/pdf" onChange={(e) => { const f = e.target.files?.[0]; if (f) bacaFile(f).then((b) => ubahUpd({ bukti: b })).catch(setErr); }} />
                </div>
                {upd.status === "selesai" && <p className="text-xs text-amber-800">Selesai wajib disertai bukti (foto, dokumen, atau keterangan).</p>}
                <div className="flex gap-2">
                  <Button size="sm" disabled={sibuk || upd.catatan.trim().length < 3} onClick={async () => {
                    const x = upd;
                    if (!x) return;
                    setSibuk(true);
                    setErr(null);
                    try {
                      await wil(`/api/wilayah/surat-tindak/${x.id}/update`, { peran, body: { catatan: x.catatan, status: x.status, progres: Math.min(100, Number(x.progres) || 0), bukti: x.bukti || null } });
                      setUpd(null);
                      toast({ title: "Progres dicatat" });
                      await qc.invalidateQueries({ queryKey: ["/api/wilayah/surat-tindak"] });
                      await qc.invalidateQueries({ queryKey: ["/api/wilayah/surat"] });
                    } catch (e) { setErr(e); } finally { setSibuk(false); }
                  }}>Kirim laporan</Button>
                  <Button size="sm" variant="ghost" onClick={() => setUpd(null)}>Batal</Button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

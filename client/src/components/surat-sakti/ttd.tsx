import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Eraser, PenLine, QrCode, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { wil } from "@/lib/wilayah-api";
import { IDENTITAS_RW } from "@shared/surat-sakti";
import { Galat, RW } from "./dasar";

export interface StatusTtd {
  ada: boolean;
  gambar?: string;
  diunggahOleh?: string | null;
  diunggahPada?: string;
}

export const KUNCI_TTD = ["/api/wilayah/rw/surat-ttd"];
export const KUNCI_CAP = ["/api/wilayah/rw/surat-cap"];

export function useStatusTtd() {
  return useQuery<StatusTtd>({ queryKey: KUNCI_TTD, queryFn: () => wil("/api/wilayah/rw/surat-ttd", RW), staleTime: 60_000 });
}

export function useStatusCap() {
  return useQuery<StatusTtd>({ queryKey: KUNCI_CAP, queryFn: () => wil("/api/wilayah/rw/surat-cap", RW), staleTime: 60_000 });
}

/**
 * Latar terang menjadi transparan (ambang menyesuaikan terang kertas), lalu dipotong rapat ke goresan.
 * Foto tanda tangan di kertas putih atau goresan di layar menjadi PNG bening yang menyatu dengan kertas surat.
 */
function olahTtd(src: CanvasImageSource, w: number, h: number): string | null {
  const skala = Math.min(1, 1400 / Math.max(w, h));
  const cw = Math.max(1, Math.round(w * skala));
  const ch = Math.max(1, Math.round(h * skala));
  const c = document.createElement("canvas");
  c.width = cw;
  c.height = ch;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(src, 0, 0, cw, ch);
  const img = ctx.getImageData(0, 0, cw, ch);
  const px = img.data;
  const terang: number[] = [];
  for (let i = 0; i < px.length; i += 4 * 7) if (px[i + 3] > 0) terang.push(0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]);
  terang.sort((a, b) => a - b);
  const latar = terang.length ? terang[Math.floor(terang.length * 0.9)] : 255;
  const atas = Math.max(60, latar - 35);
  const bawah = Math.max(20, atas - 70);
  let x0 = cw, y0 = ch, x1 = -1, y1 = -1;
  for (let y = 0; y < ch; y++) {
    for (let x = 0; x < cw; x++) {
      const i = (y * cw + x) * 4;
      if (px[i + 3] === 0) continue;
      const l = 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
      const a = l >= atas ? 0 : l <= bawah ? 255 : Math.round(((atas - l) / (atas - bawah)) * 255);
      px[i + 3] = Math.min(px[i + 3], a);
      if (px[i + 3] > 40) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < 0 || x1 - x0 < 20 || y1 - y0 < 8) return null;
  ctx.putImageData(img, 0, 0);
  const pad = 6;
  const sx = Math.max(0, x0 - pad), sy = Math.max(0, y0 - pad);
  const sw = Math.min(cw - sx, x1 - x0 + 2 * pad), sh = Math.min(ch - sy, y1 - y0 + 2 * pad);
  const k = Math.min(1, 900 / sw);
  const out = document.createElement("canvas");
  out.width = Math.round(sw * k);
  out.height = Math.round(sh * k);
  out.getContext("2d")?.drawImage(c, sx, sy, sw, sh, 0, 0, out.width, out.height);
  return out.toDataURL("image/png");
}

function bacaFile(f: File): Promise<string | null> {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(f);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      res(olahTtd(img, img.naturalWidth, img.naturalHeight));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      rej(new Error("Berkas bukan gambar yang bisa dibaca. Gunakan foto JPG/PNG."));
    };
    img.src = url;
  });
}

function PapanGambar({ ubah }: { ubah: (dataUrl: string | null) => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const gambar = useRef(false);
  const ada = useRef(false);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const r = c.getBoundingClientRect();
    c.width = Math.round(r.width * 2);
    c.height = Math.round(r.height * 2);
    const ctx = c.getContext("2d")!;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 5;
    ctx.strokeStyle = "#111827";
  }, []);
  const titik = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return [(e.clientX - r.left) * 2, (e.clientY - r.top) * 2] as const;
  };
  const selesai = () => {
    gambar.current = false;
    const c = ref.current;
    if (c && ada.current) ubah(olahTtd(c, c.width, c.height));
  };
  return (
    <div className="space-y-2">
      <canvas
        ref={ref}
        className="h-48 w-full touch-none rounded-lg border-2 border-dashed bg-white"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          const ctx = e.currentTarget.getContext("2d")!;
          const [x, y] = titik(e);
          ctx.beginPath();
          ctx.moveTo(x, y);
          gambar.current = true;
        }}
        onPointerMove={(e) => {
          if (!gambar.current) return;
          const ctx = e.currentTarget.getContext("2d")!;
          const [x, y] = titik(e);
          ctx.lineTo(x, y);
          ctx.stroke();
          ada.current = true;
        }}
        onPointerUp={selesai}
        onPointerLeave={() => gambar.current && selesai()}
      />
      <Button type="button" variant="ghost" size="sm" onClick={() => {
        const c = ref.current;
        c?.getContext("2d")?.clearRect(0, 0, c.width, c.height);
        ada.current = false;
        ubah(null);
      }}><Eraser className="w-4 h-4 mr-1" /> Ulangi</Button>
    </div>
  );
}

function DialogTtd({ buka, setBuka }: { buka: boolean; setBuka: (b: boolean) => void }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [hasil, setHasil] = useState<string | null>(null);
  const [err, setErr] = useState<unknown>(null);
  const [sibuk, setSibuk] = useState(false);
  useEffect(() => {
    if (buka) {
      setHasil(null);
      setErr(null);
    }
  }, [buka]);

  const simpan = async () => {
    if (!hasil) return;
    setSibuk(true);
    setErr(null);
    try {
      await wil("/api/wilayah/rw/surat-ttd", { ...RW, body: { gambar: hasil } });
      await qc.invalidateQueries({ queryKey: KUNCI_TTD });
      toast({ title: "Tanda tangan tersimpan", description: "Dibubuhkan otomatis pada setiap surat saat terbit." });
      setBuka(false);
    } catch (e) {
      setErr(e);
    } finally {
      setSibuk(false);
    }
  };

  return (
    <Dialog open={buka} onOpenChange={setBuka}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Tanda tangan Ketua RW</DialogTitle>
          <DialogDescription>
            Cukup sekali. Latar kertas otomatis dihapus dan gambar dipotong rapat. Tanda tangan hanya dibubuhkan pada surat yang terbit, tidak pada draf.
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="foto">
          <TabsList className="w-full">
            <TabsTrigger value="foto" className="flex-1"><Upload className="w-4 h-4 mr-1" /> Unggah foto</TabsTrigger>
            <TabsTrigger value="gambar" className="flex-1"><PenLine className="w-4 h-4 mr-1" /> Gambar di layar</TabsTrigger>
          </TabsList>
          <TabsContent value="foto" className="space-y-2">
            <p className="text-sm text-muted-foreground">Tanda tangan di kertas putih polos dengan pulpen hitam/biru, lalu foto dari dekat di tempat terang.</p>
            <input type="file" accept="image/*" className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-[hsl(163,55%,22%)] file:px-3 file:py-2 file:text-white"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                setErr(null);
                try {
                  const d = await bacaFile(f);
                  if (!d) throw new Error("Goresan tanda tangan tidak terdeteksi. Foto ulang lebih dekat dengan latar kertas putih.");
                  setHasil(d);
                } catch (x) {
                  setHasil(null);
                  setErr(x);
                }
              }} />
          </TabsContent>
          <TabsContent value="gambar">
            <PapanGambar ubah={setHasil} />
          </TabsContent>
        </Tabs>
        <Galat e={err} />
        {hasil && (
          <div className="rounded-lg border bg-white p-3">
            <p className="text-xs text-muted-foreground mb-1">Pratinjau di surat:</p>
            <div className="mx-auto w-56 text-center text-sm">
              <p>Hormat kami,</p>
              <img src={hasil} alt="Pratinjau tanda tangan" className="mx-auto h-16 object-contain" />
              <p className="font-bold underline">{IDENTITAS_RW.ketua.nama}</p>
              <p className="text-xs">{IDENTITAS_RW.ketua.jabatan}</p>
            </div>
          </div>
        )}
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => setBuka(false)}>Batal</Button>
          <Button type="button" disabled={!hasil || sibuk} onClick={simpan}>{sibuk ? "Menyimpan…" : "Simpan tanda tangan"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Ringkasan tanda tangan di beranda Surat RW: status, pratinjau, tombol unggah/ganti. */
export function PanelTtd() {
  const { data, error } = useStatusTtd();
  const [buka, setBuka] = useState(false);
  if (error) return <Galat e={error} />;
  if (!data) return null;
  return (
    <div className="space-y-2">
      {data.ada ? (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-white p-3 text-sm">
          {data.gambar && <img src={data.gambar} alt="Tanda tangan Ketua RW" className="h-12 w-28 object-contain" />}
          <div className="min-w-0 flex-1">
            <p className="font-medium">{IDENTITAS_RW.ketua.nama} · {IDENTITAS_RW.ketua.jabatan}</p>
            <p className="text-xs text-muted-foreground flex items-center gap-1"><QrCode className="w-3.5 h-3.5" /> Tanda tangan + cap + QR keaslian dibubuhkan otomatis pada setiap surat saat terbit (termasuk RW3BIZ).</p>
          </div>
          <Button type="button" size="sm" variant="outline" onClick={() => setBuka(true)}>Ganti</Button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm">
          <p className="min-w-0 flex-1"><b>Tanda tangan Ketua RW belum diunggah.</b> Surat belum bisa terbit sampai tanda tangan diunggah. Cukup sekali.</p>
          <Button type="button" size="sm" onClick={() => setBuka(true)}><Upload className="w-4 h-4 mr-1" /> Unggah tanda tangan</Button>
        </div>
      )}
      <DialogTtd buka={buka} setBuka={setBuka} />
      <PanelCap />
    </div>
  );
}

function DialogCap({ buka, setBuka }: { buka: boolean; setBuka: (v: boolean) => void }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [hasil, setHasil] = useState<string | null>(null);
  const [err, setErr] = useState<unknown>(null);
  const [sibuk, setSibuk] = useState(false);

  async function simpan() {
    if (!hasil) return;
    setSibuk(true);
    setErr(null);
    try {
      await wil("/api/wilayah/rw/surat-cap", { ...RW, body: { gambar: hasil } });
      await qc.invalidateQueries({ queryKey: KUNCI_CAP });
      toast({ title: "Cap disimpan", description: "Cap akan dibubuhkan bersama tanda tangan pada surat terbit dan RW3BIZ." });
      setBuka(false);
      setHasil(null);
    } catch (e) {
      setErr(e);
    } finally {
      setSibuk(false);
    }
  }

  return (
    <Dialog open={buka} onOpenChange={setBuka}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cap / stempel Ketua RW</DialogTitle>
          <DialogDescription>
            Unggah foto cap basah (PNG/JPG). Latar putih boleh; warna cap (merah/biru) dipertahankan. Cukup sekali.
          </DialogDescription>
        </DialogHeader>
        <input
          type="file"
          accept="image/png,image/jpeg,image/jpg"
          className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-[hsl(163,55%,22%)] file:px-3 file:py-2 file:text-white"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            setErr(null);
            try {
              const dataUrl = await new Promise<string>((res, rej) => {
                const r = new FileReader();
                r.onload = () => res(String(r.result));
                r.onerror = () => rej(new Error("Gagal membaca berkas"));
                r.readAsDataURL(f);
              });
              setHasil(dataUrl);
            } catch (x) {
              setHasil(null);
              setErr(x);
            }
          }}
        />
        <Galat e={err} />
        {hasil && (
          <div className="rounded-lg border bg-white p-3 text-center">
            <p className="mb-1 text-xs text-muted-foreground">Pratinjau cap:</p>
            <img src={hasil} alt="Pratinjau cap" className="mx-auto h-24 object-contain" />
          </div>
        )}
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => setBuka(false)}>Batal</Button>
          <Button type="button" disabled={!hasil || sibuk} onClick={simpan}>{sibuk ? "Menyimpan…" : "Simpan cap"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Panel unggah/ganti cap di bawah panel TTD. */
export function PanelCap() {
  const { data, error } = useStatusCap();
  const [buka, setBuka] = useState(false);
  if (error) return <Galat e={error} />;
  if (!data) return null;
  return (
    <>
      {data.ada ? (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-white p-3 text-sm">
          {data.gambar && <img src={data.gambar} alt="Cap Ketua RW" className="h-14 w-14 object-contain" />}
          <div className="min-w-0 flex-1">
            <p className="font-medium">Cap / stempel Ketua RW</p>
            <p className="text-xs text-muted-foreground">Dibubuhkan bersama tanda tangan pada surat terbit dan surat izin RW3BIZ.</p>
          </div>
          <Button type="button" size="sm" variant="outline" onClick={() => setBuka(true)}>Ganti</Button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-dashed border-amber-300 bg-amber-50/60 p-3 text-sm">
          <p className="min-w-0 flex-1"><b>Cap Ketua RW belum diunggah.</b> Surat tetap bisa terbit; unggah cap agar stempel muncul otomatis di RW3BIZ dan Surat RW.</p>
          <Button type="button" size="sm" variant="outline" onClick={() => setBuka(true)}><Upload className="w-4 h-4 mr-1" /> Unggah cap</Button>
        </div>
      )}
      <DialogCap buka={buka} setBuka={setBuka} />
    </>
  );
}

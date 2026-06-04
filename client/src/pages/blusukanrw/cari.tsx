import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, MessageCircle, ChevronRight } from "lucide-react";
import { readJsonSafely } from "@/lib/queryClient";
import { toWhatsappLink } from "@/components/kependudukan/warga-form";
import { isActiveRt } from "@shared/rt";

type CariRow = {
  wargaId: number;
  namaLengkap: string;
  nik: string;
  kedudukanKeluarga: string;
  nomorWhatsapp: string | null;
  kkId: number;
  nomorKk: string;
  rt: number;
  alamat: string;
};

export default function BlusukanrwCari() {
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const [rows, setRows] = useState<CariRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    if (debounced.length < 2) {
      setRows([]);
      return;
    }
    setLoading(true);
    setErr("");
    fetch(`/api/blusukan/cari?q=${encodeURIComponent(debounced)}`, { credentials: "include" })
      .then(async (res) => {
        if (!res.ok) throw new Error("Gagal mencari");
        return readJsonSafely<CariRow[]>(res);
      })
      .then((list) => setRows((list ?? []).filter((row) => isActiveRt(row.rt))))
      .catch((e: unknown) => setErr(e instanceof Error ? e.message : "Gagal"))
      .finally(() => setLoading(false));
  }, [debounced]);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold">Cari Warga</h2>
        <p className="text-xs text-muted-foreground">Nama, NIK, nomor KK, atau alamat (min. 2 karakter)</p>
      </div>

      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Ketik untuk mencari..."
          className="pl-9 h-10"
          autoFocus
        />
      </div>

      {loading && <p className="text-xs text-muted-foreground">Mencari...</p>}
      {err && <p className="text-xs text-destructive">{err}</p>}

      <div className="space-y-2">
        {rows.map((row) => (
          <Card key={row.wargaId}>
            <CardContent className="p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{row.namaLengkap}</p>
                  <p className="text-[10px] text-muted-foreground">NIK {row.nik}</p>
                  <p className="text-xs text-muted-foreground mt-1">{row.alamat}</p>
                  <p className="text-[10px] text-muted-foreground">
                    KK {row.nomorKk} · RT {String(row.rt).padStart(2, "0")} · {row.kedudukanKeluarga}
                  </p>
                </div>
                <Link href={`/blusukanrw/kk/${row.kkId}`}>
                  <Button size="icon" variant="ghost" type="button">
                    <ChevronRight className="w-5 h-5" />
                  </Button>
                </Link>
              </div>
              <div className="flex gap-2 pt-1 border-t">
                {row.nomorWhatsapp ? (
                  <Button size="sm" variant="outline" className="text-xs h-8 text-green-700" asChild>
                    <a href={toWhatsappLink(row.nomorWhatsapp)} target="_blank" rel="noopener noreferrer">
                      <MessageCircle className="w-3 h-3 mr-1" />
                      WhatsApp
                    </a>
                  </Button>
                ) : (
                  <Badge variant="outline" className="text-[10px]">
                    Belum ada WA
                  </Badge>
                )}
                <Link href={`/blusukanrw/kk/${row.kkId}`}>
                  <Button size="sm" variant="secondary" className="text-xs h-8">
                    Buka KK
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
        {debounced.length >= 2 && !loading && rows.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-6">Tidak ditemukan.</p>
        )}
      </div>
    </div>
  );
}

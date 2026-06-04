import { useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Loader2, RefreshCw, Ban } from "lucide-react";
import { formatTanggalHukum } from "@/lib/rw3law-format";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Rw3lawLayout } from "@/components/gov/rw3law-layout";
import { Rw3lawDocumentView } from "@/components/gov/rw3law-document-view";
import { Rw3lawShareBar } from "@/components/gov/rw3law-share-bar";
import { fetchPublicJson } from "@/lib/queryClient";
import { RW3LAW_LIST_PATH } from "@/pages/public/rw3law/paths";

import type { Rw3lawRevisiRingkas } from "@shared/rw3law-archive";
import { formatNomorPeraturanLengkap } from "@shared/rw3law-archive";

type Rw3lawDetail = {
  id: number;
  judul: string;
  slug: string;
  isi: string;
  kategori: string;
  versi: string | null;
  tanggalBerlaku: string | null;
  rtAsal: number | null;
  nomorPeraturan?: number | null;
  tahunNomor?: number | null;
  revisiDari?: Rw3lawRevisiRingkas | null;
  status?: "disetujui" | "dicabut";
  dicabutAt?: string | null;
};

export default function Rw3lawDokumen() {
  const [, paramsRw3] = useRoute("/rw3law/:slug");
  const [, paramsRwlaw] = useRoute("/rwlaw/:slug");
  const slug = paramsRwlaw?.slug ?? paramsRw3?.slug ?? "";

  const { data, isPending, isError, error, refetch } = useQuery<Rw3lawDetail>({
    queryKey: ["/api/public/rw3law", slug],
    queryFn: ({ signal }) =>
      fetchPublicJson<Rw3lawDetail>(`/api/public/rw3law/${encodeURIComponent(slug)}`, signal),
    enabled: Boolean(slug),
    retry: 1,
  });

  if (isPending) {
    return (
      <Rw3lawLayout title="Memuat…" backHref={RW3LAW_LIST_PATH}>
        <div className="flex justify-center py-20 bg-[#fffef9] border border-[#d4cfc4]">
          <Loader2 className="w-8 h-8 animate-spin text-[#1a2744]" />
        </div>
      </Rw3lawLayout>
    );
  }

  if (isError || !data) {
    const isTimeout =
      error instanceof Error && error.message.includes("tidak merespons");
    return (
      <Rw3lawLayout title="Tidak Ditemukan" backHref={RW3LAW_LIST_PATH}>
        <div className="bg-[#fffef9] border border-[#d4cfc4] px-8 py-12 text-center font-serif">
          <p className="text-[#1a2744] font-semibold mb-2">
            {isTimeout ? "Gagal Memuat Dokumen" : "Peraturan Tidak Ditemukan"}
          </p>
          <p className="text-sm text-[#4a4a4a] mb-4">
            {error instanceof Error
              ? error.message
              : "Berkas tidak ada atau peraturan telah dicabut."}
          </p>
          {isTimeout ? (
            <Button type="button" variant="outline" className="mb-3" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Coba lagi
            </Button>
          ) : null}
          <Link href={RW3LAW_LIST_PATH} className="text-sm text-[#1a2744] underline block">
            Kembali ke daftar peraturan
          </Link>
        </div>
      </Rw3lawLayout>
    );
  }

  return (
    <Rw3lawLayout title="Peraturan" backHref={RW3LAW_LIST_PATH} subtitle="RW3LAW · Teks Lengkap">
      <nav className="mb-4 text-[11px] uppercase tracking-wider text-[#6b6b6b] font-serif">
        <Link href={RW3LAW_LIST_PATH} className="text-[#1a2744] hover:underline">
          Daftar Peraturan
        </Link>
        <span className="mx-2">/</span>
        <span className="text-[#4a4a4a]">
          {formatNomorPeraturanLengkap(data.nomorPeraturan, data.tahunNomor) ??
            `RW3LAW-${String(data.id).padStart(4, "0")}`}
        </span>
      </nav>

      <Rw3lawShareBar judul={data.judul} slug={data.slug} className="mb-4" />

      {data.status === "dicabut" && (
        <div
          className="mb-4 flex gap-3 items-start rounded-md border border-[#d4a574] bg-[#fdf6ec] px-4 py-3 font-serif text-sm text-[#5c4033]"
          role="status"
        >
          <Ban className="w-5 h-5 shrink-0 mt-0.5" aria-hidden />
          <div>
            <p className="font-semibold">Peraturan ini telah dicabut dan tidak berlaku.</p>
            {data.dicabutAt && (
              <p className="text-xs mt-1 text-[#6b5344]">
                Dicabut: {formatTanggalHukum(data.dicabutAt)}
              </p>
            )}
            <p className="text-xs mt-1 text-[#6b5344]">
              Teks di bawah disimpan sebagai arsip referensi saja.
            </p>
          </div>
        </div>
      )}

      <Rw3lawDocumentView
        judul={data.judul}
        isi={data.isi}
        kategori={data.kategori}
        versi={data.versi}
        tanggalBerlaku={data.tanggalBerlaku}
        rtAsal={data.rtAsal}
        nomorPeraturan={data.nomorPeraturan}
        tahunNomor={data.tahunNomor}
        revisiDariLabel={data.revisiDari?.label ?? null}
        docketId={`RW3LAW-${String(data.id).padStart(4, "0")}`}
      />

      <p className="mt-6 text-center">
        <Link
          href={RW3LAW_LIST_PATH}
          className="font-serif text-sm text-[#1a2744] underline underline-offset-2"
        >
          ← Kembali ke daftar peraturan
        </Link>
      </p>
    </Rw3lawLayout>
  );
}

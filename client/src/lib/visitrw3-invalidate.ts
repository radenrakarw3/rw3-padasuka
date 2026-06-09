import type { QueryClient } from "@tanstack/react-query";

/** Sinkronkan daftar, antrian, kalender, dan statistik setelah tambah/hapus/ubah data Visit RW3. */
export function invalidateVisitrw3Queries(queryClient: QueryClient, opts?: { includeKas?: boolean }) {
  const keys = [
    "/api/pemilik-kost",
    "/api/public/pemilik-kost",
    "/api/warga-singgah",
    "/api/admin/visitrw3/pengajuan",
    "/api/admin/visitrw3/dashboard-stats",
    "/api/admin/visitrw3/kalender",
    "/api/stats/dashboard",
    "/api/public/transparansi",
  ];
  if (opts?.includeKas !== false) {
    keys.push("/api/kas-rw", "/api/kas-rw/summary");
  }
  for (const key of keys) {
    queryClient.invalidateQueries({ queryKey: [key] });
  }
}

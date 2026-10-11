import type { QueryClient } from "@tanstack/react-query";

/** Sinkronkan daftar, antrian, kalender, dan statistik setelah tambah/hapus/ubah data Visit RW3. */
export function invalidateVisitrw3Queries(queryClient: QueryClient, _opts?: { includeKas?: boolean }) {
  const keys = [
    "/api/pemilik-kost",
    "/api/public/pemilik-kost",
    "/api/warga-singgah",
    "/api/admin/visitrw3/pengajuan",
    "/api/admin/visitrw3/dashboard-stats",
    "/api/admin/visitrw3/kalender",
  ];
  for (const key of keys) {
    queryClient.invalidateQueries({ queryKey: [key] });
  }
}

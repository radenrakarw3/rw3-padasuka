import { z } from "zod";
import { ACTIVE_RT_NUMBERS } from "./rt";

export const laporanModeValues = ["anonim", "identitas"] as const;
export type LaporanMode = (typeof laporanModeValues)[number];

export const LAPORAN_MASALAH_JENIS_OPTIONS = [
  { value: "keamanan", label: "Keamanan" },
  { value: "kebersihan", label: "Kebersihan" },
  { value: "infrastruktur", label: "Infrastruktur" },
  { value: "ketertiban", label: "Ketertiban" },
  { value: "umum", label: "Umum" },
  { value: "lainnya", label: "Lainnya" },
] as const;

export function jenisLaporanMasalahLabel(value: string): string {
  return LAPORAN_MASALAH_JENIS_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

export const publicLaporanSchema = z
  .object({
    mode: z.enum(laporanModeValues),
    nomorRt: z.coerce
      .number()
      .int()
      .refine((n) => (ACTIVE_RT_NUMBERS as readonly number[]).includes(n), {
        message: "RT tidak valid",
      }),
    jenisLaporan: z.string().min(1, "Jenis laporan wajib dipilih"),
    subJenis: z.string().optional(),
    fotoLaporan: z.string().optional(),
    isi: z.string().min(10, "Detail laporan minimal 10 karakter"),
    namaPelapor: z.string().optional(),
    nomorWa: z.string().optional(),
    judul: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.mode !== "identitas") return;

    if (!data.namaPelapor?.trim() || data.namaPelapor.trim().length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Nama pelapor wajib diisi",
        path: ["namaPelapor"],
      });
    }

    const wa = (data.nomorWa ?? "").replace(/\D/g, "");
    if (wa.length < 9) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Nomor WhatsApp tidak valid",
        path: ["nomorWa"],
      });
    }

    if (!data.judul?.trim() || data.judul.trim().length < 3) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Judul wajib diisi",
        path: ["judul"],
      });
    }

    if (data.jenisLaporan === "infrastruktur" && !data.subJenis?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Sub-jenis infrastruktur wajib dipilih",
        path: ["subJenis"],
      });
    }
  });

export type PublicLaporanInput = z.infer<typeof publicLaporanSchema>;

import { ZodError } from "zod";

/** Pesan error ramah pengguna untuk API Visit RW3 (termasuk validasi Zod). */
export function visitrw3ApiErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ZodError) {
    const msgs = error.errors.map((e) => e.message).filter(Boolean);
    if (msgs.length) return msgs.join(" ");
  }
  if (error instanceof Error && error.message.trim()) {
    const raw = error.message.trim();
    if (raw.startsWith("[") && raw.includes("invalid_literal")) {
      try {
        const parsed = JSON.parse(raw) as { message?: string }[];
        if (Array.isArray(parsed)) {
          const zodMsgs = parsed.map((e) => e.message).filter(Boolean);
          if (zodMsgs.length) return zodMsgs.join(" ");
        }
      } catch {
        /* ignore */
      }
    }
    return raw;
  }
  if (typeof error === "string" && error.trim()) return error.trim();
  return fallback;
}

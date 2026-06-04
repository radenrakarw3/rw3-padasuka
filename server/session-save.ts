import type { Request } from "express";

/** Simpan sesi ke store (PostgreSQL) sebelum mengirim respons — hindari race cookie. */
export function saveSession(req: Request): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!req.session) {
      reject(new Error("Sesi tidak tersedia"));
      return;
    }
    req.session.save((err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

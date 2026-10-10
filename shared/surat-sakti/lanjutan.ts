import { fieldJenis, str } from "./render";
import { tanggalPanjang } from "./redaksi";
import type { DataDokumen, JenisDokumen } from "./tipe";

/**
 * Prefill dokumen lanjutan dari dokumen induk. Hanya menyalin field yang ada di jenis tujuan,
 * tidak pernah menyalin konfirmasi/tanggal aktual. Tidak mengubah status dokumen induk.
 */
export function prefillLanjutan(
  induk: { jenis: JenisDokumen | undefined; data: DataDokumen; nomor: string | null; perihal: string; tanggal: string | null },
  tujuan: JenisDokumen,
): DataDokumen {
  const fields = fieldJenis(tujuan);
  const keys = new Map(fields.map((f) => [f.key, f]));
  const out: DataDokumen = { ...(tujuan.awal ?? {}) };
  for (const [k, v] of Object.entries(induk.data ?? {})) {
    const f = keys.get(k);
    if (!f || f.jangan_salin || f.tipe === "centang") continue;
    out[k] = v;
  }
  const rujukan = `${induk.nomor ?? "(draf)"} perihal ${induk.perihal}`;
  if (keys.has("suratRujukan")) out.suratRujukan = rujukan;
  if (keys.has("tanggalRujukan") && induk.tanggal) out.tanggalRujukan = induk.tanggal;
  if (keys.has("penugasanRujukan")) out.penugasanRujukan = rujukan;
  if (keys.has("keputusanDiubah") && induk.jenis?.layout === "keputusan") out.keputusanDiubah = rujukan;
  if (keys.has("objekEvaluasi") && !str(out.objekEvaluasi)) out.objekEvaluasi = induk.perihal;
  if (keys.has("namaPekerjaan") && !str(out.namaPekerjaan)) out.namaPekerjaan = induk.perihal;
  if (keys.has("namaKegiatan") && !str(out.namaKegiatan)) out.namaKegiatan = induk.perihal;
  // Petugas surat tugas → penanggung jawab dokumen berikutnya.
  if (keys.has("pic") && !out.pic && Array.isArray(induk.data?.petugas)) out.pic = induk.data.petugas;
  // Tempat undangan → tempat berita acara (tanggal aktual tetap diisi manual).
  if (keys.has("tempatAcara") && !out.tempatAcara && str(induk.data?.tempatAcara)) out.tempatAcara = induk.data.tempatAcara;
  if (keys.has("fakta") && !str(out.fakta) && induk.nomor) {
    out.fakta = `Menindaklanjuti ${induk.jenis?.label ?? "surat"} nomor ${induk.nomor}${induk.tanggal ? ` tanggal ${tanggalPanjang(induk.tanggal)}` : ""}.`;
  }
  return out;
}

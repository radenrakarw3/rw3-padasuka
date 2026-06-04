import "dotenv/config";
import { initRw3law } from "../server/rw3law-routes";
import {
  listRw3lawPublic,
  createRw3lawDraft,
  approveRw3law,
  cabutRw3law,
  deleteRw3law,
  getRw3lawById,
} from "../server/rw3law";

async function main() {
  await initRw3law();
  const before = await listRw3lawPublic();
  console.log("public (disetujui):", before.length);

  const draft = await createRw3lawDraft(
    {
      judul: "Test Smoke RW3LAW",
      kategori: "umum",
      isi: "Ini isi peraturan uji coba minimal dua puluh karakter untuk validasi smoke test.",
      urutan: 99,
    },
    "smoke",
  );
  console.log("draft created:", draft.slug, draft.status);

  const approved = await approveRw3law(draft.id, "smoke");
  console.log("approved:", approved.status);

  const after = await listRw3lawPublic();
  const found = after.some((x) => x.slug === approved.slug);
  console.log("visible public:", found);

  try {
    await deleteRw3law(approved.id);
    console.error("FAIL: hapus peraturan berlaku harus ditolak");
    process.exit(1);
  } catch {
    console.log("hapus ditolak saat masih berlaku: OK");
  }

  await cabutRw3law(approved.id);
  const afterCabut = await listRw3lawPublic();
  console.log("hidden after cabut:", !afterCabut.some((x) => x.slug === approved.slug));

  await deleteRw3law(approved.id);
  const gone = await getRw3lawById(approved.id);
  console.log("hapus permanen setelah dicabut:", gone == null ? "OK" : "FAIL");

  process.exit(found && gone == null ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

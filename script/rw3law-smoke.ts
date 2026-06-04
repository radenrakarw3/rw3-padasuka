import "dotenv/config";
import { initRw3law } from "../server/rw3law-routes";
import {
  listRw3lawPublic,
  createRw3lawDraft,
  approveRw3law,
  cabutRw3law,
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

  await cabutRw3law(approved.id);
  const afterCabut = await listRw3lawPublic();
  console.log("hidden after cabut:", !afterCabut.some((x) => x.slug === approved.slug));

  process.exit(found ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

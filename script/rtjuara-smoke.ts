/**
 * Smoke test RT JUARA — alur penuh: quest → akun RT → login → kirim bukti →
 * verifikasi → leaderboard → pengumuman juara. Semua data uji dihapus di akhir.
 * Jalankan: npx tsx script/rtjuara-smoke.ts
 */
import "dotenv/config";
import { eq, inArray } from "drizzle-orm";
import { db, pool } from "../server/db";
import { rtjuaraQuest, rtjuaraSubmission, rtjuaraJuara, rtjuaraRtAkun } from "@shared/schema";
import { bulanKey, hariKey } from "@shared/rtjuara";
import {
  ensureRtjuaraSchema,
  createQuest,
  createSubmission,
  getLeaderboard,
  hapusAkun,
  listQuestForRt,
  reviewSubmission,
  tetapkanJuara,
  upsertAkun,
  verifikasiLogin,
} from "../server/rtjuara";

const FOTO_1PX =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

let lulus = 0;
let gagal = 0;

function cek(nama: string, kondisi: boolean, detail?: unknown) {
  if (kondisi) {
    lulus++;
    console.log(`  OK   ${nama}`);
  } else {
    gagal++;
    console.error(`  GAGAL ${nama}`, detail ?? "");
  }
}

async function harusGagal(nama: string, fn: () => Promise<unknown>, potongan: string) {
  try {
    await fn();
    gagal++;
    console.error(`  GAGAL ${nama} — seharusnya ditolak`);
  } catch (e) {
    const pesan = e instanceof Error ? e.message : String(e);
    cek(`${nama} (${pesan.slice(0, 60)})`, pesan.toLowerCase().includes(potongan.toLowerCase()), pesan);
  }
}

async function main() {
  const questIds: number[] = [];
  const rtUji = 6;
  const rtLawan = 7;
  const bulan = bulanKey();

  try {
    await ensureRtjuaraSchema();
    console.log("\n== Skema ==");
    cek("ensureRtjuaraSchema jalan tanpa error", true);

    console.log("\n== Quest ==");
    const questHarian = await createQuest(
      {
        judul: "SMOKE Kerja bakti harian",
        deskripsi: "Bersihkan lingkungan RT bersama warga setiap hari.",
        periode: "harian",
        poin: 10,
        minFoto: 1,
        wajibJumlahPeserta: true,
      },
      "smoke-admin",
    );
    questIds.push(questHarian.id);
    cek("quest harian dibuat", questHarian.poin === 10 && questHarian.periode === "harian");

    const questBulanan = await createQuest(
      {
        judul: "SMOKE Rapat warga bulanan",
        deskripsi: "Adakan rapat rutin warga RT minimal sekali sebulan.",
        periode: "bulanan",
        poin: 50,
        minFoto: 1,
      },
      "smoke-admin",
    );
    questIds.push(questBulanan.id);
    cek("quest bulanan dibuat", questBulanan.poin === 50);

    await harusGagal(
      "poin 0 ditolak",
      () => createQuest({ judul: "SMOKE nol", deskripsi: "deskripsi cukup panjang", periode: "harian", poin: 0 }, "smoke"),
      "poin minimal 1",
    );

    console.log("\n== Akun ketua RT ==");
    await upsertAkun({ rt: rtUji, namaKetua: "Ketua Uji", pin: "123456" });
    cek("login PIN benar", (await verifikasiLogin(rtUji, "123456")) !== null);
    cek("login PIN salah ditolak", (await verifikasiLogin(rtUji, "999999")) === null);

    await upsertAkun({ rt: rtUji, namaKetua: "Ketua Uji", aktif: false });
    cek("akun nonaktif tidak bisa login", (await verifikasiLogin(rtUji, "123456")) === null);
    await upsertAkun({ rt: rtUji, namaKetua: "Ketua Uji", aktif: true });

    await harusGagal(
      "akun baru tanpa PIN ditolak",
      () => upsertAkun({ rt: rtLawan, namaKetua: "Ketua Lawan" }),
      "PIN 6 digit wajib",
    );

    console.log("\n== Kirim bukti ==");
    const buktiDasar = {
      judulKegiatan: "SMOKE Kerja bakti selokan",
      tanggalKegiatan: hariKey(),
      lokasi: "Gang Mawar",
      jumlahPeserta: 12,
      deskripsi: "Warga membersihkan selokan sepanjang gang mawar sampai bersih.",
      foto: [FOTO_1PX],
    };

    const bukti = await createSubmission(rtUji, { ...buktiDasar, questId: questHarian.id });
    cek("bukti berstatus menunggu", bukti.status === "menunggu");
    cek("poin belum diberikan sebelum verifikasi", bukti.poinDiberikan === 0 && bukti.poinPotensi === 10);
    cek("foto tersimpan", bukti.fotoIds.length === 1);

    await harusGagal(
      "klaim dobel pada periode sama ditolak",
      () => createSubmission(rtUji, { ...buktiDasar, questId: questHarian.id }),
      "sudah dikirim",
    );

    await harusGagal(
      "tanggal masa depan ditolak",
      () =>
        createSubmission(rtUji, {
          ...buktiDasar,
          questId: questBulanan.id,
          tanggalKegiatan: hariKey(new Date(Date.now() + 86_400_000 * 2)),
        }),
      "masa depan",
    );

    await harusGagal(
      "backdate terlalu jauh ditolak",
      () =>
        createSubmission(rtUji, {
          ...buktiDasar,
          questId: questBulanan.id,
          tanggalKegiatan: hariKey(new Date(Date.now() - 86_400_000 * 30)),
        }),
      "maksimal",
    );

    await harusGagal(
      "jumlah peserta wajib ditegakkan",
      () =>
        createSubmission(rtLawan, {
          ...buktiDasar,
          questId: questHarian.id,
          jumlahPeserta: null,
        }),
      "jumlah peserta",
    );

    await harusGagal(
      "bukti tanpa foto ditolak",
      () => createSubmission(rtLawan, { ...buktiDasar, questId: questHarian.id, foto: [] }),
      "foto",
    );

    console.log("\n== Verifikasi ==");
    const papanSebelum = await getLeaderboard(bulan);
    cek("poin belum masuk leaderboard saat menunggu", papanSebelum.find((r) => r.rt === rtUji)?.totalPoin === 0);
    cek("bukti menunggu terhitung", papanSebelum.find((r) => r.rt === rtUji)?.menunggu === 1);

    await harusGagal(
      "tolak tanpa alasan ditolak",
      () => reviewSubmission(bukti.id, "smoke-admin", { status: "ditolak" }),
      "alasan penolakan",
    );

    const disetujui = await reviewSubmission(bukti.id, "smoke-admin", { status: "disetujui" });
    cek("poin masuk setelah disetujui", disetujui.poinDiberikan === 10 && disetujui.status === "disetujui");

    const papanSesudah = await getLeaderboard(bulan);
    cek("leaderboard menghitung poin", papanSesudah.find((r) => r.rt === rtUji)?.totalPoin === 10);
    cek("semua RT 01-07 muncul", papanSesudah.length === 7);
    cek("RT dengan poin jadi peringkat 1", papanSesudah[0].rt === rtUji && papanSesudah[0].peringkat === 1);

    console.log("\n== Kirim ulang setelah ditolak ==");
    const buktiBulanan = await createSubmission(rtLawan, { ...buktiDasar, questId: questBulanan.id });
    await reviewSubmission(buktiBulanan.id, "smoke-admin", {
      status: "ditolak",
      catatanAdmin: "Foto kurang jelas",
    });
    const kirimUlang = await createSubmission(rtLawan, { ...buktiDasar, questId: questBulanan.id });
    cek("boleh kirim ulang setelah ditolak", kirimUlang.status === "menunggu");

    const questRt = await listQuestForRt(rtUji);
    const kartuHarian = questRt.find((q) => q.id === questHarian.id);
    cek("quest yang sudah disetujui terkunci di portal RT", kartuHarian?.bisaKirim === false);

    console.log("\n== Pengumuman juara ==");
    await harusGagal(
      "juara ditolak saat masih ada bukti menunggu",
      () => tetapkanJuara(bulan, "smoke-admin"),
      "menunggu verifikasi",
    );

    await reviewSubmission(kirimUlang.id, "smoke-admin", { status: "disetujui" });
    const juara = await tetapkanJuara(bulan, "smoke-admin", "Uji coba");
    cek("juara 1 adalah RT dengan poin tertinggi", juara[0].peringkat === 1 && juara[0].rt === rtLawan, juara[0]);
    cek("semua RT ikut disnapshot", juara.length === 7);

    await harusGagal(
      "bukti baru ditolak setelah juara diumumkan",
      () => createSubmission(rtUji, { ...buktiDasar, questId: questBulanan.id }),
      "sudah diumumkan",
    );
  } finally {
    console.log("\n== Bersih-bersih ==");
    await db.delete(rtjuaraJuara).where(eq(rtjuaraJuara.bulanKey, bulanKey()));
    if (questIds.length) {
      await db.delete(rtjuaraSubmission).where(inArray(rtjuaraSubmission.questId, questIds));
      await db.delete(rtjuaraQuest).where(inArray(rtjuaraQuest.id, questIds));
    }
    await hapusAkun(6);
    await hapusAkun(7);

    const sisaQuest = await db.select().from(rtjuaraQuest);
    const sisaBukti = await db.select().from(rtjuaraSubmission);
    const sisaJuara = await db.select().from(rtjuaraJuara);
    const sisaAkun = await db.select().from(rtjuaraRtAkun);
    cek(
      "tabel RT JUARA kembali kosong",
      sisaQuest.length === 0 && sisaBukti.length === 0 && sisaJuara.length === 0 && sisaAkun.length === 0,
      { sisaQuest: sisaQuest.length, sisaBukti: sisaBukti.length, sisaJuara: sisaJuara.length, sisaAkun: sisaAkun.length },
    );

    console.log(`\nHasil: ${lulus} lulus, ${gagal} gagal`);
    await pool.end();
    process.exit(gagal > 0 ? 1 : 0);
  }
}

void main();

import { storage } from "./storage";
import { db } from "./db";
import { kartuKeluarga, warga, rtData, adminUser } from "@shared/schema";
import fs from "fs";
import path from "path";

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function cleanDateStr(val: string): string | null {
  const cleaned = val.replace(/"/g, "").trim();
  if (!cleaned || cleaned === "null" || cleaned === "") return null;
  try {
    const d = new Date(cleaned);
    if (isNaN(d.getTime())) return null;
    return d.toISOString().split("T")[0];
  } catch {
    return null;
  }
}

async function seedAdminsAndRt() {
  const adminCsvPath = path.join(process.cwd(), "attached_assets", "admin_1772993517793.csv");
  if (fs.existsSync(adminCsvPath)) {
    const existingAdmins = await storage.getAllAdmins();
    if (existingAdmins.length === 0) {
      const content = fs.readFileSync(adminCsvPath, "utf-8");
      const lines = content.split("\n").filter(l => l.trim());
      const header = parseCSVLine(lines[0]);
      const usernameIdx = header.indexOf("username");
      const passwordIdx = header.indexOf("password_hash");
      const namaIdx = header.indexOf("nama_lengkap");
      const activeIdx = header.indexOf("is_active");

      for (let i = 1; i < lines.length; i++) {
        const fields = parseCSVLine(lines[i]);
        if (fields.length < 4) continue;
        const username = fields[usernameIdx]?.replace(/"/g, "").trim();
        const passwordHash = fields[passwordIdx]?.replace(/"/g, "").trim();
        const namaLengkap = fields[namaIdx]?.replace(/"/g, "").trim();
        const isActive = fields[activeIdx]?.replace(/"/g, "").trim() === "true";
        if (!username || !passwordHash) continue;
        try {
          await storage.createAdmin({ username, passwordHash, namaLengkap, isActive });
        } catch (err: any) {
          if (!err.message.includes("duplicate")) {
            console.error(`Error seeding admin ${username}:`, err.message);
          }
        }
      }
      console.log("Admin users seeded from CSV");
    }
  }

  const rtCsvPath = path.join(process.cwd(), "attached_assets", "data_rt_(1)_1772993522045.csv");
  if (fs.existsSync(rtCsvPath)) {
    const content = fs.readFileSync(rtCsvPath, "utf-8");
    const lines = content.split("\n").filter(l => l.trim());
    const header = parseCSVLine(lines[0]);
    const rtIdx = header.indexOf("nomor_rt");
    const ketuaIdx = header.indexOf("nama_ketua_rt");

    for (let i = 1; i < lines.length; i++) {
      const fields = parseCSVLine(lines[i]);
      if (fields.length < 3) continue;
      const nomorRt = parseInt(fields[rtIdx]?.replace(/"/g, "").trim());
      const namaKetua = fields[ketuaIdx]?.replace(/"/g, "").trim();
      if (!nomorRt || !namaKetua) continue;
      const existing = await storage.getRtByNomor(nomorRt);
      if (!existing) {
        await storage.createRt({ nomorRt, namaKetua });
      } else {
        await storage.updateRt(existing.id, { namaKetua });
      }
    }
    console.log("RT data seeded from CSV");
  }
}

export async function seedDatabase() {
  try {
    await seedAdminsAndRt();

    const existingKk = await storage.getAllKk();
    if (existingKk.length > 0) {
      console.log("KK data already seeded, skipping CSV import...");
      return;
    }

    console.log("Seeding KK/warga data from CSV...");

    const kkCsvPath = path.join(process.cwd(), "attached_assets", "kartu_keluarga_1772991097594.csv");
    if (fs.existsSync(kkCsvPath)) {
      const kkContent = fs.readFileSync(kkCsvPath, "utf-8");
      const kkLines = kkContent.split("\n").filter(l => l.trim());
      const kkHeader = parseCSVLine(kkLines[0]);

      const idIdx = kkHeader.indexOf("id");
      const nomorKkIdx = kkHeader.indexOf("nomor_kk");
      const rtIdx = kkHeader.indexOf("rt");
      const alamatIdx = kkHeader.indexOf("alamat");
      const statusRumahIdx = kkHeader.indexOf("status_rumah");
      const jumlahIdx = kkHeader.indexOf("jumlah_penghuni");
      const kondisiIdx = kkHeader.indexOf("kondisi_bangunan");
      const sumberAirIdx = kkHeader.indexOf("sumber_air");
      const sanitasiIdx = kkHeader.indexOf("sanitasi_wc");
      const listrikIdx = kkHeader.indexOf("listrik");
      const bansosIdx = kkHeader.indexOf("penerima_bansos");
      const gmapsIdx = kkHeader.indexOf("link_gmaps");
      const latIdx = kkHeader.indexOf("latitude");
      const lngIdx = kkHeader.indexOf("longitude");

      const kkIdMap = new Map<string, number>();

      for (let i = 1; i < kkLines.length; i++) {
        const fields = parseCSVLine(kkLines[i]);
        if (fields.length < 5) continue;

        const csvId = fields[idIdx]?.replace(/"/g, "").trim();
        const nomorKk = fields[nomorKkIdx]?.replace(/"/g, "").trim();
        if (!nomorKk) continue;

        try {
          const created = await storage.createKk({
            nomorKk,
            rt: parseInt(fields[rtIdx]?.replace(/"/g, "").trim()) || 1,
            alamat: fields[alamatIdx]?.replace(/"/g, "").trim() || "",
            statusRumah: fields[statusRumahIdx]?.replace(/"/g, "").trim() || "Milik Sendiri",
            jumlahPenghuni: parseInt(fields[jumlahIdx]?.replace(/"/g, "").trim()) || 1,
            kondisiBangunan: fields[kondisiIdx]?.replace(/"/g, "").trim() || "Permanen",
            sumberAir: fields[sumberAirIdx]?.replace(/"/g, "").trim() || "PDAM",
            sanitasiWc: fields[sanitasiIdx]?.replace(/"/g, "").trim() || "Jamban Sendiri",
            listrik: fields[listrikIdx]?.replace(/"/g, "").trim() || "PLN 900 VA",
            penerimaBansos: fields[bansosIdx]?.replace(/"/g, "").trim() === "true",
            linkGmaps: fields[gmapsIdx]?.replace(/"/g, "").trim() || null,
            latitude: fields[latIdx]?.replace(/"/g, "").trim() || null,
            longitude: fields[lngIdx]?.replace(/"/g, "").trim() || null,
          });
          kkIdMap.set(csvId, created.id);
        } catch (err: any) {
          console.error(`Error seeding KK ${nomorKk}:`, err.message);
        }
      }
      console.log(`Seeded ${kkIdMap.size} KK records`);

      const wargaCsvPath = path.join(process.cwd(), "attached_assets", "warga_(1)_1772991097576.csv");
      if (fs.existsSync(wargaCsvPath)) {
        const wargaContent = fs.readFileSync(wargaCsvPath, "utf-8");
        const wargaLines = wargaContent.split("\n").filter(l => l.trim());
        const wargaHeader = parseCSVLine(wargaLines[0]);

        const wKkIdIdx = wargaHeader.indexOf("kk_id");
        const wNamaIdx = wargaHeader.indexOf("nama_lengkap");
        const wNikIdx = wargaHeader.indexOf("nik");
        const wWaIdx = wargaHeader.indexOf("nomor_whatsapp");
        const wJkIdx = wargaHeader.indexOf("jenis_kelamin");
        const wSpIdx = wargaHeader.indexOf("status_perkawinan");
        const wAgamaIdx = wargaHeader.indexOf("agama");
        const wKedIdx = wargaHeader.indexOf("kedudukan_keluarga");
        const wTlIdx = wargaHeader.indexOf("tanggal_lahir");
        const wPekerjaanIdx = wargaHeader.indexOf("pekerjaan");
        const wStatusIdx = wargaHeader.indexOf("status_kependudukan");

        let wargaCount = 0;
        for (let i = 1; i < wargaLines.length; i++) {
          const fields = parseCSVLine(wargaLines[i]);
          if (fields.length < 5) continue;

          const csvKkId = fields[wKkIdIdx]?.replace(/"/g, "").trim();
          const dbKkId = kkIdMap.get(csvKkId);
          if (!dbKkId) continue;

          const nik = fields[wNikIdx]?.replace(/"/g, "").trim();
          const nama = fields[wNamaIdx]?.replace(/"/g, "").trim();
          if (!nik || !nama) continue;

          try {
            await storage.createWarga({
              kkId: dbKkId,
              namaLengkap: nama,
              nik,
              nomorWhatsapp: fields[wWaIdx]?.replace(/"/g, "").trim() || null,
              jenisKelamin: fields[wJkIdx]?.replace(/"/g, "").trim() || "Laki-laki",
              statusPerkawinan: fields[wSpIdx]?.replace(/"/g, "").trim() || "Belum Kawin",
              agama: fields[wAgamaIdx]?.replace(/"/g, "").trim() || "Islam",
              kedudukanKeluarga: fields[wKedIdx]?.replace(/"/g, "").trim() || "Anak",
              tanggalLahir: cleanDateStr(fields[wTlIdx] || ""),
              pekerjaan: fields[wPekerjaanIdx]?.replace(/"/g, "").trim() || null,
              statusKependudukan: fields[wStatusIdx]?.replace(/"/g, "").trim() || "Aktif",
            });
            wargaCount++;
          } catch (err: any) {
            if (!err.message.includes("duplicate")) {
              console.error(`Error seeding warga ${nama}:`, err.message);
            }
          }
        }
        console.log(`Seeded ${wargaCount} warga records`);
      }
    }

    console.log("Database seeding complete!");
  } catch (error) {
    console.error("Seeding error:", error);
  }
}

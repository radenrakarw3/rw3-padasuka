/**
 * Regenerasi PDF resmi kosong: client/public/rw3biz/Formulir-Sumbangsih-RW3BIZ.pdf
 * Jalankan: npx tsx script/buat-formulir-sumbangsih-pdf.ts
 */
import "dotenv/config";
import fs from "fs";
import path from "path";
import { buatPdfFormulirKosong } from "../server/rw3biz-surat";

const out = path.resolve("client/public/rw3biz/Formulir-Sumbangsih-RW3BIZ.pdf");
fs.mkdirSync(path.dirname(out), { recursive: true });
const { buffer, nama } = buatPdfFormulirKosong();
fs.writeFileSync(out, buffer);
console.log(`OK ${nama} → ${out} (${buffer.length} byte)`);

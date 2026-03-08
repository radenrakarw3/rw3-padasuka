import { jsPDF } from "jspdf";
import logoGreen from "@assets/RW3-Cimahi-Logo-Green@16x_1772999415502.png";

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function cleanText(text: string): string {
  let cleaned = text.replace(/\*\*/g, "").replace(/\*/g, "");
  cleaned = cleaned.replace(/^#{1,6}\s+/gm, "");
  cleaned = cleaned.replace(/\(Tanda Tangan\)/gi, "");
  cleaned = cleaned.replace(/\(Stempel RW\)/gi, "");
  cleaned = cleaned.replace(/\(Stempel RT\)/gi, "");
  return cleaned.trim();
}

function isBiodataLine(line: string): boolean {
  const trimmed = line.trim();
  const colonIdx = trimmed.indexOf(":");
  if (colonIdx < 0) return false;
  const label = trimmed.substring(0, colonIdx).trim();
  if (label.length < 2 || label.length > 35) return false;
  const labels = [
    /^nama/i, /^nik/i, /^tempat/i, /^tanggal\s*lahir/i, /^alamat/i,
    /^rt\s*\/?\s*rw/i, /^rt\b/i, /^rw\b/i, /^kelurahan/i, /^kecamatan/i,
    /^kota/i, /^kabupaten/i, /^provinsi/i,
    /^agama/i, /^pekerjaan/i, /^jenis\s*kelamin/i, /^status/i,
    /^no\.?\s*(kk|telp|hp)/i, /^kewarganegaraan/i, /^golongan\s*darah/i,
    /^pendidikan/i, /^hubungan/i, /^jabatan/i,
    /^nomor/i, /^perihal/i, /^lampiran/i, /^sifat/i, /^hal\b/i,
    /^hari/i, /^waktu/i, /^acara/i, /^tempat/i,
  ];
  return labels.some(r => r.test(label));
}

function isTitleLine(line: string): boolean {
  const trimmed = line.trim();
  if (trimmed.length > 60) return false;
  if (/^(SURAT KETERANGAN|SURAT PENGANTAR|SURAT UNDANGAN|SURAT PERNYATAAN|SURAT TUGAS)/.test(trimmed)) return true;
  if (/^(Surat Keterangan|Surat Pengantar|Surat Undangan|Surat Pernyataan|Surat Tugas)/i.test(trimmed) && trimmed === trimmed.toUpperCase()) return true;
  return false;
}

function splitTwoColumns(line: string): { left: string; right: string } | null {
  if (line.includes("|")) {
    const parts = line.split("|");
    return { left: (parts[0] || "").trim(), right: (parts[1] || "").trim() };
  }
  const match = line.match(/^(.+?)\s{6,}(.+)$/);
  if (match) return { left: match[1].trim(), right: match[2].trim() };
  return null;
}

function isDateLine(line: string): boolean {
  return /^(kota\s+)?(cimahi|bandung|jakarta),?\s+\d/i.test(line.trim());
}

function isSignatureTrigger(line: string): boolean {
  const trimmed = line.trim();
  const triggers = [
    /^(hormat\s+kami|mengetahui|yang\s+bertanda\s+tangan|tertanda|di\s*ketahui|yang\s+membuat)/i,
    /^ketua\s+(rt|rw)/i,
  ];
  if (triggers.some(r => r.test(trimmed))) return true;
  if (isDateLine(trimmed)) return true;
  const split = splitTwoColumns(line);
  if (split && triggers.some(r => r.test(split.left) || r.test(split.right))) return true;
  return false;
}

function findSignatureStart(lines: string[]): number {
  for (let i = lines.length - 1; i >= Math.max(0, lines.length - 25); i--) {
    if (isSignatureTrigger(lines[i])) {
      const remaining = lines.slice(i);
      const hasName = remaining.some(l => {
        const t = l.trim();
        if (/^\(.*\)$/.test(t)) return true;
        const s = splitTwoColumns(l);
        return s ? (/^\(.*\)$/.test(s.left) || /^\(.*\)$/.test(s.right)) : false;
      });
      if (hasName) return i;
    }
  }
  return -1;
}

function hasTwoColumnSig(sigLines: string[]): boolean {
  let count = 0;
  for (const l of sigLines) {
    if (!l.trim()) continue;
    const s = splitTwoColumns(l);
    if (s && s.left && s.right) count++;
  }
  return count >= 2;
}

export async function generateSuratPDF(options: {
  nomorSurat?: string | null;
  isiSurat: string;
  jenisSurat: string;
  fileName?: string;
}) {
  const { nomorSurat, isiSurat, jenisSurat, fileName } = options;
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = 210;
  const marginLeft = 20;
  const marginRight = 20;
  const contentWidth = pageWidth - marginLeft - marginRight;
  const pageHeight = 297;
  const startY = 42;
  const bottomMargin = 12;
  const availableHeight = pageHeight - startY - bottomMargin;
  const colonMM = 35;

  let img: HTMLImageElement | null = null;
  try { img = await loadImage(logoGreen); } catch {}

  let processedText = cleanText(isiSurat);
  processedText = processedText.replace(/^Nomor\s*:.*$/m, "").trim();
  const allLines = processedText.split("\n");

  const sigStart = findSignatureStart(allLines);
  const bodyLines = sigStart >= 0 ? allLines.slice(0, sigStart) : [...allLines];
  const sigLines = sigStart >= 0 ? allLines.slice(sigStart) : [];

  let dateLine: string | null = null;
  const dateIdxSig = sigLines.findIndex(l => isDateLine(l));
  if (dateIdxSig >= 0) {
    dateLine = sigLines[dateIdxSig].trim();
    sigLines.splice(dateIdxSig, 1);
  }

  let hasTitle = false;
  for (let i = 0; i < Math.min(bodyLines.length, 8); i++) {
    if (isTitleLine(bodyLines[i])) {
      hasTitle = true;
      break;
    }
  }

  const isTwoCol = hasTwoColumnSig(sigLines);

  let sigEstLines = 0;
  if (dateLine) sigEstLines += 1.5;
  for (const l of sigLines) {
    const t = l.trim();
    if (!t) { sigEstLines += 0.5; continue; }
    const s = splitTwoColumns(l);
    const left = s ? s.left : t;
    if (/^\(.*\)$/.test(left)) { sigEstLines += 4; continue; }
    sigEstLines += 1;
  }

  const fixedFs = 10;
  const fixedLh = 4.8;
  const titleFs = 12;

  let bodyLineCount = 0;
  let fixedLineCount = 0;
  for (const l of bodyLines) {
    const t = l.trim();
    if (!t) { fixedLineCount += 0.4; continue; }
    if (isTitleLine(t)) { fixedLineCount += 2.5; continue; }
    doc.setFontSize(fixedFs);
    if (isBiodataLine(l)) {
      const ci = l.indexOf(":");
      const val = l.substring(ci + 1).trim();
      const valMaxW = contentWidth - colonMM - 3;
      const w = doc.splitTextToSize(val, Math.max(valMaxW, 20));
      fixedLineCount += Math.max(1, w.length);
    } else if (/^\s{4,}/.test(l) && !isBiodataLine(l)) {
      fixedLineCount += 1;
    } else {
      const w = doc.splitTextToSize(t, contentWidth);
      bodyLineCount += w.length;
    }
  }
  if (nomorSurat && !hasTitle) fixedLineCount += 1;

  const fixedHeight = (fixedLineCount + sigEstLines) * fixedLh;
  const bodyAvailable = availableHeight - fixedHeight;
  const bodyNeeded = bodyLineCount * fixedLh;

  let bodyScale = 1;
  if (bodyNeeded > bodyAvailable && bodyAvailable > 0) {
    bodyScale = bodyAvailable / bodyNeeded;
    if (bodyScale < 0.55) bodyScale = 0.55;
  }

  const bodyFs = Math.max(7, Math.round(fixedFs * bodyScale * 10) / 10);
  const bodyLh = fixedLh * bodyScale;

  const drawKop = () => {
    if (img) doc.addImage(img, "PNG", marginLeft + 2, 12, 18, 18);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text("RUKUN WARGA 03", pageWidth / 2, 16, { align: "center" });
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("KELURAHAN PADASUKA", pageWidth / 2, 22, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text("KECAMATAN CIMAHI TENGAH - KOTA CIMAHI", pageWidth / 2, 27, { align: "center" });
    doc.setFontSize(7.5);
    doc.text("Sekretariat: Jln. K.H. Usman Dhomiri, Padasuka, Kota Cimahi, 40526", pageWidth / 2, 31, { align: "center" });
    doc.setLineWidth(0.8);
    doc.line(marginLeft, 34, pageWidth - marginRight, 34);
    doc.setLineWidth(0.3);
    doc.line(marginLeft, 35, pageWidth - marginRight, 35);
  };

  drawKop();
  let y = startY;

  const printBody = (text: string) => {
    doc.setFontSize(bodyFs);
    doc.setFont("helvetica", "normal");
    const wrapped = doc.splitTextToSize(text, contentWidth);
    for (const wl of wrapped) {
      doc.text(wl, marginLeft, y);
      y += bodyLh;
    }
  };

  const printCentered = (text: string, bold?: boolean, size?: number) => {
    doc.setFontSize(size || fixedFs);
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.text(text, pageWidth / 2, y, { align: "center" });
    y += fixedLh;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(fixedFs);
  };

  const printBiodata = (line: string) => {
    const ci = line.indexOf(":");
    const label = line.substring(0, ci).trim();
    const value = line.substring(ci + 1).trim();
    doc.setFontSize(fixedFs);
    doc.setFont("helvetica", "normal");
    const colonX = marginLeft + colonMM;
    doc.text(label, marginLeft, y);
    doc.text(":", colonX, y);
    const valueX = colonX + 3;
    const maxW = contentWidth - colonMM - 3;
    const wrapped = doc.splitTextToSize(value, maxW);
    for (let j = 0; j < wrapped.length; j++) {
      doc.text(wrapped[j], valueX, y);
      y += fixedLh;
    }
  };

  if (nomorSurat && !hasTitle) {
    printBiodata(`Nomor : ${nomorSurat}`);
  }

  let nomorDone = false;
  let prevWasBiodata = false;

  for (let i = 0; i < bodyLines.length; i++) {
    const raw = bodyLines[i];
    const trimmed = raw.trim();

    if (trimmed === "") {
      prevWasBiodata = false;
      y += fixedLh * 0.4;
      continue;
    }

    if (isTitleLine(trimmed)) {
      prevWasBiodata = false;
      y += fixedLh * 0.3;
      const spaced = trimmed.split("").join(" ").replace(/\s{3,}/g, "   ");
      printCentered(spaced, true, titleFs);
      if (nomorSurat && !nomorDone) {
        printCentered(`Nomor: ${nomorSurat}`, false, fixedFs);
        nomorDone = true;
      }
      y += fixedLh * 0.3;
      continue;
    }

    if (prevWasBiodata && /^\s{4,}/.test(raw) && !isBiodataLine(raw)) {
      doc.setFontSize(fixedFs);
      doc.setFont("helvetica", "normal");
      const contX = marginLeft + colonMM + 3;
      const contW = contentWidth - colonMM - 3;
      const wrapped = doc.splitTextToSize(trimmed, contW);
      for (const wl of wrapped) {
        doc.text(wl, contX, y);
        y += fixedLh;
      }
      continue;
    }

    if (isBiodataLine(raw)) {
      prevWasBiodata = true;
      printBiodata(raw);
      continue;
    }

    prevWasBiodata = false;
    printBody(trimmed);
  }

  if (dateLine || sigLines.length > 0) {
    y += fixedLh * 0.5;
  }

  if (dateLine) {
    doc.setFontSize(fixedFs);
    doc.setFont("helvetica", "normal");
    doc.text(dateLine, pageWidth - marginRight, y, { align: "right" });
    y += fixedLh * 1.2;
  }

  if (sigLines.length > 0) {
    if (isTwoCol) {
      const leftCenter = marginLeft + contentWidth * 0.25;
      const rightCenter = marginLeft + contentWidth * 0.75;

      for (const rawLine of sigLines) {
        const trimmed = rawLine.trim();
        if (!trimmed) { y += fixedLh; continue; }

        const split = splitTwoColumns(rawLine);
        const left = split ? split.left : trimmed;
        const right = split ? split.right : "";

        const leftIsName = /^\(.*\)$/.test(left);
        const rightIsName = /^\(.*\)$/.test(right);

        if (leftIsName || rightIsName) {
          y += fixedLh * 2.5;
        }

        doc.setFontSize(fixedFs);

        if (left) {
          doc.setFont("helvetica", leftIsName ? "bold" : "normal");
          const w = doc.getTextWidth(left);
          doc.text(left, leftCenter - w / 2, y);
          if (leftIsName) {
            doc.setLineWidth(0.3);
            doc.line(leftCenter - w / 2, y + 1, leftCenter + w / 2, y + 1);
          }
        }
        if (right) {
          doc.setFont("helvetica", rightIsName ? "bold" : "normal");
          const w = doc.getTextWidth(right);
          doc.text(right, rightCenter - w / 2, y);
          if (rightIsName) {
            doc.setLineWidth(0.3);
            doc.line(rightCenter - w / 2, y + 1, rightCenter + w / 2, y + 1);
          }
        }
        doc.setFont("helvetica", "normal");
        y += fixedLh;
      }
    } else {
      const sigCenter = marginLeft + contentWidth * 0.75;
      const sigW = contentWidth * 0.45;

      for (const rawLine of sigLines) {
        const line = rawLine.trim();
        if (!line) { y += fixedLh * 0.3; continue; }

        const isName = /^\(.*\)$/.test(line);
        if (isName) {
          y += fixedLh * 2.5;
          doc.setFont("helvetica", "bold");
          doc.setFontSize(fixedFs);
          const w = doc.getTextWidth(line);
          doc.text(line, sigCenter - w / 2, y);
          doc.setLineWidth(0.3);
          doc.line(sigCenter - w / 2, y + 1, sigCenter + w / 2, y + 1);
          doc.setFont("helvetica", "normal");
          y += fixedLh;
          continue;
        }

        doc.setFont("helvetica", "normal");
        doc.setFontSize(fixedFs);
        const tw = doc.getTextWidth(line);
        if (tw <= sigW) {
          doc.text(line, sigCenter - tw / 2, y);
        } else {
          const wrapped = doc.splitTextToSize(line, sigW);
          for (const wl of wrapped) {
            doc.text(wl, sigCenter - sigW / 2, y);
            y += fixedLh;
          }
          continue;
        }
        y += fixedLh;
      }
    }
  }

  const safeName = fileName || `${jenisSurat.replace(/\s+/g, "_")}${nomorSurat ? "_" + nomorSurat.replace(/\//g, "-") : ""}`;
  doc.save(`${safeName}.pdf`);
}

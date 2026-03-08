import { jsPDF } from "jspdf";
import logoImg from "@assets/Untitled_design_(24)_1772993886433.png";

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
  if (!/\s*:/.test(trimmed)) return false;
  const colonIdx = trimmed.indexOf(":");
  const label = trimmed.substring(0, colonIdx).trim();
  if (label.length < 2 || label.length > 30) return false;
  const biodataLabels = [
    /^nama/i, /^nik/i, /^tempat/i, /^tanggal\s*lahir/i, /^alamat/i,
    /^rt/i, /^rw/i, /^kelurahan/i, /^kecamatan/i, /^kota/i, /^kabupaten/i,
    /^agama/i, /^pekerjaan/i, /^jenis\s*kelamin/i, /^status/i, /^no\.?\s*(kk|telp|hp)/i,
    /^kewarganegaraan/i, /^golongan\s*darah/i, /^pendidikan/i, /^hubungan/i,
    /^jabatan/i, /^nomor/i, /^perihal/i, /^lampiran/i, /^sifat/i, /^hal\b/i,
    /^hari/i, /^waktu/i, /^acara/i, /^tempat/i,
  ];
  return biodataLabels.some(r => r.test(label));
}

function splitTwoColumns(line: string): { left: string; right: string } | null {
  if (line.includes("|")) {
    const parts = line.split("|");
    return { left: (parts[0] || "").trim(), right: (parts[1] || "").trim() };
  }
  const match = line.match(/^(.+?)\s{6,}(.+)$/);
  if (match) {
    return { left: match[1].trim(), right: match[2].trim() };
  }
  return null;
}

function isSignatureSection(lines: string[], startIdx: number): boolean {
  const triggers = [
    /^(hormat\s+kami|mengetahui|yang\s+bertanda\s+tangan|tertanda|di\s*ketahui|yang\s+membuat)/i,
    /^ketua\s+(rt|rw)/i,
    /^(cimahi|bandung|jakarta),?\s+\d/i,
  ];
  const line = lines[startIdx].trim();
  if (triggers.some(r => r.test(line))) return true;

  const split = splitTwoColumns(lines[startIdx]);
  if (split && triggers.some(r => r.test(split.left) || r.test(split.right))) return true;

  const remaining = lines.slice(startIdx);
  const hasSignerName = remaining.some(l => {
    const t = l.trim();
    if (/^\(.*\)$/.test(t)) return true;
    const s = splitTwoColumns(l);
    if (s && /^\(.*\)$/.test(s.left) && /^\(.*\)$/.test(s.right)) return true;
    return false;
  });
  const hasKetuaRef = remaining.some(l => {
    const t = l.trim();
    if (/ketua\s+(rt|rw)/i.test(t)) return true;
    const s = splitTwoColumns(l);
    if (s && (/ketua/i.test(s.left) || /ketua/i.test(s.right))) return true;
    return false;
  });
  if (hasSignerName && hasKetuaRef && remaining.length <= 20) return true;

  return false;
}

function hasTwoColumnSignature(sigLines: string[]): boolean {
  let twoColCount = 0;
  for (const l of sigLines) {
    const trimmed = l.trim();
    if (!trimmed) continue;
    const split = splitTwoColumns(l);
    if (split && split.left && split.right) twoColCount++;
  }
  return twoColCount >= 2;
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
  const marginLeft = 25;
  const marginRight = 25;
  const contentWidth = pageWidth - marginLeft - marginRight;
  const pageHeight = 297;
  const bottomMargin = 20;
  const lineHeight = 5.5;

  let img: HTMLImageElement | null = null;
  try {
    img = await loadImage(logoImg);
  } catch {}

  const drawKop = () => {
    if (img) {
      doc.addImage(img, "PNG", marginLeft, 12, 18, 18);
    }
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
    doc.text("Jln. K.H. Usman Dhomiri, Kel. Padasuka, Kec. Cimahi Tengah, Kota Cimahi 40526", pageWidth / 2, 31, { align: "center" });
    doc.setLineWidth(0.8);
    doc.line(marginLeft, 34, pageWidth - marginRight, 34);
    doc.setLineWidth(0.3);
    doc.line(marginLeft, 35, pageWidth - marginRight, 35);
  };

  drawKop();
  let y = 42;

  const ensureSpace = (needed: number) => {
    if (y + needed > pageHeight - bottomMargin) {
      doc.addPage();
      drawKop();
      y = 42;
    }
  };

  const printText = (text: string, opts?: { bold?: boolean; center?: boolean; fontSize?: number; underline?: boolean }) => {
    const fontSize = opts?.fontSize || 11;
    doc.setFontSize(fontSize);
    doc.setFont("helvetica", opts?.bold ? "bold" : "normal");

    if (opts?.center) {
      ensureSpace(lineHeight);
      doc.text(text, pageWidth / 2, y, { align: "center" });
      if (opts?.underline) {
        const tw = doc.getTextWidth(text);
        doc.setLineWidth(0.3);
        doc.line(pageWidth / 2 - tw / 2, y + 1, pageWidth / 2 + tw / 2, y + 1);
      }
      y += lineHeight;
    } else {
      const wrapped = doc.splitTextToSize(text, contentWidth);
      for (const wl of wrapped) {
        ensureSpace(lineHeight);
        doc.text(wl, marginLeft, y);
        y += lineHeight;
      }
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
  };

  const colonPos = 45;

  const printBiodataLine = (line: string) => {
    const colonIdx = line.indexOf(":");
    const label = line.substring(0, colonIdx).trim();
    const value = line.substring(colonIdx + 1).trim();

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");

    const colonX = marginLeft + colonPos;
    ensureSpace(lineHeight);
    doc.text(label, marginLeft, y);
    doc.text(":", colonX, y);

    const valueX = colonX + 3;
    const valueMaxW = contentWidth - (valueX - marginLeft);
    const wrapped = doc.splitTextToSize(value, valueMaxW);
    for (let j = 0; j < wrapped.length; j++) {
      if (j > 0) ensureSpace(lineHeight);
      doc.text(wrapped[j], valueX, y);
      y += lineHeight;
    }
  };

  const printTwoColumnSignature = (sigLines: string[]) => {
    const leftLines: string[] = [];
    const rightLines: string[] = [];

    for (const rawLine of sigLines) {
      const trimmed = rawLine.trim();
      if (!trimmed) {
        leftLines.push("");
        rightLines.push("");
        continue;
      }
      const split = splitTwoColumns(rawLine);
      if (split && split.left && split.right) {
        leftLines.push(split.left);
        rightLines.push(split.right);
      } else if (split && split.left && !split.right) {
        leftLines.push(split.left);
        rightLines.push("");
      } else {
        leftLines.push(trimmed);
        rightLines.push("");
      }
    }

    const colWidth = contentWidth / 2;
    const leftX = marginLeft;
    const rightX = marginLeft + colWidth;
    const maxLines = Math.max(leftLines.length, rightLines.length);
    ensureSpace(maxLines * lineHeight + lineHeight * 3);

    for (let i = 0; i < maxLines; i++) {
      const left = leftLines[i] || "";
      const right = rightLines[i] || "";

      if (!left && !right) {
        y += lineHeight;
        continue;
      }

      const leftIsName = /^\(.*\)$/.test(left);
      const rightIsName = /^\(.*\)$/.test(right);

      if (leftIsName || rightIsName) {
        const prevLeft = i > 0 ? leftLines[i - 1] : "";
        const prevRight = i > 0 ? rightLines[i - 1] : "";
        if (!prevLeft && !prevRight) {
          y += lineHeight * 2;
        }
      }

      ensureSpace(lineHeight);
      doc.setFontSize(11);

      if (left) {
        doc.setFont("helvetica", leftIsName ? "bold" : "normal");
        doc.text(left, leftX, y);
        if (leftIsName) {
          const w = doc.getTextWidth(left);
          doc.setLineWidth(0.3);
          doc.line(leftX, y + 1, leftX + w, y + 1);
        }
      }
      if (right) {
        doc.setFont("helvetica", rightIsName ? "bold" : "normal");
        doc.text(right, rightX, y);
        if (rightIsName) {
          const w = doc.getTextWidth(right);
          doc.setLineWidth(0.3);
          doc.line(rightX, y + 1, rightX + w, y + 1);
        }
      }

      doc.setFont("helvetica", "normal");
      y += lineHeight;
    }
  };

  const printVerticalSignature = (sigLines: string[]) => {
    const sigX = pageWidth / 2 + 5;
    const sigWidth = pageWidth - marginRight - sigX;

    for (let i = 0; i < sigLines.length; i++) {
      const line = sigLines[i].trim();
      if (!line) {
        y += lineHeight * 0.5;
        continue;
      }

      const isName = /^\(.*\)$/.test(line);
      const isDate = /^(cimahi|bandung|jakarta),?\s+\d/i.test(line);

      if (isDate) {
        ensureSpace(lineHeight);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(11);
        doc.text(line, sigX, y);
        y += lineHeight * 1.5;
        continue;
      }

      if (isName) {
        y += lineHeight * 3;
        ensureSpace(lineHeight);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.text(line, sigX, y);
        const nameWidth = doc.getTextWidth(line);
        doc.setLineWidth(0.3);
        doc.line(sigX, y + 1, sigX + nameWidth, y + 1);
        doc.setFont("helvetica", "normal");
        y += lineHeight * 1.5;
        continue;
      }

      ensureSpace(lineHeight);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      const wrapped = doc.splitTextToSize(line, sigWidth);
      for (const wl of wrapped) {
        doc.text(wl, sigX, y);
        y += lineHeight;
      }
    }
  };

  let processedText = cleanText(isiSurat);
  processedText = processedText.replace(/^Nomor\s*:.*$/m, "").trim();
  const allLines = processedText.split("\n");

  let signatureStartIdx = -1;
  for (let i = allLines.length - 1; i >= Math.max(0, allLines.length - 25); i--) {
    if (isSignatureSection(allLines, i)) {
      signatureStartIdx = i;
    }
  }

  const bodyLines = signatureStartIdx >= 0 ? allLines.slice(0, signatureStartIdx) : allLines;
  const sigLines = signatureStartIdx >= 0 ? allLines.slice(signatureStartIdx) : [];

  let hasTitle = false;
  for (let i = 0; i < Math.min(bodyLines.length, 6); i++) {
    if (/^(SURAT KETERANGAN|SURAT PENGANTAR|SURAT UNDANGAN|SURAT PERNYATAAN|SURAT TUGAS)/i.test(bodyLines[i].trim())) {
      hasTitle = true;
      break;
    }
  }

  if (nomorSurat && !hasTitle) {
    printBiodataLine(`Nomor : ${nomorSurat}`);
  }

  let nomorPrintedUnderTitle = false;
  let inBiodataBlock = false;
  let prevWasBiodata = false;

  for (let i = 0; i < bodyLines.length; i++) {
    const rawLine = bodyLines[i];
    const trimmed = rawLine.trim();

    if (trimmed === "") {
      if (inBiodataBlock) inBiodataBlock = false;
      prevWasBiodata = false;
      y += lineHeight * 0.6;
      continue;
    }

    const isTitleLine = /^(SURAT KETERANGAN|SURAT PENGANTAR|SURAT UNDANGAN|SURAT PERNYATAAN|SURAT TUGAS)/i.test(trimmed);
    if (isTitleLine) {
      inBiodataBlock = false;
      prevWasBiodata = false;
      y += lineHeight * 0.3;
      printText(trimmed, { bold: true, center: true, fontSize: 13, underline: true });
      if (nomorSurat && !nomorPrintedUnderTitle) {
        printText(`Nomor: ${nomorSurat}`, { center: true, fontSize: 11 });
        nomorPrintedUnderTitle = true;
      }
      y += lineHeight * 0.3;
      continue;
    }

    if (prevWasBiodata && /^\s{5,}/.test(rawLine) && !isBiodataLine(rawLine)) {
      const contX = marginLeft + colonPos + 3;
      const contMaxW = contentWidth - (contX - marginLeft);
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      const wrapped = doc.splitTextToSize(trimmed, contMaxW);
      for (const wl of wrapped) {
        ensureSpace(lineHeight);
        doc.text(wl, contX, y);
        y += lineHeight;
      }
      continue;
    }

    if (isBiodataLine(rawLine)) {
      inBiodataBlock = true;
      prevWasBiodata = true;
      printBiodataLine(rawLine);
      continue;
    }

    if (inBiodataBlock && !isBiodataLine(rawLine)) {
      inBiodataBlock = false;
    }
    prevWasBiodata = false;

    printText(trimmed);
  }

  if (sigLines.length > 0) {
    y += lineHeight;

    const dateLineIdx = sigLines.findIndex(l => /^(cimahi|bandung|jakarta),?\s+\d/i.test(l.trim()));
    if (dateLineIdx >= 0) {
      const dateLine = sigLines[dateLineIdx].trim();
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      ensureSpace(lineHeight);
      doc.text(dateLine, pageWidth - marginRight, y, { align: "right" });
      y += lineHeight * 1.2;
      sigLines.splice(dateLineIdx, 1);
    }

    if (hasTwoColumnSignature(sigLines)) {
      printTwoColumnSignature(sigLines);
    } else {
      printVerticalSignature(sigLines);
    }
  }

  const safeName = fileName || `${jenisSurat.replace(/\s+/g, "_")}${nomorSurat ? "_" + nomorSurat.replace(/\//g, "-") : ""}`;
  doc.save(`${safeName}.pdf`);
}

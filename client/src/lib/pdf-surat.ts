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
    /^jabatan/i,
  ];
  return biodataLabels.some(r => r.test(label));
}

function isHeaderBiodataLine(line: string): boolean {
  const trimmed = line.trim();
  if (!/\s*:/.test(trimmed)) return false;
  const colonIdx = trimmed.indexOf(":");
  const label = trimmed.substring(0, colonIdx).trim();
  return /^(nomor|perihal|lampiran|sifat|hal)\s*/i.test(label);
}

function isContinuationLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  if (/^\s{5,}/.test(line) && !isBiodataLine(trimmed) && !isHeaderBiodataLine(trimmed)) return true;
  return false;
}

function isSignatureSection(lines: string[], startIdx: number): boolean {
  const triggers = [
    /^(hormat\s+kami|mengetahui|yang\s+bertanda\s+tangan|tertanda|di\s*ketahui|yang\s+membuat)/i,
    /^ketua\s+(rt|rw)/i,
    /^(cimahi|bandung|jakarta),?\s+\d/i,
  ];
  const line = lines[startIdx].trim();
  if (triggers.some(r => r.test(line))) return true;
  if (line.includes("|") && /ketua|mengetahui|hormat/i.test(line)) return true;

  const remaining = lines.slice(startIdx);
  const hasSignerName = remaining.some(l => /^\(.*\)$/.test(l.trim()) || /\(.*\)\s*\|\s*\(.*\)/.test(l.trim()));
  const hasKetuaRef = remaining.some(l => /ketua\s+(rt|rw)/i.test(l.trim()));
  if (hasSignerName && hasKetuaRef && remaining.length <= 20) return true;

  return false;
}

function hasTwoColumnSignature(sigLines: string[]): boolean {
  return sigLines.some(l => l.includes("|") && /ketua|mengetahui|hormat|tertanda|\(.*\)/i.test(l));
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
  const bottomMargin = 25;
  const lineHeight = 6;

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

  const printCentered = (text: string, opts?: { bold?: boolean; fontSize?: number; underline?: boolean }) => {
    const fontSize = opts?.fontSize || 11;
    doc.setFontSize(fontSize);
    doc.setFont("helvetica", opts?.bold ? "bold" : "normal");
    ensureSpace(lineHeight);
    doc.text(text, pageWidth / 2, y, { align: "center" });
    if (opts?.underline) {
      const tw = doc.getTextWidth(text);
      doc.setLineWidth(0.3);
      doc.line(pageWidth / 2 - tw / 2, y + 1, pageWidth / 2 + tw / 2, y + 1);
    }
    y += lineHeight;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
  };

  const printRightAligned = (text: string, opts?: { bold?: boolean }) => {
    doc.setFontSize(11);
    doc.setFont("helvetica", opts?.bold ? "bold" : "normal");
    ensureSpace(lineHeight);
    doc.text(text, pageWidth - marginRight, y, { align: "right" });
    y += lineHeight;
    doc.setFont("helvetica", "normal");
  };

  const printLine = (text: string, opts?: { bold?: boolean; fontSize?: number; indent?: number }) => {
    const fontSize = opts?.fontSize || 11;
    doc.setFontSize(fontSize);
    doc.setFont("helvetica", opts?.bold ? "bold" : "normal");
    const xPos = opts?.indent ? marginLeft + opts.indent : marginLeft;
    const maxW = contentWidth - (opts?.indent || 0);

    const wrapped = doc.splitTextToSize(text, maxW);
    for (const wl of wrapped) {
      ensureSpace(lineHeight);
      doc.text(wl, xPos, y);
      y += lineHeight;
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
  };

  const printJustified = (text: string) => {
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    const wrapped: string[] = doc.splitTextToSize(text, contentWidth);
    for (let wi = 0; wi < wrapped.length; wi++) {
      ensureSpace(lineHeight);
      if (wi < wrapped.length - 1 && wrapped[wi].trim().length > 20) {
        const words = wrapped[wi].trim().split(/\s+/);
        if (words.length > 1) {
          const totalWordWidth = words.reduce((sum, w) => sum + doc.getTextWidth(w), 0);
          const totalSpace = contentWidth - totalWordWidth;
          const spacePerGap = totalSpace / (words.length - 1);
          let xCursor = marginLeft;
          for (let j = 0; j < words.length; j++) {
            doc.text(words[j], xCursor, y);
            xCursor += doc.getTextWidth(words[j]) + spacePerGap;
          }
        } else {
          doc.text(wrapped[wi], marginLeft, y);
        }
      } else {
        doc.text(wrapped[wi], marginLeft, y);
      }
      y += lineHeight;
    }
  };

  const printBiodataLine = (line: string, colonPos: number) => {
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
      if (j > 0) {
        ensureSpace(lineHeight);
      }
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

      if (trimmed.includes("|")) {
        const parts = trimmed.split("|");
        leftLines.push((parts[0] || "").trim());
        rightLines.push((parts[1] || "").trim());
      } else {
        leftLines.push(trimmed);
        rightLines.push("");
      }
    }

    const colWidth = contentWidth / 2 - 5;
    const leftX = marginLeft + 5;
    const rightX = marginLeft + contentWidth / 2 + 5;

    const maxLines = Math.max(leftLines.length, rightLines.length);
    const totalNeeded = maxLines * lineHeight + lineHeight * 4;
    ensureSpace(totalNeeded);

    for (let i = 0; i < maxLines; i++) {
      const left = leftLines[i] || "";
      const right = rightLines[i] || "";

      if (!left && !right) {
        y += lineHeight;
        continue;
      }

      const leftIsName = /^\(.*\)$/.test(left);
      const rightIsName = /^\(.*\)$/.test(right);

      ensureSpace(lineHeight);
      doc.setFontSize(11);

      if (left) {
        doc.setFont("helvetica", leftIsName ? "bold" : "normal");
        const leftWrapped = doc.splitTextToSize(left, colWidth);
        doc.text(leftWrapped[0], leftX, y);
        if (leftIsName) {
          const w = doc.getTextWidth(leftWrapped[0]);
          doc.setLineWidth(0.3);
          doc.line(leftX, y + 1, leftX + w, y + 1);
        }
      }

      if (right) {
        doc.setFont("helvetica", rightIsName ? "bold" : "normal");
        const rightWrapped = doc.splitTextToSize(right, colWidth);
        doc.text(rightWrapped[0], rightX, y);
        if (rightIsName) {
          const w = doc.getTextWidth(rightWrapped[0]);
          doc.setLineWidth(0.3);
          doc.line(rightX, y + 1, rightX + w, y + 1);
        }
      }

      doc.setFont("helvetica", "normal");
      y += lineHeight;
    }
  };

  const printVerticalSignature = (sigLines: string[]) => {
    const rightBlockX = pageWidth / 2 + 10;
    const blockWidth = pageWidth - marginRight - rightBlockX;

    for (let i = 0; i < sigLines.length; i++) {
      const line = sigLines[i].trim();
      if (!line) {
        y += lineHeight * 0.5;
        continue;
      }

      const isName = /^\(.*\)$/.test(line);
      const isDate = /^(cimahi|bandung|jakarta),?\s+\d/i.test(line);
      const isClosing = /^(hormat\s+kami|mengetahui|tertanda|yang\s+bertanda|di\s*ketahui|yang\s+membuat)/i.test(line);
      const isPosition = /^(ketua\s+(rt|rw)|kelurahan|kecamatan|sekretaris)/i.test(line);

      if (isDate) {
        ensureSpace(lineHeight);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(11);
        doc.text(line, rightBlockX, y);
        y += lineHeight * 1.5;
        continue;
      }

      if (isClosing) {
        ensureSpace(lineHeight);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(11);
        doc.text(line, rightBlockX, y);
        y += lineHeight;
        continue;
      }

      if (isPosition) {
        ensureSpace(lineHeight);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(11);
        doc.text(line, rightBlockX, y);
        y += lineHeight;
        continue;
      }

      if (isName) {
        y += lineHeight * 3;
        ensureSpace(lineHeight);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.text(line, rightBlockX, y);
        const nameWidth = doc.getTextWidth(line);
        doc.setLineWidth(0.3);
        doc.line(rightBlockX, y + 1, rightBlockX + nameWidth, y + 1);
        doc.setFont("helvetica", "normal");
        y += lineHeight * 1.5;
        continue;
      }

      ensureSpace(lineHeight);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      const wrapped = doc.splitTextToSize(line, blockWidth);
      for (const wl of wrapped) {
        doc.text(wl, rightBlockX, y);
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
  let nomorPrinted = false;
  let biodataColonPos = 45;

  for (let i = 0; i < Math.min(bodyLines.length, 8); i++) {
    const trimmed = bodyLines[i].trim();
    if (/^(SURAT KETERANGAN|SURAT PENGANTAR|SURAT UNDANGAN|SURAT PERNYATAAN|SURAT TUGAS)/i.test(trimmed)) {
      hasTitle = true;
      break;
    }
  }

  if (nomorSurat && !hasTitle) {
    y += lineHeight * 0.3;
    printCentered(`Nomor: ${nomorSurat}`, { fontSize: 11 });
    y += lineHeight * 0.3;
    nomorPrinted = true;
  }

  let inBiodataBlock = false;
  let headersDone = false;

  for (let i = 0; i < bodyLines.length; i++) {
    const rawLine = bodyLines[i];
    const trimmed = rawLine.trim();

    if (trimmed === "") {
      if (inBiodataBlock) inBiodataBlock = false;
      y += lineHeight * 0.5;
      continue;
    }

    const isTitleLine = /^(SURAT KETERANGAN|SURAT PENGANTAR|SURAT UNDANGAN|SURAT PERNYATAAN|SURAT TUGAS)/i.test(trimmed);
    if (isTitleLine) {
      inBiodataBlock = false;
      y += lineHeight * 0.3;
      printCentered(trimmed, { bold: true, fontSize: 13, underline: true });
      if (nomorSurat && !nomorPrinted) {
        y += lineHeight * 0.2;
        printCentered(`Nomor: ${nomorSurat}`, { fontSize: 11 });
        nomorPrinted = true;
      }
      y += lineHeight * 0.5;
      continue;
    }

    if (isHeaderBiodataLine(rawLine) && !headersDone && i < 10) {
      if (/^nomor/i.test(trimmed) && nomorSurat) {
        printBiodataLine(`Nomor : ${nomorSurat}`, 20);
        nomorPrinted = true;
      } else {
        printBiodataLine(rawLine, 20);
      }
      continue;
    }

    if (!isHeaderBiodataLine(rawLine) && !headersDone && i > 0) {
      headersDone = true;
    }

    if (isContinuationLine(rawLine) && inBiodataBlock) {
      const contX = marginLeft + biodataColonPos + 3;
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
      printBiodataLine(rawLine, biodataColonPos);
      continue;
    }

    if (inBiodataBlock && !isBiodataLine(rawLine)) {
      inBiodataBlock = false;
    }

    if (trimmed.length > 40) {
      printJustified(trimmed);
    } else {
      printLine(trimmed);
    }
  }

  if (sigLines.length > 0) {
    y += lineHeight * 0.5;

    if (hasTwoColumnSignature(sigLines)) {
      printTwoColumnSignature(sigLines);
    } else {
      printVerticalSignature(sigLines);
    }
  }

  const safeName = fileName || `${jenisSurat.replace(/\s+/g, "_")}${nomorSurat ? "_" + nomorSurat.replace(/\//g, "-") : ""}`;
  doc.save(`${safeName}.pdf`);
}

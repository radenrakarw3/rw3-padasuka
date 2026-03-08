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
  if (label.length < 2 || label.length > 35) return false;
  const biodataLabels = [
    /^nama/i, /^nik/i, /^tempat/i, /^tanggal\s*lahir/i, /^alamat/i,
    /^rt/i, /^rw/i, /^kelurahan/i, /^kecamatan/i, /^kota/i, /^kabupaten/i,
    /^agama/i, /^pekerjaan/i, /^jenis\s*kelamin/i, /^status/i, /^no\.?\s*(kk|telp|hp)/i,
    /^kewarganegaraan/i, /^golongan\s*darah/i, /^pendidikan/i, /^hubungan/i,
    /^jabatan/i, /^nomor/i, /^perihal/i, /^lampiran/i, /^sifat/i, /^hal\b/i,
    /^hari/i, /^waktu/i, /^acara/i, /^tempat/i, /^rt\s*\/\s*rw/i,
    /^no\.\s*kk\s*\/\s*nik/i,
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
    /^(kota\s+)?(cimahi|bandung|jakarta),?\s+\d/i,
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
    if (s && (/^\(.*\)$/.test(s.left) || /^\(.*\)$/.test(s.right))) return true;
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

interface ParsedContent {
  bodyLines: string[];
  sigLines: string[];
  hasTitle: boolean;
  dateLine: string | null;
  isTwoColSig: boolean;
}

function parseContent(isiSurat: string): ParsedContent {
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

  let dateLine: string | null = null;
  const dateIdx = sigLines.findIndex(l => /^(kota\s+)?(cimahi|bandung|jakarta),?\s+\d/i.test(l.trim()));
  if (dateIdx >= 0) {
    dateLine = sigLines[dateIdx].trim();
    sigLines.splice(dateIdx, 1);
  } else {
    for (let i = bodyLines.length - 1; i >= Math.max(0, bodyLines.length - 5); i--) {
      if (/^(kota\s+)?(cimahi|bandung|jakarta),?\s+\d/i.test(bodyLines[i].trim())) {
        dateLine = bodyLines[i].trim();
        bodyLines.splice(i, 1);
        break;
      }
    }
  }

  const isTwoColSig = hasTwoColumnSignature(sigLines);

  return { bodyLines, sigLines, hasTitle, dateLine, isTwoColSig };
}

function estimateHeight(doc: jsPDF, parsed: ParsedContent, nomorSurat: string | null | undefined, lh: number, fs: number, contentWidth: number, colonPos: number): number {
  let h = 0;

  if (nomorSurat && !parsed.hasTitle) {
    h += lh;
  }

  let prevWasBiodata = false;

  for (let i = 0; i < parsed.bodyLines.length; i++) {
    const rawLine = parsed.bodyLines[i];
    const trimmed = rawLine.trim();

    if (trimmed === "") {
      prevWasBiodata = false;
      h += lh * 0.4;
      continue;
    }

    const isTitleLine = /^(SURAT KETERANGAN|SURAT PENGANTAR|SURAT UNDANGAN|SURAT PERNYATAAN|SURAT TUGAS)/i.test(trimmed);
    if (isTitleLine) {
      prevWasBiodata = false;
      h += lh * 0.3;
      h += lh;
      if (nomorSurat) h += lh;
      h += lh * 0.3;
      continue;
    }

    if (prevWasBiodata && /^\s{5,}/.test(rawLine) && !isBiodataLine(rawLine)) {
      doc.setFontSize(fs);
      const contMaxW = contentWidth - (colonPos + 3);
      const wrapped = doc.splitTextToSize(trimmed, contMaxW);
      h += wrapped.length * lh;
      continue;
    }

    if (isBiodataLine(rawLine)) {
      prevWasBiodata = true;
      doc.setFontSize(fs);
      const colonIdx = rawLine.indexOf(":");
      const value = rawLine.substring(colonIdx + 1).trim();
      const valueMaxW = contentWidth - (colonPos + 3);
      const wrapped = doc.splitTextToSize(value, valueMaxW);
      h += Math.max(1, wrapped.length) * lh;
      continue;
    }

    prevWasBiodata = false;
    doc.setFontSize(fs);
    const wrapped = doc.splitTextToSize(trimmed, contentWidth);
    h += wrapped.length * lh;
  }

  if (parsed.dateLine) {
    h += lh * 1.5;
  }

  if (parsed.sigLines.length > 0) {
    if (parsed.isTwoColSig) {
      let nameLineCount = 0;
      let otherLineCount = 0;
      for (const l of parsed.sigLines) {
        const trimmed = l.trim();
        if (!trimmed) { otherLineCount++; continue; }
        const split = splitTwoColumns(l);
        const left = split ? split.left : trimmed;
        if (/^\(.*\)$/.test(left)) {
          nameLineCount++;
        } else {
          otherLineCount++;
        }
      }
      h += otherLineCount * lh;
      h += nameLineCount * (lh + lh * 2.5);
    } else {
      for (const l of parsed.sigLines) {
        const trimmed = l.trim();
        if (!trimmed) { h += lh * 0.3; continue; }
        if (/^\(.*\)$/.test(trimmed)) {
          h += lh * 3 + lh;
        } else {
          h += lh;
        }
      }
    }
  }

  return h;
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
  const marginRight = 20;
  const contentWidth = pageWidth - marginLeft - marginRight;
  const pageHeight = 297;
  const startY = 42;
  const bottomMargin = 15;
  const availableHeight = pageHeight - startY - bottomMargin;

  let img: HTMLImageElement | null = null;
  try {
    img = await loadImage(logoImg);
  } catch {}

  const parsed = parseContent(isiSurat);

  const baseFontSize = 10;
  const baseLineHeight = 4.8;
  const colonPos = 42;

  let estHeight = estimateHeight(doc, parsed, nomorSurat, baseLineHeight, baseFontSize, contentWidth, colonPos);
  let scale = 1;
  if (estHeight > availableHeight) {
    scale = availableHeight / estHeight;
    if (scale < 0.6) scale = 0.6;
  }

  const fontSize = Math.round(baseFontSize * scale * 10) / 10;
  const lineHeight = baseLineHeight * scale;
  const titleFontSize = Math.round(12 * scale * 10) / 10;

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
    doc.text("Sekretariat: Jln. K.H. Usman Dhomiri, Padasuka, Kota Cimahi, 40526", pageWidth / 2, 31, { align: "center" });
    doc.setLineWidth(0.8);
    doc.line(marginLeft, 34, pageWidth - marginRight, 34);
    doc.setLineWidth(0.3);
    doc.line(marginLeft, 35, pageWidth - marginRight, 35);
  };

  drawKop();
  let y = startY;

  const printText = (text: string, opts?: { bold?: boolean; center?: boolean; fs?: number; underline?: boolean; indent?: number }) => {
    const fs2 = opts?.fs || fontSize;
    doc.setFontSize(fs2);
    doc.setFont("helvetica", opts?.bold ? "bold" : "normal");

    if (opts?.center) {
      doc.text(text, pageWidth / 2, y, { align: "center" });
      if (opts?.underline) {
        const tw = doc.getTextWidth(text);
        doc.setLineWidth(0.3);
        doc.line(pageWidth / 2 - tw / 2, y + 1, pageWidth / 2 + tw / 2, y + 1);
      }
      y += lineHeight;
    } else {
      const xPos = marginLeft + (opts?.indent || 0);
      const maxW = contentWidth - (opts?.indent || 0);
      const wrapped = doc.splitTextToSize(text, maxW);
      for (const wl of wrapped) {
        doc.text(wl, xPos, y);
        y += lineHeight;
      }
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(fontSize);
  };

  const printBiodataLine = (line: string, indent: number = 0) => {
    const colonIdx = line.indexOf(":");
    const label = line.substring(0, colonIdx).trim();
    const value = line.substring(colonIdx + 1).trim();

    doc.setFontSize(fontSize);
    doc.setFont("helvetica", "normal");

    const baseX = marginLeft + indent;
    const colonX = baseX + colonPos;
    doc.text(label, baseX, y);
    doc.text(":", colonX, y);

    const valueX = colonX + 3;
    const valueMaxW = contentWidth - indent - colonPos - 3;
    const wrapped = doc.splitTextToSize(value, valueMaxW);
    for (let j = 0; j < wrapped.length; j++) {
      doc.text(wrapped[j], valueX, y);
      y += lineHeight;
    }
  };

  const printTwoColumnSignature = (sigLinesInput: string[]) => {
    const leftColCenter = marginLeft + contentWidth * 0.25;
    const rightColCenter = marginLeft + contentWidth * 0.75;
    const colWidth = contentWidth * 0.45;

    for (let i = 0; i < sigLinesInput.length; i++) {
      const rawLine = sigLinesInput[i];
      const trimmed = rawLine.trim();
      if (!trimmed) {
        y += lineHeight;
        continue;
      }

      const split = splitTwoColumns(rawLine);
      const left = split ? split.left : trimmed;
      const right = split ? split.right : "";

      const leftIsName = /^\(.*\)$/.test(left);
      const rightIsName = /^\(.*\)$/.test(right);

      if (leftIsName || rightIsName) {
        y += lineHeight * 2.5;
      }

      doc.setFontSize(fontSize);

      if (left) {
        doc.setFont("helvetica", leftIsName ? "bold" : "normal");
        const lw = doc.getTextWidth(left);
        doc.text(left, leftColCenter - lw / 2, y);
        if (leftIsName) {
          doc.setLineWidth(0.3);
          doc.line(leftColCenter - lw / 2, y + 1, leftColCenter + lw / 2, y + 1);
        }
      }
      if (right) {
        doc.setFont("helvetica", rightIsName ? "bold" : "normal");
        const rw = doc.getTextWidth(right);
        doc.text(right, rightColCenter - rw / 2, y);
        if (rightIsName) {
          doc.setLineWidth(0.3);
          doc.line(rightColCenter - rw / 2, y + 1, rightColCenter + rw / 2, y + 1);
        }
      }

      doc.setFont("helvetica", "normal");
      y += lineHeight;
    }
  };

  const printVerticalSignature = (sigLinesInput: string[]) => {
    const sigCenterX = marginLeft + contentWidth * 0.75;
    const sigWidth = contentWidth * 0.45;

    for (let i = 0; i < sigLinesInput.length; i++) {
      const line = sigLinesInput[i].trim();
      if (!line) {
        y += lineHeight * 0.3;
        continue;
      }

      const isName = /^\(.*\)$/.test(line);

      if (isName) {
        y += lineHeight * 2.5;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(fontSize);
        const nw = doc.getTextWidth(line);
        doc.text(line, sigCenterX - nw / 2, y);
        doc.setLineWidth(0.3);
        doc.line(sigCenterX - nw / 2, y + 1, sigCenterX + nw / 2, y + 1);
        doc.setFont("helvetica", "normal");
        y += lineHeight;
        continue;
      }

      doc.setFont("helvetica", "normal");
      doc.setFontSize(fontSize);
      const tw = doc.getTextWidth(line);
      if (tw < sigWidth) {
        doc.text(line, sigCenterX - tw / 2, y);
      } else {
        const wrapped = doc.splitTextToSize(line, sigWidth);
        for (const wl of wrapped) {
          doc.text(wl, sigCenterX - sigWidth / 2, y);
          y += lineHeight;
        }
        continue;
      }
      y += lineHeight;
    }
  };

  if (nomorSurat && !parsed.hasTitle) {
    printBiodataLine(`Nomor : ${nomorSurat}`);
  }

  let nomorPrintedUnderTitle = false;
  let inBiodataBlock = false;
  let prevWasBiodata = false;
  const bioIndent = 5;

  for (let i = 0; i < parsed.bodyLines.length; i++) {
    const rawLine = parsed.bodyLines[i];
    const trimmed = rawLine.trim();

    if (trimmed === "") {
      if (inBiodataBlock) inBiodataBlock = false;
      prevWasBiodata = false;
      y += lineHeight * 0.4;
      continue;
    }

    const isTitleLine = /^(SURAT KETERANGAN|SURAT PENGANTAR|SURAT UNDANGAN|SURAT PERNYATAAN|SURAT TUGAS)/i.test(trimmed);
    if (isTitleLine) {
      inBiodataBlock = false;
      prevWasBiodata = false;
      y += lineHeight * 0.3;
      const spaced = trimmed.split("").join(" ").replace(/\s{3,}/g, "   ");
      printText(spaced, { bold: true, center: true, fs: titleFontSize });
      if (nomorSurat && !nomorPrintedUnderTitle) {
        printText(`Nomor: ${nomorSurat}`, { center: true, fs: fontSize });
        nomorPrintedUnderTitle = true;
      }
      y += lineHeight * 0.3;
      continue;
    }

    if (prevWasBiodata && /^\s{5,}/.test(rawLine) && !isBiodataLine(rawLine)) {
      const contX = marginLeft + bioIndent + colonPos + 3;
      const contMaxW = contentWidth - bioIndent - colonPos - 3;
      doc.setFontSize(fontSize);
      doc.setFont("helvetica", "normal");
      const wrapped = doc.splitTextToSize(trimmed, contMaxW);
      for (const wl of wrapped) {
        doc.text(wl, contX, y);
        y += lineHeight;
      }
      continue;
    }

    if (isBiodataLine(rawLine)) {
      inBiodataBlock = true;
      prevWasBiodata = true;
      printBiodataLine(rawLine, bioIndent);
      continue;
    }

    if (inBiodataBlock && !isBiodataLine(rawLine)) {
      inBiodataBlock = false;
    }
    prevWasBiodata = false;

    printText(trimmed);
  }

  if (parsed.dateLine || parsed.sigLines.length > 0) {
    y += lineHeight * 0.5;
  }

  if (parsed.dateLine) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(fontSize);
    doc.text(parsed.dateLine, pageWidth - marginRight, y, { align: "right" });
    y += lineHeight * 1.2;
  }

  if (parsed.sigLines.length > 0) {
    if (parsed.isTwoColSig) {
      printTwoColumnSignature(parsed.sigLines);
    } else {
      printVerticalSignature(parsed.sigLines);
    }
  }

  const safeName = fileName || `${jenisSurat.replace(/\s+/g, "_")}${nomorSurat ? "_" + nomorSurat.replace(/\//g, "-") : ""}`;
  doc.save(`${safeName}.pdf`);
}

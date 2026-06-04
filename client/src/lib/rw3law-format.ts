/** Memecah teks peraturan menjadi blok seperti dokumen pengadilan (pasal / ayat). */

export type Rw3lawBlock =
  | { type: "whereas"; text: string }
  | { type: "article"; label: string; title?: string }
  | { type: "provision"; label: string; text: string }
  | { type: "paragraph"; text: string };

const ARTICLE_RE =
  /^(?:ARTICLE|ARTIKEL|BAB|CHAPTER|BAGIAN)\s+([IVXLC\d]+)(?:\s*[-–:]\s*(.+))?$/i;
const SECTION_RE = /^(?:SECTION|SEKSI|PASAL)\s+(\d+(?:\.\d+)?)(?:\s*[-–:]\s*(.+))?$/i;
const PROVISION_RE = /^(\d+(?:\.\d+)*)\s*[.)]\s+(.+)$/;
const ROMAN_PROVISION_RE = /^([IVXLC]+)\s*[.)]\s+(.+)$/i;

function isAllCapsHeading(line: string): boolean {
  const t = line.trim();
  return t.length >= 4 && t.length < 80 && t === t.toUpperCase() && /[A-Z]/.test(t) && !/^\d/.test(t);
}

export function parseRw3lawIsi(isi: string): Rw3lawBlock[] {
  const lines = isi.split(/\r?\n/).map((l) => l.trimEnd());
  const blocks: Rw3lawBlock[] = [];
  let paraBuf: string[] = [];

  const flushParagraph = () => {
    const text = paraBuf.join(" ").trim();
    if (text) blocks.push({ type: "paragraph", text });
    paraBuf = [];
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      flushParagraph();
      continue;
    }

    if (/^(?:WHEREAS|MENIMBANG)\b/i.test(line)) {
      flushParagraph();
      blocks.push({ type: "whereas", text: line });
      continue;
    }

    const article = line.match(ARTICLE_RE);
    if (article) {
      flushParagraph();
      blocks.push({
        type: "article",
        label: article[1].toUpperCase(),
        title: article[2]?.trim(),
      });
      continue;
    }

    const section = line.match(SECTION_RE);
    if (section) {
      flushParagraph();
      blocks.push({
        type: "article",
        label: `§ ${section[1]}`,
        title: section[2]?.trim(),
      });
      continue;
    }

    const prov = line.match(PROVISION_RE);
    if (prov) {
      flushParagraph();
      blocks.push({ type: "provision", label: prov[1], text: prov[2].trim() });
      continue;
    }

    const roman = line.match(ROMAN_PROVISION_RE);
    if (roman && roman[1].length <= 6) {
      flushParagraph();
      blocks.push({ type: "provision", label: roman[1], text: roman[2].trim() });
      continue;
    }

    if (isAllCapsHeading(line)) {
      flushParagraph();
      blocks.push({ type: "article", label: line, title: undefined });
      continue;
    }

    paraBuf.push(line);
  }
  flushParagraph();
  return blocks;
}

export function formatTanggalHukum(isoOrDate: string): string {
  try {
    const d = new Date(isoOrDate.includes("T") ? isoOrDate : `${isoOrDate}T12:00:00`);
    if (Number.isNaN(d.getTime())) return isoOrDate;
    return d.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return isoOrDate;
  }
}

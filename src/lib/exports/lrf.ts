/**
 * ОЖТФ (Оқушының Жетістігін Тіркейтін Форма) — Local Report Form.
 * Курстық жұмыс бекітілгеннен кейінгі ресми құжат форматы (NIS).
 *
 * Жиынтық форматы — толтыру өрістері Times New Roman, 12pt, мән жоғарыда
 * нақты, төменінде өріс атауы жұқа курсивпен. Мұғалімнің түсіндірмесі —
 * БМ1, БМ2, БМ3 бойынша балл санымен және буллет түсініктемемен.
 */

import {
  AlignmentType,
  Document,
  HeightRule,
  LevelFormat,
  Packer,
  Paragraph,
  TextRun,
} from "docx";

const FONT = "Times New Roman";

interface LrfInput {
  student_full_name: string;
  candidate_number: string;
  school_name: string;
  subject_component: string;
  exam_date: string;
  total_score: number;
  total_max: number;
  bm1_score: number;
  bm1_comments: string[];
  bm2_score: number;
  bm2_comments: string[];
  bm3_score: number;
  bm3_comments: string[];
  references_count: number | null;
  references_comment: string;
  teacher_full_name: string;
  teacher_signature_date: string;
}

function fieldValue(value: string) {
  return new Paragraph({
    spacing: { before: 80, after: 0, line: 240 },
    children: [
      new TextRun({ text: value || "", font: FONT, size: 24 }),
    ],
  });
}

function fieldLabel(label: string) {
  return new Paragraph({
    spacing: { before: 0, after: 160, line: 240 },
    children: [
      new TextRun({
        text: label,
        font: FONT,
        size: 20,
        bold: true,
        italics: true,
      }),
    ],
  });
}

function bmHeader(text: string) {
  return new Paragraph({
    spacing: { before: 160, after: 80, line: 280 },
    children: [
      new TextRun({ text, font: FONT, size: 24, bold: true }),
    ],
  });
}

function bulletPara(text: string) {
  return new Paragraph({
    numbering: { reference: "lrf-bullets", level: 0 },
    spacing: { before: 40, after: 40, line: 280 },
    alignment: AlignmentType.JUSTIFIED,
    children: [
      new TextRun({ text, font: FONT, size: 22 }),
    ],
  });
}

function emptySpacer() {
  return new Paragraph({ children: [new TextRun({ text: "" })] });
}

export async function buildLrfDocx(input: LrfInput): Promise<Buffer> {
  const children: Paragraph[] = [];

  // ─── Тақырып ───
  children.push(
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { after: 240 },
      children: [
        new TextRun({
          text: "ОЖТФ: Оқушының жетістігін тіркейтін форма",
          font: FONT,
          size: 28,
          bold: true,
        }),
      ],
    }),
  );

  // ─── Толтыру өрістері ───
  const fields: Array<[string, string]> = [
    [input.student_full_name, "Оқушының аты-жөні"],
    [input.candidate_number, "Кандидаттың нөмірі"],
    [input.school_name, "Мектеп атауы"],
    [input.subject_component, "Пән және компонент"],
    [input.exam_date, "Емтихан күні"],
    [`${input.total_score}`, "Берілген балл"],
  ];
  for (const [value, label] of fields) {
    children.push(fieldValue(value));
    children.push(fieldLabel(label));
  }

  // ─── Мұғалімнің түсіндірмесі ───
  children.push(emptySpacer());
  children.push(
    new Paragraph({
      spacing: { before: 80, after: 120 },
      children: [
        new TextRun({
          text: "Мұғалімнің түсіндірмесі",
          font: FONT,
          size: 22,
          bold: true,
          italics: true,
        }),
      ],
    }),
  );

  children.push(bmHeader(`БМ1 — ${input.bm1_score} балл`));
  for (const c of input.bm1_comments) {
    if (c.trim()) children.push(bulletPara(c.trim()));
  }

  children.push(bmHeader(`БМ2 — ${input.bm2_score} балл`));
  for (const c of input.bm2_comments) {
    if (c.trim()) children.push(bulletPara(c.trim()));
  }

  children.push(bmHeader(`БМ3 — ${input.bm3_score} балл`));
  for (const c of input.bm3_comments) {
    if (c.trim()) children.push(bulletPara(c.trim()));
  }
  if (input.references_count != null || input.references_comment) {
    const refText = [
      input.references_count != null
        ? `Қолданылған ақпарат көздері — ${input.references_count}.`
        : "",
      input.references_comment,
    ]
      .filter(Boolean)
      .join(" ");
    if (refText) children.push(bulletPara(refText));
  }

  // ─── Қол қою бөлімі ───
  for (let i = 0; i < 6; i += 1) children.push(emptySpacer());

  children.push(fieldValue(input.teacher_full_name));
  children.push(fieldLabel("Мұғалімнің аты-жөні"));

  children.push(fieldValue(""));
  children.push(fieldLabel("Мұғалімнің қолы"));

  children.push(fieldValue(input.teacher_signature_date));
  children.push(fieldLabel("Күні"));

  const doc = new Document({
    creator: "CourseCheck AI",
    title: `ОЖТФ — ${input.student_full_name}`,
    styles: {
      default: {
        document: { run: { font: FONT, size: 24 } },
      },
    },
    numbering: {
      config: [
        {
          reference: "lrf-bullets",
          levels: [
            {
              level: 0,
              format: LevelFormat.BULLET,
              text: "•",
              alignment: AlignmentType.LEFT,
              style: {
                paragraph: { indent: { left: 720, hanging: 360 } },
              },
            },
          ],
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838 }, // A4
            margin: {
              top: 1440,
              right: 1440,
              bottom: 1440,
              left: 1440,
            },
          },
        },
        children,
      },
    ],
  });

  void HeightRule; // re-export prevention for future custom rows
  return Packer.toBuffer(doc) as unknown as Promise<Buffer>;
}

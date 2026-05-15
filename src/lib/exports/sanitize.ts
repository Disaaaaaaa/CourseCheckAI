/**
 * Excel (ExcelJS), Word (docx-js) және жалпы XML қабылдамайтын Unicode
 * басқару таңбаларын тазалайды. Мұғалім бос форматта мәтін енгізсе (немесе
 * сыртқы көзден қойса), құрылымы көрінбейтін осындай таңбалар тұрғанда
 * экспорт үнсіз бұзылып қалуы мүмкін.
 *
 *  - U+0000..U+0008, U+000B, U+000C, U+000E..U+001F, U+007F..U+009F → жойылады
 *  - U+0009 (TAB) және U+000A (LF) сақталады
 *  - U+000D (CR) → U+000A (LF)
 *  - null / undefined → бос жол
 */
const CONTROL_CHARS_RE = new RegExp(
  "[\\u0000-\\u0008\\u000B\\u000C\\u000E-\\u001F\\u007F-\\u009F]",
  "g",
);

export function cleanText(value: unknown): string {
  if (value === null || value === undefined) return "";
  const raw = typeof value === "string" ? value : String(value);
  return raw.replace(/\r\n?/g, "\n").replace(CONTROL_CHARS_RE, "").trim();
}

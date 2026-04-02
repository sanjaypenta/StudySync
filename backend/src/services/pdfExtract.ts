import pdfParse from "pdf-parse";

export async function extractTextFromPdfBuffer(
  buffer: Buffer
): Promise<string> {
  const data = await pdfParse(buffer);
  return typeof data.text === "string" ? data.text.trim() : "";
}

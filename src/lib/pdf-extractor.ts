/**
 * PDF Metin Ayıklama Motoru (Server-Side)
 * pdfjs-dist legacy build ile tüm sayfaları eksiksiz, satır satır ayrıştırır.
 */

export async function extractTextFromPdfBuffer(uint8: Uint8Array): Promise<string> {
  // 1. Öncelikli Yöntem: pdfjs-dist/legacy (Node ortamında DOM / canvas bağımsız)
  try {
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const loadingTask = pdfjs.getDocument({
      data: uint8,
      useSystemFonts: true,
      disableFontFace: true,
      isEvalSupported: false,
    });

    const doc = await loadingTask.promise;
    let fullText = "";

    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      let pageText = "";
      for (const item of content.items as any[]) {
        pageText += item.str || "";
        if (item.hasEOL) {
          pageText += "\n";
        } else {
          pageText += " ";
        }
      }
      fullText += pageText + "\n";
    }

    if (fullText.trim().length > 0) {
      return fullText;
    }
  } catch (err: unknown) {
    console.warn("pdfjs-dist legacy failed, trying fallback:", (err as Error)?.message);
  }

  // 2. İkincil Yöntem: pdf-parse v2
  try {
    const pdfModule = await import("pdf-parse");
    const PDFParseClass = (pdfModule as any).PDFParse || (pdfModule as any).default?.PDFParse;
    if (typeof PDFParseClass === "function") {
      const parser = new PDFParseClass({ data: uint8, verbosity: 0 });
      const res = await parser.getText();
      const txt = (res?.text || "") as string;
      try {
        await parser.destroy();
      } catch {}
      if (txt.trim().length > 0) {
        return txt;
      }
    }
  } catch (err: unknown) {
    console.warn("pdf-parse fallback failed:", (err as Error)?.message);
  }

  // 3. Üçüncül Yöntem: Native Node.js zlib stream decode
  try {
    const zlib = await import("zlib");
    const buffer = Buffer.from(uint8.buffer, uint8.byteOffset, uint8.byteLength);
    let fullText = "";
    let pos = 0;
    while (pos < buffer.length) {
      const streamStart = buffer.indexOf("stream", pos);
      if (streamStart === -1) break;
      let dataStart = streamStart + 6;
      if (buffer[dataStart] === 0x0d && buffer[dataStart + 1] === 0x0a) {
        dataStart += 2;
      } else if (buffer[dataStart] === 0x0a || buffer[dataStart] === 0x0d) {
        dataStart += 1;
      }
      const streamEnd = buffer.indexOf("endstream", dataStart);
      if (streamEnd === -1) break;
      const streamData = buffer.subarray(dataStart, streamEnd);
      try {
        const decompressed = zlib.inflateSync(streamData);
        fullText += decompressed.toString("latin1") + "\n";
      } catch {}
      pos = streamEnd + 9;
    }
    if (fullText.trim().length > 0) {
      return fullText;
    }
  } catch {}

  return "";
}

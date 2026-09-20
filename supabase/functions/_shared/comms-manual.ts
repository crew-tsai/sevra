// The client's own crisis communications manual.
//
// Every workspace can upload one in Admin › Company. When it is there it is the
// authority for everything Sevra drafts — tone, who speaks, what must never be
// said, which statement goes out first — and generic best practice is only the
// fallback for what it does not cover. A client who wrote a manual and then got
// back textbook crisis copy would rightly ask what they were paying for.
//
// Extraction is cached on company_settings because a manual changes about once
// a year and a PDF costs seconds to parse, while a package is drafted per
// incident.

/** Enough of a manual to steer a package without swamping the prompt. */
const MAX_CHARS = 24_000;

/** Below this, whatever came out is not usable prose — a scanned PDF, say. */
const MIN_USEFUL_CHARS = 200;

export type CommsManual = {
  name: string | null;
  text: string;
  truncated: boolean;
};

export type ManualSettings = {
  comms_manual_url?: string | null;
  comms_manual_name?: string | null;
  comms_manual_text?: string | null;
  comms_manual_text_source?: string | null;
};

/** The object path inside the `manuals` bucket, for a stored signed or public URL. */
function storagePath(url: string): string | null {
  const m = url.match(/\/storage\/v1\/object\/(?:sign|public|authenticated)\/manuals\/([^?]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

async function pdfText(bytes: Uint8Array): Promise<string> {
  // Imported here rather than at module load so workspaces whose manual is a
  // text file never pay for it, and a resolution failure costs only the PDF.
  const { extractText, getDocumentProxy } = await import("https://esm.sh/unpdf@0.12");
  const pdf = await getDocumentProxy(bytes);
  const { text } = await extractText(pdf, { mergePages: true });
  return Array.isArray(text) ? text.join("\n") : text;
}

async function docxText(bytes: Uint8Array): Promise<string> {
  const JSZip = (await import("https://esm.sh/jszip@3.10.1")).default;
  const zip = await JSZip.loadAsync(bytes);
  const xml = await zip.file("word/document.xml")?.async("string");
  if (!xml) return "";
  return xml
    .replace(/<w:p[^>]*>/g, "\n")
    .replace(/<w:tab[^>]*\/>/g, "\t")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

async function extract(bytes: Uint8Array, hint: string): Promise<string> {
  const name = hint.toLowerCase();
  if (name.endsWith(".pdf")) return await pdfText(bytes);
  if (name.endsWith(".docx")) return await docxText(bytes);
  if (name.endsWith(".doc")) {
    // Word 97 binary. Not worth a parser; the upload control accepts it, so say
    // why it produced nothing instead of failing silently.
    throw new Error(".doc (Word 97) cannot be read — save it as PDF, .docx or .txt");
  }
  return new TextDecoder().decode(bytes);
}

/**
 * The manual as text, or null when there is none, it cannot be read, or what
 * came out is not prose. Callers fall back to industry standards on null.
 */
export async function loadCommsManual(
  admin: any,
  settings: ManualSettings | null | undefined,
): Promise<CommsManual | null> {
  const url = settings?.comms_manual_url;
  if (!url) return null;

  const name = settings?.comms_manual_name ?? null;
  const cap = (text: string): CommsManual => ({
    name,
    text: text.slice(0, MAX_CHARS),
    truncated: text.length > MAX_CHARS,
  });

  // Cached, and from this same file.
  if (settings?.comms_manual_text && settings.comms_manual_text_source === url) {
    return cap(settings.comms_manual_text);
  }

  try {
    let bytes: Uint8Array | null = null;
    const path = storagePath(url);
    if (path) {
      // Through storage rather than the stored URL: that URL is a signed link
      // with an expiry, and a manual outlives its signature.
      const { data, error } = await admin.storage.from("manuals").download(path);
      if (error) throw error;
      bytes = new Uint8Array(await data.arrayBuffer());
    } else {
      const res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
      if (!res.ok) throw new Error(`manual download failed (${res.status})`);
      bytes = new Uint8Array(await res.arrayBuffer());
    }

    const raw = await extract(bytes, name ?? path ?? url);
    const text = raw.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
    if (text.length < MIN_USEFUL_CHARS) {
      console.error(
        `comms manual: only ${text.length} characters came out of ${name ?? "the manual"} — ` +
          "it is probably a scan. Falling back to industry standards.",
      );
      return null;
    }

    // Cache the whole extraction; MAX_CHARS is a prompt budget, not a storage
    // one, and it may grow.
    await admin
      .from("company_settings")
      .update({ comms_manual_text: text, comms_manual_text_source: url })
      .not("id", "is", null);

    return cap(text);
  } catch (e) {
    console.error("comms manual: could not read it —", e instanceof Error ? e.message : e);
    return null;
  }
}

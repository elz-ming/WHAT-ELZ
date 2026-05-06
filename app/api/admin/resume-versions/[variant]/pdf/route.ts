import { NextRequest, NextResponse } from 'next/server';
import chromium from '@sparticuz/chromium-min';
import puppeteer from 'puppeteer-core';
import { marked } from 'marked';
import { getResumeVersion, setResumeVersionPdf } from '@/lib/resume-versions';
import { supabaseAdmin } from '@/lib/supabase-server';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

// Sparticuz publishes versioned Chromium tarballs; keep in sync with chromium-min's peer range.
const CHROMIUM_RELEASE_URL =
  'https://github.com/Sparticuz/chromium/releases/download/v133.0.0/chromium-v133.0.0-pack.tar';

async function getExecutablePath(): Promise<string> {
  if (process.env.NODE_ENV === 'development') {
    return (
      process.env.CHROME_EXECUTABLE_PATH ??
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
    );
  }
  return chromium.executablePath(CHROMIUM_RELEASE_URL);
}

// ── HTML template ─────────────────────────────────────────────────────────────
function buildHtml(body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<style>
  *, *::before, *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
    hyphens: none;
    -webkit-hyphens: none;
    word-break: normal;
    overflow-wrap: anywhere;
  }
  body {
    font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif;
    font-size: 10.5pt;
    line-height: 1.35;
    color: #1a1a1a;
    text-align: left;
  }
  h1 {
    font-size: 20pt;
    font-weight: 700;
    color: #111;
    margin-bottom: 4pt;
  }
  h2 {
    font-size: 11pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #333;
    border-bottom: 1px solid #ccc;
    padding-bottom: 3pt;
    margin-top: 14pt;
    margin-bottom: 6pt;
  }
  h3 {
    font-size: 10.5pt;
    font-weight: 700;
    color: #111;
    margin-top: 8pt;
    margin-bottom: 1pt;
  }
  p {
    margin-bottom: 3pt;
  }
  p:empty { display: none; }
  em {
    font-style: italic;
    color: #555;
  }
  strong {
    font-weight: 700;
  }
  ul {
    margin: 3pt 0 3pt 0.25in;
    padding: 0;
    list-style-type: disc;
  }
  li {
    margin-bottom: 2pt;
    padding-left: 2pt;
  }
  hr {
    display: none;
  }
  table {
    border-collapse: collapse;
    width: 100%;
    margin-bottom: 6pt;
    font-size: 10pt;
  }
  th, td {
    border: 1px solid #ccc;
    padding: 3pt 5pt;
    text-align: left;
  }
  th {
    font-weight: 700;
    background: #f5f5f5;
  }
  code {
    font-family: 'Courier New', monospace;
    font-size: 9.5pt;
    background: #f5f5f5;
    padding: 0 2pt;
  }
</style>
</head>
<body>
${body}
</body>
</html>`;
}

// ── Route handler ─────────────────────────────────────────────────────────────
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ variant: string }> },
) {
  const { variant } = await params;
  const decoded = decodeURIComponent(variant);

  const version = await getResumeVersion(decoded);
  if (!version) return NextResponse.json({ error: 'Variant not found' }, { status: 404 });
  if (!version.content.trim()) return NextResponse.json({ error: 'No content to export' }, { status: 400 });

  // markdown → HTML
  const htmlBody = marked.parse(version.content, { gfm: true }) as string;
  const fullHtml = buildHtml(htmlBody);

  // Launch Puppeteer
  const isDev = process.env.NODE_ENV === 'development';
  const executablePath = await getExecutablePath();

  const browser = await puppeteer.launch({
    args: isDev ? ['--no-sandbox'] : chromium.args,
    defaultViewport: null,
    executablePath,
    headless: true,
  });

  let pdfBuffer: Buffer;
  try {
    const page = await browser.newPage();
    await page.setContent(fullHtml, { waitUntil: 'networkidle0' });
    const raw = await page.pdf({
      format: 'Letter',
      printBackground: false,
      margin: { top: '0.5in', right: '0.6in', bottom: '0.5in', left: '0.6in' },
    });
    pdfBuffer = Buffer.from(raw);
  } finally {
    await browser.close();
  }

  // Upload to Supabase Storage
  const slug = decoded.toLowerCase().replace(/\s+/g, '-');
  const path = `${slug}/resume-${Date.now()}.pdf`;

  const { error: uploadError } = await supabaseAdmin.storage
    .from('resumes')
    .upload(path, pdfBuffer, { contentType: 'application/pdf', upsert: true });

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

  // Build public URL with human-readable download filename
  const downloadName = `EdmundLin_${decoded.replace(/\s+/g, '')}_Resume.pdf`;
  const { data: urlData } = supabaseAdmin.storage.from('resumes').getPublicUrl(path, {
    download: downloadName,
  });
  const pdf_url = urlData.publicUrl;

  await setResumeVersionPdf(decoded, pdf_url, path);

  return NextResponse.json({ pdf_url });
}

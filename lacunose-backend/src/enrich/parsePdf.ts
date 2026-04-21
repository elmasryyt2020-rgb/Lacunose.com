/**
 * PDF → sectioned-text orchestrator.
 *
 * Spawns a subprocess running the configured `env.PYMUPDF_PY` Python
 * interpreter with a small inline program (heredoc). The program downloads
 * the PDF, uses `pymupdf` (fitz) to extract text, and applies regex section
 * detection against common headers. Output is a JSON array on stdout.
 *
 * Safety rails:
 *   - Download cap: 20 MB. Oversized PDFs abort before fitz opens them.
 *   - 60s total timeout. SIGTERM on timeout; SIGKILL after 2s grace.
 *   - All text is utf-8 clean; we replace surrogates before JSON-serializing.
 *
 * Mapped `SectionKind` values: abstract, intro, methods, results, discussion,
 * limitations, future_work, conclusion, other.
 */
import { spawn } from 'node:child_process';
import type { SectionKind } from '@lacunose/types';
import { env } from '../lib/env.js';
import { log } from '../lib/logger.js';

const logger = log.child('enrich:parsePdf');

export interface ParsedSection {
  kind: SectionKind;
  text: string;
  position: number;
}

const TIMEOUT_MS = 60_000;

/**
 * Parse a PDF URL into a list of sections.
 *
 * Returns `[]` (never throws) when the PDF cannot be downloaded or parsed;
 * the caller decides whether missing sections is an error for its flow.
 */
export async function parsePdfToSections(pdfUrl: string): Promise<ParsedSection[]> {
  if (!pdfUrl || !/^https?:\/\//i.test(pdfUrl)) {
    logger.warn('invalid pdf url', { pdfUrl });
    return [];
  }

  const t0 = Date.now();
  const child = spawn(env.PYMUPDF_PY, ['-c', PYTHON_SCRIPT, pdfUrl], {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: process.env,
  });

  let stdout = '';
  let stderr = '';
  let killed = false;
  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');
  child.stdout.on('data', (d: string) => { stdout += d; });
  child.stderr.on('data', (d: string) => { stderr += d; });
  // Spawn failures (ENOENT for PYMUPDF_PY, EMFILE, etc.) surface as 'error'
  // events; without this listener they crash the worker.
  child.on('error', (err: Error) => {
    stderr += `[spawn error] ${err.message}`;
  });

  const timer = setTimeout(() => {
    killed = true;
    child.kill('SIGTERM');
    setTimeout(() => { if (!child.killed) child.kill('SIGKILL'); }, 2_000);
  }, TIMEOUT_MS);

  const exit: number | null = await new Promise((resolve) => {
    child.on('close', (code) => resolve(code));
  });
  clearTimeout(timer);

  const latencyMs = Date.now() - t0;
  if (killed) {
    logger.warn('pymupdf timed out', { pdfUrl, latencyMs });
    return [];
  }
  if (exit !== 0) {
    logger.warn('pymupdf exited non-zero', {
      pdfUrl,
      exit,
      stderr: stderr.slice(0, 500),
      latencyMs,
    });
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(stdout);
    if (!Array.isArray(parsed)) throw new Error('expected array');
    const sections = parsed
      .filter(isParsedSectionShape)
      .map((s) => ({
        kind: normalizeKind(s.kind),
        text: String(s.text ?? ''),
        position: Number(s.position ?? 0),
      }));
    logger.info('pdf parsed', {
      pdfUrl,
      sections: sections.length,
      latencyMs,
    });
    return sections;
  } catch (e) {
    logger.warn('pymupdf output parse failed', {
      pdfUrl,
      error: (e as Error).message,
      preview: stdout.slice(0, 200),
      latencyMs,
    });
    return [];
  }
}

function isParsedSectionShape(x: unknown): x is { kind: string; text: string; position: number } {
  if (!x || typeof x !== 'object') return false;
  const o = x as Record<string, unknown>;
  return typeof o['kind'] === 'string'
      && typeof o['text'] === 'string'
      && (typeof o['position'] === 'number' || typeof o['position'] === 'string');
}

const VALID_KINDS = new Set<SectionKind>([
  'abstract', 'intro', 'methods', 'results',
  'discussion', 'limitations', 'future_work', 'conclusion', 'other',
]);

function normalizeKind(raw: string): SectionKind {
  const k = raw as SectionKind;
  if (VALID_KINDS.has(k)) return k;
  return 'other';
}

// ---------------------------------------------------------------------------
// Python subprocess
// ---------------------------------------------------------------------------

const PYTHON_SCRIPT = `
import sys, io, json, re, tempfile, urllib.request, urllib.error

MAX_BYTES = 20 * 1024 * 1024  # 20 MB

HEADER_RE = re.compile(
    r'^\\s*(abstract|introduction|background|methods?|materials and methods|results|'
    r'findings|discussion|conclusion[s]?|limitations?|future work|references|acknowledg(e)?ments?)'
    r'\\s*$',
    re.IGNORECASE | re.MULTILINE,
)

KIND_MAP = {
    'abstract': 'abstract',
    'introduction': 'intro',
    'background': 'intro',
    'method': 'methods',
    'methods': 'methods',
    'materials and methods': 'methods',
    'results': 'results',
    'findings': 'results',
    'discussion': 'discussion',
    'conclusion': 'conclusion',
    'conclusions': 'conclusion',
    'limitation': 'limitations',
    'limitations': 'limitations',
    'future work': 'future_work',
    # 'references' is intentionally dropped (not mapped) — reference lists
    # are citation noise that pollutes retrieval and wastes embedding spend.
    'acknowledgment': 'other',
    'acknowledgments': 'other',
    'acknowledgement': 'other',
    'acknowledgements': 'other',
}

DROP_HEADERS = {'references', 'bibliography', 'works cited'}

def err(msg):
    print('[]', end='')
    sys.stderr.write(msg + '\\n')
    sys.exit(0)

def safe_url(url):
    import ipaddress, socket
    from urllib.parse import urlparse
    parts = urlparse(url)
    if parts.scheme not in ('http', 'https'):
        err('bad scheme: ' + parts.scheme)
    host = parts.hostname or ''
    if not host:
        err('bad host')
    # Block obvious metadata / loopback hostnames
    lower = host.lower()
    for bad in ('localhost', 'metadata.google.internal'):
        if lower == bad or lower.endswith('.' + bad):
            err('blocked host: ' + host)
    # Resolve and check every A/AAAA record against RFC1918 / loopback /
    # link-local / CGN / cloud-metadata (169.254.169.254).
    try:
        addrs = {info[4][0] for info in socket.getaddrinfo(host, None)}
    except Exception as e:
        err('dns failed: ' + str(e))
    for addr in addrs:
        try:
            ip = ipaddress.ip_address(addr)
        except Exception:
            continue
        if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved or ip.is_multicast:
            err('blocked ip: ' + addr)
        if str(ip) == '169.254.169.254':
            err('blocked metadata ip')

def download(url):
    safe_url(url)
    req = urllib.request.Request(url, headers={'User-Agent': 'Lacunose/1.0'})
    try:
        resp = urllib.request.urlopen(req, timeout=30)
    except Exception as e:
        err('download failed: ' + str(e))
    size_hdr = resp.headers.get('Content-Length')
    try:
        if size_hdr and int(size_hdr) > MAX_BYTES:
            err('pdf too large (content-length=' + size_hdr + ')')
    except ValueError:
        pass  # malformed Content-Length — keep going; byte-count cap still applies
    buf = io.BytesIO()
    read = 0
    while True:
        chunk = resp.read(65536)
        if not chunk:
            break
        read += len(chunk)
        if read > MAX_BYTES:
            err('pdf too large (streamed >20MB)')
        buf.write(chunk)
    return buf.getvalue()

def extract_text(pdf_bytes):
    try:
        import fitz  # pymupdf
    except Exception as e:
        err('pymupdf import failed: ' + str(e))
    with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as f:
        f.write(pdf_bytes)
        path = f.name
    try:
        doc = fitz.open(path)
    except Exception as e:
        err('fitz open failed: ' + str(e))
    pages = []
    for p in doc:
        try:
            pages.append(p.get_text('text'))
        except Exception:
            pages.append('')
    doc.close()
    return '\\n'.join(pages)

def split_sections(text):
    # Find header lines and their positions
    matches = list(HEADER_RE.finditer(text))
    if not matches:
        return [{'kind': 'other', 'text': text.strip(), 'position': 0}]
    out = []
    # Optional lead-in before the first detected header becomes abstract/intro
    if matches[0].start() > 50:
        lead = text[:matches[0].start()].strip()
        if lead:
            out.append({'kind': 'abstract', 'text': lead, 'position': 0})
    for i, m in enumerate(matches):
        start = m.end()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
        header = m.group(1).strip().lower()
        if header in DROP_HEADERS:
            continue
        kind = KIND_MAP.get(header, 'other')
        body = text[start:end].strip()
        if len(body) < 30:
            continue
        out.append({'kind': kind, 'text': body, 'position': len(out)})
    return out

def main():
    if len(sys.argv) < 2:
        err('no url provided')
    url = sys.argv[1]
    pdf_bytes = download(url)
    text = extract_text(pdf_bytes)
    # Collapse heavy whitespace
    text = re.sub(r'[ \\t]+', ' ', text)
    text = re.sub(r'\\n{3,}', '\\n\\n', text)
    sections = split_sections(text)
    # Strip surrogates before json.dumps
    def clean(s):
        return s.encode('utf-8', 'replace').decode('utf-8')
    for s in sections:
        s['text'] = clean(s['text'])
    sys.stdout.write(json.dumps(sections, ensure_ascii=False))

main()
`;

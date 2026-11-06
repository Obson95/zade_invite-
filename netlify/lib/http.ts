/** Small HTTP helpers for the Netlify Functions (no secrets in here). */

const SECURITY_HEADERS: Record<string, string> = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
};

/**
 * Only the deployed site may call these functions. ALLOWED_ORIGIN can list
 * several comma-separated origins (e.g. the netlify.app URL and a custom
 * domain). Same-origin requests are always allowed.
 */
export function allowedOrigins(req: Request): Set<string> {
  const set = new Set<string>();
  set.add(new URL(req.url).origin);
  for (const o of (process.env.ALLOWED_ORIGIN ?? "").split(",")) {
    const t = o.trim().replace(/\/+$/, "");
    if (t) set.add(t);
  }
  return set;
}

export function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin");
  if (origin && allowedOrigins(req).has(origin)) {
    return {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "600",
      Vary: "Origin",
    };
  }
  return { Vary: "Origin" };
}

export function json(req: Request, status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...SECURITY_HEADERS, ...corsHeaders(req) },
  });
}

/** Rejects cross-site browser requests. Requests without Origin (curl) still pass the other checks. */
export function originAllowed(req: Request): boolean {
  const origin = req.headers.get("origin");
  return !origin || allowedOrigins(req).has(origin);
}

/** Pre-flight / method / origin / content-type / size gate. Returns a Response to send, or null to continue. */
export async function gate(req: Request): Promise<{ early: Response } | { body: unknown }> {
  if (req.method === "OPTIONS") {
    return { early: new Response(null, { status: originAllowed(req) ? 204 : 403, headers: corsHeaders(req) }) };
  }
  if (req.method !== "POST") return { early: json(req, 405, { ok: false, error: "Method not allowed." }) };
  if (!originAllowed(req)) return { early: json(req, 403, { ok: false, error: "Forbidden." }) };
  if (!(req.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json")) {
    return { early: json(req, 415, { ok: false, error: "Unsupported content type." }) };
  }
  const text = await req.text();
  if (text.length > 4096) return { early: json(req, 413, { ok: false, error: "Request too large." }) };
  try {
    return { body: JSON.parse(text) };
  } catch {
    return { early: json(req, 400, { ok: false, error: "Invalid request." }) };
  }
}

/* ── Best-effort, per-instance rate limiting ───────────────────────────────
 * Netlify Functions are stateless and may run on several instances, so this
 * only slows down abuse from a single client; the Apps Script backend keeps a
 * second, shared limit per invitation in CacheService. See README.         */
const buckets = new Map<string, { count: number; reset: number }>();

export function clientIp(req: Request): string {
  return (
    req.headers.get("x-nf-client-connection-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    "unknown"
  );
}

export function rateLimited(key: string, limit: number, windowMs: number, now = Date.now()): boolean {
  if (buckets.size > 5000) {
    for (const [k, v] of buckets) if (v.reset < now) buckets.delete(k);
  }
  const b = buckets.get(key);
  if (!b || b.reset < now) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    return false;
  }
  b.count += 1;
  return b.count > limit;
}

export function _resetRateLimits(): void {
  buckets.clear();
}

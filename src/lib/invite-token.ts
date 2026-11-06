import { TOKEN_RE } from "./rsvp-schema";

const KEY = "zade-invite-token";

export type InviteTokenState =
  | { kind: "none" }
  | { kind: "preview" }
  | { kind: "invalid" }
  | { kind: "token"; token: string };

/**
 * Reads ?invite=<token> once, keeps it in sessionStorage for this tab, and
 * removes it from the address bar so it isn't left in history, screenshots,
 * or shared copies of the URL.
 */
export function readInviteToken(): InviteTokenState {
  let raw: string | null = null;
  try {
    const url = new URL(window.location.href);
    raw = url.searchParams.get("invite");
    if (raw !== null) {
      url.searchParams.delete("invite");
      window.history.replaceState(null, "", url.pathname + (url.search || "") + url.hash);
    }
  } catch {
    /* ignore */
  }

  if (raw === null) {
    try {
      raw = sessionStorage.getItem(KEY);
    } catch {
      raw = null;
    }
  }
  if (raw === null || raw === "") return { kind: "none" };

  const t = raw.trim().toLowerCase();
  if (t === "preview") {
    try { sessionStorage.setItem(KEY, t); } catch { /* preview remains in memory */ }
    return { kind: "preview" };
  }
  if (!TOKEN_RE.test(t)) return { kind: "invalid" };
  try {
    sessionStorage.setItem(KEY, t);
  } catch {
    /* private mode — fine, token stays in memory */
  }
  return { kind: "token", token: t };
}

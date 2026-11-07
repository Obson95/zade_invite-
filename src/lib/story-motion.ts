/** Direct RSVP and section links must never be blocked by the decorative cover. */
export function shouldOpenBook() {
  if (window.location.pathname !== "/" || window.location.hash) return false;
  try { return sessionStorage.getItem("zade-book-opened") !== "true"; } catch { return true; }
}

export function skyOffset(top: number) {
  return Math.max(-24, Math.min(24, -top * 0.035));
}

import type { BookPage } from "../config/book";

/** One side of a sheet. The book is just an ordered list of these. */
export type Face =
  | { key: string; kind: "cover" | "back-cover" | "endpaper-front" | "endpaper-back" | "blank"; spreadOnly: boolean }
  | { key: string; kind: "page"; page: BookPage; number: number; spreadOnly: false };

/** What is visible at rest. `right` alone is also the single-page view. */
export interface View {
  left: number | null;
  right: number | null;
}

/**
 * Lays the pages between the covers. A printed book needs an even number of
 * sides so the back cover lands on the back of the last sheet, so a blank is
 * added when the page count is odd.
 */
export function buildFaces(pages: BookPage[]): Face[] {
  const inner: Face[] = pages.map((page, i) => ({ key: page.id, kind: "page", page, number: i + 1, spreadOnly: false }));
  if (pages.length % 2 === 1) inner.push({ key: "blank", kind: "blank", spreadOnly: true });
  return [
    { key: "cover", kind: "cover", spreadOnly: false },
    { key: "endpaper-front", kind: "endpaper-front", spreadOnly: true },
    ...inner,
    { key: "endpaper-back", kind: "endpaper-back", spreadOnly: true },
    { key: "back-cover", kind: "back-cover", spreadOnly: false },
  ];
}

export function spreadViews(faces: Face[]): View[] {
  const views: View[] = [{ left: null, right: 0 }];
  for (let i = 1; i < faces.length - 1; i += 2) views.push({ left: i, right: i + 1 });
  views.push({ left: faces.length - 1, right: null });
  return views;
}

export function singleViews(faces: Face[]): View[] {
  return faces.flatMap((face, i) => (face.spreadOnly ? [] : [{ left: null, right: i }]));
}

export function viewOfFace(views: View[], face: number): number {
  const at = views.findIndex((v) => v.left === face || v.right === face);
  return at < 0 ? 0 : at;
}

export function findFace(faces: Face[], key: string): number {
  return faces.findIndex((f) => f.key === key);
}

/** The face a URL points to: /rsvp, /#the-party, or the cover. */
export function faceFromLocation(faces: Face[], pathname: string, hash: string): number {
  if (pathname.replace(/\/+$/, "") === "/rsvp") return Math.max(0, findFace(faces, "rsvp"));
  const key = decodeURIComponent(hash.replace(/^#/, ""));
  return key ? Math.max(0, findFace(faces, key)) : 0;
}

/**
 * Where the book opens. A refresh (or Back/Forward) keeps the reader on their
 * page. Arriving fresh, even on a forwarded link like /#little-moments, starts
 * at the cover so everyone sees it open, except /rsvp, which goes straight to
 * the reply card.
 */
export function startFace(faces: Face[], pathname: string, hash: string, navigation: string): number {
  if (navigation === "reload" || navigation === "back_forward") return faceFromLocation(faces, pathname, hash);
  if (pathname.replace(/\/+$/, "") === "/rsvp") return faceFromLocation(faces, pathname, hash);
  return 0;
}

export function urlOfFace(face: Face): string {
  if (face.kind === "cover") return "/";
  return face.key === "rsvp" ? "/rsvp" : `/#${face.key}`;
}

/**
 * Hard covers swing on a hinge; paper curls. A long jump is broken at the
 * covers so the book always opens or closes before pages move.
 * Returns the [from, to] pairs to play in order.
 */
export function turnRoute(viewCount: number, from: number, to: number, spread: boolean): [number, number][] {
  if (from === to) return [];
  const last = viewCount - 1;
  const firstPaper = 1;
  const lastPaper = spread ? last - 1 : last;
  const stops = [from];
  const add = (v: number) => { if (stops[stops.length - 1] !== v) stops.push(v); };
  if (from === 0 && to > firstPaper) add(firstPaper);
  if (spread && from === last && to < lastPaper) add(lastPaper);
  if (to === 0 && from > firstPaper) add(firstPaper);
  if (spread && to === last && from < lastPaper) add(lastPaper);
  add(to);
  return stops.slice(1).map((v, i) => [stops[i], v]);
}

/** True when a turn between these neighbouring views moves a hard cover. */
export function isHardTurn(viewCount: number, a: number, b: number, spread: boolean): boolean {
  const lo = Math.min(a, b);
  const hi = Math.max(a, b);
  return lo === 0 || (spread && hi === viewCount - 1);
}

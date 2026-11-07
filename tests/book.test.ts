import { describe, expect, it } from "vitest";
import { pages, type BookPage } from "../src/config/book";
import {
  buildFaces,
  faceFromLocation,
  findFace,
  isHardTurn,
  singleViews,
  spreadViews,
  turnRoute,
  urlOfFace,
  viewOfFace,
} from "../src/lib/book-model";
import { applyMatrix, clipPolygon, cornerAt, easePage, foldAt, type Point } from "../src/lib/page-fold";

const area = (p: Point[]) => Math.abs(p.reduce((sum, [x, y], i) => {
  const [nx, ny] = p[(i + 1) % p.length];
  return sum + x * ny - nx * y;
}, 0)) / 2;

describe("book structure", () => {
  const faces = buildFaces(pages);

  it("runs cover, the brief's eight pages, then back cover", () => {
    expect(pages.map((p) => p.kind)).toEqual(["story", "arrival", "milestones", "videos", "collage", "party", "letter", "rsvp"]);
    expect(faces[0].kind).toBe("cover");
    expect(faces[faces.length - 1].kind).toBe("back-cover");
  });

  it("always has an even number of sides, however many pages there are", () => {
    for (const n of [1, 2, 3, 7, 8, 9]) {
      const list = Array.from({ length: n }, (_, i) => ({ ...pages[0], id: `p${i}` })) as BookPage[];
      expect(buildFaces(list).length % 2).toBe(0);
    }
  });

  it("numbers pages from the array order, so reordering just works", () => {
    const reordered = buildFaces([...pages].reverse()).filter((f) => f.kind === "page");
    expect(reordered.map((f) => (f.kind === "page" ? f.number : 0))).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(reordered[0].key).toBe("rsvp");
  });

  it("shows every face once as a spread and starts and ends closed", () => {
    const views = spreadViews(faces);
    expect(views[0]).toEqual({ left: null, right: 0 });
    expect(views[views.length - 1]).toEqual({ left: faces.length - 1, right: null });
    const seen = views.flatMap((v) => [v.left, v.right]).filter((f) => f !== null);
    expect(seen).toEqual(faces.map((_, i) => i));
  });

  it("drops endpapers on phones but keeps every numbered page", () => {
    const shown = singleViews(faces).map((v) => faces[v.right!].kind);
    expect(shown).not.toContain("endpaper-front");
    expect(shown.filter((k) => k === "page")).toHaveLength(pages.length);
  });

  it("finds the same face in either layout", () => {
    const rsvp = findFace(faces, "rsvp");
    for (const views of [spreadViews(faces), singleViews(faces)]) {
      const v = views[viewOfFace(views, rsvp)];
      expect([v.left, v.right]).toContain(rsvp);
    }
  });
});

describe("addresses", () => {
  const faces = buildFaces(pages);

  it("keeps /rsvp working as a direct link, past the cover", () => {
    expect(faces[faceFromLocation(faces, "/rsvp", "")].key).toBe("rsvp");
    expect(faces[faceFromLocation(faces, "/rsvp/", "")].key).toBe("rsvp");
  });

  it("opens links to a page on that page, and anything else on the cover", () => {
    expect(faces[faceFromLocation(faces, "/", "#the-party")].key).toBe("the-party");
    expect(faceFromLocation(faces, "/", "")).toBe(0);
    expect(faceFromLocation(faces, "/", "#no-such-page")).toBe(0);
  });

  it("round-trips every page through its URL", () => {
    faces.filter((f) => f.kind === "page").forEach((face) => {
      const url = new URL(urlOfFace(face), "https://example.test");
      expect(faces[faceFromLocation(faces, url.pathname, url.hash)].key).toBe(face.key);
    });
  });
});

describe("turn routes", () => {
  it("opens the cover before flipping to a far page", () => {
    expect(turnRoute(7, 0, 5, true)).toEqual([[0, 1], [1, 5]]);
  });
  it("finishes the pages before closing the book", () => {
    expect(turnRoute(7, 2, 6, true)).toEqual([[2, 5], [5, 6]]);
    expect(turnRoute(7, 3, 0, true)).toEqual([[3, 1], [1, 0]]);
  });
  it("turns once for neighbours and not at all when already there", () => {
    expect(turnRoute(7, 2, 3, true)).toEqual([[2, 3]]);
    expect(turnRoute(7, 4, 4, true)).toEqual([]);
  });
  it("has no hard back cover on phones", () => {
    expect(isHardTurn(10, 8, 9, false)).toBe(false);
    expect(isHardTurn(10, 0, 1, false)).toBe(true);
    expect(isHardTurn(7, 5, 6, true)).toBe(true);
    expect(isHardTurn(7, 2, 3, true)).toBe(false);
  });
});

describe("page fold", () => {
  const W = 480;
  const H = 650;
  const steps = Array.from({ length: 19 }, (_, i) => (i + 1) / 20);

  it("never loses paper: kept and folded parts always make a whole sheet", () => {
    for (const e of steps) {
      const f = foldAt(e, W, H);
      expect(area(f.kept) + area(f.flap)).toBeCloseTo(W * H, 3);
    }
  });

  it("starts flat and ends flat on the other side", () => {
    expect(area(foldAt(0, W, H).flap)).toBeLessThan(1);
    expect(area(foldAt(1, W, H).kept)).toBeLessThan(W * H * 0.002);
  });

  it("keeps the sheet attached to the spine for the whole turn", () => {
    for (const e of steps) {
      const [x, y] = cornerAt(e, W, H);
      expect(Math.hypot(x, y - H)).toBeLessThanOrEqual(W + 1e-6);
      for (const [px] of foldAt(e, W, H).kept) expect(px).toBeGreaterThanOrEqual(-1e-6);
    }
  });

  it("works on tall narrow phones too", () => {
    for (const e of steps) {
      const [x, y] = cornerAt(e, 360, 760);
      expect(Math.hypot(x, y - 760)).toBeLessThanOrEqual(360 + 1e-6);
    }
  });

  it("lands the back page exactly on the flap", () => {
    for (const e of steps) {
      const f = foldAt(e, W, H);
      f.flapLocal.forEach((p, i) => {
        const [x, y] = applyMatrix(f.matrix, p);
        expect(x).toBeCloseTo(f.flap[i][0], 3);
        expect(y).toBeCloseTo(f.flap[i][1], 3);
      });
    }
  });

  it("does not mirror the back page, so its words stay readable", () => {
    const [a, b, c, d] = foldAt(0.5, W, H).matrix;
    expect(a * d - b * c).toBeCloseTo(1, 6);
  });

  it("ends with the back page lying flat on the left", () => {
    const f = foldAt(1, W, H);
    const [x, y] = applyMatrix(f.matrix, [0, 0]);
    expect(x).toBeCloseTo(-W, 0);
    expect(y).toBeCloseTo(0, 0);
  });

  it("clips a polygon to one side of a line", () => {
    const clipped = clipPolygon([[0, 0], [10, 0], [10, 10], [0, 10]], ([x]) => 5 - x);
    expect(area(clipped)).toBeCloseTo(50);
  });

  it("eases in and out without overshooting", () => {
    expect(easePage(0)).toBe(0);
    expect(easePage(1)).toBeCloseTo(1);
    for (let t = 0; t < 1; t += 0.05) expect(easePage(t + 0.05)).toBeGreaterThanOrEqual(easePage(t));
  });
});

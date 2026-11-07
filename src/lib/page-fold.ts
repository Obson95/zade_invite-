/**
 * The geometry of one sheet of paper being turned.
 *
 * Coordinates start at the top of the spine, x to the right, y down. The sheet
 * rests on [0, W] × [0, H]. Lifting its bottom outer corner C to a point P folds
 * the sheet along the perpendicular bisector of CP. Everything on C's side of
 * that line is flipped over it, which is exactly what real paper does, and the
 * flipped part shows the back of the sheet.
 */
export type Point = [number, number];

export interface Fold {
  /** The part of the front that still lies flat, in sheet coordinates. */
  kept: Point[];
  /** The flipped part as it now sits on screen, in sheet coordinates. */
  flap: Point[];
  /** The flipped part in the local coordinates of the back page. */
  flapLocal: Point[];
  /** CSS matrix(a,b,c,d,e,f) placing the back page, origin at the spine top. */
  matrix: [number, number, number, number, number, number];
  /** A point on the fold line and the unit normal pointing at the corner. */
  mid: Point;
  normal: Point;
}

/** Keeps the part of a polygon on the side where side(point) >= 0. */
export function clipPolygon(points: Point[], side: (p: Point) => number): Point[] {
  const out: Point[] = [];
  points.forEach((a, i) => {
    const b = points[(i + 1) % points.length];
    const da = side(a);
    const db = side(b);
    if (da >= 0) out.push(a);
    if (da >= 0 !== db >= 0) {
      const t = da / (da - db);
      out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
    }
  });
  return out;
}

/** Where the lifted corner is at progress e (0 flat on the right, 1 flat on the left). */
export function cornerAt(e: number, W: number, H: number): Point {
  const theta = Math.PI * e;
  // Staying inside this circle keeps the sheet attached at the spine.
  const lift = Math.min(0.22 * H, W);
  return [W * Math.cos(theta), H - lift * Math.sin(theta)];
}

export function foldAt(e: number, W: number, H: number): Fold {
  const progress = Math.min(1 - 1e-4, Math.max(1e-4, e));
  const corner: Point = [W, H];
  const lifted = cornerAt(progress, W, H);
  const dx = corner[0] - lifted[0];
  const dy = corner[1] - lifted[1];
  const length = Math.hypot(dx, dy);
  const nx = dx / length;
  const ny = dy / length;
  const mx = (corner[0] + lifted[0]) / 2;
  const my = (corner[1] + lifted[1]) / 2;
  const side = (p: Point) => (p[0] - mx) * nx + (p[1] - my) * ny;
  const sheet: Point[] = [[0, 0], [W, 0], [W, H], [0, H]];
  const kept = clipPolygon(sheet, (p) => -side(p));
  const folded = clipPolygon(sheet, side);
  const flip = (p: Point): Point => {
    const d = 2 * side(p);
    return [p[0] - d * nx, p[1] - d * ny];
  };

  // Reflection across the fold, composed with mirroring the back page into the
  // sheet. Two mirrors make a rotation, so the back page stays readable.
  const q11 = 1 - 2 * nx * nx;
  const q12 = -2 * nx * ny;
  const q22 = 1 - 2 * ny * ny;
  const along = 2 * (mx * nx + my * ny);
  return {
    kept,
    flap: folded.map(flip),
    flapLocal: folded.map(([x, y]) => [W - x, y]),
    matrix: [-q11, -q12, q12, q22, q11 * W + along * nx, q12 * W + along * ny],
    mid: [mx, my],
    normal: [nx, ny],
  };
}

/** Where the back page puts one of its local points, for checking the matrix. */
export function applyMatrix(m: Fold["matrix"], [u, v]: Point): Point {
  return [m[0] * u + m[2] * v + m[4], m[1] * u + m[3] * v + m[5]];
}

/** Slow start, slow finish, like a hand lifting and laying down a page. */
export function easePage(t: number): number {
  return 0.5 - 0.5 * Math.cos(Math.PI * t);
}

import { isHardTurn, turnRoute, type View } from "./book-model";
import { easePage, foldAt, type Point } from "./page-fold";

const PAPER_MS = 1250;
const COVER_MS = 1600;
const PEEL = 0.075;

interface Deps {
  root: HTMLElement;
  face: (index: number) => HTMLElement | null;
  /** Plain back of the paper, used when pages are shown one at a time. */
  sheetBack: HTMLElement;
  fxOuter: HTMLElement;
  fxFlap: HTMLElement;
  /** Make sure these faces are rendered before a turn shows them. */
  mount: (faces: number[]) => void;
  /** A turn that will really happen has started: stop anything playing. */
  onLeave: () => void;
  onSettled: (view: number) => void;
}

interface Step {
  from: number;
  to: number;
  hard: boolean;
  front: number | null;
  back: number | null;
  rest: number;
  goal: number;
  revealed: boolean;
}

const px = (n: number) => `${n.toFixed(1)}px`;
const polygon = (points: Point[]) => `polygon(${points.map(([x, y]) => `${px(x)} ${px(y)}`).join(",")})`;

/**
 * Plays page turns by moving real DOM pages, so forms keep their state and
 * nothing has to be rendered twice. React owns what is on a page; this owns
 * where the page is.
 */
export class BookEngine {
  private views: View[] = [];
  private faceCount = 0;
  private spread = true;
  private W = 1;
  private H = 1;
  private reduced = false;
  private view = 0;
  private e = 0;
  private step: Step | null = null;
  private turning = false;
  private pending: number | null = null;
  private finalTarget = 0;
  private token = 0;

  constructor(private readonly d: Deps) {}

  get current() {
    return this.view;
  }

  /** Where the book is heading, so a quick second press adds to the turn in progress. */
  get destination() {
    return this.pending ?? (this.turning && this.step ? this.finalTarget : this.view);
  }

  configure(views: View[], faceCount: number, spread: boolean, view: number, reduced: boolean) {
    this.token++;
    this.turning = false;
    this.pending = null;
    this.step = null;
    this.views = views;
    this.faceCount = faceCount;
    this.spread = spread;
    this.reduced = reduced;
    this.settle(view);
  }

  setReduced(reduced: boolean) {
    this.reduced = reduced;
  }

  resize(W: number, H: number) {
    this.W = W;
    this.H = H;
    if (this.step) this.render();
    else this.shift(this.closedShift(this.view));
  }

  private faces(view: number): number[] {
    const v = this.views[view];
    return v ? [v.left, v.right].filter((f): f is number => f !== null) : [];
  }

  private neighbours(view: number): number[] {
    return [view - 1, view, view + 1].flatMap((v) => this.faces(v));
  }

  private assign(roles: Map<number, string>, interactive: boolean) {
    for (let i = 0; i < this.faceCount; i++) {
      const el = this.d.face(i);
      if (!el) continue;
      const role = roles.get(i) ?? "hidden";
      el.dataset.role = role;
      el.inert = !(interactive && role !== "hidden");
      el.style.removeProperty("clip-path");
      el.style.removeProperty("transform");
      el.style.removeProperty("--shade");
      el.style.removeProperty("visibility");
    }
  }

  private closedShift(view: number) {
    if (!this.spread) return 0;
    if (view === 0) return -this.W / 2;
    if (view === this.views.length - 1) return this.W / 2;
    return 0;
  }

  private shift(x: number) {
    this.d.root.style.transform = x ? `translate3d(${px(x)},0,0)` : "";
  }

  private settle(view: number) {
    this.view = view;
    this.step = null;
    delete document.documentElement.dataset.turning;
    const v = this.views[view];
    const roles = new Map<number, string>();
    if (v.left !== null) roles.set(v.left, "left");
    if (v.right !== null) roles.set(v.right, "right");
    this.d.mount(this.neighbours(view));
    this.assign(roles, true);
    roles.forEach((_, i) => this.d.face(i)?.classList.add("is-open"));
    for (let i = 0; i < this.faceCount; i++) {
      if (!roles.has(i)) this.d.face(i)?.classList.remove("is-open");
    }
    this.d.sheetBack.hidden = true;
    this.d.fxOuter.hidden = true;
    this.d.fxFlap.hidden = true;
    this.shift(this.closedShift(view));
    this.d.root.dataset.closed = view === 0 ? "front" : this.spread && view === this.views.length - 1 ? "back" : "";
  }

  /** Lays the four sides involved in a turn on top of each other. */
  private begin(from: number, to: number) {
    const lo = Math.min(from, to);
    const hi = Math.max(from, to);
    const low = this.views[lo];
    const high = this.views[hi];
    const forward = to > from;
    const hard = isHardTurn(this.views.length, lo, hi, this.spread);
    const front = low.right;
    const back = this.spread ? high.left : null;
    const faces = [low.left, front, back, high.right].filter((f): f is number => f !== null);
    this.d.mount(faces);
    const roles = new Map<number, string>();
    if (low.left !== null) roles.set(low.left, "left");
    if (high.right !== null) roles.set(high.right, "right");
    if (front !== null) roles.set(front, "front");
    if (back !== null) roles.set(back, "back");
    this.assign(roles, false);
    this.step = { from, to, hard, front, back, rest: forward ? 0 : 1, goal: forward ? 1 : 0, revealed: false };
    this.e = this.step.rest;
    this.d.sheetBack.hidden = hard || this.spread;
    this.d.fxOuter.hidden = hard;
    this.d.fxFlap.hidden = hard;
    document.documentElement.dataset.turning = "true";
    this.render();
  }

  private render() {
    const step = this.step;
    if (!step) return;
    if (!step.revealed && Math.abs(this.e - step.rest) > 0.24) {
      step.revealed = true;
      const target = this.faces(step.to);
      target.forEach((f) => this.d.face(f)?.classList.add("is-open"));
    }
    if (step.hard) this.renderCover(step);
    else this.renderPaper(step);
  }

  private renderCover(step: Step) {
    const degrees = this.e * 180;
    const lift = Math.sin(this.e * Math.PI);
    const perspective = `perspective(${px(this.W * 4)})`;
    const front = step.front === null ? null : this.d.face(step.front);
    const back = step.back === null ? null : this.d.face(step.back);
    if (front) {
      front.style.transform = `${perspective} rotateY(${(-degrees).toFixed(2)}deg)`;
      front.style.setProperty("--shade", lift.toFixed(3));
      front.style.visibility = degrees < 90 ? "visible" : "hidden";
    }
    if (back) {
      back.style.transform = `${perspective} rotateY(${(180 - degrees).toFixed(2)}deg)`;
      back.style.setProperty("--shade", lift.toFixed(3));
      back.style.visibility = degrees >= 90 ? "visible" : "hidden";
    }
    const [lo, hi] = [Math.min(step.from, step.to), Math.max(step.from, step.to)];
    this.shift(lo === 0 ? this.closedShift(0) * (1 - this.e) : this.closedShift(hi) * this.e);
  }

  private renderPaper(step: Step) {
    const { W, H } = this;
    const fold = foldAt(this.e, W, H);
    const spine = this.spread ? W : 0;
    const front = step.front === null ? null : this.d.face(step.front);
    const back = this.spread ? (step.back === null ? null : this.d.face(step.back)) : this.d.sheetBack;
    if (front) front.style.clipPath = polygon(fold.kept);
    if (back) {
      back.style.clipPath = polygon(fold.flapLocal);
      back.style.transform = `matrix(${fold.matrix.map((n) => n.toFixed(5)).join(",")})`;
    }
    const angle = Math.atan2(fold.normal[1], fold.normal[0]);
    const place = `translate3d(${px(fold.mid[0] + spine)},${px(fold.mid[1])},0) rotate(${angle.toFixed(4)}rad)`;
    const strength = Math.sin(Math.PI * this.e).toFixed(3);
    this.d.fxFlap.style.clipPath = polygon(fold.flap.map(([x, y]) => [x + spine, y]));
    const outer = this.d.fxOuter.firstElementChild as HTMLElement;
    const inner = this.d.fxFlap.firstElementChild as HTMLElement;
    outer.style.transform = `${place} translateY(-50%)`;
    outer.style.opacity = strength;
    inner.style.transform = `${place} translate(-100%,-50%)`;
    inner.style.opacity = strength;
  }

  private animate(to: number, ms: number): Promise<boolean> {
    const token = ++this.token;
    const from = this.e;
    const start = performance.now();
    return new Promise((resolve) => {
      const tick = (now: number) => {
        if (token !== this.token) return resolve(false);
        const k = Math.min(1, (now - start) / ms);
        this.e = from + (to - from) * easePage(k);
        this.render();
        if (k < 1) requestAnimationFrame(tick);
        else resolve(true);
      };
      requestAnimationFrame(tick);
    });
  }

  async goTo(target: number) {
    const to = Math.max(0, Math.min(this.views.length - 1, target));
    if (this.turning) {
      this.pending = to;
      return;
    }
    if (to === this.view && !this.step) return;
    this.d.onLeave();
    if (this.reduced) {
      this.step = null;
      this.d.root.classList.remove("is-fading");
      void this.d.root.offsetWidth;
      this.d.root.classList.add("is-fading");
      this.settle(to);
      this.d.onSettled(to);
      return;
    }
    this.turning = true;
    this.finalTarget = to;
    const token = this.token;
    for (const [from, next] of turnRoute(this.views.length, this.view, to, this.spread)) {
      if (!(this.step && this.step.from === from && this.step.to === next)) {
        if (this.step) this.settle(this.view);
        this.begin(from, next);
      }
      const step = this.step!;
      const left = Math.abs(step.goal - this.e);
      const finished = await this.animate(step.goal, (step.hard ? COVER_MS : PAPER_MS) * Math.max(0.35, left));
      if (!finished) {
        if (token + 1 >= this.token) this.turning = false;
        return;
      }
      this.settle(next);
    }
    this.turning = false;
    this.d.onSettled(this.view);
    if (this.pending !== null) {
      const queued = this.pending;
      this.pending = null;
      void this.goTo(queued);
    }
  }

  /** Lifts a corner a little under the pointer, without committing to a turn. */
  peel(direction: 1 | -1) {
    if (this.reduced || this.turning) return;
    const to = this.view + direction;
    if (to < 0 || to >= this.views.length) return;
    if (!this.step) this.begin(this.view, to);
    void this.animate(this.step!.rest + (this.step!.goal - this.step!.rest) * PEEL, 360);
  }

  unpeel() {
    const step = this.step;
    if (!step || this.turning) return;
    void this.animate(step.rest, 300).then((done) => {
      if (done && this.step === step && !this.turning) this.settle(this.view);
    });
  }

  /** Follows a finger. Returns false when the book can't turn that way. */
  dragStart(direction: 1 | -1): boolean {
    if (this.reduced || this.turning) return false;
    const to = this.view + direction;
    if (to < 0 || to >= this.views.length) return false;
    this.token++;
    if (this.step) this.settle(this.view);
    this.begin(this.view, to);
    return true;
  }

  dragTo(progress: number) {
    const step = this.step;
    if (!step) return;
    this.token++;
    const k = Math.max(0, Math.min(0.96, progress));
    this.e = step.rest + (step.goal - step.rest) * k;
    this.render();
  }

  dragEnd(commit: boolean) {
    const step = this.step;
    if (!step) return;
    if (commit) {
      void this.goTo(step.to);
      return;
    }
    void this.animate(step.rest, 420).then((done) => {
      if (done && this.step === step) this.settle(this.view);
    });
  }
}

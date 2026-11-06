/**
 * Minimal in-memory Google Apps Script environment so Code.gs can be unit
 * tested in Node (Sheets, Utilities, CacheService, LockService, ...).
 */
import { createHash, createHmac, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const toSigned = (buf: Buffer) => Array.from(buf, (b) => (b > 127 ? b - 256 : b));

export class FakeRange {
  constructor(private sheet: FakeSheet, private r: number, private c: number, private nr = 1, private nc = 1) {}
  getValues() {
    const out: unknown[][] = [];
    for (let i = 0; i < this.nr; i++) {
      const row: unknown[] = [];
      for (let j = 0; j < this.nc; j++) row.push(this.sheet.data[this.r - 1 + i]?.[this.c - 1 + j] ?? "");
      out.push(row);
    }
    return out;
  }
  setValue(v: unknown) {
    this.sheet.set(this.r, this.c, v);
    return this;
  }
  setValues(vs: unknown[][]) {
    vs.forEach((row, i) => row.forEach((v, j) => this.sheet.set(this.r + i, this.c + j, v)));
    return this;
  }
  getRow() { return this.r; }
  getNumRows() { return this.nr; }
  setFontWeight() { return this; }
  setNumberFormat() { return this; }
  setDataValidation() { return this; }
}

export class FakeSheet {
  data: unknown[][] = [];
  constructor(public name: string) {}
  set(r: number, c: number, v: unknown) {
    while (this.data.length < r) this.data.push([]);
    const row = this.data[r - 1];
    while (row.length < c) row.push("");
    row[c - 1] = v;
  }
  getName() { return this.name; }
  getLastRow() {
    let last = 0;
    this.data.forEach((row, i) => { if (row.some((v) => v !== "" && v !== undefined)) last = i + 1; });
    return last;
  }
  getLastColumn() { return Math.max(0, ...this.data.map((r) => r.length)); }
  getMaxRows() { return Math.max(1000, this.data.length); }
  getRange(a: number | string, c = 1, nr = 1, nc = 1) {
    if (typeof a === "string") return new FakeRange(this, 1, 2, 1, 1);
    return new FakeRange(this, a, c, nr, nc);
  }
  appendRow(row: unknown[]) {
    const r = this.getLastRow() + 1;
    row.forEach((v, j) => this.set(r, j + 1, v));
  }
  setFrozenRows() {}
}

export function loadAppsScript(opts: { secret?: string } = {}) {
  const sheets = new Map<string, FakeSheet>();
  const props = new Map<string, string>();
  if (opts.secret) props.set("RSVP_SHARED_SECRET", opts.secret);
  const cache = new Map<string, string>();
  const sent: Record<string, unknown>[] = [];

  const ss = {
    getSheetByName: (n: string) => sheets.get(n) ?? null,
    insertSheet: (n: string) => { const s = new FakeSheet(n); sheets.set(n, s); return s; },
    getActiveSheet: () => sheets.get("Guests"),
  };

  const tzFormat = (d: Date, tz: string, fmt: string) => {
    const parts = Object.fromEntries(
      new Intl.DateTimeFormat("en-US", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23", weekday: "long", timeZoneName: "short" })
        .formatToParts(d).map((p) => [p.type, p.value]),
    );
    if (fmt === "yyyy-MM-dd") return `${parts.year}-${parts.month}-${parts.day}`;
    if (fmt === "HH:mm") return `${parts.hour}:${parts.minute}`;
    if (fmt === "yyyy") return parts.year;
    if (fmt === "z") return parts.timeZoneName;
    if (fmt === "EEEE, MMMM d, yyyy")
      return new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "long", month: "long", day: "numeric", year: "numeric" }).format(d);
    throw new Error("unsupported format " + fmt);
  };

  const context: Record<string, unknown> = {
    console,
    Utilities: {
      DigestAlgorithm: { SHA_256: "sha256" },
      Charset: { UTF_8: "utf8" },
      computeDigest: (_alg: string, s: string) => toSigned(createHash("sha256").update(s, "utf8").digest()),
      computeHmacSha256Signature: (msg: string, key: string) => toSigned(createHmac("sha256", key).update(msg, "utf8").digest()),
      getUuid: () => randomUUID(),
      formatDate: (d: Date, tz: string, fmt: string) => {
        if (!Intl.supportedValuesOf("timeZone").includes(tz) && tz !== "UTC") throw new Error("bad tz");
        return tzFormat(d, tz, fmt);
      },
    },
    SpreadsheetApp: { getActive: () => ss, flush: () => {} },
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: (k: string) => props.get(k) ?? null,
        setProperty: (k: string, v: string) => props.set(k, v),
      }),
    },
    CacheService: {
      getScriptCache: () => ({
        get: (k: string) => cache.get(k) ?? null,
        put: (k: string, v: string) => cache.set(k, v),
      }),
    },
    LockService: { getScriptLock: () => ({ tryLock: () => true, waitLock: () => {}, releaseLock: () => {} }) },
    ContentService: {
      MimeType: { JSON: "json" },
      createTextOutput: (t: string) => ({ setMimeType() { return this; }, getContent: () => t }),
    },
    MailApp: { sendEmail: (o: Record<string, unknown>) => sent.push(o), getRemainingDailyQuota: () => 100 },
    Session: { getScriptTimeZone: () => "America/New_York", getEffectiveUser: () => ({ getEmail: () => "owner@example.com" }) },
    ScriptApp: { getService: () => ({ getUrl: () => "https://script.google.com/macros/s/abc/exec" }) },
    HtmlService: {
      createTemplateFromFile: () => {
        const t: Record<string, unknown> = {};
        t.evaluate = () => ({ getContent: () => `<html>${JSON.stringify(t)}</html>` });
        return t;
      },
    },
  };
  vm.createContext(context);
  const code = readFileSync(fileURLToPath(new URL("../../apps-script/Code.gs", import.meta.url)), "utf8");
  vm.runInContext(code, context, { filename: "Code.gs" });

  return { context: context as Record<string, any>, sheets, props, cache, sent, ss };
}

export const GUEST_HEADERS = [
  "guest_id", "guest_name", "email", "invite_token_hash", "invite_status", "sent_at",
  "last_error", "rsvp_status", "party_size", "rsvp_at", "notes", "max_party_size", "guest_message", "dietary_notes",
];

/** Builds Guests + Settings tabs with the given rows. */
export function seed(env: ReturnType<typeof loadAppsScript>, guests: Record<string, unknown>[], settings: Record<string, string>) {
  const g = env.ss.insertSheet("Guests");
  g.appendRow(GUEST_HEADERS);
  guests.forEach((row) => g.appendRow(GUEST_HEADERS.map((h) => row[h] ?? "")));
  const s = env.ss.insertSheet("Settings");
  s.appendRow(["setting", "value", "notes"]);
  Object.entries(settings).forEach(([k, v]) => s.appendRow([k, v, ""]));
  env.ss.insertSheet("Audit").appendRow(["timestamp", "action", "guest_id", "result"]);
  return g;
}

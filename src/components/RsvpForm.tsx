import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { AnimatePresence, m } from "motion/react";
import { event } from "../config/event";
import { getEventDisplay } from "../lib/event-display";
import type { InviteTokenState } from "../lib/invite-token";
import {
  DEFAULT_PUBLIC_MAX_PARTY,
  MAX_DIETARY_LENGTH,
  MAX_EMAIL_LENGTH,
  MAX_MESSAGE_LENGTH,
  MAX_NAME_LENGTH,
} from "../lib/rsvp-schema";
import { isPastDeadline, isValidDateString, isValidTimeZone } from "../lib/time";
import { CheckIcon } from "./Icons";

interface InviteInfo {
  guestName: string;
  maxPartySize: number;
  rsvpStatus: string;
  partySize: number;
  closed: boolean;
}

type Mode = "invite" | "public" | "preview";

/** What the guest typed last time, so "Change my response" starts pre-filled. */
interface Draft {
  guestName: string;
  email: string;
  attending: boolean | null;
  partySize: number;
  message: string;
  dietary: string;
}

function publicInfo(): InviteInfo {
  const closed =
    isValidDateString(event.rsvpDeadline) && isValidTimeZone(event.timeZone) && isPastDeadline(event.rsvpDeadline, event.timeZone);
  return { guestName: "", maxPartySize: event.maxGuestsPerInvite ?? DEFAULT_PUBLIC_MAX_PARTY, rsvpStatus: "", partySize: 0, closed };
}

type Phase =
  | { s: "loading" }
  | { s: "error"; message: string }
  | { s: "ready"; info: InviteInfo }
  | { s: "done"; info: InviteInfo; attending: boolean; partySize: number; name: string };

async function postJson<T>(url: string, body: unknown): Promise<{ status: number; data: T | null }> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    credentials: "same-origin",
    cache: "no-store",
  });
  let data: T | null = null;
  try {
    data = (await res.json()) as T;
  } catch {
    data = null;
  }
  return { status: res.status, data };
}

async function celebrate() {
  try {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const { default: confetti } = await import("canvas-confetti");
    const colors = ["#1f48c0", "#8eb5f8", "#ffffff", "#e9c25a", "#d4a437"];
    confetti({ particleCount: 110, spread: 75, origin: { y: 0.7 }, colors, disableForReducedMotion: true });
    setTimeout(
      () => confetti({ particleCount: 60, spread: 110, origin: { y: 0.6 }, colors, scalar: 0.9, disableForReducedMotion: true }),
      350,
    );
  } catch {
    /* confetti is optional */
  }
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <section id="rsvp" aria-labelledby="rsvp-title" className="card scroll-mt-6 px-5 py-8 sm:px-8">
      <h2 id="rsvp-title" className="section-title text-center text-2xl sm:text-3xl">
        RSVP
      </h2>
      {children}
    </section>
  );
}

export function RsvpForm({ invite }: { invite: InviteTokenState }) {
  const { deadlineLabel } = getEventDisplay(event);
  const token = invite.kind === "token" ? invite.token : null;
  const mode: Mode = invite.kind === "token" ? "invite" : invite.kind === "preview" ? "preview" : "public";
  const [phase, setPhase] = useState<Phase>(() => (token ? { s: "loading" } : { s: "ready", info: publicInfo() }));
  const [draft, setDraft] = useState<Draft | null>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        const { status, data } = await postJson<{ ok: boolean; error?: string } & InviteInfo>(
          "/.netlify/functions/invite",
          { inviteToken: token },
        );
        if (cancelled) return;
        if (status === 200 && data?.ok) {
          setPhase({ s: "ready", info: data });
        } else if (status === 404 || status === 400) {
          // Old or broken personal link — fall back to the open RSVP form.
          setPhase({ s: "ready", info: publicInfo() });
        } else {
          setPhase({ s: "error", message: data?.error || "We couldn't load the RSVP form. Please try again shortly." });
        }
      } catch {
        if (!cancelled) setPhase({ s: "error", message: "We couldn't reach the RSVP service. Please check your connection and try again." });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  // A personal link that failed lookup falls back to the public form.
  const effectiveMode: Mode = mode === "invite" && phase.s === "ready" && !phase.info.guestName ? "public" : mode;

  return (
    <Shell>
      {deadlineLabel && phase.s !== "done" && (
        <p className="mt-2 text-center font-semibold text-gold-700">Kindly reply by {deadlineLabel}</p>
      )}
      {mode === "preview" && (
        <p className="mx-auto mt-3 max-w-md rounded-xl bg-gold-300/30 px-4 py-3 text-center font-semibold text-gold-700">
          Preview — responses can&rsquo;t be submitted from a preview link.
        </p>
      )}
      <div aria-live="polite">
        {phase.s === "loading" && (
          <p className="mt-6 flex items-center justify-center gap-3 text-royal-700">
            <span className="h-5 w-5 animate-spin rounded-full border-[3px] border-royal-200 border-t-royal-600 motion-reduce:animate-none" aria-hidden="true" />
            Loading…
          </p>
        )}
        {phase.s === "error" && (
          <div role="alert" className="mx-auto mt-5 max-w-md text-center">
            <p className="text-lg text-ink/85">{phase.message}</p>
            <button type="button" className="btn-royal mt-5" onClick={() => window.location.reload()}>
              Try again
            </button>
          </div>
        )}
        {phase.s === "ready" && (
          <RsvpFields
            info={phase.info}
            mode={effectiveMode}
            token={effectiveMode === "invite" ? token : null}
            initial={draft}
            onDone={(d) => {
              setDraft(d);
              const partySize = d.attending ? d.partySize : 0;
              setPhase({
                s: "done",
                info: { ...phase.info, rsvpStatus: d.attending ? "yes" : "no", partySize },
                attending: !!d.attending,
                partySize,
                name: phase.info.guestName || d.guestName,
              });
              if (d.attending) void celebrate();
            }}
          />
        )}
        {phase.s === "done" && (
          <Confirmation
            name={phase.name}
            attending={phase.attending}
            partySize={phase.partySize}
            onChange={() => setPhase({ s: "ready", info: phase.info })}
          />
        )}
      </div>
    </Shell>
  );
}

function Confirmation({ name, attending, partySize, onChange }: { name: string; attending: boolean; partySize: number; onChange: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => ref.current?.focus(), []);
  return (
    <m.div
      ref={ref}
      tabIndex={-1}
      className="mx-auto mt-5 max-w-md text-center outline-none"
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-royal-600 text-white ring-4 ring-gold-300">
        <CheckIcon className="h-7 w-7" />
      </span>
      <p className="mt-4 font-display text-2xl font-bold text-royal-800">
        {attending ? "We can't wait to celebrate with you!" : "We'll miss you!"}
      </p>
      <p className="mt-2 text-lg text-ink/85">
        Thank you{name ? `, ${name.split(" ")[0]}` : ""}.{" "}
        {attending
          ? `Your RSVP for ${partySize} ${partySize === 1 ? "guest" : "guests"} is saved.`
          : "Your response has been saved. Thank you for letting us know."}
      </p>
      <button type="button" onClick={onChange} className="mt-5 font-bold text-royal-700 underline underline-offset-4">
        Change my response
      </button>
    </m.div>
  );
}

function RsvpFields({
  info,
  mode,
  token,
  initial,
  onDone,
}: {
  info: InviteInfo;
  mode: Mode;
  token: string | null;
  initial: Draft | null;
  onDone: (d: Draft) => void;
}) {
  const uid = useId();
  const max = Math.max(1, info.maxPartySize || 1);
  const [guestName, setGuestName] = useState(initial?.guestName ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [attending, setAttending] = useState<boolean | null>(
    initial ? initial.attending : info.rsvpStatus === "yes" ? true : info.rsvpStatus === "no" ? false : null,
  );
  const [partySize, setPartySize] = useState(Math.min(Math.max(initial?.partySize || info.partySize || 1, 1), max));
  const [message, setMessage] = useState(initial?.message ?? "");
  const [dietary, setDietary] = useState(initial?.dietary ?? "");
  const [honeypot, setHoneypot] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<{ text: string; field?: string } | null>(null);
  const inFlight = useRef(false);
  const openedAt = useRef(Date.now());
  const nameRef = useRef<HTMLInputElement>(null);
  const isPublic = mode === "public";
  const disabled = mode === "preview" || info.closed || (mode === "invite" && !token);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (inFlight.current || disabled) return; // duplicate-submission guard
    if (isPublic && guestName.trim().length < 2) {
      setError({ text: "Please enter your name.", field: "guestName" });
      nameRef.current?.focus();
      return;
    }
    if (attending === null) {
      setError({ text: "Please let us know whether you can attend.", field: "attending" });
      return;
    }
    inFlight.current = true;
    setSubmitting(true);
    setError(null);
    try {
      const body: Record<string, unknown> = isPublic
        ? { guestName: guestName.trim(), attending, website: honeypot, formMs: Date.now() - openedAt.current }
        : { inviteToken: token, attending };
      if (isPublic && email.trim()) body.email = email.trim();
      if (attending) body.partySize = partySize;
      if (message.trim()) body.message = message.trim();
      if (attending && event.askDietaryNotes && dietary.trim()) body.dietaryNotes = dietary.trim();
      const { status, data } = await postJson<{ ok: boolean; error?: string; field?: string }>("/.netlify/functions/rsvp", body);
      if (status === 200 && data?.ok) {
        onDone({ guestName: guestName.trim(), email: email.trim(), attending, partySize, message, dietary });
      } else {
        setError({ text: data?.error || "We couldn't save your RSVP. Please try again.", field: data?.field });
      }
    } catch {
      setError({ text: "We couldn't reach the RSVP service. Please check your connection and try again." });
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  }

  const choice = (value: boolean, label: string, sub: string) => {
    const selected = attending === value;
    return (
      <label
        className={`flex min-h-16 cursor-pointer items-center gap-3 rounded-2xl border-2 px-4 py-3 transition-colors ${
          selected ? "border-royal-600 bg-royal-50" : "border-royal-200 bg-white hover:border-royal-300"
        } ${disabled ? "cursor-not-allowed opacity-70" : ""}`}
      >
        <input
          type="radio"
          name={`${uid}-attending`}
          className="h-5 w-5 accent-royal-600"
          checked={selected}
          onChange={() => {
            setAttending(value);
            if (error?.field === "attending") setError(null);
          }}
          disabled={disabled}
          aria-describedby={error?.field === "attending" ? `${uid}-err` : undefined}
        />
        <span>
          <span className="block font-bold text-royal-900">{label}</span>
          <span className="block text-sm text-ink/70">{sub}</span>
        </span>
      </label>
    );
  };

  return (
    <form onSubmit={onSubmit} noValidate className="relative mx-auto mt-5 max-w-md" aria-busy={submitting}>
      {isPublic ? (
        <p className="text-center text-lg text-ink/85">We&rsquo;d love to know if you can make it!</p>
      ) : (
        <p className="text-center text-lg">
          Welcome{info.guestName ? <>, <strong className="text-royal-800">{info.guestName}</strong></> : null}!
        </p>
      )}
      {!isPublic && info.rsvpStatus && (
        <p className="mt-1 text-center text-sm text-ink/70">
          You already replied — you can update your response below.
        </p>
      )}
      {info.closed && (
        <p className="mt-3 rounded-xl bg-gold-300/30 px-4 py-3 text-center font-semibold text-gold-700">
          RSVPs are now closed. Please contact the family directly with any changes.
        </p>
      )}

      {isPublic && (
        <>
          <div className="mt-5">
            <label htmlFor={`${uid}-name`} className="font-bold text-royal-900">
              Your name
            </label>
            <input
              ref={nameRef}
              id={`${uid}-name`}
              type="text"
              required
              value={guestName}
              maxLength={MAX_NAME_LENGTH}
              onChange={(e) => {
                setGuestName(e.target.value);
                if (error?.field === "guestName") setError(null);
              }}
              disabled={disabled}
              autoComplete="name"
              aria-invalid={error?.field === "guestName" || undefined}
              aria-describedby={error?.field === "guestName" ? `${uid}-err` : undefined}
              className="mt-2 block min-h-12 w-full rounded-xl border-2 border-royal-200 bg-white px-3 text-lg focus:border-royal-600"
            />
          </div>
          <div className="mt-4">
            <label htmlFor={`${uid}-email`} className="font-bold text-royal-900">
              Email <span className="font-normal text-ink/60">(optional)</span>
            </label>
            <input
              id={`${uid}-email`}
              type="email"
              inputMode="email"
              value={email}
              maxLength={MAX_EMAIL_LENGTH}
              onChange={(e) => {
                setEmail(e.target.value);
                if (error?.field === "email") setError(null);
              }}
              disabled={disabled}
              autoComplete="email"
              aria-invalid={error?.field === "email" || undefined}
              aria-describedby={`${uid}-email-hint${error?.field === "email" ? ` ${uid}-err` : ""}`}
              className="mt-2 block min-h-12 w-full rounded-xl border-2 border-royal-200 bg-white px-3 text-lg focus:border-royal-600"
            />
            <p id={`${uid}-email-hint`} className="mt-1 text-sm text-ink/65">
              Need to change your answer later? Just RSVP again with the same email (or name).
            </p>
          </div>
          {/* Honeypot: hidden from people and screen readers; bots tend to fill it in. */}
          <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
            <label>
              Website
              <input type="text" tabIndex={-1} autoComplete="off" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} />
            </label>
          </div>
        </>
      )}

      <fieldset className="mt-5">
        <legend className="mb-2 font-bold text-royal-900">Will you be joining us?</legend>
        <div className="grid gap-3">
          {choice(true, "Joyfully accepts", "Count me in! 🎈")}
          {choice(false, "Regretfully declines", "Sending love from afar 💙")}
        </div>
      </fieldset>

      <AnimatePresence initial={false}>
        {attending && (
          <m.div
            key="party"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            {max > 1 ? (
              <div className="mt-5">
                <label htmlFor={`${uid}-party`} className="font-bold text-royal-900">
                  How many in your party (including you)?
                </label>
                <select
                  id={`${uid}-party`}
                  value={partySize}
                  onChange={(e) => setPartySize(Number(e.target.value))}
                  disabled={disabled}
                  className="mt-2 block min-h-12 w-full rounded-xl border-2 border-royal-200 bg-white px-3 text-lg focus:border-royal-600"
                  aria-describedby={`${uid}-party-hint`}
                >
                  {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>
                      {n} {n === 1 ? "guest" : "guests"}
                    </option>
                  ))}
                </select>
                <p id={`${uid}-party-hint`} className="mt-1 text-sm text-ink/65">
                  {isPublic ? `Up to ${max} people, including you.` : `Your invitation includes up to ${max} ${max === 1 ? "guest" : "guests"}.`}
                </p>
              </div>
            ) : (
              <p className="mt-4 text-sm text-ink/70">This invitation is for 1 guest.</p>
            )}

            {event.askDietaryNotes && (
              <div className="mt-5">
                <label htmlFor={`${uid}-diet`} className="font-bold text-royal-900">
                  Dietary needs <span className="font-normal text-ink/60">(optional)</span>
                </label>
                <input
                  id={`${uid}-diet`}
                  type="text"
                  value={dietary}
                  maxLength={MAX_DIETARY_LENGTH}
                  onChange={(e) => setDietary(e.target.value)}
                  disabled={disabled}
                  autoComplete="off"
                  className="mt-2 block min-h-12 w-full rounded-xl border-2 border-royal-200 bg-white px-3 text-base focus:border-royal-600"
                />
              </div>
            )}
          </m.div>
        )}
      </AnimatePresence>

      <div className="mt-5">
        <label htmlFor={`${uid}-msg`} className="font-bold text-royal-900">
          A note for Zade&rsquo;s family <span className="font-normal text-ink/60">(optional)</span>
        </label>
        <textarea
          id={`${uid}-msg`}
          rows={3}
          value={message}
          maxLength={MAX_MESSAGE_LENGTH}
          onChange={(e) => setMessage(e.target.value)}
          disabled={disabled}
          className="mt-2 block w-full rounded-xl border-2 border-royal-200 bg-white px-3 py-2 text-base focus:border-royal-600"
          aria-describedby={`${uid}-msg-count`}
        />
        <p id={`${uid}-msg-count`} className="mt-1 text-right text-xs text-ink/55">
          {message.length}/{MAX_MESSAGE_LENGTH}
        </p>
      </div>

      {error && (
        <p id={`${uid}-err`} role="alert" className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-center font-semibold text-red-800">
          {error.text}
        </p>
      )}

      <div className="mt-6 text-center">
        <button type="submit" className="btn-royal w-full text-lg sm:w-auto" disabled={submitting || disabled}>
          {submitting ? "Sending…" : info.rsvpStatus || initial ? "Update my RSVP" : "Send my RSVP"}
        </button>
      </div>
    </form>
  );
}

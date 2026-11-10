import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { event, rsvpClosed } from "../config/event";
import { calendarLink, getEventDisplay } from "../lib/event-display";
import type { InviteTokenState } from "../lib/invite-token";
import {
  DEFAULT_PUBLIC_MAX_PARTY,
  MAX_DIETARY_LENGTH,
  MAX_EMAIL_LENGTH,
  MAX_MESSAGE_LENGTH,
  MAX_NAME_LENGTH,
} from "../lib/rsvp-schema";

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
  const closed = rsvpClosed(event);
  return { guestName: "", maxPartySize: event.maxGuestsPerInvite ?? DEFAULT_PUBLIC_MAX_PARTY, rsvpStatus: "", partySize: 0, closed };
}

type Phase =
  | { s: "loading" }
  | { s: "error"; message: string }
  | { s: "ready"; info: InviteInfo }
  /** Only reached once the sheet has confirmed the reply. */
  | { s: "done"; info: InviteInfo; attending: boolean; name: string };

type SendResult = { ok: true } | { ok: false; text: string; field?: string };

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

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section id="rsvp" aria-labelledby="rsvp-title" className="reply-card">
      <p className="reply-kicker">Reply card</p>
      <h3 id="rsvp-title">{title}</h3>
      {children}
    </section>
  );
}

export function RsvpForm({ invite, intro }: { invite: InviteTokenState; intro: string }) {
  const { deadlineLabel } = getEventDisplay(event);
  const token = invite.kind === "token" ? invite.token : null;
  const mode: Mode = invite.kind === "token" ? "invite" : invite.kind === "preview" ? "preview" : "public";
  const [phase, setPhase] = useState<Phase>(() => (token ? { s: "loading" } : { s: "ready", info: publicInfo() }));
  const [draft, setDraft] = useState<Draft | null>(null);
  const sending = useRef(0);

  // The form waits (button says "Sending your RSVP…") until the sheet answers,
  // so the thank-you only ever appears for a reply that was really saved.
  // A refusal (e.g. this name already replied) stays on the form.
  async function send(body: Record<string, unknown>, d: Draft, info: InviteInfo): Promise<SendResult> {
    const id = ++sending.current;
    setDraft(d);
    let result: SendResult;
    try {
      const { status, data } = await postJson<{ ok: boolean; error?: string; field?: string }>("/.netlify/functions/rsvp", body);
      result = status === 200 && data?.ok ? { ok: true } : { ok: false, text: data?.error || "We couldn't save your RSVP. Please try again.", field: data?.field };
    } catch {
      result = { ok: false, text: "We couldn't reach the RSVP service. Please check your connection and try again." };
    }
    if (id !== sending.current) return result;
    if (result.ok) {
      const status = d.attending ? "yes" : "no";
      setPhase({ s: "done", info: { ...info, rsvpStatus: status, partySize: d.attending ? 1 : 0 }, attending: !!d.attending, name: info.guestName || d.guestName });
    }
    return result;
  }

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

  const title = phase.s !== "done" ? "Will you come to Zade’s party?" : phase.attending ? "See you at the party!" : "We’ll miss you!";
  return (
    <Shell title={title}>
      {phase.s !== "done" && (
        <>
          <p className="reply-by">Please reply by {deadlineLabel || "[TBD]"}. {intro}</p>
          <p className="reply-family">Coming as a family? Each adult please RSVP separately. Kids don’t need to.</p>
        </>
      )}
      {mode === "preview" && (
        <p className="reply-note">Preview only. Replies can&rsquo;t be sent from a preview link.</p>
      )}
      <div aria-live="polite" className="reply-live">
        {phase.s === "loading" && (
          <p className="reply-status">Finding your invitation…</p>
        )}
        {phase.s === "error" && (
          <div role="alert" className="reply-status">
            <p>{phase.message}</p>
            <button type="button" className="send-button btn-3d" onClick={() => window.location.reload()}>
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
            onSend={(body, d) => send(body, d, phase.info)}
          />
        )}
        {phase.s === "done" && (
          <Confirmation
            name={phase.name}
            attending={phase.attending}
          />
        )}
      </div>
    </Shell>
  );
}

function Confirmation({ name, attending }: { name: string; attending: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.focus({ preventScroll: true });
    ref.current?.closest(".reply-live")?.scrollTo({ top: 0 });
  }, []);
  const d = getEventDisplay(event);
  const cal = calendarLink(event, d);
  const first = name.trim().split(/\s+/)[0];
  return (
    <div ref={ref} tabIndex={-1} className={`rsvp-confirmation ${attending ? "is-yes" : "is-no"}`}>
      {attending ? <img className="reply-flight" src="/images/book/balloon.webp" alt="" /> : null}
      <div className="thank-you-note">
        <img className="thank-you-crown" src="/images/book/crown.webp" alt="" />
        <p className="thank-you-head">Thank you{first ? `, ${first}` : ""}!</p>
        {attending ? (
          <>
            <p>Zade is so happy you’re coming. We can’t wait to celebrate his first birthday with you.</p>
            <dl className="thank-you-details">
              <div><dt>When</dt><dd>{d.dateLabel}, {d.timeLabel}</dd></div>
              <div><dt>Where</dt><dd>{[event.venueName, event.venueAddress].filter(Boolean).join(", ")}</dd></div>
              {event.dressCode ? <div><dt>Wear</dt><dd>{event.dressCode}</dd></div> : null}
            </dl>
            {cal || d.mapUrl ? (
              <p className="thank-you-links">
                {cal ? <a className="btn-3d thank-you-button" href={cal.href} {...(cal.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>Add to calendar</a> : null}
                {d.mapUrl ? <a href={d.mapUrl} target="_blank" rel="noopener noreferrer">Directions<span className="sr-only"> (opens in a new tab)</span></a> : null}
                {event.registryUrl ? <a href={event.registryUrl} target="_blank" rel="noopener noreferrer">Gift registry<span className="sr-only"> (opens in a new tab)</span></a> : null}
              </p>
            ) : null}
          </>
        ) : (
          <p>Thank you for letting us know. We’ll miss you, and Zade sends you a big hug.</p>
        )}
        <p className="thank-you-status is-saved" role="status">✓ Your reply is saved.</p>
        <p className="thank-you-change">Need to change your reply? Just let Obson &amp; Maelle know.</p>
      </div>
    </div>
  );
}

function RsvpFields({
  info,
  mode,
  token,
  initial,
  onSend,
}: {
  info: InviteInfo;
  mode: Mode;
  token: string | null;
  initial: Draft | null;
  onSend: (body: Record<string, unknown>, d: Draft) => Promise<SendResult>;
}) {
  const uid = useId();
  const [guestName, setGuestName] = useState(initial?.guestName ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [attending, setAttending] = useState<boolean | null>(
    initial ? initial.attending : info.rsvpStatus === "yes" ? true : info.rsvpStatus === "no" ? false : null,
  );
  // No party-size question: the server counts each "yes" as 1.
  const partySize = 1;
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
    const body: Record<string, unknown> = isPublic
      ? { guestName: guestName.trim(), attending, website: honeypot, formMs: Date.now() - openedAt.current }
      : { inviteToken: token, attending };
    if (isPublic && email.trim()) body.email = email.trim();
    if (message.trim()) body.message = message.trim();
    if (attending && event.askDietaryNotes && dietary.trim()) body.dietaryNotes = dietary.trim();
    const result = await onSend(body, { guestName: guestName.trim(), email: email.trim(), attending, partySize, message, dietary });
    // On success this form is replaced by the thank-you card.
    if (!result.ok) {
      setError({ text: result.text, field: result.field });
      inFlight.current = false;
      setSubmitting(false);
    }
  }

  const choice = (value: boolean, label: string, sub: string) => {
    const selected = attending === value;
    return (
      <label className={`choice ${selected ? "is-selected" : ""}`}>
        <input
          type="radio"
          name={`${uid}-attending`}
          checked={selected}
          onChange={() => {
            setAttending(value);
            if (error?.field === "attending") setError(null);
          }}
          disabled={disabled}
          aria-describedby={error?.field === "attending" ? `${uid}-err` : undefined}
        />
        <span>
          <strong>{label}</strong>
          <small>{sub}</small>
        </span>
      </label>
    );
  };

  return (
    <form onSubmit={onSubmit} noValidate className="reply-form" aria-busy={submitting}>
      {/* Only this part scrolls; the Send button below always stays in view. */}
      <div className="reply-fields">
      {!isPublic && info.guestName ? <p className="reply-welcome">Hello, <strong>{info.guestName}</strong>.</p> : null}
      {!isPublic && info.rsvpStatus && (
        <p className="reply-hint">
          You already replied. You can update your response below.
        </p>
      )}
      {info.closed && (
        <p className="reply-note">
          RSVPs are now closed. Please contact the family directly with any changes.
        </p>
      )}

      {isPublic && (
        <>
          <div className="field">
            <label htmlFor={`${uid}-name`} className="field-label">
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
            />
          </div>
          <div className="field">
            <label htmlFor={`${uid}-email`} className="field-label">
              Email <span>(optional)</span>
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
            />
            <p id={`${uid}-email-hint`} className="reply-hint">
              So we can reach you if plans change.
            </p>
          </div>
          {/* Honeypot: hidden from people and screen readers; bots tend to fill it in. */}
          <div aria-hidden="true" className="honeypot">
            <label>
              Website
              <input type="text" tabIndex={-1} autoComplete="off" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} />
            </label>
          </div>
        </>
      )}

      <fieldset className="field choices">
        <legend className="field-label">Will you be joining us?</legend>
        <div>
          {choice(true, "Yes, I’ll be there", "Please count us in.")}
          {choice(false, "Sorry, I can’t make it", "Sending Zade our love.")}
        </div>
      </fieldset>

      <>
        {attending && (
          <div key="party">
            {event.askDietaryNotes && (
              <div className="field">
                <label htmlFor={`${uid}-diet`} className="field-label">
                  Dietary needs <span>(optional)</span>
                </label>
                <input
                  id={`${uid}-diet`}
                  type="text"
                  value={dietary}
                  maxLength={MAX_DIETARY_LENGTH}
                  onChange={(e) => setDietary(e.target.value)}
                  disabled={disabled}
                  autoComplete="off"
                />
              </div>
            )}
          </div>
        )}
      </>

      <div className="field">
        <label htmlFor={`${uid}-msg`} className="field-label">
          A note for Zade&rsquo;s family <span>(optional)</span>
        </label>
        <textarea
          id={`${uid}-msg`}
          rows={3}
          value={message}
          maxLength={MAX_MESSAGE_LENGTH}
          onChange={(e) => setMessage(e.target.value)}
          disabled={disabled}
          aria-describedby={`${uid}-msg-count`}
        />
        <p id={`${uid}-msg-count`} className="reply-count">
          {message.length}/{MAX_MESSAGE_LENGTH}
        </p>
      </div>

      </div>

      {/* The error sits in the sticky bar with Send, so it is always on screen. */}
      <div className="reply-send">
        {error && (
          <p id={`${uid}-err`} role="alert" className="reply-error">
            {error.text}
          </p>
        )}

        <button type="submit" className="send-button btn-3d" disabled={submitting || disabled}>
          {submitting ? "Sending your RSVP…" : info.rsvpStatus ? "Update my RSVP" : "Send RSVP"}
        </button>
      </div>
    </form>
  );
}

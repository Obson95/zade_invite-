import { useEffect, useId, useRef, useState, type FormEvent } from "react";
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

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <section id="rsvp" aria-labelledby="rsvp-title" className="reply-card">
      <p className="reply-kicker">Reply card</p>
      <h3 id="rsvp-title">Will you come to Zade’s party?</h3>
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
      {phase.s !== "done" && (
        <p className="reply-by">Please reply by {deadlineLabel || "[TBD]"}. {intro}</p>
      )}
      {mode === "preview" && (
        <p className="reply-note">Preview only. Replies can&rsquo;t be sent from a preview link.</p>
      )}
      <div aria-live="polite">
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
            }}
          />
        )}
        {phase.s === "done" && (
          <Confirmation
            name={phase.name}
            attending={phase.attending}
            onChange={() => setPhase({ s: "ready", info: phase.info })}
          />
        )}
      </div>
    </Shell>
  );
}

function Confirmation({ name, attending, onChange }: { name: string; attending: boolean; onChange: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => ref.current?.focus({ preventScroll: true }), []);
  return (
    <div ref={ref} tabIndex={-1} className="rsvp-confirmation">
      <img className="reply-flight" src="/images/book/balloon.webp" alt="" />
      <div className="thank-you-note">
        <p className="thank-you-head">{attending ? "We’ll save you a place." : "We’ll miss you."}</p>
        <p>
          Thank you{name ? `, ${name.split(" ")[0]}` : ""}.{" "}
          {attending
            ? "Your RSVP is saved. We can’t wait to see you."
            : "Your reply is saved. Thank you for letting us know."}
        </p>
        <button type="button" onClick={onChange} className="change-reply">Change my response</button>
      </div>
    </div>
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
    try {
      const body: Record<string, unknown> = isPublic
        ? { guestName: guestName.trim(), attending, website: honeypot, formMs: Date.now() - openedAt.current }
        : { inviteToken: token, attending };
      if (isPublic && email.trim()) body.email = email.trim();
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
              Need to change your answer later? Just RSVP again with the same email (or name).
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

      {error && (
        <p id={`${uid}-err`} role="alert" className="reply-error">
          {error.text}
        </p>
      )}

      <div className="reply-send">
        <button type="submit" className="send-button btn-3d" disabled={submitting || disabled}>
          {submitting ? "Sending…" : info.rsvpStatus || initial ? "Update my RSVP" : "Send RSVP"}
        </button>
      </div>
    </form>
  );
}

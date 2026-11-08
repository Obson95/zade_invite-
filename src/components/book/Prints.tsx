import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { PhotoSlot, VideoSlot } from "../../config/book";

/** A photo print laid on the page. `tilt` is in degrees. */
export function Print({ photo, tilt = 0, order = 0, tape = true, className = "" }: { photo: PhotoSlot; tilt?: number; order?: number; tape?: boolean; className?: string }) {
  const style = { "--tilt": `${tilt}deg`, "--order": order, "--photo-ar": photo.width / photo.height } as CSSProperties;
  const fit: CSSProperties = { objectPosition: photo.focus, objectFit: photo.fit };
  return (
    <figure className={`print ${tape ? "has-tape" : ""} ${className}`} style={style}>
      {/* The photo is pinned inside its own box so the caption always stays inside the white print, on every browser. */}
      <div className="print-photo">
        <img src={photo.src} alt={photo.alt} width={photo.width} height={photo.height} decoding="async" draggable={false} style={fit} />
      </div>
      {photo.caption ? <figcaption>{photo.caption}</figcaption> : null}
    </figure>
  );
}

function isPlayerLink(url: string) {
  return /^https:\/\/(www\.youtube-nocookie\.com|www\.youtube\.com|player\.vimeo\.com)\//.test(url);
}

function embedUrl(url: string) {
  const link = new URL(url);
  link.searchParams.set("autoplay", "1");
  link.searchParams.set("mute", "1");
  link.searchParams.set("muted", "1");
  link.searchParams.set("cc_load_policy", "1");
  return link.toString();
}

const REDUCED = "(prefers-reduced-motion: reduce)";

/**
 * A file video plays by itself, muted and looping, while its page is open,
 * and pauses when the page turns. The speaker button turns sound on. If the
 * phone refuses autoplay (low-power mode) or the reader prefers less motion,
 * it waits for a tap instead. Player links (YouTube/Vimeo) load only on tap.
 */
export function VideoFrame({ video, active, order = 0, className = "" }: { video: VideoSlot; active: boolean; order?: number; className?: string }) {
  const embed = video.embed && isPlayerLink(video.embed) ? video.embed : null;
  const auto = Boolean(video.src) && !embed && !window.matchMedia(REDUCED).matches;
  const [started, setStarted] = useState(auto);
  const [blocked, setBlocked] = useState(false);
  const [muted, setMuted] = useState(true);
  const [waiting, setWaiting] = useState(false);
  const player = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = player.current;
    if (!active) {
      v?.pause();
      if (embed) setStarted(false);
      return;
    }
    if (v && auto) {
      v.play().then(() => setBlocked(false), () => setBlocked(true));
    }
  }, [active, auto, embed, started]);

  function play() {
    if (player.current) {
      void player.current.play().then(() => setBlocked(false), () => setBlocked(true));
      return;
    }
    if (video.src || embed) setStarted(true);
    else setWaiting(true);
  }

  function toggleSound() {
    const v = player.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
    if (v.paused) void v.play().catch(() => setBlocked(true));
  }

  return (
    <figure className={`video-frame ${className}`} style={{ "--order": order } as CSSProperties}>
      <div className="video-mat">
        {started && embed ? (
          // YouTube refuses to play with no referrer at all, which is this site's default.
          <iframe src={embedUrl(embed)} title={video.title} allow="autoplay; fullscreen; picture-in-picture" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
        ) : started ? (
          <>
            <video
              ref={player}
              src={video.src}
              poster={video.poster}
              muted
              loop={auto}
              autoPlay={!auto}
              controls={!auto}
              playsInline
              preload={auto ? "auto" : "metadata"}
              aria-label={video.title}
              onClick={auto ? toggleSound : undefined}
            >
              {video.captions ? <track kind="captions" src={video.captions} srcLang="en" label="English" default /> : null}
            </video>
            {auto && blocked ? (
              <button type="button" className="video-poster video-cover" onClick={play} aria-label={`Play video: ${video.title}`}>
                <img className="video-play" src="/images/book/play.webp" alt="" width={220} height={220} />
              </button>
            ) : null}
            {auto && !blocked ? (
              <button type="button" className="video-sound" onClick={toggleSound} aria-pressed={!muted} aria-label={`Sound for ${video.title}`}>
                <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor" />
                  {muted ? <path d="M17 9l5 6M22 9l-5 6" /> : <path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" />}
                </svg>
              </button>
            ) : null}
          </>
        ) : (
          <button type="button" className="video-poster" onClick={play} aria-label={`Play video: ${video.title}`}>
            <img src={video.poster} alt={video.posterAlt} decoding="async" draggable={false} />
            <img className="video-play" src="/images/book/play.webp" alt="" width={220} height={220} />
          </button>
        )}
      </div>
      <figcaption>
        <strong>{video.title}</strong>
        {video.caption ? <span>{video.caption}</span> : null}
        {waiting ? <span role="status">This video is still on its way.</span> : null}
      </figcaption>
    </figure>
  );
}

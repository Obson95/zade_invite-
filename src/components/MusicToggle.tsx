import { useEffect, useRef, useState } from "react";
import { event } from "../config/event";
import { MusicIcon, PauseIcon } from "./Icons";

/**
 * Optional background music. OFF by default, never autoplays, and loads
 * nothing until the guest presses play. Hidden entirely unless a track you
 * own or have licensed is set in src/config/event.ts → music.src.
 */
export function MusicToggle() {
  const src = event.music.src;
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [saveData, setSaveData] = useState(false);

  useEffect(() => {
    const nav = navigator as Navigator & { connection?: { saveData?: boolean } };
    const reducedData = window.matchMedia?.("(prefers-reduced-data: reduce)").matches;
    setSaveData(Boolean(nav.connection?.saveData || reducedData));
    return () => audioRef.current?.pause();
  }, []);

  if (!src) return null;

  async function toggle() {
    if (!audioRef.current) {
      const a = new Audio();
      a.preload = "none";
      a.loop = true;
      a.volume = 0.5;
      a.src = src!;
      a.addEventListener("pause", () => setPlaying(false));
      a.addEventListener("play", () => setPlaying(true));
      audioRef.current = a;
    }
    const a = audioRef.current;
    if (a.paused) {
      try {
        await a.play();
      } catch {
        setPlaying(false);
      }
    } else {
      a.pause();
    }
  }

  const title = event.music.title ? `: ${event.music.title}` : "";
  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={playing}
      aria-label={playing ? `Pause music${title}` : `Play music${title}${saveData ? " (uses data)" : ""}`}
      className="music-toggle"
    >
      {playing ? <PauseIcon /> : <MusicIcon />}
    </button>
  );
}

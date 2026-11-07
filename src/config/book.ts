/**
 * ─────────────────────────────────────────────────────────────────────────
 *  THE ONE PLACE TO EDIT THE BOOK
 * ─────────────────────────────────────────────────────────────────────────
 *  - Reorder, remove or add pages by editing the `pages` array at the bottom.
 *    Spreads, page numbers and the contents list all follow from it.
 *  - To use a real photo: put it in public/images, then change `src`, `alt`
 *    and `caption` on its slot here. Nothing else needs to change.
 *  - To use a real video: put a compressed MP4 in public/videos and set `src`
 *    (or set `embed` to a YouTube/Vimeo player link) on its slot, along with
 *    `poster` and, ideally, `captions` (a .vtt file).
 *  - Anything in [square brackets] is waiting for your words.
 *
 *  Party facts (date, time, venue, dress code) live in src/config/event.ts.
 */

export interface PhotoSlot {
  src: string;
  alt: string;
  /** Handwritten-style note under the print. */
  caption?: string;
  width: number;
  height: number;
}

export interface VideoSlot {
  title: string;
  caption?: string;
  /** Still image shown before the video plays. */
  poster: string;
  posterAlt: string;
  /** Compressed MP4, e.g. "/videos/first-laugh.mp4". */
  src?: string;
  /** Player link instead of a file, e.g. "https://www.youtube-nocookie.com/embed/VIDEO_ID". */
  embed?: string;
  /** WebVTT captions, e.g. "/videos/first-laugh.vtt". */
  captions?: string;
}

export interface Milestone {
  label: string;
  when: string;
  note: string;
  photo: PhotoSlot;
}

interface PageBase {
  /** Used in links such as /#the-party. Keep it short and unique. */
  id: string;
  /** Shown as the page heading and in the contents list. */
  title: string;
}

export type BookPage =
  | (PageBase & { kind: "story"; chapter: string; opening: string; body: string; portrait: PhotoSlot })
  | (PageBase & { kind: "arrival"; body: string[]; photos: PhotoSlot[] })
  | (PageBase & { kind: "milestones"; intro: string; items: Milestone[] })
  | (PageBase & { kind: "videos"; intro: string; videos: VideoSlot[] })
  | (PageBase & { kind: "collage"; intro: string; photos: PhotoSlot[] })
  | (PageBase & { kind: "party"; intro: string })
  | (PageBase & { kind: "letter"; body: string[]; creole: string; creoleMeaning: string; signOff: string; photo: PhotoSlot })
  | (PageBase & { kind: "rsvp"; intro: string });

const placeholder = (n: 1 | 2 | 3 | 4 | 5, alt: string, caption: string): PhotoSlot => {
  const size = { 1: [600, 720], 2: [600, 600], 3: [720, 540], 4: [600, 720], 5: [720, 540] }[n];
  return { src: `/images/book/placeholder-${n}.webp`, alt, caption, width: size[0], height: size[1] };
};

export const covers = {
  title: "Zade",
  titleRest: "is one",
  tagline: "A small book for the people who love him",
  openHint: "Open the book",
  photo: { src: "/images/book/zade-cutout.webp", alt: "Zade standing in a light blue vest and trousers, his hands clasped.", width: 720, height: 1062 } satisfies PhotoSlot,
  bookplate: "This book belongs to everyone who loves Zade.",
  closingNote: "See you at the party.",
  thanks: "Thank you for reading, and for loving our boy.",
  theEnd: "The End… of chapter one",
};

export const pages: BookPage[] = [
  {
    id: "once-upon-a-time",
    kind: "story",
    title: "Once upon a time",
    chapter: "Chapter one",
    opening: "Once upon a time, a little prince named Zade arrived…",
    body: "Now he is almost one. We made this book to show you his first year, and to ask you to come to his party.",
    portrait: { src: "/images/book/zade-portrait.webp", alt: "A close portrait of Zade in a light blue vest, looking straight at the camera.", width: 683, height: 1024 },
  },
  {
    id: "the-day-he-arrived",
    kind: "arrival",
    title: "The day he arrived",
    body: ["We counted his fingers. We counted his toes. Then we just looked at him.", "[Add the date, the time, and one thing you remember about that day.]"],
    photos: [
      placeholder(1, "Placeholder for a newborn photo of Zade.", "[Newborn photo]"),
      placeholder(2, "Placeholder for a second newborn photo.", "[First time held]"),
      placeholder(3, "Placeholder for a third newborn photo.", "[Coming home]"),
    ],
  },
  {
    id: "first-year",
    kind: "milestones",
    title: "Zade’s first year",
    intro: "It went fast. Here is some of it.",
    items: [
      { label: "Hello, Zade", when: "[Date]", note: "[A memory from the day you met him.]", photo: placeholder(4, "Placeholder for a photo from Zade’s first days.", "") },
      { label: "That first smile", when: "[Month]", note: "[What made him smile?]", photo: placeholder(5, "Placeholder for a photo of Zade smiling.", "") },
      { label: "Finding his feet", when: "[Month]", note: "[A favorite moment as he grew.]", photo: placeholder(2, "Placeholder for a photo of Zade growing.", "") },
      { label: "One whole year", when: "[Date]", note: "[What you love about him right now.]", photo: placeholder(1, "Placeholder for a recent photo of Zade.", "") },
    ],
  },
  {
    id: "watch-him-grow",
    kind: "videos",
    title: "Watch him grow",
    intro: "A photo can’t do these justice. Press play. The sound starts off.",
    videos: [
      { title: "His first laugh", caption: "[Add the date]", poster: "/images/book/placeholder-6.webp", posterAlt: "Placeholder picture for the first laugh video." },
      { title: "His first steps", caption: "[Add the date]", poster: "/images/book/placeholder-3.webp", posterAlt: "Placeholder picture for the first steps video." },
      { title: "[Name this video]", caption: "[Add the date]", poster: "/images/book/placeholder-5.webp", posterAlt: "Placeholder picture for a third video." },
    ],
  },
  {
    id: "little-moments",
    kind: "collage",
    title: "Little moments",
    intro: "The small things we want to remember.",
    photos: [
      { src: "/images/zade-standing-683.webp", alt: "Zade standing in a hallway in his light blue outfit and white shoes.", caption: "All dressed up", width: 683, height: 1024 },
      placeholder(2, "Placeholder for a photo of Zade’s favorite toy.", "[Favorite toy]"),
      placeholder(3, "Placeholder for a mealtime photo.", "[Favorite food]"),
      placeholder(4, "Placeholder for a bath time photo.", "[Bath time]"),
      placeholder(5, "Placeholder for a photo of Zade asleep.", "[Nap time]"),
      placeholder(1, "Placeholder for a photo of Zade with someone he loves.", "[His favorite person]"),
    ],
  },
  {
    id: "the-party",
    kind: "party",
    title: "The party",
    intro: "Zade is turning one, and we would love for you to be there. Here is what we know so far.",
  },
  {
    id: "from-mom-and-dad",
    kind: "letter",
    title: "A note from Mom & Dad",
    body: ["Thank you for loving our boy.", "It means so much to have you in Zade’s life. We hope you can spend this day with us."],
    creole: "Nou pa ka tann pou nou fete avè w!",
    creoleMeaning: "We can’t wait to celebrate with you.",
    signOff: "Obson & [wife’s name]",
    photo: { src: "/images/family-576.webp", alt: "Zade with his mom and dad at church.", width: 576, height: 1024 },
  },
  {
    id: "rsvp",
    kind: "rsvp",
    title: "RSVP",
    intro: "Let us know if you can come, so we can plan for you.",
  },
];

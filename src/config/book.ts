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
  /** Which part stays in view when the print crops the photo, e.g. "50% 20%". */
  focus?: string;
  /** "contain" shows the whole photo instead of cropping it to the print. */
  fit?: "contain";
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
  /** Optional date or month shown under the label. */
  when?: string;
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
  | (PageBase & { kind: "letter"; body: string[]; creole: string; creoleMeaning: string; signOff: string; photo: PhotoSlot; middlePhoto?: PhotoSlot })
  | (PageBase & { kind: "rsvp"; intro: string });

/** A photo from public/images/photos, made by scripts/prepare-media.py. */
/** Show the whole photo, uncropped, inside the print. */
const whole = (slot: PhotoSlot): PhotoSlot => ({ ...slot, fit: "contain" });

const photo = (name: string, width: number, height: number, alt: string, caption = "", focus?: string): PhotoSlot => ({
  src: `/images/photos/${name}.webp`, alt, caption, width, height, focus,
});

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
    body: ["We counted his fingers. We counted his toes. Then we just looked at him.", "The world got a little brighter that day, and it has been brighter ever since."],
    photos: [
      whole(photo("newborn", 900, 1200, "Newborn Zade asleep in a hospital bassinet, swaddled in a striped blanket and a white hat.", "Brand new")),
      whole(photo("first-time-held", 675, 1200, "Newborn Zade wrapped in a white blanket, held in a hospital bed, eyes wide open.", "First time held")),
      whole(photo("coming-home", 675, 1200, "Newborn Zade asleep in his car seat in a white knit hat, ready to go home.", "Coming home")),
    ],
  },
  {
    id: "first-year",
    kind: "milestones",
    title: "Zade’s first year",
    intro: "It went fast. Here is some of it.",
    items: [
      { label: "Hello, Zade", note: "The first day we met him. He was so small and so cute.", photo: photo("hello-zade", 900, 1200, "Newborn Zade asleep in a striped hospital blanket and a little hat.", "", "50% 40%") },
      { label: "That first smile", note: "He loves to laugh, and when he laughs, everyone in the room laughs with him.", photo: photo("first-smile", 675, 1200, "Baby Zade in his bouncer with a white bib, smiling a big gummy smile.", "", "50% 22%") },
      { label: "Finding his feet", note: "Pulling himself up on anything he could reach, and so proud of it.", photo: photo("finding-his-feet", 675, 1200, "Zade sitting in his activity center in the living room, playing with the toys.", "", "50% 55%") },
      { label: "One whole year", note: "Curious, cheerful, and full of personality. We love who he is becoming.", photo: photo("one-whole-year", 768, 1024, "Zade at one year old in a brown sweater, smiling at the camera.") },
    ],
  },
  {
    id: "watch-him-grow",
    kind: "videos",
    title: "Watch him grow",
    intro: "A photo can’t do these justice. Tap the speaker for sound.",
    videos: [
      { title: "His first steps", caption: "One step, then another.", src: "/videos/first-steps.mp4", poster: "/images/photos/first-steps-poster.webp", posterAlt: "Zade in his baby walker in the living room." },
      { title: "Off he goes", caption: "And now there is no stopping him.", src: "/videos/off-he-goes.mp4", poster: "/images/photos/off-he-goes-poster.webp", posterAlt: "Zade walking on his own across a wooden floor." },
    ],
  },
  {
    id: "little-moments",
    kind: "collage",
    title: "Little moments",
    intro: "The small things we want to remember.",
    photos: [
      photo("favorite-food", 676, 1200, "Zade in his high chair with a plate of pasta, food all over his hands.", "Favorite food", "50% 35%"),
      photo("nap-time", 675, 1200, "Zade fast asleep on a soft blanket with his pacifier clip.", "Nap time", "50% 22%"),
      photo("favorite-person", 1200, 675, "Zade’s mom holding him close at an indoor playground.", "His favorite person"),
      { src: "/images/zade-standing-683.webp", alt: "Zade standing in a hallway in his light blue outfit and white shoes.", caption: "All dressed up", width: 683, height: 1024, focus: "50% 30%" },
      photo("playtime", 600, 800, "Zade standing at a colorful play table, looking at the camera.", "Playtime", "50% 30%"),
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
    signOff: "Obson & Maelle",
    photo: { src: "/images/family-576.webp", alt: "Zade with his mom and dad at church.", width: 576, height: 1024 },
    middlePhoto: photo("mom-and-dad", 1200, 996, "Zade dressed up in black, held by his mom with his dad beside them.", "The three of us"),
  },
  {
    id: "rsvp",
    kind: "rsvp",
    title: "RSVP",
    intro: "Let us know if you can come, so we can plan for you.",
  },
];

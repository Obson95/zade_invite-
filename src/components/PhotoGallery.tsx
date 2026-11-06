import { m } from "motion/react";

const PHOTOS = [
  {
    base: "/images/zade-683",
    small: "/images/zade-400",
    sw: 400,
    w: 683,
    h: 1024,
    alt: "Close-up portrait of Zade in a light-blue vest with a navy pocket square.",
    caption: "Our little prince",
  },
  {
    base: "/images/family-576",
    small: "/images/family-480",
    sw: 480,
    w: 576,
    h: 1024,
    alt: "Zade with his mom and dad at church.",
    caption: "Our family",
  },
  {
    base: "/images/zade-standing-683",
    small: "/images/zade-standing-480",
    sw: 480,
    w: 683,
    h: 1024,
    alt: "Zade standing in a light-blue vest and trousers with white shoes.",
    caption: "Dressed in blue",
  },
];

export function PhotoGallery() {
  return (
    <section id="photos" aria-labelledby="photos-title" className="py-2">
      <h2 id="photos-title" className="section-title text-center text-2xl sm:text-3xl">
        A whole year of loving you
      </h2>
      <p className="gallery-intro">Little moments. Our most treasured memories.</p>
      <ul className="snap-row -mx-4 mt-5 flex gap-4 overflow-x-auto px-[12%] pb-4 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0">
        {PHOTOS.map((p, i) => (
          <m.li
            key={p.base}
            className="w-[76%] shrink-0 sm:w-auto"
            initial={{ opacity: 0, y: 30, scale: 0.97 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.6, delay: i * 0.12 }}
          >
            <figure className="gold-ring rounded-[1.6rem] p-[3px] shadow-[0_18px_36px_-18px_rgba(23,47,122,0.55)]">
              <div className="overflow-hidden rounded-[1.45rem] bg-white">
              <picture>
                <source type="image/webp" srcSet={`${p.small}.webp ${p.sw}w, ${p.base}.webp ${p.w}w`} sizes="(min-width: 640px) 30vw, 76vw" />
                <img
                  src={`${p.base}.jpg`}
                  srcSet={`${p.small}.jpg ${p.sw}w, ${p.base}.jpg ${p.w}w`}
                  sizes="(min-width: 640px) 30vw, 76vw"
                  width={p.w}
                  height={Math.round(p.w * 1.25)}
                  alt={p.alt}
                  loading="lazy"
                  decoding="async"
                  className="block aspect-[4/5] w-full bg-royal-100 object-cover object-[50%_30%]"
                />
              </picture>
              <figcaption className="py-2 text-center font-script text-xl font-bold text-royal-800">{p.caption}</figcaption>
              </div>
            </figure>
          </m.li>
        ))}
      </ul>
    </section>
  );
}

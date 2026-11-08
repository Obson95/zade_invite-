"""Turn full-size phone photos and videos into small web files for the book.

Originals live in media-originals/ (kept out of git and out of the website).
Run:  python scripts/prepare-media.py [path/to/ffmpeg]
Needs Pillow and pillow-heif; videos need ffmpeg.

Photos  -> public/images/photos/<name>.webp  (longest side 1200px)
Videos  -> public/videos/<name>.mp4          (540px wide, H.264, starts fast)
Posters -> public/images/photos/<name>-poster.webp
"""

import os
import subprocess
import sys

from PIL import Image, ImageOps
from pillow_heif import register_heif_opener

register_heif_opener()

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "media-originals")
PHOTOS = os.path.join(ROOT, "public", "images", "photos")
VIDEOS = os.path.join(ROOT, "public", "videos")
LONG_EDGE = 1200

# original file -> web name
PHOTO_FILES = {
    "new_born.JPEG": "newborn",
    "first_time_held.JPG": "first-time-held",
    "coming_home.jpg": "coming-home",
    "first_smile.png": "first-smile",
    "Happy_zade.jpeg": "happy-zade",
    "finding_his_feet.JPG": "finding-his-feet",
    "whole_year_2.JPG": "one-whole-year",
    "whole_year.JPG": "playtime",
    "favoraite_food.heic": "favorite-food",
    "nap_time.JPG": "nap-time",
    "favorite_person.jpeg": "favorite-person",
    "mom_dad.JPEG": "mom-and-dad",
}
VIDEO_FILES = {"first_step.mov": "first-steps", "first_steps-2.mov": "off-he-goes"}


def trim_black_bars(im: Image.Image) -> Image.Image:
    """Screenshots of videos come with black bars; cut them off."""
    box = im.convert("L").point(lambda v: 255 if v > 18 else 0).getbbox()
    return im.crop(box) if box else im


def photo(src: str, name: str) -> None:
    im = ImageOps.exif_transpose(Image.open(os.path.join(SRC, src))).convert("RGB")
    im = trim_black_bars(im)
    im.thumbnail((LONG_EDGE, LONG_EDGE), Image.LANCZOS)
    out = os.path.join(PHOTOS, f"{name}.webp")
    im.save(out, "WEBP", quality=80, method=6)
    print(f"{name}: {im.width}x{im.height}, {os.path.getsize(out) // 1024} KB")


def video(ffmpeg: str, src: str, name: str) -> None:
    path = os.path.join(SRC, src)
    mp4 = os.path.join(VIDEOS, f"{name}.mp4")
    subprocess.run([ffmpeg, "-y", "-loglevel", "error", "-i", path, "-vf", "scale=540:-2", "-c:v", "libx264",
                    "-preset", "slow", "-crf", "27", "-profile:v", "high", "-pix_fmt", "yuv420p", "-c:a", "aac",
                    "-b:a", "96k", "-movflags", "+faststart", "-map_metadata", "-1", mp4], check=True)
    jpg = os.path.join(PHOTOS, f"{name}-poster.jpg")
    subprocess.run([ffmpeg, "-y", "-loglevel", "error", "-ss", "1", "-i", path, "-frames:v", "1", "-vf", "scale=540:-2", jpg], check=True)
    poster = Image.open(jpg).convert("RGB")
    poster.save(os.path.join(PHOTOS, f"{name}-poster.webp"), "WEBP", quality=78, method=6)
    os.remove(jpg)
    print(f"{name}: video {os.path.getsize(mp4) // 1024} KB, poster {poster.width}x{poster.height}")


def main() -> None:
    os.makedirs(PHOTOS, exist_ok=True)
    os.makedirs(VIDEOS, exist_ok=True)
    for src, name in PHOTO_FILES.items():
        photo(src, name)
    if len(sys.argv) > 1:
        for src, name in VIDEO_FILES.items():
            video(sys.argv[1], src, name)


if __name__ == "__main__":
    main()

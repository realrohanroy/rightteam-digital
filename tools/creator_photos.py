"""Turn the creator photo uploads (extracted Drive zip) into web-ready images.

Usage (from the project folder):
    python -I tools/creator_photos.py "path/to/extracted/drive/folder"
    python -I tools/creators_from_form.py "path/to/Form responses.csv"   # links them

For each handle in tools/creator_photo_map.json it finds the uploaded file whose
name ends with " - <uploader>" (or contains the given text), then writes:
  assets/creators/<handle>.jpg      600x660 card/profile crop
  assets/creators/<handle>-sq.jpg   240x240 face-centred avatar
Faces are found with OpenCV when available; otherwise the crop favours the top.
All metadata (EXIF, including GPS location) is dropped on re-encode.
"""
import json, sys
from pathlib import Path
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "assets" / "creators"
MAP = json.loads((Path(__file__).parent / "creator_photo_map.json").read_text(encoding="utf-8"))
IMG_EXT = {".jpg", ".jpeg", ".png", ".webp"}

try:
    import cv2, numpy as np
    CASCADE = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
except Exception:  # OpenCV optional
    cv2 = None


def face_centre(im):
    """(cx, cy) of the largest face in pixel coords, or None."""
    if cv2 is None:
        return None
    g = cv2.cvtColor(np.array(im.convert("RGB")), cv2.COLOR_RGB2GRAY)
    s = 800 / max(g.shape)
    small = cv2.resize(g, None, fx=s, fy=s) if s < 1 else g
    faces = CASCADE.detectMultiScale(small, 1.1, 6, minSize=(36, 36))
    if len(faces) == 0:
        return None
    x, y, w, h = max(faces, key=lambda f: f[2] * f[3])
    k = 1 / s if s < 1 else 1
    return ((x + w / 2) * k, (y + h / 2) * k, w * k)


def crop(im, aspect, centre, zoom=1.0):
    """Largest crop of the given aspect (w/h) around centre, optionally zoomed in."""
    W, H = im.size
    cw = min(W, H * aspect) / zoom
    ch = cw / aspect
    cx, cy = centre
    x = min(max(cx - cw / 2, 0), W - cw)
    y = min(max(cy - ch / 2, 0), H - ch)
    return im.crop((int(x), int(y), int(x + cw), int(y + ch)))


def main(src):
    src = Path(src)
    files = [p for p in src.rglob("*") if p.suffix.lower() in IMG_EXT]
    OUT.mkdir(parents=True, exist_ok=True)
    done, missing = [], []
    for handle, who in MAP.items():
        if handle == "_help":
            continue
        match = [p for p in files if p.stem.endswith(" - " + who) or who in p.stem]
        if not match:
            missing.append(f"{handle} ({who})"); continue
        im = ImageOps.exif_transpose(Image.open(match[0])).convert("RGB")
        f = face_centre(im)
        W, H = im.size
        # card: keep head in the upper third; avatar: tight on the face
        card_c = (f[0], f[1] + (H * 0.18 if f else 0)) if f else (W / 2, H * 0.38)
        card = crop(im, 600 / 660, card_c).resize((600, 660), Image.LANCZOS)
        if f:
            zoom = max(1.0, min(4.0, min(W, H) / (f[2] * 2.6)))
            sq = crop(im, 1, (f[0], f[1]), zoom)
        else:
            sq = crop(im, 1, (W / 2, H * 0.32))
        sq = sq.resize((240, 240), Image.LANCZOS)
        card.save(OUT / f"{handle}.jpg", "JPEG", quality=80, optimize=True, progressive=True)
        sq.save(OUT / f"{handle}-sq.jpg", "JPEG", quality=82, optimize=True)
        done.append(f"{handle}{'' if f else ' (no face found: top crop)'}")
    print(f"processed {len(done)}: " + ", ".join(done))
    if missing:
        print("NOT FOUND: " + ", ".join(missing))


if __name__ == "__main__":
    main(sys.argv[1])

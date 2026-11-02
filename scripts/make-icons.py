from PIL import Image, ImageDraw, ImageFont
import os

OUT = os.path.join("public")
os.makedirs(OUT, exist_ok=True)

PURPLE = (168, 85, 247)
CYAN = (34, 211, 238)
BG = (14, 14, 22)


def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def make_icon(size, font_path):
    scale = 4
    s = size * scale
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Rounded background
    draw.rounded_rectangle([0, 0, s - 1, s - 1], radius=int(s * 0.22), fill=BG)

    # Gradient ring (drawn as segments)
    cx, cy, radius = s / 2, s / 2, s * 0.30
    width = max(2, int(s * 0.035))
    steps = 180
    for i in range(steps):
        t0 = i / steps
        t1 = (i + 1) / steps
        color = lerp(PURPLE, CYAN, t0)
        draw.arc(
            [cx - radius, cy - radius, cx + radius, cy + radius],
            start=t0 * 360,
            end=t1 * 360 + 1,
            fill=color,
            width=width,
        )

    # Small node on the ring (crown)
    import math
    nx = cx + radius * math.cos(math.radians(-90))
    ny = cy + radius * math.sin(math.radians(-90))
    r = s * 0.045
    draw.ellipse([nx - r, ny - r, nx + r, ny + r], fill=CYAN)

    # Letter S
    try:
        font = ImageFont.truetype(font_path, int(s * 0.34))
    except Exception:
        font = ImageFont.load_default()
        return img.resize((size, size), Image.LANCZOS)

    text = "S"
    bbox = draw.textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    pos = (cx - tw / 2 - bbox[0], cy - th / 2 - bbox[1] - s * 0.02)
    draw.text(pos, text, font=font, fill=(255, 255, 255, 235))

    return img.resize((size, size), Image.LANCZOS)


FONT_CANDIDATES = [
    r"C:\Windows\Fonts\arialbd.ttf",
    r"C:\Windows\Fonts\segoeuib.ttf",
    r"C:\Windows\Fonts\calibrib.ttf",
]
font_path = next((p for p in FONT_CANDIDATES if os.path.exists(p)), "")

for size in (152, 167, 192, 512):
    icon = make_icon(size, font_path)
    path = os.path.join(OUT, f"icon-{size}.png")
    icon.save(path, optimize=True)
    print(f"wrote {path} ({os.path.getsize(path)} bytes)")

# Apple touch icon
make_icon(180, font_path).save(os.path.join(OUT, "apple-touch-icon.png"), optimize=True)
print("wrote public/apple-touch-icon.png")

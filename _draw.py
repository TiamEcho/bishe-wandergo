# -*- coding: utf-8 -*-
"""论文插图绘制库：基于 PIL 精确排版，输出 300dpi PNG 与 SVG 矢量图。"""
import os, math
from PIL import Image, ImageDraw, ImageFont

OUT = r"F:\毕设\毕设-旅游攻略打卡\论文\论文附件图\论文插图_新版Visio"
os.makedirs(OUT, exist_ok=True)
DPI = 300
PXMM = DPI / 25.4
W, H = 297.0, 210.0                    # 画布 mm

FB = r"C:\Windows\Fonts\msyhbd.ttc"
FR = r"C:\Windows\Fonts\msyh.ttc"

_cache = {}
def F(pt_size, bold=False):
    key = (pt_size, bold)
    if key not in _cache:
        # Word 里 1pt = 1/72 inch；画布按 mm，因此 px = pt/72*300
        _cache[key] = ImageFont.truetype(FB if bold else FR, max(8, int(round(pt_size / 72 * DPI))))
    return _cache[key]

_im = _d = None
_svg = []

def begin():
    global _im, _d, _svg
    _im = Image.new("RGB", (int(W * PXMM), int(H * PXMM)), "white")
    _d = ImageDraw.Draw(_im)
    _svg = []
    return _im, _d

def p(v):        # mm -> px
    return v * PXMM

def _hex(c):
    return "#%02X%02X%02X" % c if c else "none"

# ---------- 图元 ----------
def rect(x, y, w, h, txt="", fill=None, outline=(0, 0, 0), lw=1.6,
         font=None, align="center", valign="middle", pad=1.6, dash=None):
    x0, y0, x1, y1 = p(x), p(y), p(x + w), p(y + h)
    if lw > 0:
        _d.rectangle([x0, y0, x1, y1], fill=fill, outline=outline, width=max(1, int(round(lw * 0.12))))
    else:
        _d.rectangle([x0, y0, x1, y1], fill=fill)
    _svg.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="{_hex(fill)}" '
                f'stroke="{_hex(outline)}" stroke-width="{lw*0.353}"/>')
    if txt:
        text(x, y, w, h, txt, font or F(8), align, valign, pad)

def text(x, y, w, h, txt, font, align="center", valign="middle", pad=1.6, color=(0, 0, 0), bg=None):
    lines = txt.split("\n")
    asc, _desc = font.getmetrics()
    lh = asc * 1.5
    total = lh * len(lines)
    if valign == "middle":
        ty = p(y) + (p(h) - total) / 2 + (asc - lh) / 2 + lh * 0.08
    elif valign == "top":
        ty = p(y) + p(pad)
    else:
        ty = p(y + h) - total - p(pad)
    for i, ln in enumerate(lines):
        lw_ = _d.textlength(ln, font=font)
        if align == "center":
            tx = p(x) + (p(w) - lw_) / 2
        elif align == "left":
            tx = p(x) + p(pad)
        else:
            tx = p(x + w) - lw_ - p(pad)
        if bg is not None:
            _d.rectangle([tx - p(0.8), ty + i * lh - p(0.3), tx + lw_ + p(0.8),
                          ty + i * lh + asc * 1.25], fill=bg)
        _d.text((tx, ty + i * lh), ln, font=font, fill=color)
        # SVG 文本
        anchor = {"center": "middle", "left": "start", "right": "end"}[align]
        sx = p(x) + p(w) / 2 if align == "center" else (p(x) + p(pad) if align == "left" else p(x + w) - p(pad))
        _svg.append(f'<text x="{sx/PXMM}" y="{(ty + i*lh + asc)/PXMM}" font-family="Microsoft YaHei" '
                    f'font-size="{font.size*72/DPI:.2f}" text-anchor="{anchor}" '
                    f'fill="#{color[0]:02X}{color[1]:02X}{color[2]:02X}">{_esc(ln)}</text>')

def _esc(s):
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")

def line(x1, y1, x2, y2, arrow=False, lw=1.6, dash=False):
    a, b = (p(x1), p(y1)), (p(x2), p(y2))
    _d.line([a, b], fill=(0, 0, 0), width=max(1, int(round(lw * 0.12))))
    if arrow:
        ang = math.atan2(b[1] - a[1], b[0] - a[0])
        L = p(2.0)
        pts = [b,
               (b[0] - L * math.cos(ang - 0.40), b[1] - L * math.sin(ang - 0.40)),
               (b[0] - L * math.cos(ang + 0.40), b[1] - L * math.sin(ang + 0.40))]
        _d.polygon(pts, fill=(0, 0, 0))
        mk = "marker-end='url(#ar)'"
    else:
        mk = ""
    da = ' stroke-dasharray="2,1.6"' if dash else ""
    _svg.append(f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="#000" '
                f'stroke-width="{lw*0.353}" {mk}{da}/>')

def poly(pts, arrow=False, lw=1.6):
    for i in range(len(pts) - 1):
        line(pts[i][0], pts[i][1], pts[i+1][0], pts[i+1][1],
             arrow=(arrow and i == len(pts) - 2), lw=lw)

def wrap(txt, font, width_mm):
    """按像素宽度折行（中文按字切分）"""
    out, cur = [], ""
    for ch in txt:
        if ch == "\n":
            out.append(cur); cur = ""; continue
        if _d.textlength(cur + ch, font=font) > p(width_mm):
            out.append(cur); cur = ch
        else:
            cur += ch
    out.append(cur)
    return out

def save(name):
    png = os.path.join(OUT, name + ".png")
    _im.save(png, dpi=(DPI, DPI))
    svg = os.path.join(OUT, name + ".svg")
    with open(svg, "w", encoding="utf-8") as f:
        f.write(f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}mm" height="{H}mm" '
                f'viewBox="0 0 {W} {H}">'
                f'<defs><marker id="ar" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="5" '
                f'markerHeight="5" orient="auto"><path d="M0,0 L6,3 L0,6 z" fill="#000"/></marker></defs>'
                + "".join(_svg) + "</svg>")
    print("saved:", name, _im.size)

# -*- coding: utf-8 -*-
"""论文图4-1~图4-4 统一绘制（300dpi PNG，无箭头、无图内说明）"""
import os
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import FancyArrowPatch, Rectangle, Polygon, Ellipse
from matplotlib.lines import Line2D

plt.rcParams["font.sans-serif"] = ["Microsoft YaHei"]
plt.rcParams["font.family"] = "sans-serif"
plt.rcParams["axes.unicode_minus"] = False

OUT = r"F:\毕设\毕设-旅游攻略打卡\论文\论文附件图\论文插图_新版Visio"
os.makedirs(OUT, exist_ok=True)

LW = 0.9

C_GREEN = "#E9F2E4"
C_ORANGE = "#FDECDE"
C_BLUE = "#E3EDF8"
C_BLUE2 = "#DCE9F7"
C_WHITE = "#FFFFFF"
C_BORDER = "#333333"
C_GOLD = "#B45309"


def canvas(w_mm=297.0, h_mm=210.0):
    fig = plt.figure(figsize=(w_mm / 25.4, h_mm / 25.4), dpi=200)
    ax = fig.add_axes([0, 0, 1, 1])
    ax.set_xlim(0, w_mm)
    ax.set_ylim(0, h_mm)
    ax.set_aspect("equal")
    ax.axis("off")
    return fig, ax


def box(ax, x, y, w, h, text="", fill=C_WHITE, fs=8.5, bold=False, lw=LW,
        color=C_BORDER, tc="#000000", va="center", ha="center", pad=1.5,
        round_=0.0):
    p = Rectangle((x, y), w, h, facecolor=fill, edgecolor=color,
                  linewidth=lw, zorder=2)
    if round_ > 0:
        p.set_joinstyle("round")
    ax.add_patch(p)
    if round_ > 0:
        pass
    if text:
        ty = {"center": y + h / 2, "top": y + h - pad, "bottom": y + pad}[va]
        tx = {"center": x + w / 2, "left": x + pad, "right": x + w - pad}[ha]
        ax.text(tx, ty, text, fontsize=fs, ha=ha, va=va,
                fontweight="bold" if bold else "normal", color=tc, zorder=3,
                linespacing=1.45)
    return p


def oval(ax, cx, cy, w, h, text, fill=C_BLUE2, fs=9, lw=LW):
    e = Ellipse((cx, cy), w, h, facecolor=fill, edgecolor=C_BORDER,
                linewidth=lw, zorder=2)
    ax.add_patch(e)
    ax.text(cx, cy, text, fontsize=fs, ha="center", va="center", zorder=3)
    return e


def diamond(ax, cx, cy, w, h, text, fill=C_WHITE, fs=9, lw=LW):
    pts = [(cx, cy + h / 2), (cx + w / 2, cy), (cx, cy - h / 2), (cx - w / 2, cy)]
    ax.add_patch(Polygon(pts, closed=True, facecolor=fill,
                         edgecolor=C_BORDER, linewidth=lw, zorder=2))
    ax.text(cx, cy, text, fontsize=fs, ha="center", va="center", zorder=3)
    return pts


def line(ax, pts, lw=LW, color=C_BORDER, dash=False):
    xs = [p[0] for p in pts]
    ys = [p[1] for p in pts]
    ax.add_line(Line2D(xs, ys, color=color, linewidth=lw, zorder=1,
                       solid_capstyle="butt",
                       linestyle=(0, (3, 2)) if dash else "solid"))


def label(ax, x, y, t, fs=8, color="#000000", bg=C_WHITE, ha="center", va="center"):
    ax.text(x, y, t, fontsize=fs, ha=ha, va=va, color=color, zorder=5,
            bbox=dict(boxstyle="square,pad=0.18", facecolor=bg,
                      edgecolor="none"))


def title(ax, t, y=None, x=None, fs=14):
    ax.text(x if x is not None else 148.5,
            y if y is not None else 198, t, fontsize=fs, ha="center",
            va="center", fontweight="bold")


def save(fig, name):
    p = os.path.join(OUT, name + ".png")
    fig.savefig(p, dpi=300, facecolor="white")
    plt.close(fig)
    print("saved:", p)

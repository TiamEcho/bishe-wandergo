# -*- coding: utf-8 -*-
"""生成可在 Visio 中双击编辑的 .vsdx（真实形状 + 端点粘附连线）"""
import os
import sys
import win32com.client as win32

OUT = r"F:\毕设\毕设-旅游攻略打卡\论文\论文附件图\论文插图_新版Visio"
os.makedirs(OUT, exist_ok=True)

MM2IN = 1.0 / 25.4

# 颜色（Visio RGB 为 BGR）
C_WHITE = "RGB(255,255,255)"
C_BLUE = "RGB(247,233,220)"     # 浅蓝 #DCE9F7 -> BGR
C_BLUE_L = "RGB(248,237,227)"
C_ORANGE = "RGB(222,236,253)"   # 浅橙 #FDECDE -> BGR
C_GREEN = "RGB(228,242,233)"    # 浅绿 #E9F2E4 -> BGR
C_BORDER = "RGB(51,51,51)"

app = win32.DispatchEx("Visio.Application")
app.Visible = False
app.AlertResponse = 7
app.ScreenUpdating = 0


def new_doc(w_mm, h_mm):
    doc = app.Documents.Add("")
    pg = doc.Pages.Item(1)
    doc.PageSheet.CellsU("PageWidth").FormulaU = f"{w_mm * MM2IN:.6f} in"
    doc.PageSheet.CellsU("PageHeight").FormulaU = f"{h_mm * MM2IN:.6f} in"
    pg.PageSheet.CellsU("PageScale").FormulaU = "1 in"
    pg.PageSheet.CellsU("DrawingScale").FormulaU = "1 in"
    return doc, pg


def norm(shp):
    """去掉箭头、阴影、圆角 */
    shp.CellsU("EndArrow").FormulaU = "0"
    shp.CellsU("BeginArrow").FormulaU = "0"
    shp.CellsU("ShdwPattern").FormulaU = "0"
    try:
        shp.CellsU("Rounding").FormulaU = "0 in"
    except Exception:
        pass


def rect(pg, x, y, w, h, text="", fill=C_WHITE, fs=10, bold=False):
    """x,y 为左下角（mm，原点在图左下）"""
    s = pg.DrawRectangle(x * MM2IN, y * MM2IN,
                         (x + w) * MM2IN, (y + h) * MM2IN)
    norm(s)
    s.CellsU("FillForegnd").FormulaU = fill
    s.CellsU("LineColor").FormulaU = C_BORDER
    s.CellsU("LineWeight").FormulaU = "0.75 pt"
    if text:
        s.Text = text
        s.CellsU("Char.Size").FormulaU = f"{fs} pt"
        s.CellsU("Char.Color").FormulaU = "RGB(0,0,0)"
        s.CellsU("Char.Style").FormulaU = "1" if bold else "0"
        s.CellsU("Para.HorzAlign").FormulaU = "1"
        s.CellsU("VerticalAlign").FormulaU = "1"
    return s


def oval(pg, cx, cy, w, h, text="", fill=C_BLUE, fs=10):
    s = pg.DrawOval(cx * MM2IN, cy * MM2IN, w * MM2IN, h * MM2IN)
    norm(s)
    s.CellsU("FillForegnd").FormulaU = fill
    s.CellsU("LineColor").FormulaU = C_BORDER
    s.CellsU("LineWeight").FormulaU = "0.75 pt"
    if text:
        s.Text = text
        s.CellsU("Char.Size").FormulaU = f"{fs} pt"
        s.CellsU("Para.HorzAlign").FormulaU = "1"
    return s


def diamond(pg, cx, cy, w, h, text="", fill=C_WHITE, fs=10):
    s = pg.DrawPolyline(
        1, f"Polyline(({cx - w / 2:.4f}mm,{cy:.4f}mm),"
           f"({cx:.4f}mm,{cy + h / 2:.4f}mm),"
           f"({cx + w / 2:.4f}mm,{cy:.4f}mm),"
           f"({cx:.4f}mm,{cy - h / 2:.4f}mm))")
    try:
        s.Closed = 1
    except Exception:
        pass
    norm(s)
    s.CellsU("FillForegnd").FormulaU = fill
    s.CellsU("LineColor").FormulaU = C_BORDER
    s.CellsU("LineWeight").FormulaU = "0.75 pt"
    if text:
        s.Text = text
        s.CellsU("Char.Size").FormulaU = f"{fs} pt"
        s.CellsU("Para.HorzAlign").FormulaU = "1"
    return s


def conn(pg, a, b, xa=None, ya=None, xb=None, yb=None):
    """连接线：a/b 为形状，xa/ya 为 a 上的相对连接点(0~1)，xb/yb 同理"""
    c = pg.Drop(pg.Application.ConnectorToolDataObject, 0, 0)
    norm(c)
    ca = a.CellsU("PinX")
    cb = b.CellsU("PinX")
    if xa is not None:
        ca = a.CellsSRC(7, 0, 0)  # visSectionConnectionPts
        c.CellsU("BeginX").GlueTo(a.CellsU("PinX"))
        c.CellsU("BeginX").GlueTo(a.CellsU("PinX"))
    # 使用 GlueTo 到连接点
    c.CellsU("BeginX").GlueTo(a.CellsU("PinX"))
    c.CellsU("EndX").GlueTo(b.CellsU("PinX"))
    return c


def conn_pt(pg, a, afrom, b, bto):
    """按相对连接点粘附（afrom/bto: (x,y) 0~1）"""
    c = pg.Drop(pg.Application.ConnectorToolDataObject, 0, 0)
    norm(c)
    c.CellsU("BeginX").GlueTo(a.CellsSRC(
        7, 0, 0 + 0)) if False else None
    ax = a.CellsU("PinX").ResultIU
    c.CellsU("BeginX").FormulaU = (
        f'GUARD(PAR(PinX))') if False else c.CellsU("BeginX").FormulaU
    c.CellsU("BeginX").GlueToPt(a, afrom[0], afrom[1])
    c.CellsU("EndX").GlueToPt(b, bto[0], bto[1])
    return c

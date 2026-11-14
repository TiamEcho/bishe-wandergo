# -*- coding: utf-8 -*-
"""Visio 绘图公共库：单文档多页、A4 比例画布、300dpi PNG + EMF 矢量导出。"""
import os
import win32com.client as win32

OUT = r"F:\毕设\毕设-旅游攻略打卡\论文\论文附件图\论文插图_新版Visio"
os.makedirs(OUT, exist_ok=True)

# 画布 297 x 210 (mm)，比例 1.414（A4 横向）
PW, PH = 297.0, 210.0

def rgb(r, g, b):
    return r | (g << 8) | (b << 16)

BLACK  = rgb(0, 0, 0)
WHITE  = rgb(255, 255, 255)
C_BLUE = rgb(0xDC, 0xE9, 0xF7)
C_ORNG = rgb(0xFB, 0xE5, 0xD6)
C_GREN = rgb(0xE2, 0xEF, 0xDA)
C_PURP = rgb(0xE8, 0xE2, 0xF4)
C_HEAD = rgb(0xD9, 0xE2, 0xF3)
C_GOLD = rgb(0xFF, 0xF2, 0xCC)
C_GRAY = rgb(0xF2, 0xF2, 0xF2)

_app = None

def app():
    global _app
    if _app is None:
        _app = win32.DispatchEx("Visio.Application")
        _app.Visible = 0
        _app.AlertResponse = 7
        _app.ScreenUpdating = 0
    return _app

_doc = None

def doc():
    global _doc
    if _doc is None:
        _doc = app().Documents.Add("")
    return _doc

def page(name):
    d = doc()
    pg = d.Pages.Add()
    pg.Name = name
    ps = pg.PageSheet
    ps.CellsU("PageWidth").FormulaU = f"{PW} mm"
    ps.CellsU("PageHeight").FormulaU = f"{PH} mm"
    ps.CellsU("PrintPageOrientation").FormulaU = "2"
    return pg

def _color(cell, val):
    cell.FormulaU = "RGB(%d,%d,%d)" % (val & 0xFF, (val >> 8) & 0xFF, (val >> 16) & 0xFF)

def _apply_text(s, t, size, bold, font):
    """先赋值文本，再设置字符格式：空形状上的字符格式会被后续 Text 赋值重置。"""
    s.Text = t
    s.CellsU("Char.Font").FormulaU = f'"{font}"'
    s.CellsU("Char.Size").FormulaU = f"{size} pt"
    s.CellsU("Char.Style").FormulaU = "1" if bold else "0"

def box(pg, x, y, w, h, text="", fill=None, size=9, bold=False, line=BLACK,
        round_=False, align=1, valign=1, font="微软雅黑", lw=0.75):
    s = pg.DrawRectangle(x, y, x + w, y + h)
    _color(s.CellsU("LineColor"), line)
    s.CellsU("LineWeight").FormulaU = f"{lw} pt"
    if fill is None:
        s.CellsU("FillPattern").FormulaU = "0"
    else:
        _color(s.CellsU("FillForegnd"), fill)
        s.CellsU("FillPattern").FormulaU = "1"
        s.CellsU("FillBkgnd").FormulaU = "RGB(255,255,255)"
    if round_:
        s.CellsU("Rounding").FormulaU = "5 pt"
    s.CellsU("VerticalAlign").FormulaU = str(valign)
    s.CellsU("Para.HorzAlign").FormulaU = str(align)
    for m in ("LeftMargin", "RightMargin"):
        s.CellsU(m).FormulaU = "0.8 mm"
    for m in ("TopMargin", "BottomMargin"):
        s.CellsU(m).FormulaU = "0.3 mm"
    if text:
        _apply_text(s, text, size, bold, font)
        s.CellsU("Char.Color").FormulaU = "RGB(0,0,0)"
    return s

def text(pg, x, y, w, h, t, size=9, bold=False, color=BLACK, align=1, font="微软雅黑"):
    s = pg.DrawRectangle(x, y, x + w, y + h)
    s.CellsU("LinePattern").FormulaU = "0"
    s.CellsU("FillPattern").FormulaU = "0"
    s.CellsU("Para.HorzAlign").FormulaU = str(align)
    s.CellsU("VerticalAlign").FormulaU = "1"
    _apply_text(s, t, size, bold, font)
    _color(s.CellsU("Char.Color"), color)
    return s

def line(pg, x1, y1, x2, y2, arrow=False, lw=0.75, dash=None):
    s = pg.DrawLine(x1, y1, x2, y2)
    s.CellsU("LineColor").FormulaU = "RGB(0,0,0)"
    s.CellsU("LineWeight").FormulaU = f"{lw} pt"
    s.CellsU("BeginArrow").FormulaU = "0"
    s.CellsU("EndArrow").FormulaU = "4" if arrow else "0"
    if dash:
        s.CellsU("LinePattern").FormulaU = str(dash)
    return s

def label(pg, x, y, t, size=8):
    """贴在连线上的小标签（白底，避免线穿过文字）"""
    s = text(pg, x, y, max(12, len(t) * 1.9), 4.2, t, size=size)
    s.CellsU("FillPattern").FormulaU = "1"
    s.CellsU("FillForegnd").FormulaU = "RGB(255,255,255)"
    return s

def export(pg, name, dpi=300):
    """导出 PNG（300 dpi）与 EMF（矢量，可无损插入 Word）"""
    import win32com.client as _w
    png = os.path.join(OUT, name + ".png")
    emf = os.path.join(OUT, name + ".emf")
    a = app()
    # 位图导出分辨率（Visio 导出 PNG 依赖此设置）
    try:
        a.Settings.RasterExportResolution = 2          # visRasterUseCustomResolution
        a.Settings.RasterExportResolutionX = dpi
        a.Settings.RasterExportResolutionY = dpi
        a.Settings.RasterExportQuality = 100
    except Exception as e:
        print("  设置分辨率失败:", e)
    pg.Export(png)
    try:
        pg.Export(emf)
    except Exception as e:
        print("  EMF 导出失败:", e)
    return png

def save(name="论文插图_新版可编辑"):
    p = os.path.join(OUT, name + ".vsdx")
    try:
        doc().SaveAs(p)
        print("已保存:", p)
    except Exception as e:
        print("保存失败:", e)
    return p

def quit_():
    try:
        if _doc is not None:
            _doc.Close()
        if _app is not None:
            _app.Quit()
    except Exception:
        pass

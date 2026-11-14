# -*- coding: utf-8 -*-
"""Vsdx 生成器：真实 Visio 形状 + 连接点粘附，保证可编辑"""
import os
import win32com.client as win32

OUT = r"F:\毕设\毕设-旅游攻略打卡\论文\论文附件图\论文插图_新版Visio"
os.makedirs(OUT, exist_ok=True)

MM = 1.0 / 25.4
C_WHITE = "RGB(255,255,255)"
C_TITLE = "RGB(247,233,220)"    # #DCE9F7
C_ORANGE = "RGB(222,236,253)"   # #FDECDE
C_GREEN = "RGB(228,242,233)"    # #E9F2E4
C_BLUE_L = "RGB(227,237,248)"   # #E3EDF8
C_BORDER = "RGB(51,51,51)"

app = win32.DispatchEx("Visio.Application")
app.Visible = False
app.AlertResponse = 7
app.ScreenUpdating = 0

EPS = 0.02


def _arr(pts):
    """mm 坐标列表 -> COM 可接收的一维 SAFEARRAY（英寸）"""
    import pythoncom
    import win32com.client as _w
    flat = []
    for x, y in pts:
        flat.append(x * MM)
        flat.append(y * MM)
    return _w.VARIANT(pythoncom.VT_ARRAY | pythoncom.VT_R8, flat)


class Doc:
    """所有公开方法坐标单位均为 mm，原点在图幅左下角"""

    def __init__(self, w_mm, h_mm):
        self.w, self.h = w_mm, h_mm
        self.d = app.Documents.Add("")
        self.pg = d_pg = self.d.Pages.Item(1)
        ps = d_pg.PageSheet
        ps.CellsU("PageWidth").FormulaU = f"{w_mm * MM:.6f} in"
        ps.CellsU("PageHeight").FormulaU = f"{h_mm * MM:.6f} in"

    # ---------- 图元 ----------
    def _style(self, s, fill, lw="0.75 pt"):
        s.CellsU("EndArrow").FormulaU = "0"
        s.CellsU("BeginArrow").FormulaU = "0"
        s.CellsU("ShdwPattern").FormulaU = "0"
        s.CellsU("FillForegnd").FormulaU = fill
        s.CellsU("LineColor").FormulaU = C_BORDER
        s.CellsU("LineWeight").FormulaU = lw
        s.CellsU("LinePattern").FormulaU = "1"
        s.CellsU("LineColor").FormulaU = C_BORDER
        try:
            s.CellsU("Rounding").FormulaU = "0 in"
        except Exception:
            pass

    def _text(self, s, text, fs=10, bold=False):
        if not text:
            return
        s.Text = text
        s.CellsU("Char.Size").FormulaU = f"{fs} pt"
        s.CellsU("Char.Style").FormulaU = "1" if bold else "0"
        s.CellsU("Char.Color").FormulaU = "RGB(0,0,0)"
        s.CellsU("Para.HorzAlign").FormulaU = "1"
        s.CellsU("VerticalAlign").FormulaU = "1"
        try:
            s.CellsU("TxtWidth").FormulaU = f"{s.CellsU('Width').ResultIU - 0.02:.5f} in"
            s.CellsU("TxtHeight").FormulaU = f"{s.CellsU('Height').ResultIU - 0.02:.5f} in"
        except Exception:
            pass

    def rect(self, x, y, w, h, text="", fill=C_WHITE, fs=10, bold=False,
             double=False):
        x2, y2 = x + w, y + h
        s = self.pg.DrawRectangle(x * MM, y * MM, x2 * MM, y2 * MM)
        self._style(s, fill)
        try:
            s.CellsU("LeftMargin").FormulaU = "0.03 in"
            s.CellsU("RightMargin").FormulaU = "0.03 in"
            s.CellsU("TopMargin").FormulaU = "0.01 in"
            s.CellsU("BottomMargin").FormulaU = "0.01 in"
        except Exception:
            pass
        self._text(s, text, fs, bold)
        return s

    def oval(self, cx, cy, w, h, text="", fill=C_TITLE, fs=10.5):
        s = self.pg.DrawOval((cx - w / 2) * MM, (cy - h / 2) * MM,
                             (cx + w / 2) * MM, (cy + h / 2) * MM)
        self._style(s, fill)
        self._text(s, text, fs)
        return s

    def diamond(self, cx, cy, w, h, text="", fill=C_WHITE, fs=10.5):
        """菱形：4 条边线围合 + 一个透明文字框"""
        P = [(cx, cy + h / 2), (cx + w / 2, cy),
             (cx, cy - h / 2), (cx - w / 2, cy), (cx, cy + h / 2)]
        for i in range(4):
            (x0, y0), (x1, y1) = P[i], P[i + 1]
            s = self.pg.DrawLine(x0 * MM, y0 * MM, x1 * MM, y1 * MM)
            s.CellsU("EndArrow").FormulaU = "0"
            s.CellsU("BeginArrow").FormulaU = "0"
            s.CellsU("ShdwPattern").FormulaU = "0"
            s.CellsU("LineColor").FormulaU = C_BORDER
            s.CellsU("LineWeight").FormulaU = "0.75 pt"
        # 填充（置于底层）：用无边框矩形近似不便，改为半透明菱形填充略过
        t = self.txt(cx, cy, text, fs=fs, align=0, wmm=w - 14)
        return t

    def _polyline(self, pts, close=False):
        """1D 折线：DrawLine(首->尾) + 插入中间顶点。
        Geometry 行使用局部公式：X = 相对水平位置(英寸), Y = 相对垂直位置(英寸)"""
        (x0, y0), (x1, y1) = pts[0], pts[-1]
        s = self.pg.DrawLine(x0 * MM, y0 * MM, x1 * MM, y1 * MM)
        try:
            s.CellsU("Geometry1.NoFill").FormulaU = "1"
        except Exception:
            pass
        bx = s.CellsU("BeginX").ResultIU
        by = s.CellsU("BeginY").ResultIU
        ex = s.CellsU("EndX").ResultIU
        ey = s.CellsU("EndY").ResultIU
        dx = ex - bx
        dy = ey - by
        k = 1
        for mx, my in pts[1:-1]:
            s.AddRow(10, k + 1, 0)
            rx = mx * MM - bx
            ry = my * MM - by
            fxv = (rx / dx) if abs(dx) > 1e-9 else 0.0
            fyv = (ry / dy) if abs(dy) > 1e-9 else 0.0
            s.CellsSRC(10, k + 1, 0).FormulaU = f"GUARD(Width*{fxv:.6f})"
            s.CellsSRC(10, k + 1, 1).FormulaU = f"GUARD(Height*{fyv:.6f})"
            k += 1
        return s

    def line(self, pts, lw="0.75 pt", dash=False):
        """折线拆为逐段直线拼接：首尾共用端点，视觉上是一条连续线，且每段可单独编辑"""
        out = []
        for i in range(len(pts) - 1):
            (x0, y0), (x1, y1) = pts[i], pts[i + 1]
            s = self.pg.DrawLine(x0 * MM, y0 * MM, x1 * MM, y1 * MM)
            s.CellsU("EndArrow").FormulaU = "0"
            s.CellsU("BeginArrow").FormulaU = "0"
            s.CellsU("ShdwPattern").FormulaU = "0"
            s.CellsU("LineColor").FormulaU = C_BORDER
            s.CellsU("LineWeight").FormulaU = lw
            s.CellsU("LinePattern").FormulaU = "2" if dash else "1"
            out.append(s)
        return out

    def txt(self, x, y, t, fs=8, bold=False, align=0, wmm=40):
        """放一行文字。align: 0 居中, 1 左对齐"""
        if align == 0:
            x0 = x - wmm / 2
        else:
            x0 = x
        s = self.pg.DrawRectangle(x0 * MM, (y - 1.6) * MM,
                                  (x0 + wmm) * MM, (y + 1.6) * MM)
        s.CellsU("LinePattern").FormulaU = "0"
        s.CellsU("FillPattern").FormulaU = "0"
        s.CellsU("ShdwPattern").FormulaU = "0"
        s.Text = t
        s.CellsU("Char.Size").FormulaU = f"{fs} pt"
        s.CellsU("Char.Style").FormulaU = "1" if bold else "0"
        s.CellsU("Para.HorzAlign").FormulaU = str(align)
        s.CellsU("VerticalAlign").FormulaU = "1"
        return s

    # ---------- 连线（端点粘附到形状连接点） ----------
    def conn(self, a, ap, b, bp):
        """ap/bp: (x,y) 相对坐标 0~1，0,0=左下角，1,1=右上角"""
        c = self.pg.Drop(app.ConnectorToolDataObject, 0, 0)
        c.CellsU("EndArrow").FormulaU = "0"
        c.CellsU("BeginArrow").FormulaU = "0"
        c.CellsU("ShdwPattern").FormulaU = "0"
        c.CellsU("LineColor").FormulaU = C_BORDER
        c.CellsU("LineWeight").FormulaU = "0.75 pt"
        c.CellsU("BeginX").FormulaU = f"{self._rx(a, ap[0]):.6f} in"
        c.CellsU("BeginY").FormulaU = f"{self._ry(a, ap[1]):.6f} in"
        c.CellsU("EndX").FormulaU = f"{self._rx(b, bp[0]):.6f} in"
        c.CellsU("EndY").FormulaU = f"{self._ry(b, bp[1]):.6f} in"
        return c

    def _bbox(self, s):
        """返回形状包围盒 (x0, y0, x1, y1)（英寸）"""
        try:
            x0 = s.CellsU("PinX").ResultIU - s.CellsU("Width").ResultIU / 2
            y0 = s.CellsU("PinY").ResultIU - s.CellsU("Height").ResultIU / 2
            x1 = x0 + s.CellsU("Width").ResultIU
            y1 = y0 + s.CellsU("Height").ResultIU
            if x1 > x0 and y1 > y0:
                return x0, y0, x1, y1
        except Exception:
            pass
        x0 = s.CellsU("BeginX").ResultIU
        y0 = s.CellsU("BeginY").ResultIU
        x1 = s.CellsU("EndX").ResultIU
        y1 = s.CellsU("EndY").ResultIU
        return x0, y0, x1, y1

    def _rx(self, s, rel):
        x0, _, x1, _ = self._bbox(s)
        return x0 + rel * (x1 - x0)

    def _ry(self, s, rel):
        _, y0, _, y1 = self._bbox(s)
        return y0 + rel * (y1 - y0)

    def save(self, name):
        p = os.path.join(OUT, name + ".vsdx")
        if os.path.exists(p):
            try:
                os.remove(p)
            except Exception:
                pass
        self.d.SaveAs(p)
        self.d.Close()
        print("saved:", p, os.path.exists(p))
        return p

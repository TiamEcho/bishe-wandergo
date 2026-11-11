# -*- coding: utf-8 -*-
import os
import win32com.client as win32
from PIL import Image
Image.MAX_IMAGE_PIXELS = None

OUT = r"d:\Documents\Tencent Files\毕设\毕设\_vstest"
os.makedirs(OUT, exist_ok=True)
app = win32.DispatchEx("Visio.Application")
app.Visible = 0
app.AlertResponse = 7
doc = app.Documents.Add("")
pg = doc.Pages.Item(1)
pg.PageSheet.CellsU("PageWidth").FormulaU = "297 mm"
pg.PageSheet.CellsU("PageHeight").FormulaU = "210 mm"
s = pg.DrawRectangle(50, 100, 130, 120)
s.Text = "测试文字ABC"
s.CellsU("Char.Size").FormulaU = "24 pt"
s.CellsU("Char.Style").FormulaU = "1"
s.CellsU("Char.Font").FormulaU = '"微软雅黑"'
p = os.path.join(OUT, "t.png")
pg.Export(p)
im = Image.open(p)
print("size", im.size)
im2 = im.convert("RGB")
im2.thumbnail((1200, 1200))
im2.save(r"d:\Documents\Tencent Files\毕设\毕设\_preview.png")
doc.Close()
app.Quit()

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

def mk(y, size_pt, use_result=False, font=None):
    s = pg.DrawRectangle(50, y, 150, y + 40)
    s.Text = f"测试文字ABC {size_pt}pt"
    if font:
        s.CellsU("Char.Font").FormulaU = f'"{font}"'
    if use_result:
        s.CellsU("Char.Size").ResultIU = size_pt * 0.0352778
    else:
        s.CellsU("Char.Size").FormulaU = f"{size_pt} pt"
    print(f"  {size_pt}pt result={s.CellsU('Char.Size').ResultIU:.4f} formula={s.CellsU('Char.Size').FormulaU}")
    return s

pg.PageSheet.CellsU("PageWidth").FormulaU = "297 mm"
pg.PageSheet.CellsU("PageHeight").FormulaU = "210 mm"
mk(160, 24, False)
mk(110, 24, True)
mk(60, 24, False, "Arial")

p = os.path.join(OUT, "cmp.png")
pg.Export(p)
im = Image.open(p); print("size", im.size)
im.convert("RGB").resize((1200, int(1200*im.size[1]/im.size[0]))).save(r"d:\Documents\Tencent Files\毕设\毕设\_preview.png")
doc.Close(); app.Quit()

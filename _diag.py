# -*- coding: utf-8 -*-
import sys
sys.path.insert(0, r"d:\Documents\Tencent Files\毕设\毕设")
import _vs_base as B

pg = B.page("测试")
s = B.box(pg, 50, 100, 80, 20, "测试文字ABC", size=24, bold=True)
for cell in ("Char.Font", "Char.Size", "Char.Style", "Char.Color", "TextBkgnd", "TextBkgndTrans",
             "Para.HorzAlign", "VerticalAlign", "FillForegnd", "Char.Pos", "Char.Case"):
    try:
        print(cell, "=>", s.CellsU(cell).FormulaU)
    except Exception as e:
        print(cell, "ERR", e)
# 逐字符检查
ch = s.Characters
print("char count:", ch.CharCount if hasattr(ch, "CharCount") else "n/a")
for i in range(1, 4):
    try:
        print(i, ch.CharProps(1), ch.CharProps(7), ch.CharProps(3))
    except Exception as e:
        print(i, "ERR", e)
print("text:", repr(s.Text))

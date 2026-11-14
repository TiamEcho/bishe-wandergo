# -*- coding: utf-8 -*-
"""探明 1D 折线中间顶点的坐标基准"""
import sys, os
sys.path.insert(0, r"d:\Documents\Tencent Files\毕设\毕设")
from _vs_lib import *

doc = app.Documents.Add("")
pg = doc.Pages.Item(1)
s = pg.DrawLine(10 * MM, 10 * MM, 60 * MM, 10 * MM)
print("Pin", s.CellsU("PinX").ResultIU, s.CellsU("PinY").ResultIU)
print("BeginX", s.CellsU("BeginX").ResultIU, "BeginY", s.CellsU("BeginY").ResultIU)
print("Width", s.CellsU("Width").ResultIU, "Height", s.CellsU("Height").ResultIU)
print("LocPinX", s.CellsU("LocPinX").ResultIU, "LocPinY", s.CellsU("LocPinY").ResultIU)
for i in range(s.RowCount(10)):
    print(i, s.CellsSRC(10, i, 0).FormulaU, "|", s.CellsSRC(10, i, 1).FormulaU,
          "|", s.CellsSRC(10, i, 2).FormulaU)

# 插入点，尝试用绝对公式
s.AddRow(10, 2, 0)
r = 2
print("after add row2:", s.CellsSRC(10, r, 0).FormulaU, s.CellsSRC(10, r, 1).FormulaU)
s.CellsSRC(10, r, 0).FormulaU = "GUARD(1.0 in)"
s.CellsSRC(10, r, 1).FormulaU = "GUARD(1.5 in)"
for i in range(s.RowCount(10)):
    print("  ", i, s.CellsSRC(10, i, 0).FormulaU, "|", s.CellsSRC(10, i, 1).FormulaU,
          "->", s.CellsSRC(10, i, 0).ResultIU, s.CellsSRC(10, i, 1).ResultIU)
print("Pin now", s.CellsU("PinX").ResultIU, s.CellsU("PinY").ResultIU)
print("Width", s.CellsU("Width").ResultIU)
doc.Close()

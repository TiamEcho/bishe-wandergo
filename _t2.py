# -*- coding: utf-8 -*-
import sys, os
sys.path.insert(0, r"d:\Documents\Tencent Files\毕设\毕设")
from _vs_lib import *

d = Doc(120, 60)
a = d.rect(10, 35, 40, 12, "上框", fill=C_TITLE, fs=11, bold=True)
p = os.path.join(OUT, "_test.vsdx")
if os.path.exists(p):
    os.remove(p)
try:
    d.d.SaveAs(p)
    print("A ok")
except Exception as e:
    print("A err", e)

try:
    p2 = os.path.join(OUT, "_test2.vsdx")
    if os.path.exists(p2):
        os.remove(p2)
    d.d.SaveAs(p2, 71)   # visOpenSaveAsXMLDrawing
    print("B ok", os.path.exists(p2))
except Exception as e:
    print("B err", e)

print("d.Name", d.d.Name, "FullName", d.d.FullName)
d.d.Close()

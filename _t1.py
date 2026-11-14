# -*- coding: utf-8 -*-
import sys, os
sys.path.insert(0, r"d:\Documents\Tencent Files\毕设\毕设")
from _vs_lib import *

d = Doc(120, 80)
d.rect(10, 58, 40, 14, "上框", fill=C_TITLE, fs=11, bold=True)
d.rect(10, 8, 40, 14, "下框", fill=C_WHITE, fs=11)
d.line([(30, 58), (30, 40), (80, 40), (80, 22)])
d.diamond(95, 62, 34, 18, "判断？", fs=9)
d.txt(60, 60, "标注", fs=9)
p = d.save("_test")
doc = app.Documents.Open(p)
doc.Pages.Item(1).Export(os.path.join(OUT, "_test.emf"))
doc.Pages.Item(1).Export(os.path.join(OUT, "_test.png"))
doc.Close()
print("ok")

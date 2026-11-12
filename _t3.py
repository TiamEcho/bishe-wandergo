# -*- coding: utf-8 -*-
import sys, os
sys.path.insert(0, r"d:\Documents\Tencent Files\毕设\毕设")
from _vs_lib import *
import subprocess

doc = app.Documents.Open(os.path.join(OUT, "_test.vsdx"))
pg = doc.Pages.Item(1)
emf = os.path.join(OUT, "_test.emf")
pg.Export(emf)
print("emf", os.path.exists(emf), os.path.getsize(emf))
doc.Close()

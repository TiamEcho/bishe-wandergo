# -*- coding: utf-8 -*-
"""把 vsdx 页面导出为 PNG 预览，核对排版与连线"""
import sys, os
sys.path.insert(0, r"d:\Documents\Tencent Files\毕设\毕设")
from _vs_lib import *

NAMES = ["图4-1_系统总体架构图", "图4-2_系统功能模块图",
         "图4-3_系统ER图", "图4-4_协同过滤推荐流程图"]
PWDIR = os.path.join(OUT, "_preview")
os.makedirs(PWDIR, exist_ok=True)

for n in NAMES:
    p = os.path.join(OUT, n + ".vsdx")
    doc = app.Documents.Open(p)
    pg = doc.Pages.Item(1)
    pg.Export(os.path.join(PWDIR, n + ".png"))
    doc.Close()
    print("preview:", n)

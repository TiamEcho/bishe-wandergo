# -*- coding: utf-8 -*-
import re
p = r"d:\Documents\Tencent Files\毕设\毕设\_tmp_kaiti.txt"
raw = open(p, "rb").read()
for enc in ("utf-8", "gb18030", "utf-16"):
    try:
        txt = raw.decode(enc)
        print("ENC OK:", enc)
        break
    except Exception as e:
        print("fail", enc)
kw = ["Vue", "SpringBoot", "MySQL", "SQLite", "Node", "ECharts", "Three", "GitHub", "Render", "PostgreSQL"]
for k in kw:
    print(k, txt.count(k))
print("----- 技术相关行 -----")
for line in txt.splitlines():
    if any(k in line for k in kw):
        print(line[:400])

# -*- coding: utf-8 -*-
import sys
from docx import Document
SRC = r"f:\毕设\毕设-旅游攻略打卡\论文\定稿1-4基于Vue + Spring Boot + 协同过滤的旅游打卡平台设计与实现.docx"
doc = Document(SRC)
out = []
for i, p in enumerate(doc.paragraphs):
    t = "".join(r.text for r in p.runs)
    if t.strip():
        out.append(f"[{i}]({p.style.name}) {t}")
with open(r"d:\Documents\Tencent Files\毕设\毕设\_tmp_all.txt", "w", encoding="utf-8") as f:
    f.write("\n".join(out))
print(len(doc.paragraphs), len(out))

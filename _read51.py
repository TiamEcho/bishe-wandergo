# -*- coding: utf-8 -*-
from docx import Document
SRC = r"f:\毕设\毕设-旅游攻略打卡\论文\定稿1-4基于Vue + Spring Boot + 协同过滤的旅游打卡平台设计与实现.docx"
doc = Document(SRC)
# 定位 5.1 章节段落
start = None
for i, p in enumerate(doc.paragraphs):
    t = "".join(r.text for r in p.runs).strip()
    if t.startswith("5.1"):
        start = i; print(f"[{i}] {t}")
        break
if start is not None:
    for i in range(start, min(start + 12, len(doc.paragraphs))):
        t = "".join(r.text for r in doc.paragraphs[i].runs)
        print(f"--- p[{i}] style={doc.paragraphs[i].style.name} ---")
        print(t)

print("\n===== TABLES =====")
for ti, tb in enumerate(doc.tables):
    txt = "\n".join(" | ".join(c.text.strip() for c in row.cells) for row in tb.rows)
    if "开发环境" in txt or "Visual Studio" in txt or "IDEA" in txt or "Vue" in txt:
        print(f"\n>>> 表格[{ti}] ({len(tb.rows)}行 x {len(tb.columns)}列)")
        for ri, row in enumerate(tb.rows):
            print(f"  r{ri}: " + " | ".join(c.text.strip() for c in row.cells))

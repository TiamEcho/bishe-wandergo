# -*- coding: utf-8 -*-
import os
SRC = r"f:\毕设\毕设-旅游攻略打卡"
if os.path.isdir(SRC):
    for root, dirs, files in os.walk(SRC):
        depth = root[len(SRC):].count(os.sep)
        if depth > 2:
            continue
        for f in files:
            if f.lower().endswith((".docx", ".doc", ".pdf", ".md", ".txt")):
                print(os.path.join(root, f))
else:
    print("NOT FOUND", SRC)

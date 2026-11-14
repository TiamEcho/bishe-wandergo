# -*- coding: utf-8 -*-
import sys
from docx import Document

p = r"F:\毕设\毕设-旅游攻略打卡\论文\定稿1-4基于Vue + Spring Boot + 协同过滤的旅游打卡平台设计与实现.docx"
d = Document(p)
kw = ["t_user", "t_spot", "t_checkin_record", "t_rating_record", "t_comment", "t_like",
      "t_topic", "t_post", "t_post_want", "t_bgm", "图4-3", "图4-4", "图4-2", "图4-1",
      "ER", "E-R", "实体", "余弦", "相似度", "皮尔逊", "评分矩阵"]
for i, para in enumerate(d.paragraphs):
    t = para.text.strip()
    if not t:
        continue
    if any(k in t for k in kw):
        print(i, "|", t[:300])

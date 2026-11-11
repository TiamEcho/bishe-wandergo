# -*- coding: utf-8 -*-
import sys
sys.path.insert(0, r"d:\Documents\Tencent Files\毕设\毕设")
from _fig_base import *

fig, ax = canvas(297, 175)
title(ax, "图4-2  系统功能模块图", 166)

# 顶层
top_w, top_h = 96.0, 17.0
top_x, top_y = (297 - top_w) / 2, 140.0
box(ax, top_x, top_y, top_w, top_h, "旅游打卡平台（WANDERGO）", fill=C_ORANGE, fs=11, bold=True)

MODS = [
    ("用户模块", ["用户注册", "用户登录", "身份校验"]),
    ("景点模块", ["景点列表", "景点详情", "环球地图点亮"]),
    ("AI规划模块", ["需求解析", "模块化攻略", "预算规划"]),
    ("打卡社区模块", ["打卡发布", "评分 / 收藏 / 评论", "排行榜与徽章", "话题热度"]),
    ("推荐模块", ["评分数据采集", "相似度计算", "Top-N 推荐", "冷启动兜底"]),
    ("个人中心", ["足迹统计", "徽章墙", "历史记录管理"]),
]

MW, MGAP = 39.0, 6.0
MX = (297 - (6 * MW + 5 * MGAP)) / 2
MY, MH = 107.0, 15.0
CW, CGAP = 33.0, 6.0
CH, CV = 11.5, 4.0

for i, (name, subs) in enumerate(MODS):
    cx0 = MX + i * (MW + MGAP)
    cxm = cx0 + MW / 2
    # 顶层 -> 模块标题（一根斜直线）
    line(ax, [(top_x + top_w / 2, top_y), (cxm, MY + MH)])
    box(ax, cx0, MY, MW, MH, name, fill=C_BLUE2, fs=10, bold=True)
    # 模块标题 -> 子功能（L 形折线：竖线 + 分支竖线）
    xb = cx0 + 4.0
    cy_first = MY - CV - CH
    line(ax, [(cxm, MY), (cxm, cy_first + CH / 2)])
    for j, s in enumerate(subs):
        cy = MY - CV - CH - j * (CH + CV)
        line(ax, [(xb, cy + CH), (xb, cy + CH / 2), (cx0 + CGAP, cy + CH / 2)])
        box(ax, cx0 + CGAP, cy, CW, CH, s, fs=9)

save(fig, "图4-2_系统功能模块图")

# -*- coding: utf-8 -*-
"""图4-2 系统功能模块图：根节点 -> 汇流母线 -> 模块 -> 子功能，全部竖向首尾相接"""
import sys
sys.path.insert(0, r"d:\Documents\Tencent Files\毕设\毕设")
from _fig_base import *

PW, PH = 240.0, 150.0
fig, ax = canvas(PW, PH)
title(ax, "图4-2  系统功能模块图", 140.0, x=PW / 2, fs=13)

MODS = [
    ("用户模块", ["用户注册", "用户登录", "身份校验"]),
    ("景点模块", ["景点列表", "景点详情", "环球地图点亮"]),
    ("AI规划模块", ["需求解析", "模块化攻略", "预算规划"]),
    ("打卡社区模块", ["打卡发布", "评分/收藏/评论", "排行榜与徽章", "话题热度"]),
    ("推荐模块", ["评分数据采集", "相似度计算", "Top-N 推荐", "冷启动兜底"]),
    ("个人中心", ["足迹统计", "徽章墙", "历史记录管理"]),
]

ROOT_TOP, ROOT_H = 122.0, 11.0
MW, MH = 27.0, 9.0
CW, CH = 27.0, 8.4
VG, HG = 4.4, 5.0

total = len(MODS) * MW + (len(MODS) - 1) * HG
x0 = (PW - total) / 2.0
centers = [x0 + i * (MW + HG) + MW / 2 for i in range(len(MODS))]

box(ax, x0, ROOT_TOP - ROOT_H, total, ROOT_H,
    "旅游打卡平台（WANDERGO）", fill=C_ORANGE, fs=12.5, bold=True)

BUS = ROOT_TOP - ROOT_H - 8.0
MOD_TOP = BUS - 7.0
line(ax, [(PW / 2, ROOT_TOP - ROOT_H), (PW / 2, BUS)])
line(ax, [(centers[0], BUS), (centers[-1], BUS)])
for cx in centers:
    line(ax, [(cx, BUS), (cx, MOD_TOP)])

for cx, (mname, subs) in zip(centers, MODS):
    box(ax, cx - MW / 2, MOD_TOP - MH, MW, MH, mname,
        fill=C_BLUE2, fs=10.5, bold=True)
    y = MOD_TOP - MH
    for s in subs:
        line(ax, [(cx, y), (cx, y - VG)])
        y -= VG
        box(ax, cx - CW / 2, y - CH, CW, CH, s, fill=C_WHITE, fs=9.0)
        y -= CH

save(fig, "图4-2_系统功能模块图")

# -*- coding: utf-8 -*-
"""图4-4 协同过滤推荐流程图：主干自上而下首尾相接，分叉/汇合/兜底汇入/结束均完整闭合"""
import sys
sys.path.insert(0, r"d:\Documents\Tencent Files\毕设\毕设")
from _fig_base import *

PW, PH = 190.0, 250.0
fig, ax = canvas(PW, PH)
title(ax, "图4-4  协同过滤推荐流程图", 240.0, x=PW / 2, fs=13)

CX = PW / 2
BW, BH = 64.0, 12.0
GAP = 8.0
FO = "#C6DBEF"


def node(y_top, t, w=BW, h=BH, cx=CX, fill=C_WHITE, fs=10.5):
    y_bot = y_top - h
    box(ax, cx - w / 2, y_bot, w, h, t, fill=fill, fs=fs)
    return dict(top=y_top, bot=y_bot, l=cx - w / 2, r=cx + w / 2,
                cx=cx, cy=y_bot + h / 2)


# 开始
OV = 228.0
oval(ax, CX, OV - 10, 28, 10, "开始")
line(ax, [(CX, OV - 10), (CX, 208.0)])

n1 = node(208.0, "读取用户评分记录")
line(ax, [(CX, n1["bot"]), (CX, n1["bot"] - GAP)])
n2 = node(n1["bot"] - GAP, "构建用户—景点评分矩阵")

# 分叉
BRW = 62.0
BLX, BRX = 36.0, PW - 36.0
FORK = n2["bot"] - 10.0
a = node(FORK, "计算用户相似度（UserCF）", w=BRW, cx=BLX, fill=FO)
b = node(FORK, "计算景点相似度（ItemCF）", w=BRW, cx=BRX, fill=FO)
line(ax, [(CX, n2["bot"]), (CX, FORK)])
line(ax, [(BLX, FORK), (BRX, FORK)])
line(ax, [(BLX, FORK), (BLX, a["top"])])
line(ax, [(BRX, FORK), (BRX, b["top"])])

# 汇合
JOIN = a["bot"] - 10.0
f = node(JOIN, "融合得分 = 0.5 × UserCF + 0.5 × ItemCF", w=BW + 26, fs=10.0)
line(ax, [(BLX, a["bot"]), (BLX, JOIN)])
line(ax, [(BRX, b["bot"]), (BRX, JOIN)])
line(ax, [(BLX, JOIN), (BRX, JOIN)])
line(ax, [(CX, JOIN), (CX, f["top"])])

# 判断
DW, DH = 48.0, 22.0
DCY = f["bot"] - GAP - DH / 2
diamond(ax, CX, DCY, DW, DH, "是否新用户？", fs=10.5)
line(ax, [(CX, f["bot"]), (CX, DCY + DH / 2)])

# 是 -> 热门兜底
h = node(DCY + BH / 2, "热门景点兜底推荐", w=50, cx=CX + DW / 2 + 8 + 25,
         fill=C_ORANGE, fs=9.5)
line(ax, [(CX + DW / 2, DCY), (h["l"], DCY)])
ax.text(CX + DW / 2 + 3.0, DCY + 2.0, "是", fontsize=10, ha="left", va="bottom")

# 否 -> 向下
n3 = node(DCY - DH / 2 - GAP, "候选集过滤与 Top-N 排序")
line(ax, [(CX, DCY - DH / 2), (CX, n3["top"])])
ax.text(CX + 2.8, DCY - DH / 2 - 2.2, "否", fontsize=10, ha="left", va="top")

n4 = node(n3["bot"] - GAP, "生成推荐列表并返回前端")
line(ax, [(CX, n3["bot"]), (CX, n4["top"])])

# 兜底分支汇入「生成推荐列表」右边框
line(ax, [(h["cx"], h["bot"]), (h["cx"], n4["cy"])])
line(ax, [(h["cx"], n4["cy"]), (n4["r"], n4["cy"])])

# 结束
line(ax, [(CX, n4["bot"]), (CX, 24.0)])
oval(ax, CX, 24.0 - 10, 28, 10, "结束")

save(fig, "图4-4_协同过滤推荐流程图")

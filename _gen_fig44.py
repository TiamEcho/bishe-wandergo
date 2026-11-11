# -*- coding: utf-8 -*-
import sys
sys.path.insert(0, r"d:\Documents\Tencent Files\毕设\毕设")
from _fig_base import *

fig, ax = canvas(150, 210)
title(ax, "图4-4  协同过滤推荐流程图", 200, 75)

CX = 75.0
BW = 62.0
BH = 12.0
GAP = 8.0

y = 178.0


def step(y, t, h=BH):
    box(ax, CX - BW / 2, y, BW, h, t, fill=C_WHITE, fs=10)
    return (CX - BW / 2, y, BW, h)


def link(y1, y2):
    line(ax, [(CX, y1), (CX, y2)])


# 开始
oval(ax, CX, y, 26, 11, "开始")
link(y - 5.5, 173.0)
y = 173.0

# 读取用户评分记录
box(ax, CX - BW / 2, y - BH, BW, BH, "读取用户评分记录", fill=C_WHITE, fs=10)
link(y - BH, y - BH - GAP)
y = y - BH - GAP

# 用户-景点评分矩阵
box(ax, CX - BW / 2, y - BH, BW, BH, "构建用户—景点评分矩阵", fill=C_WHITE, fs=10)
link(y - BH, y - BH - GAP)
y = y - BH - GAP

# 分叉：两条分支
BR_W = 50.0
BLX = 8.0
BRX = 72.0
BY = y - BH - GAP - 4.0
box(ax, BLX, BY - BH, BR_W, BH, "计算用户相似度（UserCF）", fill=C_WHITE, fs=9.5)
box(ax, BRX, BY - BH, BR_W, BH, "计算景点相似度（ItemCF）", fill=C_WHITE, fs=9.5)
line(ax, [(CX, y - BH), (CX, (BY - BH + y - BH) / 2)])
line(ax, [((BLX + BR_W / 2), (BY - BH + y - BH) / 2), (CX, (BY - BH + y - BH) / 2)])
line(ax, [(CX, (BY - BH + y - BH) / 2), ((BRX + BR_W / 2), (BY - BH + y - BH) / 2)])
line(ax, [((BLX + BR_W / 2), (BY - BH + y - BH) / 2), (BLX + BR_W / 2, BY - BH)])
line(ax, [((BRX + BR_W / 2), (BY - BH + y - BH) / 2), (BRX + BR_W / 2, BY - BH)])

# 融合
FY = BY - BH - GAP - 6.0
box(ax, CX - BW / 2 - 6, FY - BH, BW + 12, BH, "融合得分 = 0.5 × UserCF + 0.5 × ItemCF", fill=C_WHITE, fs=9.5)
line(ax, [(BLX + BR_W / 2, BY - BH), (BLX + BR_W / 2, FY - BH + BH / 2)])
line(ax, [(BRX + BR_W / 2, BY - BH), (BRX + BR_W / 2, FY - BH + BH / 2)])
line(ax, [(BLX + BR_W / 2, FY - BH + BH / 2), (BRX + BR_W / 2, FY - BH + BH / 2)])

# 判断
DY = FY - BH - 14.0
diamond(ax, CX, DY, 52, 22, "是否新用户？", fs=9.5)
link(FY - BH, DY + 11)

# 是 → 热门兜底（右）
box(ax, 108, DY - 7, 36, 14, "热门景点兜底推荐", fill=C_ORANGE, fs=9)
line(ax, [(CX + 26, DY), (108, DY)])
ax.text(CX + 30, DY + 3.5, "是", fontsize=9, ha="left", va="bottom")

# 否 → 向下
NY = DY - 11 - GAP
box(ax, CX - BW / 2, NY - BH, BW, BH, "候选集过滤与 Top-N 排序", fill=C_WHITE, fs=10)
line(ax, [(CX, DY - 11), (CX, NY)])
ax.text(CX + 2.2, DY - 15, "否", fontsize=9, ha="left", va="center")

# 生成列表
GY = NY - BH - GAP
box(ax, CX - BW / 2, GY - BH, BW, BH, "生成推荐列表并返回前端", fill=C_WHITE, fs=10)
link(NY - BH, GY)

# 热门兜底汇入
line(ax, [(126, DY - 7), (126, GY - BH / 2)])
line(ax, [(126, GY - BH / 2), (CX + BW / 2, GY - BH / 2)])
line(ax, [(126, DY - 7), (126, GY - BH / 2)])

# 结束
EY = GY - BH - GAP - 4
oval(ax, CX, EY, 26, 11, "结束")
link(GY - BH, EY + 5.5)

save(fig, "图4-4_协同过滤推荐流程图")

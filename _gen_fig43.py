# -*- coding: utf-8 -*-
"""图4-3 系统 E-R 图：连线端点严格落在实体边框，且不穿越任何实体"""
import sys
sys.path.insert(0, r"d:\Documents\Tencent Files\毕设\毕设")
from _fig_base import *

PW, PH = 300.0, 200.0
fig, ax = canvas(PW, PH)
title(ax, "图4-3  系统 E-R 图", 192.5, x=PW / 2, fs=12.5)

W = 50.0
HDR, ROW = 5.2, 3.0
GAP = 3.4
FS_F = 6.2


def ent(x, yb, name, fields):
    h = HDR + ROW * len(fields)
    box(ax, x, yb, W, h, "", fill=C_WHITE)
    box(ax, x, yb + h - HDR, W, HDR, name, fill=C_BLUE2, fs=8.4, bold=True)
    for i, f in enumerate(fields):
        fy = yb + h - HDR - ROW * (i + 1)
        box(ax, x, fy, W, ROW, "", fill=C_WHITE)
        ax.text(x + 1.1, fy + ROW / 2, f, fontsize=FS_F, ha="left", va="center", zorder=3)
    return yb + h, yb


# ---------- 左列 ----------
U_X = 5.0
U_F = ["id（主键）", "username 登录账号", "password 登录密码", "avatar 头像",
       "role 角色", "status 状态", "createdAt 注册时间"]
U_TOP = 178.0
U_BOT = U_TOP - (HDR + ROW * len(U_F))
ent(U_X, U_BOT, "用户", U_F)

T_TOP = U_BOT - 7.0
T_F = ["id（主键）", "topicCode 话题编码", "title 话题名称", "heat 话题热度"]
T_BOT = T_TOP - (HDR + ROW * len(T_F))
ent(U_X, T_BOT, "话题", T_F)

P_TOP = T_BOT - 7.0
P_F = ["id（主键）", "nick 发布用户", "title 标题", "type 类型",
       "spotId 关联景点", "topicCode 所属话题", "likeCount 点赞数"]
P_BOT = P_TOP - (HDR + ROW * len(P_F))
ent(U_X, P_BOT, "社区帖子", P_F)

ux = U_X + W / 2
line(ax, [(ux, U_BOT), (ux, T_TOP)])
label(ax, ux + 1.2, (U_BOT + T_TOP) / 2, "1 : n 归属", fs=6.6, ha="left")
line(ax, [(ux, T_BOT), (ux, P_TOP)])
label(ax, ux + 1.2, (T_BOT + P_TOP) / 2, "1 : n 归类", fs=6.6, ha="left")

# ---------- 中列 ----------
S_X = 76.0
S_W = 52.0
SPOTS = [
    ("打卡记录", ["id（主键）", "nick 打卡用户", "spotId（外键）", "type 打卡类型",
                  "title / content 标题·正文", "images 图片 / 视频",
                  "cost / mood 花费·心情", "createdAt 打卡时间"]),
    ("评分记录", ["id（主键）", "nick 评分用户", "spotId（外键）",
                  "score 评分分值（1~5）", "createdAt 评分时间"]),
    ("评论记录", ["id（主键）", "nick 评论者", "spotId（外键）",
                  "content 评论内容", "status 审核状态", "createdAt 评论时间"]),
    ("点赞记录", ["id（主键）", "nick 点赞用户", "spotId（外键）", "createdAt 点赞时间"]),
    ("想去记录", ["id（主键）", "nick 收藏用户", "spotId（外键）", "createdAt 收藏时间"]),
]
VERB = ["打卡", "评分", "发表", "点赞", "想去"]

W = S_W
blocks = []
y = 178.0
for name, fields in SPOTS:
    h = HDR + ROW * len(fields)
    ent(S_X, y - h, name, fields)
    blocks.append((y, y - h))
    y = y - h - GAP
W = 50.0

# 用户 -> 五张记录表
BUS = U_X + W + 5.0
line(ax, [(U_X + W, (U_BOT + U_TOP) / 2), (BUS, (U_BOT + U_TOP) / 2)])
ys = [(t + b) / 2 for t, b in blocks]
line(ax, [(BUS, ys[0]), (BUS, ys[-1])])
for yy, v in zip(ys, VERB):
    line(ax, [(BUS, yy), (S_X, yy)])
    label(ax, BUS + 1.0, yy + 1.3, "1 : n " + v, fs=6.6, ha="left")

# ---------- 右列：景点 ----------
E_X = 168.0
E_F = ["id（主键）", "spotId 业务编码", "name 名称", "city / province 城市·省份",
       "lng / lat 经纬度", "rating 平台评分", "heat 热度", "source 数据来源"]
E_TOP = 160.0
E_BOT = E_TOP - (HDR + ROW * len(E_F))
ent(E_X, E_BOT, "景点", E_F)

BUS2 = S_X + S_W + 6.0
line(ax, [(S_X + S_W, (E_BOT + E_TOP) / 2), (E_X, (E_BOT + E_TOP) / 2)])
line(ax, [(BUS2, ys[0]), (BUS2, ys[-1])])
for yy in ys:
    line(ax, [(S_X + S_W, yy), (BUS2, yy)])
    label(ax, BUS2 - 1.0, yy + 1.3, "n : 1", fs=6.6, ha="right")

# 社区帖子 -> 景点：绕图幅下沿
DET = 2.5
cxs = U_X + W / 2
cxe = E_X + 25.0
line(ax, [(cxs, P_BOT), (cxs, DET)])
line(ax, [(cxs, DET), (cxe, DET)])
line(ax, [(cxe, DET), (cxe, E_BOT)])
label(ax, (cxs + cxe) / 2, DET + 1.6, "n : 1 关联", fs=6.8)

save(fig, "图4-3_系统ER图")

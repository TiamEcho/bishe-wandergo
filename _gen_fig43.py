# -*- coding: utf-8 -*-
import sys
sys.path.insert(0, r"d:\Documents\Tencent Files\毕设\毕设")
from _fig_base import *

fig, ax = canvas(297, 250)
title(ax, "图4-3  系统 E-R 图", 240)

HW = 8.0      # 标题栏高
RH = 4.6      # 字段行高


def entity(x, y, w, name, fields):
    """实体：浅蓝标题栏 + 字段行；(x,y) 为左下角"""
    h = HW + RH * len(fields)
    box(ax, x, y, w, h, fill=C_WHITE)
    box(ax, x, y + h - HW, w, HW, name, fill=C_BLUE2, fs=9, bold=True)
    for i, f in enumerate(fields):
        fy = y + h - HW - (i + 1) * RH
        ax.add_line(Line2D([x, x + w], [fy, fy], color="#9A9A9A",
                           linewidth=0.4, zorder=3))
        ax.text(x + 1.8, fy + RH / 2, f, fontsize=6.8, ha="left",
                va="center", zorder=4)
    return dict(x=x, y=y, w=w, h=h,
                l=(x, y + h / 2), r=(x + w, y + h / 2),
                t=(x + w / 2, y + h), b=(x + w / 2, y))


def tag(x, y, t):
    ax.text(x, y, t, fontsize=7.6, ha="center", va="center", zorder=6,
            bbox=dict(boxstyle="square,pad=0.12", facecolor="white",
                      edgecolor="none"))


# 列坐标
LX, LW_ = 20, 62
CX, CW = 118, 62
RX, RW = 216, 62
TOP = 184

# 中间列：自顶向下依次排 5 张记录表，先算高度再确定起点
MID_ITEMS = [
    ("打卡记录", ["id（主键）", "nick 打卡用户", "spotId（外键）", "type 打卡类型",
                  "title / content 标题·正文", "images 图片 / 视频",
                  "cost / mood 花费·心情", "createdAt 打卡时间"]),
    ("评分记录", ["id（主键）", "nick 评分用户", "spotId（外键）",
                  "score 评分分值（1~5）", "createdAt 评分时间"]),
    ("评论记录", ["id（主键）", "nick 评论者", "spotId（外键）",
                  "content 评论内容", "status 审核状态", "createdAt 评论时间"]),
    ("点赞记录", ["id（主键）", "nick 点赞用户", "spotId（外键）",
                  "createdAt 点赞时间"]),
    ("想去记录", ["id（主键）", "nick 收藏用户", "spotId（外键）",
                  "createdAt 收藏时间"]),
]
GAP = 7.0
_total = sum(HW + RH * len(f) for _, f in MID_ITEMS) + GAP * (len(MID_ITEMS) - 1)
_y = 206.0                                       # 中间列顶端
mid_ents = []
for nm, fs in MID_ITEMS:
    h = HW + RH * len(fs)
    _y -= h
    mid_ents.append(entity(CX, _y, CW, nm, fs))
    _y -= GAP
CK, RT, CM, LK, WANT = mid_ents

U = entity(LX, 120, LW_, "用户",
           ["id（主键）", "username 登录账号", "password 登录密码",
            "avatar 头像", "role 角色", "status 状态", "createdAt 注册时间"])

TP = entity(LX, 66, LW_, "话题",
            ["id（主键）", "topicCode 话题编码", "title 话题名称", "heat 话题热度"])

PO = entity(LX, 12, LW_, "社区帖子",
            ["id（主键）", "nick 发布用户", "title 标题", "type 类型",
             "spotId 关联景点", "topicCode 所属话题", "likeCount 点赞数"])

SP = entity(RX, 78, RW, "景点",
            ["id（主键）", "spotId 业务编码", "name 名称",
             "city / province 城市·省份", "lng / lat 经度·纬度",
             "rating 平台评分", "heat 热度", "source 数据来源"])

# ===== 用户 -> 记录类（从用户右侧一点引出，放射到各记录左边缘）=====
src = (U["x"] + LW_, U["y"] + 6)
for e, lb in zip(mid_ents,
                 ["1 : n  发布", "1 : n  评分", "1 : n  发表",
                  "1 : n  点赞", "1 : n  想去"]):
    line(ax, [src, e["l"]])
    tag((src[0] + e["l"][0]) / 2, (src[1] + e["l"][1]) / 2 + 2.6, lb)

# ===== 各记录 -> 景点（n : 1，统一汇到景点左侧一点）=====
dst = (SP["x"], SP["y"] + SP["h"] / 2)
for i, e in enumerate(mid_ents):
    line(ax, [e["r"], dst])
    mx = (e["r"][0] + dst[0]) / 2
    my = (e["r"][1] + dst[1]) / 2 + 2.6
    if i == len(mid_ents) - 1:                  # 最后一根线极平，错开避免压标题
        mx -= 6.0; my += 2.0
    ax.text(mx, my, "n : 1", fontsize=7.6, ha="center", va="center", zorder=6,
            bbox=dict(boxstyle="square,pad=0.12", facecolor="white",
                      edgecolor="none"))

# ===== 用户 1 : n 话题 =====
line(ax, [(U["x"] + 30, U["y"]), (U["x"] + 30, TP["t"][1])])
tag(U["x"] + 30 + 17, (U["y"] + TP["t"][1]) / 2, "1 : n  归属")

# ===== 话题 1 : n 社区帖子 =====
line(ax, [(TP["x"] + 30, TP["y"]), (TP["x"] + 30, PO["t"][1])])
tag(TP["x"] + 30 + 17, (TP["y"] + PO["t"][1]) / 2, "1 : n  归类")

# ===== 社区帖子 n : 1 景点（从底部绕行，不穿过相册/想去记录）=====
_yb = PO["y"] - 8
line(ax, [(PO["x"] + LW_, _yb), (SP["x"] - 20, _yb)])
line(ax, [(SP["x"] - 20, _yb), (SP["x"] - 20, SP["y"] + 18)])
line(ax, [(SP["x"] - 20, SP["y"] + 18), (SP["x"], SP["y"] + 18)])
tag((PO["x"] + LW_ + SP["x"] - 20) / 2, _yb + 3.6, "n : 1  关联")

save(fig, "图4-3_系统ER图")

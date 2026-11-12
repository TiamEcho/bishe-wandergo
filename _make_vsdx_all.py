# -*- coding: utf-8 -*-
"""生成图4-1 ~ 图4-4 的 Visio 原生文件（.vsdx，可双击编辑）"""
import sys
sys.path.insert(0, r"d:\Documents\Tencent Files\毕设\毕设")
from _vs_lib import *

# ============================================================
# 图4-1 系统总体架构图
# ============================================================
def fig41():
    W, H = 297.0, 190.0
    d = Doc(W, H)
    d.txt(W / 2, H - 9, "图4-1  系统总体架构图", fs=13, bold=True, wmm=60)

    L, LW_ = 26.0, 245.0
    HH, GAP = 40.0, 26.0
    TOP = 174.0
    layers = [
        ("表现层（前端 · Vue 3 + HTML / CSS / JavaScript）", C_BLUE_L,
         ["18 个 HTML 页面\n多页面应用（MPA）",
          "Vue 3 数据绑定\nCDN 引入 · 无构建",
          "ECharts 环球地图\nThree.js 三维地球",
          "Axios 接口请求\nJSON 数据交换"]),
        ("业务逻辑层（Spring Boot 3.2.5 · JDK 17）", C_ORANGE,
         ["UserController\n用户与令牌",
          "SpotController\n景点数据",
          "CheckinController\n打卡与评分",
          "CommunityController\n社区与评论",
          "RecommendController\n推荐计算",
          "AdminController\n后台管理"]),
        ("数据层（MySQL 8.0 主库 · PostgreSQL 演示库）", C_GREEN,
         ["12 张业务数据表\nt_user、t_spot 等",
          "MyBatis-Plus 3.5.5\nMapper 映射",
          "Python 爬虫\n景点与社区数据"]),
    ]
    ys = []
    for k, (name, color, items) in enumerate(layers):
        yt = TOP - k * (HH + GAP) - HH
        ys.append(yt)
        d.rect(L, yt, LW_, HH, "", fill=color)
        d.txt(L + LW_ / 2, yt + HH - 6.0, name, fs=10, bold=True, wmm=LW_ - 8)
        n = len(items)
        pad, gap = 6.0, 5.0
        cw = (LW_ - 2 * pad - (n - 1) * gap) / n
        for i, it in enumerate(items):
            d.rect(L + pad + i * (cw + gap), yt + 5.0, cw, HH - 15.0, it, fs=9)

    XT = [L + LW_ * 0.24, L + LW_ * 0.50, L + LW_ * 0.76]
    for x in XT:
        d.line([(x, ys[0]), (x, ys[1] + HH)])
    for x in XT:
        d.line([(x, ys[1]), (x, ys[2] + HH)])

    d.txt(L + LW_ * 0.5, (ys[0] + ys[1] + HH) / 2 - 1.5,
          "HTTP / JSON（RESTful 接口）", fs=8.5, wmm=60)
    d.txt(L + LW_ * 0.5, (ys[1] + ys[2] + HH) / 2 - 1.5,
          "JDBC / MyBatis-Plus", fs=8.5, wmm=45)
    d.save("图4-1_系统总体架构图")


# ============================================================
# 图4-2 系统功能模块图
# ============================================================
def fig42():
    PW, PH = 240.0, 150.0
    d = Doc(PW, PH)
    d.txt(PW / 2, PH - 8, "图4-2  系统功能模块图", fs=13, bold=True, wmm=60)

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

    root = d.rect(x0, ROOT_TOP - ROOT_H, total, ROOT_H,
                  "旅游打卡平台（WANDERGO）", fill=C_ORANGE, fs=12, bold=True)

    BUS = ROOT_TOP - ROOT_H - 8.0
    MOD_TOP = BUS - 7.0
    d.line([(PW / 2, ROOT_TOP - ROOT_H), (PW / 2, BUS)])
    d.line([(centers[0], BUS), (centers[-1], BUS)])

    for cx, (mname, subs) in zip(centers, MODS):
        d.line([(cx, BUS), (cx, MOD_TOP)])
        d.rect(cx - MW / 2, MOD_TOP - MH, MW, MH, mname,
               fill=C_TITLE, fs=10.5, bold=True)
        y = MOD_TOP - MH
        for s in subs:
            d.line([(cx, y), (cx, y - VG)])
            y -= VG
            d.rect(cx - CW / 2, y - CH, CW, CH, s, fill=C_WHITE, fs=9)
            y -= CH
    d.save("图4-2_系统功能模块图")


# ============================================================
# 图4-3 系统 E-R 图
# ============================================================
def fig43():
    PW, PH = 300.0, 200.0
    d = Doc(PW, PH)
    d.txt(PW / 2, PH - 7.5, "图4-3  系统 E-R 图", fs=12.5, bold=True, wmm=56)

    HDR, ROW, GAP = 5.2, 3.0, 3.4
    FS_F = 6.2

    def ent(x, yb, w, name, fields, fs=8.4):
        h = HDR + ROW * len(fields)
        d.rect(x, yb, w, h, "", fill=C_WHITE)
        d.rect(x, yb + h - HDR, w, HDR, name, fill=C_TITLE, fs=fs, bold=True)
        for i, f in enumerate(fields):
            fy = yb + h - HDR - ROW * (i + 1)
            d.rect(x, fy, w, ROW, "", fill=C_WHITE)
            t = d.txt(x + 1.1, fy + ROW / 2, f, fs=FS_F, wmm=w - 2, align=1)
        return yb + h, yb

    # 左列
    U_X, W1 = 5.0, 50.0
    U_F = ["id（主键）", "username 登录账号", "password 登录密码", "avatar 头像",
           "role 角色", "status 状态", "createdAt 注册时间"]
    U_TOP = 178.0
    U_BOT = U_TOP - (HDR + ROW * len(U_F))
    ent(U_X, U_BOT, W1, "用户", U_F)

    T_TOP = U_BOT - 7.0
    T_F = ["id（主键）", "topicCode 话题编码", "title 话题名称", "heat 话题热度"]
    T_BOT = T_TOP - (HDR + ROW * len(T_F))
    ent(U_X, T_BOT, W1, "话题", T_F)

    P_TOP = T_BOT - 7.0
    P_F = ["id（主键）", "nick 发布用户", "title 标题", "type 类型",
           "spotId 关联景点", "topicCode 所属话题", "likeCount 点赞数"]
    P_BOT = P_TOP - (HDR + ROW * len(P_F))
    ent(U_X, P_BOT, W1, "社区帖子", P_F)

    ux = U_X + W1 / 2
    d.line([(ux, U_BOT), (ux, T_TOP)])
    d.txt(ux + 10, (U_BOT + T_TOP) / 2, "1 : n 归属", fs=6.6, wmm=18)
    d.line([(ux, T_BOT), (ux, P_TOP)])
    d.txt(ux + 10, (T_BOT + P_TOP) / 2, "1 : n 归类", fs=6.6, wmm=18)

    # 中列
    S_X, S_W = 76.0, 52.0
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

    blocks = []
    y = 178.0
    for name, fields in SPOTS:
        h = HDR + ROW * len(fields)
        ent(S_X, y - h, S_W, name, fields)
        blocks.append((y, y - h))
        y = y - h - GAP

    # 用户 -> 五张记录表（左侧竖干线）
    BUS = U_X + W1 + 5.0
    ucy = (U_BOT + U_TOP) / 2
    d.line([(U_X + W1, ucy), (BUS, ucy)])
    ys = [(t + b) / 2 for t, b in blocks]
    d.line([(BUS, ys[0]), (BUS, ys[-1])])
    for yy, v in zip(ys, VERB):
        d.line([(BUS, yy), (S_X, yy)])
        d.txt(BUS + 8, yy + 1.6, "1 : n " + v, fs=6.6, wmm=18)

    # 右列
    E_X, E_W = 168.0, 50.0
    E_F = ["id（主键）", "spotId 业务编码", "name 名称", "city / province 城市·省份",
           "lng / lat 经纬度", "rating 平台评分", "heat 热度", "source 数据来源"]
    E_TOP = 160.0
    E_BOT = E_TOP - (HDR + ROW * len(E_F))
    ent(E_X, E_BOT, E_W, "景点", E_F)

    BUS2 = E_X - 8.0
    ecy = (E_BOT + E_TOP) / 2
    d.line([(BUS2, ecy), (E_X, ecy)])
    d.line([(BUS2, ys[0]), (BUS2, ys[-1])])
    for yy in ys:
        d.line([(S_X + S_W, yy), (BUS2, yy)])
        d.txt(BUS2 - 6.0, yy + 1.6, "n : 1", fs=6.6, wmm=10)

    # 社区帖子 -> 景点：从帖子右框引出，沿记录表右侧下行，再进景点底边
    cys = (P_BOT + P_TOP) / 2
    d.line([(U_X + W1, cys), (BUS2 + 4.0, cys), (BUS2 + 4.0, E_BOT),
            (E_X + 25, E_BOT)])
    d.txt(BUS2 + 5.5, cys + 1.6, "n : 1 关联", fs=6.8, wmm=20, align=1)
    d.save("图4-3_系统ER图")


# ============================================================
# 图4-4 协同过滤推荐流程图
# ============================================================
def fig44():
    PW, PH = 210.0, 250.0
    d = Doc(PW, PH)
    d.txt(PW / 2, PH - 8, "图4-4  协同过滤推荐流程图", fs=13, bold=True, wmm=68)

    CX = PW / 2
    BW, BH = 64.0, 12.0
    GAP = 8.0
    FO = "#C6DBEF"

    def node(y_top, t, w=BW, h=BH, cx=CX, fill=C_WHITE, fs=10.5):
        y_bot = y_top - h
        s = d.rect(cx - w / 2, y_bot, w, h, t, fill=fill, fs=fs)
        return dict(top=y_top, bot=y_bot, l=cx - w / 2, r=cx + w / 2,
                    cx=cx, cy=y_bot + h / 2, shp=s)

    OV = 228.0
    d.oval(CX, OV - 10, 28, 10, "开始")
    d.line([(CX, OV - 10), (CX, 208.0)])

    n1 = node(208.0, "读取用户评分记录")
    d.line([(CX, n1["bot"]), (CX, n1["bot"] - GAP)])
    n2 = node(n1["bot"] - GAP, "构建用户—景点评分矩阵")

    BRW = 68.0
    BLX, BRX = 62.0, PW - 62.0
    FORK = n2["bot"] - 10.0
    a = node(FORK, "计算用户相似度（UserCF）", w=BRW, cx=BLX, fill=C_BLUE_L)
    b = node(FORK, "计算景点相似度（ItemCF）", w=BRW, cx=BRX, fill=C_BLUE_L)
    d.line([(CX, n2["bot"]), (CX, FORK)])
    d.line([(BLX, FORK), (BRX, FORK)])
    d.line([(BLX, FORK), (BLX, a["top"])])
    d.line([(BRX, FORK), (BRX, b["top"])])

    JOIN = a["bot"] - 10.0
    f = node(JOIN, "融合得分 = 0.5 × UserCF + 0.5 × ItemCF", w=BW + 26, fs=9.5)
    d.line([(BLX, a["bot"]), (BLX, JOIN)])
    d.line([(BRX, b["bot"]), (BRX, JOIN)])
    d.line([(BLX, JOIN), (BRX, JOIN)])
    d.line([(CX, JOIN), (CX, f["top"])])

    DW, DH = 62.0, 26.0
    DCY = f["bot"] - GAP - DH / 2
    d.diamond(CX, DCY, DW, DH, "是否新用户？", fs=10.5)
    d.line([(CX, f["bot"]), (CX, DCY + DH / 2)])

    h = node(DCY + BH / 2, "热门景点兜底推荐", w=54,
             cx=CX + DW / 2 + 6 + 27, fill=C_ORANGE, fs=9.5)
    d.line([(CX + DW / 2, DCY), (h["l"], DCY)])
    d.txt((CX + DW / 2 + h["l"]) / 2, DCY + 2.6, "是", fs=9, wmm=8)

    n3 = node(DCY - DH / 2 - GAP, "候选集过滤与 Top-N 排序")
    d.line([(CX, DCY - DH / 2), (CX, n3["top"])])
    d.txt(CX + 5, DCY - DH / 2 - 2.6, "否", fs=10, wmm=8)

    n4 = node(n3["bot"] - GAP, "生成推荐列表并返回前端")
    d.line([(CX, n3["bot"]), (CX, n4["top"])])

    d.line([(h["cx"], h["bot"]), (h["cx"], n4["cy"])])
    d.line([(h["cx"], n4["cy"]), (n4["r"], n4["cy"])])

    d.line([(CX, n4["bot"]), (CX, 24.0)])
    d.oval(CX, 14.0, 28, 10, "结束")
    d.save("图4-4_协同过滤推荐流程图")


if __name__ == "__main__":
    which = sys.argv[1] if len(sys.argv) > 1 else "all"
    if which in ("41", "all"):
        fig41()
    if which in ("42", "all"):
        fig42()
    if which in ("43", "all"):
        fig43()
    if which in ("44", "all"):
        fig44()

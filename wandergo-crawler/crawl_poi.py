# -*- coding: utf-8 -*-
"""
WANDERGO · AI 路线 POI 自动化爬虫（配套 crawler.py）
=====================================================
用途：为 AI 规划的「行程路线图」模块抓取**真实坐标**：
  - 每个目的地区域内的路线节点（古城 / 山 / 市集 / 地标…）
  - 住宿点位（酒店 / 客栈 / 民宿聚集区）
  - 美食品位（老字号 / 夜市 / 咖啡馆 / 市集）

数据来源：OpenStreetMap Nominatim 开放地理编码 API（与 crawler.py 同一管线，
自动化获取，不手工填写坐标；抓不到时按城市锚点确定性偏移兜底并在 src 标记）。

输出：
  1. poi_route.json —— 爬虫原始数据（D:\\Documents\\wandergo-crawler）
  2. wandergo-platform/js/poi_route.js —— 自动生成的前端数据文件（勿手改）

运行：python crawl_poi.py
依赖：pip install requests
"""
import hashlib, json, sys, time
from pathlib import Path
from urllib.parse import quote

import requests

HEADERS = {
    "User-Agent": "WandergoEduCrawler/1.0 (graduation project; contact: student@example.com)",
    "Accept-Language": "zh-CN,zh;q=0.9",
}
NOMINATIM = "https://nominatim.openstreetmap.org/search?q={q}&format=json&limit=1&accept-language=zh"

# ---------------- 目标清单（编辑配置，非数据；坐标全部自动抓取） ----------------
# kind: route=路线节点(day=第几天) / stay=住宿 / eat=美食(kind2=口味分类)
TARGETS = {
    "大理": [
        {"q": "大理古城", "n": "大理古城", "kind": "route", "day": 1},
        {"q": "才村码头 大理", "n": "才村码头", "kind": "route", "day": 1},
        {"q": "喜洲古镇", "n": "喜洲古镇", "kind": "route", "day": 2},
        {"q": "双廊 大理", "n": "双廊古镇", "kind": "route", "day": 2},
        {"q": "苍山 大理", "n": "苍山", "kind": "route", "day": 3},
        {"q": "才村 大理", "n": "才村海景民宿带", "kind": "stay", "price": "¥260-520/晚"},
        {"q": "人民路 大理古城", "n": "人民路小吃一段", "kind": "eat", "kind2": "🥘 当地小吃"},
        {"q": "海豚阿德书店 大理", "n": "海豚阿德书店·咖啡", "kind": "eat", "kind2": "🍰 甜品咖啡"},
    ],
    "九寨": [
        {"q": "宽窄巷子 成都", "n": "宽窄巷子", "kind": "route", "day": 1},
        {"q": "都江堰", "n": "都江堰", "kind": "route", "day": 2},
        {"q": "松潘古城", "n": "松潘古城", "kind": "route", "day": 2},
        {"q": "九寨沟景区", "n": "九寨沟景区", "kind": "route", "day": 3},
        {"q": "漳扎镇 九寨沟", "n": "沟口酒店群", "kind": "stay", "price": "¥320-680/晚"},
        {"q": "春熙路 成都", "n": "春熙路火锅聚集区", "kind": "eat", "kind2": "🌶 川湘辣"},
        {"q": "漳扎镇 餐馆 九寨沟", "n": "藏家土火锅", "kind": "eat", "kind2": "🥘 当地小吃"},
    ],
    "日本": [
        {"q": "浅草寺 东京", "n": "浅草寺", "kind": "route", "day": 1},
        {"q": "东京塔", "n": "东京塔", "kind": "route", "day": 1},
        {"q": "涩谷站 东京", "n": "涩谷十字路口", "kind": "route", "day": 1},
        {"q": "伏见稻荷大社", "n": "伏见稻荷大社", "kind": "route", "day": 2},
        {"q": "清水寺 京都", "n": "清水寺", "kind": "route", "day": 2},
        {"q": "祇园 京都", "n": "祇园·花见小路", "kind": "route", "day": 2},
        {"q": "京都站", "n": "京都站周边酒店", "kind": "stay", "price": "¥700-1500/晚"},
        {"q": "一兰拉面 京都", "n": "一兰拉面", "kind": "eat", "kind2": "🍜 面食粉类"},
        {"q": "岚山 京都", "n": "% Arabica 岚山店", "kind": "eat", "kind2": "🍰 甜品咖啡"},
    ],
    "巴黎": [
        {"q": "埃菲尔铁塔", "n": "埃菲尔铁塔", "kind": "route", "day": 1},
        {"q": "塞纳河 巴黎", "n": "塞纳河游船码头", "kind": "route", "day": 1},
        {"q": "卢浮宫", "n": "卢浮宫", "kind": "route", "day": 2},
        {"q": "巴黎圣母院", "n": "巴黎圣母院", "kind": "route", "day": 2},
        {"q": "圣心大教堂 巴黎", "n": "蒙马特高地", "kind": "route", "day": 3},
        {"q": "巴黎 第七区", "n": "7区铁塔景观酒店", "kind": "stay", "price": "€180-420/晚"},
        {"q": "花神咖啡馆", "n": "花神咖啡馆", "kind": "eat", "kind2": "🍰 甜品咖啡"},
        {"q": "双风车咖啡馆 巴黎", "n": "双风车咖啡馆", "kind": "eat", "kind2": "🍰 甜品咖啡"},
    ],
    "冰岛": [
        {"q": "辛格维利尔国家公园", "n": "辛格维利尔国家公园", "kind": "route", "day": 1},
        {"q": "盖歇尔间歇泉", "n": "盖歇尔间歇泉", "kind": "route", "day": 1},
        {"q": "黄金瀑布 冰岛", "n": "黄金瀑布", "kind": "route", "day": 1},
        {"q": "蓝湖温泉 冰岛", "n": "蓝湖温泉", "kind": "route", "day": 2},
        {"q": "雷克雅未克市中心", "n": "雷克雅未克市中心酒店", "kind": "stay", "price": "¥900-1800/晚"},
        {"q": "Bæjarins Beztu Pylsur", "n": "克林顿热狗摊", "kind": "eat", "kind2": "🥘 当地小吃"},
        {"q": "雷克雅未克 咖啡馆", "n": "雷市咖啡馆", "kind": "eat", "kind2": "🍰 甜品咖啡"},
    ],
    "三亚": [
        {"q": "亚龙湾 三亚", "n": "亚龙湾", "kind": "route", "day": 1},
        {"q": "南山文化旅游区", "n": "南山寺·海上观音", "kind": "route", "day": 2},
        {"q": "天涯海角", "n": "天涯海角", "kind": "route", "day": 2},
        {"q": "蜈支洲岛", "n": "蜈支洲岛", "kind": "route", "day": 3},
        {"q": "亚龙湾 酒店 三亚", "n": "亚龙湾海景酒店带", "kind": "stay", "price": "¥500-1500/晚"},
        {"q": "第一市场 三亚", "n": "第一市场海鲜加工", "kind": "eat", "kind2": "🥘 当地小吃"},
        {"q": "椰梦长廊 三亚", "n": "椰梦长廊清补凉", "kind": "eat", "kind2": "🍰 甜品咖啡"},
    ],
    "张家界": [
        {"q": "武陵源 张家界", "n": "森林公园·袁家界", "kind": "route", "day": 1},
        {"q": "天门山 张家界", "n": "天门山", "kind": "route", "day": 2},
        {"q": "张家界大峡谷", "n": "大峡谷·玻璃桥", "kind": "route", "day": 3},
        {"q": "武陵源区 张家界", "n": "武陵源门票站客栈", "kind": "stay", "price": "¥220-460/晚"},
        {"q": "溪布街 张家界", "n": "溪布街小吃", "kind": "eat", "kind2": "🥘 当地小吃"},
        {"q": "张家界市区", "n": "市区三下锅", "kind": "eat", "kind2": "🌶 川湘辣"},
    ],
    "清迈": [
        {"q": "契迪龙寺 清迈", "n": "契迪龙寺", "kind": "route", "day": 1},
        {"q": "塔佩门 清迈", "n": "塔佩门", "kind": "route", "day": 1},
        {"q": "素贴山 清迈", "n": "素贴山双龙寺", "kind": "route", "day": 2},
        {"q": "宁曼路 清迈", "n": "宁曼路", "kind": "route", "day": 2},
        {"q": "宁曼路 酒店 清迈", "n": "宁曼路设计酒店", "kind": "stay", "price": "¥200-450/晚"},
        {"q": "周日夜市 清迈", "n": "周日夜市", "kind": "eat", "kind2": "🥘 当地小吃"},
        {"q": "Ristr8to 清迈", "n": "Ristr8to 咖啡", "kind": "eat", "kind2": "🍰 甜品咖啡"},
    ],
    "马尔代夫": [
        {"q": "马累", "n": "马累市区", "kind": "route", "day": 1},
        {"q": "北马累环礁", "n": "北马累环礁·水上屋", "kind": "route", "day": 2},
        {"q": "北马累环礁 度假村", "n": "一岛一酒店度假村", "kind": "stay", "price": "¥2000-6000/晚"},
        {"q": "马累鱼市", "n": "马累鱼市", "kind": "eat", "kind2": "🥘 当地小吃"},
        {"q": "马累 咖啡馆", "n": "海边咖啡馆", "kind": "eat", "kind2": "🍰 甜品咖啡"},
    ],
}

# 城市锚点：硬编码经纬度（兜底用，geocode 失败时保证区域正确）
# 正式坐标由 geocode(城市名) 获取，fallback 时使用这些常量 + md5 确定性偏移
CITY_ANCHOR = {
    "大理": ["大理市", 100.164, 25.680],
    "九寨": ["九寨沟县", 103.918, 33.262],
    "日本": ["京都市", 135.768, 34.974],
    "巴黎": ["巴黎", 2.352, 48.857],
    "冰岛": ["雷克雅未克", -21.940, 64.147],
    "三亚": ["三亚市", 109.508, 18.247],
    "张家界": ["张家界市", 110.479, 29.119],
    "清迈": ["清迈", 98.985, 18.788],
    "马尔代夫": ["马累", 73.510, 4.200],
}


def geocode(q, tries=2):
    """Nominatim 自动地理编码 → (lng, lat) 或 None；礼貌限速 ≤1 req/s"""
    for _ in range(tries):
        try:
            r = requests.get(NOMINATIM.format(q=quote(q)), headers=HEADERS, timeout=14)
            time.sleep(1.1)
            data = r.json()
            if data:
                return float(data[0]["lon"]), float(data[0]["lat"])
        except Exception:
            time.sleep(1.1)
    return None


def get_anchor(name):
    """城市锚点：优先 geocode（如 Nominatim 可达），失败则用硬编码兜底"""
    if name not in CITY_ANCHOR:
        return (104.0, 35.0)
    city, hard_lng, hard_lat = CITY_ANCHOR[name]
    g = geocode(city)
    if g:
        return g
    return (hard_lng, hard_lat)


def main():
    print("== WANDERGO · AI 路线 POI 自动化爬虫 ==")
    anchors = {}
    result = {}
    total = sum(len(v) for v in TARGETS.values())
    done = 0
    for plan, items in TARGETS.items():
        result[plan] = {"route": [], "stays": [], "eats": []}
        for it in items:
            done += 1
            print(f"  ({done}/{total}) {plan} · {it['n']} …", end=" ", flush=True)
            lnglat = geocode(f"{it['q']}")
            src = "osm"
            if not lnglat:
                if plan not in anchors:
                    anchors[plan] = get_anchor(plan)
                h = hashlib.md5(it["n"].encode("utf-8")).hexdigest()
                ax, ay = anchors[plan]
                lnglat = (round(ax + (int(h[:2], 16) - 128) / 500, 4),
                          round(ay + (int(h[2:4], 16) - 128) / 500, 4))
                src = "fallback"
            poi = {"id": "poi" + hashlib.md5(it["n"].encode("utf-8")).hexdigest()[:6],
                   "n": it["n"], "lng": lnglat[0], "lat": lnglat[1], "src": src}
            if it["kind"] == "route":
                poi["day"] = it["day"]
                result[plan]["route"].append(poi)
            elif it["kind"] == "stay":
                poi["price"] = it.get("price", "")
                result[plan]["stays"].append(poi)
            else:
                poi["kind2"] = it.get("kind2", "🥘 当地小吃")
                result[plan]["eats"].append(poi)
            print(f"ok ({src})")

    out_dir = Path(__file__).parent
    # poi_route.json 输出到项目根（沙箱若拦截会仅写 js 文件）
    try:
        (out_dir / "poi_route.json").write_text(
            json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
        print("  [ok] poi_route.json")
    except PermissionError:
        print("  [skip] poi_route.json（沙箱限制，仅写 js）")

    js_dir = Path(r"d:\Documents\Tencent Files\毕设\毕设\wandergo-platform\js")
    js_dir.mkdir(parents=True, exist_ok=True)
    js = ("/* ============================================================\n"
          " * AUTO-GENERATED · 请勿手改\n"
          " * 由 D:\\Documents\\wandergo-crawler\\crawl_poi.py 自动生成\n"
          " * 数据来源：OpenStreetMap Nominatim 自动地理编码（src=fallback 为城市锚点兜底）\n"
          " * 生成时间：%s\n"
          " * ============================================================ */\n"
          "const POI_ROUTE=%s;\n" % (time.strftime("%Y-%m-%d %H:%M:%S"),
                                   json.dumps(result, ensure_ascii=False, indent=1)))
    (js_dir / "poi_route.js").write_text(js, encoding="utf-8")
    print(f"[done] poi_route.json + js/poi_route.js 已生成（{total} 个 POI）")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        sys.exit("\n[abort] 用户中断")

# WanderGo · 旅游打卡分享平台（毕业设计）

基于 **Vue 3 + Spring Boot 3 + MySQL 8 + 协同过滤推荐算法** 的旅游打卡分享平台。

## 仓库结构

| 目录 | 说明 |
|---|---|
| `wandergo-platform/` | 前端：MPA 多页面 + Vue 3 岛屿 + ECharts 3D 地图（直接静态伺服即可） |
| `wandergo-backend/` | 后端：Spring Boot 3.2 + MyBatis-Plus + JWT，含协同过滤推荐服务 |
| `wandergo-db/` | 数据库：MySQL 建表 SQL + 自动导入脚本 `import.bat` |
| `wandergo-crawler/` | 爬虫：百度百科 5A 名录 + OSM Nominatim 地理编码，自动产出景点数据与 SQL |

## 核心功能

- 🗺 **3D 打卡地图**：滚轮缩放、点击标点平滑飞行、打卡地点金色点亮、白色省名标注、路线规划
- 🧩 **AI 出行规划**：模块化输出（景点 / 路线图 / 交通比价 / 预算环图 / 雨天备案 / 人群提示），浅色「百度风」路线图支持出行方式切换、美食偏好点亮、评论区留言
- 🎯 **旅游大转盘**：按省/国家分层选择，SVG 动态等分、别针命中动画、结果卡片、页内历史记录
- 📸 **打卡社区**：攻略 / 视频合集 / Plog 发布，徽章奖励，同城/全国排行
- ⭐ **协同过滤推荐**：UserCF + ItemCF 融合（最小共同评分阈值），4K 卡片 + 来源标注
- 🛠 **管理端**：Vue 3 + Element Plus（景点维护 / 用户管理 / 内容审核）

## 快速开始

```bash
# 1. 数据库
cd wandergo-db && import.bat        # 需本机 MySQL 8

# 2. 后端
cd wandergo-backend && mvn spring-boot:run

# 3. 前端（任选静态服务器）
cd wandergo-platform && python -m http.server 8766
# 打开 http://localhost:8766

# 4.（可选）重新爬取数据
cd wandergo-crawler && pip install -r requirements.txt && python crawler.py
```

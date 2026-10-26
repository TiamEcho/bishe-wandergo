# WanderGo · 旅游打卡分享平台（毕业设计）

[![Frontend](https://img.shields.io/badge/Frontend-GitHub%20Pages-2ea44f?logo=github)](https://tiamecho.github.io/bishe-wandergo/)
[![Backend](https://img.shields.io/badge/Backend-Render-46e14b?logo=render)](https://wandergo-backend.onrender.com)
[![Java](https://img.shields.io/badge/Java-17-007396?logo=openjdk)](https://www.oracle.com/java/technologies/downloads/)
[![Spring](https://img.shields.io/badge/Spring%20Boot-3.2-6DB33F?logo=spring)](https://spring.io/)
[![Vue](https://img.shields.io/badge/Vue-3-4FC08D?logo=vue.js)](https://vuejs.org/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0-4479A1?logo=mysql)](https://www.mysql.com/)

> 基于 **Vue 3 + Spring Boot 3 + MySQL 8 + 协同过滤推荐算法** 的旅游打卡分享平台。
>
> 🎓 **毕业设计** · 2026 · 包含完整爬虫与自动化建库

## 🔗 在线访问

| 地址 | 说明 |
|---|---|
| **https://tiamecho.github.io/bishe-wandergo/** | 前端（GitHub Pages，静态托管，始终可访问） |
| **https://wandergo-backend.onrender.com** | 后端 API（Render，免费额度；冷启动约 30-60s） |

> ⚠️ Render 免费版 15 分钟无请求会自动休眠，第一次访问后端可能慢半拍，预热一下就好。
> 预热命令：浏览器打开 https://wandergo-backend.onrender.com/api/spot/list ，看到 `[]` 即表示后端已就绪。

## 📂 仓库结构

```
bishe-wandergo/
├── README.md                  # 本文件
├── render.yaml                # Render 一键部署配置
├── wandergo-platform/         # 前端：MPA + Vue 3 岛屿 + ECharts 3D 地图
├── wandergo-backend/          # 后端：Spring Boot 3.2 + MyBatis-Plus + JWT
├── wandergo-db/               # 数据库：建表 SQL + import.bat 自动导入
└── wandergo-crawler/          # 爬虫：百度百科 5A + OSM Nominatim 地理编码
```

## ✨ 核心功能

| 模块 | 功能 |
|---|---|
| 🗺 **3D 打卡地图** | 滚轮缩放、点击标点平滑飞行、打卡地点金色点亮、白色省名标注、路线规划 |
| 🧩 **AI 出行规划** | 模块化输出（景点 / 路线图 / 交通比价 / 预算 / 雨天备案 / 人群提示），浅色百度风路线图支持出行方式切换、美食偏好点亮、评论区留言 |
| 🎯 **旅游大转盘** | 按省/国家分层选择，SVG 动态等分、别针命中动画、结果卡片、页内历史记录 |
| 📸 **打卡社区** | 攻略 / 视频合集 / Plog 发布，徽章奖励，同城/全国排行 |
| ⭐ **协同过滤推荐** | UserCF + ItemCF 融合（最小共同评分阈值），4K 卡片 + 来源标注 |
| 🛠 **管理端** | Vue 3 + Element Plus（景点维护 / 用户管理 / 内容审核） |

## 🚀 快速开始

```bash
# 1. 数据库（MySQL 8）
cd wandergo-db && import.bat

# 2. 后端（Java 17 + Maven 3.9+）
cd wandergo-backend && mvn spring-boot:run
# http://localhost:8080/api/spot/list 应返回 JSON

# 3. 前端（任选静态服务器）
cd wandergo-platform && python -m http.server 8766
# 打开 http://localhost:8766

# 4.（可选）重新爬取数据
cd wandergo-crawler && pip install -r requirements.txt && python crawler.py
```

## 🌐 云端部署（Render 免费）

后端也想在线跑起来？用 Render 免费版，5 分钟搞定，完全自动化。

### Step 1：Render 账号

打开 https://render.com → Sign Up with GitHub → 授权。

### Step 2：建数据库（MySQL，免费）

1. Dashboard → `New` → `MySQL`
2. Instance Name：`wandergo-db`
3. Region：选东京（离国内近）
4. Plan：**Free**（500MB 存储，毕设足够）
5. 等 1 分钟，Render 会显示连接信息

### Step 3：导入初始数据

拿到数据库连接信息后，在本机执行：

```powershell
# Windows 自带 mysql 客户端（或用 Navicat 手动）
mysql -h <RENDER_HOST> -u <USER> -p wandergo < wandergo-db\wandergo.sql
mysql -h <RENDER_HOST> -u <USER> -p wandergo < wandergo-db\upgrade_admin.sql
mysql -h <RENDER_HOST> -u <USER> -p wandergo < wandergo-crawler\seed_spots.sql
```

### Step 4：建 Web Service（后端）

1. Dashboard → `New` → `Web Service` → 选 **Connect a repository** → 选 `TiamEcho/bishe-wandergo`
2. Build Command：`mvn -B -DskipTests clean package`
3. Start Command：`java -jar target/*.jar`
4. Root Directory：`wandergo-backend`
5. Instance Type：**Free**
6. Environment Variables（**必须设置**）：

| Key | Value |
|---|---|
| `MYSQL_URL` | `jdbc:mysql://<RENDER_HOST>:3306/wandergo?useSSL=true&allowPublicKeyRetrieval=true&serverTimezone=Asia/Shanghai` |
| `MYSQL_USERNAME` | Render MySQL 的用户名 |
| `MYSQL_PASSWORD` | Render MySQL 的密码 |
| `PORT` | `10000`（Render 要求） |

7. 点 **Deploy**，等 2-3 分钟。成功后会拿到 `https://wandergo-backend.onrender.com`（或你自定义的名字）。

### Step 5：前端指向云端后端

拿到 Render URL 后，改 `wandergo-platform/js/api.js` 第 20 行：

```js
const RENDER_BACKEND = 'https://你的实际后端URL.onrender.com';
```

然后推送并更新 GitHub Pages：

```powershell
git add wandergo-platform/js/api.js
git commit -m "chore: 前端指向 Render 后端"
git push origin main

# 更新 gh-pages
cd D:\Documents\bishe-wandergo-pages
git add -A
git commit -m "sync: api.js 指向新后端"
git push origin gh-pages
```

## 🛠 技术栈

| 层 | 技术 |
|---|---|
| 前端 | Vue 3 (CDN) · Axios · ECharts 4 · 原生 HTML/CSS/JS · GitHub Pages |
| 后端 | Spring Boot 3.2 · MyBatis-Plus 3.5 · JWT (jjwt 0.11) · MD5 |
| 数据库 | MySQL 8 · DataInitializer · 自动 SQL 导入 |
| 爬虫 | Python · Requests · 百度百科 5A 名录 · OSM Nominatim |
| 部署 | GitHub Pages（前端） · Render（后端 + MySQL） · GitHub（源码） |
| 推荐 | 协同过滤 UserCF + ItemCF 融合，cosine 相似度，MIN_COMMON=2 |

## 📝 License

MIT · 毕业设计作品，仅供学习与参考。

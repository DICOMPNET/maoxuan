# MaoXuan Knowledge

> 以《毛泽东选集》（第一至四卷）为核心文本，把传统的线性阅读转换为可检索、可关联、可探索的档案式阅读体验。

在线查看地址：[maoxuan.heyonepiece.com](https://maoxuan.heyonepiece.com)

## 功能概览

* **导读**：提供四卷内容概览与阅读线索，帮助快速建立整体认知
* **生平轨迹**：在中国地图上动态呈现 1893-1976 年的主要人生节点与迁徙路线，支持按阶段筛选与自动巡览
* **文章浏览**：支持按卷、历史时期、篇目查看原文；文末附"本篇知识"区块，汇总该篇的核心思想、相关事件与涉及实体，并可跳转时间线与知识图谱
* **时间线**：围绕文章整理关键事件，支持定位、缩放与详情联动
* **地图**：在中国地图上标注事件地点，并支持按时间筛选；全国范围事件以浮动徽章单独展示
* **知识图谱**：展示文章、事件、思想、人物与地点之间的关系
* **可视化大屏**：聚合统计指标、生平轨迹巡览、地点分布、关键事件与关系网络，支持全屏展示
* **搜索**：支持检索文章、事件、思想及相关实体
* **问题反馈**：通过 `mailto:` 快速生成邮件草稿，便于反馈问题
* **免责声明**：说明资料来源、抽取方式及使用边界

## 本地运行

```bash
# 后端（默认 8000 端口）
cd backend
python scripts/init_db.py   # 初始化数据库
python scripts/sync.py      # 导入 data/ 下的原文与结构化数据
uvicorn app.main:app --reload

# 前端（默认 5173 端口，API 地址可通过 VITE_API_BASE_URL 配置）
cd frontend
npm install
npm run dev
```

也可以使用 Docker 一键启动：`docker compose up -d`（`build.sh` 支持多平台镜像构建，`export.sh` 用于导出离线镜像包）。

## 部署与维护

本项目基于 Fork 自 [Leo0426/maoxuan-knowledge](https://github.com/Leo0426/maoxuan-knowledge)，样式做了自定义优化，并集成了百度统计。

### 首次部署（宝塔面板 + Docker）

**1. 环境准备**

宝塔软件商店安装：

- Docker 管理器
- Nginx

服务器安装 git：

```bash
yum install -y git
```

**2. 克隆代码**

```bash
cd /www/wwwroot
git clone https://github.com/DICOMPNET/maoxuan.git maoxuan
```

**3. 启动容器**

```bash
cd /www/wwwroot/maoxuan
docker compose up -d --build
```

确认两个容器运行中：`maoxuan-frontend-1`、`maoxuan-backend-1`。

**4. 配置站点反代**

宝塔 → 网站 → 添加站点：

| 项 | 值 |
|---|---|
| 域名 | 你的域名 |
| 根目录 | `/www/wwwroot/maoxuan` |
| PHP | 纯静态 |

站点设置 → 配置文件，将 `server {}` 内的 `location` 替换为：

```nginx
location / {
    proxy_pass http://127.0.0.1:5173;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

同时**注释掉**宝塔默认生成的静态资源缓存块（`location ~ .*\.(js|css|gif|jpg|...)$`）和 PHP 引用（`include enable-php-*.conf`），否则静态资源会被拦截导致 404。

保存后重载 Nginx：

```bash
nginx -t && nginx -s reload
```

**5. SSL（可选）**

站点设置 → SSL → Let's Encrypt 一键申请 → 开启强制 HTTPS。

若使用 Cloudflare CDN，SSL/TLS 模式需设为「Full」或「Full (strict)」，避免回源死循环。

**6. 验证**

| 地址 | 期望 |
|---|---|
| `https://域名/` | 前端首页 |
| `https://域名/health` | `{"status":"ok"}` |
| `https://域名/api/articles?limit=3` | 文章 JSON |

百度统计验证：

```bash
curl -s https://域名 | grep hm.baidu.com
```

### 上游同步配置

本项目 Fork 自上游，配置了自动同步上游内容，同时保留自定义样式。

**1. 添加上游远程**

```bash
cd g:\DICOMP\maoxuan
git remote add upstream https://github.com/Leo0426/maoxuan-knowledge.git
git fetch upstream
```

**2. 样式文件自动保留**

`.gitattributes` 已配置 `frontend/src/styles.css merge=ours`，合并上游时样式文件自动保留本地版本。

启用 merge driver：

```bash
git config merge.ours.driver true
```

### 日常更新操作

#### 场景一：同步上游内容更新

原项目有新内容时，本地执行：

```bash
cd g:\DICOMP\maoxuan
git fetch upstream
git merge upstream/main
git push origin main
```

服务器部署：

```bash
cd /www/wwwroot/maoxuan
git pull
docker compose up -d --build
```

> 样式文件（`styles.css`）会自动保留你的版本，无需手动处理冲突。其他文件（数据、后端、非样式前端代码）自动跟随上游。

#### 场景二：仅更新自有代码/样式

本地修改后：

```bash
cd g:\DICOMP\maoxuan
git add -A
git commit -m "更新说明"
git push origin main
```

服务器部署：

```bash
cd /www/wwwroot/maoxuan
git pull
docker compose up -d --build
```

#### 场景三：仅更新文章数据

替换 `data/processed/*.json` 后：

```bash
# 本地提交推送
git add -A
git commit -m "更新文章数据"
git push origin main

# 服务器拉取并重启后端（自动重新导入数据）
cd /www/wwwroot/maoxuan
git pull
docker compose restart backend
```

### 数据持久化与备份

SQLite 数据库由 Docker volume `maoxuan_backend_data` 持久化，`docker compose down` 不丢数据，`docker compose down -v` 会清除。

**备份数据库：**

```bash
docker run --rm -v maoxuan_backend_data:/data -v $(pwd):/backup alpine \
  tar czf /backup/maoxuan-db-$(date +%Y%m%d).tar.gz -C /data .
```

### 常用运维命令

```bash
cd /www/wwwroot/maoxuan

# 查看容器状态
docker compose ps

# 查看日志
docker compose logs -f

# 重启服务
docker compose restart

# 停止服务
docker compose down

# 重新构建并启动
docker compose up -d --build

# 清理停止的容器
docker container prune
```

## 使用说明

这个项目更适合以下几类场景：

* 阅读《毛泽东选集》时，用来辅助梳理时间脉络与事件关系
* 回顾某一篇文章时，快速定位对应历史背景与相关地点
* 从"文章 — 事件 — 思想 — 实体"的关联视角进行交叉理解
* 通过检索与可视化方式，加深对整体内容结构的记忆

## 问题反馈

如果你也在研读《毛泽东选集》，欢迎交流。
若你发现项目中存在整理错误、遗漏、归类不当或表述不准确的地方，也欢迎通过邮件指出，感谢支持 🙏

## 免责声明

本项目仅用于**文本学习、知识整理与可视化演示**。

其中涉及的事件、实体、关系、地点、摘要与摘录，可能来源于人工整理、脚本处理或 LLM 辅助抽取，因此不可避免地存在遗漏、误判、归并不准确或上下文还原不完整等问题。

如涉及正式引用、历史事实判断、学术研究或严肃考证，请务必以**原始文献、正式出版物及可靠研究资料**为准。
完整说明请参见应用内 `/disclaimer` 页面。

## 后续规划

当前项目仍在持续整理与打磨中。后续计划包括：

* 建立金句索引，按主题与卷次聚合浏览
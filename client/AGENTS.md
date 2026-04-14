# Client - 前端指南

## 技术栈
React 19 + Tailwind CSS 4 + Vite，移动端优先设计

## 色彩体系
- 主色：`emerald-500` / `emerald-600`
- 背景：`#f2f2f2`
- 文字：`#1a1a1a`(标题) / `#333`(正文) / `#999`(辅助)
- 毛玻璃：`.glass` 工具类（backdrop-blur + 半透明白色）

## 布局
- 双列瀑布流 `columns-2` 展示文章卡片
- 底部三栏导航：发现 / 收藏 / 我的
- 文章详情全屏滑入

## 组件约定
- `api.ts` 是唯一 HTTP 接口，组件内不要直接 `fetch`
- 状态管理：纯 `useState` + `localStorage`，无全局状态库
- 收藏存 `localStorage('xlvs_favs')`
- 按钮用 `.press-scale` 工具类做点击反馈
- 文章展示优先用 `rewritten_title` / `rewritten_content`，没有才降级用原始字段

## 人设配色（ArticleCard / ArticleDetail）
- 科技小明 → 蓝色 ⚡
- 投资笔记 → 琥珀 📈
- 生活观察 → 粉色 🌿
- 深度阅读 → 紫色 📖

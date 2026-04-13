---
name: refresh-feeds
description: 一键刷新所有RSS订阅并用作者Agent改写新内容
user_invocable: true
---

# 刷新订阅 & 改写

一键完成：刷新所有RSS订阅源 → 作者Agent改写新内容。

## 步骤

### 1. 刷新RSS订阅

```
curl -s -X POST http://localhost:3001/api/feeds/refresh
```

告诉用户刷新结果（新抓取了多少篇）。

### 2. 调用 /rewrite skill 改写新内容

使用 Skill 工具调用 `rewrite` skill 来改写未处理的文章。

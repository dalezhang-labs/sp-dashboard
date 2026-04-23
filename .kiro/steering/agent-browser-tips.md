---
inclusion: manual
---

# agent-browser 效率技巧

## 并发 session
多个浏览器 session 并行抓取，大幅提升批量任务速度：
```bash
agent-browser --session s1 open https://example.com/page1 &
agent-browser --session s2 open https://example.com/page2 &
wait
agent-browser --session s1 eval "document.body.innerText"
agent-browser --session s2 eval "document.body.innerText"
```

## state save/load
登录一次后保存状态，后续直接加载，跳过登录流程：
```bash
agent-browser state save ./auth-state.json
agent-browser state load ./auth-state.json
```

## snapshot 参数
- `-i` 只看可交互元素（推荐默认用）
- `-c` 紧凑模式，去掉空结构节点
- `-i -u` 包含链接 URL
- `-s "#main"` 限定 CSS 选择器范围
- token 消耗从 3000-5000 降到 200-400

## eval 直接跑 JS
不需要 snapshot → click → snapshot 循环，直接用 eval 在页面上提取数据：
```bash
agent-browser eval "JSON.stringify({title: document.title, url: location.href})"
```

## webFetch rendered 模式替代
对于 SPA 页面的数据抓取，`webFetch` 的 rendered 模式往往比 agent-browser 更高效：
- 不需要管理 session
- 不需要 snapshot/click 循环
- 一次请求拿到完整渲染后的页面内容
- 适合批量抓取已知 URL 的场景

## 录屏调试
```bash
agent-browser record start ./debug.webm
# ... 操作 ...
agent-browser record stop
```

## 代理 & 轮换
批量抓取时用代理轮换避免被封：
```bash
export HTTP_PROXY="http://proxy.example.com:8080"
export NO_PROXY="localhost,*.internal.com"
```

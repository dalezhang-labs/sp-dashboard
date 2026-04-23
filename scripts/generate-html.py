#!/usr/bin/env python3
"""
Generate a modern Chinese HTML report from Shopline App Store data.
Reads scripts/all-apps-data.json, outputs scripts/shopline-apps.html
Sorted by review count descending.
"""
import json
import os
import sys
from datetime import datetime

def load_data():
    with open("scripts/all-apps-data.json") as f:
        return json.load(f)

def rating_bar_html(dist, total):
    if not dist or total == 0:
        return ""
    bars = []
    for star in ["5", "4", "3", "2", "1"]:
        count = dist.get(star, 0)
        pct = (count / total * 100) if total > 0 else 0
        bars.append(f'''<div class="rating-row">
          <span class="star-label">{star}★</span>
          <div class="bar-track"><div class="bar-fill" style="width:{pct:.0f}%"></div></div>
          <span class="bar-count">{count}</span>
        </div>''')
    return "".join(bars)

def price_badge(price):
    if price == "Paid":
        return '<span class="badge badge-paid">付费</span>'
    elif "plan" in price.lower():
        return '<span class="badge badge-freemium">免费版可用</span>'
    elif "trial" in price.lower():
        import re
        m = re.search(r'(\d+)', price)
        days = m.group(1) if m else "?"
        return f'<span class="badge badge-trial">免费试用{days}天</span>'
    else:
        return '<span class="badge badge-free">免费</span>'

def dev_badge(developer, is_official):
    if is_official:
        return '<span class="badge badge-official">✦ 官方</span>'
    return f'<span class="badge badge-third">{developer or "第三方"}</span>'

def cat_zh(cat):
    mapping = {
        "Marketing and Conversion": "营销转化",
        "Store Optimization": "店铺优化",
        "Store Design": "店铺设计",
        "Store Management": "店铺管理",
        "Order and Logistics": "订单物流",
        "Sales Channels": "销售渠道",
        "Product Management": "商品管理",
        "Service Support": "客服支持",
        "Marketing": "营销",
        "Social Trust": "社交信任",
        "Advertising": "广告投放",
        "Customer loyalty": "用户忠诚",
        "Offline Sales": "线下销售",
        "Online Sales": "线上销售",
        "POD": "按需印刷",
        "Dropshipping": "代发货",
        "Digital Products & Services": "数字产品",
        "AI Tools": "AI 工具",
        "Page Builder": "页面构建",
        "Internationalization": "国际化",
        "Finance": "财务",
        "Store Security": "店铺安全",
        "Store Operations": "运营管理",
        "ERP": "ERP",
        "Shipping": "物流配送",
        "Order Management": "订单管理",
        "Returns and Warranty": "退换货",
    }
    return mapping.get(cat, cat or "其他")

def generate_html(apps):
    # Sort by review count descending (primary), rating descending (secondary)
    apps_sorted = sorted(apps, key=lambda x: (x.get("review_count", 0), x.get("rating") or 0), reverse=True)

    total = len(apps)
    official_count = sum(1 for a in apps if a.get("is_official"))
    third_party_count = total - official_count
    rated_apps = [a for a in apps if a.get("rating") is not None]
    avg_rating = sum(a["rating"] for a in rated_apps) / len(rated_apps) if rated_apps else 0
    paid_count = sum(1 for a in apps if a.get("price") == "Paid")
    total_reviews = sum(a.get("review_count", 0) for a in apps)

    # Category breakdown
    cats = {}
    for a in apps:
        cat = a.get("category", "") or ""
        zh = cat_zh(cat)
        cats[zh] = cats.get(zh, 0) + 1
    cats_sorted = sorted(cats.items(), key=lambda x: x[1], reverse=True)

    # Build app cards
    cards_html = ""
    for rank, app in enumerate(apps_sorted, 1):
        slug = app.get("slug", "")
        name = app.get("name", slug)
        developer = app.get("developer", "")
        is_official = app.get("is_official", False)
        rating = app.get("rating")
        review_count = app.get("review_count", 0)
        price = app.get("price", "Free")
        category = app.get("category", "")
        description = app.get("description", "")
        dist = app.get("rating_dist", {})
        earliest = app.get("earliest_review_date", "")
        latest = app.get("latest_review_date", "")

        rating_display = f"{rating:.1f}" if rating else "—"
        cat_display = cat_zh(category)

        # Star display
        if rating:
            full = int(rating)
            half = 1 if (rating - full) >= 0.5 else 0
            empty = 5 - full - half
            stars = '★' * full + ('½' if half else '') + '☆' * empty
        else:
            stars = "暂无评分"

        name_html = f'<a href="https://apps.shopline.com/detail/{slug}" target="_blank" rel="noopener">{name}</a>' if slug else name

        cards_html += f'''
    <div class="app-card" data-category="{cat_display}" data-official="{str(is_official).lower()}" data-price="{price}" data-reviews="{review_count}">
      <div class="card-header">
        <div class="card-rank">#{rank}</div>
        <div class="card-meta">
          <h3 class="app-name">
            {name_html}
          </h3>
          <div class="card-badges">
            {dev_badge(developer, is_official)}
            {price_badge(price)}
            <span class="badge badge-cat">{cat_display}</span>
          </div>
        </div>
        <div class="card-rating">
          <div class="rating-big">{rating_display}</div>
          <div class="rating-stars" title="{rating or '暂无'}">{stars}</div>
          <div class="rating-count">{review_count} 条评论</div>
        </div>
      </div>
      {f'<p class="app-desc">{description[:180]}{"…" if len(description) > 180 else ""}</p>' if description else ""}
      <div class="card-footer">
        {f'<div class="rating-bars">{rating_bar_html(dist, review_count)}</div>' if dist else ""}
        <div class="date-info">
          {f'<span>📅 最早评论：{earliest}</span>' if earliest else ""}
          {f'<span>🕐 最新评论：{latest}</span>' if latest else ""}
        </div>
        {f'<div class="low-reviews"><span class="low-reviews-label">⚠️ 差评摘要</span><p>{app.get("low_star_reviews", "")}</p></div>' if app.get("low_star_reviews") else ""}
      </div>
    </div>'''

    # Category filter buttons
    cat_buttons = f'<button class="filter-btn active" data-filter="all">全部（{total}）</button>\n'
    for cat, count in cats_sorted[:18]:
        cat_buttons += f'    <button class="filter-btn" data-filter="{cat}">{cat}（{count}）</button>\n'

    now_str = datetime.now().strftime("%Y年%m月%d日")

    html = f'''<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Shopline App Store 全量分析报告</title>
  <style>
    *, *::before, *::after {{ box-sizing: border-box; margin: 0; padding: 0; }}

    :root {{
      --bg: #0f1117;
      --surface: #1a1d27;
      --surface2: #22263a;
      --border: #2e3347;
      --text: #e2e8f0;
      --muted: #8892a4;
      --accent: #6366f1;
      --accent2: #22d3ee;
      --green: #22c55e;
      --yellow: #f59e0b;
      --red: #ef4444;
    }}

    body {{
      font-family: -apple-system, "PingFang SC", "Microsoft YaHei", BlinkMacSystemFont, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.6;
    }}

    /* ── Header ── */
    .header {{
      background: linear-gradient(135deg, #1a1d27 0%, #0f1117 100%);
      border-bottom: 1px solid var(--border);
      padding: 40px 24px 32px;
      text-align: center;
    }}
    .header h1 {{
      font-size: 1.9rem;
      font-weight: 700;
      background: linear-gradient(135deg, #6366f1, #22d3ee);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      margin-bottom: 8px;
    }}
    .header p {{ color: var(--muted); font-size: 0.88rem; }}

    /* ── Stats ── */
    .stats-bar {{
      display: flex;
      gap: 12px;
      padding: 24px;
      max-width: 1200px;
      margin: 0 auto;
      flex-wrap: wrap;
    }}
    .stat-card {{
      flex: 1;
      min-width: 120px;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 16px 18px;
      text-align: center;
    }}
    .stat-value {{
      font-size: 1.7rem;
      font-weight: 700;
      color: var(--accent2);
    }}
    .stat-label {{
      font-size: 0.72rem;
      color: var(--muted);
      text-transform: uppercase;
      letter-spacing: 0.04em;
      margin-top: 4px;
    }}

    /* ── Main ── */
    .main {{
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 24px 60px;
    }}

    /* ── Search ── */
    .search-bar {{ margin-bottom: 16px; }}
    .search-bar input {{
      width: 100%;
      background: var(--surface);
      border: 1px solid var(--border);
      color: var(--text);
      padding: 10px 16px;
      border-radius: 8px;
      font-size: 0.9rem;
      outline: none;
      transition: border-color 0.15s;
      font-family: inherit;
    }}
    .search-bar input:focus {{ border-color: var(--accent); }}
    .search-bar input::placeholder {{ color: var(--muted); }}

    /* ── Toggle filters ── */
    .toggle-row {{
      display: flex;
      gap: 8px;
      margin-bottom: 14px;
      flex-wrap: wrap;
      align-items: center;
    }}
    .toggle-label {{ font-size: 0.78rem; color: var(--muted); margin-right: 4px; }}
    .toggle-btn {{
      background: var(--surface);
      border: 1px solid var(--border);
      color: var(--muted);
      padding: 4px 12px;
      border-radius: 6px;
      font-size: 0.78rem;
      cursor: pointer;
      transition: all 0.15s;
      font-family: inherit;
    }}
    .toggle-btn.active {{
      background: var(--surface2);
      border-color: var(--accent);
      color: var(--text);
    }}
    .divider {{ width: 1px; height: 20px; background: var(--border); margin: 0 4px; }}

    /* ── Category filters ── */
    .filters {{
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
      margin-bottom: 20px;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--border);
    }}
    .filter-btn {{
      background: var(--surface);
      border: 1px solid var(--border);
      color: var(--muted);
      padding: 5px 12px;
      border-radius: 20px;
      font-size: 0.78rem;
      cursor: pointer;
      transition: all 0.15s;
      white-space: nowrap;
      font-family: inherit;
    }}
    .filter-btn:hover, .filter-btn.active {{
      background: var(--accent);
      border-color: var(--accent);
      color: white;
    }}

    /* ── Results count ── */
    .results-count {{
      font-size: 0.82rem;
      color: var(--muted);
      margin-bottom: 14px;
    }}

    /* ── App grid ── */
    .app-grid {{
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
      gap: 14px;
    }}

    /* ── App card ── */
    .app-card {{
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 18px;
      transition: border-color 0.15s, transform 0.15s;
    }}
    .app-card:hover {{
      border-color: var(--accent);
      transform: translateY(-2px);
    }}
    .app-card.hidden {{ display: none; }}

    .card-header {{
      display: flex;
      gap: 10px;
      align-items: flex-start;
      margin-bottom: 10px;
    }}
    .card-rank {{
      font-size: 0.72rem;
      color: var(--muted);
      font-weight: 600;
      min-width: 26px;
      padding-top: 2px;
    }}
    .card-meta {{ flex: 1; min-width: 0; }}
    .app-name {{
      font-size: 0.92rem;
      font-weight: 600;
      margin-bottom: 5px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }}
    .app-name a {{ color: var(--text); text-decoration: none; }}
    .app-name a:hover {{ color: var(--accent2); }}
    .card-badges {{ display: flex; gap: 5px; flex-wrap: wrap; }}

    .card-rating {{ text-align: right; min-width: 68px; }}
    .rating-big {{ font-size: 1.35rem; font-weight: 700; color: var(--yellow); }}
    .rating-stars {{ font-size: 0.68rem; color: var(--yellow); letter-spacing: -1px; }}
    .rating-count {{ font-size: 0.68rem; color: var(--muted); }}

    .app-desc {{
      font-size: 0.78rem;
      color: var(--muted);
      margin-bottom: 10px;
      line-height: 1.5;
    }}

    .card-footer {{
      border-top: 1px solid var(--border);
      padding-top: 10px;
      margin-top: 4px;
    }}
    .rating-bars {{ margin-bottom: 6px; }}
    .rating-row {{
      display: flex;
      align-items: center;
      gap: 5px;
      margin-bottom: 2px;
    }}
    .star-label {{ font-size: 0.65rem; color: var(--muted); width: 18px; text-align: right; }}
    .bar-track {{
      flex: 1;
      height: 4px;
      background: var(--surface2);
      border-radius: 2px;
      overflow: hidden;
    }}
    .bar-fill {{
      height: 100%;
      background: var(--yellow);
      border-radius: 2px;
    }}
    .bar-count {{ font-size: 0.62rem; color: var(--muted); width: 18px; }}

    .date-info {{
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      font-size: 0.7rem;
      color: var(--muted);
    }}

    /* Low-star reviews */
    .low-reviews {{
      margin-top: 8px;
      padding: 8px 10px;
      background: rgba(239,68,68,0.06);
      border: 1px solid rgba(239,68,68,0.2);
      border-radius: 6px;
    }}
    .low-reviews-label {{
      font-size: 0.68rem;
      font-weight: 600;
      color: #f87171;
      display: block;
      margin-bottom: 4px;
    }}
    .low-reviews p {{
      font-size: 0.72rem;
      color: var(--muted);
      line-height: 1.5;
    }}

    /* ── Badges ── */
    .badge {{
      display: inline-block;
      padding: 2px 7px;
      border-radius: 4px;
      font-size: 0.68rem;
      font-weight: 500;
      white-space: nowrap;
    }}
    .badge-official  {{ background: rgba(99,102,241,.2);  color: #818cf8; border: 1px solid rgba(99,102,241,.3); }}
    .badge-third     {{ background: rgba(34,211,238,.1);  color: #67e8f9; border: 1px solid rgba(34,211,238,.2); }}
    .badge-free      {{ background: rgba(34,197,94,.1);   color: #4ade80; border: 1px solid rgba(34,197,94,.2); }}
    .badge-paid      {{ background: rgba(239,68,68,.1);   color: #f87171; border: 1px solid rgba(239,68,68,.2); }}
    .badge-freemium  {{ background: rgba(245,158,11,.1);  color: #fbbf24; border: 1px solid rgba(245,158,11,.2); }}
    .badge-trial     {{ background: rgba(249,115,22,.1);  color: #fb923c; border: 1px solid rgba(249,115,22,.2); }}
    .badge-cat       {{ background: rgba(139,92,246,.1);  color: #a78bfa; border: 1px solid rgba(139,92,246,.2); }}

    @media (max-width: 600px) {{
      .app-grid {{ grid-template-columns: 1fr; }}
      .stats-bar {{ gap: 8px; }}
      .stat-card {{ min-width: 90px; padding: 10px; }}
      .stat-value {{ font-size: 1.3rem; }}
    }}
  </style>
</head>
<body>

<div class="header">
  <h1>Shopline App Store 全量分析</h1>
  <p>共 {total} 款应用 · 按评论数量降序排列 · 生成于 {now_str}</p>
</div>

<div class="stats-bar">
  <div class="stat-card">
    <div class="stat-value">{total}</div>
    <div class="stat-label">应用总数</div>
  </div>
  <div class="stat-card">
    <div class="stat-value">{official_count}</div>
    <div class="stat-label">官方应用</div>
  </div>
  <div class="stat-card">
    <div class="stat-value">{third_party_count}</div>
    <div class="stat-label">第三方应用</div>
  </div>
  <div class="stat-card">
    <div class="stat-value">{avg_rating:.2f}</div>
    <div class="stat-label">平均评分</div>
  </div>
  <div class="stat-card">
    <div class="stat-value">{total_reviews}</div>
    <div class="stat-label">评论总数</div>
  </div>
  <div class="stat-card">
    <div class="stat-value">{total - paid_count}</div>
    <div class="stat-label">免费应用</div>
  </div>
  <div class="stat-card">
    <div class="stat-value">{paid_count}</div>
    <div class="stat-label">付费应用</div>
  </div>
</div>

<div class="main">
  <div class="search-bar">
    <input type="text" id="search" placeholder="搜索应用名称、开发者或分类…" oninput="applyFilters()">
  </div>

  <div class="toggle-row">
    <span class="toggle-label">开发者：</span>
    <button class="toggle-btn active" data-group="official" data-val="all" onclick="setToggle(this)">全部</button>
    <button class="toggle-btn" data-group="official" data-val="true" onclick="setToggle(this)">✦ 官方</button>
    <button class="toggle-btn" data-group="official" data-val="false" onclick="setToggle(this)">第三方</button>
    <div class="divider"></div>
    <span class="toggle-label">价格：</span>
    <button class="toggle-btn active" data-group="price" data-val="all" onclick="setToggle(this)">全部</button>
    <button class="toggle-btn" data-group="price" data-val="Free" onclick="setToggle(this)">免费</button>
    <button class="toggle-btn" data-group="price" data-val="Paid" onclick="setToggle(this)">付费</button>
  </div>

  <div class="filters" id="cat-filters">
    {cat_buttons}
  </div>

  <div class="results-count" id="results-count">共 {total} 款应用</div>

  <div class="app-grid" id="app-grid">
    {cards_html}
  </div>
</div>

<script>
  var state = {{ category: 'all', official: 'all', price: 'all' }};

  function setToggle(btn) {{
    var group = btn.getAttribute('data-group');
    var val = btn.getAttribute('data-val');
    state[group] = val;
    document.querySelectorAll('[data-group="' + group + '"]').forEach(function(b) {{
      b.classList.toggle('active', b === btn);
    }});
    applyFilters();
  }}

  document.querySelectorAll('.filter-btn').forEach(function(btn) {{
    btn.addEventListener('click', function() {{
      state.category = this.getAttribute('data-filter');
      document.querySelectorAll('.filter-btn').forEach(function(b) {{ b.classList.remove('active'); }});
      this.classList.add('active');
      applyFilters();
    }});
  }});

  function applyFilters() {{
    var q = document.getElementById('search').value.toLowerCase();
    var cards = document.querySelectorAll('.app-card');
    var visible = 0;
    cards.forEach(function(card) {{
      var show = true;
      if (state.category !== 'all' && card.getAttribute('data-category') !== state.category) show = false;
      if (state.official !== 'all' && card.getAttribute('data-official') !== state.official) show = false;
      if (state.price !== 'all' && card.getAttribute('data-price') !== state.price) show = false;
      if (q && card.textContent.toLowerCase().indexOf(q) === -1) show = false;
      card.classList.toggle('hidden', !show);
      if (show) visible++;
    }});
    document.getElementById('results-count').textContent = '共 ' + visible + ' 款应用';
  }}
</script>

</body>
</html>'''

    return html


def main():
    if not os.path.exists("scripts/all-apps-data.json"):
        print("ERROR: scripts/all-apps-data.json not found.")
        sys.exit(1)

    apps = load_data()
    print(f"加载了 {len(apps)} 款应用数据")

    html = generate_html(apps)

    out = "scripts/shopline-apps.html"
    with open(out, "w", encoding="utf-8") as f:
        f.write(html)

    print(f"✅ 已生成 {out}（{len(html)//1024} KB）")


if __name__ == "__main__":
    main()

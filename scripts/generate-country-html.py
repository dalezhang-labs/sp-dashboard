#!/usr/bin/env python3
"""
Generate a country distribution HTML report from Shopline review data.
Reads scripts/country-data.json, outputs scripts/shopline-countries.html
"""
import json
import os
from datetime import datetime
from collections import defaultdict

def load_data():
    return json.load(open("scripts/country-data.json"))

def flag_emoji(country):
    """Convert country name to flag emoji."""
    flags = {
        "United States": "🇺🇸", "China": "🇨🇳", "United Kingdom": "🇬🇧",
        "Japan": "🇯🇵", "Malaysia": "🇲🇾", "Singapore": "🇸🇬",
        "Australia": "🇦🇺", "Vietnam": "🇻🇳", "Indonesia": "🇮🇩",
        "Thailand": "🇹🇭", "Philippines": "🇵🇭", "Hong Kong": "🇭🇰",
        "Taiwan": "🇹🇼", "South Korea": "🇰🇷", "India": "🇮🇳",
        "Canada": "🇨🇦", "Germany": "🇩🇪", "France": "🇫🇷",
        "Netherlands": "🇳🇱", "Brazil": "🇧🇷", "Mexico": "🇲🇽",
        "Spain": "🇪🇸", "Italy": "🇮🇹", "Turkey": "🇹🇷",
        "Saudi Arabia": "🇸🇦", "UAE": "🇦🇪", "South Africa": "🇿🇦",
        "Nigeria": "🇳🇬", "Kenya": "🇰🇪", "Pakistan": "🇵🇰",
        "Bangladesh": "🇧🇩", "Sri Lanka": "🇱🇰", "New Zealand": "🇳🇿",
        "Sweden": "🇸🇪", "Norway": "🇳🇴", "Denmark": "🇩🇰",
        "Finland": "🇫🇮", "Poland": "🇵🇱", "Portugal": "🇵🇹",
        "Greece": "🇬🇷", "Czech Republic": "🇨🇿", "Hungary": "🇭🇺",
        "Romania": "🇷🇴", "Ukraine": "🇺🇦", "Russia": "🇷🇺",
        "Argentina": "🇦🇷", "Chile": "🇨🇱", "Colombia": "🇨🇴",
        "Peru": "🇵🇪", "Egypt": "🇪🇬", "Morocco": "🇲🇦",
        "Israel": "🇮🇱", "Jordan": "🇯🇴", "Kuwait": "🇰🇼",
        "Qatar": "🇶🇦", "Bahrain": "🇧🇭", "Oman": "🇴🇲",
        "Myanmar": "🇲🇲", "Cambodia": "🇰🇭", "Laos": "🇱🇦",
        "Nepal": "🇳🇵", "Mongolia": "🇲🇳", "Kazakhstan": "🇰🇿",
        "Switzerland": "🇨🇭", "Austria": "🇦🇹", "Belgium": "🇧🇪",
        "Ireland": "🇮🇪", "Scotland": "🏴󠁧󠁢󠁳󠁣󠁴󠁿",
    }
    return flags.get(country, "🌍")

def generate_html(country_data):
    # Aggregate all reviews
    country_counts = defaultdict(int)       # total reviews per country
    country_stars = defaultdict(list)       # star ratings per country
    country_apps = defaultdict(set)         # which apps each country reviewed
    app_country_counts = {}                 # per-app country breakdown

    total_reviews = 0

    for slug, app_info in country_data.items():
        name = app_info["name"]
        reviews = app_info.get("reviews", [])
        app_countries = defaultdict(int)

        for r in reviews:
            country = r.get("country", "Unknown")
            stars = r.get("stars", 0)
            if country and country != "Unknown":
                country_counts[country] += 1
                country_stars[country].append(stars)
                country_apps[country].add(name)
                app_countries[country] += 1
                total_reviews += 1

        if app_countries:
            app_country_counts[name] = dict(sorted(app_countries.items(), key=lambda x: x[1], reverse=True))

    # Sort countries by review count
    sorted_countries = sorted(country_counts.items(), key=lambda x: x[1], reverse=True)
    top_countries = sorted_countries[:30]

    # Calculate avg rating per country
    country_avg = {}
    for c, stars_list in country_stars.items():
        if stars_list:
            country_avg[c] = round(sum(stars_list) / len(stars_list), 2)

    # Top apps per country (top 3)
    country_top_apps = {}
    for slug, app_info in country_data.items():
        name = app_info["name"]
        for r in app_info.get("reviews", []):
            country = r.get("country", "Unknown")
            if country not in country_top_apps:
                country_top_apps[country] = defaultdict(int)
            country_top_apps[country][name] += 1

    # Build country cards HTML
    cards_html = ""
    for rank, (country, count) in enumerate(top_countries, 1):
        flag = flag_emoji(country)
        avg = country_avg.get(country, 0)
        pct = round(count / total_reviews * 100, 1) if total_reviews > 0 else 0
        app_count = len(country_apps[country])

        # Top 3 apps for this country
        top_apps = sorted(country_top_apps.get(country, {}).items(), key=lambda x: x[1], reverse=True)[:3]
        top_apps_html = "".join(
            f'<span class="app-tag">{a[0][:25]} <em>({a[1]})</em></span>'
            for a in top_apps
        )

        # Star distribution for this country
        stars_list = country_stars.get(country, [])
        star_dist = {s: stars_list.count(s) for s in [5, 4, 3, 2, 1]}
        star_bars = ""
        for s in [5, 4, 3, 2, 1]:
            n = star_dist.get(s, 0)
            w = round(n / count * 100) if count > 0 else 0
            star_bars += f'''<div class="sbar-row">
              <span class="sbar-label">{s}★</span>
              <div class="sbar-track"><div class="sbar-fill" style="width:{w}%"></div></div>
              <span class="sbar-count">{n}</span>
            </div>'''

        cards_html += f'''
    <div class="country-card">
      <div class="card-top">
        <div class="rank">#{rank}</div>
        <div class="flag">{flag}</div>
        <div class="country-info">
          <h3>{country}</h3>
          <div class="meta">{count} 条评论 · {pct}% · {app_count} 款应用</div>
        </div>
        <div class="avg-rating">
          <div class="avg-num">{avg}</div>
          <div class="avg-label">平均评分</div>
        </div>
      </div>
      <div class="star-bars">{star_bars}</div>
      <div class="top-apps">{top_apps_html}</div>
    </div>'''

    # Chart data for top 20
    chart_labels = json.dumps([c[0] for c in top_countries[:20]])
    chart_values = json.dumps([c[1] for c in top_countries[:20]])
    chart_colors = json.dumps([
        "#6366f1", "#22d3ee", "#22c55e", "#f59e0b", "#ef4444",
        "#8b5cf6", "#06b6d4", "#10b981", "#f97316", "#ec4899",
        "#3b82f6", "#84cc16", "#eab308", "#14b8a6", "#f43f5e",
        "#a855f7", "#0ea5e9", "#4ade80", "#fb923c", "#e879f9",
    ])

    # Per-app country breakdown table (top 20 apps by review count)
    top_apps_by_reviews = sorted(
        [(name, info) for name, info in app_country_counts.items()],
        key=lambda x: sum(x[1].values()),
        reverse=True
    )[:20]

    table_rows = ""
    for app_name, countries in top_apps_by_reviews:
        total_app = sum(countries.values())
        top3 = list(countries.items())[:3]
        top3_str = " / ".join(f"{flag_emoji(c[0])}{c[0]} ({c[1]})" for c in top3)
        table_rows += f'''<tr>
          <td class="app-name-cell">{app_name[:35]}</td>
          <td class="num">{total_app}</td>
          <td class="countries-cell">{top3_str}</td>
        </tr>'''

    now_str = datetime.now().strftime("%Y年%m月%d日")

    html = f'''<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Shopline App Store — 评论国家分布</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
  <style>
    *, *::before, *::after {{ box-sizing: border-box; margin: 0; padding: 0; }}
    :root {{
      --bg: #0f1117; --surface: #1a1d27; --surface2: #22263a;
      --border: #2e3347; --text: #e2e8f0; --muted: #8892a4;
      --accent: #6366f1; --accent2: #22d3ee; --yellow: #f59e0b;
    }}
    body {{ font-family: -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif; background: var(--bg); color: var(--text); line-height: 1.6; }}

    .header {{ background: linear-gradient(135deg, #1a1d27, #0f1117); border-bottom: 1px solid var(--border); padding: 36px 24px 28px; text-align: center; }}
    .header h1 {{ font-size: 1.8rem; font-weight: 700; background: linear-gradient(135deg, #6366f1, #22d3ee); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; margin-bottom: 6px; }}
    .header p {{ color: var(--muted); font-size: 0.85rem; }}

    .stats-bar {{ display: flex; gap: 12px; padding: 20px 24px; max-width: 1100px; margin: 0 auto; flex-wrap: wrap; }}
    .stat {{ flex: 1; min-width: 110px; background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 14px 16px; text-align: center; }}
    .stat-val {{ font-size: 1.6rem; font-weight: 700; color: var(--accent2); }}
    .stat-lbl {{ font-size: 0.7rem; color: var(--muted); text-transform: uppercase; letter-spacing: .04em; margin-top: 3px; }}

    .main {{ max-width: 1100px; margin: 0 auto; padding: 0 24px 60px; }}

    /* Chart section */
    .chart-section {{ background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 24px; margin-bottom: 32px; }}
    .chart-section h2 {{ font-size: 1rem; font-weight: 600; margin-bottom: 16px; color: var(--text); }}
    .chart-wrap {{ height: 320px; }}

    /* Country grid */
    .section-title {{ font-size: 1rem; font-weight: 600; margin-bottom: 16px; color: var(--text); }}
    .country-grid {{ display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 14px; margin-bottom: 40px; }}

    .country-card {{ background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 16px; transition: border-color .15s, transform .15s; }}
    .country-card:hover {{ border-color: var(--accent); transform: translateY(-2px); }}

    .card-top {{ display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }}
    .rank {{ font-size: 0.7rem; color: var(--muted); font-weight: 600; min-width: 24px; }}
    .flag {{ font-size: 1.6rem; }}
    .country-info {{ flex: 1; }}
    .country-info h3 {{ font-size: 0.9rem; font-weight: 600; }}
    .meta {{ font-size: 0.72rem; color: var(--muted); margin-top: 2px; }}
    .avg-rating {{ text-align: right; }}
    .avg-num {{ font-size: 1.3rem; font-weight: 700; color: var(--yellow); }}
    .avg-label {{ font-size: 0.65rem; color: var(--muted); }}

    .star-bars {{ margin-bottom: 10px; }}
    .sbar-row {{ display: flex; align-items: center; gap: 5px; margin-bottom: 2px; }}
    .sbar-label {{ font-size: 0.65rem; color: var(--muted); width: 18px; text-align: right; }}
    .sbar-track {{ flex: 1; height: 4px; background: var(--surface2); border-radius: 2px; overflow: hidden; }}
    .sbar-fill {{ height: 100%; background: var(--yellow); border-radius: 2px; }}
    .sbar-count {{ font-size: 0.62rem; color: var(--muted); width: 18px; }}

    .top-apps {{ display: flex; flex-wrap: wrap; gap: 5px; }}
    .app-tag {{ font-size: 0.68rem; background: rgba(99,102,241,.12); color: #a78bfa; border: 1px solid rgba(99,102,241,.2); padding: 2px 7px; border-radius: 4px; }}
    .app-tag em {{ font-style: normal; opacity: .7; }}

    /* Table */
    .table-section {{ background: var(--surface); border: 1px solid var(--border); border-radius: 12px; overflow: hidden; }}
    table {{ width: 100%; border-collapse: collapse; font-size: 0.82rem; }}
    th {{ background: var(--surface2); padding: 10px 14px; text-align: left; font-weight: 600; font-size: 0.75rem; color: var(--muted); text-transform: uppercase; letter-spacing: .04em; border-bottom: 1px solid var(--border); }}
    td {{ padding: 10px 14px; border-bottom: 1px solid var(--border); }}
    tr:last-child td {{ border-bottom: none; }}
    tr:hover td {{ background: rgba(255,255,255,.02); }}
    .app-name-cell {{ font-weight: 500; }}
    .num {{ text-align: right; color: var(--accent2); font-weight: 600; }}
    .countries-cell {{ color: var(--muted); }}

    @media (max-width: 600px) {{
      .country-grid {{ grid-template-columns: 1fr; }}
      .stats-bar {{ gap: 8px; }}
    }}
  </style>
</head>
<body>

<div class="header">
  <h1>Shopline App Store — 评论国家分布</h1>
  <p>基于 {total_reviews} 条评论数据 · {len(country_counts)} 个国家/地区 · 生成于 {now_str}</p>
</div>

<div class="stats-bar">
  <div class="stat"><div class="stat-val">{total_reviews}</div><div class="stat-lbl">总评论数</div></div>
  <div class="stat"><div class="stat-val">{len(country_counts)}</div><div class="stat-lbl">国家/地区</div></div>
  <div class="stat"><div class="stat-val">{len(country_data)}</div><div class="stat-lbl">覆盖应用</div></div>
  <div class="stat"><div class="stat-val">{sorted_countries[0][0] if sorted_countries else "—"}</div><div class="stat-lbl">最多评论国家</div></div>
  <div class="stat"><div class="stat-val">{sorted_countries[0][1] if sorted_countries else 0}</div><div class="stat-lbl">最多评论数</div></div>
</div>

<div class="main">

  <!-- Bar chart -->
  <div class="chart-section">
    <h2>📊 Top 20 国家评论数量</h2>
    <div class="chart-wrap">
      <canvas id="countryChart"></canvas>
    </div>
  </div>

  <!-- Country cards -->
  <div class="section-title">🌍 各国家/地区详情（Top 30）</div>
  <div class="country-grid">
    {cards_html}
  </div>

  <!-- Per-app table -->
  <div class="section-title">📱 各应用评论国家分布（Top 20 应用）</div>
  <div class="table-section">
    <table>
      <thead>
        <tr>
          <th>应用名称</th>
          <th style="text-align:right">评论数</th>
          <th>主要评论国家（Top 3）</th>
        </tr>
      </thead>
      <tbody>
        {table_rows}
      </tbody>
    </table>
  </div>

</div>

<script>
var ctx = document.getElementById('countryChart').getContext('2d');
new Chart(ctx, {{
  type: 'bar',
  data: {{
    labels: {chart_labels},
    datasets: [{{
      label: '评论数',
      data: {chart_values},
      backgroundColor: {chart_colors},
      borderRadius: 4,
      borderSkipped: false,
    }}]
  }},
  options: {{
    responsive: true,
    maintainAspectRatio: false,
    plugins: {{
      legend: {{ display: false }},
      tooltip: {{
        callbacks: {{
          label: function(ctx) {{ return ctx.parsed.y + ' 条评论'; }}
        }}
      }}
    }},
    scales: {{
      x: {{
        ticks: {{ color: '#8892a4', font: {{ size: 11 }} }},
        grid: {{ color: '#2e3347' }}
      }},
      y: {{
        ticks: {{ color: '#8892a4' }},
        grid: {{ color: '#2e3347' }}
      }}
    }}
  }}
}});
</script>

</body>
</html>'''

    return html


def main():
    if not os.path.exists("scripts/country-data.json"):
        print("ERROR: scripts/country-data.json not found. Run fetch-countries.py first.")
        return

    country_data = load_data()
    print(f"Loaded {len(country_data)} apps")

    html = generate_html(country_data)

    out = "scripts/shopline-countries.html"
    with open(out, "w", encoding="utf-8") as f:
        f.write(html)

    print(f"✅ Generated {out} ({len(html)//1024} KB)")


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""
Fetch reviewer country data from Shopline app review pages.
For each app with reviews, extract {country, stars} from all review pages.
Outputs scripts/country-data.json
"""
import json
import re
import time
import subprocess
import os

def ab_eval(js_file, timeout=12):
    try:
        r = subprocess.run(
            f'npx agent-browser eval "$(cat {js_file})"',
            shell=True, capture_output=True, text=True, timeout=timeout
        )
        raw = r.stdout.strip()
        if raw.startswith('"'):
            raw = json.loads(raw)
        return json.loads(raw) if isinstance(raw, str) else raw
    except Exception:
        return []

def fetch_reviews_page(slug, page):
    """Fetch one page of reviews, return list of {country, stars}."""
    url = f"https://apps.shopline.com/detail/{slug}/reviews?currentPage={page}"
    subprocess.run(
        f"npx agent-browser open '{url}'",
        shell=True, capture_output=True, text=True, timeout=15
    )
    time.sleep(1.8)

    js = """
var results = [];
var seen = {};
// Use more specific selector - only direct comment items, not nested
var items = document.querySelectorAll('.sl-comment-item-left');
if (items.length === 0) {
  // fallback
  items = document.querySelectorAll('[class*="sl-comment-item"]');
}
items.forEach(function(item) {
  var starEl = item.querySelector('app-star-select');
  if (!starEl) return;
  var stars = parseInt(starEl.getAttribute('score') || '0');
  var countryEl = item.querySelector('[class*="color-text-tertiary"]');
  var country = countryEl ? countryEl.textContent.trim() : 'Unknown';
  var timeEl = item.closest('[class*="sl-comment"]') ? item.closest('[class*="sl-comment"]').querySelector('[class*="sl-time"], [data-time]') : null;
  var date = timeEl ? timeEl.textContent.trim() : '';
  var key = country + '|' + date + '|' + stars;
  if (!seen[key] && country && country !== 'Unknown') {
    seen[key] = true;
    results.push({country: country, stars: stars, date: date});
  }
});
// Check next page via pagination
var pageLinks = document.querySelectorAll('[class*="paginat"] a, [class*="page"] a');
var hasNext = document.body.innerText.indexOf('Next page') > -1;
JSON.stringify({reviews: results, hasNext: hasNext});
"""
    with open("/tmp/fetch_reviews.js", "w") as f:
        f.write(js)

    result = ab_eval("/tmp/fetch_reviews.js", timeout=12)
    if isinstance(result, dict):
        return result.get("reviews", []), result.get("hasNext", False)
    return [], False


def main():
    data = json.load(open("scripts/all-apps-data.json"))

    # Only process apps with reviews
    apps_with_reviews = [a for a in data if a.get("review_count", 0) > 0]
    total = len(apps_with_reviews)
    print(f"Apps with reviews: {total}")

    # Load existing progress
    country_data = {}
    if os.path.exists("scripts/country-data.json"):
        country_data = json.load(open("scripts/country-data.json"))
        print(f"Loaded {len(country_data)} cached apps")

    for i, app in enumerate(apps_with_reviews):
        slug = app["slug"]
        name = app["name"]
        review_count = app.get("review_count", 0)

        if slug in country_data:
            print(f"  [{i+1}/{total}] SKIP: {name[:40]}")
            continue

        print(f"  [{i+1}/{total}] {name[:40]} ({review_count} reviews)", end="", flush=True)

        all_reviews = []
        page = 1
        max_pages = max(1, (review_count // 10) + 2)  # estimate pages needed

        while page <= max_pages:
            reviews, has_next = fetch_reviews_page(slug, page)
            all_reviews.extend(reviews)
            print(f" p{page}({len(reviews)})", end="", flush=True)

            if not has_next or not reviews:
                break
            page += 1
            time.sleep(0.3)

        country_data[slug] = {
            "name": name,
            "reviews": all_reviews,
            "total_fetched": len(all_reviews),
        }
        print(f" → {len(all_reviews)} reviews fetched")

        # Save every 10 apps
        if (i + 1) % 10 == 0:
            with open("scripts/country-data.json", "w") as f:
                json.dump(country_data, f, ensure_ascii=False, indent=2)
            print(f"  💾 Saved ({i+1}/{total})")

    with open("scripts/country-data.json", "w") as f:
        json.dump(country_data, f, ensure_ascii=False, indent=2)

    print(f"\n✅ Done! {len(country_data)} apps saved to scripts/country-data.json")

    try:
        subprocess.run("npx agent-browser close --all", shell=True, timeout=5)
    except:
        pass


if __name__ == "__main__":
    main()

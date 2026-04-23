#!/usr/bin/env python3
"""
Fetch detail page data for all Shopline apps.
- Uses webFetch rendered mode (agent-browser) for reliability
- Name comes from all-slugs.json (authoritative)
- Fetches low-star (<=3) reviews from /reviews pages
- Dates: latest = first date, earliest = last date
"""
import json
import re
import time
import subprocess
import sys
import os

SLUG_TO_NAME = {}


def webfetch_rendered(url, timeout=20):
    """
    Fetch a URL using agent-browser, extract text with star markers via JS eval.
    """
    try:
        subprocess.run(
            f"npx agent-browser open '{url}'",
            shell=True, capture_output=True, text=True, timeout=timeout
        )
        time.sleep(2)
        # Use eval to extract review data directly from DOM
        js = """
var reviews = [];
var items = document.querySelectorAll('[class*="comment"], [class*="review"], [class*="Comment"], [class*="Review"]');
if (items.length === 0) {
  // fallback: get all text
  reviews.push(document.body.innerText.substring(0, 30000));
} else {
  items.forEach(function(item) {
    var stars = item.querySelectorAll('img[src*="select_star"]').length;
    var text = item.innerText.trim().substring(0, 300);
    reviews.push(stars + '|' + text);
  });
}
JSON.stringify(reviews.slice(0, 20));
"""
        with open("/tmp/ab_reviews.js", "w") as f:
            f.write(js)
        r2 = subprocess.run(
            'npx agent-browser eval "$(cat /tmp/ab_reviews.js)"',
            shell=True, capture_output=True, text=True, timeout=12
        )
        result = r2.stdout.strip()
        if result.startswith('"'):
            import json as _json
            result = _json.loads(result)
        return result
    except Exception:
        return ""


def webfetch_text(url, timeout=20):
    """Simple text fetch using agent-browser get text body."""
    try:
        subprocess.run(
            f"npx agent-browser open '{url}'",
            shell=True, capture_output=True, text=True, timeout=timeout
        )
        time.sleep(1.5)
        r2 = subprocess.run(
            "npx agent-browser get text body",
            shell=True, capture_output=True, text=True, timeout=10
        )
        return r2.stdout.strip()
    except Exception:
        return ""


def parse_reviews_page(text):
    """
    Parse review entries from a /reviews page.
    Returns list of {stars, date, text}
    Stars counted by select_star (filled) images per review block.
    """
    reviews = []
    date_pattern = r'((?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4})'
    parts = re.split(date_pattern, text)

    i = 1
    while i < len(parts) - 1:
        date_str = parts[i]
        block = parts[i + 1] if i + 1 < len(parts) else ""
        pre = parts[i - 1] if i > 0 else ""

        # Count filled stars in context before the date
        context = pre[-600:] if len(pre) > 600 else pre
        filled = len(re.findall(r'\[STAR\]', context))
        stars = min(filled, 5) if filled > 0 else None

        # Review text: first paragraph in block
        review_text = block.strip()
        review_text = re.sub(r'\s*\d+\s*\n.*$', '', review_text, flags=re.DOTALL).strip()
        review_text = review_text[:300] if review_text else ""

        if stars is not None and review_text:
            reviews.append({
                "stars": stars,
                "date": date_str,
                "text": review_text,
            })

        i += 2

    return reviews


def fetch_low_star_reviews(slug, low_star_count):
    """
    Fetch /reviews pages until all low-star (<=3) reviews are collected.
    Uses app-star-select[score] Web Component attribute for accurate star counts.
    Returns list of {stars, date, text}.
    """
    if low_star_count == 0:
        return []

    low_reviews = []
    page = 1
    max_pages = 15

    while page <= max_pages and len(low_reviews) < low_star_count:
        url = f"https://apps.shopline.com/detail/{slug}/reviews?currentPage={page}"

        try:
            subprocess.run(
                f"npx agent-browser open '{url}'",
                shell=True, capture_output=True, text=True, timeout=15
            )
            time.sleep(2)

            js = """
var results = [];
var commentItems = document.querySelectorAll('[class*="sl-comment"], [class*="comment-item"]');
// Deduplicate by using a set of seen authors+dates
var seen = {};
commentItems.forEach(function(item) {
  var starEl = item.querySelector('app-star-select');
  if (!starEl) return;
  var stars = parseInt(starEl.getAttribute('score') || '0');
  var timeEl = item.querySelector('[class*="sl-time"], [data-time]');
  var date = timeEl ? timeEl.textContent.trim() : '';
  var textEl = item.querySelector('[class*="color-text-secondary"], [class*="comment-text"]');
  var text = textEl ? textEl.textContent.trim().substring(0, 250) : '';
  var key = date + '|' + stars;
  if (!seen[key] && date && text) {
    seen[key] = true;
    results.push({stars: stars, date: date, text: text});
  }
});
JSON.stringify(results.slice(0, 12));
"""
            with open("/tmp/ab_lowrev.js", "w") as f:
                f.write(js)

            r2 = subprocess.run(
                'npx agent-browser eval "$(cat /tmp/ab_lowrev.js)"',
                shell=True, capture_output=True, text=True, timeout=12
            )
            raw = r2.stdout.strip()
            if raw.startswith('"'):
                raw = json.loads(raw)
            page_reviews = json.loads(raw) if isinstance(raw, str) else raw

            if not page_reviews:
                break

            for r in page_reviews:
                stars = r.get("stars")
                if stars is not None and stars <= 3 and r.get("text"):
                    low_reviews.append({
                        "stars": stars,
                        "date": r.get("date", ""),
                        "text": r.get("text", ""),
                    })

        except Exception:
            break

        # Check for next page
        try:
            body_text = subprocess.run(
                "npx agent-browser get text body",
                shell=True, capture_output=True, text=True, timeout=8
            ).stdout
            if "Next page" not in body_text:
                break
        except:
            break

        page += 1
        time.sleep(0.5)

    return low_reviews


def summarize_low_reviews(reviews):
    """Concatenate low-star review texts for display."""
    if not reviews:
        return ""
    parts = []
    for r in reviews[:10]:
        stars = r.get("stars", "?")
        date = r.get("date", "")
        text = r.get("text", "").strip()
        if text:
            parts.append(f"[{stars}★ {date}] {text}")
    return " | ".join(parts)[:800]


def parse_detail(text, slug):
    """Parse the text content of a detail page."""
    data = {
        "slug": slug,
        "name": SLUG_TO_NAME.get(slug, ""),
        "developer": "",
        "is_official": False,
        "rating": None,
        "review_count": 0,
        "rating_dist": {},
        "price": "",
        "category": "",
        "description": "",
        "earliest_review_date": None,
        "latest_review_date": None,
        "low_star_reviews": "",
    }

    if not text or len(text) < 50:
        return data

    # Review count — "Rated by N users" is most reliable
    rated_match = re.search(r'Rated by (\d+) users', text)
    if rated_match:
        data["review_count"] = int(rated_match.group(1))
    else:
        rm = re.search(r'\d\.\d\s*\((\d+)\)', text)
        if rm:
            data["review_count"] = int(rm.group(1))

    # Rating value — try multiple formats:
    # Format 1: "4.8 (76)" or "4.8\n(76)"
    # Format 2: "5\nRated by 101 users" (integer rating before "Rated by")
    # Format 3: "4.6\nRated by 28 users"
    rating_match = re.search(r'(\d\.\d)\s*(?:Rated by|\()', text)
    if rating_match:
        data["rating"] = float(rating_match.group(1))
    else:
        # Try integer rating before "Rated by"
        int_rating_match = re.search(r'(\d)\s*\nRated by', text)
        if int_rating_match:
            data["rating"] = float(int_rating_match.group(1))

    # Rating distribution: 5 numbers after "Rated by N users"
    dist_match = re.search(
        r'Rated by \d+ users\s*(\d+)\s*(\d+)\s*(\d+)\s*(\d+)\s*(\d+)', text
    )
    if dist_match:
        data["rating_dist"] = {
            "5": int(dist_match.group(1)),
            "4": int(dist_match.group(2)),
            "3": int(dist_match.group(3)),
            "2": int(dist_match.group(4)),
            "1": int(dist_match.group(5)),
        }

    # Developer
    dev_match = re.search(r'Developer\s*\n?\s*By\s+([^\n]+)', text)
    if dev_match:
        data["developer"] = dev_match.group(1).strip()
        data["is_official"] = data["developer"].strip().upper() == "SHOPLINE"

    # Price
    if "Paid App" in text:
        data["price"] = "Paid"
    elif "Free plan provided" in text:
        data["price"] = "Free plan provided"
    elif re.search(r'Free trial for \d+', text, re.IGNORECASE):
        m = re.search(r'Free trial for (\d+ \w+)', text, re.IGNORECASE)
        data["price"] = m.group(0) if m else "Free trial"
    else:
        data["price"] = "Free"

    # Category
    cat_match = re.search(r'Category\s*\n\s*([^\n]+)', text)
    if cat_match:
        data["category"] = cat_match.group(1).strip()

    # Review dates — newest first, oldest last
    full_dates = re.findall(
        r'(?:January|February|March|April|May|June|July|August|September|'
        r'October|November|December)\s+\d{1,2},\s+\d{4}',
        text
    )
    if full_dates:
        data["latest_review_date"] = full_dates[0]
        data["earliest_review_date"] = full_dates[-1]

    # Description
    desc_match = re.search(
        r'(?:Free|Paid App|Free plan provided|Free trial[^\n]*)\n(.*?)(?:Category|About\n|Reviews\n)',
        text, re.DOTALL
    )
    if desc_match:
        desc = re.sub(r'\s+', ' ', desc_match.group(1)).strip()
        data["description"] = desc[:400]

    return data


def main():
    global SLUG_TO_NAME

    if not os.path.exists("scripts/all-slugs.json"):
        print("ERROR: scripts/all-slugs.json not found.")
        sys.exit(1)

    with open("scripts/all-slugs.json") as f:
        slugs_map = json.load(f)

    SLUG_TO_NAME = {v: k for k, v in slugs_map.items()}
    all_slugs = list(dict.fromkeys(slugs_map.values()))
    total = len(all_slugs)
    print(f"Total slugs: {total}")

    # Load valid cached entries
    existing_data = {}
    if os.path.exists("scripts/all-apps-data.json"):
        with open("scripts/all-apps-data.json") as f:
            for d in json.load(f):
                slug = d.get("slug", "")
                expected_name = SLUG_TO_NAME.get(slug, "")
                if expected_name and d.get("name") == expected_name and d.get("developer"):
                    existing_data[slug] = d

    print(f"Valid cached: {len(existing_data)} | Need to fetch: {total - len(existing_data)}")

    results = list(existing_data.values())

    for i, slug in enumerate(all_slugs):
        if slug in existing_data:
            print(f"  [{i+1}/{total}] SKIP: {SLUG_TO_NAME.get(slug, slug)[:35]}")
            continue

        canonical_name = SLUG_TO_NAME.get(slug, slug)
        print(f"  [{i+1}/{total}] {canonical_name[:40]}", end="", flush=True)

        url = f"https://apps.shopline.com/detail/{slug}"
        text = webfetch_text(url)

        if text and len(text) > 100:
            data = parse_detail(text, slug)

            # Fetch low-star reviews if any exist
            dist = data.get("rating_dist", {})
            low_count = dist.get("3", 0) + dist.get("2", 0) + dist.get("1", 0)
            if low_count > 0:
                print(f" [{low_count} low★]", end="", flush=True)
                low_reviews = fetch_low_star_reviews(slug, low_count)
                data["low_star_reviews"] = summarize_low_reviews(low_reviews)

            results.append(data)
            print(f" → {data['rating']}★({data['review_count']}) | {data['developer'][:20]} | {data['earliest_review_date'] or 'no dates'}")
        else:
            results.append({
                "slug": slug,
                "name": canonical_name,
                "developer": "", "is_official": False,
                "rating": None, "review_count": 0,
                "rating_dist": {}, "price": "Free",
                "category": "", "description": "",
                "earliest_review_date": None, "latest_review_date": None,
                "low_star_reviews": "",
            })
            print(f" → EMPTY")

        if (i + 1) % 20 == 0:
            with open("scripts/all-apps-data.json", "w") as f:
                json.dump(results, f, ensure_ascii=False, indent=2)
            print(f"  💾 Saved {len(results)}/{total}")

    with open("scripts/all-apps-data.json", "w") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)

    print(f"\n✅ Done! {len(results)} apps saved.")
    try:
        subprocess.run("npx agent-browser close --all", shell=True, timeout=5)
    except:
        pass


if __name__ == "__main__":
    main()

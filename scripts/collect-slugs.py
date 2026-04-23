#!/usr/bin/env python3
"""
Collect all Shopline App Store slugs by searching each app name.
Uses agent-browser to navigate and extract detail page URLs.
"""
import subprocess
import json
import sys
import time
import os

def ab(cmd, timeout=10):
    try:
        r = subprocess.run(
            f"npx agent-browser {cmd}",
            shell=True, capture_output=True, text=True, timeout=timeout
        )
        return r.stdout.strip()
    except subprocess.TimeoutExpired:
        return ""

def ab_eval(js, timeout=8):
    # Write JS to temp file to avoid shell escaping issues
    with open("/tmp/ab_eval.js", "w") as f:
        f.write(js)
    try:
        r = subprocess.run(
            "npx agent-browser eval \"$(cat /tmp/ab_eval.js)\"",
            shell=True, capture_output=True, text=True, timeout=timeout
        )
        out = r.stdout.strip()
        if out.startswith('"') and out.endswith('"'):
            return json.loads(out)
        return out
    except:
        return ""

# All app names from all pages (collected earlier)
# We'll collect page by page
ALL_NAMES = []

def get_names_from_page(page):
    """Get all app names from a list page."""
    url = f"https://apps.shopline.com/sort?currentPage={page}"
    ab(f"open '{url}'")
    ab("wait --load networkidle", timeout=8)
    time.sleep(1)
    
    js = """
var h = document.querySelectorAll('h3');
var n = [];
for (var i = 0; i < h.length - 4; i++) {
    var t = h[i].textContent.trim();
    if (t && t !== 'Solutions' && t !== 'Features' && t !== 'Resources' && t !== 'SHOPLINE') {
        n.push(t);
    }
}
JSON.stringify(n);
"""
    result = ab_eval(js)
    if isinstance(result, list):
        return result
    try:
        return json.loads(result)
    except:
        return []

def get_slug_by_search(name):
    """Search for an app by name and get its detail URL slug."""
    import urllib.parse
    encoded = urllib.parse.quote(name)
    url = f"https://apps.shopline.com/search?appName={encoded}&lang=en"
    ab(f"open '{url}'")
    ab("wait --load networkidle", timeout=8)
    time.sleep(0.8)
    
    # Check if redirected directly to detail page
    current_url = ab("get url")
    if "/detail/" in current_url:
        return current_url.split("/detail/")[-1]
    
    # Get all h3 headings and find exact match
    js_find = f"""
var h3s = document.querySelectorAll('h3');
var target = {json.dumps(name)};
var result = null;
for (var i = 0; i < h3s.length; i++) {{
    if (h3s[i].textContent.trim() === target) {{
        result = i;
        break;
    }}
}}
result;
"""
    with open("/tmp/ab_find.js", "w") as f:
        f.write(js_find)
    
    try:
        r = subprocess.run(
            "npx agent-browser eval \"$(cat /tmp/ab_find.js)\"",
            shell=True, capture_output=True, text=True, timeout=8
        )
        idx_str = r.stdout.strip()
        if idx_str and idx_str != "null":
            idx = int(idx_str)
            # Click the parent card of this h3
            js_click = f"""
var h3s = document.querySelectorAll('h3');
var card = h3s[{idx}].closest('[style*="cursor"]') || h3s[{idx}].parentElement;
if (card) {{ card.click(); 'clicked'; }} else {{ 'no card'; }}
"""
            with open("/tmp/ab_click.js", "w") as f:
                f.write(js_click)
            subprocess.run(
                "npx agent-browser eval \"$(cat /tmp/ab_click.js)\"",
                shell=True, capture_output=True, text=True, timeout=8
            )
            time.sleep(1.5)
            result_url = ab("get url")
            if "/detail/" in result_url:
                return result_url.split("/detail/")[-1]
    except:
        pass
    
    return None

def main():
    # Load previously saved slugs (resume support)
    if os.path.exists("scripts/all-slugs.json"):
        with open("scripts/all-slugs.json") as f:
            all_slugs = json.load(f)
        print(f"Loaded {len(all_slugs)} previously saved slugs")
    else:
        all_slugs = {}
    
    # Step 1: Collect all app names from all pages
    print("=" * 60)
    print("STEP 1: Collecting app names from all pages")
    print("=" * 60)
    
    total_pages = 11  # 393 apps / 36 per page ≈ 11 pages
    all_names = []
    
    for page in range(1, total_pages + 1):
        names = get_names_from_page(page)
        all_names.extend(names)
        print(f"  Page {page}/{total_pages}: {len(names)} apps (total so far: {len(all_names)})")
        if len(names) == 0:
            print(f"  → No apps found on page {page}, stopping")
            break
    
    print(f"\nTotal apps found: {len(all_names)}")
    
    # Save names
    with open("scripts/all-app-names.json", "w") as f:
        json.dump(all_names, f, ensure_ascii=False, indent=2)
    
    # Step 2: Get slugs for apps we don't have yet
    print("\n" + "=" * 60)
    print("STEP 2: Collecting slugs via search")
    print("=" * 60)
    
    missing = [n for n in all_names if n not in all_slugs]
    print(f"Need slugs for {len(missing)} apps (have {len(all_slugs)} already)")
    
    for i, name in enumerate(missing):
        print(f"  [{i+1}/{len(missing)}] Searching: {name[:40]}", end="", flush=True)
        slug = get_slug_by_search(name)
        if slug:
            all_slugs[name] = slug
            print(f" → {slug}")
        else:
            print(f" → NOT FOUND")
        
        # Save progress every 10 apps
        if (i + 1) % 10 == 0:
            with open("scripts/all-slugs.json", "w") as f:
                json.dump(all_slugs, f, ensure_ascii=False, indent=2)
            print(f"  💾 Progress saved ({len(all_slugs)}/{len(all_names)})")
    
    # Final save
    with open("scripts/all-slugs.json", "w") as f:
        json.dump(all_slugs, f, ensure_ascii=False, indent=2)
    
    print(f"\n✅ Done! Collected {len(all_slugs)} slugs out of {len(all_names)} apps")
    ab("close --all")

if __name__ == "__main__":
    main()

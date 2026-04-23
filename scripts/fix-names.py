#!/usr/bin/env python3
"""
Fix app names in all-apps-data.json by cross-referencing with all-slugs.json.
The slug->name mapping from all-slugs.json is authoritative (name was used to search for slug).
"""
import json

# Load slugs: {name -> slug}
slugs_map = json.load(open("scripts/all-slugs.json"))

# Build reverse: {slug -> name}
slug_to_name = {v: k for k, v in slugs_map.items()}

# Load app data
data = json.load(open("scripts/all-apps-data.json"))

fixed = 0
for app in data:
    slug = app.get("slug", "")
    if not slug:
        continue
    correct_name = slug_to_name.get(slug)
    if correct_name and correct_name != app.get("name"):
        print(f"Fix: slug={slug}")
        print(f"  was:  {app['name']}")
        print(f"  now:  {correct_name}")
        app["name"] = correct_name
        fixed += 1

json.dump(data, open("scripts/all-apps-data.json", "w"), ensure_ascii=False, indent=2)
print(f"\n✅ Fixed {fixed} app names out of {len(data)} total")

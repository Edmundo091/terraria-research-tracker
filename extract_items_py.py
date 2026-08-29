#!/usr/bin/env python3
import json, re
with open('/tmp/terraria-research-tracker/src/items.js', 'r') as f:
    content = f.read()
start = content.find('const allItems = [')
end_idx = content.find('];\nconst allItemsCount')
array_str = content[start + len('const allItems = '):end_idx]
# Extract all {...} blocks that contain internalName
items = []
for block in re.findall(r'\{[^}]*internalName:[^}]*\}', array_str, re.DOTALL):
    # Extract fields
    name = re.search(r'name:\s*"([^"]*)"', block)
    internal = re.search(r'internalName:\s*"([^"]*)"', block)
    needed = re.search(r'neededForResearch:\s*(\d+)', block)
    id_val = re.search(r'id:\s*(\d+)', block)
    if internal and name and id_val:
        items.append({
            "id": int(id_val.group(1)),
            "name": name.group(1),
            "internalName": internal.group(1),
            "needed": int(needed.group(1)) if needed else 1
        })
print(f"Extracted {len(items)} items")
with open('src/data/items.json', 'w') as out:
    json.dump(items, out, indent=2)

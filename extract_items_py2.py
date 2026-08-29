#!/usr/bin/env python3
import json, re
with open('/tmp/terraria-research-tracker/src/items.js', 'r') as f:
    content = f.read()
start = content.find('const allItems = [')
end_idx = content.find('];\nconst allItemsCount')
array_str = content[start + len('const allItems = '):end_idx]
depth = 0
item_starts = []
for i, c in enumerate(array_str):
    if c == '{':
        depth += 1
        if depth == 1:
            item_starts.append(i)
    elif c == '}':
        depth -= 1
items = []
internal_re = re.compile(r'internalName:\s*"([^"]+)"')
needed_re = re.compile(r'neededForResearch:\s*(\d+)')
name_re = re.compile(r'name:\s*"([^"]+)"')
id_re = re.compile(r'id:\s*(\d+)')
for idx in range(len(item_starts)):
    s = item_starts[idx]
    e = item_starts[idx + 1] - 1 if idx + 1 < len(item_starts) else len(array_str)
    block = array_str[s:e]
    internal = internal_re.search(block)
    needed = needed_re.search(block)
    name = name_re.search(block)
    id_m = id_re.search(block)
    if internal:
        items.append({
            "id": int(id_m.group(1)) if id_m else 0,
            "name": name.group(1) if name else "",
            "internalName": internal.group(1),
            "needed": int(needed.group(1)) if needed else 1
        })
print(f"Extracted {len(items)} items")
with open('src/data/items.json', 'w') as out:
    json.dump(items, out, indent=2)

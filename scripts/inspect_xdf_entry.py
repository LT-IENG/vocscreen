"""Inspect the full structure of a single XDF wordbook entry."""
import json

path = r'E:\ltprogram\P006_TRAE_AI26\新东方-单词书\CET6_xdf.json'
with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find 'enforce' or use the first entry
target = None
for line in lines:
    obj = json.loads(line)
    if obj.get('headWord') == 'enforce':
        target = obj
        break
if not target:
    target = json.loads(lines[0])

# Print the full structure with field names
content = target['content']['word']['content']
print(f'=== headWord: {target["headWord"]} ===')
print(f'wordRank: {target.get("wordRank")}')
print(f'bookId: {target.get("bookId")}')
print()

print('--- Top-level content keys ---')
for k in content:
    print(f'  {k}: {type(content[k]).__name__}')
print()

# Print each section
for key, val in content.items():
    print(f'=== {key} ===')
    if isinstance(val, dict):
        print(f'  desc: {val.get("desc", "N/A")}')
        # Print sub-structure
        for subk, subv in val.items():
            if subk == 'desc':
                continue
            if isinstance(subv, list):
                print(f'  {subk}: list[{len(subv)}]')
                for i, item in enumerate(subv[:2]):  # show first 2
                    print(f'    [{i}]: {json.dumps(item, ensure_ascii=False)[:200]}')
            else:
                print(f'  {subk}: {subv}')
    elif isinstance(val, list):
        print(f'  list[{len(val)}]')
        for i, item in enumerate(val[:2]):
            print(f'    [{i}]: {json.dumps(item, ensure_ascii=False)[:200]}')
    else:
        print(f'  value: {val}')
    print()

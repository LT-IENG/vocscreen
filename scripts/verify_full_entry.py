"""Verify the full wordbook entry with all fields."""
import json, os

path = os.path.join(r'e:\ltprogram\P006_TRAE_AI26\vocscreen_v2\public\wordbooks', 'cet6.json')
with open(path, 'r', encoding='utf-8') as f:
    book = json.load(f)

for e in book['entries']:
    if e['spelling'] == 'enforce':
        print('=== enforce ===')
        print(f'spelling: {e["spelling"]}')
        print(f'phonetics: {e["phonetics"]}')
        print(f'definition: {json.dumps(e["definition"], ensure_ascii=False)}')
        print(f'exampleSentence: {e.get("exampleSentence", "N/A")}')
        print(f'exampleTranslation: {e.get("exampleTranslation", "N/A")}')
        print(f'mnemonic: {e.get("mnemonic", "N/A")}')
        print(f'phrases: {json.dumps(e.get("phrases", []), ensure_ascii=False)}')
        print(f'relatedWords: {json.dumps(e.get("relatedWords", []), ensure_ascii=False)}')
        print(f'synonyms: {json.dumps(e.get("synonyms", []), ensure_ascii=False)}')
        print(f'examSentences: {json.dumps(e.get("examSentences", []), ensure_ascii=False)}')
        break

# Count how many entries have each field
counts = {'mnemonic': 0, 'phrases': 0, 'relatedWords': 0, 'synonyms': 0, 'examSentences': 0}
for e in book['entries']:
    for k in counts:
        if e.get(k):
            counts[k] += 1
print(f'\n=== CET6 field coverage ({len(book["entries"])} total) ===')
for k, v in counts.items():
    print(f'  {k}: {v} ({v*100//len(book["entries"])}%)')

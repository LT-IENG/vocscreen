"""Verify the converted wordbook data quality."""
import json
import os

OUT_DIR = r'E:\ltprogram\P006_TRAE_AI26\vocscreen_v2\public\wordbooks'

for book_id in ['cet4', 'cet6']:
    path = os.path.join(OUT_DIR, f'{book_id}.json')
    with open(path, 'r', encoding='utf-8') as f:
        book = json.load(f)
    print(f'=== {book_id}.json: {len(book["entries"])} entries ===')
    e = book['entries'][0]
    print(f'  First: {e["spelling"]} {e["phonetics"]}')
    print(f'  definition: {e["definition"]}')
    print(f'  example: {e.get("exampleSentence", "N/A")}')
    print(f'  translation: {e.get("exampleTranslation", "N/A")}')

    # Check a few common words
    for w in ['cancel', 'abandon', 'absolute', 'anybody', 'someone', 'important']:
        found = [x for x in book['entries'] if x['lemma'] == w.lower()]
        if found:
            f0 = found[0]
            defs = [d['tranCn'] for d in f0['definition']]
            ex = f0.get('exampleSentence', '')
            print(f'  {w}: defs={defs}, ex={ex[:50] if ex else "N/A"}')
        else:
            print(f'  {w}: (not in {book_id})')
    print()

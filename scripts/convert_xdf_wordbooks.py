"""Convert XDF (新东方) JSONL wordbooks to the app's WordBook JSON format.

Input:  JSONL files (one JSON object per line) from 新东方-单词书/
Output: JSON files in public/wordbooks/ matching the app's WordBook type

Usage: python scripts/convert_xdf_wordbooks.py
"""
import json
import os
import re

XDF_DIR = r'E:\ltprogram\P006_TRAE_AI26\新东方-单词书'
OUT_DIR = r'E:\ltprogram\P006_TRAE_AI26\vocscreen_v2\public\wordbooks'

# Mapping from XDF bookId to app WordBookId and display info
BOOK_MAP = {
    'CET4_3':  {'id': 'cet4',  'name': '四级词汇', 'level': 'CET4'},
    'CET6_3':  {'id': 'cet6',  'name': '六级词汇', 'level': 'CET6'},
    'IELTS_3': {'id': 'ielts', 'name': '雅思词汇', 'level': 'IELTS'},
    'TOEFL_3': {'id': 'toefl', 'name': '托福词汇', 'level': 'TOEFL'},
}

FILE_MAP = {
    'CET4_xdf':  'CET4_3',
    'CET6_xdf':  'CET6_3',
    'IELTS_xdf': 'IELTS_3',
    'TOEFL_xdf': 'TOEFL_3',
}


def clean_text(text: str) -> str:
    """Clean up whitespace and leading/trailing punctuation from text."""
    if not text:
        return ''
    text = text.strip()
    # Remove leading spaces after commas in Chinese definitions
    text = re.sub(r'\s*，\s*', '，', text)
    text = re.sub(r'\s*；\s*', '；', text)
    # Remove leading space in tranCn (common in XDF data)
    text = text.lstrip()
    return text


def convert_entry(line_obj: dict, book_info: dict) -> dict | None:
    """Convert a single XDF JSONL entry to the app's WordEntry format."""
    head_word = line_obj.get('headWord', '').strip()
    if not head_word:
        return None

    word_rank = line_obj.get('wordRank', 0)
    book_id = line_obj.get('bookId', '')

    # Navigate to the nested content
    word_content = None
    try:
        word_content = line_obj['content']['word']['content']
        word_id = line_obj['content']['word'].get('wordId', '')
    except (KeyError, TypeError):
        return None

    if not word_id:
        word_id = f"{book_info['level']}_{word_rank}"

    # Phonetics: prefer US English
    us_phone = word_content.get('usphone', '').strip()
    uk_phone = word_content.get('ukphone', '').strip()
    phonetics = us_phone or uk_phone
    # Wrap in slashes if not already
    if phonetics and not phonetics.startswith('/'):
        phonetics = f'/{phonetics}/'

    # Definitions (trans array)
    trans = word_content.get('trans', [])
    definition = []
    for t in trans:
        tran_cn = clean_text(t.get('tranCn', ''))
        if not tran_cn:
            continue
        entry_def = {
            'tranCn': tran_cn,
            'pos': t.get('pos', '').strip(),
            'descCn': t.get('descCn', '中释'),
        }
        tran_other = t.get('tranOther', '').strip()
        if tran_other:
            entry_def['tranOther'] = tran_other
            entry_def['descOther'] = t.get('descOther', '英释')
        definition.append(entry_def)

    if not definition:
        return None

    # Example sentence (take first available)
    example_sentence = ''
    example_translation = ''
    sentence_data = word_content.get('sentence', {})
    if sentence_data and isinstance(sentence_data.get('sentences'), list):
        sentences = sentence_data['sentences']
        if sentences:
            first = sentences[0]
            example_sentence = first.get('sContent', '').strip()
            example_translation = first.get('sCn', '').strip()

    # Phrases
    phrases = []
    phrase_data = word_content.get('phrase', {})
    if phrase_data and isinstance(phrase_data.get('phrases'), list):
        for p in phrase_data['phrases']:
            content = p.get('pContent', '').strip()
            cn = p.get('pCn', '').strip()
            if content:
                phrases.append({'content': content, 'translation': cn})

    # Related words (同根词)
    related_words = []
    rel_data = word_content.get('relWord', {})
    if rel_data and isinstance(rel_data.get('rels'), list):
        for rel in rel_data['rels']:
            pos = rel.get('pos', '').strip()
            words = []
            for w in rel.get('words', []):
                hwd = w.get('hwd', '').strip()
                tran = w.get('tran', '').strip()
                if hwd:
                    words.append({'word': hwd, 'translation': tran})
            if words:
                related_words.append({'pos': pos, 'words': words})

    # Synonyms (同近义词)
    synonyms = []
    syno_data = word_content.get('syno', {})
    if syno_data and isinstance(syno_data.get('synos'), list):
        for s in syno_data['synos']:
            pos = s.get('pos', '').strip()
            tran = s.get('tran', '').strip()
            hwds = [w.get('w', '').strip() for w in s.get('hwds', []) if w.get('w', '').strip()]
            if hwds:
                synonyms.append({'pos': pos, 'translation': tran, 'words': hwds})

    # Mnemonic (记忆方法)
    mnemonic = ''
    rem_data = word_content.get('remMethod', {})
    if rem_data and isinstance(rem_data.get('val'), str):
        mnemonic = rem_data['val'].strip()

    # Real exam sentences (真题例句)
    exam_sentences = []
    exam_data = word_content.get('realExamSentence', {})
    if exam_data and isinstance(exam_data.get('sentences'), list):
        for s in exam_data['sentences']:
            en = s.get('sContent', '').strip()
            if not en:
                continue
            source_info = s.get('sourceInfo', {})
            source = ''
            if source_info:
                parts = [source_info.get('year', ''), source_info.get('type', '')]
                source = ' '.join(p for p in parts if p).strip()
            exam_sentences.append({'en': en, 'source': source})

    # Build the entry
    entry = {
        'id': word_id,
        'spelling': head_word,
        'lemma': head_word.lower(),
        'phonetics': phonetics,
        'definition': definition,
        'level': book_info['level'],
        'frequency': word_rank,
        'tags': [],
    }

    if example_sentence:
        entry['exampleSentence'] = example_sentence
    if example_translation:
        entry['exampleTranslation'] = example_translation
    if phrases:
        entry['phrases'] = phrases
    if related_words:
        entry['relatedWords'] = related_words
    if synonyms:
        entry['synonyms'] = synonyms
    if mnemonic:
        entry['mnemonic'] = mnemonic
    if exam_sentences:
        entry['examSentences'] = exam_sentences

    return entry


def convert_file(xdf_name: str, book_id_key: str):
    """Convert a single XDF JSONL file to the app's JSON format."""
    book_info = BOOK_MAP[book_id_key]
    xdf_path = os.path.join(XDF_DIR, f'{xdf_name}.json')

    if not os.path.exists(xdf_path):
        print(f'  SKIP: {xdf_path} not found')
        return

    with open(xdf_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    entries = []
    skipped = 0
    for line in lines:
        line = line.strip()
        if not line:
            continue
        try:
            obj = json.loads(line)
        except json.JSONDecodeError:
            skipped += 1
            continue
        entry = convert_entry(obj, book_info)
        if entry:
            entries.append(entry)
        else:
            skipped += 1

    # Deduplicate by lemma (keep first occurrence)
    seen = set()
    unique_entries = []
    for e in entries:
        key = e['lemma'].lower()
        if key in seen:
            continue
        seen.add(key)
        unique_entries.append(e)

    book = {
        'id': book_info['id'],
        'name': book_info['name'],
        'entries': unique_entries,
    }

    out_path = os.path.join(OUT_DIR, f"{book_info['id']}.json")
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(book, f, ensure_ascii=False, separators=(',', ':'))

    # Count entries with examples
    with_examples = sum(1 for e in unique_entries if e.get('exampleSentence'))

    print(f'  {xdf_name} -> {book_info["id"]}.json: {len(unique_entries)} entries '
          f'({with_examples} with examples, {skipped} skipped, {len(entries) - len(unique_entries)} duplicates)')


def main():
    print('Converting XDF wordbooks...')
    os.makedirs(OUT_DIR, exist_ok=True)
    for xdf_name, book_id_key in FILE_MAP.items():
        convert_file(xdf_name, book_id_key)
    print('Done!')


if __name__ == '__main__':
    main()

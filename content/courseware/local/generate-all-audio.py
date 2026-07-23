#!/usr/bin/env python3
"""
Generate MP3 audio for all courseware pages using edge-tts.
Scans HTML files, extracts page text, generates MP3 files.
"""
import os, re, sys, asyncio, hashlib
from pathlib import Path

try:
    import edge_tts
except ImportError:
    os.system("pip install edge-tts")
    import edge_tts

COURSEWARE_DIR = Path(__file__).parent
AUDIO_DIR = COURSEWARE_DIR / "audio"
VOICE_ZH = "zh-CN-XiaoxiaoNeural"
VOICE_EN = "en-US-JennyNeural"

def detect_lang(text):
    cn = len(re.findall(r'[一-鿿]', text))
    return VOICE_ZH if cn > len(text) * 0.15 else VOICE_EN

async def gen_mp3(text, path, voice=None):
    if path.exists() and path.stat().st_size > 200:
        return True
    v = voice or detect_lang(text)
    try:
        comm = edge_tts.Communicate(text, v)
        await comm.save(str(path))
        return True
    except Exception as e:
        print(f"  ERR: {e}")
        return False

def extract_page_texts(html):
    """Extract text content for each page from HTML."""
    texts = []

    # Pattern 1: render: `...` blocks with <p> tags
    for m in re.finditer(r"render:\s*`([^`]{20,})`", html, re.DOTALL):
        block = m.group(1)
        # Extract story-text paragraphs (Chinese)
        for p in re.finditer(r'<p[^>]*>([^<]{4,})</p>', block):
            t = p.group(1).strip()
            # Skip meta/technical text
            if any(x in t for x in ['font-size', 'color:', 'margin:', 'px', 'onclick']):
                continue
            if len(t) > 3:
                texts.append(t)

    # Pattern 2: getPageText array
    for m in re.finditer(r"getPageText|pageTexts|PAGE_TEXTS", html):
        # Find the array
        arr_match = re.search(r'\[([^\]]{50,})\]', html[m.start():m.start()+2000], re.DOTALL)
        if arr_match:
            for s in re.finditer(r"'([^']{5,})'", arr_match.group(1)):
                texts.append(s.group(1))

    # Pattern 3: speakText calls
    for m in re.finditer(r"speakText\(['\"](.+?)['\"]\)", html):
        t = m.group(1).replace("\\'", "'").replace('\\"', '"')
        if len(t) > 3:
            texts.append(t)

    # Deduplicate while preserving order
    seen = set()
    unique = []
    for t in texts:
        h = hashlib.md5(t.encode()).hexdigest()[:8]
        if h not in seen:
            seen.add(h)
            unique.append(t)
    return unique

async def process_html(html_path):
    html = html_path.read_text(encoding='utf-8')
    name = html_path.stem

    # Skip if no TTS/speak functionality
    if 'speechSynthesis' not in html and 'speakText' not in html and 'speak' not in html.lower():
        return 0

    texts = extract_page_texts(html)
    if not texts:
        return 0

    # Create audio directory
    audio_dir = AUDIO_DIR / name
    audio_dir.mkdir(exist_ok=True)

    count = 0
    for i, text in enumerate(texts[:30]):  # Max 30 pages per courseware
        mp3_path = audio_dir / f"page-{i+1}.mp3"
        if await gen_mp3(text, mp3_path):
            count += 1

    return count

async def main():
    files = sorted(COURSEWARE_DIR.glob("*.html"))
    print(f"Scanning {len(files)} HTML files...")

    total = 0
    for f in files:
        n = await process_html(f)
        if n > 0:
            print(f"  {f.name}: {n} pages")
            total += n

    print(f"\nDone! Generated {total} MP3 files in {AUDIO_DIR}")

if __name__ == "__main__":
    asyncio.run(main())

#!/usr/bin/env python3
"""Generate MP3 files for all courseware using edge-tts."""
import os, re, json, asyncio, hashlib
from pathlib import Path

try:
    import edge_tts
except ImportError:
    print("Installing edge-tts...")
    os.system("pip install edge-tts")
    import edge_tts

COURSEWARE_DIR = Path(__file__).parent
AUDIO_DIR = COURSEWARE_DIR / "audio"
AUDIO_DIR.mkdir(exist_ok=True)

# Voice: zh-CN for Chinese, en-US for English
VOICE_ZH = "zh-CN-XiaoxiaoNeural"
VOICE_EN = "en-US-JennyNeural"

def detect_language(text):
    """Detect if text is primarily Chinese or English."""
    chinese_chars = len(re.findall(r'[一-鿿]', text))
    return VOICE_ZH if chinese_chars > len(text) * 0.2 else VOICE_EN

def text_to_hash(text):
    """Generate short hash for text to use as filename."""
    return hashlib.md5(text.encode()).hexdigest()[:8]

async def generate_mp3(text, output_path, voice=None):
    """Generate MP3 file from text using edge-tts."""
    if output_path.exists() and output_path.stat().st_size > 100:
        return True  # Already exists
    if not voice:
        voice = detect_language(text)
    try:
        communicate = edge_tts.Communicate(text, voice)
        await communicate.save(str(output_path))
        return True
    except Exception as e:
        print(f"  Error generating {output_path.name}: {e}")
        return False

def extract_speak_texts(html_content):
    """Extract all speakText calls from HTML."""
    texts = []
    # Pattern: speakText('...') or speakText("...")
    for match in re.finditer(r"speakText\(['\"](.+?)['\"]\)", html_content):
        text = match.group(1).replace("\\'", "'").replace('\\"', '"')
        if len(text) > 2:  # Skip empty/very short
            texts.append(text)
    return texts

def extract_page_texts(html_content):
    """Extract page content for page-level audio."""
    pages = []
    # Look for page arrays or page divs
    # Pattern 1: { title: '...', render: `...` }
    for match in re.finditer(r"render:\s*`([^`]+)`", html_content):
        render = match.group(1)
        # Extract Chinese text from paragraphs
        for p_match in re.finditer(r'<p[^>]*class="story-text"[^>]*>([^<]+)</p>', render):
            text = p_match.group(1).strip()
            if text and len(text) > 3:
                pages.append(text)
    return pages

async def process_file(html_path):
    """Process a single HTML file."""
    html = html_path.read_text(encoding='utf-8')
    filename = html_path.stem

    # Check if file uses TTS
    if 'speechSynthesis' not in html and 'speakText' not in html:
        return 0

    # Check if file already has MP3 references
    has_mp3 = '.mp3' in html

    # Extract texts
    speak_texts = extract_speak_texts(html)
    page_texts = extract_page_texts(html)

    all_texts = list(set(speak_texts + page_texts))
    if not all_texts:
        return 0

    print(f"Processing {html_path.name}: {len(all_texts)} texts")

    generated = 0
    # Create audio subdirectory for this courseware
    audio_subdir = AUDIO_DIR
    audio_subdir.mkdir(exist_ok=True)

    for i, text in enumerate(all_texts[:20]):  # Limit to 20 per file
        text_hash = text_to_hash(text)
        mp3_name = f"{filename}-{text_hash}.mp3"
        mp3_path = audio_subdir / mp3_name

        if await generate_mp3(text, mp3_path):
            generated += 1

    return generated

async def main():
    """Main entry point."""
    html_files = sorted(COURSEWARE_DIR.glob("*.html"))
    print(f"Found {len(html_files)} HTML files")

    total_generated = 0
    for html_path in html_files:
        count = await process_file(html_path)
        total_generated += count

    print(f"\nTotal generated: {total_generated} MP3 files")

if __name__ == "__main__":
    asyncio.run(main())

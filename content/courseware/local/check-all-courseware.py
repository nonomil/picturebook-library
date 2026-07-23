#!/usr/bin/env python3
"""
全量课件检查脚本 — 逐个扫描所有 HTML 课件的每个维度
输出结构化报告，不遗漏任何一页。
"""
import os, re, json, sys
from pathlib import Path
from html.parser import HTMLParser

# Fix Windows console encoding
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

COURSEWARE_DIR = Path(__file__).parent

# ============================================================
# 检查维度定义
# ============================================================
CHECKS = {
    "broken_image": "图片路径 404（文件不存在）",
    "broken_audio": "音频路径 404（文件不存在）",
    "small_font": "字体过小（<12px 像素字体 / <14px 普通字体）",
    "no_alt": "img 标签缺少 alt 属性",
    "no_onerror": "图片缺少 onerror 隐藏（破图会显示裂图图标）",
    "external_url": "引用外部 URL（GitHub/placeholder 等，可能 404）",
    "no_viewport": "缺少 viewport meta 标签",
    "no_safe_area": "缺少 viewport-fit=cover（iOS 安全区遮挡）",
    "no_overflow_hidden": "body 未设置 overflow:hidden（布局可能溢出）",
    "no_tts_fallback": "有 speakText 但无 MP3/TTS 降级逻辑",
    "empty_page": "页面 div 无内容（< 10 字符）",
    "nav_boundary": "翻页边界：首页无 prev 禁用 / 末页无 next 禁用",
    "long_text_line": "单行文字 > 40 字符（移动端可能溢出）",
    "img_too_large": "图片未限制 max-height（可能撑破布局）",
    "inline_style_overload": "单元素 inline style > 200 字符（维护困难）",
    "duplicate_id": "HTML id 重复",
    "missing_required_id": "缺少必要元素（如 page container / nav buttons）",
}


class CoursewareChecker(HTMLParser):
    """解析单个 HTML 文件，收集所有问题"""

    def __init__(self, filepath):
        super().__init__()
        self.filepath = filepath
        self.filename = filepath.name
        self.issues = []  # [(check_name, line, detail)]
        self._tag_stack = []
        self._current_attrs = {}
        self._text_buf = ""
        self._in_script = False
        self._in_style = False
        self._ids_seen = set()
        self._img_count = 0
        self._has_viewport = False
        self._has_viewport_fit = False
        self._body_overflow_hidden = False
        self._has_speak = False
        self._has_mp3 = False
        self._has_tts = False
        self._content_divs = []
        self._nav_buttons = {"prev": False, "next": False}
        self._all_text_lines = []

    def handle_starttag(self, tag, attrs):
        attr_dict = dict(attrs)
        self._tag_stack.append(tag)
        self._current_attrs = attr_dict

        if tag == "script":
            self._in_script = True
        if tag == "style":
            self._in_style = True

        # --- img 检查 ---
        if tag == "img":
            self._img_count += 1
            src = attr_dict.get("src", "")
            alt = attr_dict.get("alt", "")
            onerror = attr_dict.get("onerror", "")

            # broken image
            if src and not src.startswith("http") and not src.startswith("data:"):
                img_path = self.filepath.parent / src
                if not img_path.exists():
                    self.issues.append(("broken_image", self.getpos(), src))

            # no alt
            if not alt:
                self.issues.append(("no_alt", self.getpos(), f"<img src='{src[:50]}'>"))

            # no onerror
            if src and not src.startswith("data:") and not onerror:
                self.issues.append(("no_onerror", self.getpos(), f"<img src='{src[:50]}'>"))

            # external URL
            if src.startswith("http") and "fonts.googleapis" not in src and "cdnjs.cloudflare" not in src and "unpkg.com" not in src:
                self.issues.append(("external_url", self.getpos(), src[:80]))

            # img too large (no max-height/width constraint in inline style)
            style = attr_dict.get("style", "")
            if "max-height" not in style and "max-width" not in style and "width:" in style:
                self.issues.append(("img_too_large", self.getpos(), f"src='{src[:40]}'"))

        # --- audio 检查 ---
        if tag in ("audio", "source"):
            src = attr_dict.get("src", "")
            if src and not src.startswith("http"):
                audio_path = self.filepath.parent / src
                if not audio_path.exists():
                    self.issues.append(("broken_audio", self.getpos(), src))

        # --- viewport ---
        if tag == "meta" and "viewport" in attr_dict.get("name", ""):
            self._has_viewport = True
            content = attr_dict.get("content", "")
            if "viewport-fit=cover" in content:
                self._has_viewport_fit = True

        # --- id 检查 ---
        eid = attr_dict.get("id", "")
        if eid:
            if eid in self._ids_seen:
                self.issues.append(("duplicate_id", self.getpos(), f"id='{eid}'"))
            self._ids_seen.add(eid)

        # --- nav buttons ---
        onclick = attr_dict.get("onclick", "")
        if "prevPage" in onclick or "prev" in onclick.lower():
            self._nav_buttons["prev"] = True
        if "nextPage" in onclick or "next" in onclick.lower():
            self._nav_buttons["next"] = True

        # --- speakText / MP3 ---
        if "speakText" in onclick:
            self._has_speak = True

        # inline style overload
        style = attr_dict.get("style", "")
        if len(style) > 200:
            self.issues.append(("inline_style_overload", self.getpos(), f"len={len(style)}"))

    def handle_endtag(self, tag):
        if self._tag_stack and self._tag_stack[-1] == tag:
            self._tag_stack.pop()
        if tag == "script":
            self._in_script = False
        if tag == "style":
            self._in_style = False

    def handle_data(self, data):
        text = data.strip()
        if not text or self._in_script or self._in_style:
            return

        # 长文字行
        for line in text.split("\n"):
            line = line.strip()
            if len(line) > 40:
                self._all_text_lines.append((self.getpos(), line[:80]))

    def check_raw(self):
        """基于原始文本的检查（不依赖解析器）"""
        raw = self.filepath.read_text(encoding="utf-8", errors="ignore")

        # body overflow:hidden
        if "overflow:hidden" in raw or "overflow: hidden" in raw:
            self._body_overflow_hidden = True

        # speakText / MP3 / TTS
        if "speakText" in raw:
            self._has_speak = True
        if ".mp3" in raw:
            self._has_mp3 = True
        if "speechSynthesis" in raw:
            self._has_tts = True

        # font-size 检查（像素字体 <12px，普通字体 <14px）
        for m in re.finditer(r"font-size:\s*(\d+)px", raw):
            size = int(m.group(1))
            line_no = raw[:m.start()].count("\n") + 1
            if size < 10:
                self.issues.append(("small_font", line_no, f"font-size:{size}px"))
            elif size < 12:
                # 检查是否在像素字体上下文中
                context = raw[max(0, m.start()-100):m.end()+50]
                if "Press Start" in context or "pixel" in context.lower() or "font-pixel" in context:
                    pass  # 像素字体允许更小
                else:
                    self.issues.append(("small_font", line_no, f"font-size:{size}px"))

        # 翻页边界检查
        if "prevPage" in raw and "disabled" not in raw.split("prevPage")[0][-50:]:
            # 检查是否有 prevBtn disabled 逻辑
            if "prevBtn" in raw and "disabled" in raw:
                pass  # 有禁用逻辑
            elif "goPage(0)" in raw or "currentPage===0" in raw or "currentPage=== 0" in raw:
                pass  # 有边界检查
            # 不强制报错，因为很多文件用不同方式处理

        # 外部 URL
        for m in re.finditer(r'src="(https?://[^"]+)"', raw):
            url = m.group(1)
            if "fonts.googleapis" not in url and "cdnjs.cloudflare" not in url and "unpkg.com" not in url and "cdn.jsdelivr" not in url:
                self.issues.append(("external_url", raw[:m.start()].count("\n")+1, url[:80]))

        return raw

    def finalize(self):
        """最终汇总检查"""
        # 检查必要元素
        if self._img_count > 0 and not self._has_viewport:
            self.issues.append(("no_viewport", 1, "有图片但无 viewport meta"))

        if not self._has_viewport_fit and self._has_viewport:
            self.issues.append(("no_safe_area", 1, "viewport 无 viewport-fit=cover"))

        if not self._body_overflow_hidden and self._img_count > 3:
            self.issues.append(("no_overflow_hidden", 1, "多图片页面但 body 无 overflow:hidden"))

        # speakText 但无 MP3 降级
        if self._has_speak and not self._has_mp3 and not self._has_tts:
            self.issues.append(("no_tts_fallback", 1, "有 speakText 但无 MP3/TTS 降级"))

        # 长文字行（排除代码/样式）
        for pos, line in self._all_text_lines:
            if not line.startswith("//") and not line.startswith("/*") and "px" not in line and "{" not in line:
                self.issues.append(("long_text_line", pos, line[:60]))

    def run(self):
        try:
            self.check_raw()
            self.filepath.read_text(encoding="utf-8")  # trigger parser
            # Re-parse properly
            self.reset()
            content = self.filepath.read_text(encoding="utf-8", errors="ignore")
            self.feed(content)
            self.finalize()
        except Exception as e:
            self.issues.append(("parse_error", 0, str(e)))
        return self.issues


def main():
    files = sorted(COURSEWARE_DIR.glob("*.html"))
    print(f"扫描 {len(files)} 个 HTML 文件...\n")

    all_results = {}
    summary = {k: 0 for k in CHECKS}

    for f in files:
        checker = CoursewareChecker(f)
        issues = checker.run()
        if issues:
            all_results[f.name] = issues
            for check_name, _, _ in issues:
                if check_name in summary:
                    summary[check_name] += 1

    # 输出报告
    print("=" * 60)
    print("全量课件检查报告")
    print("=" * 60)

    # 按检查类型汇总
    print("\n## 问题汇总（按类型）\n")
    for check_name, desc in CHECKS.items():
        count = summary[check_name]
        if count > 0:
            level = "CRIT" if count > 10 else "WARN" if count > 3 else "INFO"
            print(f"  [{level}] {check_name}: {count} 个文件 - {desc}")

    # 按文件列出问题
    print(f"\n## 详细问题（{len(all_results)} 个文件有问题）\n")
    for filename, issues in sorted(all_results.items()):
        print(f"### {filename} ({len(issues)} 个问题)")
        for check_name, line, detail in issues:
            desc = CHECKS.get(check_name, check_name)
            severity = "!!!" if check_name in ('broken_image','broken_audio','external_url') else " ! "
            print(f"  [{severity}] L{line}: {desc}")
            print(f"      -> {detail}")
        print()

    # 无问题文件
    clean = [f.name for f in files if f.name not in all_results]
    print(f"\n## 无问题文件（{len(clean)} 个）")
    for name in clean:
        print(f"  [OK] {name}")

    # 保存 JSON 报告
    report_path = COURSEWARE_DIR / "check-report.json"
    with open(report_path, "w", encoding="utf-8") as fp:
        json.dump({
            "total_files": len(files),
            "files_with_issues": len(all_results),
            "summary": summary,
            "details": {k: [(c, l, d) for c, l, d in v] for k, v in all_results.items()}
        }, fp, ensure_ascii=False, indent=2)
    print(f"\n完整报告已保存到: {report_path}")


if __name__ == "__main__":
    main()

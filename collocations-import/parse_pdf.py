#!/usr/bin/env python3
"""
parse_pdf.py - Parse "The Academic Collocation List" PDF → collocations.json

Output: collocations.json với schema:
  [{
    "id": 1,
    "collocation": "active involvement",
    "comp1": "active", "pos1": "adj",
    "comp2": "involvement", "pos2": "n",
    "pos_label": "adj + n",
    "ipa": "",           ← Claude Code sẽ điền
    "meaning_vi": "",    ← Claude Code sẽ điền
    "examples": []       ← Claude Code sẽ điền (3 ví dụ EN+VI)
  }, ...]

Cài đặt:  pip install pdfplumber
Chạy:     python parse_pdf.py the-academic-collocation-list.pdf
"""

import sys
import re
import json
import pdfplumber

FIRST_PAGE, LAST_PAGE = 5, 39  # trang chứa danh sách (1-indexed)

HEAD_RE = re.compile(r"^\s*(\d+)\s+(.+?)\s*\(([a-z/]+)\)\s*$")
ITEM_RE = re.compile(r"^\s*(.+?)\s*\(([a-z,/ ]+)\)\s*$")


def parse(pdf_path):
    items = []
    with pdfplumber.open(pdf_path) as pdf:
        for pno in range(FIRST_PAGE - 1, LAST_PAGE):
            page = pdf.pages[pno]
            mid = page.width / 2
            for x0, x1 in [(0, mid), (mid, page.width)]:
                col = page.within_bbox((x0, 0, x1, page.height))
                _parse_col(_lines(col.extract_words()), items)
    # gán id
    for i, it in enumerate(items, 1):
        it["id"] = i
    return items


def _lines(words, y_tol=3):
    rows = []
    for w in sorted(words, key=lambda w: (round(w["top"]), w["x0"])):
        if rows and abs(w["top"] - rows[-1]["top"]) <= y_tol:
            rows[-1]["words"].append(w)
        else:
            rows.append({"top": w["top"], "words": [w]})
    return [" ".join(x["text"] for x in sorted(r["words"], key=lambda x: x["x0"])).strip()
            for r in rows]


def _parse_col(lines, out):
    cur = cur_pos = None
    for ln in lines:
        if not ln: continue
        low = ln.lower()
        if "academic collocation list" in low or "pearson" in low or "component" in low:
            continue
        m = HEAD_RE.match(ln)
        if m:
            cur, cur_pos = m.group(2).strip(), m.group(3).strip()
            continue
        if cur is None: continue
        m = ITEM_RE.match(ln)
        if m:
            comp2, pos2 = m.group(1).strip(), m.group(2).strip()
            c1 = re.sub(r"\s*\([^)]*\)\s*", " ", cur).strip()
            c2 = re.sub(r"\s*\([^)]*\)\s*", " ", comp2).strip()
            out.append({
                "collocation": f"{c1} {c2}".strip(),
                "comp1": cur, "pos1": cur_pos,
                "comp2": comp2, "pos2": pos2,
                "pos_label": f"{cur_pos} + {pos2}",
                "ipa": "",
                "meaning_vi": "",
                "examples": [],
            })


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Cách dùng: python parse_pdf.py <file.pdf>")
        sys.exit(1)
    items = parse(sys.argv[1])
    with open("collocations.json", "w", encoding="utf-8") as f:
        json.dump(items, f, ensure_ascii=False, indent=2)
    print(f"OK: {len(items)} collocation → collocations.json")

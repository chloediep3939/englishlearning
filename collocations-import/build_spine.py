#!/usr/bin/env python3
"""
build_spine.py - Robust spine builder for the Academic Collocation List.

parse_pdf.py (the task's script) undercounts because:
  (a) some items wrap onto a second line ("(vpp)" alone), and
  (b) two items sometimes share one physical line, and its regex only
      captured the LAST "(pos)" group, dropping the first item.

This builder tokenises each line at POS parens ({n,v,adj,adv,vpp}) so a
line like "meeting (n) rate (n)" yields TWO items, and carries an
incomplete item to the next line. It also reconstructs `english` with
articles/prepositions restored (e.g. "achieve (a)" + "goal" -> "achieve a goal").

Output: collocations.json  (same dir)
Run:    /tmp/colloc-venv/bin/python build_spine.py <pdf>
"""
import sys, re, json
import pdfplumber

FIRST, LAST = 5, 39
POS = {"n", "v", "adj", "adv", "vpp"}
PAREN = re.compile(r"\(([^)]*)\)")
NOISE = re.compile(r"classroom resource|the acade|collocation lis|part of speech|^\s*#\s*$|^\s*\|", re.I)
HEAD = re.compile(r"^(\d+)\s+(.+)$")


def lines(words, yt=3):
    rows = []
    for w in sorted(words, key=lambda w: (round(w["top"]), w["x0"])):
        if rows and abs(w["top"] - rows[-1]["top"]) <= yt:
            rows[-1]["w"].append(w)
        else:
            rows.append({"top": w["top"], "w": [w]})
    return [" ".join(x["text"] for x in sorted(r["w"], key=lambda x: x["x0"])).strip() for r in rows]


def first_pos(s):
    """Return (match, pos) for the first POS paren in s, else (None, None)."""
    for m in PAREN.finditer(s):
        if m.group(1).strip() in POS:
            return m, m.group(1).strip()
    return None, None


def deparen(s):
    """'achieve (a)' -> 'achieve a'; 'access (to)' -> 'access to';
       'involved (with/in)' -> 'involved with'; 'role (of, as)' -> 'role of'."""
    def repl(m):
        c = m.group(1).strip().split("/")[0].split(",")[0].strip()
        return " " + c + " "
    return re.sub(r"\s+", " ", PAREN.sub(repl, s)).strip()


def english_of(comp1, comp2):
    e = (deparen(comp1) + " " + deparen(comp2)).strip()
    # de-duplicate accidental word repeat at the seam (e.g. "take on the role" + "role of")
    parts = e.split()
    out = []
    for w in parts:
        if out and out[-1].lower() == w.lower():
            continue
        out.append(w)
    return " ".join(out)


def build(pdf_path):
    items = []
    cur = cur_pos = None
    pending = ""

    def flush():
        nonlocal pending
        while True:
            m, pos = first_pos(pending)
            if not m:
                break
            seg = pending[: m.start()].strip()
            pending = pending[m.end():]
            if seg and cur is not None:
                items.append({
                    "comp1": cur, "pos1": cur_pos,
                    "comp2": seg, "pos2": pos,
                    "pos_label": f"{cur_pos} + {pos}",
                    "english": english_of(cur, seg),
                    "ipa": "", "meaning_vi": "", "examples": [],
                })

    with pdfplumber.open(pdf_path) as pdf:
        for pno in range(FIRST - 1, LAST):
            page = pdf.pages[pno]
            mid = page.width / 2
            for x0, x1 in [(0, mid), (mid, page.width)]:
                col = page.within_bbox((x0, 0, x1, page.height))
                for ln in lines(col.extract_words()):
                    if not ln or NOISE.search(ln):
                        continue
                    hm = HEAD.match(ln)
                    if hm:
                        pending = ""
                        rest = hm.group(2)
                        m, pos = first_pos(rest)
                        if m:
                            cur, cur_pos = rest[: m.start()].strip(), pos
                            pending = rest[m.end():]
                            flush()
                        else:
                            cur, cur_pos, pending = rest.strip(), None, ""
                        continue
                    if cur is None:
                        continue
                    pending += " " + ln
                    flush()

    for i, it in enumerate(items, 1):
        it_id = {"id": i}
        it_id.update(it)
        items[i - 1] = it_id
    return items


if __name__ == "__main__":
    data = build(sys.argv[1])
    with open("collocations.json", "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"OK: {len(data)} collocations -> collocations.json")

from __future__ import annotations

import json
import math
from pathlib import Path

from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "output" / "pdf" / "bowling-drill-layout-beginner-course-handout-v3.pdf"
DATA = json.loads((ROOT / "outputs" / "real-ball-catalog-validation.json").read_text(encoding="utf-8"))
IMG_DIR = ROOT / "tmp" / "pdfs"
OUT.parent.mkdir(parents=True, exist_ok=True)

FONT_PATH = Path("C:/Windows/Fonts/NotoSansJP-VF.ttf")
if not FONT_PATH.exists():
    raise FileNotFoundError(FONT_PATH)
pdfmetrics.registerFont(TTFont("NotoSansJP", str(FONT_PATH)))
FONT = "NotoSansJP"

PW, PH = A4
M = 36
INK = HexColor("#10272D")
MUTED = HexColor("#4E666B")
PAPER = HexColor("#F5F8F7")
WHITE = HexColor("#FFFFFF")
TEAL = HexColor("#087F76")
TEAL_SOFT = HexColor("#D9EFEB")
ORANGE = HexColor("#D96B2B")
ORANGE_SOFT = HexColor("#F9E5D8")
BLUE = HexColor("#2F6FA3")
BLUE_SOFT = HexColor("#DDEAF5")
PURPLE = HexColor("#76518C")
PURPLE_SOFT = HexColor("#E9E0EE")
LINE = HexColor("#B9CBC8")
GRID = HexColor("#D8E4E2")
YELLOW = HexColor("#F2C94C")


def set_font(c: canvas.Canvas, size: float, color=INK):
    c.setFont(FONT, size)
    c.setFillColor(color)


def wrap_text(text: str, max_width: float, size: float):
    lines = []
    current = ""
    for ch in str(text):
        candidate = current + ch
        if current and pdfmetrics.stringWidth(candidate, FONT, size) > max_width:
            lines.append(current)
            current = ch
        else:
            current = candidate
    if current:
        lines.append(current)
    return lines


def draw_paragraph(c, text, x, top, width, size=11, leading=1.55, color=INK, max_lines=None):
    lines = wrap_text(text, width, size)
    if max_lines is not None:
        lines = lines[:max_lines]
    set_font(c, size, color)
    y = top
    for line in lines:
        c.drawString(x, y - size, line)
        y -= size * leading
    return y


def draw_centered(c, text, x, y, width, size, color=INK):
    set_font(c, size, color)
    c.drawCentredString(x + width / 2, y, text)


def display_product_name(ball):
    name = str(ball["name"])
    brand = str(ball["brand"])
    return name if name.lower().startswith(brand.lower()) else f"{brand} {name}"


def draw_link_line(c, label, url, x, y, size=8.2):
    set_font(c, size, BLUE)
    c.drawString(x, y, label)
    width = pdfmetrics.stringWidth(label, FONT, size)
    c.linkURL(url, (x, y - 2, x + width, y + size + 2), relative=0)


def round_box(c, x, y, w, h, fill, stroke=LINE, radius=10, line_width=0.8):
    c.setFillColor(fill)
    c.setStrokeColor(stroke)
    c.setLineWidth(line_width)
    c.roundRect(x, y, w, h, radius, stroke=1, fill=1)


def image_fit(c, path: Path, x, y, w, h, bg=INK):
    round_box(c, x, y, w, h, bg, LINE, 9)
    img = ImageReader(str(path))
    iw, ih = img.getSize()
    scale = min((w - 4) / iw, (h - 4) / ih)
    dw, dh = iw * scale, ih * scale
    c.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, width=dw, height=dh, mask="auto")


def header(c, page, title, subtitle="初心者向け ドリルレイアウト講座"):
    c.setFillColor(PAPER)
    c.rect(0, 0, PW, PH, stroke=0, fill=1)
    c.setFillColor(INK)
    c.rect(0, PH - 86, PW, 86, stroke=0, fill=1)
    set_font(c, 8.5, TEAL_SOFT)
    c.drawString(M, PH - 24, subtitle)
    set_font(c, 23, WHITE)
    c.drawString(M, PH - 57, title)
    set_font(c, 9, HexColor("#C8D8D6"))
    c.drawRightString(PW - M, PH - 25, f"{page:02d} / 12")
    c.setStrokeColor(LINE)
    c.setLineWidth(0.7)
    c.line(M, 31, PW - M, 31)
    set_font(c, 7.5, MUTED)
    c.drawString(M, 18, "公式カタログ値と静的穴あけモデルを区別して読む")
    c.drawRightString(PW - M, 18, str(page))


def section_label(c, text, x, y, color=TEAL):
    set_font(c, 10, color)
    c.drawString(x, y, text)


def draw_table(c, x, top, widths, rows, row_heights, font_sizes=None, header_fill=INK):
    total_w = sum(widths)
    y = top
    for r, row in enumerate(rows):
        h = row_heights[r]
        y -= h
        xx = x
        for col, value in enumerate(row):
            w = widths[col]
            c.setFillColor(header_fill if r == 0 else (WHITE if r % 2 else HexColor("#EDF3F2")))
            c.setStrokeColor(LINE)
            c.setLineWidth(0.6)
            c.rect(xx, y, w, h, stroke=1, fill=1)
            size = (font_sizes[r] if font_sizes else (8.5 if r == 0 else 8.2))
            color = WHITE if r == 0 else INK
            lines = wrap_text(str(value), w - 10, size)
            set_font(c, size, color)
            line_h = size * 1.35
            start_y = y + h - 8 - size
            for i, line in enumerate(lines[: max(1, int((h - 8) / line_h))]):
                c.drawString(xx + 5, start_y - i * line_h, line)
            xx += w
    return y, total_w


def draw_line_chart(c, x, y, w, h, series, x_values, y_max, y_label):
    left, right, bottom, top = x + 45, x + w - 12, y + 35, y + h - 25
    c.setFillColor(WHITE)
    c.setStrokeColor(LINE)
    c.rect(x, y, w, h, stroke=1, fill=1)
    for i in range(6):
        yy = bottom + i / 5 * (top - bottom)
        c.setStrokeColor(GRID)
        c.line(left, yy, right, yy)
        set_font(c, 6.8, MUTED)
        c.drawRightString(left - 5, yy - 2, f"{i / 5 * y_max:.3f}")
    x_min, x_max = min(x_values), max(x_values)
    sx = lambda v: left + (v - x_min) / (x_max - x_min) * (right - left)
    sy = lambda v: bottom + v / y_max * (top - bottom)
    for spec in series:
        c.setStrokeColor(spec["color"])
        c.setFillColor(spec["color"])
        c.setLineWidth(2.2)
        pts = list(zip(x_values, spec["values"]))
        path = c.beginPath()
        for i, (xx, yy) in enumerate(pts):
            if i == 0:
                path.moveTo(sx(xx), sy(yy))
            else:
                path.lineTo(sx(xx), sy(yy))
        c.drawPath(path, stroke=1, fill=0)
        for xx, yy in pts:
            c.circle(sx(xx), sy(yy), 2.5, stroke=0, fill=1)
    for value in x_values:
        set_font(c, 7, MUTED)
        c.drawCentredString(sx(value), bottom - 14, str(value))
    set_font(c, 7.5, MUTED)
    c.drawString(left, top + 9, y_label)
    legend_x = left
    for spec in series:
        c.setFillColor(spec["color"])
        c.rect(legend_x, y + 11, 10, 3, stroke=0, fill=1)
        set_font(c, 7.2, INK)
        c.drawString(legend_x + 14, y + 8, spec["name"])
        legend_x += 110


def draw_scatter(c, x, y, w, h, balls):
    left, right, bottom, top = x + 42, x + w - 14, y + 35, y + h - 28
    c.setFillColor(WHITE); c.setStrokeColor(LINE); c.rect(x, y, w, h, stroke=1, fill=1)
    x_min, x_max, y_min, y_max = 2.44, 2.68, 0, 0.065
    sx = lambda v: left + (v - x_min) / (x_max - x_min) * (right - left)
    sy = lambda v: bottom + (v - y_min) / (y_max - y_min) * (top - bottom)
    for i in range(7):
        yy = y_min + i * 0.01
        c.setStrokeColor(GRID); c.line(left, sy(yy), right, sy(yy))
        set_font(c, 6.5, MUTED); c.drawRightString(left - 4, sy(yy) - 2, f"{yy:.3f}")
    for i in range(7):
        xx = 2.44 + i * 0.04
        set_font(c, 6.5, MUTED); c.drawCentredString(sx(xx), bottom - 13, f"{xx:.2f}")
    colors = [TEAL, ORANGE, PURPLE, BLUE, HexColor("#20A394"), HexColor("#B5423A")]
    labels = ["Tropical Surge", "Phaze II", "Purple Urethane", "Effect Tour", "Ion Max", "Black Widow 3.0"]
    for ball, color, label in zip(balls, colors, labels):
        px, py = sx(ball["catalog_rg_low_in"]), sy(ball["catalog_total_diff_in"])
        c.setFillColor(color); c.circle(px, py, 4.2, stroke=0, fill=1)
        set_font(c, 6.3, color)
        dx = -48 if px > right - 70 else 6
        c.drawString(px + dx, py + 4, label)
    set_font(c, 7.5, MUTED)
    c.drawCentredString((left + right) / 2, y + 9, "RG（インチ）")
    c.drawString(left, top + 10, "ディファレンシャルRG（インチ）")


c = canvas.Canvas(str(OUT), pagesize=A4, pageCompression=1)
c.setTitle("ボウリングボールのドリルレイアウト 初心者向け講座")
c.setAuthor("Drill-3D Model Project")

# 1 Cover
c.setFillColor(INK); c.rect(0, 0, PW, PH, stroke=0, fill=1)
c.setFillColor(TEAL); c.rect(0, 0, 10, PH, stroke=0, fill=1)
set_font(c, 11, TEAL_SOFT); c.drawString(42, PH - 70, "BEGINNER COURSE")
set_font(c, 34, WHITE); c.drawString(42, PH - 120, "ボウリングボールの")
c.drawString(42, PH - 164, "ドリルレイアウト")
draw_paragraph(c, "3つの数値とカタログ値を、完成球の重さの偏りから読み解く", 44, PH - 202, 510, 14, 1.5, HexColor("#C9DAD7"))
image_fit(c, IMG_DIR / "model-overview-45-35-45-hires.png", 44, 166, 507, 350)
set_font(c, 17, YELLOW); c.drawString(44, 125, "ドリル角 × PIN-PAP × VAL角")
set_font(c, 9.5, HexColor("#C9DAD7")); c.drawString(44, 83, "配布用ハンドアウト / 公式カタログ6球で照合")
c.showPage()

# 2 Scope
header(c, 2, "この資料の読み方")
cards = [
    ("カバーと表面", "レーンとの摩擦を左右する。素材、仕上げ、オイル量の影響を受ける。", ORANGE, ORANGE_SOFT),
    ("コアの物理値", "RGと2種類のディファレンシャルが、回転の始まりやすさと軸移動の上限を形づくる。", TEAL, TEAL_SOFT),
    ("ドリルレイアウト", "PAPを基準に、コアとグリップ穴の向きを3つの値で決める。", BLUE, BLUE_SOFT),
]
for i, (title, body, color, soft) in enumerate(cards):
    y = 570 - i * 150
    round_box(c, M, y, PW - 2 * M, 118, WHITE, LINE, 12)
    c.setFillColor(color); c.rect(M, y, 8, 118, stroke=0, fill=1)
    set_font(c, 15, color); c.drawString(M + 24, y + 82, title)
    draw_paragraph(c, body, M + 24, y + 63, PW - 2 * M - 48, 11.5, 1.55)
round_box(c, M, 92, PW - 2 * M, 106, TEAL_SOFT, TEAL, 12)
set_font(c, 12, TEAL); c.drawString(M + 18, 170, "この資料が扱う中心")
draw_paragraph(c, "公式カタログ値と穴あけ位置から、完成球の静的な慣性値がどう変わるかを読む。何枚曲がるか、何フィートで曲がり始めるかは予測しない。", M + 18, 151, PW - 2 * M - 36, 11.5, 1.55)
c.showPage()

# 3 Terms
header(c, 3, "基準点と基準線")
image_fit(c, IMG_DIR / "model-pin-35-hires.png", M, 390, PW - 2 * M, 300)
terms = [
    ("PAP", "投球直後の回転軸が表面と交わる点。すべてのレイアウトは各ボウラーのPAPから測る。", TEAL),
    ("PIN", "メーカーが示すピン。低RG軸の一端は、通常PIN中心から1インチ以内にある。", ORANGE),
    ("PSA / MB", "非対称コアの好ましい回転軸を示す印。メーカーによって名称が異なる。", PURPLE),
    ("VAL", "PAPを通り、投球直後の回転軸に直角な基準線。VAL角の基準になる。", BLUE),
]
for i, (term, desc, color) in enumerate(terms):
    y = 328 - i * 68
    set_font(c, 13, color); c.drawString(M, y, term)
    draw_paragraph(c, desc, M + 92, y + 3, PW - 2 * M - 92, 9.8, 1.45)
c.showPage()

# 4 Three values
header(c, 4, "45° × 3.5インチ × 45°の読み方")
items = [
    ("1", "45°", "ドリル角", "PINとPSA / MBの向きをPAPから見て決める。", ORANGE),
    ("2", "3.5 in", "PIN-PAP", "PAPからPINまでの球面距離。コア軸と投球軸の離れ方を決める。", TEAL),
    ("3", "45°", "VAL角", "PIN-PAP線とVALの間の角度。PINとグリップ穴の向きを決める。", BLUE),
]
for i, (num, value, name, desc, color) in enumerate(items):
    y = 563 - i * 156
    round_box(c, M, y, PW - 2 * M, 126, WHITE, LINE, 12)
    c.setFillColor(color); c.circle(M + 29, y + 88, 16, stroke=0, fill=1)
    set_font(c, 12, WHITE); c.drawCentredString(M + 29, y + 84, num)
    set_font(c, 24, color); c.drawString(M + 60, y + 79, value)
    set_font(c, 14, INK); c.drawString(M + 205, y + 85, name)
    draw_paragraph(c, desc, M + 60, y + 55, PW - 2 * M - 82, 10.5, 1.48)
round_box(c, M, 75, PW - 2 * M, 92, TEAL_SOFT, TEAL, 12)
draw_paragraph(c, "3つの値は独立した性能つまみではない。1つを変えると、PIN、PSA / MB、グリップ穴の位置関係が変わり、完成球の慣性値も変わる。", M + 18, 142, PW - 2 * M - 36, 11.5, 1.5)
c.showPage()

# 5 Catalog terms
header(c, 5, "カタログ値の意味")
rows = [
    ("RG", "回転の始まりやすさ", "小さいほど、同じ条件では回転状態が変わりやすい。", TEAL),
    ("ディファレンシャルRG", "最大RG - 最小RG", "完成球が持つ軸移動の土台。大きいほど上限が大きい。", ORANGE),
    ("インターミディエイト・\nディファレンシャル", "最大RG - 中間RG", "非対称性の大きさ。PSA / MBの向きと関係する。", PURPLE),
    ("表面・カバー", "摩擦とオイルへの応答", "同じRGでも、レーン上の動きは素材と仕上げで変わる。", BLUE),
]
for i, (name, formula, desc, color) in enumerate(rows):
    y = 595 - i * 130
    round_box(c, M, y, PW - 2 * M, 104, WHITE, LINE, 11)
    draw_paragraph(c, name, M + 16, y + 82, 170, 11.5, 1.25, color)
    set_font(c, 10.5, INK); c.drawString(M + 190, y + 72, formula)
    draw_paragraph(c, desc, M + 190, y + 48, PW - 2 * M - 210, 9.7, 1.45)
round_box(c, M, 70, PW - 2 * M, 72, ORANGE_SOFT, ORANGE, 10)
draw_paragraph(c, "カタログRGは穴あけ前の値。完成球では穴の体積と位置によって3方向のRGが変わる。", M + 16, 121, PW - 2 * M - 32, 11, 1.45)
c.showPage()

# 6 Real catalog
header(c, 6, "実在6球の公式値と物理的位置づけ")
table_rows = [["ボール（15 lb）", "コア", "RG", "Diff.", "Int."]]
for ball in DATA["balls"]:
    table_rows.append([
        display_product_name(ball), ball["core_type_ja"], f"{ball['catalog_rg_low_in']:.3f}",
        f"{ball['catalog_total_diff_in']:.3f}", f"{ball['catalog_intermediate_diff_in']:.3f}" if ball["catalog_intermediate_diff_in"] else "-"
    ])
draw_table(c, M, 700, [255, 58, 58, 64, 64], table_rows, [29] + [34] * 6, [8.4] + [7.6] * 6)
draw_scatter(c, M, 150, PW - 2 * M, 280, DATA["balls"])
draw_paragraph(c, "右へ行くほどRGが大きく、上へ行くほどディファレンシャルRGが大きい。グラフはコアの物理値を比較するもので、レーン上の曲がり幅ではない。", M, 132, PW - 2 * M, 9.6, 1.42)
c.showPage()

# 7 PIN-PAP
header(c, 7, "PIN-PAP距離の基本傾向と例外")
for i, (file, label) in enumerate([
    ("model-pin-15-hires.png", "1.5 in"), ("model-pin-35-hires.png", "3.5 in"), ("model-pin-55-hires.png", "5.5 in")
]):
    x = M + i * 175
    image_fit(c, IMG_DIR / file, x, 495, 160, 150)
    draw_centered(c, label, x, 477, 160, 10.5, TEAL)
pick_keys = ["storm-phaze-ii", "hammer-hammer-effect-tour", "hammer-purple-pearl-urethane"]
pick = [next(item for item in DATA["summary"] if item["key"] == key) for key in pick_keys]
x_values = [1, 2, 3, 3.5, 4, 5, 6]
series = [
    {"name": "Phaze II", "color": ORANGE, "values": [pick[0]["pin_pap_effective_flare_curve"][str(x)] for x in x_values]},
    {"name": "Effect Tour", "color": BLUE, "values": [pick[1]["pin_pap_effective_flare_curve"][str(x)] for x in x_values]},
    {"name": "Purple Urethane", "color": PURPLE, "values": [pick[2]["pin_pap_effective_flare_curve"][str(x)] for x in x_values]},
]
draw_line_chart(c, M, 190, PW - 2 * M, 260, series, x_values, 0.05, "PAP補正フレア指標（モデル独自）")
draw_paragraph(c, "6球中5球は3.5インチで最大になった。一方、元のディファレンシャルが極端に小さい球では穴あけの影響比率が大きく、距離だけでは判断できない。縦軸は曲がる板数ではない。", M, 165, PW - 2 * M, 9.8, 1.45)
c.showPage()

# 8 Drilling angle
header(c, 8, "ドリル角が変えるもの")
image_fit(c, IMG_DIR / "model-drill-20-hires.png", M, 397, 245, 280)
image_fit(c, IMG_DIR / "model-drill-80-hires.png", PW - M - 245, 397, 245, 280)
draw_centered(c, "20°", M, 378, 245, 12, ORANGE)
draw_centered(c, "80°", PW - M - 245, 378, 245, 12, ORANGE)
round_box(c, M, 218, PW - 2 * M, 122, ORANGE_SOFT, ORANGE, 12)
draw_paragraph(c, "ドリル角はPSA / MB側の向きを変え、グリップ穴がコアのどこを通るかにも影響する。非対称コアでは、完成球の中間RGとPSA方向が変わりやすい。", M + 18, 317, PW - 2 * M - 36, 11.5, 1.55)
draw_paragraph(c, "一次資料ではドリル角とVAL角の合計を、スキッドからフック、ロールへ移る速さの目安として扱う。ただし本モデルはレーン反応の時点を数値予測しない。", M, 176, PW - 2 * M, 10.2, 1.5)
c.showPage()

# 9 VAL angle
header(c, 9, "VAL角が変えるもの")
image_fit(c, IMG_DIR / "model-val-20-hires.png", M, 397, 245, 280)
image_fit(c, IMG_DIR / "model-val-70-hires.png", PW - M - 245, 397, 245, 280)
draw_centered(c, "20°", M, 378, 245, 12, BLUE)
draw_centered(c, "70°", PW - M - 245, 378, 245, 12, BLUE)
round_box(c, M, 218, PW - 2 * M, 122, BLUE_SOFT, BLUE, 12)
draw_paragraph(c, "VAL角はPIN-PAP線とVALの開きを変える。同じPIN-PAP距離でもPINとグリップ穴の位置関係が変わるため、穴あけ後の3方向RGは同じにならない。", M + 18, 317, PW - 2 * M - 36, 11.5, 1.55)
draw_paragraph(c, "VAL角だけでは判断しない。ドリル角、PIN-PAP、ボウラーのPAPを一組で確認する。", M, 176, PW - 2 * M, 10.2, 1.5)
c.showPage()

# 10 Interaction
header(c, 10, "3値の相互作用と実在ボールの差")
ion = next(x for x in DATA["summary"] if x["key"] == "storm-ion-max")
surge = next(x for x in DATA["summary"] if x["key"] == "storm-tropical-surge-black-cherry")
ref_keys = ["early_transition_reference", "neutral_reference", "late_transition_reference"]
labels = ["角度合計が小さい", "中央", "角度合計が大きい"]
table_rows = [["条件", "レイアウト", "Ion Max 指標", "Tropical Surge 指標", "読み取り"]]
for i, key in enumerate(ref_keys):
    a, b = ion["reference_layouts"][key], surge["reference_layouts"][key]
    table_rows.append([
        labels[i], f"{a['drill_angle_deg']}° × {a['pin_pap_in']:.1f} in × {a['val_angle_deg']}°",
        f"{a['effective_flare_diff_in']:.3f}", f"{b['effective_flare_diff_in']:.3f}",
        ["指標が大きい", "比較基準", "指標が小さい"][i]
    ])
draw_table(c, M, 685, [100, 150, 76, 92, 81], table_rows, [36, 54, 54, 54], [8.2, 8.0, 8.0, 8.0])
round_box(c, M, 338, PW - 2 * M, 128, TEAL_SOFT, TEAL, 12)
set_font(c, 14, TEAL); c.drawString(M + 18, 434, "同じレイアウトでも値の大きさは同じにならない")
draw_paragraph(c, "Ion Maxは高ディファレンシャルの非対称コア、Tropical Surgeは低ディファレンシャルの対称コア。3値は完成球の向きを変えるが、元のコアが持つ上限までは同じにしない。", M + 18, 410, PW - 2 * M - 36, 10.5, 1.48)
round_box(c, M, 175, PW - 2 * M, 128, ORANGE_SOFT, ORANGE, 12)
set_font(c, 14, ORANGE); c.drawString(M + 18, 271, "実在6球の比較で確認したこと")
draw_paragraph(c, "45° × 3.5 in × 45°のPAP補正フレア指標は約0.009から0.045まで広がった。レイアウトだけでなく、RGと2種類のディファレンシャルを先に読む必要がある。", M + 18, 247, PW - 2 * M - 36, 10.5, 1.48)
draw_paragraph(c, "表面とレーン摩擦はこの比較に含めていない。", M, 139, PW - 2 * M, 10.5, 1.45, PURPLE)
c.showPage()

# 11 Workflow
header(c, 11, "実務での確認順序")
steps = [
    ("1", "PAPを測る", "同じレイアウト値でも、PAPが違えば穴の位置は変わる。"),
    ("2", "重量別の公式値を読む", "RG、Diff. RG、Int. Diff.、コア区分を確認する。"),
    ("3", "3値を一組で決める", "ドリル角、PIN-PAP、VAL角を同時に記録する。"),
    ("4", "穴あけ後を再計算する", "穴径、穴深さ、グリップを含めて3方向RGを確認する。"),
    ("5", "レーン条件を重ねる", "カバー、表面、速度、回転数、オイル条件を加えて判断する。"),
]
for i, (num, title, body) in enumerate(steps):
    y = 588 - i * 105
    c.setFillColor(TEAL if i < 3 else BLUE); c.circle(M + 20, y + 32, 17, stroke=0, fill=1)
    set_font(c, 12, WHITE); c.drawCentredString(M + 20, y + 28, num)
    set_font(c, 13.5, INK); c.drawString(M + 52, y + 44, title)
    draw_paragraph(c, body, M + 52, y + 25, PW - 2 * M - 52, 9.8, 1.45)
    if i < 4:
        c.setStrokeColor(LINE); c.line(M + 52, y - 8, PW - M, y - 8)
round_box(c, M, 64, PW - 2 * M, 72, INK, INK, 10)
draw_centered(c, "数値の大小だけで選ばず、根拠を順番に積み上げる。", M, 89, PW - 2 * M, 12, WHITE)
c.showPage()

# 12 Sources and definitions
header(c, 12, "用語、検証条件、一次資料")
section_label(c, "用語の統一", M, 696, TEAL)
defs = [
    "RG：Radius of Gyration。慣性半径。",
    "ディファレンシャルRG：最大RG - 最小RG。",
    "インターミディエイト・ディファレンシャル：最大RG - 中間RG。",
    "PAP：Positive Axis Point。投球直後の回転軸と表面の交点。",
    "VAL：Vertical Axis Line。PAPを通るレイアウト基準線。",
    "PAP補正フレア指標：完成球の慣性テンソルとPAP軸から求める本モデル独自の比較指標。"
]
y = 675
for text in defs:
    set_font(c, 8.8, INK); c.drawString(M + 6, y, "•")
    y = draw_paragraph(c, text, M + 20, y + 2, PW - 2 * M - 20, 8.8, 1.38)
    y -= 4
section_label(c, "実在ボール検証", M, y - 8, ORANGE)
y -= 34
y = draw_paragraph(c, "メーカー公式15ポンド値を入力し、PAP、グリップ、穴径、穴深さを固定。ドリル角20° / 45° / 70°、PIN-PAP 1 / 2 / 3 / 3.5 / 4 / 5 / 6インチ、VAL角20° / 45° / 70°の63条件を各球で計算した。6球合計378条件。", M, y, PW - 2 * M, 8.8, 1.4)
y -= 14
section_label(c, "一次資料", M, y, BLUE)
y -= 22
sources = [
    ("USBC Equipment Specifications Manual", "https://bowl.com/getmedia/7b8b2ee2-cd3a-4fe1-ba31-1389d8fc9bbf/es_manual.pdf"),
    ("USBC Ball Motion Study", "https://images.bowl.com/bowl/media/legacy/uploadedfiles/Equip_and_Specs/Equip_and_Specs_Home/08ballmotionstudy.pdf"),
    ("Maurice Pinel, Updated Dual Angle Guide", "https://wiki.maverickbowling.com/wiki/images/a/a5/Updated_Dual_Angle_Guide.pdf"),
    ("Storm Pin Buffer Layout Guide", "https://www.stormbowling.com/storm-pin-buffer-layout-guide"),
    ("Storm Ion Max 公式製品ページ", "https://www.stormbowling.com/storm-ion-max-bowling-ball"),
    ("Storm Phaze II 公式テックシート", "https://www.stormbowling.com/medias/Storm_Phaze%20II_tech%20sheet.pdf"),
    ("Storm Tropical Surge 公式製品ページ", "https://www.stormbowling.com/storm-tropical-surge-bowling-ball-black-cherry"),
    ("Hammer Black Widow 3.0 公式製品ページ", "https://hammerbowling.com/products/black-widow-3-0"),
    ("Hammer Effect Tour 公式製品ページ", "https://hammerbowling.com/products/hammer-effect-tour"),
    ("Hammer Purple Pearl Urethane 公式製品ページ", "https://hammerbowling.com/collections/mide-performance/products/purple-pearl-urethane"),
]
for label, url in sources:
    set_font(c, 8.2, INK); c.drawString(M + 6, y, "•")
    draw_link_line(c, label, url, M + 20, y, 8.2)
    y -= 15
round_box(c, M, 54, PW - 2 * M, 60, PURPLE_SOFT, PURPLE, 9)
draw_paragraph(c, "本資料は静的慣性値の理解を目的とする。ドリル作業と最終レイアウトの決定は、ボウラー本人のPAPを測定したうえで、資格と経験のあるプロショップ担当者が行う。", M + 14, 99, PW - 2 * M - 28, 8.8, 1.4)
c.showPage()

c.save()
print(json.dumps({"output": str(OUT), "pages": 12}, ensure_ascii=False))

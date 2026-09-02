from pathlib import Path
import re

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle
)

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "outputs" / "FLARE_PHYSICS_TECHNICAL_NOTE.md"
OUTPUT = ROOT / "output" / "pdf" / "bowling_flare_physics_technical_note.pdf"
FONT = ROOT / "outputs" / "fonts" / "noto-serif-jp" / "NotoSerifJP-wght.ttf"

pdfmetrics.registerFont(TTFont("NotoJP", str(FONT)))

PAGE_W, PAGE_H = A4
NAVY = colors.HexColor("#12323A")
TEAL = colors.HexColor("#168C8C")
PALE = colors.HexColor("#EAF5F3")
INK = colors.HexColor("#172126")
MUTED = colors.HexColor("#516169")

styles = getSampleStyleSheet()
body = ParagraphStyle("BodyJP", parent=styles["BodyText"], fontName="NotoJP", fontSize=9.2,
                      leading=15, textColor=INK, spaceAfter=5)
h1 = ParagraphStyle("H1JP", parent=styles["Title"], fontName="NotoJP", fontSize=22,
                    leading=30, alignment=TA_CENTER, textColor=NAVY, spaceAfter=10)
h2 = ParagraphStyle("H2JP", parent=styles["Heading2"], fontName="NotoJP", fontSize=14,
                    leading=20, textColor=NAVY, spaceBefore=10, spaceAfter=6)
h3 = ParagraphStyle("H3JP", parent=styles["Heading3"], fontName="NotoJP", fontSize=11,
                    leading=16, textColor=TEAL, spaceBefore=7, spaceAfter=4)
small = ParagraphStyle("SmallJP", parent=body, fontSize=7.5, leading=11, textColor=MUTED)
code = ParagraphStyle("CodeJP", parent=body, fontName="NotoJP", fontSize=8.2, leading=13,
                      leftIndent=8, rightIndent=8, backColor=colors.HexColor("#F2F6F6"),
                      borderColor=colors.HexColor("#B9D4D0"), borderWidth=.5, borderPadding=6)
bullet = ParagraphStyle("BulletJP", parent=body, leftIndent=12, firstLineIndent=-7, bulletIndent=3)
formula = ParagraphStyle("FormulaJP", parent=body, fontName="NotoJP", fontSize=12,
                         leading=19, alignment=TA_CENTER, textColor=INK,
                         backColor=colors.HexColor("#F2F6F6"),
                         borderColor=colors.HexColor("#B9D4D0"), borderWidth=.5,
                         borderPadding=7, spaceBefore=3, spaceAfter=3)


def esc(text):
    return (text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;"))


def footer(canvas, doc):
    canvas.saveState()
    canvas.setStrokeColor(colors.HexColor("#B8CECA"))
    canvas.line(18 * mm, 14 * mm, PAGE_W - 18 * mm, 14 * mm)
    canvas.setFont("NotoJP", 7)
    canvas.setFillColor(MUTED)
    canvas.drawString(18 * mm, 9 * mm, "PAP・軸移動・オイルフレア技術資料")
    canvas.drawRightString(PAGE_W - 18 * mm, 9 * mm, f"{doc.page}")
    canvas.restoreState()


FORMULA_DISPLAY = {
    r"M' = M - \sum_h m_h": "M′ = M − Σ<sub>h</sub> m<sub>h</sub>",
    r"\boldsymbol{c} = -\frac{\sum_h m_h\boldsymbol{r}_h}{M'}":
        "<b>c</b> = −(Σ<sub>h</sub> m<sub>h</sub><b>r</b><sub>h</sub>) / M′",
    r"\mathbf{I}' = \mathbf{I}_{\mathrm{blank}}-\sum_h\mathbf{I}_h-M'\left(\lVert\boldsymbol{c}\rVert^2\mathbf{E}-\boldsymbol{c}\boldsymbol{c}^{\mathsf T}\right)":
        "<b>I</b>′ = <b>I</b><sub>blank</sub> − Σ<sub>h</sub><b>I</b><sub>h</sub> − M′(‖<b>c</b>‖<super>2</super><b>E</b> − <b>c c</b><super>T</super>)",
    r"RG_i=\sqrt{\frac{I_i}{M'}}": "RG<sub>i</sub> = √(I<sub>i</sub> / M′)",
    r"\lVert\boldsymbol{r}\rVert=R,\qquad \boldsymbol{u}_0\cdot\boldsymbol{r}=0":
        "‖<b>r</b>‖ = R,　<b>u</b><sub>0</sub> · <b>r</b> = 0",
    r"\boldsymbol{\omega}(0)=\frac{2\pi\,\mathrm{rpm}}{60}\boldsymbol{u}_0":
        "<b>ω</b>(0) = (2π rpm / 60)<b>u</b><sub>0</sub>",
    r"\frac{d\omega_1}{dt}=\frac{(I_2-I_3)\omega_2\omega_3}{I_1}":
        "dω<sub>1</sub>/dt = (I<sub>2</sub> − I<sub>3</sub>)ω<sub>2</sub>ω<sub>3</sub> / I<sub>1</sub>",
    r"\frac{d\omega_2}{dt}=\frac{(I_3-I_1)\omega_3\omega_1}{I_2}":
        "dω<sub>2</sub>/dt = (I<sub>3</sub> − I<sub>1</sub>)ω<sub>3</sub>ω<sub>1</sub> / I<sub>2</sub>",
    r"\frac{d\omega_3}{dt}=\frac{(I_1-I_2)\omega_1\omega_2}{I_3}":
        "dω<sub>3</sub>/dt = (I<sub>1</sub> − I<sub>2</sub>)ω<sub>1</sub>ω<sub>2</sub> / I<sub>3</sub>",
    r"s=R\Delta\theta": "s = RΔθ",
    r"v_{\mathrm{ft/s}}=v\frac{1000}{3600}\times 3.280839895":
        "v<sub>ft/s</sub> = v(1000 / 3600) × 3.280839895",
    r"t_{60}=\frac{60}{v_{\mathrm{ft/s}}}": "t<sub>60</sub> = 60 / v<sub>ft/s</sub>",
    r"N=\frac{\mathrm{rpm}}{60}t_{60}": "N = (rpm / 60)t<sub>60</sub>",
}


def formula_flowable(latex):
    display = FORMULA_DISPLAY.get(latex, esc(latex))
    return Paragraph(display, formula)


INLINE_DISPLAY = {
    r"\boldsymbol{u}_0": "<b>u</b><sub>0</sub>",
    r"\boldsymbol{c}": "<b>c</b>",
    r"\mathbf{I}'": "<b>I</b>′",
    r"I_1\le I_2\le I_3": "I<sub>1</sub> ≤ I<sub>2</sub> ≤ I<sub>3</sub>",
    r"R": "<i>R</i>",
    r"\Delta\theta": "Δθ",
    r"v": "<i>v</i>",
    r"v=R\omega": "<i>v</i> = <i>Rω</i>",
}


def inline_formula(match):
    latex = match.group(1)
    return INLINE_DISPLAY.get(latex, f"<i>{esc(latex)}</i>")


def rich_inline(text):
    cleaned = re.sub(r"`([^`]+)`", r"<b>\1</b>", esc(text))
    return re.sub(r"\$([^$]+)\$", inline_formula, cleaned)


def parse_markdown(text):
    lines = text.splitlines()
    story = []
    i = 0
    first_title = True
    formula_index = 0
    while i < len(lines):
        line = lines[i].rstrip()
        if not line:
            story.append(Spacer(1, 2.5 * mm))
            i += 1
            continue
        if line.startswith("```"):
            block = []
            i += 1
            while i < len(lines) and not lines[i].startswith("```"):
                block.append(lines[i])
                i += 1
            story.append(Paragraph("<br/>".join(esc(x).replace(" ", "&nbsp;") for x in block), code))
            i += 1
            continue
        if line == "$$":
            formula = []
            i += 1
            while i < len(lines) and lines[i].strip() != "$$":
                formula.append(lines[i].strip())
                i += 1
            formula_index += 1
            story.append(formula_flowable(" ".join(formula)))
            i += 1
            continue
        if line.startswith("| "):
            rows = []
            while i < len(lines) and lines[i].startswith("|"):
                cells = [c.strip() for c in lines[i].strip("|").split("|")]
                if not all(set(c) <= {"-", ":"} for c in cells):
                    rows.append([Paragraph(esc(c), body) for c in cells])
                i += 1
            table = Table(rows, colWidths=[55 * mm, 55 * mm], hAlign="LEFT")
            table.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), NAVY), ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, -1), "NotoJP"), ("FONTSIZE", (0, 0), (-1, -1), 8.5),
                ("GRID", (0, 0), (-1, -1), .4, colors.HexColor("#AFC8C4")),
                ("BACKGROUND", (0, 1), (-1, -1), PALE), ("ALIGN", (0, 1), (-1, -1), "RIGHT"),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"), ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ]))
            story.append(table)
            continue
        if line.startswith("# "):
            if not first_title:
                story.append(PageBreak())
            story.append(Spacer(1, 12 * mm))
            story.append(Paragraph(esc(line[2:]), h1))
            first_title = False
        elif line.startswith("## "):
            story.append(Paragraph(esc(line[3:]), h2))
        elif line.startswith("### "):
            story.append(Paragraph(esc(line[4:]), h3))
        elif re.match(r"^\d+\. ", line):
            story.append(Paragraph(rich_inline(line), bullet))
        elif line.startswith("- "):
            story.append(Paragraph("• " + rich_inline(line[2:]), bullet))
        elif re.match(r"^https?://", line.strip()):
            url = line.strip()
            story.append(Paragraph(f'<link href="{esc(url)}" color="#168C8C">{esc(url)}</link>', small))
        else:
            story.append(Paragraph(rich_inline(line), body))
        i += 1
    return story


def main():
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    doc = SimpleDocTemplate(str(OUTPUT), pagesize=A4, rightMargin=18 * mm, leftMargin=18 * mm,
                            topMargin=18 * mm, bottomMargin=20 * mm,
                            title="ボウリングボールのPAP・軸移動・オイルフレア技術資料",
                            author="Drill-3D-Model")
    story = parse_markdown(SOURCE.read_text(encoding="utf-8"))
    doc.build(story, onFirstPage=footer, onLaterPages=footer)
    print(OUTPUT)


if __name__ == "__main__":
    main()

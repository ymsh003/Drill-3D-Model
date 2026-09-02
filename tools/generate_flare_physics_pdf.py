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
    SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle, KeepTogether
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


def parse_markdown(text):
    lines = text.splitlines()
    story = []
    i = 0
    first_title = True
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
            story.append(Paragraph(esc(line), bullet))
        elif line.startswith("- "):
            story.append(Paragraph("• " + esc(line[2:]), bullet))
        elif re.match(r"^https?://", line.strip()):
            url = line.strip()
            story.append(Paragraph(f'<link href="{esc(url)}" color="#168C8C">{esc(url)}</link>', small))
        else:
            cleaned = re.sub(r"`([^`]+)`", r"<b>\1</b>", esc(line))
            story.append(Paragraph(cleaned, body))
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

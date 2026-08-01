from html import escape
from pathlib import Path
import re

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Image, PageBreak, Paragraph, SimpleDocTemplate, Spacer


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "docs" / "generate-play-store-guide.ps1"
OUTPUT = ROOT / "docs" / "Heritage-Diagnostics-Play-Store-Complete-Guide.pdf"
ICON = ROOT / "store-assets" / "play-store" / "app-icon-512.png"

font_path = Path(r"C:\Windows\Fonts\arial.ttf")
bold_path = Path(r"C:\Windows\Fonts\arialbd.ttf")
if font_path.exists() and bold_path.exists():
    pdfmetrics.registerFont(TTFont("Guide", str(font_path)))
    pdfmetrics.registerFont(TTFont("GuideBold", str(bold_path)))
    regular, bold = "Guide", "GuideBold"
else:
    regular, bold = "Helvetica", "Helvetica-Bold"

maroon = colors.HexColor("#741321")
gold = colors.HexColor("#B8872D")
cream = colors.HexColor("#F7F1E8")
text_color = colors.HexColor("#332B28")

styles = getSampleStyleSheet()
title_style = ParagraphStyle("Title", parent=styles["Title"], fontName=bold, fontSize=24,
                             leading=29, textColor=maroon, alignment=TA_CENTER, spaceAfter=5 * mm)
subtitle_style = ParagraphStyle("Subtitle", parent=styles["Normal"], fontName=regular,
                                fontSize=11, leading=15, textColor=text_color,
                                alignment=TA_CENTER, spaceAfter=7 * mm)
heading_style = ParagraphStyle("Heading", parent=styles["Heading1"], fontName=bold,
                               fontSize=15, leading=19, textColor=maroon,
                               spaceBefore=7 * mm, spaceAfter=3 * mm, keepWithNext=True)
body_style = ParagraphStyle("Body", parent=styles["BodyText"], fontName=regular,
                            fontSize=9.6, leading=14, textColor=text_color, spaceAfter=2.4 * mm)
check_style = ParagraphStyle("Check", parent=body_style, leftIndent=7 * mm,
                             firstLineIndent=-5 * mm, bulletIndent=0)


def rich_text(value: str) -> str:
    safe = escape(value)
    return re.sub(
        r"(https://[^\s<]+)",
        lambda match: f'<link href="{match.group(1)}" color="#A9363C">{match.group(1)}</link>',
        safe,
    )


def footer(canvas, document):
    canvas.saveState()
    canvas.setStrokeColor(gold)
    canvas.line(18 * mm, 14 * mm, 192 * mm, 14 * mm)
    canvas.setFont(regular, 8)
    canvas.setFillColor(colors.HexColor("#706762"))
    canvas.drawString(18 * mm, 9 * mm, "Heritage Diagnostics - Google Play Publishing Guide")
    canvas.drawRightString(192 * mm, 9 * mm, f"Page {document.page}")
    canvas.restoreState()


story = []
if ICON.exists():
    icon = Image(str(ICON), width=25 * mm, height=25 * mm)
    icon.hAlign = "CENTER"
    story.extend([icon, Spacer(1, 3 * mm)])
story.append(Paragraph("Heritage Diagnostics", title_style))
story.append(Paragraph("Google Play Store: Starting-to-Production Complete Guide", subtitle_style))
story.append(Paragraph("Version 1.2 (Code 3) | Updated 1 August 2026", subtitle_style))

started = False
pattern = re.compile(r"^\s*Add-(Heading|Text|Check)(?:\(|\s+)'(.+)'(?:,\s*(\d+))?\)?\s*$")
for line in SOURCE.read_text(encoding="utf-8").splitlines():
    if line.strip() == "try {":
        started = True
        continue
    if not started:
        continue
    match = pattern.match(line)
    if not match:
        continue
    kind, value, _level = match.groups()
    if kind == "Heading":
        story.append(Paragraph(rich_text(value), heading_style))
    elif kind == "Check":
        story.append(Paragraph("[ ] " + rich_text(value), check_style))
    else:
        story.append(Paragraph(rich_text(value), body_style))

story.extend([
    Spacer(1, 5 * mm),
    Paragraph("Final reminder", heading_style),
    Paragraph(
        "Play Console mein APK upload nahi karna hai. Signed app-release.aab upload karein. "
        "APK sirf real Android phone par final testing ke liye hai. Backend live rakhein and "
        "reviewer credentials submission ke dauran working rakhein.", body_style,
    ),
])

document = SimpleDocTemplate(
    str(OUTPUT), pagesize=A4, rightMargin=18 * mm, leftMargin=18 * mm,
    topMargin=16 * mm, bottomMargin=19 * mm, title="Heritage Diagnostics Play Store Guide",
    author="Heritage Diagnostics",
)
document.build(story, onFirstPage=footer, onLaterPages=footer)
print(OUTPUT)

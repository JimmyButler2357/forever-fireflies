"""Generate a one-page financial summary PDF for Core Memories."""

from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.lib.colors import HexColor
from reportlab.platypus import (
    SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
)
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT
import os

OUTPUT = os.path.join(os.path.dirname(__file__), "Core-Memories-Financial-Summary.pdf")

# -- Colors --
BLACK = HexColor("#1A1A1A")
WARM_WHITE = HexColor("#FFFFFF")
HEADER_BG = HexColor("#2C2420")
ROW_ALT = HexColor("#F5EDE4")
HIGHLIGHT_ROW = HexColor("#EDE0D0")
GRID_COLOR = HexColor("#D9CFC4")
ACCENT_LINE = HexColor("#4A7C59")

# -- Styles (single text color throughout) --
title_style = ParagraphStyle(
    "Title", fontName="Helvetica-Bold", fontSize=16,
    textColor=BLACK, alignment=TA_LEFT, spaceAfter=4, leading=20
)
subtitle_style = ParagraphStyle(
    "Subtitle", fontName="Helvetica", fontSize=8.5,
    textColor=BLACK, alignment=TA_LEFT, spaceAfter=6
)
section_style = ParagraphStyle(
    "Section", fontName="Helvetica-Bold", fontSize=10,
    textColor=BLACK, spaceBefore=8, spaceAfter=3
)
body_style = ParagraphStyle(
    "Body", fontName="Helvetica", fontSize=8,
    textColor=BLACK, leading=11, spaceAfter=2
)
note_style = ParagraphStyle(
    "Note", fontName="Helvetica-Oblique", fontSize=7,
    textColor=BLACK, leading=9, spaceAfter=1
)
footer_style = ParagraphStyle(
    "Footer", fontName="Helvetica-Oblique", fontSize=7,
    textColor=BLACK, alignment=TA_CENTER
)

# -- Helpers --
def hdr(text):
    return Paragraph(f"<b>{text}</b>", ParagraphStyle(
        "TH", fontName="Helvetica-Bold", fontSize=7.5,
        textColor=WARM_WHITE, alignment=TA_LEFT
    ))

def cell(text, bold=False):
    fn = "Helvetica-Bold" if bold else "Helvetica"
    return Paragraph(
        f"<b>{text}</b>" if bold else text,
        ParagraphStyle("TD", fontName=fn,
                       fontSize=7.5, textColor=BLACK, leading=9.5)
    )

def rcell(text, bold=False):
    fn = "Helvetica-Bold" if bold else "Helvetica"
    return Paragraph(
        f"<b>{text}</b>" if bold else text,
        ParagraphStyle("TDR", fontName=fn,
                       fontSize=7.5, textColor=BLACK, leading=9.5, alignment=TA_RIGHT)
    )


def build():
    doc = SimpleDocTemplate(
        OUTPUT, pagesize=letter,
        leftMargin=0.6*inch, rightMargin=0.6*inch,
        topMargin=0.5*inch, bottomMargin=0.4*inch
    )
    story = []

    # ---- Title ----
    story.append(Paragraph("Core Memories — Financial Overview", title_style))
    story.append(Paragraph("Parenting journal app  |  Subscription model  |  iOS + Android", subtitle_style))

    # ---- Section 1: Monthly Costs ----
    story.append(Paragraph("Monthly Operating Costs", section_style))

    cost_data = [
        [hdr("Item"), hdr("Cost"), hdr("What It Does"), hdr("At Scale (10K+ Users)")],
        [cell("Supabase Pro"), rcell("$25/mo"), cell("Database, auth, file storage — the app's entire backend"), cell("Grows with users ($75–500+/mo)")],
        [cell("Apple Developer"), rcell("$8/mo"), cell("Required license to publish on the App Store"), cell("Fixed ($99/yr always)")],
        [cell("Domain"), rcell("~$1/mo"), cell("Website address for landing page & legal docs"), cell("Fixed (~$12/yr)")],
        [cell("Termly"), rcell("$10/mo"), cell("Auto-generates privacy policy & terms of service"), cell("Fixed")],
        [cell("Google Workspace"), rcell("$7/mo"), cell("Business email (support@yourdomain.com)"), cell("Fixed (or +$7 per seat)")],
        [cell("RevenueCat"), rcell("Free"), cell("Manages subscriptions, paywalls, and trials"), cell("1% of revenue after $2.5K/mo")],
        [cell("PostHog"), rcell("Free"), cell("User analytics — tracks funnels, engagement, retention"), cell("Paid after 1M events/mo")],
        [cell("Expo EAS"), rcell("Free"), cell("Builds and deploys the app to App Store"), cell("Paid for heavy build usage")],
        [cell("Framer"), rcell("Free"), cell("Landing page / marketing website (no-code)"), cell("May need $5–15/mo tier")],
        [cell("Total", bold=True), rcell("~$55/mo", bold=True), cell("~$660/year", bold=True), cell("Est. $150–600+/mo", bold=True)],
    ]

    col_widths = [1.1*inch, 0.7*inch, 2.8*inch, 2.2*inch]
    cost_table = Table(cost_data, colWidths=col_widths, repeatRows=1)

    base_style = [
        # Header row
        ("BACKGROUND", (0, 0), (-1, 0), HEADER_BG),
        ("TEXTCOLOR", (0, 0), (-1, 0), WARM_WHITE),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        # Grid
        ("GRID", (0, 0), (-1, -1), 0.5, GRID_COLOR),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        # Totals row
        ("BACKGROUND", (0, -1), (-1, -1), HIGHLIGHT_ROW),
        ("LINEABOVE", (0, -1), (-1, -1), 1.5, BLACK),
    ]
    # Alternating row colors
    for i in range(1, len(cost_data) - 1):
        if i % 2 == 0:
            base_style.append(("BACKGROUND", (0, i), (-1, i), ROW_ALT))

    cost_table.setStyle(TableStyle(base_style))
    story.append(cost_table)

    # ---- Section 2: Revenue Model ----
    story.append(Paragraph("Revenue Model", section_style))
    story.append(Paragraph(
        "<b>Monthly plan:</b> $5.99/mo — after Apple's 15% cut → <b>$5.09/mo net per subscriber</b><br/>"
        "<b>Annual plan:</b> $49.99/yr — after Apple's 15% cut → <b>$42.49/yr ($3.54/mo) net per subscriber</b><br/>"
        "Apple's cut is 15% (not the usual 30%) via the <b>Small Business Program</b> for developers earning under $1M/yr.",
        body_style
    ))
    story.append(Paragraph(
        "Conversion: ~10–20% of downloads become paying subscribers (industry benchmark for subscription apps).",
        note_style
    ))

    # ---- Section 3: Revenue Milestones ----
    story.append(Paragraph("Revenue Milestones", section_style))

    mile_data = [
        [hdr("Milestone"), hdr("Paying Subs"), hdr("Monthly Net"), hdr("Annual Net"), hdr("Downloads Needed")],
        [cell("Break even"), rcell("13"), rcell("$66"), rcell("$795"), rcell("~90")],
        [cell("Side income"), rcell("300"), rcell("$1,527"), rcell("$18,330"), rcell("~2,000")],
        [cell("Part-time viable"), rcell("750"), rcell("$3,818"), rcell("$45,810"), rcell("~5,000")],
        [cell("Full-time salary", bold=True),
         rcell("2,456", bold=True),
         rcell("$12,500", bold=True),
         rcell("$150,000", bold=True),
         rcell("~16,400", bold=True)],
        [cell("Comfortable + hire"), rcell("4,000"), rcell("$20,360"), rcell("$244,320"), rcell("~26,700")],
        [cell("Real business"), rcell("8,000"), rcell("$40,720"), rcell("$488,640"), rcell("~53,300")],
    ]

    mile_widths = [1.4*inch, 0.95*inch, 1.1*inch, 1.1*inch, 1.3*inch]
    mile_table = Table(mile_data, colWidths=mile_widths, repeatRows=1)

    mile_style = [
        ("BACKGROUND", (0, 0), (-1, 0), HEADER_BG),
        ("TEXTCOLOR", (0, 0), (-1, 0), WARM_WHITE),
        ("GRID", (0, 0), (-1, -1), 0.5, GRID_COLOR),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        # Highlight the full-time row
        ("BACKGROUND", (0, 4), (-1, 4), HIGHLIGHT_ROW),
        ("LINEABOVE", (0, 4), (-1, 4), 1.2, ACCENT_LINE),
        ("LINEBELOW", (0, 4), (-1, 4), 1.2, ACCENT_LINE),
    ]
    for i in range(1, len(mile_data)):
        if i % 2 == 0 and i != 4:
            mile_style.append(("BACKGROUND", (0, i), (-1, i), ROW_ALT))

    mile_table.setStyle(TableStyle(mile_style))
    story.append(mile_table)

    story.append(Paragraph(
        "Downloads needed assumes 15% download-to-paid conversion. "
        "All revenue figures are net (after Apple's 15% commission).",
        note_style
    ))

    # ---- Section 4: One-time costs ----
    story.append(Paragraph("One-Time Pre-Launch Costs", section_style))

    onetime_data = [
        [hdr("Item"), hdr("Cost"), hdr("What It Is")],
        [cell("LLC formation"), rcell("$50–500"), cell("Legal entity that protects personal assets from business liability")],
        [cell("COPPA legal opinion"), rcell("$500–1,000"), cell("Lawyer confirms the app is compliant with children's privacy law")],
        [cell("Trademark filing"), rcell("$275–400"), cell("Registers the app name so no one else can use it")],
        [cell("App Store screenshots"), rcell("$0–49"), cell("Mockup tool (Rotato) for professional store listing images")],
        [cell("Total", bold=True), rcell("~$825–1,950", bold=True), cell("One-time investment before/around launch", bold=True)],
    ]

    onetime_widths = [1.4*inch, 0.9*inch, 4.5*inch]
    onetime_table = Table(onetime_data, colWidths=onetime_widths, repeatRows=1)

    onetime_style = [
        ("BACKGROUND", (0, 0), (-1, 0), HEADER_BG),
        ("TEXTCOLOR", (0, 0), (-1, 0), WARM_WHITE),
        ("GRID", (0, 0), (-1, -1), 0.5, GRID_COLOR),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("BACKGROUND", (0, -1), (-1, -1), HIGHLIGHT_ROW),
        ("LINEABOVE", (0, -1), (-1, -1), 1.5, BLACK),
    ]
    for i in range(1, len(onetime_data) - 1):
        if i % 2 == 0:
            onetime_style.append(("BACKGROUND", (0, i), (-1, i), ROW_ALT))

    onetime_table.setStyle(TableStyle(onetime_style))
    story.append(onetime_table)

    # ---- Key Takeaways & Future Considerations (combined to save space) ----
    compact_section = ParagraphStyle(
        "SectionCompact", fontName="Helvetica-Bold", fontSize=10,
        textColor=BLACK, spaceBefore=6, spaceAfter=2
    )
    story.append(Paragraph("Key Takeaways", compact_section))
    story.append(Paragraph(
        "1. <b>Low overhead</b> — ~$55/mo at launch, break even at just 13 subscribers.<br/>"
        "2. <b>$150K target</b> — ~2,456 paying subs (~16,400 downloads at 15% conversion).<br/>"
        "3. <b>Tax planning</b> — set aside 25–30% of all revenue for income + self-employment tax.",
        ParagraphStyle("Takeaway", fontName="Helvetica", fontSize=7.5,
                       textColor=BLACK, leading=10, spaceAfter=1)
    ))

    story.append(Paragraph("Future Considerations", compact_section))
    story.append(Paragraph(
        "<b>Marketing spend:</b> Budget $150–300/mo for Apple Search Ads starting month 4+. "
        "At ~$1–3 per install and 15% conversion, each paying subscriber costs ~$7–20 to acquire (CAC). "
        "Target LTV of at least 3x CAC.<br/>"
        "<b>Annual pricing review:</b> Current annual plan ($49.99/yr vs $5.99/mo = $71.88/yr) is a 30% discount — "
        "industry standard is 15–20%. Consider A/B testing $54.99/yr (~23% off) via RevenueCat Experiments.<br/>"
        "<b>Ongoing costs at scale:</b> Add Apple Search Ads, tax prep ($200–500/yr), "
        "and support contractor ($500–1K/mo at 10K+ users) to budget.",
        ParagraphStyle("Future", fontName="Helvetica", fontSize=7.5,
                       textColor=BLACK, leading=9.5, spaceAfter=0)
    ))

    # ---- Footer ----
    story.append(Spacer(1, 3))
    story.append(Paragraph("Core Memories — Confidential Financial Summary — February 2026", footer_style))

    doc.build(story)
    print(f"PDF saved to: {OUTPUT}")


if __name__ == "__main__":
    build()

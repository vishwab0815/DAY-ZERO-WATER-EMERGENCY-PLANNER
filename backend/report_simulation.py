"""
Personalized Household Water Crisis Assessment Report.
generate_simulation_pdf(data) -> bytes
"""
import io
from datetime import date, timedelta
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, PageBreak, KeepTogether
)

# ── Palette ───────────────────────────────────────────────────────────────────
WHITE   = colors.HexColor("#ffffff")
LIGHT   = colors.HexColor("#f9fafb")
LIGHT2  = colors.HexColor("#f3f4f6")
BORDER  = colors.HexColor("#e5e7eb")
DARK    = colors.HexColor("#111827")
MID     = colors.HexColor("#374151")
MUTED   = colors.HexColor("#6b7280")

TEAL    = colors.HexColor("#0d9488")
TEAL_LT = colors.HexColor("#ccfbf1")
GREEN   = colors.HexColor("#059669")
GREEN_LT= colors.HexColor("#d1fae5")
AMBER   = colors.HexColor("#d97706")
AMBER_LT= colors.HexColor("#fef3c7")
ORANGE  = colors.HexColor("#ea580c")
RED     = colors.HexColor("#dc2626")
RED_LT  = colors.HexColor("#fee2e2")
DRED    = colors.HexColor("#7f1d1d")
BLUE    = colors.HexColor("#0284c7")
BLUE_LT = colors.HexColor("#e0f2fe")
PURPLE  = colors.HexColor("#7c3aed")

CRISIS_COLOR = {
    "safe":     GREEN,
    "watch":    BLUE,
    "warning":  AMBER,
    "critical": RED,
    "zero":     DRED,
}
CRISIS_BG = {
    "safe":     GREEN_LT,
    "watch":    BLUE_LT,
    "warning":  AMBER_LT,
    "critical": RED_LT,
    "zero":     colors.HexColor("#fca5a5"),
}
CRISIS_LABEL = {
    "safe":     "SAFE",
    "watch":    "WATCH",
    "warning":  "WARNING",
    "critical": "CRITICAL",
    "zero":     "DAY ZERO",
}

PAGE_W, PAGE_H = A4
MARGIN = 18 * mm
CW = PAGE_W - 2 * MARGIN   # content width


# ── Page frame ────────────────────────────────────────────────────────────────
def _draw_page(c, doc):
    crisis = getattr(doc, "_crisis_level", "safe")
    cc = CRISIS_COLOR.get(crisis, TEAL)
    c.saveState()
    w, h = A4
    # Header bar
    c.setFillColor(DARK)
    c.rect(0, h - 12*mm, w, 12*mm, fill=1, stroke=0)
    c.setFillColor(cc)
    c.rect(0, h - 12*mm, 3*mm, 12*mm, fill=1, stroke=0)  # color stripe
    c.setFillColor(WHITE)
    c.setFont("Helvetica-Bold", 8.5)
    c.drawString(MARGIN + 2, h - 7.5*mm, "HOUSEHOLD WATER CRISIS ASSESSMENT REPORT")
    c.setFont("Helvetica", 7.5)
    c.drawRightString(w - MARGIN, h - 7.5*mm,
                      f"Generated: {date.today().strftime('%d %B %Y')}")
    # Footer
    c.setFillColor(DARK)
    c.rect(0, 0, w, 10*mm, fill=1, stroke=0)
    c.setFillColor(colors.HexColor("#9ca3af"))
    c.setFont("Helvetica", 7)
    c.drawString(MARGIN, 3.5*mm, "CONFIDENTIAL — For household emergency planning use only")
    if doc.page > 1:
        c.drawRightString(w - MARGIN, 3.5*mm, f"Page {doc.page}")
    # Thin rule under header
    c.setStrokeColor(cc)
    c.setLineWidth(1.5)
    c.line(0, h - 12*mm, w, h - 12*mm)
    c.restoreState()


# ── Style sheet ───────────────────────────────────────────────────────────────
def _styles():
    s = {}
    s['title'] = ParagraphStyle('title',
        fontName='Helvetica-Bold', fontSize=28, textColor=DARK,
        alignment=TA_CENTER, spaceAfter=4, leading=34)
    s['subtitle'] = ParagraphStyle('subtitle',
        fontName='Helvetica', fontSize=11, textColor=MID,
        alignment=TA_CENTER, spaceAfter=3, leading=16)
    s['h1'] = ParagraphStyle('h1',
        fontName='Helvetica-Bold', fontSize=14, textColor=DARK,
        spaceBefore=6, spaceAfter=4, leading=18)
    s['h2'] = ParagraphStyle('h2',
        fontName='Helvetica-Bold', fontSize=11, textColor=TEAL,
        spaceBefore=5, spaceAfter=3, leading=15)
    s['h3'] = ParagraphStyle('h3',
        fontName='Helvetica-Bold', fontSize=9.5, textColor=MID,
        spaceBefore=3, spaceAfter=2, leading=13)
    s['body'] = ParagraphStyle('body',
        fontName='Helvetica', fontSize=9.5, textColor=MID,
        spaceAfter=3, leading=14)
    s['small'] = ParagraphStyle('small',
        fontName='Helvetica', fontSize=8, textColor=MUTED,
        spaceAfter=2, leading=11)
    s['mono'] = ParagraphStyle('mono',
        fontName='Courier', fontSize=8.5, textColor=TEAL,
        spaceAfter=2, leading=12,
        backColor=colors.HexColor("#f0fdf4"), borderPad=4)
    s['label'] = ParagraphStyle('label',
        fontName='Helvetica-Bold', fontSize=7.5, textColor=MUTED,
        spaceAfter=1, leading=10, letterSpacing=0.8)
    s['number'] = ParagraphStyle('number',
        fontName='Helvetica-Bold', fontSize=36, textColor=DARK,
        alignment=TA_CENTER, leading=40)
    s['number_sub'] = ParagraphStyle('number_sub',
        fontName='Helvetica', fontSize=9, textColor=MUTED,
        alignment=TA_CENTER, leading=12)
    s['bullet'] = ParagraphStyle('bullet',
        fontName='Helvetica', fontSize=9.5, textColor=MID,
        spaceAfter=3, leading=14, leftIndent=12, bulletIndent=2, bulletText='•')
    s['caption'] = ParagraphStyle('caption',
        fontName='Helvetica-Oblique', fontSize=8, textColor=MUTED,
        alignment=TA_CENTER, spaceAfter=2, leading=11)
    return s


def _hr(color=BORDER, thick=0.5):
    return HRFlowable(width="100%", thickness=thick, color=color,
                      spaceAfter=5, spaceBefore=5)


def _section(title, s, color=TEAL):
    return KeepTogether([
        Paragraph(title, s['h1']),
        HRFlowable(width="100%", thickness=2, color=color,
                   spaceAfter=6, spaceBefore=0),
    ])


def _stat_card(label, value, unit, color, bg, s):
    """Single stat card for the cover grid."""
    inner = Table([
        [Paragraph(label.upper(), s['label'])],
        [Paragraph(str(value), ParagraphStyle('sv',
            fontName='Helvetica-Bold', fontSize=28, textColor=color,
            alignment=TA_CENTER, leading=32))],
        [Paragraph(unit, s['number_sub'])],
    ], colWidths=[CW/4 - 4*mm])
    inner.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), bg),
        ('BOX',        (0,0), (-1,-1), 1.2, color),
        ('TOPPADDING', (0,0), (-1,-1), 7),
        ('BOTTOMPADDING', (0,0), (-1,-1), 7),
        ('LEFTPADDING', (0,0), (-1,-1), 4),
        ('RIGHTPADDING', (0,0), (-1,-1), 4),
        ('ALIGN',      (0,0), (-1,-1), 'CENTER'),
        ('VALIGN',     (0,0), (-1,-1), 'MIDDLE'),
    ]))
    return inner


def _bar(pct, width_mm, filled_color, empty_color=colors.HexColor("#e5e7eb"), height_mm=7):
    pct = max(0.0, min(1.0, pct))
    filled = max(1, pct * width_mm * mm)
    empty  = max(0, width_mm * mm - filled)
    cols = [filled] if empty == 0 else [filled, empty] if filled > 0 else [width_mm * mm]
    row  = [['']] if empty == 0 else [['', '']] if filled > 0 else [['']]
    tbl = Table(row, colWidths=cols, rowHeights=[height_mm * mm])
    cmds = [
        ('TOPPADDING',    (0,0), (-1,-1), 0),
        ('BOTTOMPADDING', (0,0), (-1,-1), 0),
        ('LEFTPADDING',   (0,0), (-1,-1), 0),
        ('RIGHTPADDING',  (0,0), (-1,-1), 0),
        ('BACKGROUND',    (0,0), (0,0),  filled_color),
    ]
    if empty > 0:
        cmds.append(('BACKGROUND', (1,0), (1,0), empty_color))
    tbl.setStyle(TableStyle(cmds))
    return tbl


def _risk_row(label, pct, color, s, bar_w=100):
    """A labeled progress-bar row."""
    pct_txt = f"{pct:.0f}%"
    return Table([[
        Paragraph(label, s['h3']),
        _bar(pct/100, bar_w, color),
        Paragraph(pct_txt, ParagraphStyle('rv',
            fontName='Helvetica-Bold', fontSize=10, textColor=color,
            alignment=TA_RIGHT, leading=12)),
    ]], colWidths=[45*mm, bar_w*mm, 14*mm])


# ── Main generator ────────────────────────────────────────────────────────────
def generate_simulation_pdf(data: dict) -> bytes:
    buf = io.BytesIO()

    crisis   = data.get("crisis_level", "safe")
    city     = data.get("city", "Your City")
    members  = data.get("members", 2)
    cc       = CRISIS_COLOR.get(crisis, TEAL)
    cb       = CRISIS_BG.get(crisis,   LIGHT)
    cl       = CRISIS_LABEL.get(crisis, crisis.upper())

    days_remaining   = int(data.get("days_remaining", 0))
    storage_pct      = float(data.get("storage_pct", 0))
    total_storage    = float(data.get("total_storage", 0))
    daily_use        = float(data.get("daily_consumption", 0))
    prep_score       = float(data.get("prep_score", 0))
    live_temp        = data.get("live_temp")
    mc               = data.get("mc") or {}
    health           = data.get("health") or {}
    strategy         = data.get("strategy_comparison") or {}
    consumption      = data.get("consumption") or {}
    alternatives     = data.get("alternatives") or []
    forecast         = data.get("forecast_7d") or []
    rationing        = data.get("rationing_level", "none")
    household_members= data.get("member_breakdown") or []

    depletion_date = (date.today() + timedelta(days=days_remaining)).strftime("%d %B %Y")

    doc = SimpleDocTemplate(
        buf, pagesize=A4,
        leftMargin=MARGIN, rightMargin=MARGIN,
        topMargin=15*mm, bottomMargin=13*mm,
        title="Water Crisis Assessment Report",
    )
    doc._crisis_level = crisis

    S = _styles()
    story = []

    # ═══════════════════════════════════════════════════════════════════════════
    # PAGE 1 — COVER + EXECUTIVE SUMMARY
    # ═══════════════════════════════════════════════════════════════════════════
    story += [
        Spacer(1, 8*mm),
        Paragraph("WATER CRISIS ASSESSMENT", S['title']),
        Paragraph("Household Emergency Situation Report", S['subtitle']),
        Spacer(1, 2*mm),
        _hr(cc, 2),
        Spacer(1, 2*mm),
    ]

    # City + crisis badge row
    badge_tbl = Table([[
        Paragraph(f"Location: <b>{city}</b>", S['body']),
        Table([[
            Paragraph(cl, ParagraphStyle('badge',
                fontName='Helvetica-Bold', fontSize=14, textColor=WHITE,
                alignment=TA_CENTER, leading=18)),
        ]], colWidths=[38*mm], rowHeights=[10*mm]),
        Paragraph(f"Report Date: <b>{date.today().strftime('%d %B %Y')}</b>", S['body']),
    ]], colWidths=[CW*0.38, 40*mm, CW*0.38])
    badge_tbl.setStyle(TableStyle([
        ('ALIGN',     (0,0), (0,0), 'LEFT'),
        ('ALIGN',     (1,0), (1,0), 'CENTER'),
        ('ALIGN',     (2,0), (2,0), 'RIGHT'),
        ('VALIGN',    (0,0), (-1,-1), 'MIDDLE'),
        ('BACKGROUND',(1,0), (1,0), cc),
        ('BOX',       (1,0), (1,0), 0, WHITE),
        ('TOPPADDING',(0,0), (-1,-1), 4),
        ('BOTTOMPADDING',(0,0), (-1,-1), 4),
    ]))
    story += [badge_tbl, Spacer(1, 5*mm)]

    # 4 stat cards
    prep_color = GREEN if prep_score >= 70 else AMBER if prep_score >= 40 else RED
    cards = [
        _stat_card("Days Remaining", days_remaining, "days of supply left", cc, cb, S),
        _stat_card("Storage Left", f"{storage_pct:.0f}%", f"{total_storage*(storage_pct/100):.0f}L of {total_storage:.0f}L", cc, cb, S),
        _stat_card("Daily Usage", f"{daily_use:.0f}L", f"for {members} people", TEAL, TEAL_LT, S),
        _stat_card("Prep Score", f"{prep_score:.0f}", "/100 preparedness", prep_color, GREEN_LT if prep_score >= 70 else AMBER_LT if prep_score >= 40 else RED_LT, S),
    ]
    cards_tbl = Table([cards], colWidths=[CW/4 - 1*mm]*4, spaceBefore=2)
    cards_tbl.setStyle(TableStyle([
        ('LEFTPADDING',  (0,0), (-1,-1), 2),
        ('RIGHTPADDING', (0,0), (-1,-1), 2),
        ('TOPPADDING',   (0,0), (-1,-1), 0),
        ('BOTTOMPADDING',(0,0), (-1,-1), 0),
    ]))
    story += [cards_tbl, Spacer(1, 5*mm)]

    # Situation summary paragraph
    crisis_text = {
        "safe":     "The household currently has an adequate water supply. Continue monitoring and build further reserves.",
        "watch":    "Water supply is beginning to tighten. Implement mild conservation measures now.",
        "warning":  "Supply is significantly reduced. Immediate rationing and alternative sourcing is required.",
        "critical": "CRITICAL: Days from running dry. Emergency measures must be activated now.",
        "zero":     "WATER HAS RUN OUT. Immediate emergency sourcing is the only priority.",
    }.get(crisis, "")

    proj_note = ""
    if mc.get("median"):
        proj_note = (f" Monte Carlo modelling projects a median of <b>{mc['median']:.0f} days</b> "
                     f"(50% confidence: {mc.get('p25',0):.0f}–{mc.get('p75',0):.0f} days).")

    story += [
        Table([[Paragraph(
            f"<b>SITUATION SUMMARY:</b> {crisis_text}{proj_note} "
            f"At current usage of <b>{daily_use:.1f}L/day</b>, supplies are projected to reach zero "
            f"around <b>{depletion_date}</b>.",
            S['body']
        )]], colWidths=[CW]),
    ]
    story[-1].setStyle(TableStyle([
        ('BACKGROUND',    (0,0), (-1,-1), cb),
        ('BOX',           (0,0), (-1,-1), 1.2, cc),
        ('LEFTPADDING',   (0,0), (-1,-1), 10),
        ('RIGHTPADDING',  (0,0), (-1,-1), 10),
        ('TOPPADDING',    (0,0), (-1,-1), 8),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
    ]))

    story += [Spacer(1, 4*mm)]

    # Household profile row
    member_str = ", ".join(
        f"{m.get('count',1)} {m.get('type','adult')}{'s' if m.get('count',1)>1 else ''}"
        for m in household_members
    ) if household_members else f"{members} people"

    temp_str = f"{live_temp}°C (live)" if live_temp else "N/A"
    ration_labels = {"none":"None","mild":"Mild","moderate":"Moderate","severe":"Severe","survival":"Survival"}

    profile_rows = [
        [Paragraph("HOUSEHOLD", S['label']), Paragraph(member_str, S['body']),
         Paragraph("RATIONING", S['label']), Paragraph(ration_labels.get(rationing, rationing), S['body'])],
        [Paragraph("LIVE TEMP", S['label']), Paragraph(temp_str, S['body']),
         Paragraph("SURVIVAL FLOOR", S['label']), Paragraph(f"{data.get('survival_floor',0):.1f}L/day minimum", S['body'])],
    ]
    prof_tbl = Table(profile_rows, colWidths=[28*mm, CW/2-28*mm, 28*mm, CW/2-28*mm])
    prof_tbl.setStyle(TableStyle([
        ('BACKGROUND',    (0,0), (-1,-1), LIGHT),
        ('BOX',           (0,0), (-1,-1), 0.6, BORDER),
        ('LINEBELOW',     (0,0), (-1,-2), 0.3, BORDER),
        ('LINEAFTER',     (1,0), (1,-1), 0.3, BORDER),
        ('TOPPADDING',    (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING',   (0,0), (-1,-1), 7),
    ]))
    story += [prof_tbl]

    story.append(PageBreak())

    # ═══════════════════════════════════════════════════════════════════════════
    # PAGE 2 — SUPPLY ANALYSIS + MONTE CARLO
    # ═══════════════════════════════════════════════════════════════════════════
    story += [_section("SUPPLY ANALYSIS & PROJECTIONS", S, cc)]

    # Timeline bar — storage remaining
    story += [
        Paragraph("Current Water Storage", S['h2']),
        Spacer(1, 1*mm),
        _bar(storage_pct / 100, int(CW / mm), cc, colors.HexColor("#e5e7eb"), height_mm=9),
        Table([[
            Paragraph(f"{storage_pct:.1f}% remaining", S['small']),
            Paragraph(f"{total_storage*(storage_pct/100):.0f}L of {total_storage:.0f}L",
                      ParagraphStyle('rv2', fontName='Helvetica-Bold', fontSize=9,
                                     textColor=cc, alignment=TA_RIGHT, leading=11)),
        ]], colWidths=[CW/2, CW/2]),
        Spacer(1, 5*mm),
    ]

    # Depletion date callout
    deplete_tbl = Table([[
        Table([[
            Paragraph("PROJECTED DEPLETION DATE", S['label']),
            Paragraph(depletion_date, ParagraphStyle('dep',
                fontName='Helvetica-Bold', fontSize=20, textColor=cc,
                alignment=TA_CENTER, leading=24)),
            Paragraph(f"If usage remains at {daily_use:.0f}L/day with no changes", S['caption']),
        ]], colWidths=[CW*0.5 - 5*mm]),
        Table([[
            Paragraph("DAYS REMAINING", S['label']),
            Paragraph(str(days_remaining), ParagraphStyle('drc',
                fontName='Helvetica-Bold', fontSize=40, textColor=cc,
                alignment=TA_CENTER, leading=44)),
            Paragraph("days of water supply", S['caption']),
        ]], colWidths=[CW*0.5 - 5*mm]),
    ]], colWidths=[CW*0.5, CW*0.5])
    deplete_tbl.setStyle(TableStyle([
        ('BACKGROUND',    (0,0), (-1,-1), cb),
        ('BOX',           (0,0), (-1,-1), 1.2, cc),
        ('LINEAFTER',     (0,0), (0,-1), 0.5, cc),
        ('TOPPADDING',    (0,0), (-1,-1), 8),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ('LEFTPADDING',   (0,0), (-1,-1), 10),
        ('RIGHTPADDING',  (0,0), (-1,-1), 10),
        ('ALIGN',         (0,0), (-1,-1), 'CENTER'),
        ('VALIGN',        (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story += [deplete_tbl, Spacer(1, 5*mm)]

    # Monte Carlo table
    if mc:
        story += [Paragraph("Monte Carlo Probability Analysis (300 simulations)", S['h2'])]
        mc_header = [
            Paragraph("Percentile", S['label']),
            Paragraph("Days Remaining", S['label']),
            Paragraph("Depletion Date", S['label']),
            Paragraph("Interpretation", S['label']),
        ]
        mc_rows = [
            ("5th  (Worst case)",  mc.get("p5",0),  "Critical — plan for this"),
            ("25th (Likely low)",  mc.get("p25",0), "Conservative estimate"),
            ("50th (Median)",      mc.get("median",0), "Most probable outcome"),
            ("75th (Likely high)", mc.get("p75",0), "Optimistic estimate"),
            ("95th (Best case)",   mc.get("p95",0), "Best-case scenario"),
        ]
        mc_data = [mc_header]
        for label, days_val, interp in mc_rows:
            d = int(days_val)
            dep = (date.today() + timedelta(days=d)).strftime("%d %b")
            mc_data.append([
                Paragraph(label, S['body']),
                Paragraph(f"<b>{d}</b> days", S['body']),
                Paragraph(dep, S['body']),
                Paragraph(interp, S['body']),
            ])
        mc_tbl = Table(mc_data, colWidths=[45*mm, 32*mm, 30*mm, CW-107*mm])
        mc_tbl.setStyle(TableStyle([
            ('BACKGROUND',    (0,0), (-1,0), DARK),
            ('TEXTCOLOR',     (0,0), (-1,0), WHITE),
            ('FONTNAME',      (0,0), (-1,0), 'Helvetica-Bold'),
            ('FONTSIZE',      (0,0), (-1,0), 8),
            ('BACKGROUND',    (0,3), (-1,3), cb),  # median row highlight
            ('FONTNAME',      (0,3), (-1,3), 'Helvetica-Bold'),
            ('ROWBACKGROUNDS',(0,1), (-1,-1), [LIGHT, WHITE]),
            ('BOX',           (0,0), (-1,-1), 0.8, BORDER),
            ('LINEBELOW',     (0,0), (-1,-2), 0.3, BORDER),
            ('TOPPADDING',    (0,0), (-1,-1), 5),
            ('BOTTOMPADDING', (0,0), (-1,-1), 5),
            ('LEFTPADDING',   (0,0), (-1,-1), 7),
            ('FONTSIZE',      (0,1), (-1,-1), 9),
            ('TEXTCOLOR',     (0,1), (-1,-1), MID),
        ]))
        story += [mc_tbl, Spacer(1, 2*mm)]
        story += [Paragraph(
            f"Statistical uncertainty: std deviation = {mc.get('std',0):.1f} days. "
            f"There is a <b>50% probability</b> the supply will last between "
            f"<b>{mc.get('p25',0):.0f}</b> and <b>{mc.get('p75',0):.0f} days</b>.",
            S['small'])]

    story.append(PageBreak())

    # ═══════════════════════════════════════════════════════════════════════════
    # PAGE 3 — HEALTH RISK ASSESSMENT
    # ═══════════════════════════════════════════════════════════════════════════
    story += [_section("HEALTH RISK ASSESSMENT", S, RED)]

    dehyd  = float(health.get("dehydration_risk", 0)) * 100
    ill    = float(health.get("illness_risk", 0)) * 100
    hyg    = float(health.get("hygiene_score", 100))
    floor  = float(health.get("survival_floor_liters", 3.0))

    def _risk_color(pct):
        if pct >= 75: return RED
        if pct >= 50: return ORANGE
        if pct >= 25: return AMBER
        return GREEN

    def _hyg_color(pct):
        if pct >= 70: return GREEN
        if pct >= 45: return AMBER
        return RED

    story += [
        Paragraph("Current Health Indicators", S['h2']),
        Spacer(1, 2*mm),
    ]

    bar_w = int((CW - 59*mm - 14*mm) / mm)
    risk_rows = [
        ("Dehydration Risk", dehyd, _risk_color(dehyd), "Risk of dehydration symptoms based on current intake"),
        ("Illness Risk",     ill,   _risk_color(ill),   "Cumulative waterborne illness exposure risk"),
        ("Hygiene Score",    hyg,   _hyg_color(hyg),    "Sanitation & hygiene maintenance level (higher = better)"),
    ]

    for label, pct, color, desc in risk_rows:
        row_tbl = Table([[
            Paragraph(label, S['h3']),
            _bar(pct/100, bar_w, color),
            Paragraph(f"<b>{pct:.0f}%</b>", ParagraphStyle('pv',
                fontName='Helvetica-Bold', fontSize=11, textColor=color,
                alignment=TA_RIGHT, leading=14)),
        ]], colWidths=[48*mm, bar_w*mm, 16*mm])
        story += [row_tbl,
                  Paragraph(desc, S['small']),
                  Spacer(1, 3*mm)]

    story += [Spacer(1, 2*mm)]

    # Survival floor callout
    per_person = floor / members if members else floor
    floor_tbl = Table([[
        Paragraph("SURVIVAL FLOOR", S['label']),
        Paragraph(f"{floor:.1f}L/day total", ParagraphStyle('ft',
            fontName='Helvetica-Bold', fontSize=18, textColor=RED, leading=22)),
        Paragraph(f"({per_person:.1f}L per person/day minimum for survival)", S['body']),
    ]], colWidths=[32*mm, 40*mm, CW-72*mm])
    floor_tbl.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), RED_LT),
        ('BOX',        (0,0), (-1,-1), 1.2, RED),
        ('TOPPADDING', (0,0), (-1,-1), 7),
        ('BOTTOMPADDING', (0,0), (-1,-1), 7),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('VALIGN',     (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story += [floor_tbl, Spacer(1, 5*mm)]

    # Health impact timeline
    story += [Paragraph("Projected Health Impact if No Action Taken", S['h2'])]
    impact_days = [
        (1,  3,  "Mild thirst, reduced urine output, early fatigue"),
        (3,  7,  "Moderate dehydration, hygiene deterioration, gastrointestinal risk"),
        (7,  14, "Significant health stress, skin/urinary infections, cognitive impairment"),
        (14, 21, "Severe dehydration risk, high illness probability, hospital-level care needed"),
        (21, None, "Critical survival threshold — life-threatening without external water supply"),
    ]
    hi_data = [[
        Paragraph("Days from Now", S['label']),
        Paragraph("Anticipated Health Impact", S['label']),
        Paragraph("Risk Level", S['label']),
    ]]
    risk_lvls = [GREEN, AMBER, ORANGE, RED, DRED]
    risk_names = ["LOW", "MODERATE", "HIGH", "SEVERE", "CRITICAL"]
    for i, (d1, d2, desc) in enumerate(impact_days):
        day_str = f"Day {d1}–{d2}" if d2 else f"Day {d1}+"
        lvl_color = risk_lvls[i]
        lvl_name  = risk_names[i]
        hi_data.append([
            Paragraph(day_str, S['body']),
            Paragraph(desc,    S['body']),
            Paragraph(f"<b>{lvl_name}</b>", ParagraphStyle('rl',
                fontName='Helvetica-Bold', fontSize=9,
                textColor=lvl_color, alignment=TA_CENTER, leading=12)),
        ])
    hi_tbl = Table(hi_data, colWidths=[28*mm, CW-64*mm, 32*mm])
    hi_tbl.setStyle(TableStyle([
        ('BACKGROUND',    (0,0), (-1,0), DARK),
        ('TEXTCOLOR',     (0,0), (-1,0), WHITE),
        ('FONTNAME',      (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE',      (0,0), (-1,0), 8),
        ('ROWBACKGROUNDS',(0,1), (-1,-1), [LIGHT, WHITE]),
        ('BOX',           (0,0), (-1,-1), 0.8, BORDER),
        ('LINEBELOW',     (0,0), (-1,-2), 0.3, BORDER),
        ('TOPPADDING',    (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING',   (0,0), (-1,-1), 7),
        ('FONTSIZE',      (0,1), (-1,-1), 9),
        ('TEXTCOLOR',     (0,1), (-1,-1), MID),
        ('VALIGN',        (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story += [hi_tbl]

    story.append(PageBreak())

    # ═══════════════════════════════════════════════════════════════════════════
    # PAGE 4 — STRATEGY COMPARISON + RECOMMENDATIONS
    # ═══════════════════════════════════════════════════════════════════════════
    story += [_section("STRATEGY COMPARISON & RECOMMENDATIONS", S, AMBER)]

    story += [Paragraph("Rationing Strategy Impact", S['h2'])]

    strats = [
        ("none",     "No Change",        RED,   "Continue current usage — fastest depletion"),
        ("mild",     "Mild Rationing",   AMBER, "~25% reduction — small sacrifices, meaningful gain"),
        ("moderate", "Moderate",         TEAL,  "~45% reduction — significant but manageable"),
        ("severe",   "Severe Rationing", GREEN, "~60% reduction — survival mode, maximum extension"),
    ]

    # Find max days for bar scaling
    max_d = max((strategy.get(k, {}).get("days_until_zero", 0) for k, *_ in strats), default=30)
    if max_d == 0: max_d = 30

    strat_data = [[
        Paragraph("Strategy", S['label']),
        Paragraph("Days of Supply", S['label']),
        Paragraph("Visual (relative)", S['label']),
        Paragraph("Depletion Date", S['label']),
    ]]
    recommended_strat = None
    for key, label, color, note in strats:
        d = int(strategy.get(key, {}).get("days_until_zero", 0))
        dep = (date.today() + timedelta(days=d)).strftime("%d %b") if d > 0 else "Already zero"
        bar_pct = d / max_d if max_d else 0
        strat_data.append([
            Paragraph(f"<b>{label}</b><br/><font size='7' color='grey'>{note}</font>", S['body']),
            Paragraph(f"<b>{d}</b> days", ParagraphStyle('sd',
                fontName='Helvetica-Bold', fontSize=12, textColor=color, leading=15)),
            _bar(bar_pct, int((CW - 90*mm) / mm), color, height_mm=8),
            Paragraph(dep, S['body']),
        ])
        if d > days_remaining and recommended_strat is None:
            recommended_strat = label

    strat_tbl = Table(strat_data, colWidths=[50*mm, 24*mm, CW - 98*mm, 22*mm])
    strat_tbl.setStyle(TableStyle([
        ('BACKGROUND',    (0,0), (-1,0), DARK),
        ('TEXTCOLOR',     (0,0), (-1,0), WHITE),
        ('FONTNAME',      (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE',      (0,0), (-1,0), 8),
        ('ROWBACKGROUNDS',(0,1), (-1,-1), [LIGHT, WHITE]),
        ('BOX',           (0,0), (-1,-1), 0.8, BORDER),
        ('LINEBELOW',     (0,0), (-1,-2), 0.3, BORDER),
        ('TOPPADDING',    (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('LEFTPADDING',   (0,0), (-1,-1), 7),
        ('VALIGN',        (0,0), (-1,-1), 'MIDDLE'),
        ('FONTSIZE',      (0,1), (-1,-1), 9),
        ('TEXTCOLOR',     (0,1), (-1,-1), MID),
    ]))
    story += [strat_tbl, Spacer(1, 3*mm)]

    if recommended_strat:
        rec_tbl = Table([[Paragraph(
            f"RECOMMENDATION: Switch to <b>{recommended_strat}</b> rationing immediately "
            f"to significantly extend your supply window.",
            S['body'])]], colWidths=[CW])
        rec_tbl.setStyle(TableStyle([
            ('BACKGROUND',    (0,0), (-1,-1), GREEN_LT),
            ('BOX',           (0,0), (-1,-1), 1.2, GREEN),
            ('TOPPADDING',    (0,0), (-1,-1), 8),
            ('BOTTOMPADDING', (0,0), (-1,-1), 8),
            ('LEFTPADDING',   (0,0), (-1,-1), 10),
        ]))
        story += [rec_tbl, Spacer(1, 4*mm)]

    # Action Plan
    story += [Paragraph("Emergency Action Plan", S['h2'])]
    immediate = {
        "safe":     ["Check all storage containers for leaks", "Record baseline daily usage",
                     "Identify nearest water ATM / RO shop"],
        "watch":    ["Begin mild rationing immediately", "Fill all available storage containers",
                     "Identify tanker suppliers in your area"],
        "warning":  ["Switch to moderate rationing today", "Order a tanker NOW (costs spike at crisis)",
                     "Collect all recyclable water (AC condensate, RO waste)", "Stock sealed 20L bottles"],
        "critical": ["Activate severe rationing — toilet flushing with greywater only",
                     "Call CMWSSB / municipal water helpline immediately",
                     "Emergency tanker booking required today",
                     "Move to 3L/person/day strict survival protocol"],
        "zero":     ["EMERGENCY: Source water by any means — neighbours, community tank, tanker",
                     "Boil or purify ALL non-sealed water before consumption",
                     "Contact local government disaster management cell",
                     "Prioritise drinking water for vulnerable members first"],
    }
    for i, action in enumerate(immediate.get(crisis, []), 1):
        story.append(Paragraph(f"{i}. {action}", S['bullet']))

    story += [Spacer(1, 4*mm)]

    # Alternatives table
    if alternatives:
        story += [Paragraph("Available Alternative Water Sources", S['h2'])]
        alt_data = [[
            Paragraph("Source", S['label']),
            Paragraph("Volume", S['label']),
            Paragraph("Cost", S['label']),
            Paragraph("Quality", S['label']),
            Paragraph("Notes", S['label']),
        ]]
        for alt in alternatives[:6]:
            qual_color = GREEN if alt.get("potable") else AMBER
            alt_data.append([
                Paragraph(f"<b>{alt.get('title','')}</b>", S['body']),
                Paragraph(f"{alt.get('liters',0):.0f}L", S['body']),
                Paragraph(f"Rs.{alt.get('cost_inr',0):.0f}", S['body']),
                Paragraph(alt.get('quality','—'), ParagraphStyle('qc',
                    fontName='Helvetica-Bold', fontSize=9, textColor=qual_color, leading=12)),
                Paragraph(alt.get('notes','')[:60], S['small']),
            ])
        alt_tbl = Table(alt_data, colWidths=[38*mm, 18*mm, 18*mm, 22*mm, CW-96*mm])
        alt_tbl.setStyle(TableStyle([
            ('BACKGROUND',    (0,0), (-1,0), DARK),
            ('TEXTCOLOR',     (0,0), (-1,0), WHITE),
            ('FONTNAME',      (0,0), (-1,0), 'Helvetica-Bold'),
            ('FONTSIZE',      (0,0), (-1,0), 8),
            ('ROWBACKGROUNDS',(0,1), (-1,-1), [LIGHT, WHITE]),
            ('BOX',           (0,0), (-1,-1), 0.8, BORDER),
            ('LINEBELOW',     (0,0), (-1,-2), 0.3, BORDER),
            ('TOPPADDING',    (0,0), (-1,-1), 5),
            ('BOTTOMPADDING', (0,0), (-1,-1), 5),
            ('LEFTPADDING',   (0,0), (-1,-1), 6),
            ('FONTSIZE',      (0,1), (-1,-1), 9),
            ('TEXTCOLOR',     (0,1), (-1,-1), MID),
            ('VALIGN',        (0,0), (-1,-1), 'MIDDLE'),
        ]))
        story += [alt_tbl]

    story.append(PageBreak())

    # ═══════════════════════════════════════════════════════════════════════════
    # PAGE 5 — CONSUMPTION BREAKDOWN + FORECAST
    # ═══════════════════════════════════════════════════════════════════════════
    story += [_section("CONSUMPTION ANALYSIS", S, TEAL)]

    if consumption:
        story += [Paragraph("Daily Water Usage Breakdown", S['h2'])]
        total_c = float(consumption.get("total", daily_use) or daily_use)
        cats = [
            ("Drinking",        consumption.get("drinking", 0)),
            ("Cooking",         consumption.get("cooking", 0)),
            ("Bathing/Hygiene", consumption.get("bathing", 0)),
            ("Toilet",          consumption.get("toilet", 0)),
            ("Handwashing",     consumption.get("handwashing", 0)),
            ("Laundry",         consumption.get("laundry", 0)),
            ("Vessel Washing",  consumption.get("vessel_washing", 0)),
        ]
        cats = [(n, float(v)) for n, v in cats if v and float(v) > 0]
        cons_colors = [TEAL, GREEN, BLUE, AMBER, ORANGE, PURPLE, RED]
        cons_data = [[
            Paragraph("Category", S['label']),
            Paragraph("Litres/Day", S['label']),
            Paragraph("Share", S['label']),
            Paragraph("Visual", S['label']),
        ]]
        for i, (name, val) in enumerate(cats):
            pct = val / total_c if total_c else 0
            color = cons_colors[i % len(cons_colors)]
            cons_data.append([
                Paragraph(name, S['body']),
                Paragraph(f"<b>{val:.1f}L</b>", S['body']),
                Paragraph(f"{pct*100:.0f}%", S['body']),
                _bar(pct, int((CW - 75*mm) / mm), color, height_mm=7),
            ])
        cons_data.append([
            Paragraph("<b>TOTAL</b>", S['h3']),
            Paragraph(f"<b>{total_c:.1f}L</b>", S['h3']),
            Paragraph("100%", S['body']),
            Paragraph("", S['body']),
        ])
        cons_tbl = Table(cons_data, colWidths=[38*mm, 22*mm, 15*mm, CW - 75*mm])
        cons_tbl.setStyle(TableStyle([
            ('BACKGROUND',    (0,0),  (-1, 0), DARK),
            ('TEXTCOLOR',     (0,0),  (-1, 0), WHITE),
            ('FONTNAME',      (0,0),  (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE',      (0,0),  (-1, 0), 8),
            ('BACKGROUND',    (0,-1), (-1,-1), LIGHT),
            ('LINEABOVE',     (0,-1), (-1,-1), 1.0, BORDER),
            ('ROWBACKGROUNDS',(0,1),  (-1,-2), [LIGHT, WHITE]),
            ('BOX',           (0,0),  (-1,-1), 0.8, BORDER),
            ('LINEBELOW',     (0,0),  (-1,-2), 0.3, BORDER),
            ('TOPPADDING',    (0,0),  (-1,-1), 5),
            ('BOTTOMPADDING', (0,0),  (-1,-1), 5),
            ('LEFTPADDING',   (0,0),  (-1,-1), 7),
            ('FONTSIZE',      (0,1),  (-1,-1), 9),
            ('TEXTCOLOR',     (0,1),  (-1,-2), MID),
            ('VALIGN',        (0,0),  (-1,-1), 'MIDDLE'),
        ]))
        story += [cons_tbl, Spacer(1, 3*mm)]
        story += [Paragraph(
            f"Per-person average: <b>{total_c/members:.1f}L/day</b>. "
            f"Survival minimum is <b>{data.get('survival_floor',0):.1f}L/day</b> total. "
            f"Current usage is <b>{(total_c/data.get('survival_floor',total_c))*100:.0f}%</b> of survival floor.",
            S['small'])]

    # 7-day forecast
    if forecast and len(forecast) >= 3:
        story += [Spacer(1, 5*mm), Paragraph("7-Day Temperature Forecast (Open-Meteo)", S['h2'])]
        forecast_data = [[
            Paragraph(f"Day {i+1}", S['label']) for i in range(min(7, len(forecast)))
        ], [
            Paragraph(f"<b>{t:.0f}°C</b>", ParagraphStyle('tmp',
                fontName='Helvetica-Bold', fontSize=11,
                textColor=RED if t > 38 else AMBER if t > 33 else TEAL,
                alignment=TA_CENTER, leading=14))
            for t in forecast[:7]
        ]]
        fcst_tbl = Table(forecast_data, colWidths=[CW/min(7,len(forecast))]*min(7,len(forecast)))
        fcst_tbl.setStyle(TableStyle([
            ('BACKGROUND',    (0,0), (-1,0), LIGHT),
            ('BACKGROUND',    (0,1), (-1,1), WHITE),
            ('BOX',           (0,0), (-1,-1), 0.6, BORDER),
            ('INNERGRID',     (0,0), (-1,-1), 0.3, BORDER),
            ('ALIGN',         (0,0), (-1,-1), 'CENTER'),
            ('TOPPADDING',    (0,0), (-1,-1), 5),
            ('BOTTOMPADDING', (0,0), (-1,-1), 5),
            ('FONTSIZE',      (0,0), (-1,-1), 9),
            ('TEXTCOLOR',     (0,0), (-1,0), MUTED),
        ]))
        story += [fcst_tbl,
                  Paragraph("High temperatures increase water consumption by ~0.5L/person/°C above 25°C.", S['small'])]

    # Footer note
    story += [
        Spacer(1, 6*mm),
        _hr(BORDER),
        Paragraph(
            f"This report was generated by Day Zero Water Emergency Planner on "
            f"{date.today().strftime('%d %B %Y')}. Projections are based on Monte Carlo simulation "
            f"(300 runs) and may vary with actual usage patterns, unexpected supply events, or "
            f"rainfall. This report is intended for household emergency planning purposes only.",
            S['caption']),
    ]

    doc.build(story, onFirstPage=_draw_page, onLaterPages=_draw_page)
    return buf.getvalue()

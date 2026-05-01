"""
Day Zero WEP — Project Report Generator
Run: python generate_report.py
Output: Day_Zero_WEP_Report.pdf
"""

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, PageBreak, KeepTogether
)
from reportlab.platypus.flowables import Flowable
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.pdfgen import canvas
from reportlab.platypus import BaseDocTemplate, Frame, PageTemplate
import os
from datetime import date

# ── Color palette ─────────────────────────────────────────────────────────────
TEAL       = colors.HexColor("#00c4ae")
TEAL_DIM   = colors.HexColor("#007a70")
AMBER      = colors.HexColor("#f59e0b")
DANGER     = colors.HexColor("#dc2626")
AI_PURPLE  = colors.HexColor("#a855f7")
BG_DARK    = colors.HexColor("#0d0906")
BG_SURFACE = colors.HexColor("#1e1710")
BG_PANEL   = colors.HexColor("#2a1f12")
BORDER     = colors.HexColor("#3d2d18")
TEXT_CREAM  = colors.HexColor("#f2e4c6")
TEXT_TAN    = colors.HexColor("#a08060")
TEXT_MUTED  = colors.HexColor("#5d4530")
WHITE      = colors.white
BLACK      = colors.black

PAGE_W, PAGE_H = A4
MARGIN = 18 * mm

OUTPUT = os.path.join(os.path.dirname(__file__), "Day_Zero_WEP_Report.pdf")


# ── Custom page canvas ────────────────────────────────────────────────────────
class ReportCanvas(canvas.Canvas):
    def __init__(self, filename, **kwargs):
        super().__init__(filename, **kwargs)
        self._page_num = 0

    def showPage(self):
        self._page_num += 1
        self.draw_page_frame()
        super().showPage()

    def draw_page_frame(self):
        w, h = A4
        # Dark background
        self.setFillColor(BG_DARK)
        self.rect(0, 0, w, h, fill=1, stroke=0)

        # Subtle warm grid dots
        self.setFillColor(colors.HexColor("#1e1710"))
        for x in range(0, int(w), 28):
            for y in range(0, int(h), 28):
                self.circle(x, y, 0.6, fill=1, stroke=0)

        # Top accent bar
        self.setFillColor(TEAL)
        self.rect(0, h - 4, w, 4, fill=1, stroke=0)

        # Bottom bar
        self.setFillColor(BG_SURFACE)
        self.rect(0, 0, w, 22, fill=1, stroke=0)

        # Page number
        if self._page_num > 1:
            self.setFont("Helvetica", 7)
            self.setFillColor(TEXT_MUTED)
            self.drawRightString(w - MARGIN, 8, f"Page {self._page_num}")
            self.drawString(MARGIN, 8, "Day Zero — Water Emergency Planner")

        # Left accent line
        self.setStrokeColor(BORDER)
        self.setLineWidth(0.4)
        self.line(MARGIN - 6, 30, MARGIN - 6, h - 10)


# ── Styles ────────────────────────────────────────────────────────────────────
def build_styles():
    s = {}

    s['cover_title'] = ParagraphStyle('cover_title',
        fontName='Helvetica-Bold', fontSize=38, textColor=TEAL,
        alignment=TA_CENTER, spaceAfter=4, leading=44)

    s['cover_sub'] = ParagraphStyle('cover_sub',
        fontName='Helvetica', fontSize=11, textColor=TEXT_TAN,
        alignment=TA_CENTER, spaceAfter=3, letterSpacing=4)

    s['cover_tagline'] = ParagraphStyle('cover_tagline',
        fontName='Helvetica', fontSize=10, textColor=TEXT_MUTED,
        alignment=TA_CENTER, spaceAfter=2, leading=15)

    s['cover_badge'] = ParagraphStyle('cover_badge',
        fontName='Helvetica-Bold', fontSize=8, textColor=TEAL,
        alignment=TA_CENTER)

    s['h1'] = ParagraphStyle('h1',
        fontName='Helvetica-Bold', fontSize=20, textColor=TEAL,
        spaceBefore=12, spaceAfter=6, leading=24)

    s['h2'] = ParagraphStyle('h2',
        fontName='Helvetica-Bold', fontSize=13, textColor=TEXT_CREAM,
        spaceBefore=10, spaceAfter=4, leading=17,
        borderPad=4)

    s['h3'] = ParagraphStyle('h3',
        fontName='Helvetica-Bold', fontSize=10, textColor=AMBER,
        spaceBefore=6, spaceAfter=2, leading=14)

    s['body'] = ParagraphStyle('body',
        fontName='Helvetica', fontSize=9, textColor=TEXT_TAN,
        spaceAfter=4, leading=14)

    s['body_cream'] = ParagraphStyle('body_cream',
        fontName='Helvetica', fontSize=9, textColor=TEXT_CREAM,
        spaceAfter=3, leading=14)

    s['code'] = ParagraphStyle('code',
        fontName='Courier', fontSize=8, textColor=TEAL,
        spaceAfter=2, leading=13,
        backColor=BG_PANEL, borderPad=4)

    s['code_cmd'] = ParagraphStyle('code_cmd',
        fontName='Courier-Bold', fontSize=9, textColor=colors.HexColor("#00e0d4"),
        spaceAfter=2, leading=14,
        backColor=BG_SURFACE, borderPad=6,
        leftIndent=6)

    s['bullet'] = ParagraphStyle('bullet',
        fontName='Helvetica', fontSize=9, textColor=TEXT_TAN,
        spaceAfter=2, leading=13, leftIndent=12,
        bulletIndent=4, bulletText='•')

    s['bullet_teal'] = ParagraphStyle('bullet_teal',
        fontName='Helvetica', fontSize=9, textColor=TEXT_CREAM,
        spaceAfter=2, leading=13, leftIndent=12,
        bulletIndent=4, bulletText='›')

    s['caption'] = ParagraphStyle('caption',
        fontName='Helvetica-Oblique', fontSize=7.5, textColor=TEXT_MUTED,
        spaceAfter=3, leading=11, alignment=TA_CENTER)

    s['label'] = ParagraphStyle('label',
        fontName='Helvetica-Bold', fontSize=7, textColor=TEAL,
        spaceAfter=0, leading=10, letterSpacing=1.5)

    s['section_note'] = ParagraphStyle('section_note',
        fontName='Helvetica-Oblique', fontSize=8, textColor=TEXT_MUTED,
        spaceAfter=4, leading=12)

    return s


# ── Helper Flowables ──────────────────────────────────────────────────────────
def divider(color=BORDER, thickness=0.4):
    return HRFlowable(width="100%", thickness=thickness, color=color, spaceAfter=6, spaceBefore=6)

def section_header(title: str, styles: dict, color=TEAL):
    return KeepTogether([
        Paragraph(title, styles['h1']),
        HRFlowable(width="100%", thickness=1.5, color=color, spaceAfter=8, spaceBefore=0),
    ])

def info_box(title: str, content: str, styles: dict, accent=TEAL):
    data = [[
        Paragraph(f'<font color="{accent.hexval()}">{title}</font>', styles['label']),
        Paragraph(content, styles['body']),
    ]]
    t = Table(data, colWidths=[35*mm, PAGE_W - 2*MARGIN - 35*mm])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), BG_PANEL),
        ('LINECOLOR',  (0,0), (-1,-1), BORDER),
        ('BOX',        (0,0), (-1,-1), 0.5, BORDER),
        ('LINEBEFORE', (1,0), (1,-1), 1.5, accent),
        ('VALIGN',     (0,0), (-1,-1), 'TOP'),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('LEFTPADDING', (0,0), (0,-1), 8),
        ('LEFTPADDING', (1,0), (1,-1), 10),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
    ]))
    return t

def cmd_block(cmd: str, styles: dict):
    return Paragraph(f'$ {cmd}', styles['code_cmd'])

def two_col_table(rows: list[tuple], styles: dict, ratio=(0.38, 0.62)):
    w1 = (PAGE_W - 2*MARGIN) * ratio[0]
    w2 = (PAGE_W - 2*MARGIN) * ratio[1]
    data = [[Paragraph(k, styles['label']), Paragraph(v, styles['body'])] for k, v in rows]
    t = Table(data, colWidths=[w1, w2])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (0,-1), BG_SURFACE),
        ('BACKGROUND', (1,0), (1,-1), BG_PANEL),
        ('TEXTCOLOR',  (0,0), (0,-1), TEAL),
        ('GRID',       (0,0), (-1,-1), 0.3, BORDER),
        ('VALIGN',     (0,0), (-1,-1), 'TOP'),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
    ]))
    return t

def feature_card(title: str, desc: str, badge: str, styles: dict, badge_color=TEAL):
    badge_hex = badge_color.hexval()
    data = [[
        Paragraph(f'<font color="{badge_hex}"><b>{badge}</b></font>', styles['label']),
        Paragraph(f'<b>{title}</b><br/>{desc}', styles['body_cream']),
    ]]
    t = Table(data, colWidths=[18*mm, PAGE_W - 2*MARGIN - 18*mm])
    t.setStyle(TableStyle([
        ('BACKGROUND',    (0,0), (-1,-1), BG_SURFACE),
        ('BOX',           (0,0), (-1,-1), 0.5, BORDER),
        ('LINEBEFORE',    (0,0), (0,-1), 3, badge_color),
        ('VALIGN',        (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING',    (0,0), (-1,-1), 7),
        ('BOTTOMPADDING', (0,0), (-1,-1), 7),
        ('LEFTPADDING',   (0,0), (0,-1), 8),
        ('LEFTPADDING',   (1,0), (1,-1), 10),
        ('RIGHTPADDING',  (0,0), (-1,-1), 8),
    ]))
    return t

def api_row(method: str, path: str, desc: str, styles: dict):
    method_color = {"GET": "#00c4ae", "POST": "#a855f7", "DELETE": "#dc2626"}.get(method, "#f59e0b")
    data = [[
        Paragraph(f'<font color="{method_color}"><b>{method}</b></font>', styles['label']),
        Paragraph(f'<font color="#00e0d4"><b>{path}</b></font>', styles['code']),
        Paragraph(desc, styles['body']),
    ]]
    w = PAGE_W - 2 * MARGIN
    t = Table(data, colWidths=[12*mm, w*0.38, w*0.52])
    t.setStyle(TableStyle([
        ('BACKGROUND',    (0,0), (-1,-1), BG_SURFACE),
        ('BOX',           (0,0), (-1,-1), 0.3, BORDER),
        ('GRID',          (0,0), (-1,-1), 0.2, BORDER),
        ('VALIGN',        (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING',    (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING',   (0,0), (-1,-1), 7),
        ('RIGHTPADDING',  (0,0), (-1,-1), 7),
    ]))
    return t


# ── Build Story ───────────────────────────────────────────────────────────────
def build_story(styles):
    story = []
    sp = lambda n=6: Spacer(1, n)

    # ══ COVER PAGE ══════════════════════════════════════════════════════════════
    story += [sp(55)]
    story.append(Paragraph("💧  DAY ZERO", styles['cover_title']))
    story.append(Paragraph("WATER EMERGENCY PLANNER", styles['cover_sub']))
    story += [sp(8)]
    story.append(Paragraph(
        "An advanced full-stack water crisis simulation platform with<br/>"
        "3D visualisation, live weather, Monte Carlo analysis, and Gemini AI.",
        styles['cover_tagline']))
    story += [sp(20)]

    # Badge row
    badges = [["React 19", "FastAPI", "Three.js", "Gemini 2.0", "Open-Meteo"]]
    bt = Table([badges[0]], colWidths=[30*mm]*5)
    bt.setStyle(TableStyle([
        ('BACKGROUND',    (0,0), (-1,-1), BG_SURFACE),
        ('BOX',           (0,0), (-1,-1), 0.5, TEAL),
        ('GRID',          (0,0), (-1,-1), 0.3, BORDER),
        ('TEXTCOLOR',     (0,0), (-1,-1), TEAL),
        ('FONTNAME',      (0,0), (-1,-1), 'Helvetica-Bold'),
        ('FONTSIZE',      (0,0), (-1,-1), 8),
        ('ALIGN',         (0,0), (-1,-1), 'CENTER'),
        ('TOPPADDING',    (0,0), (-1,-1), 7),
        ('BOTTOMPADDING', (0,0), (-1,-1), 7),
    ]))
    story.append(bt)
    story += [sp(30)]
    story.append(divider(TEAL, 1))
    story += [sp(6)]

    meta = [
        ("Generated", date.today().strftime("%d %B %Y")),
        ("Project path", "C:\\WATER\\Day0WEP"),
        ("Backend port", "8000  (FastAPI + Uvicorn)"),
        ("Frontend port", "5173  (Vite + React)"),
        ("Version", "2.1.0"),
    ]
    mt = two_col_table(meta, styles)
    story.append(mt)
    story.append(PageBreak())

    # ══ 1. OVERVIEW ═════════════════════════════════════════════════════════════
    story.append(section_header("1  What Is Day Zero WEP?", styles))
    story.append(Paragraph(
        "Day Zero WEP is a non-generic, advanced water crisis simulation tool designed for Indian households. "
        "It answers a critical question: <i>if your water supply stopped tomorrow, how long would you survive "
        "and what should you do right now?</i>",
        styles['body_cream']))
    story += [sp(6)]
    story.append(Paragraph(
        "The platform combines realistic daily consumption modelling, statistical Monte Carlo analysis, "
        "health risk curves, 3D visualisation, live weather data, and Gemini AI-powered advice into a single "
        "cohesive experience. It is city-aware (supporting any Indian city via geocoding), temperature-accurate "
        "(live data from Open-Meteo), and crisis-responsive (UI, colours, and AI advice all react to your "
        "storage level in real time).",
        styles['body']))
    story += [sp(10)]

    story.append(Paragraph("Core Problem Solved", styles['h3']))
    for item in [
        "Most water preparedness tools give generic advice. This one simulates <i>your specific household</i> — "
        "your storage containers, your family size, your daily habits, your city's temperature.",
        "It runs 300 Monte Carlo simulations per data point to give probabilistic survival estimates (not just a single number).",
        "It models cumulative health degradation — dehydration risk, illness compounding, hygiene collapse — over time.",
        "Live weather means the simulation reflects today's actual temperature, not a seasonal average.",
        "Gemini AI searches the web for current water news in your city before giving advice.",
    ]:
        story.append(Paragraph(item, styles['bullet']))
    story += [sp(10)]

    story.append(Paragraph("Who Is It For?", styles['h3']))
    story.append(Paragraph(
        "Any Indian household in a city that faces water scarcity (Chennai, Bengaluru, Delhi, Hyderabad, or any "
        "other city). It is especially useful during summer, drought conditions, or when municipal supply "
        "becomes unreliable.",
        styles['body']))
    story.append(PageBreak())

    # ══ 2. ARCHITECTURE ══════════════════════════════════════════════════════════
    story.append(section_header("2  Architecture", styles))

    arch_rows = [
        ("Layer", "Technology / Library"),
        ("Frontend framework", "React 19 + Vite 8"),
        ("Styling", "Tailwind CSS v4 (custom warm dark theme)"),
        ("3D visualisation", "Three.js via @react-three/fiber + @react-three/drei"),
        ("Animation", "Framer Motion 12"),
        ("State management", "Zustand 5"),
        ("Charts", "Recharts 3"),
        ("HTTP client (frontend)", "Axios"),
        ("Backend framework", "FastAPI 0.111 + Uvicorn"),
        ("Simulation engine", "NumPy (vectorised Monte Carlo)"),
        ("Data validation", "Pydantic v2"),
        ("HTTP client (backend)", "httpx (async)"),
        ("Live weather", "Open-Meteo API (free, no key)"),
        ("Geocoding", "Open-Meteo Geocoding API (free, no key)"),
        ("AI engine", "Gemini 2.0 Flash via Google AI Studio"),
        ("AI search grounding", "Google Search Retrieval tool"),
        ("Environment secrets", "python-dotenv"),
    ]
    header = arch_rows[0]
    data_rows = arch_rows[1:]
    w = PAGE_W - 2 * MARGIN
    at = Table(
        [[Paragraph(f'<b>{h}</b>', styles['label']) for h in header]] +
        [[Paragraph(k, styles['body']), Paragraph(v, styles['body_cream'])] for k, v in data_rows],
        colWidths=[w*0.38, w*0.62]
    )
    at.setStyle(TableStyle([
        ('BACKGROUND',    (0,0), (-1,0), BG_SURFACE),
        ('BACKGROUND',    (0,1), (-1,-1), BG_PANEL),
        ('ROWBACKGROUNDS',(0,1), (-1,-1), [BG_PANEL, BG_SURFACE]),
        ('GRID',          (0,0), (-1,-1), 0.3, BORDER),
        ('TEXTCOLOR',     (0,0), (-1,0), TEAL),
        ('VALIGN',        (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING',    (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING',   (0,0), (-1,-1), 8),
        ('RIGHTPADDING',  (0,0), (-1,-1), 8),
    ]))
    story.append(at)
    story += [sp(12)]

    story.append(Paragraph("Engine Modules (backend/engine/)", styles['h2']))
    modules = [
        ("simulator.py",    "Orchestrates the full day-by-day simulation loop. Calls all sub-engines. Caches Monte Carlo every 3 days."),
        ("monte_carlo.py",  "Vectorised NumPy analytical formula — 300 simulations in <1 ms. Closed-form geometric series solution."),
        ("consumption.py",  "Temperature-adjusted daily water consumption per member type, habit, and rationing level."),
        ("storage.py",      "Storage quality decay (sealed bottles → open drum → RO output), effective potable/utility litre split."),
        ("health.py",       "Dehydration risk curves, hygiene score decay, cumulative illness compounding over time."),
        ("alternatives.py", "Available water sources per city (tanker, RO shop, ATM, borewell, rainwater) with crisis price scaling."),
    ]
    mt2 = Table(
        [[Paragraph(f'<font color="#00e0d4">{k}</font>', styles['code']), Paragraph(v, styles['body'])] for k, v in modules],
        colWidths=[42*mm, PAGE_W - 2*MARGIN - 42*mm]
    )
    mt2.setStyle(TableStyle([
        ('BACKGROUND',    (0,0), (0,-1), BG_SURFACE),
        ('BACKGROUND',    (1,0), (1,-1), BG_PANEL),
        ('ROWBACKGROUNDS',(0,0), (-1,-1), [BG_SURFACE, BG_PANEL, BG_SURFACE, BG_PANEL, BG_SURFACE, BG_PANEL]),
        ('GRID',          (0,0), (-1,-1), 0.3, BORDER),
        ('VALIGN',        (0,0), (-1,-1), 'TOP'),
        ('TOPPADDING',    (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('LEFTPADDING',   (0,0), (-1,-1), 8),
        ('RIGHTPADDING',  (0,0), (-1,-1), 8),
    ]))
    story.append(mt2)
    story.append(PageBreak())

    # ══ 3. SETUP ════════════════════════════════════════════════════════════════
    story.append(section_header("3  Setup & Installation", styles))

    story.append(Paragraph("Prerequisites", styles['h2']))
    for req in [
        "Python 3.10 or higher  (tested on 3.12)",
        "Node.js 18 or higher  (tested on 22)",
        "pip and npm available in PATH",
        "Internet connection  (for live weather and Gemini AI)",
    ]:
        story.append(Paragraph(req, styles['bullet_teal']))
    story += [sp(8)]

    story.append(Paragraph("Step 1 — Clone / Navigate to Project", styles['h2']))
    story.append(cmd_block("cd C:\\WATER\\Day0WEP", styles))
    story += [sp(6)]

    story.append(Paragraph("Step 2 — Install Python Dependencies", styles['h2']))
    story.append(cmd_block("cd backend", styles))
    story.append(cmd_block("pip install -r requirements.txt", styles))
    story += [sp(4)]
    story.append(Paragraph(
        "Key packages: fastapi, uvicorn, pydantic, numpy, scipy, httpx, python-dotenv",
        styles['section_note']))
    story += [sp(6)]

    story.append(Paragraph("Step 3 — Install Frontend Dependencies", styles['h2']))
    story.append(cmd_block("cd C:\\WATER\\Day0WEP", styles))
    story.append(cmd_block("npm install", styles))
    story += [sp(6)]

    story.append(Paragraph("Step 4 — Configure Gemini API Key", styles['h2']))
    story.append(Paragraph(
        "The Gemini API key is stored in <font face='Courier' color='#00e0d4'>backend/.env</font>. "
        "This file is already created. Do not commit it to version control.",
        styles['body']))
    story += [sp(4)]
    story.append(Paragraph("Contents of backend/.env:", styles['label']))
    story.append(Paragraph("GEMINI_API_KEY=your_key_here", styles['code_cmd']))
    story += [sp(4)]
    story.append(Paragraph(
        "Get a free key at: https://aistudio.google.com  →  'Get API Key'. "
        "The free tier allows ~15 requests/minute with Gemini 2.0 Flash.",
        styles['section_note']))
    story += [sp(8)]

    story.append(Paragraph("Step 5 — Verify Setup", styles['h2']))
    story.append(cmd_block("cd backend && python -c \"from engine.simulator import WaterSimulator; print('OK')\"", styles))
    story.append(PageBreak())

    # ══ 4. RUNNING ══════════════════════════════════════════════════════════════
    story.append(section_header("4  How to Run", styles))

    story.append(Paragraph("Option A — One-Click (Recommended)", styles['h2']))
    story.append(Paragraph(
        "Double-click <font face='Courier' color='#00e0d4'>start.bat</font> in the project root. "
        "It opens two terminal windows (backend + frontend) and launches the browser automatically.",
        styles['body_cream']))
    story += [sp(6)]
    story.append(info_box("Opens", "http://localhost:5173", styles))
    story += [sp(10)]

    story.append(Paragraph("Option B — Manual (Two Terminals)", styles['h2']))
    story.append(Paragraph("<b>Terminal 1 — Backend:</b>", styles['body_cream']))
    story.append(cmd_block("cd C:\\WATER\\Day0WEP\\backend", styles))
    story.append(cmd_block("python main.py", styles))
    story += [sp(4)]
    story.append(Paragraph("<b>Terminal 2 — Frontend:</b>", styles['body_cream']))
    story.append(cmd_block("cd C:\\WATER\\Day0WEP", styles))
    story.append(cmd_block("npm run dev", styles))
    story += [sp(8)]

    story.append(Paragraph("Access Points", styles['h2']))
    ports = [
        ("Frontend UI",   "http://localhost:5173   (or 5174 if occupied)"),
        ("Backend API",   "http://localhost:8000"),
        ("API Docs",      "http://localhost:8000/docs   (Swagger UI)"),
        ("AI Test",       "http://localhost:8000/api/ai/test   (Gemini health check)"),
    ]
    story.append(two_col_table(ports, styles))
    story += [sp(10)]

    story.append(Paragraph("Stopping the Servers", styles['h2']))
    story.append(Paragraph(
        "If using start.bat, press any key in the launcher window to stop both servers. "
        "If running manually, press <b>Ctrl+C</b> in each terminal.",
        styles['body']))
    story.append(PageBreak())

    # ══ 5. USER GUIDE ═══════════════════════════════════════════════════════════
    story.append(section_header("5  User Guide — Step by Step", styles))

    steps = [
        ("Step 1", "HOUSEHOLD MEMBERS", TEAL,
         "Add the number of adults, children, elderly, and medical patients in your household. "
         "Each type has a different survival water requirement — adults need ~3L/day drinking, "
         "children 1.5L, elderly 2.8L, patients 3.5L."),
        ("Step 2", "WATER ARSENAL", AMBER,
         "Select your current water storage containers and enter their capacity in litres. "
         "Options: Overhead Tank, Underground Sump, Sealed Bottles, Open Drum, RO Output. "
         "Each has different quality decay rates — sealed bottles last longest, open drums degrade fastest."),
        ("Step 3", "YOUR CITY", TEAL,
         "Search for any Indian city by name, or quick-select from the 7 pre-configured high-risk cities. "
         "Live temperature is fetched from Open-Meteo automatically and shown as a badge. "
         "Unknown cities get a dynamic profile generated from coordinates + live weather."),
        ("Step 4", "DAILY HABITS", AMBER,
         "Select toilet type (flush/pour-flush/dry), bathing habit (shower/bucket/mixed), "
         "and whether you have a borewell or RO unit. These determine your baseline consumption "
         "and how much rationing headroom you have."),
        ("Simulate", "CALCULATE SURVIVAL PROFILE", DANGER,
         "The system runs a 30-day simulation and 4 parallel strategy comparisons (none / mild / moderate / severe rationing). "
         "Live weather is injected automatically. Monte Carlo runs 300 simulations to generate probability ranges."),
    ]

    for badge, title, color, desc in steps:
        story.append(feature_card(title, desc, badge, styles, color))
        story += [sp(5)]

    story += [sp(6)]
    story.append(Paragraph("Reading the Dashboard", styles['h2']))
    panels = [
        ("Left panel",
         "Days Remaining (large count), Preparedness Score (0–100 radial gauge), "
         "Health Metrics (dehydration risk, illness risk, hygiene score rings)."),
        ("Centre",
         "3D animated water tank — fill level, colour, and particle behaviour all respond to crisis level. "
         "Percentage and litres displayed at top. Live temperature badge at bottom."),
        ("Right panel",
         "Storage breakdown by container, consumption donut chart, scenario comparison bars, "
         "AI Advisor panel (Gemini 2.0 Flash with live search grounding)."),
    ]
    story.append(two_col_table(panels, styles))
    story += [sp(8)]

    story.append(Paragraph("Simulation Timeline", styles['h2']))
    story.append(Paragraph(
        "Click 'Open Simulation →' on the dashboard to access the day-by-day timeline. "
        "Scrub through days with the timeline bar at the bottom. Press Play to auto-advance. "
        "Yellow diamonds mark <b>decision forks</b> — critical storage thresholds (75%, 50%, 30%, 15%, 5%) "
        "where you can choose to start rationing, buy a tanker, or continue as-is.",
        styles['body']))
    story.append(PageBreak())

    # ══ 6. FEATURES ══════════════════════════════════════════════════════════════
    story.append(section_header("6  Feature Deep-Dive", styles))

    features = [
        ("Monte Carlo Simulation", TEAL,
         "300 simulations run per data point using a vectorised NumPy closed-form formula. "
         "Previously a Python loop (15,600 iterations, 30s+ timeout). Now <1ms. "
         "Produces p5/p25/median/p75/p95 survival day estimates — shown as a probability band on the timeline."),
        ("Live Weather Integration", AMBER,
         "Every simulation fetches the current temperature from Open-Meteo (free, no API key). "
         "The current month's temperature in the simulation is replaced with the live reading. "
         "Dashboard shows '🌡 32°C Live · Open-Meteo' badge. Affects all consumption calculations."),
        ("Any-City Support", TEAL,
         "Users can search any Indian city using Open-Meteo's geocoding API. "
         "For cities outside the 7 pre-configured ones, a dynamic profile is built from "
         "coordinates, live weather, and a latitude-based temperature model. "
         "Tagged with a 'dynamic' badge in the UI."),
        ("Gemini AI Advisor", AI_PURPLE,
         "Calls Gemini 2.0 Flash with Google Search Grounding — the AI can browse the web for "
         "current water news in your city before answering. Shows '🔍 live search' badge when grounded. "
         "Gives 3–4 specific survival actions using Indian context (tanker apps, water ATMs, borewells). "
         "Fallback to non-grounded generation if search quota is exceeded."),
        ("Health Risk Modelling", DANGER,
         "Three health metrics tracked daily: Dehydration Risk (temperature + member type curves), "
         "Hygiene Score (toilet mode, bathing habit, handwashing frequency), "
         "Illness Risk (compounding based on cumulative hygiene deficit — once degraded, slow recovery). "
         "All three drive the crisis level classification."),
        ("Storage Quality Decay", AMBER,
         "Each container type has a different quality degradation profile. "
         "Sealed bottles: potable for 180+ days. Overhead tanks: utility-safe up to 7 days. "
         "Open drums: unsafe within 3 days in heat. RO output: drink within 24 hours. "
         "Evaporation loss (~1.2%/day) also modelled."),
        ("Decision Fork Events", TEAL,
         "At five storage thresholds (75%, 50%, 30%, 15%, 5%), a decision fork appears. "
         "Each option shows projected days remaining under that strategy. "
         "Options: continue normal, mild/moderate/severe rationing, or buy a water tanker "
         "(price scales with crisis day — up to 5.5x baseline)."),
        ("Warm Dark Theme", AMBER,
         "Completely custom warm amber-dark colour palette replacing the previous cold blue-navy. "
         "Background #0d0906, borders #3d2d18, text #f2e4c6. "
         "All 8 component files updated. Easier on eyes during extended use."),
    ]

    for title, color, desc in features:
        story.append(feature_card(title, desc, "●", styles, color))
        story += [sp(4)]

    story.append(PageBreak())

    # ══ 7. API REFERENCE ════════════════════════════════════════════════════════
    story.append(section_header("7  API Reference", styles))
    story.append(Paragraph(
        "Full interactive docs available at http://localhost:8000/docs when the backend is running.",
        styles['section_note']))
    story += [sp(6)]

    endpoints = [
        ("GET",  "/api/cities",                  "List all 7 pre-configured Indian cities with metadata"),
        ("GET",  "/api/cities/{city_id}",         "Get one city — auto-injects live temperature from Open-Meteo"),
        ("GET",  "/api/geocode?q={query}",        "Search any city name → returns lat/lon + state/country"),
        ("GET",  "/api/weather/{city_id}",        "Live weather for a known city (temp + 7-day forecast)"),
        ("GET",  "/api/weather/coords/live",      "Live weather for any lat/lon coordinates"),
        ("POST", "/api/household",                "Save a household profile to in-memory store"),
        ("GET",  "/api/household/{id}",           "Retrieve a saved household profile"),
        ("POST", "/api/simulate",                 "Full simulation (requires saved household_id)"),
        ("POST", "/api/simulate/quick",           "All-in-one: create household + simulate + live weather"),
        ("GET",  "/api/alternatives/{city_id}",  "Available water sources with crisis-adjusted pricing"),
        ("GET",  "/api/preparedness/{id}",        "Preparedness score + gap analysis for a household"),
        ("POST", "/api/ai/insights",              "Gemini 2.0 Flash with Google Search — survival advice"),
        ("GET",  "/api/ai/test",                  "Quick Gemini health check (key + model reachability)"),
        ("GET",  "/api/crises",                   "Historical water crisis data for reference"),
    ]
    for method, path, desc in endpoints:
        story.append(api_row(method, path, desc, styles))
        story += [sp(2)]

    story += [sp(8)]
    story.append(Paragraph("Quick Simulate — Request Body", styles['h2']))
    sample = (
        '{\n'
        '  "city_id": "chennai",\n'
        '  "city_name": "Chennai",\n'
        '  "lat": 13.0827, "lon": 80.2707,\n'
        '  "members": [{"type": "adult", "count": 3, "medical_conditions": []}],\n'
        '  "storages": [{"type": "overhead_tank", "liters": 2000, "days_since_filled": 0}],\n'
        '  "toilet_type": "flush",\n'
        '  "bathing_habit": "bucket",\n'
        '  "laundry_frequency": "thrice_weekly",\n'
        '  "water_source": "municipal",\n'
        '  "has_borewell": false,\n'
        '  "has_ro_unit": false\n'
        '}'
    )
    for line in sample.split('\n'):
        story.append(Paragraph(line, styles['code']))
    story.append(PageBreak())

    # ══ 8. SIMULATION SCIENCE ════════════════════════════════════════════════════
    story.append(section_header("8  Simulation Science", styles))

    story.append(Paragraph("Monte Carlo — How It Works", styles['h2']))
    story.append(Paragraph(
        "Rather than simulating each of 300 scenarios as a Python loop (which caused the 30s timeouts), "
        "the engine uses a NumPy vectorised <b>closed-form analytical solution</b>.",
        styles['body_cream']))
    story += [sp(4)]

    story.append(Paragraph("The water depletion recurrence:", styles['h3']))
    story.append(Paragraph("s_d = s₀ × r^d − need × (1 − r^d) / evap", styles['code_cmd']))
    story.append(Paragraph("where r = 1 − evap = 0.988  (1.2% daily evaporation)", styles['section_note']))
    story += [sp(4)]

    story.append(Paragraph("Solving for day-zero analytically:", styles['h3']))
    story.append(Paragraph("d = ln(need / (s₀ × evap + need)) / ln(r)", styles['code_cmd']))
    story.append(Paragraph(
        "This vectorised formula processes 300 simulations simultaneously in <b>&lt;1ms</b> vs the previous "
        "15,600-iteration Python loop that took 30+ seconds and caused request timeouts.",
        styles['body']))
    story += [sp(10)]

    story.append(Paragraph("Crisis Levels", styles['h2']))
    crisis_rows = [
        ("SAFE",     TEAL,      "Storage > 60% or risk < 20%"),
        ("WATCH",    colors.HexColor("#7dd3fc"), "Storage 40–60% or risk 20–35%"),
        ("WARNING",  AMBER,     "Storage 25–40% or risk 35–55%"),
        ("CRITICAL", colors.HexColor("#f97316"), "Storage 10–25% or risk 55–75%"),
        ("DAY ZERO", DANGER,    "Storage < 10% or risk > 75%"),
    ]
    cr_data = [[
        Paragraph(f'<font color="{c.hexval()}"><b>{lvl}</b></font>', styles['label']),
        Paragraph(desc, styles['body']),
    ] for lvl, c, desc in crisis_rows]
    ct = Table(cr_data, colWidths=[30*mm, PAGE_W - 2*MARGIN - 30*mm])
    ct.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), BG_SURFACE),
        ('GRID',       (0,0), (-1,-1), 0.3, BORDER),
        ('VALIGN',     (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(ct)
    story += [sp(10)]

    story.append(Paragraph("Consumption Model", styles['h2']))
    story.append(Paragraph(
        "Daily consumption is calculated per member type and temperature. At 40°C, needs increase ~30% "
        "vs 25°C baseline. Rationing reduces usage progressively:",
        styles['body']))
    story += [sp(4)]
    ration_rows = [
        ("none",     "Normal usage — full flush, shower/bucket, laundry as usual"),
        ("mild",     "−15% — half-flush, bucket bath, no laundry"),
        ("moderate", "−35% — pour-flush, sponge bath, dry cooking mode"),
        ("severe",   "−60% — survival mode, drinking + minimal cooking only"),
    ]
    story.append(two_col_table(ration_rows, styles))
    story.append(PageBreak())

    # ══ 9. FILE STRUCTURE ════════════════════════════════════════════════════════
    story.append(section_header("9  File Structure", styles))

    tree = [
        ("C:\\WATER\\Day0WEP\\",                   "Project root"),
        ("  start.bat",                             "One-click launcher (opens backend + frontend)"),
        ("  package.json",                          "Frontend dependencies"),
        ("  vite.config.js",                        "Vite bundler config"),
        ("  generate_report.py",                    "This PDF generator"),
        ("  backend/",                              "Python FastAPI server"),
        ("    main.py",                             "All API endpoints + Gemini + weather"),
        ("    .env",                                "GEMINI_API_KEY (do not commit)"),
        ("    requirements.txt",                    "Python packages"),
        ("    models/household.py",                 "HouseholdProfile Pydantic model"),
        ("    models/simulation.py",                "SimulationResult, DayState models"),
        ("    engine/simulator.py",                 "Main simulation loop (30-day)"),
        ("    engine/monte_carlo.py",               "Vectorised NumPy MC engine"),
        ("    engine/consumption.py",               "Temp-adjusted consumption calc"),
        ("    engine/storage.py",                   "Storage quality + decay"),
        ("    engine/health.py",                    "Dehydration, illness, hygiene"),
        ("    engine/alternatives.py",              "Water sources + pricing"),
        ("    data/cities.json",                    "7 city profiles with lat/lon"),
        ("    data/crises.json",                    "Historical crisis data"),
        ("  src/",                                  "React + TypeScript frontend"),
        ("    pages/Onboarding.tsx",                "5-step setup wizard + city search"),
        ("    pages/Dashboard.tsx",                 "Main dashboard + AI panel"),
        ("    pages/Simulation.tsx",                "Day timeline + decision forks"),
        ("    pages/Alternatives.tsx",              "Water sources page"),
        ("    pages/ActionCenter.tsx",              "Action recommendations"),
        ("    pages/CrisisIntel.tsx",               "Historical crisis data viewer"),
        ("    components/3d/WaterTank.tsx",         "Three.js water tank + shaders"),
        ("    components/3d/Scene.tsx",             "R3F canvas wrapper"),
        ("    components/layout/Sidebar.tsx",       "Crisis-reactive nav sidebar"),
        ("    components/ui/",                      "GaugeRing, StorageBreakdown, etc."),
        ("    store/useStore.ts",                   "Zustand global state"),
        ("    lib/api.ts",                          "Axios API client + all endpoints"),
        ("    types/index.ts",                      "TypeScript type definitions"),
        ("    index.css",                           "Warm dark theme + CSS variables"),
    ]
    w = PAGE_W - 2*MARGIN
    ft = Table(
        [[Paragraph(f'<font face="Courier" color="#00c4ae">{p}</font>', styles['code']),
          Paragraph(d, styles['body'])]
         for p, d in tree],
        colWidths=[w*0.48, w*0.52]
    )
    ft.setStyle(TableStyle([
        ('ROWBACKGROUNDS', (0,0), (-1,-1), [BG_SURFACE, BG_PANEL]),
        ('GRID',           (0,0), (-1,-1), 0.2, BORDER),
        ('VALIGN',         (0,0), (-1,-1), 'TOP'),
        ('TOPPADDING',     (0,0), (-1,-1), 4),
        ('BOTTOMPADDING',  (0,0), (-1,-1), 4),
        ('LEFTPADDING',    (0,0), (-1,-1), 6),
        ('RIGHTPADDING',   (0,0), (-1,-1), 6),
    ]))
    story.append(ft)
    story.append(PageBreak())

    # ══ 10. TROUBLESHOOTING ══════════════════════════════════════════════════════
    story.append(section_header("10  Troubleshooting", styles))

    issues = [
        ("Simulation timeout",
         "Backend is old and needs restart. Stop and re-run 'python main.py'. "
         "The new vectorised Monte Carlo runs 300 sims in <1ms — should never timeout."),
        ("AI Advisor not appearing",
         "1) Open browser DevTools → Network → look for POST to /api/ai/insights. "
         "2) Visit http://localhost:8000/api/ai/test to verify Gemini key works. "
         "3) If 429, wait 60 seconds (free tier rate limit). Retry button will re-call."),
        ("City not found error",
         "If using a custom city (lat/lon), the backend auto-creates a dynamic profile. "
         "Ensure lat and lon are provided in the household profile. "
         "Check backend logs for the specific error message."),
        ("Live weather shows N/A",
         "Open-Meteo might be temporarily unavailable. The simulation falls back to "
         "monthly average temperatures from cities.json automatically."),
        ("Backend won't start",
         "Run: pip install -r backend/requirements.txt "
         "Ensure Python 3.10+ is active. Check no other process uses port 8000."),
        ("Frontend blank screen",
         "Run: npm install  in the project root. "
         "Then: npm run dev  and open http://localhost:5173."),
        ("Port 5173 already in use",
         "Vite automatically uses 5174 if 5173 is occupied. "
         "Update CORS in backend/main.py to include localhost:5174 (already done)."),
        ("Gemini search grounding not working",
         "Search grounding (🔍 live search badge) requires a Gemini API key with "
         "Google Search enabled. The app automatically falls back to standard generation."),
    ]

    for title, solution in issues:
        story.append(KeepTogether([
            Paragraph(title, styles['h3']),
            Paragraph(solution, styles['body']),
            sp(4),
        ]))
    story += [sp(8)]

    # ══ 11. EXTENDING ══════════════════════════════════════════════════════════
    story.append(section_header("11  Extending the App", styles))

    extensions = [
        ("Add a new city",
         "Edit backend/data/cities.json — add a new object with all required fields including lat/lon. "
         "Or use the dynamic city feature (any lat/lon works without editing JSON)."),
        ("Change Gemini model",
         "Edit GEMINI_URL in backend/main.py. Current: gemini-2.0-flash. "
         "Run GET /api/ai/test to see which models your key can access."),
        ("Add push notifications",
         "Install web-push (npm) and create a /api/subscribe endpoint. "
         "Trigger alerts when storage crosses thresholds in the simulator."),
        ("Add reservoir live data",
         "Fetch CWC India reservoir API → pass current inflow as daily_replenishment "
         "parameter to WaterSimulator to model supply-side recovery."),
        ("Multi-user / community mode",
         "Replace in-memory _households dict with a SQLite or Redis store. "
         "Add aggregated city-level stats endpoint for community dashboard."),
        ("Export simulation data",
         "Add GET /api/export/{household_id} returning CSV of daily states. "
         "Frontend: add download button in Simulation page."),
    ]

    for title, desc in extensions:
        story.append(info_box(title, desc, styles, TEAL_DIM))
        story += [sp(4)]

    story.append(PageBreak())

    # ══ FINAL PAGE ══════════════════════════════════════════════════════════════
    story += [sp(60)]
    story.append(divider(TEAL, 1.5))
    story += [sp(10)]
    story.append(Paragraph("Day Zero — Water Emergency Planner", styles['cover_title']))
    story.append(Paragraph(
        f"Generated {date.today().strftime('%d %B %Y')}  ·  Version 2.1.0",
        styles['cover_sub']))
    story += [sp(8)]
    story.append(Paragraph(
        "Built with React 19 · FastAPI · Three.js · Gemini 2.0 Flash · Open-Meteo",
        styles['cover_tagline']))
    story += [sp(6)]
    story.append(Paragraph(
        "Run it: double-click start.bat or python main.py + npm run dev",
        styles['caption']))

    return story


# ── Main ──────────────────────────────────────────────────────────────────────
def generate():
    doc = SimpleDocTemplate(
        OUTPUT,
        pagesize=A4,
        leftMargin=MARGIN,
        rightMargin=MARGIN,
        topMargin=MARGIN + 4,
        bottomMargin=26,
        title="Day Zero — Water Emergency Planner",
        author="Day Zero WEP",
        subject="Project Documentation & User Guide",
    )

    styles = build_styles()
    story = build_story(styles)
    doc.build(story, canvasmaker=ReportCanvas)
    print(f"\nReport saved -> {OUTPUT}")
    return OUTPUT


if __name__ == "__main__":
    path = generate()
    # Auto-open on Windows
    import subprocess
    subprocess.Popen(["start", "", path], shell=True)

"""
Day Zero WEP — Project Report Generator
Run: python generate_report.py
Output: Day_Zero_WEP_Report.pdf
"""

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, PageBreak, KeepTogether
)
from reportlab.pdfgen import canvas as rl_canvas
import os
from datetime import date

# ── Palette (light theme — readable in all viewers/printers) ──────────────────
TEAL        = colors.HexColor("#007a6e")
TEAL_LIGHT  = colors.HexColor("#e6f7f5")
TEAL_MED    = colors.HexColor("#00c4ae")
AMBER       = colors.HexColor("#b45309")
AMBER_LIGHT = colors.HexColor("#fffbeb")
RED         = colors.HexColor("#dc2626")
PURPLE      = colors.HexColor("#7c3aed")
BG_WHITE    = colors.HexColor("#ffffff")
BG_LIGHT    = colors.HexColor("#f8f9fa")
BG_PANEL    = colors.HexColor("#f0fdf4")
BORDER      = colors.HexColor("#d1fae5")
BORDER_GRAY = colors.HexColor("#e5e7eb")
TEXT_DARK   = colors.HexColor("#111827")
TEXT_MID    = colors.HexColor("#374151")
TEXT_MUTED  = colors.HexColor("#6b7280")
CODE_BG     = colors.HexColor("#f1f5f9")
CODE_TEXT   = colors.HexColor("#0f766e")

PAGE_W, PAGE_H = A4
MARGIN = 20 * mm
CONTENT_W = PAGE_W - 2 * MARGIN
OUTPUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "Day_Zero_WEP_Report.pdf")


# ── Page decorations (drawn BEFORE content each page) ────────────────────────
def _draw_page(c: rl_canvas.Canvas, doc):
    c.saveState()
    w, h = A4
    # Top teal header bar
    c.setFillColor(TEAL)
    c.rect(0, h - 10 * mm, w, 10 * mm, fill=1, stroke=0)
    # Header text
    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 8)
    c.drawString(MARGIN, h - 6.5 * mm, "Day Zero — Water Emergency Planner")
    c.setFont("Helvetica", 8)
    c.drawRightString(w - MARGIN, h - 6.5 * mm, f"Generated {date.today().strftime('%B %d, %Y')}")
    # Thin top accent line below bar
    c.setStrokeColor(TEAL_MED)
    c.setLineWidth(0.5)
    c.line(MARGIN, h - 10 * mm - 1, w - MARGIN, h - 10 * mm - 1)
    # Bottom footer
    c.setFillColor(BG_LIGHT)
    c.rect(0, 0, w, 12 * mm, fill=1, stroke=0)
    c.setFillColor(TEXT_MUTED)
    c.setFont("Helvetica", 7.5)
    c.drawCentredString(w / 2, 4 * mm, "Day Zero WEP — Internal Documentation")
    if doc.page > 1:
        c.drawRightString(w - MARGIN, 4 * mm, f"Page {doc.page}")
    c.restoreState()


# ── Styles ────────────────────────────────────────────────────────────────────
def build_styles():
    s = {}

    s['cover_title'] = ParagraphStyle('cover_title',
        fontName='Helvetica-Bold', fontSize=36, textColor=TEAL,
        alignment=TA_CENTER, spaceAfter=6, leading=42)

    s['cover_sub'] = ParagraphStyle('cover_sub',
        fontName='Helvetica', fontSize=12, textColor=TEXT_MID,
        alignment=TA_CENTER, spaceAfter=4, leading=18)

    s['cover_tag'] = ParagraphStyle('cover_tag',
        fontName='Helvetica-Oblique', fontSize=10, textColor=TEXT_MUTED,
        alignment=TA_CENTER, spaceAfter=3, leading=15)

    s['h1'] = ParagraphStyle('h1',
        fontName='Helvetica-Bold', fontSize=18, textColor=TEAL,
        spaceBefore=10, spaceAfter=4, leading=22)

    s['h2'] = ParagraphStyle('h2',
        fontName='Helvetica-Bold', fontSize=12, textColor=TEXT_DARK,
        spaceBefore=8, spaceAfter=3, leading=16)

    s['h3'] = ParagraphStyle('h3',
        fontName='Helvetica-Bold', fontSize=10, textColor=AMBER,
        spaceBefore=5, spaceAfter=2, leading=14)

    s['body'] = ParagraphStyle('body',
        fontName='Helvetica', fontSize=9.5, textColor=TEXT_MID,
        spaceAfter=4, leading=15)

    s['body_dark'] = ParagraphStyle('body_dark',
        fontName='Helvetica', fontSize=9.5, textColor=TEXT_DARK,
        spaceAfter=4, leading=15)

    s['code'] = ParagraphStyle('code',
        fontName='Courier', fontSize=8.5, textColor=CODE_TEXT,
        spaceAfter=2, leading=13,
        backColor=CODE_BG, borderPad=5,
        leftIndent=6, rightIndent=6)

    s['cmd'] = ParagraphStyle('cmd',
        fontName='Courier-Bold', fontSize=9, textColor=TEAL,
        spaceAfter=3, leading=14,
        backColor=CODE_BG, borderPad=6,
        leftIndent=8)

    s['bullet'] = ParagraphStyle('bullet',
        fontName='Helvetica', fontSize=9.5, textColor=TEXT_MID,
        spaceAfter=3, leading=14, leftIndent=14,
        bulletIndent=4, bulletText='•')

    s['bullet_teal'] = ParagraphStyle('bullet_teal',
        fontName='Helvetica', fontSize=9.5, textColor=TEXT_DARK,
        spaceAfter=3, leading=14, leftIndent=14,
        bulletIndent=4, bulletText='>>')

    s['caption'] = ParagraphStyle('caption',
        fontName='Helvetica-Oblique', fontSize=8, textColor=TEXT_MUTED,
        spaceAfter=3, leading=11, alignment=TA_CENTER)

    s['label'] = ParagraphStyle('label',
        fontName='Helvetica-Bold', fontSize=7.5, textColor=TEAL,
        spaceAfter=1, leading=10)

    s['note'] = ParagraphStyle('note',
        fontName='Helvetica-Oblique', fontSize=8.5, textColor=TEXT_MUTED,
        spaceAfter=4, leading=12)

    return s


# ── Helper builders ───────────────────────────────────────────────────────────
def divider(color=BORDER_GRAY, thick=0.5):
    return HRFlowable(width="100%", thickness=thick, color=color,
                      spaceAfter=6, spaceBefore=6)

def section_header(title, styles):
    return KeepTogether([
        Paragraph(title, styles['h1']),
        HRFlowable(width="100%", thickness=2, color=TEAL_MED,
                   spaceAfter=8, spaceBefore=0),
    ])

def panel(rows, col_widths, bg=BG_PANEL, border=BORDER):
    tbl = Table(rows, colWidths=col_widths)
    tbl.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), bg),
        ('BOX',        (0, 0), (-1, -1), 0.8, border),
        ('ROWBACKGROUNDS', (0, 0), (-1, -1), [bg, BG_WHITE]),
        ('TOPPADDING',    (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING',   (0, 0), (-1, -1), 8),
        ('RIGHTPADDING',  (0, 0), (-1, -1), 8),
        ('FONTNAME',  (0, 0), (-1, -1), 'Helvetica'),
        ('FONTSIZE',  (0, 0), (-1, -1), 9),
        ('TEXTCOLOR', (0, 0), (-1, -1), TEXT_MID),
    ]))
    return tbl

def kv_table(pairs, styles, key_w=60*mm):
    rows = []
    for k, v in pairs:
        rows.append([
            Paragraph(k, styles['label']),
            Paragraph(v, styles['body']),
        ])
    tbl = Table(rows, colWidths=[key_w, CONTENT_W - key_w])
    tbl.setStyle(TableStyle([
        ('BACKGROUND',    (0, 0), (-1, -1), BG_PANEL),
        ('BOX',           (0, 0), (-1, -1), 0.6, BORDER),
        ('LINEBELOW',     (0, 0), (-1, -2), 0.3, BORDER_GRAY),
        ('TOPPADDING',    (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING',   (0, 0), (-1, -1), 8),
        ('RIGHTPADDING',  (0, 0), (-1, -1), 8),
    ]))
    return tbl

def cmd_block(cmds, styles):
    return KeepTogether([
        Paragraph(c, styles['cmd']) for c in cmds
    ])

def api_table(rows_data, styles):
    header = [
        Paragraph('Endpoint', styles['label']),
        Paragraph('Method', styles['label']),
        Paragraph('Description', styles['label']),
    ]
    rows = [header] + [
        [Paragraph(r[0], styles['code']),
         Paragraph(r[1], styles['label']),
         Paragraph(r[2], styles['body'])]
        for r in rows_data
    ]
    tbl = Table(rows, colWidths=[75*mm, 18*mm, CONTENT_W - 93*mm])
    tbl.setStyle(TableStyle([
        ('BACKGROUND',    (0, 0), (-1,  0), TEAL),
        ('TEXTCOLOR',     (0, 0), (-1,  0), colors.white),
        ('FONTNAME',      (0, 0), (-1,  0), 'Helvetica-Bold'),
        ('FONTSIZE',      (0, 0), (-1,  0), 8),
        ('BACKGROUND',    (0, 1), (-1, -1), BG_PANEL),
        ('ROWBACKGROUNDS',(0, 1), (-1, -1), [BG_PANEL, BG_WHITE]),
        ('BOX',           (0, 0), (-1, -1), 0.8, BORDER),
        ('LINEBELOW',     (0, 0), (-1, -2), 0.3, BORDER_GRAY),
        ('TOPPADDING',    (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING',   (0, 0), (-1, -1), 6),
        ('RIGHTPADDING',  (0, 0), (-1, -1), 6),
        ('FONTNAME',      (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE',      (0, 1), (-1, -1), 8.5),
        ('TEXTCOLOR',     (0, 1), (-1, -1), TEXT_MID),
    ]))
    return tbl


# ── Story builder ─────────────────────────────────────────────────────────────
def build_story(styles):
    s = styles
    story = []

    # ── COVER ────────────────────────────────────────────────────────────────
    story += [
        Spacer(1, 28 * mm),
        Paragraph("Day Zero", s['cover_title']),
        Paragraph("Water Emergency Planner", s['cover_sub']),
        Spacer(1, 4 * mm),
        HRFlowable(width="60%", thickness=2, color=TEAL_MED,
                   spaceAfter=8, hAlign='CENTER'),
        Paragraph("Full-Stack Household Water Crisis Simulation Platform", s['cover_tag']),
        Paragraph(f"Project Documentation &nbsp;·&nbsp; {date.today().strftime('%B %Y')}",
                  s['caption']),
        Spacer(1, 16 * mm),
    ]

    # Tech-stack pill table
    tech = Table([[
        Paragraph('<b>React 19</b> + Three.js', s['body']),
        Paragraph('<b>FastAPI</b> + NumPy', s['body']),
        Paragraph('<b>Gemini 2.0</b> Flash', s['body']),
        Paragraph('<b>Open-Meteo</b> API', s['body']),
    ]], colWidths=[CONTENT_W/4]*4)
    tech.setStyle(TableStyle([
        ('BACKGROUND',    (0,0), (-1,-1), TEAL_LIGHT),
        ('BOX',           (0,0), (-1,-1), 1.0, TEAL_MED),
        ('ALIGN',         (0,0), (-1,-1), 'CENTER'),
        ('TOPPADDING',    (0,0), (-1,-1), 7),
        ('BOTTOMPADDING', (0,0), (-1,-1), 7),
        ('TEXTCOLOR',     (0,0), (-1,-1), TEAL),
    ]))
    story += [tech, Spacer(1, 10*mm)]

    story.append(PageBreak())

    # ── 1. WHAT IS IT ────────────────────────────────────────────────────────
    story += [section_header("1. What Is It?", s)]
    story += [
        Paragraph(
            "Day Zero WEP is a household water-crisis simulation tool. Given your "
            "family size, water storage (tanks, drums, bottles), city, and current "
            "rationing level, it projects how many days of supply remain — and what "
            "you should do about it.",
            s['body_dark']),
        Spacer(1, 4),
        Paragraph("Key capabilities:", s['h2']),
    ]
    for feat in [
        ("Monte Carlo Simulation", "300-run vectorised NumPy model — median, P5/P95 confidence band, strategy comparison."),
        ("Live Weather",           "Open-Meteo injects real-time temperature into consumption models."),
        ("Any City",               "Geocoding lets you simulate any city globally, not just preset ones."),
        ("Gemini AI Advisor",      "Gemini 2.0 Flash with Google Search grounding gives city-specific survival advice."),
        ("AI Chat",                "Multi-turn chatbot with full simulation context for follow-up questions."),
        ("3D Water Tank",          "Three.js animated tank shows fill level, color-coded by crisis severity."),
        ("Strategy Comparison",    "Side-by-side simulation of none/mild/moderate/severe rationing."),
        ("Alternatives Finder",    "Shows tanker costs, RO-shop prices, rainwater potential, borewell options."),
    ]:
        story.append(kv_table([feat], s, key_w=50*mm))
        story.append(Spacer(1, 2))

    story.append(Spacer(1, 6))

    # ── 2. ARCHITECTURE ──────────────────────────────────────────────────────
    story += [section_header("2. Architecture", s)]
    story += [
        Paragraph("System overview", s['h2']),
        kv_table([
            ("Frontend",   "React 19 + Vite 6, Tailwind CSS v4, Framer Motion, @react-three/fiber, Zustand, Recharts, Lucide Icons"),
            ("Backend",    "Python 3.12, FastAPI 0.115, Uvicorn, NumPy, SciPy, httpx, python-dotenv"),
            ("AI / APIs",  "Gemini 2.0 Flash REST API (Google Search grounding), Open-Meteo forecast + geocoding (free, no key)"),
            ("State",      "In-memory dict on backend (no database). Zustand store on frontend."),
            ("Build",      "Vite builds React to dist/. FastAPI can serve it statically via FileResponse catch-all."),
        ], s),
        Spacer(1, 6),
        Paragraph("Engine modules", s['h2']),
        kv_table([
            ("consumption.py",   "Daily water need by member type, temperature, rationing level"),
            ("simulator.py",     "30-day day-by-day runner: storage decay, health curves, rationing events"),
            ("monte_carlo.py",   "Vectorised NumPy closed-form survival formula — 300 sims in <1 ms"),
            ("alternatives.py",  "City-aware alternatives: tanker, RO shop, water ATM, borewell, rain harvest"),
            ("models/",          "Pydantic v2 models: HouseholdProfile, StorageUnit, SimulationResult"),
        ], s),
    ]
    story.append(PageBreak())

    # ── 3. SETUP ─────────────────────────────────────────────────────────────
    story += [section_header("3. Setup & Installation", s)]
    story += [
        Paragraph("Prerequisites", s['h2']),
        Paragraph("Node.js 18+, Python 3.11+, npm or yarn.", s['body']),
        Spacer(1, 4),
        Paragraph("Step 1 — Clone & install frontend", s['h3']),
        cmd_block([
            "git clone &lt;repo-url&gt;  cd Day0WEP",
            "npm install",
        ], s),
        Spacer(1, 4),
        Paragraph("Step 2 — Install backend dependencies", s['h3']),
        cmd_block([
            "cd backend",
            "pip install -r requirements.txt",
        ], s),
        Spacer(1, 4),
        Paragraph("Step 3 — Configure Gemini API key", s['h3']),
        Paragraph("Create <b>backend/.env</b> with:", s['body']),
        Paragraph("GEMINI_API_KEY=your_key_here", s['code']),
        Spacer(1, 4),
        Paragraph(
            "Get a free key at <b>aistudio.google.com</b>. "
            "Free tier: 15 requests/min, 1 M tokens/day.",
            s['note']),
    ]

    # ── 4. HOW TO RUN ────────────────────────────────────────────────────────
    story += [Spacer(1, 6), section_header("4. How To Run", s)]
    story += [
        Paragraph("Option A — Double-click start.bat (Windows, easiest)", s['h2']),
        Paragraph("Launches both backend and frontend simultaneously.", s['body']),
        Spacer(1, 4),
        Paragraph("Option B — Manual (two terminals)", s['h2']),
        Paragraph("<b>Terminal 1 — Backend:</b>", s['h3']),
        cmd_block(["cd backend", "python main.py"], s),
        Paragraph("<b>Terminal 2 — Frontend:</b>", s['h3']),
        cmd_block(["npm run dev"], s),
        Spacer(1, 4),
        kv_table([
            ("Backend URL",  "http://localhost:8000"),
            ("Frontend URL", "http://localhost:5173  (or 5174 if port is busy)"),
            ("API Docs",     "http://localhost:8000/docs  (Swagger UI auto-generated)"),
        ], s),
    ]
    story.append(PageBreak())

    # ── 5. USER GUIDE ────────────────────────────────────────────────────────
    story += [section_header("5. User Guide", s)]
    steps = [
        ("Step 1", "Onboarding — City",
         "Search any Indian city (or global) by name. Quick-select buttons for 7 major cities. "
         "A live temperature badge appears after selection."),
        ("Step 2", "Onboarding — Household",
         "Add member types: adults, children, elderly, infants. Each has different base consumption."),
        ("Step 3", "Onboarding — Storage",
         "Add water sources: overhead tank, sump, drum, sealed bottles, borewell. "
         "Enter litres for each. Check RO unit / borewell checkboxes if applicable."),
        ("Step 4", "Onboarding — Rationing",
         "Choose current rationing level: None / Mild / Moderate / Severe. "
         "This sets the base consumption multiplier for the simulation."),
        ("Step 5", "Dashboard",
         "See the 3D animated tank, days remaining, preparedness score, health metrics, "
         "strategy comparison bars, and AI Advisor panel. The AI auto-fetches on load."),
        ("Step 6", "Simulation",
         "Day-by-day timeline with storage chart, consumption breakdown, and Monte Carlo confidence bands."),
        ("Step 7", "AI Chat",
         "Click the green hexagon button (bottom-right) to open the chatbot. "
         "Ask follow-up questions about your specific situation."),
    ]
    for tag, title, desc in steps:
        row = [[
            Paragraph(tag, s['label']),
            Paragraph(f'<b>{title}</b><br/>{desc}', s['body']),
        ]]
        tbl = Table(row, colWidths=[18*mm, CONTENT_W - 18*mm])
        tbl.setStyle(TableStyle([
            ('BACKGROUND',    (0,0), (0,0), TEAL_LIGHT),
            ('BACKGROUND',    (1,0), (1,0), BG_WHITE),
            ('BOX',           (0,0), (-1,-1), 0.6, BORDER),
            ('LINEAFTER',     (0,0), (0,-1), 0.5, BORDER),
            ('TOPPADDING',    (0,0), (-1,-1), 6),
            ('BOTTOMPADDING', (0,0), (-1,-1), 6),
            ('LEFTPADDING',   (0,0), (-1,-1), 7),
            ('VALIGN',        (0,0), (-1,-1), 'TOP'),
            ('TEXTCOLOR',     (0,0), (0,-1), TEAL),
        ]))
        story += [tbl, Spacer(1, 3)]

    story.append(PageBreak())

    # ── 6. API REFERENCE ────────────────────────────────────────────────────
    story += [section_header("6. API Reference", s)]
    story += [
        Paragraph("All endpoints are available at <b>http://localhost:8000</b>. "
                  "Interactive docs: /docs (Swagger UI).", s['body']),
        Spacer(1, 5),
        api_table([
            ("/api/simulate/quick",     "POST", "Main simulation endpoint. Accepts HouseholdProfile JSON, returns 30-day simulation + strategy comparison + AI city profile."),
            ("/api/geocode",            "GET",  "Search any city globally via Open-Meteo geocoding. ?q=Chennai"),
            ("/api/weather/{city_id}",  "GET",  "Live weather (temperature + 7-day forecast) for a known city."),
            ("/api/weather/coords/live","GET",  "Live weather by lat/lon. ?lat=13.08&lon=80.27"),
            ("/api/ai/insights",        "POST", "Gemini AI crisis advice with Google Search grounding."),
            ("/api/ai/chat",            "POST", "Multi-turn Gemini chatbot with simulation context."),
            ("/api/ai/test",            "GET",  "Health-check: verifies Gemini API key is reachable."),
            ("/api/cities",             "GET",  "List all pre-configured cities with metadata."),
            ("/api/alternatives/{id}",  "GET",  "Alternative water sources and pricing for a city."),
            ("/api/preparedness/{id}",  "GET",  "Preparedness score, gap analysis, action items."),
            ("/api/report",             "GET",  "Download this PDF report."),
        ], s),
    ]

    # ── 7. SIMULATION SCIENCE ────────────────────────────────────────────────
    story += [Spacer(1, 6), section_header("7. Simulation Science", s)]
    story += [
        Paragraph("Monte Carlo — Vectorised Formula", s['h2']),
        Paragraph(
            "The naive approach (Python loop over 300 simulations, 120 days each) took 30+ seconds. "
            "The current implementation uses a closed-form analytical solution:",
            s['body']),
        Paragraph("d = ln( need / (S0 * evap + need) ) / ln(1 - evap)", s['code']),
        Paragraph(
            "Where: <b>S0</b> = initial storage, <b>evap</b> = 0.012 (daily evaporation rate), "
            "<b>need</b> = daily demand (varies ±10% per simulation run). "
            "Result: 300 simulations complete in under 1 ms via NumPy vectorisation.",
            s['body']),
        Spacer(1, 4),
        Paragraph("Consumption Model", s['h2']),
        kv_table([
            ("Adults",     "Base 55L/day at 35°C, scaled by temperature: +0.5L per °C above 25°C"),
            ("Children",   "65% of adult base consumption"),
            ("Elderly",    "75% of adult base consumption"),
            ("Infants",    "35L/day fixed (formula + hygiene)"),
            ("Rationing",  "None=1.0x, Mild=0.75x, Moderate=0.55x, Severe=0.40x multiplier"),
            ("RO unit",    "+8L/day overhead for membrane flushing"),
        ], s),
        Spacer(1, 4),
        Paragraph("Health Model", s['h2']),
        Paragraph(
            "Dehydration risk rises exponentially below 3L/person/day. "
            "Illness risk follows a cumulative smoothed model: "
            "cumulative = cumulative * 0.90 + base_risk * 0.10. "
            "Hygiene score drops linearly below 15L/person/day.",
            s['body']),
    ]
    story.append(PageBreak())

    # ── 8. FILE STRUCTURE ───────────────────────────────────────────────────
    story += [section_header("8. File Structure", s)]
    tree = [
        ("Day0WEP/",                    "Project root"),
        ("  backend/",                  "Python FastAPI backend"),
        ("    main.py",                 "API routes, Gemini, Open-Meteo, simulation entry"),
        ("    engine/",                 "Simulation modules: simulator, monte_carlo, consumption, alternatives"),
        ("    models/",                 "Pydantic models: household, simulation"),
        ("    data/",                   "cities.json, crises.json"),
        ("    .env",                    "GEMINI_API_KEY (not committed to git)"),
        ("  src/",                      "React/TypeScript frontend"),
        ("    pages/",                  "Dashboard, Simulation, Onboarding, ActionCenter, CrisisIntel, Alternatives"),
        ("    components/3d/",          "Three.js water tank scene"),
        ("    components/ui/",          "GaugeRing, StorageBreakdown, GeminiChat, AnimatedNumber, etc."),
        ("    components/layout/",      "Layout, Sidebar"),
        ("    store/useStore.ts",        "Zustand global state"),
        ("    lib/api.ts",              "Axios API client"),
        ("  generate_report.py",        "This PDF generator"),
        ("  start.bat",                 "One-click launcher (backend + frontend)"),
    ]
    tbl = Table([[
        Paragraph(f[0], s['code']),
        Paragraph(f[1], s['body']),
    ] for f in tree], colWidths=[80*mm, CONTENT_W - 80*mm])
    tbl.setStyle(TableStyle([
        ('BACKGROUND',    (0, 0), (-1, -1), BG_PANEL),
        ('ROWBACKGROUNDS',(0, 0), (-1, -1), [BG_PANEL, BG_WHITE]),
        ('BOX',           (0, 0), (-1, -1), 0.6, BORDER),
        ('LINEBELOW',     (0, 0), (-1, -2), 0.2, BORDER_GRAY),
        ('TOPPADDING',    (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING',   (0, 0), (-1, -1), 6),
        ('VALIGN',        (0, 0), (-1, -1), 'TOP'),
    ]))
    story.append(tbl)
    story.append(PageBreak())

    # ── 9. TROUBLESHOOTING ──────────────────────────────────────────────────
    story += [section_header("9. Troubleshooting", s)]
    issues = [
        ("Simulation times out",
         "Backend not running, or running old version without NumPy vectorisation. "
         "Restart: cd backend && python main.py"),
        ("Gemini returns rate limit (429)",
         "Free tier allows ~15 requests/min. The backend auto-retries with 4s + 7s backoff. "
         "If it still fails, wait 1 minute. The chat and insights share the same quota."),
        ("City not found in search",
         "Open-Meteo geocoding covers most cities globally. Try the full city name or "
         "include the state (e.g., 'Chennai Tamil Nadu')."),
        ("Live temperature badge missing",
         "Open-Meteo call failed or city has no lat/lon. The simulation still runs using "
         "historical monthly averages from the city profile."),
        ("PDF Report button shows Failed",
         "Backend not running. Ensure python main.py is running on port 8000."),
        ("Chatbot not responding",
         "Check GEMINI_API_KEY in backend/.env. Run http://localhost:8000/api/ai/test to verify."),
        ("3D tank not rendering",
         "WebGL must be enabled in the browser. Check: chrome://gpu or about:support in Firefox."),
        ("Port 5173 already in use",
         "Vite auto-switches to 5174. Check the terminal output for the correct URL."),
    ]
    for prob, sol in issues:
        row = [[
            Paragraph(prob, s['h3']),
            Paragraph(sol, s['body']),
        ]]
        tbl = Table(row, colWidths=[65*mm, CONTENT_W - 65*mm])
        tbl.setStyle(TableStyle([
            ('BACKGROUND',    (0,0), (0,0), AMBER_LIGHT),
            ('BACKGROUND',    (1,0), (1,0), BG_WHITE),
            ('BOX',           (0,0), (-1,-1), 0.6, colors.HexColor("#fde68a")),
            ('LINEAFTER',     (0,0), (0,-1), 0.5, colors.HexColor("#fcd34d")),
            ('TOPPADDING',    (0,0), (-1,-1), 6),
            ('BOTTOMPADDING', (0,0), (-1,-1), 6),
            ('LEFTPADDING',   (0,0), (-1,-1), 7),
            ('VALIGN',        (0,0), (-1,-1), 'TOP'),
        ]))
        story += [tbl, Spacer(1, 3)]

    # ── BACK COVER ──────────────────────────────────────────────────────────
    story += [
        PageBreak(),
        Spacer(1, 30 * mm),
        HRFlowable(width="80%", thickness=2, color=TEAL_MED,
                   spaceAfter=10, hAlign='CENTER'),
        Paragraph("Day Zero — Water Emergency Planner", s['cover_title']),
        Spacer(1, 4),
        Paragraph("Built with React, FastAPI, NumPy, Three.js, and Gemini AI", s['cover_sub']),
        Spacer(1, 3),
        Paragraph(f"Report generated {date.today().strftime('%B %d, %Y')}", s['caption']),
        Spacer(1, 10 * mm),
        HRFlowable(width="80%", thickness=1, color=BORDER_GRAY,
                   spaceAfter=6, hAlign='CENTER'),
    ]

    return story


# ── Generate ──────────────────────────────────────────────────────────────────
def generate() -> str:
    doc = SimpleDocTemplate(
        OUTPUT,
        pagesize=A4,
        leftMargin=MARGIN, rightMargin=MARGIN,
        topMargin=16 * mm, bottomMargin=16 * mm,
        title="Day Zero WEP — Project Report",
        author="Day Zero WEP",
    )
    styles = build_styles()
    story  = build_story(styles)
    doc.build(story, onFirstPage=_draw_page, onLaterPages=_draw_page)
    print(f"Report saved -> {OUTPUT}")
    return OUTPUT


if __name__ == "__main__":
    path = generate()
    import subprocess
    subprocess.Popen(["start", "", path], shell=True)

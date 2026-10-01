"""Genera Nutrogan-TFI-Expo-2025.pptx (16:9 editable)."""
from pathlib import Path
from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN
from pptx.enum.shapes import MSO_SHAPE
from PIL import Image

ROOT = Path(__file__).resolve().parent
ASSETS = ROOT / "assets"
LIVE = ASSETS / "live"
OUT = ROOT / "Nutrogan-TFI-Expo-2025.pptx"

W, H = Inches(13.333), Inches(7.5)
LIME = RGBColor(0x39, 0xFF, 0x14)
CYAN = RGBColor(0x00, 0xE5, 0xFF)
WHITE = RGBColor(0xFF, 0xFF, 0xFF)
MUTED = RGBColor(0xA8, 0xB0, 0xA3)
DARK = RGBColor(0x07, 0x08, 0x07)
FOOT = RGBColor(0xF2, 0xF2, 0xF2)


def set_run(run, size=18, bold=False, color=WHITE, name="Calibri"):
    run.font.size = Pt(size)
    run.font.bold = bold
    run.font.color.rgb = color
    run.font.name = name


def add_bg(slide, prs):
    shape = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, prs.slide_width, prs.slide_height)
    shape.fill.solid()
    shape.fill.fore_color.rgb = DARK
    shape.line.fill.background()
    bg = ASSETS / "bg-brand.png"
    if bg.exists():
        slide.shapes.add_picture(str(bg), 0, 0, width=prs.slide_width, height=prs.slide_height)
        veil = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, prs.slide_width, prs.slide_height)
        veil.fill.solid()
        veil.fill.fore_color.rgb = DARK
        veil.line.fill.background()
        # approximate darken: leave veil; user can edit. Better: skip veil, use dark only
        veil._element.getparent().remove(veil._element)


def footer(slide, prs, label=""):
    y = Inches(6.85)
    bar = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, y, prs.slide_width, Inches(0.65))
    bar.fill.solid()
    bar.fill.fore_color.rgb = FOOT
    bar.line.fill.background()
    x = Inches(3.2)
    utn, ced, mark = ASSETS / "utn-badge.jpg", ASSETS / "cedeva-badge.jpg", ASSETS / "nutrogan-mark.png"
    if utn.exists():
        slide.shapes.add_picture(str(utn), x, y + Inches(0.14), height=Inches(0.36))
        x += Inches(3.0)
    if ced.exists():
        slide.shapes.add_picture(str(ced), x, y + Inches(0.05), height=Inches(0.55))
        x += Inches(1.5)
    if mark.exists():
        slide.shapes.add_picture(str(mark), x, y + Inches(0.1), height=Inches(0.45))
        x += Inches(1.2)
    if label:
        box = slide.shapes.add_textbox(x + Inches(0.2), y + Inches(0.2), Inches(3.5), Inches(0.3))
        p = box.text_frame.paragraphs[0]
        r = p.add_run()
        r.text = label
        set_run(r, 11, True, RGBColor(0x22, 0x22, 0x22))


def centered_text(slide, top, height, text, size, bold=False, color=WHITE):
    box = slide.shapes.add_textbox(Inches(1.0), top, Inches(11.3), height)
    tf = box.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.alignment = PP_ALIGN.CENTER
    for i, line in enumerate(text.split("\n")):
        para = p if i == 0 else tf.add_paragraph()
        para.alignment = PP_ALIGN.CENTER
        run = para.add_run()
        run.text = line
        set_run(run, size, bold, color)


def title_block(slide, eyebrow, title, subtitle=None):
    centered_text(slide, Inches(0.35), Inches(0.35), eyebrow.upper(), 11, True, LIME)
    centered_text(slide, Inches(0.7), Inches(0.65), title, 30, True, WHITE)
    if subtitle:
        centered_text(slide, Inches(1.35), Inches(0.45), subtitle, 14, False, MUTED)


def add_shot_contain(slide, path, left, top, width, height):
    if not path.exists():
        return
    frame = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, width, height)
    frame.fill.solid()
    frame.fill.fore_color.rgb = RGBColor(0x0C, 0x0E, 0x0C)
    frame.line.color.rgb = LIME
    im = Image.open(path)
    iw, ih = im.size
    max_w, max_h = width.inches - 0.16, height.inches - 0.16
    aspect = iw / ih
    if max_w / max_h > aspect:
        disp_h, disp_w = max_h, max_h * aspect
    else:
        disp_w, disp_h = max_w, max_w / aspect
    x = left + Inches((width.inches - disp_w) / 2)
    y = top + Inches((height.inches - disp_h) / 2)
    slide.shapes.add_picture(str(path), x, y, width=Inches(disp_w), height=Inches(disp_h))


def card(slide, left, top, w, h, title, body, accent=LIME):
    shape = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, w, h)
    shape.fill.solid()
    shape.fill.fore_color.rgb = RGBColor(0x14, 0x16, 0x14)
    shape.line.color.rgb = accent
    tb = slide.shapes.add_textbox(left + Inches(0.12), top + Inches(0.2), w - Inches(0.24), h - Inches(0.3))
    tf = tb.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.alignment = PP_ALIGN.CENTER
    r = p.add_run()
    r.text = title
    set_run(r, 14, True, accent)
    p2 = tf.add_paragraph()
    p2.alignment = PP_ALIGN.CENTER
    r2 = p2.add_run()
    r2.text = body
    set_run(r2, 12, False, MUTED)


def build():
    prs = Presentation()
    prs.slide_width = W
    prs.slide_height = H
    blank = prs.slide_layouts[6]

    # 1 Cover
    s = prs.slides.add_slide(blank)
    add_bg(s, prs)
    mark = ASSETS / "nutrogan-mark.png"
    if mark.exists():
        s.shapes.add_picture(str(mark), Inches(6.05), Inches(0.85), height=Inches(1.15))
    # partner badges centered
    utn, ced = ASSETS / "utn-badge.jpg", ASSETS / "cedeva-badge.jpg"
    if utn.exists():
        s.shapes.add_picture(str(utn), Inches(4.0), Inches(2.15), height=Inches(0.42))
    if ced.exists():
        s.shapes.add_picture(str(ced), Inches(8.3), Inches(2.0), height=Inches(0.7))
    centered_text(s, Inches(2.85), Inches(0.35), "EXPO TFI 2025 · UTN FRRE EXTENSIÓN FORMOSA", 12, True, LIME)
    centered_text(s, Inches(3.25), Inches(0.8), "nutrogan", 44, True, WHITE)
    centered_text(
        s,
        Inches(4.1),
        Inches(1.0),
        "Plataforma integral de gestión y rentabilidad ganadera\nOffline-first  ·  GIS  ·  Edge AI",
        16,
        False,
        MUTED,
    )
    centered_text(
        s,
        Inches(5.3),
        Inches(0.8),
        "Duarte  ·  Ascona  ·  Amarilla\nEgresados 2025  ·  Asesoramiento técnico CEDEVA Laguna Yema",
        14,
        False,
        CYAN,
    )
    footer(s, prs, "www.nutrogan.site")

    # 2 Equipo
    s = prs.slides.add_slide(blank)
    add_bg(s, prs)
    title_block(s, "Equipo G.21 · Egresados 2025", "Quiénes lo construimos", "Tec. Univ. en Programación — UTN FRRE Extensión Formosa")
    team = [
        ("Fabricio N. Duarte", "Tech Lead · Frontend & IA", "Legajo 29.154", ASSETS / "duarte.jpg"),
        ("Enzo A. Ascona", "Backend · Data & Negocio", "Legajo 29.134", ASSETS / "ascona.jpg"),
        ("Sebastián E. Amarilla", "DevOps · Infra & QA", "Legajo 29.132", ASSETS / "amarilla.jpg"),
    ]
    for i, (name, role, leg, img) in enumerate(team):
        left = Inches(1.4 + i * 3.7)
        shape = s.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, Inches(2.15), Inches(3.4), Inches(4.3))
        shape.fill.solid()
        shape.fill.fore_color.rgb = RGBColor(0x14, 0x16, 0x14)
        shape.line.color.rgb = LIME
        if img.exists():
            s.shapes.add_picture(str(img), left + Inches(0.95), Inches(2.45), width=Inches(1.5), height=Inches(1.5))
        tb = s.shapes.add_textbox(left + Inches(0.15), Inches(4.15), Inches(3.1), Inches(2.0))
        tf = tb.text_frame
        tf.word_wrap = True
        p = tf.paragraphs[0]
        p.alignment = PP_ALIGN.CENTER
        r = p.add_run()
        r.text = role
        set_run(r, 11, True, LIME)
        p2 = tf.add_paragraph()
        p2.alignment = PP_ALIGN.CENTER
        r2 = p2.add_run()
        r2.text = name
        set_run(r2, 16, True, WHITE)
        p3 = tf.add_paragraph()
        p3.alignment = PP_ALIGN.CENTER
        r3 = p3.add_run()
        r3.text = leg
        set_run(r3, 12, False, MUTED)
    footer(s, prs, "Equipo")

    # 3 Problema
    s = prs.slides.add_slide(blank)
    add_bg(s, prs)
    title_block(s, "Contexto · CEDEVA Formosa", "¿Por qué Nutrogan?", "Salir de la gestión a ciegas en el NEA")
    for i, (n, t, b) in enumerate(
        [
            ("01", "Aislamiento digital", "Sin 4G en el potrero, el sistema debe funcionar igual."),
            ("02", "Informalidad", "Papel y ojo: sin GDPV ni historial confiable."),
            ("03", "Fuga de valor", "Sin pastura, agua y costos, se erosiona la rentabilidad."),
        ]
    ):
        card(s, Inches(1.5 + i * 3.6), Inches(2.5), Inches(3.3), Inches(3.5), f"{n}  {t}", b)
    footer(s, prs, "Problemática")

    # 4-8 screenshots
    shots = [
        ("Producto en producción", "Panel de control", "Mapa · carga animal · modo campo", "01-dashboard.jpg", "Dashboard"),
        ("Inteligencia de negocio", "Reportes que deciden", "Margen · GDPV · stock · PDF", "02-reportes.jpg", "Reportes"),
        ("Módulos", "Recursos del establecimiento", "Potreros · Despensa · Agua · NDVI", "03-recursos.jpg", "Recursos"),
        ("Operación", "Alertas al equipo", "Semáforo · archivo · envío", "04-alertas.jpg", "Alertas"),
        ("UX de campo", "Manos enguantadas", "Botones XL · sync · flujos cortos", "05-campo.jpg", "Modo campo"),
    ]
    for eyebrow, title, sub, file, foot in shots:
        s = prs.slides.add_slide(blank)
        add_bg(s, prs)
        title_block(s, eyebrow, title, sub)
        path = LIVE / file
        if file == "05-campo.jpg":
            add_shot_contain(s, path, Inches(4.0), Inches(1.95), Inches(5.3), Inches(4.55))
        else:
            add_shot_contain(s, path, Inches(1.9), Inches(2.0), Inches(9.5), Inches(4.5))
        footer(s, prs, foot)

    # 9 Arquitectura
    s = prs.slides.add_slide(blank)
    add_bg(s, prs)
    title_block(s, "Arquitectura", "Stack para el potrero", "PWA robusta · BaaS seguro · CI/CD")
    stack = [
        ("Vue 3 + Quasar", "PWA instalable y UI táctica"),
        ("Pinia + IndexedDB", "Estado y cola offline"),
        ("Supabase", "Postgres · Auth · RLS · Edges"),
        ("Leaflet + NDVI", "GIS y vigor de pastura"),
        ("TensorFlow.js", "Edge AI · condición corporal"),
        ("Docker + CI/CD", "Vitest · Cypress · GitLab"),
    ]
    for i, (t, b) in enumerate(stack):
        r, c = divmod(i, 3)
        card(s, Inches(1.5 + c * 3.6), Inches(2.2 + r * 2.05), Inches(3.3), Inches(1.8), t, b, CYAN if i % 2 else LIME)
    footer(s, prs, "Arquitectura")

    # 10 Offline
    s = prs.slides.add_slide(blank)
    add_bg(s, prs)
    title_block(s, "Offline-first", "Soberanía operativa", "Operario → Cola local → Nube")
    for i, (t, b) in enumerate(
        [
            ("1 · Operario", "CC, agua, pesos y movimientos sin red"),
            ("2 · Cola local", "IndexedDB con pendientes visibles"),
            ("3 · Nube", "Sync automático a Supabase"),
        ]
    ):
        card(s, Inches(1.5 + i * 3.6), Inches(2.7), Inches(3.3), Inches(3.2), t, b)
    footer(s, prs, "Offline")

    # 11 Método
    s = prs.slides.add_slide(blank)
    add_bg(s, prs)
    title_block(s, "Ingeniería", "Cómo lo llevamos adelante", "Disciplina profesional en un TFI con deploy real")
    for i, (t, b) in enumerate(
        [
            ("Scrum + Jira", "Épicas, backlog y entregas con valor de campo"),
            ("GitFlow", "main / develop / feature · Conventional Commits"),
            ("QA + DevOps", "Vitest · Cypress · Docker · pipeline 5 etapas"),
        ]
    ):
        card(s, Inches(1.5 + i * 3.6), Inches(2.6), Inches(3.3), Inches(3.3), t, b)
    footer(s, prs, "Metodología")

    # 12 Cierre
    s = prs.slides.add_slide(blank)
    add_bg(s, prs)
    if mark.exists():
        s.shapes.add_picture(str(mark), Inches(6.1), Inches(1.2), height=Inches(1.05))
    centered_text(s, Inches(2.5), Inches(0.9), "Un TFI que corre en el campo", 32, True, WHITE)
    centered_text(
        s,
        Inches(3.5),
        Inches(1.6),
        "Problema del NEA · CEDEVA · ingeniería seria · software en producción\n"
        "UTN FRRE Extensión Formosa · Egresados 2025\n\n¿Preguntas?",
        16,
        False,
        MUTED,
    )
    centered_text(s, Inches(5.5), Inches(0.5), "MUCHAS GRACIAS", 18, True, LIME)
    footer(s, prs, "Gracias")

    prs.save(OUT)
    print("OK", OUT)


if __name__ == "__main__":
    build()

#!/usr/bin/env python3
"""Build the complete production logo kit for AutoTray-Router Concept A (Isometric Ladder Tray).

Generates:
1. Master SVGs in branding/dist/svg/:
   - autotray-symbol-color.svg
   - autotray-symbol-dark-mode.svg
   - autotray-symbol-black.svg
   - autotray-symbol-white.svg
   - autotray-symbol-mono.svg
   - autotray-symbol-small.svg (16px micro-cut for favicons)
   - autotray-lockup-horizontal-color.svg (& dark, black, white)
   - autotray-lockup-stacked-color.svg (& dark, black, white)
2. Production Web Icons in branding/dist/web/:
   - favicon.ico (16/32/48 multi-res)
   - apple-touch-icon.png (180x180)
   - icon-192.png, icon-512.png, maskable-512.png
   - site.webmanifest, head-snippet.html
3. High-res transparent PNGs in branding/dist/png/ (1024x1024)
4. Client Presentation Board in branding/dist/presentation/ (presentation.html + slide PNGs)
5. Brand Guidelines in branding/dist/BRAND_GUIDELINES.md
"""
import json
import math
import os
import shutil
import subprocess
import sys

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BRANDING_DIR = os.path.join(BASE_DIR, "branding")
DIST_DIR = os.path.join(BRANDING_DIR, "dist")
SVG_DIR = os.path.join(DIST_DIR, "svg")
PNG_DIR = os.path.join(DIST_DIR, "png")
WEB_DIR = os.path.join(DIST_DIR, "web")
PRES_DIR = os.path.join(DIST_DIR, "presentation")
SLIDES_DIR = os.path.join(PRES_DIR, "slides")

for d in (SVG_DIR, PNG_DIR, WEB_DIR, PRES_DIR, SLIDES_DIR):
    os.makedirs(d, exist_ok=True)

SKILL_SCRIPTS = r"C:\Users\jihad.kherfan.MCGI\.gemini\config\skills\logo-design\scripts"

# Brand Palette
CLR_STEEL = "#0F172A"       # Primary Dark / Carbon Slate
CLR_STEEL_MID = "#334155"   # Slate 700 / Rail Web & Rung Faces
CLR_STEEL_LGT = "#64748B"   # Slate 500 / Rail Top Highlight
CLR_AMBER = "#E65100"       # Brand Accent / Electric Amber (Control)
CLR_AMBER_BRIGHT = "#FF6B00"# Safety Orange Glow
CLR_BLUE = "#2563EB"        # Power Blue
CLR_TEAL = "#059669"        # Data Emerald
CLR_WHITE = "#FFFFFF"
CLR_BLACK = "#000000"

sys.path.insert(0, BRANDING_DIR)
import build_concepts  # for vector wordmark generator


# -----------------------------------------------------------------------------
# 1. 3D Isometric Geometry Generators
# -----------------------------------------------------------------------------
def iso(u, v, z, cx=128, cy=132):
    cos30 = math.sqrt(3) / 2
    sin30 = 0.5
    x = cx + (u - v) * cos30
    y = cy + (u + v) * sin30 - z
    return round(x, 2), round(y, 2)


def pts_str(pts):
    return " ".join(f"{x},{y}" for x, y in pts)


def build_concept_a_symbol(mode="color"):
    """Modes:
    - 'color': Full plant palette (Slate rails, Amber/Blue/Green cables)
    - 'dark': Inverted rails (White/Slate-300) with luminous cables
    - 'black': Pure 1-color black with negative space cut lines
    - 'white': Pure 1-color white with negative space cut lines
    - 'mono': Single-color Amber
    """
    L_min, L_max = -85, 85
    W_far = 42
    W_near = -42
    H_rail = 24
    Flange_w = 8

    p_far_web = [iso(L_min, W_far, 0), iso(L_max, W_far, 0), iso(L_max, W_far, H_rail), iso(L_min, W_far, H_rail)]
    p_far_flange = [iso(L_min, W_far, H_rail), iso(L_max, W_far, H_rail), iso(L_max, W_far - Flange_w, H_rail), iso(L_min, W_far - Flange_w, H_rail)]
    p_near_web = [iso(L_min, W_near, 0), iso(L_max, W_near, 0), iso(L_max, W_near, H_rail), iso(L_min, W_near, H_rail)]
    p_near_flange = [iso(L_min, W_near, H_rail), iso(L_max, W_near, H_rail), iso(L_max, W_near + Flange_w, H_rail), iso(L_min, W_near + Flange_w, H_rail)]
    p_near_lip = [iso(L_min, W_near, 0), iso(L_max, W_near, 0), iso(L_max, W_near + Flange_w, 0), iso(L_min, W_near + Flange_w, 0)]

    rung_w = 6
    rung_h = 3
    rungs = []
    rung_positions = [-60, -30, 0, 30, 60]

    for u_pos in rung_positions:
        r_top = [
            iso(u_pos - rung_w/2, W_near, rung_h),
            iso(u_pos + rung_w/2, W_near, rung_h),
            iso(u_pos + rung_w/2, W_far, rung_h),
            iso(u_pos - rung_w/2, W_far, rung_h)
        ]
        r_front = [
            iso(u_pos - rung_w/2, W_near, 0),
            iso(u_pos - rung_w/2, W_near, rung_h),
            iso(u_pos - rung_w/2, W_far, rung_h),
            iso(u_pos - rung_w/2, W_far, 0)
        ]
        rungs.append((r_top, r_front))

    cable_defs = [
        (18, 7, CLR_AMBER, "#FFA726"),
        (-2, 6, CLR_BLUE, "#60A5FA"),
        (-20, 5, CLR_TEAL, "#34D399")
    ]
    cables = []
    for v_c, rad, col_dark, col_light in cable_defs:
        p_body = [
            iso(L_min - 5, v_c + rad, rung_h),
            iso(L_max + 5, v_c + rad, rung_h),
            iso(L_max + 5, v_c - rad, rung_h),
            iso(L_min - 5, v_c - rad, rung_h)
        ]
        p_hi = [
            iso(L_min - 5, v_c + rad*0.3, rung_h + rad*0.8),
            iso(L_max + 5, v_c + rad*0.3, rung_h + rad*0.8),
            iso(L_max + 5, v_c - rad*0.3, rung_h + rad*0.8),
            iso(L_min - 5, v_c - rad*0.3, rung_h + rad*0.8)
        ]
        cables.append((p_body, p_hi, col_dark, col_light))

    if mode == "color":
        c_far_web = CLR_STEEL_MID
        c_far_flange = CLR_STEEL
        c_rung_top = CLR_STEEL_MID
        c_rung_front = CLR_STEEL
        c_near_web = CLR_STEEL
        c_near_flange = CLR_STEEL_LGT
        c_near_lip = CLR_STEEL_MID

        rungs_svg = "".join(f'<polygon points="{pts_str(t)}" fill="{c_rung_top}"/><polygon points="{pts_str(f)}" fill="{c_rung_front}"/>' for t, f in rungs)
        cables_svg = "".join(f'<polygon points="{pts_str(b)}" fill="{d}"/><polygon points="{pts_str(h)}" fill="{l}"/>' for b, h, d, l in cables)

        body = f"""  <!-- Far Side Rail Web -->
  <polygon points="{pts_str(p_far_web)}" fill="{c_far_web}"/>
  <!-- Far Side Rail Top Flange -->
  <polygon points="{pts_str(p_far_flange)}" fill="{c_far_flange}"/>

  <!-- Transverse Welded Ladder Rungs -->
  {rungs_svg}

  <!-- Routed Cables laying across ladder rungs -->
  {cables_svg}

  <!-- Near Side Rail Web -->
  <polygon points="{pts_str(p_near_web)}" fill="{c_near_web}"/>
  <!-- Near Side Rail Top Flange -->
  <polygon points="{pts_str(p_near_flange)}" fill="{c_near_flange}"/>
  <!-- Near Side Rail Bottom Return Flange -->
  <polygon points="{pts_str(p_near_lip)}" fill="{c_near_lip}"/>"""

    elif mode == "dark":
        c_far_web = "#FFFFFF"
        c_far_flange = "#CBD5E1"
        c_rung_top = "#FFFFFF"
        c_rung_front = "#CBD5E1"
        c_near_web = "#CBD5E1"
        c_near_flange = "#FFFFFF"
        c_near_lip = "#FFFFFF"

        rungs_svg = "".join(f'<polygon points="{pts_str(t)}" fill="{c_rung_top}"/><polygon points="{pts_str(f)}" fill="{c_rung_front}"/>' for t, f in rungs)
        cables_svg = []
        dark_cables = [
            (cables[0][0], cables[0][1], "#FF6B00", "#FFA726"),
            (cables[1][0], cables[1][1], "#3B82F6", "#60A5FA"),
            (cables[2][0], cables[2][1], "#10B981", "#34D399")
        ]
        cables_svg = "".join(f'<polygon points="{pts_str(b)}" fill="{d}"/><polygon points="{pts_str(h)}" fill="{l}"/>' for b, h, d, l in dark_cables)

        body = f"""  <!-- Far Side Rail Web -->
  <polygon points="{pts_str(p_far_web)}" fill="{c_far_web}"/>
  <!-- Far Side Rail Top Flange -->
  <polygon points="{pts_str(p_far_flange)}" fill="{c_far_flange}"/>

  <!-- Transverse Welded Ladder Rungs -->
  {rungs_svg}

  <!-- Routed Cables laying across ladder rungs -->
  {cables_svg}

  <!-- Near Side Rail Web -->
  <polygon points="{pts_str(p_near_web)}" fill="{c_near_web}"/>
  <!-- Near Side Rail Top Flange -->
  <polygon points="{pts_str(p_near_flange)}" fill="{c_near_flange}"/>
  <!-- Near Side Rail Bottom Return Flange -->
  <polygon points="{pts_str(p_near_lip)}" fill="{c_near_lip}"/>"""

    elif mode in ("black", "white", "mono"):
        fg = CLR_BLACK if mode == "black" else (CLR_WHITE if mode == "white" else CLR_AMBER)
        cut = CLR_WHITE if mode == "black" else (CLR_BLACK if mode == "white" else "#FFFFFF")

        # In 1-color silhouette, we use clean negative-space separator cuts (stroke)
        # so every rail, rung, and cable remains distinct!
        rungs_svg = "".join(f'<polygon points="{pts_str(t)}" fill="{fg}" stroke="{cut}" stroke-width="1.5"/><polygon points="{pts_str(f)}" fill="{fg}"/>' for t, f in rungs)
        cables_svg = "".join(f'<polygon points="{pts_str(b)}" fill="{fg}" stroke="{cut}" stroke-width="2"/>' for b, h, d, l in cables)

        body = f"""  <!-- Far Side Rail Web -->
  <polygon points="{pts_str(p_far_web)}" fill="{fg}"/>
  <!-- Far Side Rail Top Flange -->
  <polygon points="{pts_str(p_far_flange)}" fill="{fg}" stroke="{cut}" stroke-width="1.5"/>

  <!-- Transverse Welded Ladder Rungs -->
  {rungs_svg}

  <!-- Routed Cables laying across ladder rungs -->
  {cables_svg}

  <!-- Near Side Rail Web -->
  <polygon points="{pts_str(p_near_web)}" fill="{fg}" stroke="{cut}" stroke-width="2"/>
  <!-- Near Side Rail Top Flange -->
  <polygon points="{pts_str(p_near_flange)}" fill="{fg}" stroke="{cut}" stroke-width="1.5"/>
  <!-- Near Side Rail Bottom Return Flange -->
  <polygon points="{pts_str(p_near_lip)}" fill="{fg}" stroke="{cut}" stroke-width="1.5"/>"""

    return body


def build_concept_a_small():
    """Simplified 16px/32px micro-cut for favicons:
    - 3 prominent rungs (u = -45, 0, 45)
    - Heavier rung width (10px) and rail flanges (10px)
    - 2 bold cables (Amber & Blue) with high contrast
    """
    L_min, L_max = -80, 80
    W_far = 44
    W_near = -44
    H_rail = 26
    Flange_w = 11

    p_far_web = [iso(L_min, W_far, 0), iso(L_max, W_far, 0), iso(L_max, W_far, H_rail), iso(L_min, W_far, H_rail)]
    p_far_flange = [iso(L_min, W_far, H_rail), iso(L_max, W_far, H_rail), iso(L_max, W_far - Flange_w, H_rail), iso(L_min, W_far - Flange_w, H_rail)]
    p_near_web = [iso(L_min, W_near, 0), iso(L_max, W_near, 0), iso(L_max, W_near, H_rail), iso(L_min, W_near, H_rail)]
    p_near_flange = [iso(L_min, W_near, H_rail), iso(L_max, W_near, H_rail), iso(L_max, W_near + Flange_w, H_rail), iso(L_min, W_near + Flange_w, H_rail)]
    p_near_lip = [iso(L_min, W_near, 0), iso(L_max, W_near, 0), iso(L_max, W_near + Flange_w, 0), iso(L_min, W_near + Flange_w, 0)]

    rung_w = 11
    rung_h = 4
    rungs_svg = []
    for u_pos in [-45, 0, 45]:
        r_top = [
            iso(u_pos - rung_w/2, W_near, rung_h),
            iso(u_pos + rung_w/2, W_near, rung_h),
            iso(u_pos + rung_w/2, W_far, rung_h),
            iso(u_pos - rung_w/2, W_far, rung_h)
        ]
        r_front = [
            iso(u_pos - rung_w/2, W_near, 0),
            iso(u_pos - rung_w/2, W_near, rung_h),
            iso(u_pos - rung_w/2, W_far, rung_h),
            iso(u_pos - rung_w/2, W_far, 0)
        ]
        rungs_svg.append(f'<polygon points="{pts_str(r_top)}" fill="{CLR_STEEL_MID}"/>')
        rungs_svg.append(f'<polygon points="{pts_str(r_front)}" fill="{CLR_STEEL}"/>')

    # 2 bold cables
    cables_svg = []
    for v_c, rad, col in [(14, 9, CLR_AMBER), (-14, 9, CLR_BLUE)]:
        p_body = [
            iso(L_min - 4, v_c + rad, rung_h),
            iso(L_max + 4, v_c + rad, rung_h),
            iso(L_max + 4, v_c - rad, rung_h),
            iso(L_min - 4, v_c - rad, rung_h)
        ]
        cables_svg.append(f'<polygon points="{pts_str(p_body)}" fill="{col}"/>')

    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256" role="img" aria-labelledby="title-sym-small">
  <title id="title-sym-small">AutoTray-Router — Symbol (16px Favicon Micro-Cut)</title>
  
  <polygon points="{pts_str(p_far_web)}" fill="{CLR_STEEL_MID}"/>
  <polygon points="{pts_str(p_far_flange)}" fill="{CLR_STEEL}"/>

  {"".join(rungs_svg)}
  {"".join(cables_svg)}

  <polygon points="{pts_str(p_near_web)}" fill="{CLR_STEEL}"/>
  <polygon points="{pts_str(p_near_flange)}" fill="{CLR_STEEL_LGT}"/>
  <polygon points="{pts_str(p_near_lip)}" fill="{CLR_STEEL_MID}"/>
</svg>"""
    return svg


# -----------------------------------------------------------------------------
# 2. Master SVG Builders
# -----------------------------------------------------------------------------
def write_svg(filename, content):
    path = os.path.join(SVG_DIR, filename)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content.strip() + "\n")
    return path


def build_all_svgs():
    print("Building master SVGs for Concept A...")
    # 1. Standalone Symbols
    write_svg("autotray-symbol-color.svg", f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256" role="img" aria-labelledby="title-sym-col">
  <title id="title-sym-col">AutoTray-Router — Symbol (Full Color)</title>
{build_concept_a_symbol("color")}
</svg>""")

    write_svg("autotray-symbol-dark-mode.svg", f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256" role="img" aria-labelledby="title-sym-dark">
  <title id="title-sym-dark">AutoTray-Router — Symbol (Dark Mode)</title>
{build_concept_a_symbol("dark")}
</svg>""")

    write_svg("autotray-symbol-black.svg", f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256" role="img" aria-labelledby="title-sym-blk">
  <title id="title-sym-blk">AutoTray-Router — Symbol (Black 1-Color)</title>
{build_concept_a_symbol("black")}
</svg>""")

    write_svg("autotray-symbol-white.svg", f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256" role="img" aria-labelledby="title-sym-wht">
  <title id="title-sym-wht">AutoTray-Router — Symbol (White 1-Color)</title>
{build_concept_a_symbol("white")}
</svg>""")

    write_svg("autotray-symbol-mono.svg", f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256" role="img" aria-labelledby="title-sym-mono">
  <title id="title-sym-mono">AutoTray-Router — Symbol (Amber Mono)</title>
{build_concept_a_symbol("mono")}
</svg>""")

    write_svg("autotray-symbol-small.svg", build_concept_a_small())

    # 2. Horizontal Lockups (viewBox: 857x256)
    wm_h_path, _ = build_concepts.render_wordmark("AUTOTRAY", start_x=280, start_y=72, h=68, stroke=13, spacing=11)
    sub_h_path, _ = build_concepts.render_wordmark("ROUTER", start_x=282, start_y=154, h=32, stroke=6.5, spacing=16)

    # Color Lockup
    write_svg("autotray-lockup-horizontal-color.svg", f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 857 256" width="857" height="256" role="img" aria-labelledby="title-lh-col">
  <title id="title-lh-col">AutoTray-Router — Horizontal Lockup (Color)</title>
  <g transform="translate(48, 36) scale(0.72)">
{build_concept_a_symbol("color")}
  </g>
  <path fill="{CLR_STEEL}" d="{wm_h_path}"/>
  <path fill="{CLR_AMBER}" d="{sub_h_path}"/>
</svg>""")

    # Dark Mode Lockup
    write_svg("autotray-lockup-horizontal-dark-mode.svg", f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 857 256" width="857" height="256" role="img" aria-labelledby="title-lh-dark">
  <title id="title-lh-dark">AutoTray-Router — Horizontal Lockup (Dark Mode)</title>
  <g transform="translate(48, 36) scale(0.72)">
{build_concept_a_symbol("dark")}
  </g>
  <path fill="{CLR_WHITE}" d="{wm_h_path}"/>
  <path fill="{CLR_AMBER_BRIGHT}" d="{sub_h_path}"/>
</svg>""")

    # Black Lockup
    write_svg("autotray-lockup-horizontal-black.svg", f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 857 256" width="857" height="256" role="img" aria-labelledby="title-lh-blk">
  <title id="title-lh-blk">AutoTray-Router — Horizontal Lockup (Black)</title>
  <g transform="translate(48, 36) scale(0.72)">
{build_concept_a_symbol("black")}
  </g>
  <path fill="{CLR_BLACK}" d="{wm_h_path}"/>
  <path fill="{CLR_BLACK}" d="{sub_h_path}"/>
</svg>""")

    # White Lockup
    write_svg("autotray-lockup-horizontal-white.svg", f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 857 256" width="857" height="256" role="img" aria-labelledby="title-lh-wht">
  <title id="title-lh-wht">AutoTray-Router — Horizontal Lockup (White)</title>
  <g transform="translate(48, 36) scale(0.72)">
{build_concept_a_symbol("white")}
  </g>
  <path fill="{CLR_WHITE}" d="{wm_h_path}"/>
  <path fill="{CLR_WHITE}" d="{sub_h_path}"/>
</svg>""")

    # 3. Stacked Lockups (viewBox: 512x512)
    wm_stk_path, _ = build_concepts.render_wordmark("AUTOTRAY", start_x=66, start_y=310, h=52, stroke=10, spacing=9)
    sub_stk_path, _ = build_concepts.render_wordmark("ROUTER", start_x=176, start_y=384, h=26, stroke=5.2, spacing=14)

    # Color Stacked
    write_svg("autotray-lockup-stacked-color.svg", f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512" role="img" aria-labelledby="title-ls-col">
  <title id="title-ls-col">AutoTray-Router — Stacked Lockup (Color)</title>
  <g transform="translate(146, 36) scale(0.86)">
{build_concept_a_symbol("color")}
  </g>
  <path fill="{CLR_STEEL}" d="{wm_stk_path}"/>
  <path fill="{CLR_AMBER}" d="{sub_stk_path}"/>
</svg>""")

    # Dark Stacked
    write_svg("autotray-lockup-stacked-dark-mode.svg", f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512" role="img" aria-labelledby="title-ls-dark">
  <title id="title-ls-dark">AutoTray-Router — Stacked Lockup (Dark Mode)</title>
  <g transform="translate(146, 36) scale(0.86)">
{build_concept_a_symbol("dark")}
  </g>
  <path fill="{CLR_WHITE}" d="{wm_stk_path}"/>
  <path fill="{CLR_AMBER_BRIGHT}" d="{sub_stk_path}"/>
</svg>""")

    # Black Stacked
    write_svg("autotray-lockup-stacked-black.svg", f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512" role="img" aria-labelledby="title-ls-blk">
  <title id="title-ls-blk">AutoTray-Router — Stacked Lockup (Black)</title>
  <g transform="translate(146, 36) scale(0.86)">
{build_concept_a_symbol("black")}
  </g>
  <path fill="{CLR_BLACK}" d="{wm_stk_path}"/>
  <path fill="{CLR_BLACK}" d="{sub_stk_path}"/>
</svg>""")

    # White Stacked
    write_svg("autotray-lockup-stacked-white.svg", f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512" role="img" aria-labelledby="title-ls-wht">
  <title id="title-ls-wht">AutoTray-Router — Stacked Lockup (White)</title>
  <g transform="translate(146, 36) scale(0.86)">
{build_concept_a_symbol("white")}
  </g>
  <path fill="{CLR_WHITE}" d="{wm_stk_path}"/>
  <path fill="{CLR_WHITE}" d="{sub_stk_path}"/>
</svg>""")


# -----------------------------------------------------------------------------
# 3. Automated SVG Audit
# -----------------------------------------------------------------------------
def audit_svgs():
    print("Running svg_audit.py on master SVGs...")
    audit_script = os.path.join(SKILL_SCRIPTS, "svg_audit.py")
    files_to_audit = [
        os.path.join(SVG_DIR, "autotray-symbol-color.svg"),
        os.path.join(SVG_DIR, "autotray-symbol-dark-mode.svg"),
        os.path.join(SVG_DIR, "autotray-symbol-black.svg"),
        os.path.join(SVG_DIR, "autotray-symbol-white.svg"),
        os.path.join(SVG_DIR, "autotray-symbol-small.svg"),
        os.path.join(SVG_DIR, "autotray-lockup-horizontal-color.svg"),
        os.path.join(SVG_DIR, "autotray-lockup-horizontal-dark-mode.svg"),
        os.path.join(SVG_DIR, "autotray-lockup-stacked-color.svg")
    ]
    cmd = [sys.executable, audit_script] + files_to_audit
    subprocess.run(cmd, check=True)


# -----------------------------------------------------------------------------
# 4. Web Icons & PNG Raster Exports
# -----------------------------------------------------------------------------
def export_web_and_png():
    print("Exporting web icons and PNG raster deliverables...")
    master_sym = os.path.join(SVG_DIR, "autotray-symbol-color.svg")
    small_sym = os.path.join(SVG_DIR, "autotray-symbol-small.svg")

    # Web Icon Set
    cmd_web = [
        sys.executable,
        os.path.join(SKILL_SCRIPTS, "export_variants.py"),
        master_sym,
        "--name", "autotray",
        "--title", "AutoTray-Router",
        "--icon-bg", CLR_STEEL,
        "--icon-fg", CLR_AMBER,
        "--favicon-source", small_sym,
        "--web-icons",
        "--out-dir", WEB_DIR
    ]
    subprocess.run(cmd_web, check=True)

    # High-Res Transparent PNGs (1024x1024)
    png_targets = [
        os.path.join(SVG_DIR, "autotray-symbol-color.svg"),
        os.path.join(SVG_DIR, "autotray-symbol-dark-mode.svg"),
        os.path.join(SVG_DIR, "autotray-symbol-black.svg"),
        os.path.join(SVG_DIR, "autotray-symbol-white.svg"),
        os.path.join(SVG_DIR, "autotray-lockup-horizontal-color.svg"),
        os.path.join(SVG_DIR, "autotray-lockup-horizontal-dark-mode.svg"),
        os.path.join(SVG_DIR, "autotray-lockup-horizontal-black.svg"),
        os.path.join(SVG_DIR, "autotray-lockup-stacked-color.svg"),
        os.path.join(SVG_DIR, "autotray-lockup-stacked-dark-mode.svg"),
        os.path.join(SVG_DIR, "autotray-lockup-stacked-black.svg")
    ]
    cmd_png = [
        sys.executable,
        os.path.join(SKILL_SCRIPTS, "render_png.py"),
        *png_targets,
        "--out-dir", PNG_DIR,
        "--size", "1024"
    ]
    subprocess.run(cmd_png, check=True)


# -----------------------------------------------------------------------------
# 5. Client Presentation Board
# -----------------------------------------------------------------------------
def build_presentation():
    print("Generating client presentation board for Concept A...")
    spec = {
        "brand": "AutoTray-Router",
        "tagline": "Industrial Cable Tray & Multi-Level Riser Sizing Engine",
        "brief": "An industrial-grade engineering application for electrical engineers, EPC contractors, and plant designers to model 3D multi-level cable tray routing, automate shortest-path cable assignments across elevation risers, and calculate commercial tray sizing compliant with NEC 392 and IEC 61537 standards.",
        "adjectives": ["Industrial", "Algorithmic", "Structural", "Precise"],
        "criteria": "High-contrast legibility down to 16 px, unmistakable physical cable tray hardware, robust 1-color reproduction, and precision 3D CAD modeling aesthetic.",
        "industry": "software",
        "brand_color": CLR_AMBER,
        "tile_color": CLR_STEEL,
        "greyscale": False,
        "final": True,
        "round": 2,
        "concepts": [
            {
                "name": "The Isometric Ladder Tray (Official Logo)",
                "symbol": os.path.relpath(os.path.join(SVG_DIR, "autotray-symbol-color.svg"), PRES_DIR),
                "lockup": os.path.relpath(os.path.join(SVG_DIR, "autotray-lockup-horizontal-color.svg"), PRES_DIR),
                "stacked": os.path.relpath(os.path.join(SVG_DIR, "autotray-lockup-stacked-color.svg"), PRES_DIR),
                "symbol_on_dark": os.path.relpath(os.path.join(SVG_DIR, "autotray-symbol-dark-mode.svg"), PRES_DIR),
                "lockup_on_dark": os.path.relpath(os.path.join(SVG_DIR, "autotray-lockup-horizontal-dark-mode.svg"), PRES_DIR),
                "idea": "An industrial heavy-duty ladder cable tray in clean 30°/150° isometric CAD perspective, featuring structural C-channel side rails, 5 transverse welded rungs, and 3 color-coded routed cables.",
                "rationale": [
                    "100% indisputable physical cable tray hardware recognized instantly by electrical contractors and plant engineers",
                    "Authentic C-channel side stringers and transverse rungs ground the software in real electrical plant engineering",
                    "Three distinct cable runs (Power Blue, Control Amber, Data Emerald) illustrate automated segregation and routing"
                ]
            }
        ],
        "recommendation": "Concept A (The Isometric Ladder Tray) provides unmistakable domain authority, tactile app badge aesthetics, and perfect vector precision.",
        "next_steps": [
            "Deploy favicon.ico and app icons into the Next.js frontend application",
            "Embed horizontal lockup in README.md and technical calculation reports",
            "Apply brand palette (#E65100, #0F172A, #2563EB) across UI themes and documentation"
        ]
    }

    spec_path = os.path.join(PRES_DIR, "presentation-spec.json")
    with open(spec_path, "w", encoding="utf-8") as f:
        json.dump(spec, f, indent=2)

    pres_html = os.path.join(PRES_DIR, "presentation.html")
    cmd_pres = [
        sys.executable,
        os.path.join(SKILL_SCRIPTS, "presentation_board.py"),
        spec_path,
        "-o", pres_html,
        "--png-dir", SLIDES_DIR
    ]
    subprocess.run(cmd_pres, check=True)


# -----------------------------------------------------------------------------
# 6. Brand Guidelines Documentation
# -----------------------------------------------------------------------------
def build_guidelines():
    print("Writing BRAND_GUIDELINES.md...")
    content = f"""# AutoTray-Router — Brand Identity & Logo Guidelines

> **AutoTray-Router: Industrial Cable Tray Routing & Sizing Engine**  
> Compliant with NEC 392 & IEC 61537 Standards.

---

## 1. The Official Logo: The Isometric Ladder Tray

The official mark represents an industrial heavy-duty ladder cable tray (Eaton B-Line / Legrand standard) rendered in authentic 30°/150° isometric CAD perspective:
- **Structural C-Channel Rails**: Heavy-gauge steel side stringers with top flanges and bottom return lips.
- **5 Transverse Welded Rungs**: Regular transverse rungs providing the structural tray bed.
- **Segregated Routed Cables**: Three distinct cable runs representing automated shortest-path routing:
  - **Power Blue (`#2563EB`)**: High-voltage feeder cable.
  - **Control Amber (`#E65100`)**: Core signal cable and primary brand accent.
  - **Data Emerald (`#059669`)**: Shielded instrumentation / communications line.

---

## 2. Color Specifications

| Swatch | Color Name | HEX | RGB | Use Case |
|---|---|---|---|---|
| ![#E65100](https://via.placeholder.com/15/E65100/000000?text=+) | **Electric Amber** | `#E65100` | `rgb(230, 81, 0)` | Primary Brand Accent, Control Cable, Badges |
| ![#FF6B00](https://via.placeholder.com/15/FF6B00/000000?text=+) | **Safety Glow** | `#FF6B00` | `rgb(255, 107, 0)` | Dark-mode Accent, High-vis Highlights |
| ![#0F172A](https://via.placeholder.com/15/0F172A/000000?text=+) | **Carbon Slate** | `#0F172A` | `rgb(15, 23, 42)` | Side Rails (Web), Wordmark Primary, App Background |
| ![#334155](https://via.placeholder.com/15/334155/000000?text=+) | **Structural Slate** | `#334155` | `rgb(51, 65, 85)` | Ladder Rungs, Rail Flange Faces |
| ![#2563EB](https://via.placeholder.com/15/2563EB/000000?text=+) | **Power Blue** | `#2563EB` | `rgb(37, 99, 235)` | Power Cable, Secondary Brand Accent |
| ![#059669](https://via.placeholder.com/15/059669/000000?text=+) | **Data Emerald** | `#059669` | `rgb(5, 150, 105)` | Data Cable, Success / Routed Indicators |
| ![#FFFFFF](https://via.placeholder.com/15/FFFFFF/000000?text=+) | **Pure White** | `#FFFFFF` | `rgb(255, 255, 255)` | Dark-mode Rails & Wordmark, Reversed Cut |

---

## 3. Master Configurations

| Configuration | Primary Application | Master Vector Files |
|---|---|---|
| **Horizontal Lockup** | Web app headers, navigation bars, documentation banners | `svg/autotray-lockup-horizontal-color.svg`<br/>`svg/autotray-lockup-horizontal-dark-mode.svg` |
| **Stacked Lockup** | Splash screens, technical calculation covers, about dialogs | `svg/autotray-lockup-stacked-color.svg`<br/>`svg/autotray-lockup-stacked-dark-mode.svg` |
| **Standalone Symbol** | Browser favicons, desktop app tiles, taskbar icons, CLI badges | `svg/autotray-symbol-color.svg`<br/>`svg/autotray-symbol-dark-mode.svg` |
| **1-Color Silhouette** | Laser engraving, thermal labels, pure monochrome print | `svg/autotray-symbol-black.svg`<br/>`svg/autotray-symbol-white.svg` |
| **Favicon Micro-Cut** | 16×16 px browser tabs, 32×32 px mobile bookmarks | `svg/autotray-symbol-small.svg`<br/>`web/favicon.ico` |

---

## 4. Clear Space & Minimum Sizes

### Clear Space
Maintain an exclusion zone of **1 × [X]** around the mark on all sides:
- In the horizontal lockup, **[X]** equals the cap-height of `AUTOTRAY` (68 px on a 256 px grid).
- In the standalone symbol, **[X]** equals the side-rail flange width (24 px on a 256 px grid, or ~10% of total dimension).

### Minimum Sizes
- **Horizontal Lockup**: Minimum **140 px** wide on digital displays (36 mm in print).
- **Symbol**: Minimum **16 × 16 px** (tested and verified with `autotray-symbol-small.svg`).

---

## 5. Logo Misuse Rules

- **DO NOT** replace the ladder rungs or rails with abstract arrows, chevrons, or tech triangles.
- **DO NOT** skew, stretch, or alter the 30°/150° isometric projection angle.
- **DO NOT** place the dark `#0F172A` symbol on dark slate backgrounds without using the inverted dark-mode master (`autotray-symbol-dark-mode.svg`).
- **DO NOT** apply drop shadows, 3D embossing, glows, or bitmap raster effects to the vector master.
"""
    with open(os.path.join(DIST_DIR, "BRAND_GUIDELINES.md"), "w", encoding="utf-8") as f:
        f.write(content)


# -----------------------------------------------------------------------------
# 7. Main Execution Pipeline
# -----------------------------------------------------------------------------
def main():
    print("=== AutoTray-Router: Concept A Production Kit Generator ===")
    build_all_svgs()
    audit_svgs()
    export_web_and_png()
    build_presentation()
    build_guidelines()
    print("=== Production Kit Completed Successfully ===")


if __name__ == "__main__":
    main()

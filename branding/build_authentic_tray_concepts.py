#!/usr/bin/env python3
"""Build 3 authentic, unmistakable CABLE TRAY logo concepts (Refined).
1. Concept A: Isometric 3D Cable Ladder Tray with Visible Rungs & Routed Cables
2. Concept B: 90° Cable Tray Routing Elbow Fitting (Concentric Rails, Radial Rungs, Curved Cables)
3. Concept C: Technical Cable Tray Sizing Cross-Section (U-Profile, Divider Plate, Power & Control Bundles)
"""
import math
import os
import subprocess
import sys

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BRANDING_DIR = os.path.join(BASE_DIR, "branding")
OUT_DIR = os.path.join(BRANDING_DIR, "concepts_v2")
os.makedirs(OUT_DIR, exist_ok=True)

SKILL_SCRIPTS = r"C:\Users\jihad.kherfan.MCGI\.gemini\config\skills\logo-design\scripts"
sys.path.insert(0, BRANDING_DIR)
import build_concepts  # for vector typography lockups

# Brand Colors
CLR_STEEL = "#0F172A"       # Heavy Structural Slate / Rail Dark
CLR_STEEL_MID = "#334155"   # Web / Rung Slate
CLR_STEEL_LGT = "#64748B"   # Highlight Slate
CLR_AMBER = "#E65100"       # Industrial Electric Amber / Cable 1
CLR_BLUE = "#2563EB"        # Power Cable Blue / Cable 2
CLR_TEAL = "#059669"        # Data Cable Green / Cable 3


# -----------------------------------------------------------------------------
# 1. Concept A: Isometric 3D Cable Ladder Tray
# -----------------------------------------------------------------------------
def make_concept_a():
    """Isometric 3D Cable Ladder Tray.
    Uses exact 30° / 150° isometric projection.
    Features:
    - Far side rail: Top flange, vertical C-web, bottom flange
    - Near side rail: Top flange, vertical C-web, bottom flange
    - 5 heavy transverse ladder rungs connecting the two rails
    - 3 distinct cables (Amber, Blue, Teal) routed along the tray bed
    """
    x0, y0 = 128, 142
    cos30 = math.cos(math.radians(30))
    sin30 = math.sin(math.radians(30))

    def iso(u, v, w=0):
        x = x0 + u * cos30 - v * cos30
        y = y0 - u * sin30 - v * sin30 - w
        return round(x, 2), round(y, 2)

    L_min, L_max = -85, 85   # length span
    W_far = 42               # far rail v position
    W_near = -42             # near rail v position
    H_rail = 24              # rail height
    Flange_w = 8             # top flange width

    p_far_web = [iso(L_min, W_far, 0), iso(L_max, W_far, 0), iso(L_max, W_far, H_rail), iso(L_min, W_far, H_rail)]
    p_far_flange = [iso(L_min, W_far, H_rail), iso(L_max, W_far, H_rail), iso(L_max, W_far - Flange_w, H_rail), iso(L_min, W_far - Flange_w, H_rail)]

    p_near_web = [iso(L_min, W_near, 0), iso(L_max, W_near, 0), iso(L_max, W_near, H_rail), iso(L_min, W_near, H_rail)]
    p_near_flange = [iso(L_min, W_near, H_rail), iso(L_max, W_near, H_rail), iso(L_max, W_near + Flange_w, H_rail), iso(L_min, W_near + Flange_w, H_rail)]
    p_near_lip = [iso(L_min, W_near, 0), iso(L_max, W_near, 0), iso(L_max, W_near + Flange_w, 0), iso(L_min, W_near + Flange_w, 0)]

    def pts_str(pts):
        return " ".join(f"{x},{y}" for x, y in pts)

    rungs_svg = []
    rung_w = 6
    rung_h = 3
    for u_pos in [-60, -30, 0, 30, 60]:
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

    cables_svg = []
    cable_defs = [
        (18, 7, CLR_AMBER, "#FFA726"),
        (-2, 6, CLR_BLUE, "#60A5FA"),
        (-20, 5, CLR_TEAL, "#34D399")
    ]
    for v_c, rad, col_dark, col_light in cable_defs:
        p_cab_body = [
            iso(L_min - 5, v_c + rad, rung_h),
            iso(L_max + 5, v_c + rad, rung_h),
            iso(L_max + 5, v_c - rad, rung_h),
            iso(L_min - 5, v_c - rad, rung_h)
        ]
        p_cab_hi = [
            iso(L_min - 5, v_c + rad*0.3, rung_h + rad*0.8),
            iso(L_max + 5, v_c + rad*0.3, rung_h + rad*0.8),
            iso(L_max + 5, v_c - rad*0.3, rung_h + rad*0.8),
            iso(L_min - 5, v_c - rad*0.3, rung_h + rad*0.8)
        ]
        cables_svg.append(f'<polygon points="{pts_str(p_cab_body)}" fill="{col_dark}"/>')
        cables_svg.append(f'<polygon points="{pts_str(p_cab_hi)}" fill="{col_light}"/>')

    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256" role="img" aria-labelledby="title-sym-a">
  <title id="title-sym-a">AutoTray-Router — Concept A: Isometric Cable Ladder Tray</title>
  
  <!-- Far Side Rail Web -->
  <polygon points="{pts_str(p_far_web)}" fill="{CLR_STEEL_MID}"/>
  <!-- Far Side Rail Top Flange -->
  <polygon points="{pts_str(p_far_flange)}" fill="{CLR_STEEL}"/>

  <!-- Transverse Welded Ladder Rungs -->
  {"".join(rungs_svg)}

  <!-- Routed Cables laying across the ladder rungs -->
  {"".join(cables_svg)}

  <!-- Near Side Rail Web -->
  <polygon points="{pts_str(p_near_web)}" fill="{CLR_STEEL}"/>
  <!-- Near Side Rail Top Flange -->
  <polygon points="{pts_str(p_near_flange)}" fill="{CLR_STEEL_LGT}"/>
  <!-- Near Side Rail Bottom Return Flange -->
  <polygon points="{pts_str(p_near_lip)}" fill="{CLR_STEEL_MID}"/>
</svg>"""
    return svg


# -----------------------------------------------------------------------------
# 2. Concept B: 90° Cable Tray Routing Elbow Fitting (Cleaned & Aligned)
# -----------------------------------------------------------------------------
def make_concept_b():
    """90° Cable Tray Curved Elbow Fitting.
    Center of arc at (40, 40).
    Concentric outer and inner C-channel rails, 5 radial ladder rungs,
    and 3 concentric cables smoothly routing around the bend.
    """
    xc, yc = 40, 40
    R_inner = 65
    R_outer = 175
    rail_w = 14

    # 5 Radial Ladder Rungs at 0°, 22.5°, 45°, 67.5°, 90°
    rungs = []
    rung_thick_deg = 2.4
    for deg in [0, 22.5, 45, 67.5, 90]:
        d1 = math.radians(deg - rung_thick_deg)
        d2 = math.radians(deg + rung_thick_deg)
        r_in = R_inner + 2
        r_out = R_outer - 2
        p1 = (round(xc + r_in * math.cos(d1), 2), round(yc + r_in * math.sin(d1), 2))
        p2 = (round(xc + r_out * math.cos(d1), 2), round(yc + r_out * math.sin(d1), 2))
        p3 = (round(xc + r_out * math.cos(d2), 2), round(yc + r_out * math.sin(d2), 2))
        p4 = (round(xc + r_in * math.cos(d2), 2), round(yc + r_in * math.sin(d2), 2))
        pts = f"{p1[0]},{p1[1]} {p2[0]},{p2[1]} {p3[0]},{p3[1]} {p4[0]},{p4[1]}"
        rungs.append(f'<polygon points="{pts}" fill="{CLR_STEEL_MID}"/>')

    # Concentric cables
    r_cab1 = 95   # Inner cable (Teal Data)
    r_cab2 = 120  # Middle cable (Amber Control)
    r_cab3 = 145  # Outer cable (Blue Power)

    def cable_arc(r, col, width):
        p = f"M {xc + r:.2f} {yc:.2f} A {r:.2f} {r:.2f} 0 0 1 {xc:.2f} {yc + r:.2f}"
        return f'<path d="{p}" fill="none" stroke="{col}" stroke-width="{width}" stroke-linecap="butt"/>'

    # Outer Rail Arc (between R_outer and R_outer + rail_w)
    Ro1 = R_outer
    Ro2 = R_outer + rail_w
    outer_rail_d = (
        f"M {xc + Ro1:.2f} {yc:.2f} "
        f"A {Ro1:.2f} {Ro1:.2f} 0 0 1 {xc:.2f} {yc + Ro1:.2f} "
        f"V {yc + Ro2:.2f} "
        f"A {Ro2:.2f} {Ro2:.2f} 0 0 0 {xc + Ro2:.2f} {yc:.2f} "
        f"Z"
    )

    # Inner Rail Arc (between R_inner - rail_w and R_inner)
    Ri1 = R_inner - rail_w
    Ri2 = R_inner
    inner_rail_d = (
        f"M {xc + Ri1:.2f} {yc:.2f} "
        f"A {Ri1:.2f} {Ri1:.2f} 0 0 1 {xc:.2f} {yc + Ri1:.2f} "
        f"V {yc + Ri2:.2f} "
        f"A {Ri2:.2f} {Ri2:.2f} 0 0 0 {xc + Ri2:.2f} {yc:.2f} "
        f"Z"
    )

    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256" role="img" aria-labelledby="title-sym-b">
  <title id="title-sym-b">AutoTray-Router — Concept B: 90° Cable Tray Routing Elbow</title>
  
  <!-- Radial Ladder Rungs spanning the tray bed -->
  {"".join(rungs)}

  <!-- Concentric Routed Cables turning the 90° bend -->
  {cable_arc(r_cab1, CLR_TEAL, 10)}
  {cable_arc(r_cab2, CLR_AMBER, 13)}
  {cable_arc(r_cab3, CLR_BLUE, 14)}

  <!-- Outer Heavy C-Channel Rail -->
  <path fill="{CLR_STEEL}" d="{outer_rail_d}"/>

  <!-- Inner Heavy C-Channel Rail -->
  <path fill="{CLR_STEEL}" d="{inner_rail_d}"/>
</svg>"""
    return svg


# -----------------------------------------------------------------------------
# 3. Concept C: Technical Cable Tray Cross-Section & Sizing
# -----------------------------------------------------------------------------
def make_concept_c():
    """Frontal engineering cross-section of a heavy-gauge cable tray:
    U-profile bed with top return flanges, central metallic barrier plate
    separating Power and Control compartments, packed with circular cable conductors.
    """
    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256" role="img" aria-labelledby="title-sym-c">
  <title id="title-sym-c">AutoTray-Router — Concept C: Tray Cross-Section Sizing</title>
  
  <!-- Heavy-Duty U-Profile Cable Tray Body with Return Flanges -->
  <path fill="{CLR_STEEL}" fill-rule="evenodd" d="
    M 32 68
    H 60
    V 84
    H 48
    V 184
    H 208
    V 84
    H 196
    V 68
    H 224
    V 200
    H 32
    Z
  "/>

  <!-- Central Metallic Segregation Barrier (NEC 392 Separator Plate) -->
  <path fill="{CLR_STEEL}" d="
    M 122 80
    H 134
    V 184
    H 122
    Z
  "/>

  <!-- Left Compartment: Power Cables (Single-layer spaced with copper cores) -->
  <!-- Power Cable 1 -->
  <circle cx="68" cy="154" r="20" fill="{CLR_BLUE}"/>
  <circle cx="68" cy="154" r="8" fill="#93C5FD"/>
  <!-- Power Cable 2 -->
  <circle cx="102" cy="162" r="12" fill="{CLR_BLUE}"/>
  <circle cx="102" cy="162" r="5" fill="#93C5FD"/>

  <!-- Right Compartment: Control & Data Cables (Multilayer stacked pyramid) -->
  <!-- Bottom tier: 3 control cables -->
  <circle cx="152" cy="168" r="9" fill="{CLR_AMBER}"/>
  <circle cx="171" cy="168" r="9" fill="{CLR_AMBER}"/>
  <circle cx="190" cy="168" r="9" fill="{CLR_AMBER}"/>
  <!-- Middle tier: 2 cables -->
  <circle cx="161.5" cy="152" r="9" fill="#FF8C00"/>
  <circle cx="180.5" cy="152" r="9" fill="{CLR_TEAL}"/>
  <!-- Top tier: 1 cable -->
  <circle cx="171" cy="136" r="9" fill="#10B981"/>

  <!-- Technical Sizing Dimension Bracket (Width = 300mm Standard) -->
  <path d="M 32 216 H 224" stroke="{CLR_AMBER}" stroke-width="3" stroke-linecap="round"/>
  <path d="M 32 210 V 222 M 224 210 V 222" stroke="{CLR_AMBER}" stroke-width="3"/>
  <path d="M 128 210 V 222" stroke="{CLR_AMBER}" stroke-width="2"/>
</svg>"""
    return svg


# -----------------------------------------------------------------------------
# Horizontal Lockups (Fixed ViewBox Calculation)
# -----------------------------------------------------------------------------
def make_lockup(symbol_body, title, concept_letter):
    """Build a balanced, professional horizontal lockup:
    - Symbol on left (184x184 box, scale 0.72)
    - Wordmark: "AUTOTRAY" (h=68, stroke=13)
    - Subtitle: "ROUTER" (h=32, stroke=6.5, tracking=16)
    """
    sym_w = 184
    sym_x = 48
    gap = 48
    text_start_x = sym_x + sym_w + gap  # 280

    wm_path, wm_end_x = build_concepts.render_wordmark("AUTOTRAY", start_x=text_start_x, start_y=72, h=68, stroke=13, spacing=11)
    sub_path, sub_end_x = build_concepts.render_wordmark("ROUTER", start_x=text_start_x + 2, start_y=154, h=32, stroke=6.5, spacing=16)

    # Fix: use the maximum of both lines so AUTOTRAY is never clipped!
    max_text_end = max(wm_end_x, sub_end_x)
    right_margin = sym_x
    vb_w = int(max_text_end + right_margin)

    lockup_svg = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {vb_w} 256" width="{vb_w}" height="256" role="img" aria-labelledby="title-lockup-{concept_letter}">
  <title id="title-lockup-{concept_letter}">{title}</title>
  <!-- Cable Tray Symbol scaled to 184x184 at ({sym_x}, 36) -->
  <g transform="translate({sym_x}, 36) scale(0.72)">
    {symbol_body}
  </g>
  <!-- Wordmark: AUTOTRAY ROUTER -->
  <path fill="{CLR_STEEL}" d="{wm_path}"/>
  <path fill="{CLR_AMBER}" d="{sub_path}"/>
</svg>"""
    return lockup_svg


def extract_body(svg_str):
    """Extract inner elements between <svg> and </svg>, skipping <title>."""
    lines = []
    in_svg = False
    for line in svg_str.splitlines():
        if '<svg' in line:
            in_svg = True
            continue
        if '</svg>' in line:
            break
        if in_svg and '<title' not in line:
            lines.append(line)
    return "\n".join(lines)


def main():
    sym_a = make_concept_a()
    sym_b = make_concept_b()
    sym_c = make_concept_c()

    fa_sym = os.path.join(OUT_DIR, "concept-a-symbol.svg")
    fb_sym = os.path.join(OUT_DIR, "concept-b-symbol.svg")
    fc_sym = os.path.join(OUT_DIR, "concept-c-symbol.svg")

    with open(fa_sym, "w", encoding="utf-8") as f:
        f.write(sym_a)
    with open(fb_sym, "w", encoding="utf-8") as f:
        f.write(sym_b)
    with open(fc_sym, "w", encoding="utf-8") as f:
        f.write(sym_c)

    lock_a = make_lockup(extract_body(sym_a), "AutoTray-Router — Concept A Lockup", "a")
    lock_b = make_lockup(extract_body(sym_b), "AutoTray-Router — Concept B Lockup", "b")
    lock_c = make_lockup(extract_body(sym_c), "AutoTray-Router — Concept C Lockup", "c")

    fa_lock = os.path.join(OUT_DIR, "concept-a-lockup.svg")
    fb_lock = os.path.join(OUT_DIR, "concept-b-lockup.svg")
    fc_lock = os.path.join(OUT_DIR, "concept-c-lockup.svg")

    with open(fa_lock, "w", encoding="utf-8") as f:
        f.write(lock_a)
    with open(fb_lock, "w", encoding="utf-8") as f:
        f.write(lock_b)
    with open(fc_lock, "w", encoding="utf-8") as f:
        f.write(lock_c)

    print("Successfully built 6 redesigned SVG files in:", OUT_DIR)

    # Run concept_sheet.py to build concepts.png overview sheet
    sheet_script = os.path.join(SKILL_SCRIPTS, "concept_sheet.py")
    out_png = os.path.join(OUT_DIR, "concepts.png")
    cmd_sheet = [
        sys.executable,
        sheet_script,
        fa_sym, fb_sym, fc_sym,
        "--lockups", fa_lock, fb_lock, fc_lock,
        "--names", "Isometric Ladder Tray", "90° Tray Routing Elbow", "Tray Sizing Cross-Section",
        "--notes",
        "Industrial 3D ladder cable tray with heavy C-channel rails, 5 transverse rungs, and 3 routed cables.",
        "90° curved cable tray elbow fitting with concentric rails, radial rungs, and turning cable paths.",
        "Engineering cross-section of heavy-duty U-profile tray with metallic divider and segregated cable fill.",
        "--title", "AutoTray-Router — Cable Tray Logo Redesigns",
        "--recommend", "1",
        "-o", out_png
    ]
    subprocess.run(cmd_sheet, check=True)
    print("Generated concepts.png:", out_png)


if __name__ == "__main__":
    main()

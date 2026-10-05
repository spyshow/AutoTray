#!/usr/bin/env python3
"""Build and test 3 authentic, unmistakable CABLE TRAY logo concepts.
Concept A: Isometric 3D Cable Ladder Tray with Rungs & Routed Cables
Concept B: 90° Cable Tray Routing Bend Fitting with Rungs & Turning Cables
Concept C: Technical Cable Tray Cross-Section with Side Flanges, Divider & Cables
"""
import math
import os
import subprocess
import sys

OUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "tray_redesign")
os.makedirs(OUT_DIR, exist_ok=True)


# -----------------------------------------------------------------------------
# CONCEPT A: 3D Isometric Cable Ladder Tray with Routed Cables
# -----------------------------------------------------------------------------
def make_concept_a():
    """Isometric (30°/150°) view of an industrial ladder cable tray.
    Shows the two heavy C-channel side rails (far and near),
    4 structural transverse ladder rungs, and 3 parallel cables
    routed through the center of the tray bed.
    """
    # Grid math:
    # 30-deg direction: cos(30)=sqrt(3)/2 ~ 0.866025, sin(30)=0.5
    # Let L be along 30 deg (down-left to up-right).
    # Center of tray at (128, 128).
    # Far rail top edge from (50, 160) to (190, 80)... wait, let's use exact 30 deg!
    # dx = 140 -> dy = 140 * tan(30) = 80.83 -> dx=142, dy=82 (82/142 = 0.57746 -> 30.006 deg)
    
    # Let's construct with precise polygons for rails, rungs, and cables:
    svg = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256" role="img" aria-labelledby="title-a">
  <title id="title-a">AutoTray-Router — Concept A: Isometric Cable Ladder Tray</title>
  
  <!-- Far Side Rail (Top Flange & Web) -->
  <!-- Top flange -->
  <polygon points="56,150 70,142 198,68 184,76" fill="#0F172A"/>
  <!-- Web (vertical face) -->
  <polygon points="56,150 184,76 184,98 56,172" fill="#1E293B"/>

  <!-- Transverse Ladder Rungs (Connecting far rail to near rail along 150-deg axis) -->
  <!-- Rung 1 -->
  <polygon points="76,160 102,175 114,168 88,153" fill="#334155"/>
  <!-- Rung 2 -->
  <polygon points="106,143 132,158 144,151 118,136" fill="#334155"/>
  <!-- Rung 3 -->
  <polygon points="136,126 162,141 174,134 148,119" fill="#334155"/>
  <!-- Rung 4 -->
  <polygon points="166,108 192,123 204,116 178,101" fill="#334155"/>

  <!-- 3 Routed Cables laying on the tray bed (Blue Power, Amber Control, Cyan Data) -->
  <!-- Cable 1 (Power - Blue) -->
  <polygon points="66,168 194,94 194,84 66,158" fill="#2563EB"/>
  <!-- Cable 2 (Control - Industrial Amber) -->
  <polygon points="78,175 206,101 206,91 78,165" fill="#E65100"/>
  <!-- Cable 3 (Data - Emerald Green) -->
  <polygon points="90,182 218,108 218,98 90,172" fill="#059669"/>

  <!-- Near Side Rail (Web & Top Flange) -->
  <!-- Web (vertical face) -->
  <polygon points="86,188 214,114 214,136 86,210" fill="#0F172A"/>
  <!-- Top flange -->
  <polygon points="86,188 100,180 228,106 214,114" fill="#334155"/>
  <!-- Bottom return flange -->
  <polygon points="86,210 100,202 228,128 214,136" fill="#1E293B"/>
</svg>"""
    return svg


# -----------------------------------------------------------------------------
# CONCEPT B: 90° Cable Tray Routing Elbow Fitting with Rungs & Cables
# -----------------------------------------------------------------------------
def make_concept_b():
    """Plan / Axonometric view of a 90° curved cable tray elbow fitting.
    Outer rail C-channel arc, inner rail C-channel arc, 5 radial ladder rungs,
    and 3 smooth concentric cables routing around the bend.
    """
    svg = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256" role="img" aria-labelledby="title-b">
  <title id="title-b">AutoTray-Router — Concept B: 90° Cable Tray Routing Elbow</title>
  
  <!-- Radial Ladder Rungs (Connecting inner and outer rails) -->
  <!-- Rung 1 (0 deg horizontal) -->
  <rect x="76" y="206" width="140" height="12" rx="2" fill="#334155"/>
  <!-- Rung 2 (22.5 deg) -->
  <polygon points="102,184 212,139 216,150 106,195" fill="#334155"/>
  <!-- Rung 3 (45 deg diagonal) -->
  <polygon points="134,134 219,49 227,57 142,142" fill="#334155"/>
  <!-- Rung 4 (67.5 deg) -->
  <polygon points="184,102 139,212 150,216 195,106" fill="#334155"/>
  <!-- Rung 5 (90 deg vertical) -->
  <rect x="206" y="76" width="12" height="140" rx="2" fill="#334155"/>

  <!-- Concentric Routed Cables turning the 90° bend -->
  <!-- Cable 1 (Power - Blue) -->
  <path d="M 40 188 A 148 148 0 0 1 188 40" fill="none" stroke="#2563EB" stroke-width="12" stroke-linecap="round"/>
  <!-- Cable 2 (Control - Amber) -->
  <path d="M 40 158 A 118 118 0 0 1 158 40" fill="none" stroke="#E65100" stroke-width="12" stroke-linecap="round"/>
  <!-- Cable 3 (Data - Green) -->
  <path d="M 40 128 A 88 88 0 0 1 128 40" fill="none" stroke="#059669" stroke-width="12" stroke-linecap="round"/>

  <!-- Outer Heavy C-Channel Side Rail (R=184 to 204) -->
  <path d="
    M 36 220
    A 184 184 0 0 1 220 36
    L 220 20
    A 200 200 0 0 0 20 220
    Z
  " fill="#0F172A"/>

  <!-- Inner Heavy C-Channel Side Rail (R=60 to 76) -->
  <path d="
    M 36 104
    A 68 68 0 0 1 104 36
    L 104 20
    A 84 84 0 0 0 20 104
    Z
  " fill="#0F172A"/>
</svg>"""
    return svg


# -----------------------------------------------------------------------------
# CONCEPT C: Technical Cable Tray Cross-Section with Metallic Divider & Cables
# -----------------------------------------------------------------------------
def make_concept_c():
    """Frontal engineering cross-section of a heavy-gauge cable tray:
    U-profile bed with top return flanges, central metallic barrier plate
    separating Power and Control compartments, packed with circular cable conductors.
    """
    svg = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256" role="img" aria-labelledby="title-c">
  <title id="title-c">AutoTray-Router — Concept C: Tray Cross-Section Sizing</title>
  
  <!-- Heavy-Duty U-Profile Cable Tray Body with Return Flanges -->
  <path fill="#0F172A" fill-rule="evenodd" d="
    M 28 68
    H 56
    V 84
    H 44
    V 188
    H 212
    V 84
    H 200
    V 68
    H 228
    V 204
    H 28
    Z
  "/>

  <!-- Central Metallic Segregation Barrier (NEC 392 Separator) -->
  <path fill="#0F172A" d="
    M 122 80
    H 134
    V 188
    H 122
    Z
  "/>

  <!-- Left Compartment: Power Cables (Single layer, spaced) -->
  <!-- Power Core 1 (Blue) -->
  <circle cx="70" cy="154" r="22" fill="#2563EB"/>
  <circle cx="70" cy="154" r="10" fill="#93C5FD"/>
  <!-- Power Core 2 (Blue) -->
  <circle cx="106" cy="162" r="14" fill="#2563EB"/>
  <circle cx="106" cy="162" r="6" fill="#93C5FD"/>

  <!-- Right Compartment: Control & Data Cables (Multilayer packed) -->
  <!-- Control Bundle 1 (Amber) -->
  <circle cx="152" cy="166" r="10" fill="#E65100"/>
  <circle cx="174" cy="166" r="10" fill="#E65100"/>
  <circle cx="196" cy="166" r="10" fill="#E65100"/>
  <!-- Control Bundle 2 (Amber / Green) -->
  <circle cx="163" cy="148" r="10" fill="#FF8C00"/>
  <circle cx="185" cy="148" r="10" fill="#059669"/>
  <!-- Control Bundle 3 -->
  <circle cx="174" cy="130" r="10" fill="#10B981"/>

  <!-- Dimension / Sizing Bracket Indicator at Bottom -->
  <path d="M 28 220 H 228" stroke="#E65100" stroke-width="3" stroke-linecap="round"/>
  <path d="M 28 214 V 226 M 228 214 V 226" stroke="#E65100" stroke-width="3"/>
  <path d="M 128 214 V 226" stroke="#E65100" stroke-width="1.5"/>
</svg>"""
    return svg


def main():
    a = make_concept_a()
    b = make_concept_b()
    c = make_concept_c()

    fa = os.path.join(OUT_DIR, "tray-a-iso.svg")
    fb = os.path.join(OUT_DIR, "tray-b-elbow.svg")
    fc = os.path.join(OUT_DIR, "tray-c-section.svg")

    with open(fa, "w", encoding="utf-8") as f:
        f.write(a)
    with open(fb, "w", encoding="utf-8") as f:
        f.write(b)
    with open(fc, "w", encoding="utf-8") as f:
        f.write(c)

    print("Wrote concepts to:", OUT_DIR)
    
    # Render PNGs using render_png.py
    skill_scripts = r"C:\Users\jihad.kherfan.MCGI\.gemini\config\skills\logo-design\scripts"
    render_script = os.path.join(skill_scripts, "render_png.py")
    subprocess.run([sys.executable, render_script, fa, fb, fc, "--out-dir", OUT_DIR, "--size", "512"], check=True)
    print("Rendered PNGs.")


if __name__ == "__main__":
    main()

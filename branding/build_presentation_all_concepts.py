#!/usr/bin/env python3
"""Build complete multi-concept presentation board and render mockup slides for:
- Concept A: Isometric Ladder Tray
- Concept B: 90° Tray Routing Elbow
- Concept C: Tray Sizing Cross-Section
"""
import json
import math
import os
import subprocess
import sys

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BRANDING_DIR = os.path.join(BASE_DIR, "branding")
CONCEPTS_DIR = os.path.join(BRANDING_DIR, "concepts_v2")
SLIDES_DIR = os.path.join(CONCEPTS_DIR, "slides_all")
os.makedirs(SLIDES_DIR, exist_ok=True)

SKILL_SCRIPTS = r"C:\Users\jihad.kherfan.MCGI\.gemini\config\skills\logo-design\scripts"
sys.path.insert(0, BRANDING_DIR)
import build_authentic_tray_concepts
import build_concepts

# Dark-mode color palette
CLR_DARK_RAIL = "#CBD5E1"      # Light silver steel for rails on dark backgrounds
CLR_DARK_RUNG = "#64748B"      # Mid steel for rungs on dark
CLR_DARK_AMBER = "#FF6B00"     # High-vis amber
CLR_DARK_BLUE = "#3B82F6"      # Vivid blue
CLR_DARK_TEAL = "#10B981"      # Bright emerald green
CLR_WHITE = "#FFFFFF"


# -----------------------------------------------------------------------------
# 1. Dark Mode SVGs
# -----------------------------------------------------------------------------
def make_dark_svgs():
    # Concept A Dark
    # Replace steel colors with silver/white
    raw_a = build_authentic_tray_concepts.make_concept_a()
    dark_a = (raw_a
              .replace(build_authentic_tray_concepts.CLR_STEEL, CLR_DARK_RAIL)
              .replace(build_authentic_tray_concepts.CLR_STEEL_MID, CLR_DARK_RUNG)
              .replace(build_authentic_tray_concepts.CLR_STEEL_LGT, CLR_WHITE)
              .replace(build_authentic_tray_concepts.CLR_AMBER, CLR_DARK_AMBER)
              .replace(build_authentic_tray_concepts.CLR_BLUE, CLR_DARK_BLUE)
              .replace(build_authentic_tray_concepts.CLR_TEAL, CLR_DARK_TEAL))
    
    with open(os.path.join(CONCEPTS_DIR, "concept-a-dark.svg"), "w", encoding="utf-8") as f:
        f.write(dark_a)

    # Concept A Lockup Dark
    lock_a_dark = build_authentic_tray_concepts.make_lockup(
        build_authentic_tray_concepts.extract_body(dark_a),
        "AutoTray-Router — Concept A Lockup (Dark)",
        "a-dark"
    ).replace(build_authentic_tray_concepts.CLR_STEEL, CLR_WHITE).replace(build_authentic_tray_concepts.CLR_AMBER, CLR_DARK_AMBER)
    with open(os.path.join(CONCEPTS_DIR, "concept-a-lockup-dark.svg"), "w", encoding="utf-8") as f:
        f.write(lock_a_dark)

    # Concept B Dark
    raw_b = build_authentic_tray_concepts.make_concept_b()
    dark_b = (raw_b
              .replace(build_authentic_tray_concepts.CLR_STEEL, CLR_DARK_RAIL)
              .replace(build_authentic_tray_concepts.CLR_STEEL_MID, CLR_DARK_RUNG)
              .replace(build_authentic_tray_concepts.CLR_AMBER, CLR_DARK_AMBER)
              .replace(build_authentic_tray_concepts.CLR_BLUE, CLR_DARK_BLUE)
              .replace(build_authentic_tray_concepts.CLR_TEAL, CLR_DARK_TEAL))
    with open(os.path.join(CONCEPTS_DIR, "concept-b-dark.svg"), "w", encoding="utf-8") as f:
        f.write(dark_b)

    lock_b_dark = build_authentic_tray_concepts.make_lockup(
        build_authentic_tray_concepts.extract_body(dark_b),
        "AutoTray-Router — Concept B Lockup (Dark)",
        "b-dark"
    ).replace(build_authentic_tray_concepts.CLR_STEEL, CLR_WHITE).replace(build_authentic_tray_concepts.CLR_AMBER, CLR_DARK_AMBER)
    with open(os.path.join(CONCEPTS_DIR, "concept-b-lockup-dark.svg"), "w", encoding="utf-8") as f:
        f.write(lock_b_dark)

    # Concept C Dark
    raw_c = build_authentic_tray_concepts.make_concept_c()
    dark_c = (raw_c
              .replace(build_authentic_tray_concepts.CLR_STEEL, CLR_DARK_RAIL)
              .replace(build_authentic_tray_concepts.CLR_AMBER, CLR_DARK_AMBER)
              .replace(build_authentic_tray_concepts.CLR_BLUE, CLR_DARK_BLUE)
              .replace(build_authentic_tray_concepts.CLR_TEAL, CLR_DARK_TEAL))
    with open(os.path.join(CONCEPTS_DIR, "concept-c-dark.svg"), "w", encoding="utf-8") as f:
        f.write(dark_c)

    lock_c_dark = build_authentic_tray_concepts.make_lockup(
        build_authentic_tray_concepts.extract_body(dark_c),
        "AutoTray-Router — Concept C Lockup (Dark)",
        "c-dark"
    ).replace(build_authentic_tray_concepts.CLR_STEEL, CLR_WHITE).replace(build_authentic_tray_concepts.CLR_AMBER, CLR_DARK_AMBER)
    with open(os.path.join(CONCEPTS_DIR, "concept-c-lockup-dark.svg"), "w", encoding="utf-8") as f:
        f.write(lock_c_dark)


def main():
    make_dark_svgs()

    spec = {
        "brand": "AutoTray-Router",
        "tagline": "Industrial Cable Tray & Multi-Level Riser Sizing Engine",
        "brief": "An engineering application for electrical engineers, EPC contractors, and plant designers to model 3D multi-level cable tray routing, automate Dijkstra shortest-path cable assignments across elevation risers, and calculate commercial tray sizing compliant with NEC 392 and IEC 61537 standards.",
        "adjectives": ["Industrial", "Structural", "Precise", "Algorithmic"],
        "criteria": "Unmistakable industrial cable tray hardware (ladder rails with cross-rungs, tray elbow fittings, or sizing cross-sections). Must read cleanly at 16 px and on dark engineering UI.",
        "industry": "software",
        "brand_color": "#E65100",
        "tile_color": "#0F172A",
        "greyscale": False,
        "final": False,
        "round": 2,
        "concepts": [
            {
                "name": "Concept A: Isometric Ladder Tray",
                "symbol": "concept-a-symbol.svg",
                "lockup": "concept-a-lockup.svg",
                "symbol_on_dark": "concept-a-dark.svg",
                "lockup_on_dark": "concept-a-lockup-dark.svg",
                "idea": "An industrial 3D ladder cable tray with heavy C-channel side-rails, 5 welded transverse rungs, and 3 color-coded cables routed along the tray bed.",
                "rationale": [
                    "Immediately recognizable as an authentic industrial cable ladder tray (Eaton B-Line / OBO style)",
                    "30°/150° isometric projection communicates precision 3D CAD modeling",
                    "Clearly displays both the structural ladder tray and multi-cable routing"
                ]
            },
            {
                "name": "Concept B: 90° Tray Routing Elbow",
                "symbol": "concept-b-symbol.svg",
                "lockup": "concept-b-lockup.svg",
                "symbol_on_dark": "concept-b-dark.svg",
                "lockup_on_dark": "concept-b-lockup-dark.svg",
                "idea": "A 90° curved cable tray flat elbow fitting with concentric heavy C-channel rails, 5 radial ladder rungs, and 3 concentric routed cables turning the corner.",
                "rationale": [
                    "Directly represents an authentic cable tray fitting from plant single-line and routing schematics",
                    "Emphasizes shortest-path routing, direction changes, and branch calculation",
                    "Dynamic curved quadrant silhouette with strong visual energy"
                ]
            },
            {
                "name": "Concept C: Tray Sizing Cross-Section",
                "symbol": "concept-c-symbol.svg",
                "lockup": "concept-c-lockup.svg",
                "symbol_on_dark": "concept-c-dark.svg",
                "lockup_on_dark": "concept-c-lockup-dark.svg",
                "idea": "An engineering frontal cross-section of a heavy-gauge U-profile cable tray with side return flanges, central metallic divider plate, and power/control cable bundles with a width dimension bar.",
                "rationale": [
                    "Directly illustrates the core sizing engine: NEC 392 fill factors and metallic segregation",
                    "Bold, architectural frontal silhouette that stands out crisply in UI tables and dialogs",
                    "Accurate technical representation of commercial cable tray cross-section"
                ]
            }
        ],
        "recommendation": "Concept A (Isometric Ladder Tray) is the strongest overall choice because it is physically unmistakable, highly detailed yet robust, and conveys both physical tray hardware and 3D algorithmic routing.",
        "next_steps": [
            "Select your preferred concept (A, B, or C)",
            "Build full production kit (SVG master cuts, web icon bundle, high-res PNGs, guidelines)",
            "Deploy icons directly into frontend application"
        ]
    }

    spec_path = os.path.join(CONCEPTS_DIR, "presentation-spec-all.json")
    with open(spec_path, "w", encoding="utf-8") as f:
        json.dump(spec, f, indent=2)

    pres_html = os.path.join(CONCEPTS_DIR, "presentation-all.html")
    cmd = [
        sys.executable,
        os.path.join(SKILL_SCRIPTS, "presentation_board.py"),
        spec_path,
        "-o", pres_html,
        "--png-dir", SLIDES_DIR
    ]
    subprocess.run(cmd, check=True)
    print("Multi-concept presentation generated:", pres_html)
    print("Slides rendered to:", SLIDES_DIR)


if __name__ == "__main__":
    main()

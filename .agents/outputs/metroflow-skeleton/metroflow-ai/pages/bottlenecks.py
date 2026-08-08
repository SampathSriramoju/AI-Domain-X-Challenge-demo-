"""
Screen 3 — Bottleneck & V/C Detection.

Reference: UI/UX Specification, Section 5 (Screen 3) and Section 9
(GIS / Map Experience); PRD Module B (FR-B01, FR-B04); Data & Analytics
Specification, Section 6 (Bottleneck Detection). Node-based GIS heatmap
and V/C ranking are not implemented yet.
"""

from __future__ import annotations

from src.utils.ui import render_module_under_development, render_offline_disclaimer, render_page_header

_PLANNED_SUMMARY = """
- Compute Volume-to-Capacity (V/C) ratio per approach:
  `V/C = demand (veh/hr) / (lanes x saturation flow x green ratio)`.
- Flag any intersection with V/C > 1.0 as a bottleneck (LOS F).
- Render a corridor node map, color-coded by severity
  (Green < 0.85, Yellow 0.85–0.99, Red > 1.0).
- Rank intersections descending by worst-approach V/C ratio.
"""


def render() -> None:
    render_page_header(
        "Bottleneck Detection",
        "Corridor heatmap and Volume-to-Capacity (V/C) ranking.",
    )
    render_offline_disclaimer()
    render_module_under_development("Bottleneck & V/C Detection Engine", _PLANNED_SUMMARY)

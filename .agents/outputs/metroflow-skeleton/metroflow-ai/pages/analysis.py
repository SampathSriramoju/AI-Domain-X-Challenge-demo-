"""
Screen 3 — Congestion Analytics.

Reference: UI/UX Specification, Section 5 (Screen 3); PRD Module B
(FR-B01–FR-B03); Data & Analytics Specification, Section 5 (Peak
Congestion Analysis). No temporal clustering or V/C computation is
implemented yet — this page is a layout placeholder.
"""

from __future__ import annotations

from src.utils.ui import render_module_under_development, render_offline_disclaimer, render_page_header

_PLANNED_SUMMARY = """
- Apply a rolling 1-hour sum window across 15-minute interval volumes to
  find AM / Midday / PM peak windows.
- Assign Highway Capacity Manual (HCM) Level of Service (LOS) grades.
- Render an hourly volume bar chart with shaded peak-window overlays.
- Render a corridor heatmap (see Bottleneck Detection page).
"""


def render() -> None:
    render_page_header(
        "Congestion Analytics",
        "Peak congestion windows and hourly volume distribution.",
    )
    render_offline_disclaimer()
    render_module_under_development("Congestion Analytics Engine", _PLANNED_SUMMARY)

"""
Screen 4 — Signal Optimization & Simulation Workbench (parameters side).

Reference: UI/UX Specification, Section 5 (Screen 4); PRD Module C
(FR-C01–FR-C04); Data & Analytics Specification, Section 7 (Signal Timing
Recommendation) and Section 8 (Safety Guardrails). Webster's method and
the safety validator are NOT implemented in this skeleton.
"""

from __future__ import annotations

import streamlit as st

from config.settings import TRAFFIC_DEFAULTS
from src.utils.ui import render_module_under_development, render_offline_disclaimer, render_page_header

_PLANNED_SUMMARY = """
- Compute optimal cycle length via Webster's formula:
  `C0 = (1.5L + 5) / (1 - Y)`.
- Distribute green time proportionally to critical lane volume ratios.
- Calculate arterial coordination offsets for green-wave progression.
- Enforce hard safety lower-bounds (minimum pedestrian walk time,
  clearance intervals) via the Safety Validator — non-negotiable.
"""


def render() -> None:
    render_page_header(
        "Signal Optimization",
        "Cycle length, green split, and safety guardrail configuration.",
    )
    render_offline_disclaimer()

    st.markdown("#### Timing Parameters (preview only)")
    st.slider(
        "Cycle Length (seconds)",
        min_value=TRAFFIC_DEFAULTS.min_cycle_length_sec,
        max_value=TRAFFIC_DEFAULTS.max_cycle_length_sec,
        value=120,
        disabled=True,
        help="Disabled until the optimization engine is implemented.",
    )
    st.caption(
        f"Configured bounds: {TRAFFIC_DEFAULTS.min_cycle_length_sec}s "
        f"– {TRAFFIC_DEFAULTS.max_cycle_length_sec}s "
        f"(default saturation flow: {TRAFFIC_DEFAULTS.saturation_flow_veh_per_hr_per_lane} veh/hr/lane)."
    )

    st.divider()
    render_module_under_development("Signal Optimization Engine", _PLANNED_SUMMARY)

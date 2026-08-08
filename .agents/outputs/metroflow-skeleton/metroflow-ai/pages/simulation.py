"""
Screen 4 — Simulation & What-If Stress Testing (results side).

Reference: UI/UX Specification, Section 5 (Screen 4); PRD Module D
(FR-D01–FR-D04); Data & Analytics Specification, Section 9 (Before vs
After Simulation) and Section 10 (What-If Stress Testing). M/M/1 queuing
math is NOT implemented in this skeleton.
"""

from __future__ import annotations

import streamlit as st

from config.settings import TRAFFIC_DEFAULTS
from src.utils.ui import render_module_under_development, render_offline_disclaimer, render_page_header

_PLANNED_SUMMARY = """
- Simulate "before vs. after" delay and queue length using M/M/1 and
  Webster queuing formulation logic.
- Display side-by-side metric cards: Control Delay, Queue Length,
  Intersection LOS.
- Provide a Volume Surge Stress Test slider (-30% to +30%) that
  recalculates delay/queue against the fixed recommended plan.
- Estimate fuel and CO2 impact deltas.
- Always label results as simulated estimates — never guaranteed outcomes.
"""


def render() -> None:
    render_page_header(
        "Simulation & What-If Analysis",
        "Before vs. after performance estimates and stress testing.",
    )
    render_offline_disclaimer()

    low_pct, high_pct = TRAFFIC_DEFAULTS.stress_test_range_pct
    st.markdown("#### Volume Surge Stress Test (preview only)")
    st.slider(
        "Demand change (%)",
        min_value=low_pct,
        max_value=high_pct,
        value=0,
        disabled=True,
        help="Disabled until the simulation engine is implemented.",
    )
    st.caption("*Disclaimer: Simulated estimate based on steady-state arrivals.*")

    st.divider()
    render_module_under_development("Queuing Simulation Engine", _PLANNED_SUMMARY)

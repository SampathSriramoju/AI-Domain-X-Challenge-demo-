"""
Screen 5 — Report & Export Center.

Reference: UI/UX Specification, Section 5 (Screen 5); PRD Module E
(FR-E03–FR-E04). NEMA CSV and executive PDF generation are NOT
implemented in this skeleton.
"""

from __future__ import annotations

import streamlit as st

from src.utils.ui import render_module_under_development, render_offline_disclaimer, render_page_header

_PLANNED_SUMMARY = """
- Generate a NEMA/170/2070-compliant controller timing sheet (CSV).
- Generate a branded executive summary report (PDF) including simulation
  assumptions and the AI narrative.
- Every export will carry an explicit offline / advisory-only disclaimer.
"""


def render() -> None:
    render_page_header(
        "Reports & Export",
        "Download controller timing sheets and executive summaries.",
    )
    render_offline_disclaimer()

    col1, col2 = st.columns(2)
    col1.button("⬇️ Download Controller Timing Sheet (CSV)", disabled=True, use_container_width=True)
    col2.button("⬇️ Download Executive PDF Report", disabled=True, use_container_width=True)
    st.caption("Export buttons are disabled until the report generation module is implemented.")

    st.divider()
    render_module_under_development("Report Export Suite", _PLANNED_SUMMARY)

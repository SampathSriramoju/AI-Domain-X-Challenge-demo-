"""
Shared, presentation-only UI helpers used across every Streamlit page.

Nothing in this module performs traffic analysis, optimization, simulation,
or AI work — it only standardizes how pages render their shell so the app
looks consistent while each module is still a placeholder.
"""

from __future__ import annotations

import streamlit as st

from config.settings import APP_MODE, APP_NAME


def render_page_header(title: str, subtitle: str = "") -> None:
    """Render a consistent page title block."""
    st.title(title)
    if subtitle:
        st.caption(subtitle)
    st.divider()


def render_offline_disclaimer() -> None:
    """Render the mandatory offline / advisory-only disclaimer.

    Per the PRD guardrails, every screen must make it clear that MetroFlow AI
    is an offline decision-support tool with no live signal control and no
    guaranteed real-world outcomes.
    """
    st.info(
        f"**{APP_NAME}** is an **{APP_MODE.lower()}**. "
        "It does not connect to or control live traffic signals, and all "
        "metrics shown are simulated estimates — not guaranteed outcomes.",
        icon="ℹ️",
    )


def render_module_under_development(module_name: str, planned_summary: str = "") -> None:
    """Standard placeholder shown on any page with no backend logic yet."""
    st.warning("🚧 **Module under development.**", icon="🚧")
    st.markdown(
        f"The **{module_name}** module has not been implemented yet. "
        "This page is currently a UI placeholder only, per the approved "
        "UI/UX Specification and Software Architecture documents."
    )
    if planned_summary:
        with st.expander("What this module will do (per project specs)"):
            st.markdown(planned_summary)


def render_demo_data_badge() -> None:
    """Visible tag to prevent confusing placeholder numbers with real output."""
    st.markdown(
        "<span style='background-color:#F59E0B; color:#111; "
        "padding:2px 10px; border-radius:8px; font-size:0.75rem; "
        "font-weight:600;'>DEMO DATA — NOT REAL ANALYSIS</span>",
        unsafe_allow_html=True,
    )

"""
Screen 1 — Dashboard & Project Management.

Reference: UI/UX Specification, Section 5 (Screen 1) and Section 7
(Dashboard Design). This is a layout-only skeleton: KPI cards and the
project grid use placeholder DEMO DATA, clearly labeled as such. No real
project persistence or analytics is wired up yet.
"""

from __future__ import annotations

import pandas as pd
import streamlit as st

from src.utils.ui import render_demo_data_badge, render_offline_disclaimer, render_page_header

_DEMO_PROJECTS = pd.DataFrame(
    [
        {
            "Project": "Main St Corridor Retiming",
            "Intersections": 5,
            "Status": "Awaiting Data Upload",
            "Last Updated": "—",
        },
        {
            "Project": "Downtown Arterial Corridor",
            "Intersections": 8,
            "Status": "Not Started",
            "Last Updated": "—",
        },
    ]
)


def render() -> None:
    render_page_header(
        "Dashboard",
        "Overview of retiming projects and municipal impact metrics.",
    )
    render_offline_disclaimer()

    st.subheader("System KPIs")
    render_demo_data_badge()

    col1, col2, col3 = st.columns(3)
    col1.metric("Total Intersections Analyzed", "0", help="DEMO DATA — no analysis run yet.")
    col2.metric("Average Delay Reduced", "—", help="DEMO DATA — populated after optimization.")
    col3.metric("Last Plan Update", "—", help="DEMO DATA — populated after export.")

    st.divider()

    st.subheader("Active Retiming Projects")
    render_demo_data_badge()
    st.dataframe(_DEMO_PROJECTS, use_container_width=True, hide_index=True)

    st.divider()
    if st.button("➕ Create New Corridor Retiming Project", type="primary"):
        st.session_state.active_page = "upload"
        st.rerun()

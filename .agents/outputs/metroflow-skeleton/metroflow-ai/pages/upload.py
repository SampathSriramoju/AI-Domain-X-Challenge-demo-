"""
Screen 2 — Data Ingestion & Corridor Configuration.

Reference: UI/UX Specification, Section 5 (Screen 2); PRD Module A
(FR-A01–FR-A04); Data & Analytics Specification, Section 3 (Data
Validation). The upload widgets are wired up for interaction only — no
parsing, validation, or persistence is implemented in this skeleton.
"""

from __future__ import annotations

import streamlit as st

from src.utils.ui import render_module_under_development, render_offline_disclaimer, render_page_header

_PLANNED_SUMMARY = """
- Parse 15-minute traffic volume CSVs (`Timestamp`, `Intersection_ID`,
  `Approach_Direction`, `Volume`).
- Accept road geometry metadata (lanes, speed limits, turning ratios).
- Accept optional incident logs (accidents, roadwork).
- Run validation: missing values, duplicates, unrealistic volumes,
  turning-ratio normalization.
- Display row-level warnings/errors before allowing analysis to proceed.
"""


def render() -> None:
    render_page_header(
        "Data Ingestion & Corridor Configuration",
        "Upload historical traffic counts and define road geometry.",
    )
    render_offline_disclaimer()

    left, right = st.columns(2)

    with left:
        st.markdown("#### Traffic Count & Incident Data")
        st.file_uploader(
            "Drag and drop traffic count CSV",
            type=["csv"],
            key="traffic_csv_upload",
            help="Expected columns: Timestamp, Intersection_ID, Approach_Direction, Volume",
        )
        st.file_uploader(
            "Incident log CSV (optional)",
            type=["csv"],
            key="incident_csv_upload",
        )

    with right:
        st.markdown("#### Road Geometry & Metadata")
        st.number_input("Number of intersections in corridor", min_value=1, max_value=50, value=5)
        st.selectbox("Default speed limit (mph)", options=[25, 30, 35, 40, 45, 50], index=2)
        st.caption(
            "Full geometry entry (lanes, turning ratios per approach) will be "
            "available once the metadata form is implemented."
        )

    st.divider()
    st.button("Parse & Analyze Congestion Data", type="primary", disabled=True)
    st.caption("Disabled until the data ingestion module is implemented.")

    st.divider()
    render_module_under_development("Data Ingestion & Validation", _PLANNED_SUMMARY)

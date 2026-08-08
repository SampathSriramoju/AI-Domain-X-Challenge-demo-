"""
MetroFlow AI — Application Entry Point.

Offline municipal traffic analytics and signal timing optimization platform
(Hackathon MVP). This file wires up the Streamlit page shell and sidebar
navigation only. Each screen's actual logic lives under `pages/` and, once
implemented, will call into `src/` modules (data, analytics, optimization,
simulation, ai, reports).

Run with:
    streamlit run app.py
"""

from __future__ import annotations

import streamlit as st

from config.settings import APP_NAME, APP_TAGLINE, APP_VERSION, NAV_PAGES
from pages import (
    ai_explanation,
    analysis,
    bottlenecks,
    dashboard,
    optimization,
    reports,
    simulation,
    upload,
)

PAGE_RENDERERS = {
    "dashboard": dashboard.render,
    "upload": upload.render,
    "analysis": analysis.render,
    "bottlenecks": bottlenecks.render,
    "optimization": optimization.render,
    "simulation": simulation.render,
    "ai_explanation": ai_explanation.render,
    "reports": reports.render,
}


def _configure_page() -> None:
    st.set_page_config(
        page_title=APP_NAME,
        page_icon="🚦",
        layout="wide",
        initial_sidebar_state="expanded",
    )
    # Design-system-aligned light styling (primary blue #0F52BA, 8px radius).
    st.markdown(
        """
        <style>
            .block-container { padding-top: 2rem; }
            [data-testid="stSidebar"] { border-right: 1px solid rgba(0,0,0,0.06); }
            div[data-testid="stMetric"] {
                background-color: rgba(15, 82, 186, 0.04);
                border-radius: 8px;
                padding: 12px 16px;
                border: 1px solid rgba(15, 82, 186, 0.12);
            }
            .stButton>button {
                border-radius: 8px;
            }
        </style>
        """,
        unsafe_allow_html=True,
    )


def _init_session_state() -> None:
    if "active_page" not in st.session_state:
        st.session_state.active_page = "dashboard"
    if "project_name" not in st.session_state:
        st.session_state.project_name = "Untitled Corridor Project"
    if "dataset_uploaded" not in st.session_state:
        st.session_state.dataset_uploaded = False


def _render_sidebar() -> None:
    with st.sidebar:
        st.markdown(f"### 🚦 {APP_NAME}")
        st.caption(APP_TAGLINE)
        st.caption(f"v{APP_VERSION}")
        st.divider()

        st.markdown(f"**Workspace:** {st.session_state.project_name}")
        st.divider()

        st.markdown("**Navigate**")
        for page in NAV_PAGES:
            is_active = st.session_state.active_page == page["key"]
            if st.button(
                f"{page['icon']}  {page['label']}",
                key=f"nav_{page['key']}",
                use_container_width=True,
                type="primary" if is_active else "secondary",
            ):
                st.session_state.active_page = page["key"]
                st.rerun()

        st.divider()
        st.caption(
            "Offline decision-support tool only. "
            "No live signal control. No guaranteed outcomes."
        )


def main() -> None:
    _configure_page()
    _init_session_state()
    _render_sidebar()

    renderer = PAGE_RENDERERS.get(st.session_state.active_page, dashboard.render)
    renderer()


if __name__ == "__main__":
    main()

"""
Screen 5 — AI Rationale Panel.

Reference: UI/UX Specification, Section 5 (Screen 5); PRD Module E
(FR-E01–FR-E02); Data & Analytics Specification, Section 12 (AI Role).
Azure OpenAI is NOT integrated in this skeleton — this page only shows
where the narrative will render and how the connection status will look.
"""

from __future__ import annotations

import streamlit as st

from config.settings import AZURE_OPENAI_CONFIG
from src.utils.ui import render_module_under_development, render_offline_disclaimer, render_page_header

_PLANNED_SUMMARY = """
- Send a structured JSON payload of before/after simulation metrics to
  Azure OpenAI.
- Generate a 2-3 paragraph plain-language engineering narrative explaining
  *why* green splits changed.
- The AI will strictly explain results — it will never perform
  calculations or override safety constraints (those stay in deterministic
  Python code).
- Fall back to a deterministic template summary if the AI service is
  unavailable.
"""


def render() -> None:
    render_page_header(
        "AI Rationale",
        "Plain-language engineering explanation of recommended changes.",
    )
    render_offline_disclaimer()

    if AZURE_OPENAI_CONFIG.is_configured:
        st.success("Azure OpenAI credentials detected in environment.", icon="✅")
    else:
        st.warning(
            "Azure OpenAI is not yet configured (see `.env.example`). "
            "This is expected at this stage of the build.",
            icon="🔌",
        )

    st.divider()
    render_module_under_development("AI Rationale Engine", _PLANNED_SUMMARY)

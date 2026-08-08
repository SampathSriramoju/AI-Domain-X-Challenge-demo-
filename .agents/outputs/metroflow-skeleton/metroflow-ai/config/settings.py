"""
Central configuration for MetroFlow AI.

This module only centralizes constants, environment variables, and app
metadata as described in the Software Architecture doc (Chapter 3 —
"Configuration" module). It intentionally contains NO traffic-engineering
calculations, optimization logic, or AI logic — those belong to
src/analytics, src/optimization, src/simulation, and src/ai respectively,
and will be implemented in later modules.
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field

from dotenv import load_dotenv

load_dotenv()


# --- Application metadata -----------------------------------------------

APP_NAME = "MetroFlow AI"
APP_TAGLINE = "Unlocking urban movement through explainable signal retiming."
APP_MODE = "Offline Decision-Support Platform"  # Not a live control system.
APP_VERSION = "0.1.0 (Skeleton)"


# --- Navigation (mirrors the UI/UX Specification sitemap) ---------------

NAV_PAGES: list[dict[str, str]] = [
    {"key": "dashboard", "label": "Dashboard", "icon": "🏠"},
    {"key": "upload", "label": "Data Ingestion", "icon": "📤"},
    {"key": "analysis", "label": "Congestion Analytics", "icon": "📊"},
    {"key": "bottlenecks", "label": "Bottleneck Detection", "icon": "🚦"},
    {"key": "optimization", "label": "Signal Optimization", "icon": "🛠️"},
    {"key": "simulation", "label": "Simulation & What-If", "icon": "🔁"},
    {"key": "ai_explanation", "label": "AI Rationale", "icon": "🧠"},
    {"key": "reports", "label": "Reports & Export", "icon": "📄"},
]


# --- Default traffic-engineering parameters ------------------------------
# These are DEFAULT CONSTANTS referenced by the PRD / Data Spec / Architecture
# doc for later use by the analytics and optimization modules. Defining them
# here is configuration, not implementation — no formulas are evaluated in
# this skeleton.

@dataclass(frozen=True)
class TrafficDefaults:
    saturation_flow_veh_per_hr_per_lane: int = 1900
    pedestrian_walk_speed_ft_per_sec: float = 3.5
    min_cycle_length_sec: int = 60
    max_cycle_length_sec: int = 180
    stress_test_range_pct: tuple[int, int] = (-30, 30)
    default_speed_limit_mph: int = 35


TRAFFIC_DEFAULTS = TrafficDefaults()


# --- Environment / secrets (never hard-coded) -----------------------------

@dataclass(frozen=True)
class AzureOpenAIConfig:
    api_key: str = field(default_factory=lambda: os.getenv("AZURE_OPENAI_API_KEY", ""))
    endpoint: str = field(default_factory=lambda: os.getenv("AZURE_OPENAI_ENDPOINT", ""))
    deployment_name: str = field(
        default_factory=lambda: os.getenv("AZURE_OPENAI_DEPLOYMENT_NAME", "")
    )
    api_version: str = field(
        default_factory=lambda: os.getenv("AZURE_OPENAI_API_VERSION", "2024-02-15-preview")
    )

    @property
    def is_configured(self) -> bool:
        return bool(self.api_key and self.endpoint and self.deployment_name)


AZURE_OPENAI_CONFIG = AzureOpenAIConfig()

LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")

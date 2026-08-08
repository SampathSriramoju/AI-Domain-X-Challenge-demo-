"""
Smoke tests for the Module 1 project skeleton.

These only verify that the app imports cleanly and that configuration
constants are well-formed. There is no analytics, optimization,
simulation, or AI logic to test yet — those test suites will be added
alongside each respective module.
"""

from __future__ import annotations

from config.settings import APP_NAME, NAV_PAGES, TRAFFIC_DEFAULTS


def test_app_name_is_set() -> None:
    assert APP_NAME == "MetroFlow AI"


def test_nav_pages_cover_all_screens() -> None:
    expected_keys = {
        "dashboard",
        "upload",
        "analysis",
        "bottlenecks",
        "optimization",
        "simulation",
        "ai_explanation",
        "reports",
    }
    actual_keys = {page["key"] for page in NAV_PAGES}
    assert actual_keys == expected_keys


def test_traffic_defaults_are_sane() -> None:
    assert TRAFFIC_DEFAULTS.min_cycle_length_sec < TRAFFIC_DEFAULTS.max_cycle_length_sec
    assert TRAFFIC_DEFAULTS.saturation_flow_veh_per_hr_per_lane > 0


def test_page_modules_import_and_expose_render() -> None:
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

    for module in (
        dashboard,
        upload,
        analysis,
        bottlenecks,
        optimization,
        simulation,
        ai_explanation,
        reports,
    ):
        assert callable(module.render)

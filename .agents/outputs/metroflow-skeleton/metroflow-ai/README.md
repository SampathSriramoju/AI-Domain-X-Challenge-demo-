# MetroFlow AI

**Offline Municipal Traffic Analytics & Signal Timing Optimization Platform**
Hackathon MVP — Problem Statement #18 (Smart Infrastructure)

> MetroFlow AI is an **offline decision-support tool**. It ingests historical
> traffic data and recommends signal timing changes for human engineers to
> review — it does **not** connect to or control live traffic signals, and it
> makes **no guaranteed real-world improvement claims**.

---

## 1. Project Overview

MetroFlow AI helps municipal traffic engineers identify corridor congestion
bottlenecks and generate offline, explainable signal-timing recommendations
from historical traffic volume data — replacing a manual process that
traditionally takes weeks with a workflow intended to take minutes.

This repository currently implements **Module 1: Project Setup & Application
Skeleton** only. See [Current Implementation Status](#5-current-implementation-status)
below for exactly what works today.

Reference documents (finalized, drive all implementation decisions):
- Official Problem Statement
- Research Report
- Product Requirements Document (PRD)
- Data & Analytics Specification
- UI/UX Specification
- Software Architecture & Technical Design

## 2. Technology Stack

| Layer | Technology |
|---|---|
| UI | Streamlit |
| Data processing | Pandas, NumPy |
| Charts (planned) | Plotly |
| AI narrative (planned, later module) | Azure OpenAI |
| Config | python-dotenv |

Mapping libraries (Folium/PyDeck) are **not yet installed** — they will be
added only when the Bottleneck Detection GIS heatmap is implemented, per the
UI/UX Specification.

## 3. Installation

```bash
# 1. Clone / enter the project directory
cd metroflow-ai

# 2. Create and activate a virtual environment
python3 -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate

# 3. Install dependencies
pip install -r requirements.txt
```

## 4. Environment Setup

Copy the example environment file and fill in real values **locally only**
(never commit `.env`):

```bash
cp .env.example .env
```

`AZURE_OPENAI_*` variables are placeholders for the future AI Rationale
module and are not required to run the current skeleton.

## 5. How to Run

```bash
streamlit run app.py
```

The app starts on `http://localhost:8501` with sidebar navigation across all
eight planned screens.

Run the smoke tests:

```bash
pip install pytest
pytest tests/ -v
```

## 6. Current Implementation Status

**Implemented (Module 1 — this delivery):**
- Full project folder structure (`pages/`, `src/`, `config/`, `datasets/`, `tests/`, `docs/`).
- Working Streamlit application shell with sidebar navigation across all 8 screens.
- Placeholder pages for every module in the UI/UX Specification sitemap:
  Dashboard, Data Ingestion, Congestion Analytics, Bottleneck Detection,
  Signal Optimization, Simulation & What-If, AI Rationale, Reports & Export.
- Dashboard KPI cards and project grid using explicitly labeled **DEMO DATA**.
- Centralized configuration (`config/settings.py`) with navigation metadata
  and default traffic-engineering constants (saturation flow, cycle bounds,
  pedestrian walk speed) sourced from the PRD/Architecture doc — **not**
  used in any calculation yet.
- `.env.example` for future Azure OpenAI configuration (no real keys).
- Basic smoke tests confirming the app imports and boots cleanly.

**NOT implemented yet (by design, per scope for this delivery):**
- CSV parsing, validation, or data cleaning logic.
- Peak-window detection, V/C ratio, or LOS calculations.
- Webster's method / cycle length / green split optimization.
- Safety validator (pedestrian walk time enforcement).
- M/M/1 queuing simulation or what-if stress testing.
- Azure OpenAI integration / narrative generation.
- NEMA CSV / PDF report generation.
- Database persistence (all state is in-memory `st.session_state` only).

Every placeholder page clearly displays **"🚧 Module under development."**
and never presents fabricated numbers as real analysis output.

## 7. Project Structure

```
metroflow-ai/
├── app.py                   # Entry point: page shell + sidebar navigation/router
├── pages/                   # One module per screen (UI only, calls into src/ later)
│   ├── dashboard.py
│   ├── upload.py
│   ├── analysis.py
│   ├── bottlenecks.py
│   ├── optimization.py
│   ├── simulation.py
│   ├── ai_explanation.py
│   └── reports.py
├── src/                     # Backend modules (empty scaffolding, logic added later)
│   ├── data/
│   ├── analytics/
│   ├── optimization/
│   ├── simulation/
│   ├── ai/
│   ├── reports/
│   └── utils/                # Shared, presentation-only UI helpers (implemented)
├── datasets/
│   ├── raw/                  # User-uploaded source CSVs (gitignored)
│   └── processed/            # Cleaned/derived datasets (gitignored)
├── tests/                    # Smoke tests for the skeleton
├── config/
│   └── settings.py           # App metadata, nav config, default constants, env loading
├── docs/                     # Project documentation
├── requirements.txt
├── .gitignore
├── .env.example
└── README.md
```

## 8. Next Module

Recommended next step: **Module 2 — Data Ingestion & Validation**
(`src/data/`, wiring `pages/upload.py`), implementing CSV parsing against
the schema defined in the Data & Analytics Specification (Timestamp,
Intersection_ID, Approach_Direction, Volume) and the validation rules table
(missing values, duplicates, unrealistic volumes, turning-ratio
normalization).

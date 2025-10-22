
# 🧠 Snow Quality Evaluation — Codex Integration Notes

This document defines how Codex should extend **Camptocamp Explorer** to include the *Snow Quality Evaluation* system.  
It synthesizes the agreed logic from avalanche and snow-science literature (Tremper, Freedom of the Hills) with our current data structure and C2C API usage.

---

## 🎯 Goal

Develop a **route-level snow quality scoring system** that estimates **where cold, preserved, skiable powder is most likely found** after snowfall events.

The purpose is *not avalanche prediction*, but *snow experience estimation* — finding **fresh snow that hasn’t been ruined by wind, sun, or warmth**.

This system will evolve from qualitative heuristics → data-driven model.

---

## 🧩 Core Idea

Each C2C route is assigned a **Reliability Tier** based on how much metadata it provides:  

| Tier | Required C2C Fields | Description |
|------|----------------------|-------------|
| **POOR** | `orientations`, `elevation_min/max`, `geometry|bbox`, `activities` | Basic elevation + aspect logic only. |
| **MEDIUM** | POOR + `configuration` or `route_type` (+ optional `glacier`) | Adds terrain context (collector vs ridge). |
| **GREAT** | MEDIUM + `slope_max` (+ precise `geometry`) | Enables confident wind and preservation modeling. |

> All routes passing **POOR** are imported.  
> Routes missing these fields are excluded from snow scoring but remain searchable for catalog purposes.

---

## 🧠 Conceptual Model

The **Snow Quality Index (SQI)** combines multiple environmental factors into a single qualitative output.

### Inputs (Weather + Terrain)
| Category | Variables | Source |
|-----------|------------|--------|
| **Snowfall** | 24–72h accumulation, rain–snow line | Weather model |
| **Wind** | Direction, speed | Weather model |
| **Temperature** | min/max, freezing level | Weather model |
| **Radiation / Cloud** | solar energy input | Weather model |
| **Terrain** | aspect, slope, elevation, route_type | C2C API |
| **Time** | hours since last snowfall | Derived |

### Outputs
| Name | Type | Description |
|------|------|-------------|
| `freshness_score` | float (0–1) | Recency & amount of snow vs elevation |
| `preservation_score` | float (0–1) | Shade, temperature, radiation |
| `wind_effect` | enum | “lee-loaded”, “scoured”, “neutral” |
| `snow_quality_label` | enum | “Good”, “Mixed”, “Poor” |
| `reliability_tier` | enum | “Poor”, “Medium”, “Great” |

---

## 🧮 Evaluation Logic (Heuristic Overview)

Example rules that Codex should implement in weather evaluation functions:

```text
1. If snowfall_48h > 20cm and elevation > freezing_level → +freshness
2. If aspect ∈ [N, NE, NW] and temp_max < –2°C → +preservation
3. If aspect ∈ [S, SW, SE] and radiation_high → –preservation
4. If windy (≥10 m/s) and aspect is lee → +freshness (wind loading)
5. If windy and aspect is windward → –quality (scouring)
6. Terrain weighting:
   - Couloir / Face → +collector bonus
   - Ridge → –wind exposure penalty
7. Combine weighted scores into qualitative label:
   SQI = f(freshness + preservation + terrain)
```

### Label Mapping
| SQI Range | Label | Example |
|------------|--------|---------|
| ≥3.5 | **Good / Powder likely** | Cold, shaded, recent snow |
| 1.5–3.4 | **Mixed / Variable** | Transitional or wind-affected |
| <1.5 | **Poor / Crusted or Thin** | Sun or warmth affected |

---

## 🧭 Example — Col des Cristaux (Route 45532)

**Route Data (C2C):**
- Aspect: NE  
- Elevation: 3230–3600 m  
- Configuration: “face”  
- Slope: 47°  
- Geometry: detailed LineString  
→ **Reliability: GREAT**

**Mock Weather:**
- New snow 25 cm / 48 h above 2800 m  
- Freezing level = 1800 m  
- Temp (3000 m): –5 °C / –12 °C  
- Wind: WNW 12 m/s, clear skies

**Result:**
> _Snow Quality: Good → Excellent (powder preserved)_  
> _Reasoning: NE aspect, shaded, cold, above freezing level, lee to WNW wind._

---

## 🧱 Implementation Guidance

1. **Weather Module**
   - Input: route geometry, weather grids (snowfall, wind, temp, radiation)
   - Output: per-route weather context (averaged or sampled)
   - Store results as transient cache or computed field.

2. **Evaluation Module**
   - Input: route metadata + weather context
   - Output: qualitative label + explanation
   - Deterministic and auditable (simple weights, no ML yet).

3. **Reliability Filter**
   - Server-side: classify route reliability during data ingestion.
   - Store tier in DB or cache for faster filtering.

4. **UI Integration**
   - Display snow quality label with color-coded badge.
   - Tooltip or expandable reasoning text (e.g. “NE aspect above freezing level; lee to WNW wind”).

---

## 📅 Roadmap

| Phase | Focus | Deliverable |
|--------|--------|-------------|
| **0 — Data Integrity** | Ensure routes have minimum C2C fields; assign reliability tiers. | “weather-ready” route list |
| **1 — Weather Join** | Add simple weather context from meteo API or static dataset. | per-route weather snapshot |
| **2 — Evaluation Logic** | Implement heuristic scoring & labeling (Good/Mixed/Poor). | `evaluateSnow()` function |
| **3 — Validation** | Compare computed labels vs. C2C recent outing condition texts. | calibration metrics |
| **4 — UI Polish** | Integrate badges and explanations into route cards & details. | public release candidate |

---

## ⚙️ Design Principles

- Deterministic, explainable logic (avoid black-box ML initially).  
- Each route record should expose both the **score** and **why**.  
- Weather evaluation runs **server-side**, cached with timestamp.  
- Expandable later with probabilistic or ML-based refinements.

---

**Document purpose:** Internal Codex instruction for implementing the Snow Quality Evaluation layer in Camptocamp Explorer.

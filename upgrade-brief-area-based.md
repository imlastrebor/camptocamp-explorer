# Upgrade Brief: From BBox to Area-Based Route Listing

**Audience:** GitHub Copilot / Codex  
**Scope:** Evolve the existing MVP (already live) from **BBox-based** route queries to **area-based (waypoint) selection** for increased precision and semantics. Avoid code-level directives; use project context from `camptocamp-explorer-mvp.md`.

---

## Problem Statement
The MVP lists routes using a geographic **bounding box** around Chamonix. This is fast but imprecise: the box can include adjacent areas and lacks the semantic notion of “belongs to Mont-Blanc massíf” or similar. We want a **clean, future-proof** approach that aligns with Camptocamp’s data model.

## Desired Outcome
Use **area/waypoint IDs** (e.g., “Mont-Blanc” and “Haut Giffre – Aiguilles Rouges – Fiz”) as the **primary filter** for listing routes, rather than a raw bbox. The system should still be able to **fallback to bbox** if needed, but **areas** should be the default path for user-visible listings.

**Examples of target areas (IDs from Camptocamp):**
- Mont-Blanc: **14410**
- Haut Giffre – Aiguilles Rouges – Fiz: **14404**

> These correspond to the same “areas” used on camptocamp.org route search (e.g., routes filtered by `a=14410,14404`).

## Why This Change
- **Semantic accuracy:** Routes explicitly **associated** to a massif/area are included; nearby-but-not-associated routes are excluded.  
- **Future-proofing:** Smooth path to hierarchical browsing (massif → subareas → routes), interactive map search, and DB indexing keyed by area.  
- **Consistency:** Mirrors how users think (“routes in Mont-Blanc”) rather than an arbitrary rectangle.

## Requirements & Boundaries
- **Keep UI/UX stable:** The existing list and detail flows remain; only the **query source** changes from bbox → areas.  
- **No hardcode to Chamonix only:** Support **one or many** area IDs (array).  
- **Pagination preserved:** Maintain current pagination/limit/offset behaviors.  
- **Filters preserved:** Existing filters (e.g., `q`, activities) continue to work alongside area filtering.  
- **Fallback path:** If area-based retrieval is unavailable or returns empty due to data gaps, retain the ability to fall back to the previous bbox logic (non-default).  
- **No DB or map in this iteration:** This is a query-layer change, not a storage or UI overhaul.

## High-Level Approach (Non-Prescriptive)
- Introduce an **area-first** listing mode that accepts **one or more waypoint IDs**.  
- Use the Camptocamp data model’s **associations** between routes and waypoints/areas to constrain results.  
- Ensure the fetch layer cleanly separates **area-based** and **bbox-based** selection so call sites can switch without touching UI.  
- Preserve existing filters and pagination semantics.  
- Add minimal error/reporting behavior for cases where area-based results are unexpectedly empty (optional, non-blocking).

## Acceptance Criteria
1. When area IDs are provided, the route list contains **only routes associated** with those areas.  
2. When no area IDs are provided, behavior is unchanged (legacy bbox path continues to work).  
3. Pagination and existing filters (`q`, activities, etc.) behave as before.  
4. A smoke test with area IDs **14410** and **14404** returns results that align with camptocamp.org’s area-based listings.  
5. The code structure makes it straightforward to extend to **multiple areas** and to **toggle** between area and bbox strategies.

## Edge Cases / Considerations
- **Data incompleteness:** Some routes may lack area associations; the fallback option provides resilience.  
- **Multi-area queries:** Results should unify routes across all requested area IDs with stable pagination.  
- **Performance:** Keep current caching strategy; area-based queries should be cacheable like bbox queries.  
- **Internationalization:** Not part of this upgrade; existing behavior remains.

## Future Hooks (Non-Blocking for Now)
- Hierarchical selection (massif → subarea → waypoint).  
- Interactive map selection that resolves to area IDs.  
- Optional DB index keyed by area for faster aggregation.  
- Server-side reconciliation strategy combining **area associations** with **geometry** for maximum completeness.

---

**Hand-off Note:** Use the context already present in `camptocamp-explorer-mvp.md` for project details. This brief only conveys *what* to change and *why*, not *how* to implement it.

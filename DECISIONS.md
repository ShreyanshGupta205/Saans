# Architectural Decision Records (ADRs) — Saans

## ADR 001: Deterministic Impact Engine vs. Large Language Model (Zero Numerical Hallucination Guarantee)

### Context
In winter smog advisories, statistical numbers (e.g. exposure reduction percentages, tailpipe emission reductions, and multi-household scaling factors) carry public health and lifestyle implications. General-purpose LLMs routinely hallucinate statistics, inventing arbitrary figures like "reduces pollution by 87.4%" without grounding or scientific citation.

### Decision
We strictly decouple qualitative recommendation text from numerical computation:
1. **The LLM (Gemini)** selects appropriate clean-air interventions, crafts colloquial explanations in English and Hindi, and formats user-centric rationale.
2. **The Deterministic Impact Engine (`lib/impact`)** computes all exposure reductions, tailpipe emission factors, and community scaling metrics.
3. Every numeric impact factor in `data/impact-factors.ts` references authoritative peer-reviewed or governmental sources (CPCB NAQI 2014, WHO 2021 Guidelines, ARAI Indian Vehicle Emission Inventories, CEEW Indoor Air Quality Studies, CEA Grid Emissions Database). If no credible empirical study exists, a qualitative statement is shown instead of a manufactured number.

### Consequences
- **Positive:** Zero risk of artificial or misleading statistics. Full traceability to empirical literature.
- **Negative:** Action card schemas require deterministic impact metric binding on the server before client serialization.

---

## ADR 002: In-Memory Sliding-Window Rate Limiting in Serverless Runtimes

### Context
To defend against abusive traffic, denial-of-wallet, and scraping across public API endpoints (`/api/aqi`, `/api/plan`, `/api/chat`, `/api/geocode`), request throttling is essential.

### Decision
We implement a lightweight in-memory sliding-window token limiter (`SlidingWindowRateLimiter`) with automatic eviction of expired client buckets.

### Trade-offs & Limitations
- **Serverless Isolation:** In ephemeral serverless instances (e.g., AWS Lambda, Vercel Serverless Functions), in-memory state is local to each worker instance and does not persist across container re-initializations or multi-region routing.
- **Production Recommendation:** For high-throughput enterprise deployments distributed across regions, this in-memory implementation serves as the local layer, and can be backed by a distributed Redis/Upstash store via the same typed `check(key)` interface.

---

## ADR 003: Pure Breakpoint Implementation of Indian National AQI (CPCB NAQI 2014)

### Context
Many third-party weather tools display US EPA AQI or arbitrary composite indices that do not align with the statutory Indian Central Pollution Control Board (CPCB) NAQI breakpoints. Indian urban citizens are familiar with CPCB color codes and health categories (Good 0-50, Satisfactory 51-100, Moderate 101-200, Poor 201-300, Very Poor 301-400, Severe 401-500).

### Decision
We implemented the piecewise linear interpolation sub-index algorithm specified in the CPCB NAQI October 2014 report:
$$I_p = I_{lo} + \frac{I_{hi} - I_{lo}}{B_{hi} - B_{lo}} \times (C_p - B_{lo})$$
Overall AQI is determined by $\max(I_p)$ across monitored pollutants (PM2.5, PM10, NO2, O3, SO2, CO, NH3). In addition, we compute multiples against WHO 2021 24-hour guidelines (e.g., 15 µg/m³ for PM2.5).

### Consequences
- True alignment with Indian meteorological reality and official advisories.
- Seamless comparison against WHO global standards.

---

## ADR 004: Infiltration and Minute-Volume Multiplier Model for Urban Inhalation

### Context
Ambient air quality meters measure outdoor pollution. However, urban families spend 85-90% of their day indoors. Assuming indoor air equals outdoor air overestimates exposure if purifiers or weatherstripping are in place, and underestimates personal risk during vigorous outdoor morning exercise.

### Decision
We modeled daily inhaled particulate mass using the classic inhalation exposure equation:
$$E = \sum_i \left( C_{\text{ambient}} \times F_{\text{infil}, i} \times (1 - \eta_{\text{mask}}) \times t_i \times M_{\text{activity}, i} \right)$$
- Infiltration factors ($F_{\text{infil}}$): Apartment baseline (0.70), True HEPA closed room (0.18-0.20), Semi-pucca (0.85).
- Minute ventilation volume ($M_{\text{activity}}$): Sleep/Rest (0.45 m³/h), Light sedentary (0.70 m³/h), Outdoor brisk transit (1.60 m³/h), Running/cycling (3.20 m³/h).

---

## ADR 005: Zero External Charting Libraries (Hand-Crafted Scalable SVG)

### Context
Third-party charting libraries (Chart.js, Recharts, Plotly) add between 150 KB and 450 KB of JavaScript to client bundles, impairing performance on low-bandwidth mobile networks prevalent across Indian tier-1/tier-2 cities.

### Decision
We engineered a custom responsive SVG line/area projection in `ForecastChart.tsx` with zero runtime dependencies. To ensure full WCAG 2.2 AA accessibility, the chart includes a toggle to an accessible HTML data table alternative.

---

## ADR 006: Cryptographic Nonces and Strict Content-Security-Policy (CSP)

### Context
Modern web applications must protect against Cross-Site Scripting (XSS), data exfiltration, and unauthorized script execution.

### Decision
We integrated Next.js middleware that generates a unique base64 cryptographic nonce per HTTP request, configuring `script-src 'self' 'nonce-...' 'strict-dynamic'`, `object-src 'none'`, and `frame-ancestors 'none'`.

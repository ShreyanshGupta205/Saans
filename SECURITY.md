# Security Policy & Threat Model — Saans

## 1. Overview
Saans handles public air quality awareness, household lifestyle profiles, and community action packs. Security and user privacy are foundational design requirements.

---

## 2. Threat Modeling & Defenses

### 2.1 Prompt-Injection Defense
- **Untrusted User Input:** Chat questions, search queries, and household profile fields are treated as untrusted data.
- **Delimiter Sandbox:** Profile and real-time AQI values are strictly segregated into explicit XML delimiters (`<household_profile>`, `<current_air_quality>`, `<live_context>`).
- **System Instruction Isolation:** Untrusted user input is never concatenated into system instructions.
- **Scope Restriction:** The system prompt instructs the model to refuse instructions asking to reveal system instructions, bypass safety rules, write code, or discuss topics outside air pollution and clean air.
- **Schema Re-Validation:** All LLM responses are parsed and re-validated using Zod schemas (`LLMPlanResponseSchema`). If the output deviates from expected schema, it is rejected and falls back to deterministic rules.

### 2.2 Server-Side Request Forgery (SSRF) Prevention
- Upstream server calls from route handlers are restricted to a strict hostname allowlist:
  - `air-quality-api.open-meteo.com`
  - `geocoding-api.open-meteo.com`
  - `generativelanguage.googleapis.com`
- Any URL targeting internal network ranges (e.g. `169.254.169.254`, `localhost`, `10.0.0.0/8`) is blocked before socket dispatch.

### 2.3 Geolocation Privacy (Coordinate Truncation)
- User coordinates received via browser GPS or city selection are automatically rounded to 2 decimal places (`Math.round(coord * 100) / 100`).
- A 2-decimal resolution corresponds to approximately ~1.1 km, providing ambient neighborhood air quality accuracy while protecting exact residential coordinates from being logged or transmitted upstream.

### 2.4 Client Privacy & Local-Only State
- Saans has **no database** and **no authentication layer**.
- User profile selections (household demographics, commute mode, purifier status) reside exclusively in the client's browser `localStorage`.
- No Personally Identifiable Information (PII) is ever written to server disk or database stores.

### 2.5 Denial of Service & Rate Limiting
- All route handlers (`/api/aqi`, `/api/plan`, `/api/chat`, `/api/geocode`) enforce per-IP rate limiting via `SlidingWindowRateLimiter`.
- Requests exceeding configured limits receive HTTP 429 with standard `Retry-After` headers.

### 2.6 Medical Safety Boundary & Clinical Disclaimer
- Saans is an air quality advisory tool, **not a medical diagnosis or treatment platform**.
- The application prominently displays medical notices:
  1. For severe breathlessness, stridor, wheezing, blue lips, or acute asthma attacks, users are instructed to seek emergency medical care at an emergency room immediately.
  2. Saans never advises altering, reducing, or discontinuing prescribed medications or inhalers.
  3. No diagnostic claims are made.

---

## 3. Reporting Vulnerabilities
If you identify a security vulnerability in Saans, please report it via private security advisory or contact the maintainers directly. Do not open public issues for zero-day vulnerabilities.

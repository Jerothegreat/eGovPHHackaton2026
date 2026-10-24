## Problem Statement

Barangay officials need a fast, structured way to assess post-disaster impact at the household level, while residents need a simple, trusted way to report whether they are affected and what help they need. Without a shared workflow, disaster intake is slow, reports arrive through fragmented channels, officials struggle to see unresolved cases clearly, and residents do not know whether their needs have been captured.

For this MVP, the core problem is immediate disaster intake and triage inside a single barangay. Officials need to launch an assessment quickly, residents need to respond with minimal friction, and officials need a live queue they can review, update, and export for response coordination.

## Solution

HANDA is a barangay-level disaster assessment and needs determination MVP with two primary user experiences.

Residents authenticate through eGovPH, see whether there is an active disaster assessment in their barangay, and submit a structured self-report of their needs. Officials authenticate through the same identity layer, create and publish disaster assessments, define the questions residents answer, review incoming check-ins in a triage dashboard, update case statuses, add manual entries for offline residents, and export results to CSV for follow-up operations.

The MVP keeps the workflow intentionally narrow: one active assessment drives intake, resident responses become actionable cases, and officials use a lightweight dashboard to move cases from unresolved to visited or resolved.

## User Stories

1. As a resident, I want to sign in with a trusted government identity flow, so that I can report my needs without creating a separate disaster-response account.
2. As a resident, I want my barangay information to come from my verified profile, so that I see only the disaster assessment relevant to my area.
3. As a resident, I want to know when there is no active disaster assessment for my barangay, so that I do not waste time looking for a form that is not open.
4. As a resident, I want to see a clear disaster alert when an assessment is active, so that I know the LGU is collecting reports for a specific incident.
5. As a resident, I want the alert to identify the disaster name, type, date, and barangay, so that I can confirm the report applies to my situation.
6. As a resident, I want to quickly indicate that I am affected, so that I can start reporting my needs with minimal effort.
7. As a resident, I want to answer a simple set of need-based questions, so that I can communicate my situation without writing a long freeform message.
8. As a resident, I want the questions to be easy to understand on mobile, so that I can complete the check-in during a stressful situation.
9. As a resident, I want to submit my needs in one flow, so that the barangay receives a complete report tied to the active assessment.
10. As a resident, I want confirmation after submission, so that I know my report was received.
11. As a resident, I want to see community-level summary counts for the active assessment, so that I can understand the overall situation in my barangay.
12. As a barangay official, I want to sign in through a role-aware government identity flow, so that the system can distinguish official tools from resident tools.
13. As a barangay official, I want my role to be resolved automatically after sign-in, so that I land in the correct experience without manual switching.
14. As a barangay official, I want to create a draft assessment for a specific disaster, so that I can prepare intake before opening it to residents.
15. As a barangay official, I want to define the disaster name, type, and date, so that the assessment is clearly identified for residents and responders.
16. As a barangay official, I want to add structured questions to an assessment, so that resident check-ins produce actionable, categorized data.
17. As a barangay official, I want each question to map to a need category, so that aggregated results show the types of assistance being requested.
18. As a barangay official, I want to reuse question sets from earlier assessments, so that recurring disasters can be launched faster.
19. As a barangay official, I want to edit a saved draft assessment, so that I can refine it before publishing.
20. As a barangay official, I want to publish an assessment, so that residents can start submitting disaster check-ins.
21. As a barangay official, I want only one active assessment to drive intake at a time, so that resident reporting stays focused on the current incident.
22. As a barangay official, I want to close an assessment when intake should stop, so that new reports no longer arrive after the active response window ends.
23. As a barangay official, I want to archive an old assessment, so that historical incidents do not clutter my active working view.
24. As a barangay official, I want to choose which assessment I am viewing in the dashboard, so that I can review current and past incidents.
25. As a barangay official, I want to see total check-ins for an assessment, so that I can gauge scale quickly.
26. As a barangay official, I want to see unresolved case counts, so that I can prioritize follow-up work.
27. As a barangay official, I want to see an aggregated need breakdown by category, so that I can understand demand for shelter, food, medical help, and similar support.
28. As a barangay official, I want a queue of submitted check-ins, so that I can review affected households one by one.
29. As a barangay official, I want to sort and filter the queue, so that I can focus on unresolved or specific cases faster.
30. As a barangay official, I want to open a submitted case and inspect the answers behind it, so that I can understand what the household reported.
31. As a barangay official, I want to update a case from unresolved to visited or resolved, so that the dashboard reflects response progress.
32. As a barangay official, I want to submit a manual resident entry, so that I can capture needs for households that cannot use the app directly.
33. As a barangay official, I want manual entries to flow into the same assessment and dashboard, so that offline intake and self-reporting stay in one queue.
34. As a barangay official, I want to export assessment data to CSV, so that I can share or process the data outside the app.
35. As a barangay official, I want exported rows to include the resident name, need summary, case status, submitter, and timestamp, so that operational follow-up is practical.
36. As a barangay official, I want the system to preserve assessment and case history in storage, so that data is not lost between sessions.
37. As a barangay official, I want the app to use a real backend and identity integration, so that the MVP can operate beyond a purely local demo.
38. As a barangay official, I want the system to default non-official users to the resident experience, so that only recognized officials see administrative controls.
39. As a resident, I want official-only controls to be hidden from me, so that the app stays simple and reduces the chance of misuse.
40. As a barangay official, I want resident-only reporting prompts to be separate from my dashboard workflow, so that operational tasks and self-reporting do not get mixed together.

## Implementation Decisions

- The MVP is a dual-role web application with two first-class experiences: a resident reporting flow and an official operations flow.
- Authentication is split into two concerns: identity verification through OTP and eGovPH profile retrieval, followed by role resolution that determines whether the user sees the official or resident experience.
- The product treats barangay membership from the authenticated profile as the source of truth for matching residents to active assessments.
- The assessment lifecycle is explicit: draft, active, closed, and archived.
- The product supports one active assessment at a time for intake, and publishing a new assessment deactivates any previously active one.
- Assessments are composed of ordered questions, and each question maps to a need category used later for dashboard aggregation and exports.
- Resident reporting is intentionally structured as binary need capture per question rather than an open-ended form.
- Every resident submission becomes a check-in record with a default triage state of unresolved.
- Officials manage the follow-up workflow by moving cases through unresolved, visited, and resolved states.
- Manual field intake is part of the MVP and uses the same submission model as resident self-reporting so that both sources feed one operational queue.
- The official dashboard combines operational metrics, queue review, status updates, and export actions in one place rather than splitting them across multiple tools.
- Assessment summaries are computed from stored check-ins and answers, including affected count, unresolved count, and need breakdown by category.
- CSV export is part of the core workflow because officials need a portable format for coordination outside the app.
- Persistence is backed by Supabase tables for assessments, questions, check-ins, answers, and official-role lookup.
- The product assumes a backend contract where official status can be resolved by querying whether an authenticated identity exists in an officials dataset.
- The MVP uses a session model stored in the browser for the signed-in experience.
- Because the current implementation already mixes domain logic and UI state closely, the main deep-module opportunity is a stable domain service around assessment lifecycle, dashboard aggregation, check-in creation, and export formatting.
- A second deep-module opportunity is an auth/session service that hides OTP, eGovPH profile retrieval, role lookup, and session persistence behind a single small interface.
- A third deep-module opportunity is a persistence gateway that isolates backend reads and writes from the rest of the app, so UI code depends on domain actions rather than raw table operations.
- The resident reporting surface and the official dashboard should remain thin UI layers over these deeper modules.

## Testing Decisions

- Good tests should verify externally visible behavior and business outcomes, not internal implementation details or React state structure.
- The highest-value test target is the store/domain layer that governs assessment creation, question management, publishing rules, dashboard aggregation, check-in submission, case status updates, question copying, and CSV export.
- Auth and role resolution should be tested around observable outcomes: successful login, failed verification, resident-vs-official routing, and session persistence behavior.
- Resident flow UI tests should focus on the behaviors that matter to users: seeing an active assessment, answering questions, submitting a report, and seeing post-submit confirmation.
- Official dashboard UI tests should focus on the behaviors that matter operationally: creating assessments, managing question sets, publishing or closing assessments, filtering queue rows, opening case detail, and updating case status.
- Tests should prefer small, isolated seams where possible. In this codebase, the best long-term seam is business logic extracted from view components into stable domain-oriented modules.
- For backend-dependent behavior, tests should use stubs or fakes at the persistence boundary so product rules can be validated without depending on live external services.
- Prior art in the current repo is limited because there is no established test suite yet. The PRD therefore recommends introducing tests first around the deepest business logic modules, then adding a thin set of UI behavior tests for the two main user journeys.

## Out of Scope

- Multi-barangay, municipal, citywide, or regional administration workflows.
- Assignment of cases to individual responders or teams.
- Automated notifications through SMS, push, or email beyond the authentication flow.
- Rich media uploads such as photos, documents, or geotagged evidence.
- Freeform case notes, threaded communication, or resident-official messaging.
- GIS mapping, route planning, and logistics management.
- Inventory, relief distribution, or warehouse management.
- Offline synchronization beyond manual field entry performed by officials.
- Advanced analytics, forecasting, or resource recommendation engines.
- Full audit logging, compliance reporting, or immutable history workflows.
- Multilingual content management and localization beyond the current interface language.
- Public transparency portals or open-data publishing.

## Further Notes

- This PRD describes the MVP that is already built in the repo rather than a future expanded roadmap.
- Real eGov integration and Supabase-backed persistence are treated as intended product behavior for the MVP.
- The repo also contains demo and mock support for local development and hackathon presentation flows; those are implementation aids, not separate end-user product capabilities.
- The current codebase has a strong opportunity to separate deep business modules from large UI components before the next round of feature growth.

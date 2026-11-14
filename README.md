# CampusCareer BD

Static prototype (HTML/CSS/JS). All data lives in the browser's `localStorage` - no real backend.

## Roles
- **Student**: register/login, profile (tap-to-select skills, preferred work areas, CGPA, experience, projects, class schedule, availability), job search with working-hour + location filters (best match first), Smart Match Score with breakdown, Skill Gap, schedule-conflict warning, apply, application tracking, CV builder (print / save as PDF)
- **Employer**: register/login, post jobs (skills, days, hours), see applicants, set status (Applied / Shortlisted / Interview / Selected / Rejected)
- **Admin** (`admin@campuscareer.bd` / `Admin@123`): approve/reject jobs, verify students & employers, remove jobs, platform stats

## Extras
- 🔔 Notification bell (all roles): applicants, status changes, job approvals, verification
- Profile completeness bar (live on the Profile page, summary on the Student dashboard)
- Admin analytics: applications per job, pipeline, skills employers want vs skills students have

## Smart Match Score
Skills 55% + Location 20% + Preferred hours 15% + Class schedule 10%. Parts that can't be evaluated (e.g. no preferred area chosen) are skipped and the weights re-balance. 13 demo jobs are included.

## Simulated vs real
- "SMS notifications" are **simulated** (an in-app alert). Real SMS needs a backend + SMS gateway.
- "Verification" is a manual admin toggle, not real email/ID verification.
- Data is per-browser; not shared across devices.

## Deploy to Netlify
Drag this folder to https://app.netlify.com/drop (no build step; `index.html` is the entry point).

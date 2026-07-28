# Production Browser Evidence Record

## Run

- Date/time (UTC): `YYYY-MM-DDTHH:MM:SSZ`
- Build identifier: `<git commit or approved build label>`
- Environment: `<disposable local/preview environment; no secrets>`
- Server command: `pnpm build && pnpm start`
- Base URL: `<origin only>`
- Authentication setup: `Supabase OAuth via existing Google callback; disposable account; no credentials or tokens recorded`
- No-session check: `<PASS/FAIL; link to private check output if applicable>`

## Route Context

- Role: `<Secretary | College Dean | Faculty Member>`
- Account state: `<active; complete; role-specific scope summary without identifier>`
- Route: `<path>`
- Viewport: `<width>x<height>, device scale factor if relevant>`
- Network: `Fast 3G`
- CPU: `4x`

## LCP

- Trace location: `<approved private artifact location; not a repository path>`
- Selected LCP element: `<tag and stable text/class description; omit private content>`
- LCP: `<duration>`
- TTFB: `<duration>`
- Resource load delay: `<duration>`
- Resource load duration: `<duration>`
- Element render delay: `<duration>`
- LCP resource: `<same-origin path or text element; redact query values>`

## Relevant Requests

Record `document`, `fetch`, and `script` requests only. Omit cookies, authorization headers, response bodies, account identifiers, session values, and sensitive query parameters.

| Type | Method | Path/category | Status | Transfer size | Duration | Observation |
| --- | --- | --- | --- | --- | --- | --- |
| document | GET | `<path>` | `<status>` | `<size>` | `<duration>` | `<initial HTML/RSC observation>` |
| fetch | `<method>` | `<path/category>` | `<status>` | `<size>` | `<duration>` | `<observation>` |
| script | GET | `<chunk path/category>` | `<status>` | `<size>` | `<duration>` | `<initial/deferred>` |

## Route-Specific Checks

- Initial protected content rendered from the production response: `<PASS/FAIL/NOT APPLICABLE>`
- Mount-time primary data read observed: `<YES/NO/NOT APPLICABLE>`
- Deferred visualization chunk observed: `<YES/NO/NOT APPLICABLE>`
- No-session protected content check: `<PASS/FAIL>`
- Console errors/issues: `<none or redacted summary>`
- Lighthouse accessibility/best-practice snapshot: `<optional private artifact location>`

## Limitations

- `<Unresolved issue, data-shape limitation, or explicitly deferred work>`

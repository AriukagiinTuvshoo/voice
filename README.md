# VOICE

VOICE is a browser-first live dictation application.

## Phase 4 — Cloud Speech

Phase 4 adds Azure AI Speech as a provider behind the existing:

`UI → useSpeech → VoiceSpeechService → SpeechProvider`

Provider implementations are:

- `BrowserSpeechProvider` — Web Speech API, no cloud credential.
- `CloudSpeechProvider` — Azure AI Speech JavaScript SDK with a short-lived Speech authorization token.

Azure's current JavaScript SDK supports browser microphone recognition and continuous recognition with interim and final events. The Node.js runtime does not capture a microphone directly, so the production-safe browser flow is: browser requests a short-lived token from the VOICE server boundary, then the browser SDK connects to Azure Speech. The long-lived Azure subscription key never enters client code. Microsoft documents the same token-exchange pattern for browser applications.

## Supported languages

| VOICE | Azure locale |
|---|---|
| Mongolian | `mn-MN` |
| English | `en-US` |
| Japanese | `ja-JP` |

`auto` is intentionally rejected by the Phase 4 cloud provider with `language_not_supported`; it is never silently mapped to another language.

## Environment

Copy `.env.example` to your local environment.

Server-only:

`AZURE_SPEECH_KEY`
`AZURE_SPEECH_REGION`

Non-secret provider preference:

`NEXT_PUBLIC_SPEECH_PROVIDER=cloud` or `browser`

Never put `AZURE_SPEECH_KEY` in `NEXT_PUBLIC_*`, React code, localStorage, sessionStorage, tests, or fixtures. The token route uses the server-only key to obtain a short-lived Speech token. The browser keeps that token only in memory.

## Provider behavior

The preferred provider is selected centrally in `lib/speech/provider.ts`.

- `cloud` selects Azure Speech.
- `browser` selects Web Speech API.
- Cloud configuration failures are surfaced as normalized provider errors; they are not silently converted to another provider.
- Switching to the browser provider is an explicit configuration choice.

The UI consumes only VOICE speech domain types and does not import Azure event/error types.

## Privacy

VOICE does not persist raw microphone audio. The Azure provider uses the SDK microphone input directly and does not store audio in localStorage/sessionStorage. Transcript content is not logged by VOICE. Azure SDK telemetry is disabled for the provider.

## Local verification

Azure credentials are not required for:

`npm install`
`npm run typecheck`
`npm run lint`
`npm test`
`npm run build`

Tests use mocks for the server token exchange and provider error/lifecycle boundaries. No test returns a hard-coded speech transcript.

## Manual verification checklist

CI cannot verify physical microphone hardware. Before calling the cloud path operational, manually test on a supported browser/device:

- [ ] Mongolian: start → speak → interim → stop → final
- [ ] English: start → speak → interim → stop → final
- [ ] Japanese: start → speak → interim → stop → final
- [ ] microphone permission denied
- [ ] microphone unavailable
- [ ] network failure
- [ ] stop while speaking
- [ ] refresh/unmount cleanup
- [ ] mobile browser
- [ ] desktop browser
- [ ] repeated start/stop
- [ ] long-ish session and token refresh/cleanup

These checks are not claimed as completed by CI.

## Security and abuse boundary

The route validates the same-origin request, validates server-side Azure configuration, uses a short upstream timeout, returns no-store responses, and never accepts an Azure key/endpoint from the client.

Authentication and real rate limiting are not present in Phase 4 because VOICE has no account system yet. The route is therefore a minimal credential boundary, not a complete abuse-prevention system. A future authenticated/rate-limited boundary is required before unrestricted public production usage.

## Dependencies

Phase 4 adds only the official Microsoft JavaScript Speech SDK:

`microsoft-cognitiveservices-speech-sdk@1.51.0`

The Phase 4 CI audit reported **9 vulnerabilities: 2 low, 4 moderate, 2 high, 1 critical**. The repository has not used `npm audit fix --force`. The audit result is retained as a known dependency baseline; this hardening phase does not claim a vulnerability is fixed without a verified npm audit result.

The Microsoft Speech SDK 1.51.0 is the installed direct version. Public package security tracking currently lists no direct vulnerabilities for 1.51.0, so it is not upgraded blindly.

The repository now commits a reproducible `package-lock.json`, and CI uses `npm ci` for deterministic dependency installation.

## CI and automation security

GitHub Actions is verification-only. The CI workflow uses `contents: read` and contains no merge, auto-merge, branch-push, history-rewrite, or GitHub API merge operation. Repository-level `allow_auto_merge` is currently disabled. Branch-protection settings could not be read because the connected GitHub integration returned HTTP 403 for that administration endpoint.

## Phase 4 scope

Included: Azure Speech provider, token boundary, real-time interim/final recognition, language mapping, lifecycle cleanup, token refresh, provider selection, tests, docs.

Not included: AI rewriting, translation, summarization, billing, authentication, team collaboration, system-wide dictation, Phase 5.


## Phase 5 — Production Transcript Processing

Phase 5 adds a local, deterministic transcript processing layer after finalized speech results and before the workspace consumes the final transcript.

Architecture:

`SpeechProvider → raw final transcript → processTranscript() → processed transcript → VoiceWorkspace`

Processing modes:

- **raw** — preserves recognized final text without linguistic transformation.
- **standard** — deterministic whitespace/punctuation normalization and only explicit safe corrections when enabled.
- **clean** — standard processing plus a small language-aware filler dictionary and conservative adjacent repeated-word cleanup when enabled.
- **polished** — clean deterministic formatting only; it does not use AI, paraphrasing, summarization, translation, or content generation.

Supported processing languages are `mn`, `en`, `ja`, and `auto`. The processor does not perform language detection. `auto` uses only language-neutral deterministic processing.

The existing `processingMode`, `autoPunctuation`, `autoCorrection`, and `removeFillers` settings are used directly; no second settings store is introduced. Raw finalized text is retained separately from processed text in the speech session.

Phase 5 processing is local and side-effect free. Transcript text is not sent to a remote service, logged, stored, or passed to an AI provider. No new secrets or environment variables are introduced.

### Phase 5 limitations

The correction dictionary is intentionally small and explicit. Currently only a narrow set of safe English contractions is corrected; Mongolian and Japanese are left unchanged when no trusted deterministic correction rule exists. The filler dictionaries are deliberately conservative to avoid removing meaningful words. `auto` does not infer a language.

**AI rewriting is explicitly not part of Phase 5.** Authentication, database/history persistence, billing, translation, summarization, remote processing, and external AI providers remain out of scope.


## Phase 6 — Production History & Persistence Foundation

Phase 6 adds a local-first transcript history foundation without authentication or a cloud database.

Architecture:

`SpeechProvider → useSpeech → processTranscript() → VoiceWorkspace → HistoryService → TranscriptRepository → LocalTranscriptRepository`

The history domain stores finalized sessions only. Each session preserves `rawText` separately from editable `processedText`, together with language, processing mode, timestamps, title, duration when available, and a non-secret source marker. Interim transcript events and microphone audio are never persisted.

### Persistence behavior

- Browser `localStorage` is the Phase 6 persistence backend.
- Stored data uses a versioned envelope (`version: 1`) so future migrations have a defined boundary.
- Malformed entries are ignored safely; unknown schema versions are not interpreted.
- History is limited to 100 sessions. New saves are rejected at the limit instead of silently deleting existing user data.
- Storage and quota failures are surfaced to the UI without clearing the current transcript.
- No transcript data is sent to a remote service, analytics system, AI provider, or database.

### History behavior

`/history` supports deterministic client-side search across title, processed text, and raw text. Sessions can be opened, copied, edited, and intentionally deleted. Editing changes only `processedText` and the title; `rawText` remains unchanged. Titles are generated deterministically from the first meaningful words and can be edited manually.

The existing `saveTranscripts` setting controls whether finalized sessions are persisted. The recording flow saves once after the finalized transcript reaches the processing state; interim events are never written to storage.

### Privacy and security

Phase 6 does not add authentication, cloud synchronization, audio upload, credentials, tokens, or transcript telemetry. Azure credentials remain server-only and are not written to history storage. Local history is browser-local and can be removed through the History UI.

### Known limitations

- History is local to the current browser profile and device; there is no cross-device synchronization.
- There is no account ownership enforcement yet. The optional domain `ownerId` field exists only as a future-compatible model boundary and is not populated in Phase 6.
- Physical microphone behavior still requires manual browser/device verification.

### Phase 6 verification

Run:

`npm ci`
`npm audit || true`
`npm run typecheck`
`npm run lint`
`npm test`
`npm run build`
`git diff --check`

Phase 6 CI must remain a real GitHub Actions verification run. Local `git diff --check` must be executed against the actual Phase 6 worktree before declaring the phase complete.


## Phase 7 — Production Session UX & Dashboard Integration

Phase 7 turns the Phase 5 speech/processing flow and Phase 6 local history into a daily-use workspace.

### Dashboard
- `/dashboard` is the home screen with a New recording CTA.
- Recent sessions use the existing `HistoryService` and are ordered by the history repository's `updatedAt` ordering.
- Local statistics show total recordings, recordings from the last seven days, and total saved transcript duration.
- `/recording` is the dedicated recording workspace route.

### Session lifecycle
The recording UI communicates idle, recording, processing, ready, saving, saved, and error states. Finalized transcripts are persisted once per speech session when transcript saving is enabled. Save failures keep the current transcript available and provide retry feedback.

The workspace supports editing the processed transcript after saving. Manual edits update only `processedText`; `rawText` remains unchanged. Unsaved editor changes are tracked and protected with a browser unload warning.

### History integration
Dashboard recent sessions and the full History page both use the Phase 6 history service/repository. History supports search, open, edit, copy, and intentional delete. The detail view shows created/updated timestamps, language, processing mode, and duration when available.

### Local-first and privacy
Phase 7 adds no authentication, cloud sync, analytics, AI, audio storage, or external transcript transport. Dashboard statistics and recent sessions are derived only from browser-local history.

### Known limitations
- Local history is limited to the current browser profile/device.
- Physical microphone/provider behavior still requires browser/device verification.
- In this execution environment, the real local Git worktree may be unavailable; GitHub Actions remains the authoritative remote CI verification.


## Phase 8 — Production Cloud Persistence Foundation

Phase 8 adds Supabase/PostgreSQL persistence behind the existing `HistoryService → TranscriptRepository` boundary.

Architecture:

`VOICE UI → HistoryService → TranscriptRepository → LocalTranscriptRepository | SupabaseTranscriptRepository`

Local persistence remains the default. Cloud mode is explicit through `NEXT_PUBLIC_HISTORY_PERSISTENCE_MODE=cloud`. The UI does not call Supabase directly, and existing local history is never silently uploaded or migrated.

### Supabase and environment

Phase 8 uses the official `@supabase/supabase-js@2.109.0` package, pinned for the repository's Node 20 CI runtime. Browser-safe configuration is `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. No service-role key is required.

If cloud mode is selected without valid configuration, a normalized `configuration_error` is raised. There is no silent fallback to local persistence. Local mode remains usable without Supabase variables.

### Database / security

The versioned migration creates `public.transcript_sessions` with structured transcript fields, nullable future-compatible `owner_id`, timestamp/data constraints, and indexes for owner, updated time, and created time. Existing session IDs remain text because the current application fallback ID format is not always UUID-compatible.

RLS is enabled. `anon` and unauthenticated browser access have no table grants. Authenticated access is restricted by `auth.uid() = owner_id`. Phase 8 does not implement Auth and never fabricates an owner ID, so authenticated cloud persistence becomes operational only when a later Auth phase supplies a real identity.

### Repository behavior

`SupabaseTranscriptRepository` implements `save`, `list`, `getById`, `update`, `delete`, and `clearHistory`. Database rows are explicitly mapped to/from `TranscriptSession`. Malformed rows are rejected at the mapping boundary and skipped safely during list operations. Cloud ordering is `updatedAt DESC`; deterministic search remains above the repository boundary.

Persistence errors are normalized to `configuration_error`, `connection_error`, `permission_error`, `not_found`, `validation_error`, `conflict_error`, or `unknown_error`.

### Phase 8 scope

No authentication, local-to-cloud migration, multi-device sync, realtime sync, billing, teams, sharing, AI rewriting, analytics, telemetry, audio storage, interim transcript persistence, or hidden synchronization is introduced.

> Phase 8 establishes the production persistence foundation. Authentication and multi-device synchronization are future phases.


## Phase 9 — Authentication & Ownership Foundation

Phase 9 adds Supabase Auth on top of the Phase 8 persistence boundary. Authentication is centralized behind AuthService and AuthProvider; UI components do not call supabase.auth.* directly.

### Authentication

- Email/password sign-up and sign-in use Supabase Auth.
- Sign-out is supported.
- Initial session restoration and auth-state observation are handled centrally.
- Auth state is explicit: loading, authenticated, unauthenticated, or error.
- Auth failures are normalized into stable application errors without exposing provider internals.
- Passwords are never stored by VOICE and never written to localStorage, sessionStorage, URLs, analytics, or application logs.

### Ownership

Cloud transcript ownership is derived from the authenticated Supabase user at the cloud repository boundary. The repository does not trust a caller-supplied ownerId as authority.

The effective cloud flow is:

`authenticated user → auth.uid() → transcript_sessions.owner_id → RLS`

The Phase 8 RLS policies remain authoritative for SELECT, INSERT, UPDATE, and DELETE. UPDATE operations do not include owner_id in their application payload, and the database WITH CHECK policy prevents ownership mutation.

### Local and cloud modes

- `NEXT_PUBLIC_HISTORY_PERSISTENCE_MODE=local`: local history remains usable without authentication.
- `NEXT_PUBLIC_HISTORY_PERSISTENCE_MODE=cloud`: protected history requires an authenticated Supabase session.
- Cloud authorization failures never silently fall back to local persistence.
- Recording and transcript processing can remain available before authentication; a cloud save failure preserves the current transcript and provides an authentication/retry path.

### UI

Added /login and /signup, account state in the app shell/settings, authenticated dashboard/history states, and cloud-save authentication handling in the recording workspace. Auth UI follows the existing VOICE design language and responsive/accessibility patterns.

### Security and privacy

- No Supabase service-role key is exposed to the browser.
- Only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are used by the browser client.
- No public transcript access is added.
- No automatic local-history upload or migration is performed.
- No audio, interim transcript, analytics, sharing, billing, Realtime, conflict resolution, or multi-device sync is added in Phase 9.

### Phase 9 limitations

Database ownership tests include a deterministic RLS contract test and repository-level ownership tests. A real two-user Supabase/PostgreSQL integration test is not claimed unless a deterministic local Supabase environment is available. Production credentials are not required by CI.

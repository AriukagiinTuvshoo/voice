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

The repository still has no committed `package-lock.json`; CI therefore uses `npm install`. A lockfile should be added when it can be generated and validated with the repository's actual npm toolchain.

## Phase 4 scope

Included: Azure Speech provider, token boundary, real-time interim/final recognition, language mapping, lifecycle cleanup, token refresh, provider selection, tests, docs.

Not included: AI rewriting, translation, summarization, billing, authentication, team collaboration, system-wide dictation, Phase 5.

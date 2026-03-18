# Comms

AI-powered communication client — contacts, email, calls, and voice in one app.

## Features

- **Inbox** — Email management with AI tagging, summarization, and auto-responses
- **Contacts** — Full contact management with search, tags, and notes
- **AI Voice Calls** — Outbound and inbound AI voice agents on real phone numbers
- **Dual Voice Engine** — OpenAI Realtime (~230ms latency) or Gemini Live (20 voices)
- **Voice Agent Templates** — Lead gen, customer support, receptionist, appointment setter, survey
- **Multi-Agent** — Multiple voice agents, each with their own phone number, template, and engine
- **Approvals** — AI actions require approval (auto, draft, or manual modes per tool)
- **CLI** — Full-featured command line interface for all operations
- **Web UI** — Next.js dashboard with real-time updates

## Quick Start

```bash
# Install dependencies
npm install
cd ui && npm install

# Initialize config
npx tsx src/cli/index.ts init

# Launch the web UI
cd ui && npm run dev

# Start the voice server (separate terminal)
cd ui && npm run dev:voice
```

### Environment Setup

Copy and configure `ui/.env.local`:

```env
# Required for Gemini voice engine
GOOGLE_GENERATIVE_AI_API_KEY=

# Required for OpenAI voice engine
OPENAI_API_KEY=

# Twilio (voice calls + phone numbers)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_API_KEY_SID=
TWILIO_API_KEY_SECRET=
TWILIO_FROM_NUMBER=

# Public URLs for Twilio webhooks (use cloudflared tunnels for local dev)
NEXT_PUBLIC_APP_URL=
VOICE_WS_HOST=
```

### Tunnels for Local Development

Twilio needs public URLs to reach your local servers:

```bash
# Terminal 1: tunnel for Next.js
npx cloudflared tunnel --url http://localhost:3000

# Terminal 2: tunnel for voice WebSocket
npx cloudflared tunnel --url http://localhost:8765
```

Update `NEXT_PUBLIC_APP_URL` and `VOICE_WS_HOST` in `.env.local` with the generated URLs, then configure Twilio's webhook via Settings > Voice in the UI.

## CLI

```
comms init                          Initialize config
comms login                         Authenticate with Anthropic
comms ui                            Launch web UI

comms inbox                         List emails (--unread, --flagged, -f folder)
comms inbox read <id>               Read full email
comms inbox compose                 Compose a draft
comms inbox search <query>          Search emails

comms contacts                      List contacts
comms contacts search <query>       Search contacts
comms contacts add                  Add contact interactively
comms contacts show <id>            Show contact details

comms calls                         Call history
comms calls show <id>               Call details + transcript

comms call [number]                 Place an AI voice call
comms call +1234567890 -n "John"    Call with contact name
comms call -p "follow up on demo"   Call with purpose

comms voice agents                  List voice agents
comms voice create                  Create new agent (pick template)
comms voice edit <id>               Edit agent interactively
comms voice set <id> engine openai  Set agent field directly
comms voice set <id> voice coral    Change voice
comms voice template <id>           Apply a template
comms voice delete <id>             Delete agent
comms voice default <id>            Set default agent
comms voice voices                  List all available voices
comms voice templates               List agent templates
comms voice start                   Start voice server

comms settings show                 View all settings
comms settings set model <value>    Update a setting
comms settings mode <tool> <mode>   Set agent mode (auto/draft/manual)
comms settings ai                   Configure AI email processing

comms approvals                     List pending approvals
comms approvals approve <id>        Approve an action
comms approvals reject <id>         Reject an action

comms activity                      Recent activity log
```

All IDs support prefix matching — `comms inbox read 8d47` matches the full UUID.

## Architecture

```
comms/
  src/cli/           CLI (Commander.js)
  ui/
    src/app/         Next.js pages + API routes
    src/lib/stores/  JSON file stores (~/.comms/data/)
    voice-server.ts  WebSocket bridge: Twilio <-> OpenAI/Gemini
    livekit-agent.ts LiveKit voice pipeline (Deepgram + Gemini + Cartesia)
```

### Voice Pipeline

```
Inbound call → Twilio → WebSocket → voice-server.ts
                                      ├── OpenAI Realtime (g711_ulaw in, pcm16 out)
                                      └── Gemini Live (pcm16 in/out, mulaw conversion)
                                            → Twilio → Caller
```

### Data Storage

All data lives in `~/.comms/data/` as JSON files — shared between CLI and web UI:
- `contacts.json`, `inbox.json`, `calls.json`, `voice-agents.json`
- `settings.json`, `ai-settings.json`, `approvals.json`, `activity.json`

## Tech Stack

- **Frontend**: Next.js 15, React 19, Tailwind CSS, Radix UI
- **AI**: Google Gemini (chat + voice), OpenAI Realtime (voice), Anthropic Claude (email processing)
- **Voice**: Twilio (telephony), OpenAI Realtime API, Gemini Live API, LiveKit (optional)
- **CLI**: Commander.js, Inquirer, Chalk
- **Backend** (cloud mode): Convex, BetterAuth, Polar billing

## License

MIT

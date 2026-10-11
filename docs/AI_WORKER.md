# AI auto-reply worker

AI Worker is a separate NestJS app in this monorepo. It receives Chat Service
message events, waits for the photographer's response window, checks shared
socket presence, retrieves photographer-specific information, asks the local
Ollama model for a structured reply, and sends safe answers through Chat
Service's internal bot-sender API. Photographer profiles and booking plans stay
in the primary `lens` database; AI settings, FAQ embeddings, and reply audit
records are stored in the separate `lens_ai` database on the same PostgreSQL
server.

## Reply lifecycle

1. Chat Service publishes `chat.message.created.v1` to Kafka.
2. AI Worker adds a delayed BullMQ job. The initial delay is 15 seconds by
   default; Kafka consumption does not wait for inference.
3. The worker checks that the photographer has AI enabled and that the event
   came from an eligible customer text message. Every customer message gets its
   own job; a later customer or photographer message does not invalidate it.
4. Photographer online status comes from authenticated Socket.IO connections
   recorded by Notification Service in Redis DB 1. While online, the worker
   checks again every 30 seconds for up to 10 minutes. Each customer event waits
   independently; when the photographer goes offline, each queued event is
   processed. If they remain online through the wait limit, that event is marked
   `skipped_online`.
5. For each text message, the worker passes up to 11 messages before that
   message's sequence as
   context alongside the photographer profile, active booking plans, and
   matching active FAQ entries. Conversation history is context for this reply;
   it is not used to retrain model weights or silently create new FAQ records.
6. If the model chooses `answer` or `ask_clarification`, returns a non-empty
   reply, and reports no risk flags, the worker checks presence again and asks
   Chat Service to send it as a reply to the source message. Chat Service labels
   it `sender_kind=ai` and assigns a new sequence while preserving the
   `reply_to_message_id`. The normal Chat outbox then publishes it to
   Notification Service.
7. Uncertain questions, missing information, complaints, unsupported message
   types, and model failures are not sent to the customer. They are recorded as
   a handoff or failure for the photographer to review.

Online status means that at least one authenticated Notification Socket.IO
connection is active for the photographer's account. This is account-level
presence, not presence in a particular chat. Presence keys expire after 60
seconds without refresh, so a crashed socket process may appear online briefly.
If Redis presence cannot be read, the worker fails closed and does not send.
Because each customer event remains eligible independently, an earlier customer
message can receive an AI reply after the photographer has gone offline, even
if the photographer sent another message while that event was waiting.

## Required service changes

- Notification Service writes socket presence to the shared Redis DB 1 at
  `lens:presence:user:<keycloak-sub>`. Configure its `REDIS_DB` as `1`.
- Chat Service exposes private routes protected by `X-AI-Worker-Token`:
  - `GET /internal/v1/chat/channels/:channel-id/messages` (supports
    `before_seq` for source-specific context)
  - `POST /internal/v1/chat/channels/:channel-id/ai-replies` (replies to the
    specified source message without requiring it to be the newest message)
    The request keeps `expected_last_seq` for idempotency compatibility, but
    Chat Service no longer uses it to reject a reply when the channel advances.
- Set the same high-entropy `AI_WORKER_TOKEN` in Chat Service and
  `CHAT_SERVICE_AI_TOKEN` in AI Worker. Leave it unset to disable the internal
  integration; Chat Service returns `503` for those routes.
- Apply the primary and AI migrations before starting the worker. The AI
  migration command provisions `lens_ai` if it does not exist, enables
  pgvector, and creates the AI tables. PostgreSQL must run the pgvector image
  (or have the matching extension installed) because FAQ embeddings use
  `vector(1024)`.

The AI message uses the photographer's participant ID for channel compatibility,
but Chat Service records `sender_kind=ai` so clients can distinguish it from a
human reply. Update the chat UI to display that marker before enabling customer
auto-replies in production.

## Local setup

1. Start the shared Docker network and the backend infrastructure, Chat,
   Notification, and Kafka services. Redis DB 1 must be shared with Notification
   Service; AI Worker's BullMQ queue uses Redis DB 2.
   Deploy the updated Notification and Chat Service versions before enabling
   the worker so all active sockets publish presence and Chat events include
   message sequence and `sender_kind` fields.
2. Apply the primary and AI database migrations. The AI command creates
   `lens_ai` on existing PostgreSQL volumes too; the Docker init script also
   creates it automatically when PostgreSQL initializes a fresh data volume.

   ```sh
   pnpm db:migrate && pnpm db:migrate:ai
   ```

3. Set the same random secret in the Chat Service and AI Worker environments:

   ```dotenv
   AI_WORKER_TOKEN=<long-random-secret>
   CHAT_SERVICE_AI_TOKEN=<same-long-random-secret>
   ```

4. Start Ollama and let `ollama-init` download the configured models:

   ```sh
   docker compose --env-file .env -f .docker/ai-worker/compose.yaml up -d
   ```

5. Run the AI worker locally from a terminal:

   ```sh
   AI_WORKER_ENABLED=true pnpm start:ai-worker:dev
   ```

   Set `AI_AUTO_REPLY_ENABLED=true` only when automatic replies are intended.
   Verify the installed models with:

   ```sh
   docker exec lens-ollama ollama list
   ```

6. Set `AI_WORKER_ENABLED=true`, `AI_AUTO_REPLY_ENABLED=true`, and
   `KAFKA_ENABLED=true` in the selected environment, then restart `lens-ai-worker`.
   These flags default to `false`. The Kafka cluster must already have the
   `chat.conversation.events.v1` topic.

## Add FAQ knowledge

Photographers can manage FAQs in the portal under **Trợ lý AI → Thông tin để
AI trả lời**. The authenticated Core API scopes every FAQ operation to the
photographer in the access token. Adding a FAQ calls Ollama to create its
embedding immediately, so Ollama and the `lens_ai` database must be available.

| Method   | Endpoint                                             | Purpose                       |
| -------- | ---------------------------------------------------- | ----------------------------- |
| `GET`    | `/api/v1/photographers/me/ai-assistant/faqs`         | List active and inactive FAQs |
| `POST`   | `/api/v1/photographers/me/ai-assistant/faqs`         | Create a FAQ and embedding    |
| `PATCH`  | `/api/v1/photographers/me/ai-assistant/faqs/:faq_id` | Edit a FAQ or reactivate it   |
| `DELETE` | `/api/v1/photographers/me/ai-assistant/faqs/:faq_id` | Soft-disable a FAQ            |

Example create request:

```http
POST /api/v1/photographers/me/ai-assistant/faqs
Authorization: Bearer <photographer-access-token>
Content-Type: application/json
```

```json
{
  "question": "Gói chụp chân dung giá bao nhiêu?",
  "answer": "Gói chân dung cơ bản có giá 1.000.000 VND, gồm 90 phút chụp và 20 ảnh chỉnh sửa.",
  "alternatives": [
    "Cho mình xin bảng giá chụp chân dung",
    "Chụp portrait hết bao nhiêu tiền?"
  ]
}
```

The local and Portainer Kong declarative configs contain an explicit JWT-
protected route for these endpoints. Regenerate and recreate local Kong after
changing the route config with `pnpm docker:gateway`.

For bulk FAQ loading, the JSON importer remains available. First find the
verified photographer's Lens ID in the primary `lens` database (use the account
email to identify the row):

```sql
SELECT p.id AS photographer_id, u.fullname, u.email
FROM photographers p
JOIN users u ON u.id = p.user_id
WHERE lower(u.email) = lower('your-email@example.com')
  AND p.is_verified = true;
```

Create a JSON file containing photographer-specific FAQ records. `photographerId`
is the Lens `photographers.id` UUID, not the Keycloak subject.

```json
[
  {
    "photographerId": "00000000-0000-4000-8000-000000000001",
    "question": "Gói chụp chân dung giá bao nhiêu?",
    "answer": "Gói chân dung cơ bản có giá 1.000.000 VND, gồm 90 phút chụp và 20 ảnh chỉnh sửa.",
    "alternatives": [
      "Cho mình xin bảng giá chụp chân dung",
      "Chụp portrait hết bao nhiêu tiền?"
    ]
  }
]
```

Save the file as `data/my-photographer-faq.json`. The importer loads connection
settings from `.env`, calls Ollama to create 1024-dimensional embeddings, and
upserts the FAQ records into `lens_ai`:

```sh
pnpm ai:import-knowledge data/my-photographer-faq.json
```

Keep FAQ answers current. In the portal, use the FAQ controls to edit an answer
or temporarily turn off an outdated entry; the `DELETE` endpoint is a soft
disable and preserves the record. The worker scopes retrieval to the current
photographer and uses the configured similarity threshold.

## Enable auto-reply for one photographer

Auto-reply is opt-in at both the global worker level and per photographer. After
FAQ and booking-plan data are ready, enable a verified photographer explicitly
by running this SQL against `lens_ai`:

```sql
INSERT INTO ai_assistant_settings (
  photographer_id,
  enabled,
  auto_reply_enabled,
  min_similarity
)
VALUES (
  '00000000-0000-4000-8000-000000000001',
  true,
  true,
  0.62
)
ON CONFLICT (photographer_id) DO UPDATE
SET enabled = true,
    auto_reply_enabled = true,
    min_similarity = EXCLUDED.min_similarity,
    updated_at = now();
```

Turn off that photographer by setting `auto_reply_enabled=false`. Turn off all
automatic customer replies by setting `AI_AUTO_REPLY_ENABLED=false` and
restarting the worker. `min_similarity` is an initial threshold, not a quality
guarantee; evaluate it against approved Vietnamese conversations before
increasing rollout.

## Environment variables

| Variable                       |                       Default | Purpose                                                         |
| ------------------------------ | ----------------------------: | --------------------------------------------------------------- |
| `AI_API_ENABLED`               |                       `false` | Enables core AI suggestion endpoints and AI database connection |
| `AI_WORKER_ENABLED`            |                       `false` | Starts Kafka consumption and processing                         |
| `AI_AUTO_REPLY_ENABLED`        |                       `false` | Global kill switch for sending customer replies                 |
| `KAFKA_ENABLED`                |                       `false` | Enables Kafka consumption                                       |
| `KAFKA_CHAT_EVENTS_TOPIC`      | `chat.conversation.events.v1` | Chat event topic                                                |
| `AI_WORKER_GROUP_ID`           |        `lens-ai-reply-worker` | Kafka consumer group                                            |
| `AI_OFFLINE_REPLY_DELAY_MS`    |                       `15000` | Initial delay before checking the conversation                  |
| `AI_OFFLINE_REPLY_POLL_MS`     |                       `30000` | Delay between online-presence checks                            |
| `AI_OFFLINE_REPLY_MAX_WAIT_MS` |                      `600000` | Maximum wait while photographer is online                       |
| `OLLAMA_BASE_URL`              |      `http://localhost:11434` | Private Ollama API address                                      |
| `AI_CHAT_MODEL`                |                  `qwen3.5:2b` | Reply generation model                                          |
| `AI_EMBEDDING_MODEL`           |        `qwen3-embedding:0.6b` | FAQ/query embedding model                                       |
| `AI_MODEL_TIMEOUT_MS`          |                      `120000` | Ollama request timeout                                          |
| `CHAT_SERVICE_BASE_URL`        |       `http://lens-chat:8080` | Private Chat Service address                                    |
| `CHAT_SERVICE_AI_TOKEN`        |                         empty | Shared internal Chat Service credential                         |
| `AI_PRESENCE_REDIS_DB`         |                           `1` | Redis DB used by Notification presence                          |
| `BULLMQ_REDIS_DB`              |                           `2` | Redis DB used by AI delayed jobs                                |
| `AI_DB_HOST`                   |               primary DB host | PostgreSQL host for AI data                                     |
| `AI_DB_PORT`                   |               primary DB port | PostgreSQL port for AI data                                     |
| `AI_DB_USERNAME`               |               primary DB user | PostgreSQL user for AI data                                     |
| `AI_DB_PASSWORD`               |           primary DB password | PostgreSQL password for AI data                                 |
| `AI_DB_NAME`                   |                     `lens_ai` | Dedicated database for AI state and embeddings                  |
| `AI_DATABASE_URL`              |                         empty | Full connection URL overriding the AI DB fields                 |
| `AI_SOURCE_DB_HOST`            |                     `DB_HOST` | Worker-only read connection to Lens data                        |
| `AI_SOURCE_DB_PORT`            |                     `DB_PORT` | Worker-only Lens database port                                  |
| `AI_SOURCE_DB_USERNAME`        |                 `DB_USERNAME` | Worker-only Lens database user                                  |
| `AI_SOURCE_DB_PASSWORD`        |                 `DB_PASSWORD` | Worker-only Lens database password                              |
| `AI_SOURCE_DB_NAME`            |                        `lens` | Worker-only Lens database name                                  |

The BullMQ processor concurrency is one by default to avoid overloading a CPU
only VPS while Ollama is generating a response.

## Audit states and failure behavior

`ai_reply_suggestions` keeps one record per source event. New jobs use states
`auto_sent`, `handoff`, or `skipped_online`. `generation_failed` and
`superseded` remain in the schema for older audit records.
Queue jobs use stable IDs, and Chat Service uses a stable `client_message_id`,
so retries do not create duplicate customer messages. Redis, Chat Service, and
database failures are retried by BullMQ; presence errors never default to
offline. When the model requests a handoff, returns a risky/empty draft, or
generation fails, the worker sends a generic acknowledgement instead of an
unsupported answer. The audit keeps `action=handoff` and risk flags so the
photographer can see that the substantive question still needs review; its
`auto_sent` status means the acknowledgement itself was saved to Chat Service.

The core backend runs without an AI database connection by default. Set
`AI_API_ENABLED=true` in its environment only after provisioning the AI database
and applying `pnpm db:migrate:ai`. When disabled, AI settings, FAQ, and
suggestion-history routes are not registered. Photographers can read and update
their own settings with `GET` and `PATCH` on
`/api/v1/photographers/me/ai-assistant`; FAQ routes are listed above. The recent
audit list is available from `GET /api/v1/photographers/me/ai-reply-suggestions`.
These routes do not start the worker. `AI_WORKER_ENABLED`, `KAFKA_ENABLED`, and
the global `AI_AUTO_REPLY_ENABLED` still need to be enabled in the worker
environment.

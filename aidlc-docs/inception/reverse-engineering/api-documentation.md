# API Documentation

## Cloudflare Worker APIs

### Health

- **Method**: `GET`
- **Path**: `/health`
- **Purpose**: Basic Worker availability check.
- **Response**: `{ "ok": true }`.

### Subscribe

- **Method**: `POST`
- **Path**: `/subscribe`
- **Purpose**: Store a Web Push subscription and its reminder schedule.
- **Request Fields**:
  - `subscription.endpoint`: Push endpoint URL.
  - `subscription.keys.p256dh`: User-agent public key.
  - `subscription.keys.auth`: Authentication secret.
  - `interval`: 30, 60, or 120 minutes.
  - `startTime`: Local `HH:mm`.
  - `endTime`: Local `HH:mm`.
  - `tzOffsetMin`: JavaScript `getTimezoneOffset()` value.
- **Response**: `{ "ok": true }` or a JSON error.
- **Validation Gap**: Only endpoint and `p256dh` presence are checked.

### Unsubscribe

- **Method**: `POST`
- **Path**: `/unsubscribe`
- **Purpose**: Delete a stored subscription by endpoint.
- **Request**: `{ "endpoint": "..." }`.
- **Response**: `{ "ok": true }`.

### Test Notification

- **Method**: `POST`
- **Path**: `/test`
- **Purpose**: Immediately send a test notification to a stored endpoint.
- **Request**: `{ "endpoint": "..." }`.
- **Response**: `{ "ok": true, "status": 201 }` or an error.

## External APIs

### Anthropic Messages

- **Method**: `POST`
- **URL**: `https://api.anthropic.com/v1/messages`.
- **Purpose**: Generate recap title, closing, mood, emojis, BGM choice, captions, and diary emojis.
- **Authentication**: User-provided `x-api-key` stored in localStorage.
- **Model Requested**: `claude-sonnet-5`.
- **Response Handling**: Finds the first text block, extracts the broadest JSON-shaped substring with a regular expression, and parses it into `DirectorOutput`.
- **Validation Gap**: Only `bgmTrack`, `captions`, and `diaryEmojis` receive limited normalization; other fields are trusted.

## Internal APIs and Data Models

### `AppContextValue`

- **State**: `records`, `isWrapped`, `settings`, `slots`, `currentSlot`.
- **Commands**: `addRecord`, `deleteRecord`, `setWrapped`, `updateSettings`, `reset`.

### `MyRecord`

- **Fields**: `id`, `slotTime`, `type`, `content`, optional `caption`, `createdAt`, optional `videoKey`.
- **Record Types**: `text`, `video`, `photo`, `audio`.
- **Storage**: Metadata and data URLs in localStorage; original video files in IndexedDB.

### `AppSettings`

- **Fields**: schedule, interval, notification timing, capture behavior, output ratio, and BGM preference.
- **Validation**: Defaults are merged with parsed localStorage; persisted values are not schema-validated.

### `ArchiveEntry`

- **Fields**: optional unique ID, session date, records, wrapped status, optional trimmed status.
- **Relationship**: Generated video is stored separately in IndexedDB under `wrapped_<id-or-date>`.

### `DirectorOutput`

- **Fields**: `title`, `closing`, `mood`, `emojis`, `bgMusic`, `bgmTrack`, `captions`, and `diaryEmojis`.


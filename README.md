# youtube-multi-channel-feed

Aggregates videos from multiple YouTube channels into a single chronological playlist on your YouTube account.

## Features

- Accepts YouTube channel URLs in multiple formats (`/@handle`, `/channel/UCxxx`, `/c/name`, `/user/name`)
- Automatically resolves URLs to channel IDs via the YouTube Data API
- Fetches all uploads from each channel (handles pagination)
- Parses dates from video titles using [chrono-node](https://github.com/wanasit/chrono); falls back to `publishedAt`
- Sorts all videos chronologically
- Creates a new playlist or reuses an existing one with the same name
- Deduplicates videos before adding them
- `--dry-run` mode to preview the sorted list without touching your playlists

## Project Structure

```
src/
  index.ts            # CLI entry point
  youtube.ts          # API logic (fetch videos, create/reuse playlist)
  channelResolver.ts  # URL → channel ID resolution
  parser.ts           # Date extraction from video titles
  types.ts            # Shared TypeScript types
config.json           # Input: channel URLs + target playlist name
.env                  # OAuth2 credentials (not committed)
.env.example          # Credentials template
```

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure OAuth2 credentials

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

To obtain credentials:

1. Open the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a project and enable the **YouTube Data API v3**.
3. Create an **OAuth 2.0 Client ID** for a *Desktop app*.
4. Copy the **Client ID** and **Client Secret** into `.env`.
5. Run the OAuth consent flow once to obtain a **refresh token** (see [Google's guide](https://developers.google.com/youtube/v3/guides/auth/server-side-web-apps)) and add it to `.env`.

### 3. Edit config.json

```json
{
  "channels": [
    "https://www.youtube.com/@channelname",
    "https://www.youtube.com/channel/UCxxxxxxxxxxxxxxxxxxxxxx"
  ],
  "playlistName": "Aggregated Feed"
}
```

## Usage

### Normal run

```bash
npm run start
```

The tool will:
1. Resolve each channel URL to a channel ID
2. Fetch all videos from each channel
3. Sort them chronologically
4. Create (or reuse) the target playlist and add the videos

### Dry run (no playlist changes)

```bash
npm run start:dry-run
# or
npx ts-node src/index.ts --dry-run
```

Prints the sorted video list to the console without creating or modifying any playlists.

## Date Parsing Logic

For each video the tool attempts to extract a date from the title using chrono-node. A parsed date is only accepted when **day, month, and year** are all explicitly present. Partial or ambiguous dates (e.g. "Jan 12" or "2023") are ignored and the video falls back to its `publishedAt` timestamp for sorting.


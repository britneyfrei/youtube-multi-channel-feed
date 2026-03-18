import { youtube_v3 } from "googleapis";

/**
 * Resolves a YouTube channel URL to a channel ID.
 *
 * Supported formats:
 *   https://www.youtube.com/channel/{id}       → extracted directly
 *   https://www.youtube.com/@{handle}          → resolved via API
 *   https://www.youtube.com/c/{customName}     → resolved via API
 *   https://www.youtube.com/user/{username}    → resolved via API
 */
export async function resolveChannelId(
  url: string,
  yt: youtube_v3.Youtube
): Promise<string> {
  // Normalise the URL so we can match it consistently.
  const trimmed = url.trim().replace(/\/+$/, "");

  // /channel/{id} – no API call needed.
  const channelMatch = trimmed.match(/\/channel\/(UC[\w-]{22})/);
  if (channelMatch) {
    return channelMatch[1];
  }

  // /@{handle}
  const handleMatch = trimmed.match(/\/@([\w.-]+)/);
  if (handleMatch) {
    return resolveViaHandle(handleMatch[1], yt);
  }

  // /c/{customName} or /user/{username} – try forUsername first, then search.
  const customMatch = trimmed.match(/\/(?:c|user)\/([\w.-]+)/);
  if (customMatch) {
    return resolveViaUsernameOrSearch(customMatch[1], yt);
  }

  throw new Error(`Unsupported or unrecognised channel URL format: "${url}"`);
}

async function resolveViaHandle(
  handle: string,
  yt: youtube_v3.Youtube
): Promise<string> {
  const res = await yt.channels.list({
    part: ["id"],
    forHandle: handle,
  });
  const id = res.data.items?.[0]?.id;
  if (!id) {
    throw new Error(
      `Could not resolve channel ID for handle "@${handle}". ` +
        `The channel may not exist or may not be accessible.`
    );
  }
  return id;
}

async function resolveViaUsernameOrSearch(
  name: string,
  yt: youtube_v3.Youtube
): Promise<string> {
  // Try forUsername first (legacy usernames).
  const byUsername = await yt.channels.list({
    part: ["id"],
    forUsername: name,
  });
  const byUsernameId = byUsername.data.items?.[0]?.id;
  if (byUsernameId) {
    return byUsernameId;
  }

  // Fall back to a channel search.
  const search = await yt.search.list({
    part: ["snippet"],
    q: name,
    type: ["channel"],
    maxResults: 1,
  });
  const searchId = search.data.items?.[0]?.snippet?.channelId;
  if (!searchId) {
    throw new Error(
      `Could not resolve channel ID for "${name}". ` +
        `Please verify the URL is correct.`
    );
  }
  return searchId;
}

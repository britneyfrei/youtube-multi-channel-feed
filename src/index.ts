import "dotenv/config";
import * as fs from "fs";
import * as path from "path";
import { Config, VideoEntry } from "./types";
import { buildYouTubeClient } from "./youtube";
import { resolveChannelId } from "./channelResolver";
import {
  getUploadsPlaylistId,
  fetchVideosFromPlaylist,
  findOrCreatePlaylist,
  getExistingPlaylistVideoIds,
  addVideoToPlaylist,
} from "./youtube";

const isDryRun = process.argv.includes("--dry-run");

async function main(): Promise<void> {
  if (isDryRun) {
    console.log("=== DRY RUN MODE – playlist will NOT be created/updated ===\n");
  }

  // Load config.
  const configPath = path.resolve(process.cwd(), "config.json");
  if (!fs.existsSync(configPath)) {
    console.error(`config.json not found at ${configPath}`);
    process.exit(1);
  }
  const config: Config = JSON.parse(fs.readFileSync(configPath, "utf-8"));

  if (!Array.isArray(config.channels) || config.channels.length === 0) {
    console.error("config.json must contain a non-empty \"channels\" array.");
    process.exit(1);
  }
  if (!config.playlistName) {
    console.error("config.json must contain a \"playlistName\" field.");
    process.exit(1);
  }

  const yt = buildYouTubeClient();

  // Resolve channel URLs → channel IDs.
  console.log("Resolving channel URLs...");
  const channelIds: string[] = [];
  for (const url of config.channels) {
    try {
      const id = await resolveChannelId(url, yt);
      console.log(`  ${url}  →  ${id}`);
      channelIds.push(id);
    } catch (err) {
      console.error(`  Failed to resolve "${url}": ${(err as Error).message}`);
    }
  }

  if (channelIds.length === 0) {
    console.error("No valid channels could be resolved. Aborting.");
    process.exit(1);
  }

  // Fetch videos from each channel.
  console.log("\nFetching videos...");
  const allVideos: VideoEntry[] = [];
  const seenIds = new Set<string>();

  for (const channelId of channelIds) {
    try {
      const uploadsId = await getUploadsPlaylistId(channelId, yt);
      const videos = await fetchVideosFromPlaylist(uploadsId, channelId, yt);
      for (const v of videos) {
        if (!seenIds.has(v.videoId)) {
          seenIds.add(v.videoId);
          allVideos.push(v);
        }
      }
    } catch (err) {
      console.error(
        `  Error fetching videos for channel "${channelId}": ${(err as Error).message}`
      );
    }
  }

  const parsedCount = allVideos.filter((v) => v.usedParsedDate).length;
  const fallbackCount = allVideos.length - parsedCount;
  console.log(
    `\nTotal unique videos: ${allVideos.length} ` +
      `(${parsedCount} with parsed dates, ${fallbackCount} using publishedAt fallback)`
  );

  // Sort chronologically by sortDate.
  allVideos.sort((a, b) => a.sortDate.getTime() - b.sortDate.getTime());

  if (isDryRun) {
    console.log("\n--- Sorted video list (dry run) ---");
    allVideos.forEach((v, i) => {
      const label = v.usedParsedDate ? "parsed" : "fallback";
      console.log(
        `${String(i + 1).padStart(4)}. [${v.sortDate.toISOString().slice(0, 10)}] (${label}) ${v.title}`
      );
    });
    console.log("\nDry run complete. No playlist was created or modified.");
    return;
  }

  // Create or reuse the target playlist.
  console.log(`\nLocating or creating playlist "${config.playlistName}"...`);
  const playlistId = await findOrCreatePlaylist(config.playlistName, yt);

  // Get videos already in the playlist to avoid duplicates.
  console.log("Checking for existing playlist items...");
  const existingIds = await getExistingPlaylistVideoIds(playlistId, yt);
  console.log(`  ${existingIds.size} videos already in playlist`);

  // Add videos in sorted order, skipping already-present ones.
  const toAdd = allVideos.filter((v) => !existingIds.has(v.videoId));
  console.log(`\nAdding ${toAdd.length} new videos to the playlist...`);

  let added = 0;
  for (const video of toAdd) {
    try {
      await addVideoToPlaylist(video.videoId, playlistId, yt);
      added++;
      if (added % 10 === 0) {
        console.log(`  Added ${added}/${toAdd.length}...`);
      }
    } catch (err) {
      console.error(
        `  Failed to add video "${video.videoId}" ("${video.title}"): ` +
          `${(err as Error).message}`
      );
    }
  }

  console.log(`\nDone! Added ${added} videos to playlist "${config.playlistName}".`);
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`Fatal error: ${message}`);
  process.exit(1);
});

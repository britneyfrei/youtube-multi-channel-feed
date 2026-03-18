export interface Config {
  channels: string[];
  playlistName: string;
}

export interface VideoEntry {
  videoId: string;
  title: string;
  publishedAt: string;
  channelId: string;
  /** The date used for sorting (parsed from title or publishedAt). */
  sortDate: Date;
  /** Whether the sortDate came from the video title (true) or publishedAt fallback (false). */
  usedParsedDate: boolean;
}

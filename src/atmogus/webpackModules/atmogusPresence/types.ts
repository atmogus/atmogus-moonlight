import { Brand, LolAtmogusDefsActivity } from "@atcute/client/lexicons";

export interface SpotifyInstance {
  hasContext: boolean;
  isPlaying: boolean;
}

export interface DetectedActivity {
  id: string;
  startedAt: string;
  endedAt: string;
  activities: Activity[];
}

export interface DetectedPresences {
  id: string;
  startedAt: string;
  endedAt: string;
  presences: Brand.Union<LolAtmogusDefsActivity.Presence>[];
}

export interface SelfPresenceStoreUpdateEvent {
  type: "SELF_PRESENCE_STORE_UPDATE";
  status: string;
  activities: Activity[];
}

export interface RunningGameStore {
  gamesSeen: Game[]
}

export interface RunningGamesChangeEvent {
  type: string
  games: Game[]
  added: Game[]
  removed: Game[]
}

export interface Game {
  id?: string;
  nativeProcessObserverId?: number;
  name: string;
  processName: string;
  hidden: boolean;
  elevated: boolean;
  sandboxed: boolean;
  lastFocused: number;
  exePath: string;
  exeName: string;
  cmdLine: string;
  distributor?: string;
  pid: number;
  pidPath: any[];
  windowHandle: any;
  fullscreenType: number;
  isLauncher: boolean;
  start?: number;
  lastLaunched?: number;
}

export enum ActivityType {
  /**
   * Playing {name}
   * "Playing Rocket League"
   */
  Playing = 0,
  /**
   * Streaming {details}
   * "Streaming Rocket League"
   */
  Streaming = 1,
  /**
   * Listening to {name}
   * "Listening to Spotify
   */
  Listening = 2,
  /**
   * Watching {name}
   * "Watching YouTube Together"
   */
  Watching = 3,
  /**
   * {emoji} {state}
   * ":smiley: I am cool"
   */
  Custom = 4,
  /**
   * Competing in {name}
   * "Competing in Arena World Champions"
   */
  Competing = 5
}

export interface Activity {
  name: string;
  type: ActivityType;
  state?: string;
  details?: string;
  id?: string;
  application_id?: string;
  created_at: string;
  flags?: number;

  url?: string; // TODO does this field exist?

  buttons?: string[];
  metadata?: {
    button_urls?: string[];
  };

  emoji?: {
    name: string;
    id?: string;
    animated?: boolean;
  };

  timestamps?: {
    start?: number | string;
    end?: number | string;
  };

  assets?: {
    large_image?: string;
    large_text?: string;
    small_image?: string;
    small_text?: string;
  };

  party?: {
    id?: string;
    // TODO is this correct
    size?: [current_size: number, max_size: number];
  };
}

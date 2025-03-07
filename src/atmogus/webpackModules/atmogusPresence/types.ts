import { Brand, LolAtmogusDefsActivity } from "@atcute/client/lexicons"

export interface RpcLocalUpdateEvent {
  socketId: string
  activity?: Activity
}

export interface RpcAppDisconnectedEvent {
  socketId: string
  application: RpcAppData
}

export interface RpcAppData {
  id: string
  name: string
  icon: string
  coverImage: string
  flags: number
}

export interface ActivityEvent {
  identifierKey: string
  activityEndedAt?: string
  activity: Activity
}

export interface ActivityPresenceEvent {
  activityEndedAt?: string
  presence: Brand.Union<LolAtmogusDefsActivity.Presence>
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
  application_id?: string;
  flags?: number;

  /**
   * Used for the "Streaming" ActivityType. Links to a YouTube or Twitch stream.
  */
  url?: string;

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

export interface DetectableApplicationRpcInfo {
  aliases: string[]
  executables: Executable[]
  hook: boolean
  id: string
  name: string
  overlay: boolean
  overlay_compatibility_hook: boolean
  overlay_methods?: number
  overlay_warn: boolean
  themes: string[]
}

export interface VerifiedApplicationRpcInfo {
  id: string
  name: string
  icon: string
  description: string
  summary: string
  type: number
  is_monetized: boolean
  is_verified: boolean
  is_discoverable: boolean
  splash: string
  hook: boolean
  guild_id: string
  executables: Executable[]
  storefront_available: boolean
  integration_types_config: Record<number, any>,
  verify_key: string
  flags: number
}

export interface Executable {
  os: string
  name: string
  is_launcher: boolean
}





export interface SpotifyPlayerState {
  accountId: string
  track: Track
  volumePercent: number
  isPlaying: boolean
  repeat: boolean
  position: number
  device: Device
}

export interface Track {
  id: string
  name: string
  duration: number
  type: string
  album: Album
  artists: Artist[]
  isLocal: boolean
}

export interface Album {
  id: string
  name: string
  image: Image
  type: string
}

export interface Image {
  height: number
  url: string
  width: number
}

export interface Artist {
  external_urls: Record<string, string>
  href: string
  id: string
  name: string
  type: string
  uri: string
}

export interface Device {
  id: string
  is_active: boolean
  is_private_session: boolean
  is_restricted: boolean
  name: string
  supports_volume: boolean
  type: string
  volume_percent: number
}

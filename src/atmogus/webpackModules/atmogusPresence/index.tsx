import Dispatcher from "@moonlight-mod/wp/discord/Dispatcher";

import type { Brand, LolAtmogusDefsActivity } from "@atcute/client/lexicons";
import { Activity, type ActivityEvent, ActivityPresenceEvent, ActivityType, DetectableApplicationRpcInfo, type RpcAppDisconnectedEvent, type RpcLocalUpdateEvent, SpotifyPlayerState, type VerifiedApplicationRpcInfo } from "./types";
import { activity } from "@moonlight-mod/wp/discord/modules/user_profile/web/BiteSizeActivity.css";
import { transparent } from "@moonlight-mod/wp/discord/components/common/HeaderBar.css";

/*
import spacepack from "@moonlight-mod/wp/spacepack_spacepack";

var passOn = [
  "MESSAGE",
  "GUILD",
  "VOICE",
  "PRESENCE_UPDATES",
  "CHANNEL",
  "WINDOW",
  "PASSIVE_UPDATE_V2",
  "CONVERSATION_SUMMARY",
  "CONTENT_INVENTORY",
  "TYPING_",
  "DRAFT",
  "EMOJI_",
  "RTC_",
  "SPEAKING"
]

spacepack.require("discord/Dispatcher").default.addInterceptor((e) => { 
  if (!passOn.some(v => e.type.includes(v))) {
      console.log(e);
  }

  return false;
});
*/

const logger = moonlight.getLogger("atmogus/atmogusPresence");
logger.info("Hello from atmogus!");


/*
Dispatcher.subscribe("SELF_PRESENCE_STORE_UPDATE", (event: any) => {
  logger.info("presence store update", event);
});
*/



function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getDetectableGames() : Promise<DetectableApplicationRpcInfo[]> {
  return new Promise((resolve, reject) => {
    fetch(`https://discord.com/api/v10/applications/detectable`)
      .then(response => {
        if (!response.ok) {
          reject(new Error(`Fetch fail: ${response.statusText}`));
        }
        
        return response.json();
      })
      .then(responseJson => resolve(responseJson))
      .catch(err => reject(err));
  });
}

var detectableGames : DetectableApplicationRpcInfo[];

/** A looping function that tries to send activity data to the ATmogus daemon every 5 seconds.
 *  The delay exists to allow time for any briefly detected activities to be cleared and not sent to the daemon.
 * 
 * Rate limit prevention is handled daemon-side
 */
async function checkSendToAtmogusDaemon() {
  while (true) {
    if (latestActivityEvents != null && Object.keys(latestActivityEvents).length > 0) {
      logger.info("detected update, delaying...");
      await delay(5 * 1000);
      logger.info("delayed ! sending data to daemon");

      if (Object.keys(latestActivityEvents).length > 0) {
        let activities : ActivityPresenceEvent[] = [ ];

        // iterate over activity event ids
        for (let key in latestActivityEvents) {
          let events : ActivityEvent[] = latestActivityEvents[key];
          
          if (events != null && events.length > 0) {
            let latestEvent = events[events.length - 1];

            if (activityHistory[latestEvent.identifierKey] != null) {
              if (latestEvent.activityEndedAt != null) { // activity ended, mark it
                logger.info(`Removing event ${latestEvent.activity.name} from activityHistory`);
  
                let history = activityHistory;
                delete history[latestEvent.identifierKey];
                activityHistory = history;
              }
            } else {
              // activity not in history, add it
              logger.info(`Adding new event ${latestEvent.activity.name} to activityHistory`);
              activityHistory[latestEvent.identifierKey] = latestEvent;
            }

            for (let i = 0; i < events.length; i++) {
              let event = events[i];

              activities.push({
                activityEndedAt: event.activityEndedAt,
                presence: createPresenceObject(event.activity)
              });
            }
          }
        }
        
        // send to daemon
        if (activities.length > 0) {
          fetch("http://localhost:18420/api/discord/activity", {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify(activities satisfies ActivityPresenceEvent[])
          })
          .then(_t => logger.info("Sent; OK"))
          .catch(_e => logger.info("Failed to send; Daemon not running?"));
  
          // clear recent activity list
          latestActivityEvents = { };
        }
      }
    }

    await delay(100);
  }
}

(async () => {
  detectableGames = await getDetectableGames();
  await checkSendToAtmogusDaemon();
})();


function createPresenceObject(activity: Activity) {
  if (activity == null) {
    logger.debug("ACTIVITY IS NULL; EXITING FUNC");
    return activity;
  }

  // create presence object
  const presenceObject: Brand.Union<LolAtmogusDefsActivity.Presence> = {
    $type: "lol.atmogus.defs.activity#presence",
    name: activity.name,
    type: convertActivityTypeToString(activity.type),
    url: activity.url ?? undefined,
    timestamps: activity.timestamps
      ? {
          start: activity.timestamps?.start ? new Date(+activity.timestamps.start).toISOString() : undefined,
          end: activity.timestamps?.end ? new Date(+activity.timestamps.end).toISOString() : undefined
        }
      : undefined,
    source: {
      $type: "lol.atmogus.defs.activity#discordActivitySource",
      applicationId: activity.application_id ?? undefined
    },
    details: activity.details ?? undefined,
    state: activity.state ?? undefined,
    party:
      activity.party !== undefined
        ? {
            size: activity.party.size
              ? {
                  currentSize: activity.party.size[0],
                  maxSize: activity.party.size[1]
                }
              : undefined
          }
        : undefined,
    assets:
      activity.assets !== undefined
        ? {
            largeImage: activity.assets.large_image ?? undefined,
            largeText: activity.assets.large_text ?? undefined,
            smallImage: activity.assets.small_image ?? undefined,
            smallText: activity.assets.small_text ?? undefined
          }
        : undefined
  };

  return presenceObject;
}

/* activityHistory represents all activities detected as currently running.
 *                   =-=-=-=-=-=-=-=-=-=-=-=-=
 * `string` represents either an application's ID, or its name if no
 * application ID is available.
 * 
 * `ActivityEvent` represents the most recent activity data from an application
 * associated with the given `string` key.
*/
//                           id       data
let activityHistory : Record<string, ActivityEvent> = { };

let latestActivityEvents : Record<string, ActivityEvent[]> = { };

function getVerifiedApplicationRpcInfo(application_id : string) : Promise<VerifiedApplicationRpcInfo> {
  return new Promise((resolve, reject) => {
    fetch(`https://discord.com/api/v10/applications/${application_id}/rpc`)
      .then(response => {
        if (!response.ok) {
          reject(new Error(`Fetch fail: ${response.statusText}`));
        }
        
        return response.json();
      })
      .then(responseJson => resolve(responseJson))
      .catch(err => reject(err));
  });
}

function getCheckIfApplicationIsVerifiedByName(application_name : string) : DetectableApplicationRpcInfo | null {
  for (let i = 0; i < detectableGames.length; i++) {
    let game = detectableGames[i];

    if (game.name === application_name) {
      return game;
    }
  }

  return null
}

// TODO: rename this + history to "mostRecent"? or something?
function addEventToHistory(activityEvent : ActivityEvent) {
  if (activityEvent.identifierKey != undefined && activityEvent.activity != undefined) {
    // if event is only in latestActivityEvents, remove it
    if (activityEvent.activityEndedAt != null && latestActivityEvents[activityEvent.identifierKey] != null && activityHistory[activityEvent.identifierKey] == null) {
      let updatedRecord = latestActivityEvents;
      
      delete updatedRecord[activityEvent.identifierKey];
      latestActivityEvents = updatedRecord;

      logger.info(`Activity ${activityEvent.activity.name} is marked as ended, and only exists in latestActivityEvent - removed`);
    } else {
      if (latestActivityEvents[activityEvent.identifierKey] == null) {
        latestActivityEvents[activityEvent.identifierKey] = [ ];
      }

      latestActivityEvents[activityEvent.identifierKey].push(activityEvent);
      
      logger.info(`Added ${activityEvent.activity.name} to latestActivityEvents`);
    }
  }
}

Dispatcher.subscribe("TRACK", (event: any) => {
  if (event.event === "launch_game") {
    let launchEvent = event.properties;
    
    if (launchEvent != null) {
      switch (launchEvent.detection_method) {
        case "verified_game":
          getVerifiedApplicationRpcInfo(launchEvent.game_id)
            .then(rpcInfo => {
              let activity : Activity = {
                name: launchEvent.game,
                application_id: launchEvent.game_id,
                type: ActivityType.Playing,
                timestamps: {
                  start: Date.now()
                },
                assets: {
                  large_image: rpcInfo?.icon
                },
              };
    
              logger.info(`Detected launch of verified application ${activity.name}`);

              addEventToHistory({ identifierKey: launchEvent.game_id ?? launchEvent.game, activity });
          });

          break;
        case "custom_override":
          let activity : Activity = {
            name: launchEvent.game,
            type: ActivityType.Playing,
            timestamps: {
              start: Date.now()
            },
          };

          logger.info(`Detected launch of custom application ${activity.name}`);

          addEventToHistory({ identifierKey: launchEvent.game, activity });

          break;
      }
    }
  }/* else if (event.event === "activity_updated") {
    logger.info("ACTIVITY UPDATED", event);
  }*/
});

// RPC Update event?
Dispatcher.subscribe("LOCAL_ACTIVITY_UPDATE", (event: RpcLocalUpdateEvent) => {
  if (event.activity != null) {
    let identifierKey = `${event.activity.application_id}:sock_${event.socketId}`;

    addEventToHistory({ identifierKey, activity: event.activity });

    logger.info(`Detected RPC activity update from ${event.activity.name}`);
  }

  //logger.info("LOCAL ACTIVITY EVENT DETECTED", event);
});

Dispatcher.subscribe("RPC_APP_DISCONNECTED", (event: RpcAppDisconnectedEvent) => {
  let key = `${event.application.id}:sock_${event.socketId}`;

  let exists = activityHistory[key] != null || latestActivityEvents[key] != null;

  if (exists) {
    let activityEvent;

    if (activityHistory[key] != null) {
      activityEvent = activityHistory[key];
    } else {
      activityEvent = latestActivityEvents[key][latestActivityEvents[key].length - 1];
    }

    activityEvent.activityEndedAt = new Date().toISOString()

    addEventToHistory(activityEvent);

    logger.info(`RPC App ${event.application.name} disconnected; marked as ended`, event);
  }
});


Dispatcher.subscribe("RUNNING_GAMES_CHANGE", (event: any) => {
  // a games been removed, check if its in our list
  if (event.removed.length > 0) {
    for (let i = 0; i < event.removed.length; i++) {
      let key = undefined;
      
      // clean this up ? lol
      if (activityHistory[event.removed[i].id] != null || latestActivityEvents[event.removed[i].id] != null) {
        key = event.removed[i].id;
      } else if (event.removed[i].name != null && (activityHistory[event.removed[i].name] != null || latestActivityEvents[event.removed[i].name] != null)) {
        key = event.removed[i].name;
      }

      if (key === undefined && event.removed[i].name != null) {
        let detectedGame = getCheckIfApplicationIsVerifiedByName(event.removed[i].name);

        if (detectedGame != null) {
          key = detectedGame.id;
        }
      }

      if (key != undefined) {
        let activityEvent;

        if (activityHistory[key] != null) {
          activityEvent = activityHistory[key];
        } else {
          activityEvent = latestActivityEvents[key][latestActivityEvents[key].length - 1];
        }

        activityEvent.activityEndedAt = new Date().toISOString()

        addEventToHistory(activityEvent);

        logger.info(`Application ${event.removed[i].name ?? event.removed[i].id ?? "<undefined>"} detected as removed from RunningGamesChange; marked as ended`);
      }
    }
  }
});

Dispatcher.subscribe("SPOTIFY_PLAYER_STATE", (event: SpotifyPlayerState) => {
  //logger.info("SPOTIFY PLAYER STATE", event);

  let spotifyId = "spotify:1";

  if (event.track != null) {
    let start = new Date().getUTCMilliseconds();
    let urlSplit = event.track.album.image.url.split('/');
    
    let activity : Activity = {
      name: "Spotify",
      type: ActivityType.Listening,
      state: event.track.artists.map(artist => artist.name).join(', '), // TODO: make artists clickable,
      details: event.track.name, // TODO: make track clickable
      application_id: spotifyId,
      timestamps: {
        start,
        end: start + event.track.duration
      },
      assets: {
        large_image: `spotify:${urlSplit[urlSplit.length - 1]}`,
        large_text: event.track.album.name
      } // TODO: sync_id?
    };

    let activityEvent : ActivityEvent = {
      identifierKey: spotifyId,
      activity
    };

    // temp; see about replacing this w/live scrubber update at some point?
    // TODO: better "scrubber moved" event detection
    if (event.isPlaying && (latestActivityEvents[spotifyId] == null || latestActivityEvents[spotifyId][latestActivityEvents[spotifyId].length - 1].activity != activity) &&
        (activityHistory[spotifyId] == null || activityHistory[spotifyId].activity != activity)
    ) {
      addEventToHistory(activityEvent);
      logger.info(`New song detected: ${event.track.name} by ${event.track.artists.map(artist => artist.name).join(', ')}. Album: ${event.track.album.name}`)
    }
  } else {
    // spotify session ended !!!
    let activityEvent;

    if (latestActivityEvents[spotifyId] != null) {
      activityEvent = latestActivityEvents[spotifyId][latestActivityEvents[spotifyId].length - 1];
    }

    if (activityEvent == null && activityHistory[spotifyId] != null) {
      activityEvent = activityHistory[spotifyId];
    }

    if (activityEvent != null) {
      addEventToHistory(activityEvent);
      logger.info(`End of spotify session detected`);
    }
  }
});

/*
Dispatcher.subscribe("SPOTIFY_NEW_TRACK", (event: any) => {
  logger.info("SPOTIFY NEW TRACK", event);
});
*/

function convertActivityTypeToString(
  type: ActivityType
): "playing" | "streaming" | "listening" | "watching" | "competing" {
  switch (type) {
    case ActivityType.Playing:
      return "playing";
    case ActivityType.Streaming:
      return "streaming";
    case ActivityType.Listening:
      return "listening";
    case ActivityType.Watching:
      return "watching";
    case ActivityType.Competing:
      return "competing";
    default:
      return "playing";
  }
}

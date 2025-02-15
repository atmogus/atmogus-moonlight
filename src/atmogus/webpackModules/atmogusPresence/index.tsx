import Dispatcher from "@moonlight-mod/wp/discord/Dispatcher";

import type { Brand, LolAtmogusDefsActivity } from "@atcute/client/lexicons";
import { ActivityType, type RunningGamesChangeEvent, type RunningGameStore, type Activity, type SelfPresenceStoreUpdateEvent, SpotifyInstance, DetectedActivity, DetectedPresences } from "./types";



import spacepack from "@moonlight-mod/wp/spacepack_spacepack";


/*var dispatcherLogPassOn = [
  "MESSAGE",
  "GUILD",
  "VOICE",
  "PRESENCE_UPDATES",
  "CHANNEL",
  "WINDOW",
  "PASSIVE_UPDATE_V2",
  "CONVERSATION_SUMMARY",
  "CONTENT_INVENTORY",
  "RTC",
  "TYPING_",
  "SPEAKING",
  "ACCESSIBILITY_",
  "DRAFT",
  "TYPING",
  "THREAD_",
  "EMOJI_",
  "DELETE_",
  "BILLING_"
]

spacepack.require("discord/Dispatcher").default.addInterceptor((ev) => { 
  if (!dispatcherLogPassOn.some(evSubstr => ev.type.includes(evSubstr))) {
      console.log(ev);
  }

  return false;
});*/

const logger = moonlight.getLogger("atmogus/atmogusPresence");
logger.info("Hello from atmogus!");

function createPresenceObject(activity: Activity) {
  if (activity == null) {
    logger.debug("ACTIVITY IS NULL; EXITING FUNC");
    return activity;
  }

  // create activity object
  const activityObject: Brand.Union<LolAtmogusDefsActivity.Presence> = {
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

  return activityObject;
}


function getFocusedActivities(activities: Activity[]) {
  const runningGamesStore: RunningGameStore = JSON.parse(moonlight.localStorage.getItem("RunningGameStore") ?? "{}");
  //logger.info(runningGamesStore);

  // Occasionally, some helper processes get detected that aren't necessarily games - ie pressure-vessel-wrap and srt-bwrap.
  // This is an (attempted) solution to ignore them, so they don't clog up our activities.
  //
  // From my (limited) testing, they never get a lastFocused timestamp > 0, so this may or may not be a good solution !!!!!
  for (let i = 0; i < runningGamesStore.gamesSeen.length; i++) {
    let seenGame = runningGamesStore.gamesSeen[i];

    for (let i = 0; i < activities.length; i++) {
      let activity = activities[i];

      if (seenGame.name == activity.name || (activity.application_id === seenGame.id && activity.application_id != null)) {
        if (seenGame.lastFocused == 0) {
          activities = activities.filter((e) => e.application_id == activity.application_id || e.name == activity.name);
        }
      }
    }
  }

  return activities;
}


//let detectedActivities: Record<string, DetectedActivity>;
var detectedActivities: DetectedActivity[] = [];


var runningGamesChange: RunningGamesChangeEvent;

Dispatcher.subscribe("RUNNING_GAMES_CHANGE", (event: RunningGamesChangeEvent) => {
  runningGamesChange = event;
});


var lastPresenceEvent: SelfPresenceStoreUpdateEvent;

var spotifyInstance: SpotifyInstance;

Dispatcher.subscribe("SPOTIFY_PLAYER_STATE", (event: any) => {
  logger.info("Received spotify player state !", event);

  spotifyInstance = {
    hasContext: event.context != null,
    isPlaying: event.isPlaying
  } as SpotifyInstance;
});



// Listen for presence events
Dispatcher.subscribe("SELF_PRESENCE_STORE_UPDATE", (event: SelfPresenceStoreUpdateEvent) => {
  /*
   TODO: Spotify instance handling 
   */
  const lastPresenceEmpty = lastPresenceEvent == null;

  // no presence updates; skip
  if (event.activities?.length === 0 && lastPresenceEvent?.activities.length === 0) {
    logger.debug("both current and previous activities are empty; skipping update");
    return;
  }

  // removed games
  const detectedRemovedGames = detectedActivities.filter(activity => runningGamesChange.removed.find(game => 
    game.start != null && activity.startedAt === new Date(+game.start).toISOString()
  ));

  logger.info("REMOVED", detectedRemovedGames);
  
  for (let i = 0; i < detectedRemovedGames.length; i++) {
    detectedRemovedGames[i].endedAt = new Date().toISOString();
  }

  const activities = getFocusedActivities(event.activities.filter((e) => e.type !== ActivityType.Custom && e.id != null));

  logger.info("FOCUSED", activities);

  logger.info("DETECTED ACTIVITIES EXISTS?", detectedActivities);

  let undetectedActivities = activities.filter(act => !detectedActivities.some(dAct => dAct.id != null && act.id === dAct.id));

  logger.info("UNDETECTED", undetectedActivities);

  // add undetected activities to detectedActivities
  for (let i = 0; i < undetectedActivities.length; i++) {
    let activity = undetectedActivities[i];

    logger.info("ADDING UNDETECTED", activity.id, "(", activity.name, ")");

    detectedActivities.push({
      id: activity.id, // shouldn't be null due to null check in filter
      startedAt: activity.created_at,
      activities: [ activity ]
    });
  }

  // loop over received activity events
  for (let i = 0; i < activities.length; i++) {
    let activity = activities[i];
    logger.info(activity.name, activity.state ?? "<null>", activity.details ?? "<null>");
    
    const detectedIndex = detectedActivities.findIndex(d => d.id === activity.id);
    const isNewActivity = !activityTextMatches(activity, detectedActivities[detectedIndex].activities[0]);

    if (isNewActivity) {
      logger.info("========= ACTIVITY", activity.name, activity.state ?? "<null>", activity.details ?? "<null>", "DOES NOT MATCH", detectedActivities[detectedIndex].activities[0].name, detectedActivities[detectedIndex].activities[0].state ?? "<null>", detectedActivities[detectedIndex].activities[0].details ?? "<null>")
      detectedActivities[detectedIndex].activities.unshift(activity);
    }
  }

  
  let data: DetectedPresences[] = [];
  
  for (let i = 0; i < detectedActivities.length; i++) {
    data.push(
      {
        id: detectedActivities[i].id,
        startedAt: detectedActivities[i].startedAt,
        endedAt: detectedActivities[i].endedAt,
        presences: detectedActivities[i].activities.map(createPresenceObject) satisfies Brand.Union<LolAtmogusDefsActivity.Presence>[]
      }
    )
  }

  logger.info("DETECTED PRESENCES", data);


  fetch("http://localhost:18420/api/discord/activity", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(data)
  });

  // remove removed games
  detectedActivities = detectedActivities.filter(act => !detectedRemovedGames.includes(act));


  logger.info("SELF_PRESENCE_STORE", event);

  lastPresenceEvent = event;
});

function activityTextMatches(activityA: Activity, activityB: Activity) {
  return activityA.name === activityB.name &&
         activityA.details === activityB.details &&
         activityA.state === activityB.state
}

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


// https://stackoverflow.com/a/77278013
function deepEqual<T>(a: T, b: T): boolean {
  if (a === b) {
      return true;
  }

  const bothAreObjects = a && b && typeof a === 'object' && typeof b === 'object';

  return Boolean(
      bothAreObjects &&
          Object.keys(a).length === Object.keys(b).length &&
          Object.entries(a).every(([k, v]) => deepEqual(v, b[k as keyof T])),
  );
}

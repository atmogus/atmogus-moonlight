import Dispatcher from "@moonlight-mod/wp/discord/Dispatcher";

import type { Brand, LolAtmogusDefsActivity } from "@atcute/client/lexicons";
import { ActivityType, type Activity, type SelfPresenceStoreUpdateEvent } from "./types";

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
          start: activity.timestamps?.start ? new Date(activity.timestamps.start).toISOString() : undefined,
          end: activity.timestamps?.end ? new Date(activity.timestamps.end).toISOString() : undefined
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

/*import spacepack from "@moonlight-mod/wp/spacepack_spacepack";

spacepack.require("discord/Dispatcher").default.addInterceptor((e) => { 
    if (!e.type.includes("MESSAGE") && !e.includes.contains("GUILD")) {
        console.log(e);
    //}

    return false;
})*/

let lastPresenceEvent: SelfPresenceStoreUpdateEvent;

// Listen for presence events
Dispatcher.subscribe("SELF_PRESENCE_STORE_UPDATE", (event: SelfPresenceStoreUpdateEvent) => {
  const lastPresenceEmpty = lastPresenceEvent == null;

  if (event.activities?.length === 0 && lastPresenceEvent?.activities.length === 0) {
    logger.debug("both current and previous activities are empty; skipping update");
    return;
  }

  const activityObjects = event.activities.filter((e) => e.type !== ActivityType.Custom).map(createPresenceObject);

  fetch("http://localhost:18420/api/discord/activity", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(activityObjects satisfies Brand.Union<LolAtmogusDefsActivity.Presence>[])
  });

  logger.info("event triggered", event);

  lastPresenceEvent = event;
});

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

import Dispatcher from "@moonlight-mod/wp/discord/Dispatcher";

import type { At, Brand, LolAtmogusActivityPresences, LolAtmogusDefsActivity } from "@atcute/client/lexicons";
import * as TID from "@atcute/tid";
import { ActivityType, type Activity, type SelfPresenceStoreUpdateEvent } from "./types";
import { getLoggedInAgent } from "./atproto";

const logger = moonlight.getLogger("atmogus/atmogusPresence");
logger.info("Hello from atmogus!");

function createPresenceObject(activity: Activity) {
  if (activity == null) {
    logger.info("ACTIVITY IS NULL; EXITING FUNC");
    return activity;
  }

  // create activity object
  const activityObject: Brand.Union<LolAtmogusDefsActivity.Presence> = {
    $type: "lol.atmogus.defs.activity#presence",
    name: activity.name,
    type: activity.type,
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
    emoji:
      activity.emoji !== undefined
        ? {
            name: activity.emoji.name,
            id: activity.emoji.id ?? undefined,
            animated: activity.emoji.animated ?? undefined
          }
        : undefined,
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

function createRecordFromPresences(activityObjects: Brand.Union<LolAtmogusDefsActivity.Presence>[], createdAt: Date) {
  // create activity record
  const record: LolAtmogusActivityPresences.Record = {
    $type: "lol.atmogus.activity.presences",
    presences: activityObjects,
    createdAt: createdAt.toISOString()
  };

  logger.info("Created activity record", record);

  return record;
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
  const presencesRecord = createRecordFromPresences(activityObjects, new Date());

  (async () => {
    const agent = await getLoggedInAgent();

    const identifier = moonlight.getConfigOption<string>("atmogus", "handleDid") ?? "undefined?";

    agent.create({
      collection: "lol.atmogus.activity.presences",
      rkey: TID.now(),
      repo: identifier,
      record: presencesRecord
    });
  })();

  logger.info("event triggered", event);

  lastPresenceEvent = event;
});

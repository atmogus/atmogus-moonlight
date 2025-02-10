import Dispatcher from "@moonlight-mod/wp/discord/Dispatcher";


import { XRPC, CredentialManager } from '@atcute/client';
import type {
	At,
	Brand,
	ComAtprotoRepoApplyWrites,
  LolAtmogusActivityHistory,
  LolAtmogusActivityCurrent,
  LolAtmogusDefs
} from '@atcute/client/lexicons';
import * as TID from '@atcute/tid';

const logger = moonlight.getLogger("atmogus/atmogusPresence");
logger.info("Hello from atmogus!");
export const greeting = "Hello from atmogus's exports!";


// TODO: better method of storing user credentials
const pdsUrl = moonlight.getConfigOption<string>('atmogus', 'pdsUrl') ?? 'undefined?';
const handleDid = moonlight.getConfigOption<string>('atmogus', 'handleDid') ?? 'undefined?';
const appPassword = moonlight.getConfigOption<string>('atmogus', 'appPassword') ?? 'undefined?'; // TODO: More secure way of handling this!!!!!

var userDid = "";

function asUrl(string: string) {
  // TODO: make nicer ?
  if (!string.startsWith("http://") && !string.startsWith("https://")) {
    return "https://" + string;
  }

  return string;
}

const pdsUrlClean = asUrl(pdsUrl);

const manager = new CredentialManager({ service: pdsUrlClean });
const rpc = new XRPC({ handler: manager });

(async () => {
  await manager.login({ identifier: handleDid, password: appPassword });

  {
    const { data } = await rpc.get('com.atproto.identity.resolveHandle', {
      params: {
        handle: handleDid,
      },
    });
  
    userDid = data.did;
  }

  {
    // check if currentActivity record exists
    try {
      await rpc.get('com.atproto.repo.getRecord', {
        params: {
          repo: userDid,
          collection: 'lol.atmogus.activity.current',
          rkey: 'self'
        },
      });
    } catch(_) { // create it if it doesnt
      logger.info("current activity record doesnt exist!");
      (async () => {
        await rpc.call('com.atproto.repo.applyWrites', {
          data: {
            repo: userDid,
            writes: [
              {
                $type: 'com.atproto.repo.applyWrites#create',
                collection: 'lol.atmogus.activity.current',
                rkey: 'self',
                value: { }
              }
            ]
          }
        });
      })();
    }
  }
})();

function createActivityObject(activity, start : any | undefined = undefined, end: any | undefined = undefined) {
  if (activity == null || activity == undefined) {
    logger.info("ACTIVITY IS NULL; EXITING FUNC");
    return activity;
  }
  
  var startTime : string | undefined;

  if (start != null) {
    startTime = new Date(start).toISOString();
  } else if (activity.timestamps?.start != null) {
    startTime = new Date(parseInt(activity.timestamps.start)).toISOString();
  }

  const emojiStatus = activity.emoji != undefined ? {
    name: activity.emoji.name,
    id: activity.emoji.id ?? undefined,
    animated: activity.emoji.animated ?? undefined
  } : undefined;

  const activityParty = activity.party != undefined ? {
    id: activity.party.id ?? undefined,
    size: activity.party.size ?? undefined
  } : undefined;

  const activityAssets = activity.assets != undefined ? {
    largeImage: activity.assets.large_image ?? undefined,
    largeText: activity.assets.large_text ?? undefined,
    smallImage: activity.assets.small_image ?? undefined,
    smallText: activity.assets.small_text ?? undefined
  } : undefined;
  
  // create activity object
  const activityObject: LolAtmogusDefs.ActivityPresence & { $type: 'lol.atmogus.defs#activityPresence' } = {
    $type: "lol.atmogus.defs#activityPresence",
    name: activity.name,
    type: activity.type,
    url: activity.url ?? undefined,
    timestamps: {
      start: startTime,
      end: end ?? undefined
    },
    applicationId: activity.application_id ?? undefined,
    details: activity.details ?? undefined,
    state: activity.state ?? undefined,
    emoji: emojiStatus,
    party: activityParty,
    assets: activityAssets
  }

  return activityObject;
}

function createRecordFromActivity(activityObject, createdAt) {
  // create activity record
  const record: LolAtmogusActivityHistory.Record & { $type: 'lol.atmogus.activity.history' } = {
    $type: "lol.atmogus.activity.history",
    activity: activityObject,
    createdAt: createdAt
  }

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


var lastPresenceEvent;

var currentActivityRecordTid;
var currentActivityRecordData;
var currentActivityRecordCreationDate;

// Listen for presence events
Dispatcher.subscribe("SELF_PRESENCE_STORE_UPDATE", (event: any) => {
  const lastPresenceEmpty = lastPresenceEvent == null || lastPresenceEvent == undefined;

  var updateActivity = true;

  if (event.activities?.length == 0) {
    if (event.activities == lastPresenceEvent?.activities) {
      //logger.info("both current and previous activities are empty; skipping update");
      updateActivity = false;
    }
  }

  if (updateActivity) {
    if (lastPresenceEmpty) {
      //logger.info("Last event is uninitialized; skipping comparison check")
    } else if (lastPresenceEvent.activities == event.activities) {
      //logger.info("previous and current events are the same; skipping update");
      updateActivity = false;
    }
  }

  if (updateActivity) {
    const creates: Brand.Union<ComAtprotoRepoApplyWrites.Create>[] = [];
    const updates: Brand.Union<ComAtprotoRepoApplyWrites.Update>[] = [];

    if ((event != null && currentActivityRecordData != null) && event.application_id != currentActivityRecordData.application_id) {
      clearCurrentActivityVars();
      return;
    }

    if (event.activities.length > 0) {
      // create activity if we're starting up a new one
      if (lastPresenceEmpty || lastPresenceEvent.activities.length < 1) {
        createActivityRecord(event, creates, updates);
      }
      // We've already created a record for this activity, update its data
      else if (event.activities.length > 0 && currentActivityRecordData != null) {
        updateActivityRecord(event, updates);
      }
    }

    // no game detected, update activity records to indicate we stopped
    if (!lastPresenceEmpty && lastPresenceEvent.activities.length > 0 && event.activities.length < 1) {
      markActivityRecordsStopped(updates);

      clearCurrentActivityVars();
    }

    if (creates.length > 0) {
      (async () => {
        await rpc.call('com.atproto.repo.applyWrites', {
          data: {
            repo: userDid,
            writes: creates
          }
        });
      })();
    }

    if (updates.length > 0) {
      (async () => {
        await rpc.call('com.atproto.repo.applyWrites', {
          data: {
            repo: userDid,
            writes: updates
          }
        });
      })();
    }

    logger.info("event triggered", event);
  }

  lastPresenceEvent = event;
});

function clearCurrentActivityVars() {
  currentActivityRecordData = null;
  currentActivityRecordTid = null;
}

function createActivityRecord(event, creates, updates) {
  currentActivityRecordCreationDate = new Date().toISOString();

  const activityObject = createActivityObject(event.activities[0]);
  const activityRecord = createRecordFromActivity(activityObject, currentActivityRecordCreationDate);
  const tid = TID.now();

  const currentRecord: LolAtmogusActivityCurrent.Record & { $type: 'lol.atmogus.activity.current' } = {
    $type: "lol.atmogus.activity.current",
    activity: activityObject
  };

  // create a record for the current activity
  creates.push({
    $type: 'com.atproto.repo.applyWrites#create',
    collection: 'lol.atmogus.activity.history',
    rkey: tid,
    value: activityRecord,
  });

  // update our currentActivity record to point to the current record
  updates.push({
      $type: 'com.atproto.repo.applyWrites#update',
      collection: 'lol.atmogus.activity.current',
      rkey: 'self',
      value: currentRecord
  });

  currentActivityRecordTid = tid
  currentActivityRecordData = activityRecord;

  logger.info("Created activity record", activityRecord);
  logger.info("Current Activity Record", currentRecord);
}

function updateActivityRecord(event, updates) {
  const activityObject = createActivityObject(event.activities[0]);
  const activityRecord = createRecordFromActivity(activityObject, currentActivityRecordCreationDate);

  const currentRecord: LolAtmogusActivityCurrent.Record & { $type: 'lol.atmogus.activity.current' } = {
    $type: "lol.atmogus.activity.current",
    activity: activityObject
  };

  updates.push({
    $type: 'com.atproto.repo.applyWrites#update',
    collection: 'lol.atmogus.activity.history',
    rkey: currentActivityRecordTid,
    value: activityRecord,
  });

  updates.push({
    $type: 'com.atproto.repo.applyWrites#update',
    collection: 'lol.atmogus.activity.current',
    rkey: 'self',
    value: currentRecord,
  });

  logger.info("UPDATE", activityRecord);
}

function markActivityRecordsStopped(updates) {
  const stopTime = new Date().toISOString();
  
  logger.info("LAST EVENT:", currentActivityRecordData);

  const activityObject = createActivityObject(currentActivityRecordData?.activity, undefined, stopTime);
  const activityRecord = createRecordFromActivity(activityObject, currentActivityRecordData.createdAt);

  // set "stop" timestamp
  updates.push({
    $type: 'com.atproto.repo.applyWrites#update',
    collection: 'lol.atmogus.activity.history',
    rkey: currentActivityRecordTid,
    value: activityRecord,
  });

  // tell current activity record to point to nothing 
  updates.push({
    $type: 'com.atproto.repo.applyWrites#update',
    collection: 'lol.atmogus.activity.current',
    rkey: 'self',
    value: { },
  });

  logger.info("Marked activity as ended", activityRecord);
}
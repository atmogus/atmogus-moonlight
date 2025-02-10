import type { AtpSessionData } from "@atcute/client";
import { KittyAgent } from "kitty-agent";

const logger = moonlight.getLogger("atmogus/atmogusPresence/atproto");

let agentPromise: Promise<KittyAgent> | undefined = undefined;
export async function getLoggedInAgent() {
  agentPromise ??= (async () => {
    const identifier = moonlight.getConfigOption<string>("atmogus", "handleDid") ?? "undefined?";
    const password = moonlight.getConfigOption<string>("atmogus", "appPassword") ?? "undefined?";

    const { agent, manager } = await KittyAgent.createPdsWithCredentials(identifier);

    let session = localStorage.bskySession as AtpSessionData;
    if (session) {
      try {
        await manager.resume(session);
        logger.info("resumed session");
      } catch (err) {
        logger.warn("failed to resume session", err);
        session = await manager.login({ identifier, password });
        localStorage.bskySession = session;
      }
    } else {
      session = await manager.login({ identifier, password });
      localStorage.bskySession = session;
    }

    return agent;
  })();

  return agentPromise;
}

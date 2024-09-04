import type { Analytics, Properties } from "@/wab/shared/analytics/Analytics";
import type {
  Identify as BrowserIdentify,
  Types as BrowserTypes,
} from "@amplitude/analytics-browser";
import type {
  Identify as NodeIdentify,
  Types as NodeTypes,
} from "@amplitude/analytics-node";

type Identify = BrowserIdentify | NodeIdentify;
type Client = BrowserTypes.BrowserClient | NodeTypes.NodeClient;
type EventOptions = BrowserTypes.EventOptions | NodeTypes.EventOptions;

/** For keeping MTU down for services that bill based on this. */
const ANONYMOUS_EVENT_OPTIONS: EventOptions = {
  device_id: "FIXED_ANONYMOUS_ID",
};

/** This is a write-only API key that is publicly exposed. */
export const AMPLITUDE_API_KEY = "1efde847a1dd16e6dbf8a242c1e2dd07";

export class AmplitudeAnalytics implements Analytics {
  private eventOptions: EventOptions = ANONYMOUS_EVENT_OPTIONS;
  private baseEventProperties: Properties = {};

  constructor(
    private readonly identifyConstructor: new () => Identify,
    private readonly amplitude: Client
  ) {}

  appendBaseEventProperties(newProperties) {
    Object.assign(this.baseEventProperties, newProperties);
  }

  setUser(userId) {
    this.eventOptions = {
      user_id: userId,
    };
  }

  setAnonymousUser() {
    this.eventOptions = ANONYMOUS_EVENT_OPTIONS;
  }

  identify(userId, userProperties) {
    const identifyEvent = new this.identifyConstructor();
    for (const [key, value] of Object.entries(userProperties)) {
      identifyEvent.set(key, value as any);
    }
    this.amplitude.identify(identifyEvent, {
      user_id: userId,
    });
    this.setUser(userId);
  }

  track(eventName, eventProperties) {
    this.amplitude.track(
      eventName,
      { ...this.baseEventProperties, ...eventProperties },
      this.eventOptions
    );
  }

  recordSession() {}
}

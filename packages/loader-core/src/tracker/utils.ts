const isBrowser =
  typeof window !== "undefined" &&
  window != null &&
  typeof window.document !== "undefined";

export function getPlasmicCookieValues() {
  if (!isBrowser) {
    return {};
  }
  return Object.fromEntries(
    document.cookie
      .split("; ")
      .filter((cookie) => cookie.includes("plasmic:"))
      .map((cookie) => cookie.split("="))
      .map(([key, value]) => [key.split(":")[1], value])
  );
}

export function getVariationCookieValues() {
  const cookies = getPlasmicCookieValues();
  return Object.fromEntries(
    Object.keys(cookies)
      .map((key) => [key.split(".")[1], cookies[key]])
      .filter((val) => !!val[0])
  );
}

// https://stackoverflow.com/a/8809472
export function generateUUID() {
  // Public Domain/MIT
  var d = new Date().getTime(); //Timestamp
  var d2 =
    (typeof performance !== "undefined" &&
      performance.now &&
      performance.now() * 1000) ||
    0; //Time in microseconds since page-load or 0 if unsupported
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    var r = Math.random() * 16; //random number between 0 and 16
    if (d > 0) {
      //Use timestamp until depleted
      r = (d + r) % 16 | 0;
      d = Math.floor(d / 16);
    } else {
      //Use microseconds since page-load if supported
      r = (d2 + r) % 16 | 0;
      d2 = Math.floor(d2 / 16);
    }
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export function getDistinctId(): string {
  if (!isBrowser) {
    return "LOADER-SERVER";
  }
  // Don't generate a new UUID per event so that we don't consider
  // each event from a different person which uses more storage
  // return generateUUID();
  return "LOADER-CLIENT";
}

function getCampaignParams() {
  const { location } = window;
  const params: Record<string, string> = {};
  try {
    const url = new URL(location.href);
    const CAMPAIGN_KEYWORDS = [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_content",
      "utm_term",
      "gclid",
    ];
    CAMPAIGN_KEYWORDS.forEach((keyword) => {
      const value = url.searchParams.get(keyword);
      if (value) {
        params[keyword] = value;
      }
    });
  } catch (err) {}
  return params;
}

function getLocationMeta() {
  const { location } = window;
  const { referrer } = document;
  return {
    url: location.href,
    host: location.host,
    pathname: location.pathname,
    referrer,
    ...getCampaignParams(),
  };
}

function getScreenMeta() {
  const { screen } = window;
  return {
    screen_height: screen.height,
    screen_width: screen.width,
    viewport_height: window.innerHeight,
    viewport_width: window.innerWidth,
  };
}

function getOS(userAgent: string) {
  if (/Windows/i.test(userAgent)) {
    if (/Phone/.test(userAgent) || /WPDesktop/.test(userAgent)) {
      return "Windows Phone";
    }
    return "Windows";
  } else if (/(iPhone|iPad|iPod)/.test(userAgent)) {
    return "iOS";
  } else if (/Android/.test(userAgent)) {
    return "Android";
  } else if (/(BlackBerry|PlayBook|BB10)/i.test(userAgent)) {
    return "BlackBerry";
  } else if (/Mac/i.test(userAgent)) {
    return "Mac OS X";
  } else if (/Linux/.test(userAgent)) {
    return "Linux";
  } else if (/CrOS/.test(userAgent)) {
    return "Chrome OS";
  } else {
    return "";
  }
}

function getDeviceInfo(userAgent: string) {
  const PATTERNS = [
    {
      device: "iPhone",
      patterns: [/iPhone/],
    },
    {
      device: "iPad",
      patterns: [/iPad/],
    },
    {
      device: "iPod Touch",
      patterns: [/iPod/],
    },
    {
      device: "Windows Phone",
      patterns: [/Windows Phone/i, /WPDesktop/],
    },
    {
      device: "Android",
      patterns: [/Android/],
    },
  ];
  const match = PATTERNS.find((pattern) =>
    pattern.patterns.some((expr) => expr.test(userAgent))
  );
  const device = match?.device;
  return {
    device: device ?? "",
    deviceType: device ? "Mobile" : "Desktop",
    os: getOS(userAgent),
  };
}

function getUserAgentMeta() {
  const { navigator } = window;
  const { userAgent } = navigator;
  return {
    ...getDeviceInfo(userAgent),
  };
}

export function getWindowMeta() {
  if (!isBrowser) {
    return {};
  }
  return {
    ...getLocationMeta(),
    ...getScreenMeta(),
    ...getUserAgentMeta(),
  };
}

const isProduction = process.env.NODE_ENV === "production";

export function getEnvMeta() {
  return {
    isBrowser,
    isProduction,
  };
}

export function rawSplitVariation(variation: Record<string, string>) {
  const rawVariations: Record<string, string> = {};
  Object.keys(variation).forEach((variationKey) => {
    const [, splitId] = variationKey.split(".");
    if (splitId) {
      rawVariations[splitId] = variation[variationKey];
    }
  });
  return rawVariations;
}

const POLL_TIME = 5000;

export function throttled<T>(func: (param: T) => Promise<void>) {
  let timerId: number | undefined = undefined;
  return (param: T) => {
    if (timerId) {
      // will already be taken care of next time we run
      return;
    }

    if (isBrowser) {
      timerId = window.requestAnimationFrame(() => {
        timerId = undefined;
        func(param);
      });
    } else {
      timerId = setTimeout(() => {
        timerId = undefined;
        func(param);
      }, POLL_TIME) as any;
    }
  };
}

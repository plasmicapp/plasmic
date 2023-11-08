import { notification } from "antd";
import L from "lodash";
import { computed, observable } from "mobx";
import { ProjectDependency, Site } from "./classes";
import { StudioCtx } from "./client/studio-ctx/StudioCtx";
import { assertNever, spawn, unexpected } from "./common";
import { derefTokenRefs } from "./commons/StyleToken";
import { $, JQ, US } from "./deps";
import {
  getGoogFontMeta,
  getGoogFontsMeta,
  GoogFontMeta,
  makeGoogleFontApiUrl,
} from "./googfonts";
import { walkDependencyTree } from "./project-deps";
import { extractUsedFontsFromComponents } from "./shared/codegen/fonts";
import { allStyleTokens } from "./sites";

//
// typography
//

let _defaultFonts = L(
  US.lines(
    `\
Arial
Bitter
Calibri
Cambria
Changa One
Comic Sans MS
Consolas
Corsiva
Courier New
Droid Sans
Droid Serif
Exo
Georgia
Great Vibes
Helvetica Neue
Inconsolata
Lato
Merriweather
Montserrat
Open Sans
Oswald
PT Sans
PT Serif
Palotino Linotype
Syncopate
Tahoma
Times New Roman
Trebuchet MS
Ubuntu
Varela
Varela Round
Verdana
Vollkorn\
`.trim()
  )
)
  .uniq()
  .sort()
  .value();

// From http://www.ampsoft.net/webdesign-l/WindowsMacFonts.html
const commonLocalFonts = L(
  US.lines(
    `\
Arial
Arial Black
New York Extra Large
New York Large
New York Medium
New York Small
Comic Sans
Courier New
Futura
Futura PT Web
Futura PT Web Light
Georgia
Impact
Lucida Console
Lucida Sans Unicode
Meta Serif Pro
Palatino Linotype
Book Antiqua
Tahoma
Times New Roman
Trebuchet MS
Verdana
SF Compact Display
SF Compact Rounded
SF Compact Text
SF Mono
SF Pro Display
SF Pro Rounded
SF Pro Text
Symbol
Webdings
Wingdings
MS Sans Serif
system-ui\
`.trim()
  ) as string[]
)
  .uniq()
  .sort()
  .value();

export function getFontSpec(fontFamily: string): FontInstallSpec {
  const maybeGoogleMeta = getGoogFontMeta(fontFamily);
  return !!maybeGoogleMeta
    ? toGoogleFontInstallSpec(maybeGoogleMeta)
    : {
        fontType: "local",
        fontFamily,
      };
}

const plasmicTestFont = "plasmicTestFont";

interface NotificationArgs {
  message: string;
  description: string;
}

class ThrottledNotification {
  private doNotify: () => void;
  constructor(argsProps: NotificationArgs, waitMs: number) {
    const warnMissingFont = () => {
      notification.warn(argsProps);
    };
    this.doNotify = L.throttle(warnMissingFont, waitMs);
  }
  notify() {
    this.doNotify();
  }
}

export type FontInstallSpec = GoogleFontInstallSpec | LocalFontInstallSpec;

export interface GoogleFontInstallSpec {
  fontType: "google-font";
  fontFamily: string;
  variants: FontVariant[];
}

export interface LocalFontInstallSpec {
  fontType: "local";
  fontFamily: string;
}

export interface FontVariant {
  italic: boolean;
  weight: number;
}

export class FontManager {
  // All available fonts (e.g. from Google, user-managed, common local fonts)
  private _availPlasmicManagedFonts = observable.array<FontInstallSpec>();
  private _availLocalFonts = observable.set<string>();
  private _loaded = false;
  private localFontInstallAttempts = new Set<FontInstallSpec>();
  private notifiers = new Map<string, ThrottledNotification>();
  // Fonts used in the Site
  private usedFonts = observable.array<FontInstallSpec>();
  private _userManagedFonts = computed(() =>
    L.uniq([
      ...this.site.userManagedFonts,
      ...this.site.projectDependencies.flatMap(
        (pd) => pd.site.userManagedFonts
      ),
    ])
  );

  constructor(readonly site: Site) {
    this.usedFonts.push(
      ...extractUsedFontsFromComponents(site, site.components),
      ...walkDependencyTree(site, "all").flatMap((dep) =>
        extractUsedFontsFromComponents(dep.site, dep.site.components)
      )
    );

    const googleFonts = getGoogFontsMeta().items.map((m) =>
      toGoogleFontInstallSpec(m)
    );
    this._availPlasmicManagedFonts.push(...googleFonts);

    spawn(
      asyncTestFonts(
        L.uniq([
          ...commonLocalFonts,
          ...this.userManagedFonts(),
          ...this.usedFonts.map((f) => f.fontFamily),
        ])
      ).then((avails) => {
        // Add installed commonLocalFonts to this._availPlasmicManagedFonts
        const availCommonLocalFonts = commonLocalFonts.filter((f) =>
          avails.includes(f)
        );
        this._availPlasmicManagedFonts.push(
          ...availCommonLocalFonts.map((fontFamily) => {
            return {
              fontType: "local" as const,
              fontFamily,
            };
          })
        );
        this.localFontInstallAttempts.forEach((spec) =>
          this.tryWarnMissingPlasmicManagedFont(spec.fontFamily)
        );
        this._loaded = true;
        avails
          .filter(
            (f) => !googleFonts.map((spec) => spec.fontFamily).includes(f)
          )
          .forEach((f) => this._availLocalFonts.add(f));
      })
    );
  }

  isUserManagedFontInstalled = (f: string) => {
    return !!this._availLocalFonts.has(f);
  };

  private _availFonts = computed(() => {
    const r = [...this._availPlasmicManagedFonts];
    this.userManagedFonts().forEach((fontFamily) => {
      if (!r.find((s) => s.fontFamily === fontFamily)) {
        r.push({
          fontType: "local",
          fontFamily,
        });
      }
    });
    return r;
  });

  availFonts = () => {
    return this._availFonts.get();
  };

  plasmicManagedFonts = (): ReadonlyArray<FontInstallSpec> => {
    return this._availPlasmicManagedFonts;
  };

  userManagedFonts = (): ReadonlyArray<string> => {
    return this._userManagedFonts.get();
  };

  private tryWarnMissingPlasmicManagedFont = (fontFamily: string) => {
    const availableFontFamilies = this._availPlasmicManagedFonts.map(
      (s) => s.fontFamily
    );
    if (!availableFontFamilies.includes(fontFamily)) {
      const notifier = this.notifiers.get(fontFamily);
      if (notifier) {
        notifier.notify();
      } else {
        this.notifiers.set(
          fontFamily,
          new ThrottledNotification(
            {
              message: `Font "${fontFamily}" is not available on this machine`,
              description: "This font won't be rendered correctly.",
            },
            // 1 day
            24 * 3600 * 1000
          )
        );
      }
    }
  };

  addUserManagedFont = async (f: string) => {
    const avails = await asyncTestFonts([f]);
    if (avails.length === 1) {
      this._availLocalFonts.add(avails[0]);
    }
  };

  private installFont = (htmlHeads: Array<JQ>, fontSpec: FontInstallSpec) => {
    if (fontSpec.fontType === "local") {
      if (!this.site.userManagedFonts.includes(fontSpec.fontFamily)) {
        // We only warn missing fonts that is not in user managed fonts. This
        // means, when user has deleted the font from userManagedFonts, they
        // will be warned too.
        if (this._loaded) {
          this.tryWarnMissingPlasmicManagedFont(fontSpec.fontFamily);
        } else {
          this.localFontInstallAttempts.add(fontSpec);
        }
      }
      return;
    } else if (fontSpec.fontType === "google-font") {
      const url = makeGoogleFontApiUrl(fontSpec.fontFamily);
      htmlHeads.forEach(($head) => {
        const $link = $("<link />", {
          rel: "stylesheet",
          href: url,
        });
        $head.append($link);
      });
      return;
    } else {
      assertNever(fontSpec);
    }
  };

  installAllUsedFonts = (htmlHeads: Array<JQ>) => {
    this.usedFonts.forEach((fontSpec) => this.installFont(htmlHeads, fontSpec));
  };

  missingUsedFonts = () => {
    return this.usedFonts
      .filter(
        (f) =>
          f.fontType === "local" && !this._availLocalFonts.has(f.fontFamily)
      )
      .map((f) => f.fontFamily);
  };

  useFont = (studioCtx: StudioCtx, fontFamily: string) => {
    fontFamily = derefTokenRefs(
      allStyleTokens(studioCtx.site, { includeDeps: "all" }),
      fontFamily
    );
    if (this.usedFonts.find((fs) => fs.fontFamily === fontFamily)) {
      // already installed
      return;
    }
    const installSpec = getFontSpec(fontFamily);
    this.usedFonts.push(installSpec);
    this.installFont(
      studioCtx.viewCtxs.map((vc) => vc.canvasCtx.$head()),
      installSpec
    );
    if (installSpec.fontType === "local") {
      // This is mostly used by paste from Figma, where fonts are not added
      // to UserManagedFont list.
      spawn(
        asyncTestFonts([installSpec.fontFamily]).then((avails) => {
          if (avails.length === 1) {
            this._availLocalFonts.add(installSpec.fontFamily);
          }
        })
      );
    }
    // Install font globally for style tokens.
    this.installFont([$(document.head)], installSpec);
  };

  installDepFonts(studioCtx: StudioCtx, dep: ProjectDependency) {
    const usages = extractUsedFontsFromComponents(
      dep.site,
      dep.site.components
    );
    for (const usage of usages) {
      this.useFont(studioCtx, usage.fontFamily);
    }
  }
}

const asyncTestFonts = async (fontsToTest: string[]) => {
  const f = document["fonts"];
  const testFontSpec = `12px ${plasmicTestFont}`;
  if (!f || f.check(testFontSpec)) {
    return fontsToTest.filter(isLocalFontAvailable);
  } else {
    await f.load(testFontSpec);
    return fontsToTest.filter(isLocalFontAvailable);
  }
};

const isLocalFontAvailable = (localFont: string) => {
  const $fontTester = $(".fontTester");
  const initialWidth = $fontTester.width();

  $fontTester.css("font-family", `"${localFont}", "${plasmicTestFont}"`);
  const newWidth = $fontTester.width();
  $fontTester.css("font-family", `"${plasmicTestFont}"`);

  const r = newWidth !== initialWidth;
  return r;
};

function toGoogleFontInstallSpec(meta: GoogFontMeta): GoogleFontInstallSpec {
  return {
    fontType: "google-font",
    fontFamily: meta.family,
    variants: meta.variants.map((s) => {
      return {
        italic: s.includes("italic"),
        weight: s.includes("100")
          ? 100
          : s.includes("200")
          ? 200
          : s.includes("300")
          ? 300
          : s.includes("500")
          ? 500
          : s.includes("600")
          ? 600
          : s.includes("700")
          ? 700
          : s.includes("800")
          ? 800
          : s.includes("900")
          ? 900
          : s.includes("regular") || s.includes("italic")
          ? 400
          : unexpected(),
      };
    }),
  };
}

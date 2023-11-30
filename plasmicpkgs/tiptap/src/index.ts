import { registerBold } from "./registerBold";
import { registerCode } from "./registerCode";
import { registerItalic } from "./registerItalic";
import { registerLink } from "./registerLink";
import { registerMention } from "./registerMention";
import { registerStrike } from "./registerStrike";
import { registerTiptap } from "./registerTiptap";
import { registerUnderline } from "./registerUnderline";
import { registerToolbarBold } from "./toolbar/registerToolbarBold";
import { registerToolbarCode } from "./toolbar/registerToolbarCode";
import { registerToolbarItalic } from "./toolbar/registerToolbarItalic";
import { registerToolbarLink } from "./toolbar/registerToolbarLink";
import { registerToolbarMention } from "./toolbar/registerToolbarMention";
import { registerToolbarStrike } from "./toolbar/registerToolbarStrike";
import { registerToolbarUnderline } from "./toolbar/registerToolbarUnderline";
import { Registerable } from "./utils";

export function registerAll(loader?: Registerable) {
  registerBold(loader);
  registerCode(loader);
  registerItalic(loader);
  registerLink(loader);
  registerMention(loader);
  registerStrike(loader);
  registerTiptap(loader);
  registerUnderline(loader);
  registerToolbarBold(loader);
  registerToolbarCode(loader);
  registerToolbarItalic(loader);
  registerToolbarLink(loader);
  registerToolbarMention(loader);
  registerToolbarStrike(loader);
  registerToolbarUnderline(loader);
}

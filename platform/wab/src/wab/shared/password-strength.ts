import { zxcvbnAsync, zxcvbnOptions } from "@zxcvbn-ts/core";
import {
  adjacencyGraphs,
  dictionary as commonDictionary,
} from "@zxcvbn-ts/language-common";
import {
  dictionary as englishDictionary,
  translations,
} from "@zxcvbn-ts/language-en";
import { matcherPwnedFactory } from "@zxcvbn-ts/matcher-pwned";

const passwordStrengthOptions = {
  translations: translations,
  graphs: adjacencyGraphs,
  dictionary: {
    ...commonDictionary,
    ...englishDictionary,
  },
};

const passwordCommonWords = ["plasmic"];

const matcherPwned = matcherPwnedFactory(fetch, zxcvbnOptions);

zxcvbnOptions.addMatcher("pwnd", matcherPwned);
zxcvbnOptions.setOptions(passwordStrengthOptions);

export async function ratePasswordStrength(password: string) {
  const result = await zxcvbnAsync(password, passwordCommonWords);
  return result.score;
}

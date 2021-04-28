import Joi from "joi";
import type { PlasmicOpts } from "./types";
import { promises as fs } from "fs";
import path from "upath";

function pathExists(value: string) {
  return fs
    .access(path.resolve(value))
    .then(() => value)
    .catch((error) => {
      if (error.code === "ENOENT") {
        throw new Error(
          `Path not found: ${value}. Please verify your plasmic loader config and try again.`
        );
      }
      throw new Error(
        `Could not verify that path ${value} exists. Error: ${error.message}.`
      );
    });
}

export const PlasmicOptsSchema = Joi.object<PlasmicOpts>({
  dir: Joi.string().required().external(pathExists),
  plasmicDir: Joi.string().required(),
  pageDir: Joi.string().required(),
  projects: Joi.array().items(Joi.string()).required(),
  watch: Joi.boolean().required(),
  initArgs: Joi.object().pattern(Joi.string(), Joi.string()),
  substitutions: Joi.object({
    components: Joi.array().items(
      Joi.object({
        name: Joi.string().required(),
        projectId: Joi.string(),
        path: Joi.string().required().external(pathExists),
      })
    ),
  }),
}).messages({
  "object.unknown":
    "Unknown key {{#label}}. Please verify your plasmic loader config and try again.",
});

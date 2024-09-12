import fs from "fs";
import * as path from "path";
import * as tmp from "tmp";
import {
  AUTH_FILE_NAME,
  AuthConfig,
  CONFIG_FILE_NAME,
  PlasmicConfig,
} from "../utils/config-utils";
import { deleteFileBuffered, readFileText, writeFileText } from "./file-utils";

export class TempRepo {
  tmpDir: tmp.DirResult; // Temporary directory used for tests

  constructor() {
    this.tmpDir = tmp.dirSync({ unsafeCleanup: true });
  }

  destroy() {
    this.tmpDir.removeCallback();
  }

  resolveFile(relativePath: string): string {
    return path.resolve(this.tmpDir.name, relativePath);
  }

  readFile(relativePath: string): string {
    const absPath = this.resolveFile(relativePath);
    const buf = readFileText(absPath);
    return buf.toString();
  }

  writeFile(relativePath: string, data: string) {
    const absPath = this.resolveFile(relativePath);
    writeFileText(absPath, data);
  }

  deleteFile(relativePath: string) {
    const absPath = this.resolveFile(relativePath);
    deleteFileBuffered(absPath);
  }

  checkFile(relativePath: string): boolean {
    const absPath = this.resolveFile(relativePath);
    try {
      const stats = fs.statSync(absPath);
      return !!stats ? true : false;
    } catch (e) {
      return false;
    }
  }

  readGeneratedComponentFiles(projectId: string, componentId: string) {
    const plasmicJson: PlasmicConfig = JSON.parse(
      this.readFile(CONFIG_FILE_NAME)
    );
    const componentConfig = plasmicJson.projects
      .find((p) => p.projectId === projectId)
      ?.components.find((c) => c.id === componentId);
    if (!componentConfig) {
      throw new Error();
    }

    const skeletonPath = path.join(
      plasmicJson.srcDir,
      componentConfig.importSpec.modulePath
    );
    const renderPath = path.join(
      plasmicJson.srcDir,
      componentConfig.renderModuleFilePath
    );
    const cssPath = path.join(plasmicJson.srcDir, componentConfig.cssFilePath);
    return {
      skeletonPath,
      skeleton: this.readFile(skeletonPath),
      renderPath,
      render: this.readFile(renderPath),
      cssPath,
      css: this.readFile(cssPath),
    };
  }

  plasmicAuthPath(): string {
    return this.resolveFile(AUTH_FILE_NAME);
  }

  writePlasmicAuth(json: AuthConfig) {
    this.writeFile(AUTH_FILE_NAME, JSON.stringify(json));
  }

  deletePlasmicAuth() {
    this.deleteFile(AUTH_FILE_NAME);
  }

  plasmicJsonPath(): string {
    return this.resolveFile(CONFIG_FILE_NAME);
  }

  readPlasmicJson(): PlasmicConfig {
    return JSON.parse(this.readFile(CONFIG_FILE_NAME));
  }

  writePlasmicJson(json: PlasmicConfig) {
    this.writeFile(CONFIG_FILE_NAME, JSON.stringify(json));
  }

  deletePlasmicJson() {
    this.deleteFile(CONFIG_FILE_NAME);
  }
}

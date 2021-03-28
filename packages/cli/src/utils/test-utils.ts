import fs from "fs";
import * as path from "path";
import * as tmp from "tmp";
import {
  AuthConfig,
  AUTH_FILE_NAME,
  CONFIG_FILE_NAME,
  LOADER_CONFIG_FILE_NAME,
  PlasmicConfig,
  PlasmicLoaderConfig,
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

  getComponentFileContents(
    projectId: string,
    componentId: string
  ): string | undefined {
    const plasmicJson: PlasmicConfig = JSON.parse(
      this.readFile(CONFIG_FILE_NAME)
    );
    const srcDir = plasmicJson.srcDir;
    const projectConfig = plasmicJson.projects.find(
      (p) => p.projectId === projectId
    );
    if (!projectConfig) {
      return;
    }
    const componentConfig = projectConfig.components.find(
      (c) => c.id === componentId
    );
    if (!componentConfig) {
      return;
    }
    const data = this.readFile(
      path.join(srcDir, componentConfig.renderModuleFilePath)
    );
    return data;
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

  plasmicLoaderJsonPath() {
    return this.resolveFile(LOADER_CONFIG_FILE_NAME);
  }

  readPlasmicLoaderJson(): PlasmicLoaderConfig {
    return JSON.parse(this.readFile(LOADER_CONFIG_FILE_NAME));
  }
}

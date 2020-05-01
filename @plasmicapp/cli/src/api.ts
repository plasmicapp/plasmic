import { AuthConfig } from "./utils/config-utils";
import axios, { AxiosResponse, AxiosError } from "axios";
import socketio from "socket.io-client";

export interface ComponentBundle {
  renderModule: string;
  skeletonModule: string;
  cssRules: string;
  renderModuleFileName: string;
  skeletonModuleFileName: string;
  cssFileName: string;
  componentName: string;
  id: string;
}

export interface GlobalVariantBundle {
  id: string;
  name: string;
  contextModule: string;
  contextFileName: string;
}

export interface ProjectConfig {
  projectId: string;
  cssFileName: string;
  cssRules: string;
}

export interface ProjectBundle {
  components: ComponentBundle[];
  projectConfig: ProjectConfig;
  globalVariants: GlobalVariantBundle[];
  usedTokens: StyleTokensMap;
}

export interface StyleConfigResponse {
  defaultStyleCssFileName: string;
  defaultStyleCssRules: string;
}

export interface StyleTokensMap {
  props: {
    name: string;
    type: string;
    value: string | number;
    meta: {
      projectId: string;
      id: string;
    };
  }[];
  global: {
    meta: {
      source: "plasmic.app";
    };
  };
}

export class PlasmicApi {
  constructor(private auth: AuthConfig) {}

  async genStyleConfig(){
    const result = await this.post(
      `${this.auth.host}/api/v1/code/style-config`
    );
    return result.data as StyleConfigResponse;
  }

  async projectComponents(
    projectId: string,
    cliVersion: string,
    reactWebVersion: string | undefined
  ) {
    const result = await this.post(
      `${this.auth.host}/api/v1/projects/${projectId}/code/components`,
      { cliVersion, reactWebVersion: reactWebVersion || "" }
    );
    return result.data as ProjectBundle;
  }

  async projectStyleTokens(projectId: string) {
    const result = await this.post(
      `${this.auth.host}/api/v1/projects/${projectId}/code/tokens`
    );
    return result.data as StyleTokensMap;
  }

  connectSocket() {
    const socket = socketio.connect(this.auth.host, {
      path: `/api/v1/socket`,
      transportOptions: {
        polling: {
          extraHeaders: this.makeHeaders()
        }
      }
    });
    return socket;
  }

  private async post(url: string, data?: any) {
    try {
      return await axios.post(url, data, {
        headers: this.makeHeaders()
      });
    } catch (e) {
      const error = e as AxiosError;
      if (error.response && error.response.status === 403) {
        console.error(
          `Incorrect Plasmic credentials; please check your .plasmic.auth file.`
        );
        process.exit(1);
      }
      if (error.response && error.response.data) {
        if (error.response.data.error) {
          console.log(error.response.data.error.message);
        } else {
          console.log(`Error: request failed with status code ${error.response.status}. The response is
  ${error.response.data}`);
        }
        process.exit(1);
      } else {
        throw e;
      }
    }
  }

  private makeHeaders() {
    const headers: Record<string, string> = {
      "x-plasmic-api-user": this.auth.user,
      "x-plasmic-api-token": this.auth.token
    };

    if (this.auth.basicAuthUser && this.auth.basicAuthPassword) {
      const authString = Buffer.from(
        `${this.auth.basicAuthUser}:${this.auth.basicAuthPassword}`
      ).toString("base64");
      headers["Authorization"] = `Basic ${authString}`;
    }

    return headers;
  }
}

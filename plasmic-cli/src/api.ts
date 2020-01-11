import { AuthConfig } from "./config-utils";
import axios, {AxiosResponse, AxiosError} from "axios";

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

export class PlasmicApi {
  constructor(private auth: AuthConfig) {

  }

  async projectComponents(projectId: string) {
    const result = await this.post(`${this.auth.host}/api/v1/projects/${projectId}/code`);
    return result.data.results as ComponentBundle[];
  }

  private async post(url: string, data?: any) {
    try {
      return await axios.post(url, data, {
        headers: {
          "x-plasmic-api-user": this.auth.user,
          "x-plasmic-api-token": this.auth.token,
        }
      });
    } catch (e) {
      const error = e as AxiosError;
      if (error.response && error.response.status === 403) {
        console.error(`Incorrect Plasmic credentials; please check your .plasmic.auth file.`);
        process.exit(1);
      }
      throw e;
    }
  }
}
import axios from "axios";

const host = `https://studio.plasmic.app`;

export interface RequiredPackages {
  "@plasmicapp/cli": string;
  "@plasmicapp/loader": string;
  "@plasmicapp/react-web": string;
}

export async function getRequiredPackages() {
  const resp = await axios.post(`${host}/api/v1/code/required-packages`);
  return { ...resp.data } as RequiredPackages;
}

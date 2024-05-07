import {
  BASE_URL,
  CREATE_SANDBOX_URL,
  CREATE_UPLOAD_URL,
  GET_SANDBOX_URL,
  GET_USER_URL,
  verifyUserTokenUrl,
} from "@/wab/codesandbox/url";
import { ensure } from "@/wab/common";
import * as Sentry from "@sentry/node";
import axios, { AxiosRequestConfig } from "axios";
import {
  ISandbox,
  ISandboxDirectory,
  ISandboxFile,
} from "codesandbox-import-util-types";
import DatauriParser from "datauri/parser";
import { camelizeKeys, decamelizeKeys } from "humps";
import { values } from "lodash";

const callApi = async (options: AxiosRequestConfig) => {
  console.log(
    "CALLING API",
    JSON.stringify({ url: options.url, method: options.method }, undefined, 2)
  );
  try {
    const response = await axios(options);
    return response.data.data;
  } catch (e) {
    if (e.response?.data?.errors) {
      e.message = values(e.response.data.errors)[0];
    } else if (e.response?.data) {
      e.message = e.response.data;
    }
    throw e;
  }
};

export async function getSandbox(token: string, sandboxId: string) {
  const data = await callApi({
    method: "GET",
    headers: {
      AUthorization: `Bearer ${token}`,
    },
    url: `${GET_SANDBOX_URL}/${sandboxId}`,
  });
  return camelizeKeys(data);
}

export async function shareSandbox(
  token: string,
  sandboxId: string,
  email: string,
  authorization: "WRITE_CODE",
  isNewSandbox: boolean
) {
  const query = `mutation InviteCollaborator($sandboxId: ID!, $authorization: Authorization!, $email: String!) {
      createSandboxInvitation(sandboxId: $sandboxId, authorization: $authorization, email: $email) {
            ...Invitation
      }
  }

  fragment Invitation on Invitation {
    id
    authorization
    email
  }`;
  const variables = { sandboxId, email, authorization };
  const data = { query, variables };
  console.log("shareSandbox with data", JSON.stringify(data, undefined, 2));

  const result = await callApi({
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    data,
    url: `${BASE_URL}/api/graphql`,
  });

  console.log("result of shareSandbox is", result);

  const expected = {
    createSandboxInvitation: {
      authorization: "WRITE_CODE",
      email: email,
      id: null,
    },
  };
  const resultString = JSON.stringify(result);
  const expectedString = JSON.stringify(expected);
  // If this is a new sandbox, then the result should be non-null, and should match the expected structure.
  // Sharing to someone who is already on the list of invitees is expected return null, but we never expect anything other than null or the expected structure.
  if (
    (isNewSandbox && resultString !== expectedString) ||
    (!isNewSandbox && (result !== null || resultString !== expectedString))
  ) {
    Sentry.captureMessage(
      `shareSandbox got ${resultString}, ${expectedString}`
    );
  }

  return result;
}

export async function updateFileContent(
  token: string,
  sandboxId: string,
  fileId: string,
  content: string
) {
  return await callApi({
    method: "PUT",
    headers: {
      AUthorization: `Bearer ${token}`,
    },
    data: {
      module: {
        code: content,
      },
    },
    url: `${GET_SANDBOX_URL}/${sandboxId}/modules/${fileId}`,
  });
}

export async function deleteModule(
  token: string,
  sandboxId: string,
  moduleId: string
) {
  return callApi({
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    data: {},
    url: `${GET_SANDBOX_URL}/${sandboxId}/modules/${moduleId}`,
  });
}

export async function uploadContents(
  token: string,
  sandboxId: string,
  files: ISandboxFile[],
  dirs: ISandboxDirectory[]
) {
  return callApi({
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    data: decamelizeKeys({
      directoryShortid: null,
      modules: files,
      directories: dirs,
    }),
    url: `${GET_SANDBOX_URL}/${sandboxId}/modules/mcreate`,
  });
}

export async function uploadSandbox(token: string, sandbox: ISandbox) {
  const sandboxData = {
    ...decamelizeKeys(sandbox),
    from_cli: true,
  };

  const options: AxiosRequestConfig = {
    data: {
      sandbox: sandboxData,
    },
    headers: {
      Authorization: `Bearer ${token}`,
    },
    method: "POST",
    url: CREATE_SANDBOX_URL,
  };

  return callApi(options);
}

export async function fetchUser(token: string) {
  const Authorization = `Bearer ${token}`;
  const options: AxiosRequestConfig = {
    headers: {
      Authorization,
    },
    method: "GET",
    url: GET_USER_URL,
  };

  return callApi(options);
}

export async function verifyUser(token: string) {
  const options: AxiosRequestConfig = {
    method: "GET",
    url: verifyUserTokenUrl(token),
  };

  return callApi(options);
}

export async function createUpload(
  token: string,
  filename: string,
  content: string | Buffer
) {
  if (content instanceof Buffer) {
    const parser = new DatauriParser();
    parser.format(filename, content);
    content = ensure(parser.content);
  }

  const options: AxiosRequestConfig = {
    data: {
      name: filename,
      content,
    },
    headers: {
      Authorization: `Bearer ${token}`,
    },
    method: "POST",
    url: CREATE_UPLOAD_URL,
  };

  return callApi(options);
}

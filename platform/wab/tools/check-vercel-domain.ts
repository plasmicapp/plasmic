import fetch from "node-fetch";
import { getVercelSecrets } from "../src/wab/server/secrets";
import { ensureString } from "../src/wab/shared/common";

async function checkVercelDomain() {
  const domain = ensureString(process.argv[2]);
  const response = await fetch(
    `https://api.vercel.com/v6/domains/${domain}/config?teamId=${
      getVercelSecrets().teamId
    }`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${getVercelSecrets().authBearerToken}`,
        "Content-Type": "application/json",
      },
    }
  );
  const data = await response.json();
  console.log(data);
}

checkVercelDomain();

import { Request, Response } from "express-serve-static-core";
import fetch from "node-fetch";

const BIGCOMMERCE_STOREFRONT_API_URL =
  "https://store-ugtxrjy7nl-479050.mybigcommerce.com/graphql";
const BIGCOMMERCE_STOREFRONT_API_TOKEN = "21idsuhjxf8oj324rxqyw6ovq1f5q9z";
const BIGCOMMERCE_STORE_API_URL =
  "https://api.bigcommerce.com/stores/ugtxrjy7nl";
const BIGCOMMERCE_STORE_API_TOKEN =
  "eyJ0eXAiOiJKV1QiLCJhbGciOiJFUzI1NiJ9.eyJlYXQiOjE2NDA5OTUyMDAsInN1Yl90eXBlIjoyLCJ0b2tlbl90eXBlIjoxLCJjb3JzIjpbImh0dHA6Ly9sb2NhbGhvc3Q6MzAwMyJdLCJjaWQiOjQ3OTA1MCwiaWF0IjoxNjA0OTc0NTU0LCJzdWIiOiJvNmIwN2ZicWhvcjE2eWxqOWUzNzdiOG9iZ2M3cm9xIiwic2lkIjoxMDAxNDk2ODk3LCJpc3MiOiJCQyJ9.GZ40DMxueAyvdXZchPETUJGrsaddh56gQm7Hx-lC1wTrB2xTdn-LEoHwm0mg47SsS93sEFtepKf_JzO71ofFPQ";
const BIGCOMMERCE_STORE_API_CLIENT_ID = "o6b07fbqhor16ylj9e377b8obgc7roq";
const BIGCOMMERCE_CHANNEL_ID = "479050";

export async function bigCommerceGraphql(req: Request, res: Response) {
  console.log("PROXY", req.baseUrl, new URLSearchParams(req.params).toString());
  console.log("HEADERS", req.headers);

  res.header("Access-Control-Allow-Origin", "*");
  const result = await fetch(BIGCOMMERCE_STOREFRONT_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${BIGCOMMERCE_STORE_API_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(req.body),
  });
  console.log("RESULT", result.status);

  const json = await result.json();
  console.log("PAYLOAD", json);
  res.json(json);
}

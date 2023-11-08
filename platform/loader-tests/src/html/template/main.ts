import express from "express";
import http from "http";
import fetch from "node-fetch";
import process from "process";

const PORT = process.env.PORT;
const WAB_HOST = process.env.WAB_HOST;
const PROJECT_ID = process.env.PROJECT_ID;
const PROJECT_TOKEN = process.env.PROJECT_TOKEN;

async function main() {
  const app = express();
  app.set("port", PORT);

  app.get("/", async (req, res) => {
    const html = await getHtml("Home");
    return res.send(html);
  });

  app.get("/pricing", async (req, res) => {
    const html = await getHtml("Pricing");
    return res.send(html);
  });

  app.get("/cms", async (req, res) => {
    const html = await getHtml("VisualCms");
    return res.send(html);
  });

  const server = http.createServer(app);
  return server.listen(app.get("port"), () => {
    console.log(`App is running at http://localhost:${app.get("port")}`);
  });
}

async function getHtml(compName: string) {
  const resp = await fetch(
    `${WAB_HOST}/api/v1/loader/html/published/${PROJECT_ID}/${compName}?hydrate=1&embedHydrate=1`,
    {
      headers: {
        "x-plasmic-api-project-tokens": `${PROJECT_ID}:${PROJECT_TOKEN}`,
      },
    }
  );

  const { html } = await resp.json();
  return `
    <html>
      <head>
        <style type="text/css">
          html, body {
            margin: 0;
            padding: 0;
          }
        </style>
      </head>
      <body>
        ${html}
      </body>
    </html>
  `;
}

main();

const BACKEND_ONLY = process.env["PM2_BACKEND_ONLY"];
const WITH_HOSTING = process.env["PM2_WITH_HOSTING"];
const WITH_DEDICATED_CODEGEN = process.env["PM2_WITH_DEDICATED_CODEGEN"];

function getCodegenHost() {
  return WITH_DEDICATED_CODEGEN
    ? "http://localhost:3008"
    : "http://localhost:3004";
}

function getPlasmicHostingApps() {
  if (!WITH_HOSTING) {
    return [];
  }
  return [
    {
      name: "codegen-backend",
      script: "yarn",
      args: ["run-ts", "src/wab/server/codegen-backend.ts"],
      time: true,
      env: {
        BACKEND_PORT: 3008,
        CODEGEN_HOST: getCodegenHost(),
        INTEGRATIONS_HOST: "http://localhost:3003",
        REACT_APP_PUBLIC_URL: "http://localhost:3003",
      },
      node_args: ["--max-old-space-size=2000"],
      interpreter: "none",
    },
  ];
}

function getPlasmicCodegenApps() {
  if (!WITH_DEDICATED_CODEGEN) {
    return [];
  }
  return [
    {
      name: "codegen-hosting",
      cwd: "../codegen-hosting",
      exec_mode: "fork_mode",
      interpreter: "none",
      autorestart: false,
      time: true,
      node_args: ["--max-old-space-size=2000"],
      script: "yarn",
      args: ["dev"],
      env: {
        PORT: 3010,
        NEXT_PUBLIC_PLASMIC_HOST: "http://localhost:3003",
        FORCE_BABDGE: "false",
        REVALIDATE_PERIOD: 0,
        BADGE_PROJECT: "",
        BADGE_TOKEN: "",
      },
    },
  ];
}

module.exports = {
  apps: [
    {
      name: "backend",
      script: "yarn",
      args: ["backend"],
      log_date_format: "HH:mm:ss.SSS",
      env: {
        debug: 1,
        REACT_APP_DEFAULT_HOST_URL: `http://localhost:${
          process.env.HOSTSERVER_PORT || "3005"
        }/static/host.html`,
        CODEGEN_HOST: getCodegenHost(),
        SOCKET_HOST: "http://localhost:3020",
        REACT_APP_CDN_URL: "http://localhost:3003",
        REACT_APP_PUBLIC_URL: "http://localhost:3003",
        INTEGRATIONS_HOST: "http://localhost:3003",
        ENABLED_GET_EMAIL_VERIFICATION_TOKEN: true,
        DISABLE_BWRAP: "1",
        NODE_ENV: "development",
      },
      interpreter: "none",
    },
    {
      name: "socket-server",
      script: "yarn",
      args: ["socket-server"],
      wait_ready: true,
      time: true,
      env: {
        SOCKET_PORT: 3020,
      },
      node_args: ["--max-old-space-size=2000"],
      interpreter: "none",
      exec_mode: "cluster",
      instances: 1,
      merge_logs: true,
    },
    ...(BACKEND_ONLY
      ? []
      : [
          {
            name: "wab-watch-css",
            script: "yarn",
            args: ["watch-css"],
            exec_mode: "fork_mode",
            autorestart: false,
            interpreter: "none",
          },
          {
            name: "sub-watch",
            script: "yarn",
            args: ["watch"],
            cwd: "../sub",
            exec_mode: "fork_mode",
            autorestart: false,
            interpreter: "none",
          },
          {
            name: "dev-server",
            script: "yarn",
            args: ["start"],
            exec_mode: "fork_mode",
            autorestart: false,
            interpreter: "none",
          },
          {
            name: "host-server",
            script: "yarn",
            args: ["host-server"],
            exec_mode: "fork_mode",
            autorestart: false,
            interpreter: "none",
          },
          ...getPlasmicCodegenApps(),
          ...getPlasmicHostingApps(),
        ]),
  ],
};

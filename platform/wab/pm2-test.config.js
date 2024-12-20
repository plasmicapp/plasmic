module.exports = {
  apps: [
    {
      name: "host-test",
      cwd: "../host-test",
      script: "yarn",
      args: ["start"],
      log_date_format: "HH:mm:ss.SSS",
      env: {
        PORT: "3011",
      },
      interpreter: "none",
    },
  ],
};

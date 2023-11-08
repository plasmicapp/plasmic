module.exports = {
  forbidden: [
    {
      name: "no-circular",
      from: {},
      to: {
        circular: true,
      },
    },
  ],
  options: {
    exclude: {
      dynamic: true,
    },
  },
};

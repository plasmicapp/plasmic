import moment from "moment";

moment.updateLocale("en", {
  relativeTime: {
    future: (str) => (str === "Just now" ? str : `in ${str}`),
    past: (str) => (str === "Just now" ? str : `${str} ago`),
    s: "Just now",
    m: "1 minute",
    h: "1 hour",
    d: "1 day",
    M: "1 month",
    y: "1 year",
  },
});

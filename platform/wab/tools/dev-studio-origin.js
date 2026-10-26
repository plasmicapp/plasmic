module.exports =
  process.env.REACT_APP_DEV_PROXY ||
  process.env.REACT_APP_PUBLIC_URL ||
  `http://localhost:${process.env.PORT || "3003"}`;

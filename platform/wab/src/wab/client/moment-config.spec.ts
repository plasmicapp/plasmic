import moment from "moment";

describe("moment relativeTime (past)", () => {
  test("Just now", () => {
    expect(moment().subtract(10, "seconds").fromNow()).toBe("Just now");
  });
  test("1 minute ago", () => {
    expect(moment().subtract(1, "minute").fromNow()).toBe("1 minute ago");
  });
  test("2 minutes ago", () => {
    expect(moment().subtract(2, "minutes").fromNow()).toBe("2 minutes ago");
  });
  test("1 hour ago", () => {
    expect(moment().subtract(1, "hour").fromNow()).toBe("1 hour ago");
  });
  test("3 hours ago", () => {
    expect(moment().subtract(3, "hours").fromNow()).toBe("3 hours ago");
  });
  test("1 day ago", () => {
    expect(moment().subtract(1, "day").fromNow()).toBe("1 day ago");
  });
  test("4 days ago", () => {
    expect(moment().subtract(4, "days").fromNow()).toBe("4 days ago");
  });
  test("1 month ago", () => {
    expect(moment().subtract(1, "month").fromNow()).toBe("1 month ago");
  });
  test("5 months ago", () => {
    expect(moment().subtract(5, "months").fromNow()).toBe("5 months ago");
  });
  test("1 year ago", () => {
    expect(moment().subtract(1, "year").fromNow()).toBe("1 year ago");
  });
  test("6 years ago", () => {
    expect(moment().subtract(6, "years").fromNow()).toBe("6 years ago");
  });
});

describe("moment relativeTime (future)", () => {
  test("Just now", () => {
    expect(moment().add(10, "seconds").fromNow()).toBe("Just now");
  });
  test("in 1 minute", () => {
    expect(moment().add(1, "minute").fromNow()).toBe("in 1 minute");
  });
  test("in 2 minutes", () => {
    expect(moment().add(2, "minutes").fromNow()).toBe("in 2 minutes");
  });
  test("in 1 hour", () => {
    expect(moment().add(1, "hour").fromNow()).toBe("in 1 hour");
  });
  test("in 3 hours", () => {
    expect(moment().add(3, "hours").fromNow()).toBe("in 3 hours");
  });
  test("in 1 day", () => {
    expect(moment().add(1, "day").fromNow()).toBe("in 1 day");
  });
  test("in 4 days", () => {
    expect(moment().add(4, "days").fromNow()).toBe("in 4 days");
  });
  test("in 1 month", () => {
    expect(moment().add(1, "month").fromNow()).toBe("in 1 month");
  });
  test("in 5 months", () => {
    expect(moment().add(5, "months").fromNow()).toBe("in 5 months");
  });
  test("in 1 year", () => {
    expect(moment().add(1, "year").fromNow()).toBe("in 1 year");
  });
  test("in 6 years", () => {
    expect(moment().add(6, "years").fromNow()).toBe("in 6 years");
  });
});

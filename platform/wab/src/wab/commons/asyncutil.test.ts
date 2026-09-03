import { PushPullQueue } from "@/wab/commons/asyncutil";

describe("PushPullQueue", () => {
  it("delivers pushed items to pullers in order", async () => {
    const queue = new PushPullQueue<number>();
    queue.push(1);
    queue.push(2);
    expect(await queue.pull()).toBe(1);
    const pending = queue.pull();
    queue.push(3);
    expect(await pending).toBe(2);
    expect(await queue.pull()).toBe(3);
  });

  it("close resolves waiting pulls with undefined", async () => {
    const queue = new PushPullQueue<number>();
    const pending1 = queue.pull();
    const pending2 = queue.pull();
    queue.close();
    expect(await pending1).toBeUndefined();
    expect(await pending2).toBeUndefined();
  });

  it("pull after close drains buffered items, then returns undefined", async () => {
    const queue = new PushPullQueue<number>();
    queue.push(1);
    queue.close();
    expect(await queue.pull()).toBe(1);
    expect(await queue.pull()).toBeUndefined();
  });
});

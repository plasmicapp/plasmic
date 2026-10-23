/** @vitest-environment node */
import { _testonly } from "@/wab/server/routes/image";
import sharp from "sharp";

const { downscaleImage } = _testonly;

function makeImage(width: number, height: number, background = "#888888") {
  return sharp({
    create: { width, height, channels: 3, background },
  })
    .png()
    .toBuffer();
}

async function makeAnimatedGif(width: number, height: number) {
  // Frames must differ, or the GIF encoder merges them into one.
  const frames = [
    await makeImage(width, height, "#ff0000"),
    await makeImage(width, height, "#0000ff"),
  ];
  return sharp(frames, { join: { animated: true } })
    .gif()
    .toBuffer();
}

// The dimensions of the encoded image, using the frame height of animations.
async function readDims(fileBuffer: Buffer) {
  const metadata = await sharp(fileBuffer, { pages: -1 }).metadata();
  return {
    width: metadata.width,
    height: metadata.pageHeight ?? metadata.height,
  };
}

describe("downscaleImage", () => {
  it("downscales a large image", async () => {
    const { fileBuffer, dims } = await downscaleImage(
      await makeImage(5000, 4000),
    );
    expect(dims).toEqual({ width: 4096, height: 3277 });
    expect(await readDims(fileBuffer)).toEqual(dims);
  });

  it("does not downscale an image within limits", async () => {
    const { fileBuffer, dims } = await downscaleImage(
      await makeImage(4096, 4096),
    );
    expect(dims).toEqual({ width: 4096, height: 4096 });
    expect(await readDims(fileBuffer)).toEqual(dims);
  });

  it("downscales a large animation", async () => {
    const { fileBuffer, dims } = await downscaleImage(
      await makeAnimatedGif(5000, 4000),
    );
    expect(dims).toEqual({ width: 4096, height: 3277 });
    expect(await readDims(fileBuffer)).toEqual(dims);
  });

  it("does not downscale an animation within limits", async () => {
    const { fileBuffer, dims } = await downscaleImage(
      await makeAnimatedGif(4096, 4096),
    );
    expect(dims).toEqual({ width: 4096, height: 4096 });
    expect(await readDims(fileBuffer)).toEqual(dims);
  });
});

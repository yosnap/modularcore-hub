import { createCanvas } from 'canvas';

/**
 * Renders a deterministic four-quadrant PNG (red/green/blue/yellow) with `node-canvas`, used
 * as real source pixels for crop/compress tests instead of a fixture binary checked into git.
 */
export function createQuadrantImageBlob(width = 200, height = 100): Blob {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  const halfW = width / 2;
  const halfH = height / 2;

  ctx.fillStyle = '#ff0000';
  ctx.fillRect(0, 0, halfW, halfH);
  ctx.fillStyle = '#00ff00';
  ctx.fillRect(halfW, 0, halfW, halfH);
  ctx.fillStyle = '#0000ff';
  ctx.fillRect(0, halfH, halfW, halfH);
  ctx.fillStyle = '#ffff00';
  ctx.fillRect(halfW, halfH, halfW, halfH);

  const buffer = canvas.toBuffer('image/png');
  return new Blob([buffer], { type: 'image/png' });
}

/**
 * Random-noise PNG: unlike flat color blocks, noise has high entropy, so JPEG quality
 * actually changes output byte size meaningfully — needed to test compress()'s quality
 * stepping/maxBytes behavior against real encoder output.
 */
export function createNoiseImageBlob(width = 400, height = 300, seed = 1): Blob {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  const imageData = ctx.createImageData(width, height);
  let state = seed;
  const nextByte = (): number => {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state % 256;
  };
  for (let i = 0; i < imageData.data.length; i += 4) {
    imageData.data[i] = nextByte();
    imageData.data[i + 1] = nextByte();
    imageData.data[i + 2] = nextByte();
    imageData.data[i + 3] = 255;
  }
  ctx.putImageData(imageData, 0, 0);
  const buffer = canvas.toBuffer('image/png');
  return new Blob([buffer], { type: 'image/png' });
}

import sharp from "sharp";

function mean(values: number[]): number {
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function variance(values: number[], meanVal: number): number {
  return values.reduce((a, b) => a + (b - meanVal) ** 2, 0) / values.length;
}

function covariance(values1: number[], values2: number[], mean1: number, mean2: number): number {
  let sum = 0;
  for (let i = 0; i < values1.length; i++) {
    sum += (values1[i] - mean1) * (values2[i] - mean2);
  }
  return sum / values1.length;
}

/**
 * Compute SSIM between two grayscale images
 * @param buf1 Raw grayscale pixel buffer
 * @param buf2 Raw grayscale pixel buffer
 */
function ssim(buf1: Buffer, buf2: Buffer): number {
  if (buf1.length !== buf2.length) {
    throw new Error("Buffers must have the same length");
  }

  const pixels1 = Array.from(buf1);
  const pixels2 = Array.from(buf2);

  const muX = mean(pixels1);
  const muY = mean(pixels2);

  const sigmaX2 = variance(pixels1, muX);
  const sigmaY2 = variance(pixels2, muY);
  const sigmaXY = covariance(pixels1, pixels2, muX, muY);

  const L = 255; // pixel range
  const k1 = 0.01;
  const k2 = 0.03;
  const C1 = (k1 * L) ** 2;
  const C2 = (k2 * L) ** 2;

  return ((2 * muX * muY + C1) * (2 * sigmaXY + C2)) /
         ((muX ** 2 + muY ** 2 + C1) * (sigmaX2 + sigmaY2 + C2));
}

/**
 * Compare two image buffers using SSIM (Sharp handles decoding).
 */
export async function compareImagesSSIM(buf1: Buffer, buf2: Buffer): Promise<number> {
  const img1 = sharp(buf1).greyscale();
  const img2 = sharp(buf2).greyscale();

  const meta1 = await img1.metadata();
  const meta2 = await img2.metadata();

  if (meta1.width !== meta2.width || meta1.height !== meta2.height) {
    throw new Error("Images must have the same dimensions");
  }

  const raw1 = await img1.raw().toBuffer();
  const raw2 = await img2.raw().toBuffer();

  return ssim(raw1, raw2);
}

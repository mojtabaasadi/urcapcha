import sharp from "sharp";

/**
 * Convert an image to a perceptual hash (pHash).
 * Steps:
 * 1. Resize to 32x32 grayscale
 * 2. Apply DCT (Discrete Cosine Transform)
 * 3. Take top-left 8x8 of frequencies
 * 4. Build hash string based on median value
 */
export async function phash(buf: Buffer,size = 32): Promise<string> {
  // Step 1: resize + grayscale + raw pixel data
  
  const raw = await sharp(buf)
    .resize(size, size)
    .greyscale()
    .raw()
    .toBuffer();

  // Convert buffer to 2D array
  const pixels: number[][] = [];
  for (let y = 0; y < size; y++) {
    const row: number[] = [];
    for (let x = 0; x < size; x++) {
      row.push(raw[y * size + x]);
    }
    pixels.push(row);
  }

  // Step 2: 2D DCT
  function dct1d(vector: number[]): number[] {
    const N = vector.length;
    const result = new Array(N).fill(0);
    for (let k = 0; k < N; k++) {
      let sum = 0;
      for (let n = 0; n < N; n++) {
        sum +=
          vector[n] * Math.cos(((Math.PI / N) * (n + 0.5) * k));
      }
      result[k] = sum * (k === 0 ? Math.sqrt(1 / N) : Math.sqrt(2 / N));
    }
    return result;
  }

  function dct2d(matrix: number[][]): number[][] {
    const N = matrix.length;
    const temp: number[][] = [];
    for (let i = 0; i < N; i++) {
      temp.push(dct1d(matrix[i]));
    }
    const result: number[][] = [];
    for (let j = 0; j < N; j++) {
      const col = temp.map(row => row[j]);
      const colDct = dct1d(col);
      for (let i = 0; i < N; i++) {
        if (!result[i]) result[i] = [];
        result[i][j] = colDct[i];
      }
    }
    return result;
  }

  const dctMatrix = dct2d(pixels);

  // Step 3: take top-left 8x8 block (skip DC coefficient at [0][0])
  const blockSize = 8;
  const vals: number[] = [];
  for (let y = 0; y < blockSize; y++) {
    for (let x = 0; x < blockSize; x++) {
      vals.push(dctMatrix[y][x]);
    }
  }

  // Step 4: compute median (excluding DC term)
  const valsWithoutDC = vals.slice(1);
  const median =
    valsWithoutDC.sort((a, b) => a - b)[Math.floor(valsWithoutDC.length / 2)];

  // Step 5: generate hash string
  return vals.map(v => (v > median ? "1" : "0")).join("");
}

/**
 * Compute Hamming distance between two hash strings
 */
export function hammingDistance(hash1: string, hash2: string): number {
  if (hash1.length !== hash2.length) {
    throw new Error("Hashes must be the same length");
  }
  let dist = 0;
  for (let i = 0; i < hash1.length; i++) {
    if (hash1[i] !== hash2[i]) dist++;
  }
  return dist;
}

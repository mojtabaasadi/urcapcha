import sharp, { Sharp } from "sharp";
import { phash } from "./compare";
import path from "path";

const modulesPath = path.dirname(require.resolve("urcapcha")).replace('(rsc)', '')
const srcpath = path.join( modulesPath, '../src')
export const generate = async (
  targrtWidth: number = 400, targetHeight: number = 200, getImagePath?:() => Promise<sharp.SharpInput>
): Promise<{ preview: Sharp, main: Sharp, position: number, piece: Sharp, phash: string }> => {
  let src:sharp.SharpInput|null = null
  if(getImagePath){
    src = await getImagePath()
  }else{
    const picsum = `https://picsum.photos/${targrtWidth}/${targetHeight}`
    const req = await fetch(picsum)
    src = await req.arrayBuffer()
  }
  const image = await sharp(src as sharp.SharpInput);
  const main = await image.clone()
  
  if(getImagePath){
    const meta = await image.metadata()
    targetHeight = meta.height
    targrtWidth = meta.width
  }

  const pieceSize = Math.floor(targrtWidth / 4.5)

  const resizedImage = await image.resize(targrtWidth, targetHeight)

  const { channels: [r, g, b] } = await resizedImage.stats();

  const isDark = r.mean + b.mean + g.mean < (3 * 255 / 2);

  const puzzle = await sharp(`${srcpath}/puzzle_piece_${isDark ? "white" : 'black'}.png`).resize(pieceSize);
  const { info: { width, height } } = await puzzle.toBuffer({ resolveWithObject: true })

  const position = {
    left: Math.floor(Math.random() * (targrtWidth - width)),
    top: Math.floor(Math.random() * (targetHeight - height)),
  }

  const puzzleInvert = await sharp(`${srcpath}/puzzle_piece_negative_${isDark ? "white" : 'black'}.png`).resize(pieceSize);
  const puzzleBuffer = await puzzle.toBuffer()

  const edited = await resizedImage.composite([{ input: puzzleBuffer, ...position }])
  const preview = await edited.clone()


  const overlayBuffer = await puzzleInvert.toBuffer()
  const piece = await resizedImage.extract({ ...position, width, height }).composite([{
    input: overlayBuffer,
    top: 0, left: 0,
    blend: 'xor', create: { background: { r: 255, g: 255, b: 255, alpha: 0 }, width, height, channels: 4 }
  }])



  const hash = await phash(await resizedImage.toBuffer())

  return {
    preview,
    piece,
    position: position.top,
    phash: hash,
    main,
  }
}
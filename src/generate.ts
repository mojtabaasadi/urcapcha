import  sharp from "sharp";


const generate = async (targrtWidth:number=400,targetHeight:number=200)=>{
    const pieceSize = Math.floor(targrtWidth/4.5)
    const src = await fetch(`https://picsum.photos/${targrtWidth}/${targetHeight}`)
    const image = await sharp(await src.arrayBuffer());
    const resizedImage = await image.resize(targrtWidth,targetHeight)
    await resizedImage.toFile('./input.jpg')
    const {channels:[r,g,b]} = await resizedImage.stats();
    
    const isDark = r.mean + b.mean+g.mean < (3*255/2);
    const puzzle =  await sharp(`./src/puzzle_piece_${isDark ?"white":'black'}.png`).resize(pieceSize) ;
    const {info:{width,height}} = await puzzle.toBuffer({resolveWithObject:true})
    const position = {
        left:Math.floor(Math.random() * (targrtWidth - width)),
        top:Math.floor(Math.random() * (targetHeight - height)),
    }
    const puzzleInvert =  await sharp(`./src/puzzle_piece_negative_${isDark ?"white":'black'}.png`).resize(pieceSize);
    const puzzleBuffer = await puzzle.toBuffer()
    
    const edited = await resizedImage.composite([{input:puzzleBuffer,...position}]).toFile('out.jpg')

    const overlayBuffer = await puzzleInvert.toBuffer()
    const piece = await resizedImage.extract({...position,width,height}).composite([{
        input:overlayBuffer,
        top:0,left:0,
        blend:'xor',create:{background:{r: 255, g: 255, b: 255, alpha: 0},width,height,channels:4 }
    }])
    await piece.toFile('piece.png')
    console.log((await piece.toBuffer()).toString('base64'),position.top)

}

generate();
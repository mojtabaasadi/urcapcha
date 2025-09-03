import sharp from "sharp";
import { compareImagesSSIM } from "./compre";
Promise.all([sharp('input.jpg').toBuffer(),sharp('out.jpg').toBuffer()]).then(([buff1,buff2])=>{

    compareImagesSSIM(buff1,buff2).then(console.log)
})
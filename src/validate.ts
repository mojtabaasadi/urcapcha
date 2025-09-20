import sharp from "sharp";
import { hammingDistance, phash } from "./compare";

Promise.all([sharp('input.jpg').toBuffer(),sharp('sample.jpg').toBuffer()]).then(([buff1,buff2])=>{
    Promise.all([phash(buff1),phash(buff2)]).then(([hash1,hash2]) => {
        console.log( hash1,hash2);
        const distance = hammingDistance(hash1, hash2);

        console.log("Hamming Distance:", distance);
    })
    
})
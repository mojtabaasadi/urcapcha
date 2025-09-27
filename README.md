
# UrCapcha
Inpired by puzzle capcha
Customizable, basic, free puzzle capcha


## how to use:
server: example route: /api/capcha
```javascript
import {generate} from 'urcapcha'

export async function GET(req) {
  const {phash,preview,piece,position} = await generate(400,250)
  // store phash in db and generate id for it
  const save = awai db.insert({phash})
  return Response.json({
    previewImageUrl:(await preview.toBuffer()).toString('base64'),
    pieceImageUrl:(await res.piece.png().toBuffer()).toString('base64'),
    position:res.position,
    id:save.id,
  })
}

//verify in post method
export async function POST(req) {
  const body = await req.json()
  const bfr = Buffer.from(body.image.split(",")[1],'base64')
  // get saved data fro mdb
  const hash1 = await db.get({id:body.id})
  
  const input = await phash(bfr)
  const comparison = compare(hash1,input)
  return Response.json({
    verified: comparison <= 2,
    validation_code:hash1.code
  })
}
```
client:
```javascript
import {UrCapchaComp} from 'urcapcha/client'

<UrCapchaComp endpoint="/api/capcha" label="test" />
```



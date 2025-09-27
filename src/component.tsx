import * as React from 'react';
import { toJpeg } from '@jpinsonneau/html-to-image';
import { useState, useRef } from 'react';
import { load } from '@fingerprintjs/botd'
import './component.css'


const generateReableBase64 = (base64: string, type: File['type'] = 'image/jpg') => {
  return `data:${type};base64,${base64}`
}


const getImagesize = (base64Img: string, type: File['type'] = 'image/jpg'): Promise<{ width: number, height: number }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.width, height: img.height })
    }
    img.src = generateReableBase64(base64Img, type);
  })
}

interface UrCapchaCompProps {
  endpoint: string,
  label: string,
  description?: string,
  onValidated?: (code: string) => void
}

interface ImageData {
  previewImageUrl: string,
  pieceImageUrl: string,
  position: number,
  id:number|string
}

const debounce = (callback: (...args: Array<any>) => void, wait: number) => {
  let timeoutId: number | undefined = undefined;
  return (...args: Array<any>) => {
    window.clearTimeout(timeoutId);
    timeoutId = window.setTimeout(() => {
      callback(...args);
    }, wait);
  };
}


export const UrCapchaComp = (props: UrCapchaCompProps) => {
  const { endpoint, label, description = "با تغییر موقعیت دستگیره پایین پازل را حل کنید",
    onValidated
  } = props
  const [data, setData] = useState<ImageData | undefined>()
  const [verified, setVerifed] = useState<string | undefined|false>()
  const [loading, setLoading] = useState(false)
  
  const [error, setError] = useState('')
  const [placement, setPlacement] = useState(0)
  
  const previewSize = useRef({ width: 0, height: 0 })
  const pieceSize = useRef({ width: 0, height: 0 })
  const checkboxRef = useRef<HTMLInputElement | null>(null)
  const puzzleRef = useRef(null)
  
  const {current:verify} = useRef(debounce(() => {
    setError('')
    if (puzzleRef.current && data?.id)
      toJpeg(puzzleRef.current, { width: 400, height: 250 }).then(res => fetch(endpoint, {
        method: 'post',
        body: JSON.stringify({ image: res,id:data.id }), 
        headers: { 'Content-Type': 'application/json' }
      })).then(req => req.json()).then((res: {
        verified: boolean,
        validation_code: string
      }) => {
        if (res.verified) {
          setVerifed(res.validation_code)
          onValidated?.(res.validation_code)
          hide()
        } else {
          setError('انگار پازل رو به درستی حل نکردی')
        }
      });

  }, 3000))

  const checkBot = async () => {
    const botd = await load()
    const res = await botd.detect()
    if(res.bot){ setVerifed(false)
      return true
    } return false
  }


  const getImage = () => {
    setError('')
    fetch(endpoint).then(response => response.json()).then((res: ImageData) => {
      Promise.all([
        getImagesize(res.previewImageUrl),
        getImagesize(res.pieceImageUrl, 'image/png')
      ]).then(([preview, piece]) => {
        previewSize.current = preview
        pieceSize.current = piece
      }).finally(() => {
        setLoading(false)
        setData(res)
        show()
      })
    }).catch((err) => {
      if (err?.data?.message ?? err?.message)
        setError(err?.data?.message ?? err?.message)
    }).finally(() => {
      setLoading(false)
    })
  }

  const hide = () => {
    if (checkboxRef.current) {
      checkboxRef.current.checked = false
    }
  }
  
  const show = () => {
    if (checkboxRef.current) {
      checkboxRef.current.checked = true
    }
  }

  const start = ()=>{
    setLoading(true)
    setVerifed(undefined)
    checkBot().then((isBot) => {
      if(!isBot)
      getImage()
    })
  }

  return <div style={{transform:previewSize.current.width?`scale(${300 / previewSize.current.width})`:''}}>
    <input ref={checkboxRef} type="checkbox" name="" id="urcapcha" disabled={loading} />
    <div className="puzzle">
      <div className="main">
        {loading ? <span className='loader'></span> : <label
          onClick={() => {
            if (!data?.pieceImageUrl) start()
          }} htmlFor={!verified ? "urcapcha" : undefined} className={"box" + (verified ? ' verified' : '')}>
          {verified && <span className="check">
            ✓
          </span>}
          {verified === false && <span className="cros">
            ⛌
          </span>}

        </label>}

        <div className="label">
          <label htmlFor="urcapcha"><strong>{label}</strong></label>
          {description && <small>{description}</small>}
        </div>
      </div>
      <div className="control">
        <button onClick={start} disabled={loading}>⟳</button>
        <button onClick={hide} disabled={loading}>⛌</button>
      </div>
      <div className={`puzzle-inner ${loading ? 'loading' : ''}`} ref={puzzleRef}
        style={{ width: previewSize.current.width, height: previewSize.current.height }}>
        {data?.previewImageUrl && <img className='preview'
          src={generateReableBase64(data?.previewImageUrl, 'image/jpg')}
          alt="puzzleimage" />}
        {data?.pieceImageUrl && <img className='piece'
          src={generateReableBase64(data?.pieceImageUrl, 'image/png')}
          alt="puzzlepiece"
          style={{ top: data?.position, right: pieceSize.current.width?
            `calc(${placement}/100 * (100% - ${pieceSize.current.width}px))`:0 }}
        />}
      </div>
      {error && <small className='error'>{error}</small>}
      <input
        type="range"
        name="range-cap"
        min="0"
        max="100"
        value={placement}
        step="1"
        className={`handle ${loading && 'loading'}`}
        width="100%" onChange={e => {
          setPlacement(Number(e.target.value))
          verify()
        }} />

    </div>
    <input type="hidden" name="urcapcha-validation" defaultValue={verified||''} />
  </div>
}

export default UrCapchaComp
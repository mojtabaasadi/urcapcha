import { toJpeg } from '@jpinsonneau/html-to-image';
import  { useEffect, useState,useRef } from 'react';
import * as React from 'react';


interface UrCapchaCompProps {
  endpoint: string,
  label:string
}

interface ImageData {
  previewImageUrl: string,
  pieceImageUrl: string,
  position:number,
}

const debounce = (callback:(...args:Array<any>)=>void, wait:number) => {
  let timeoutId:number|undefined = undefined;
  return (...args:Array<any>) => {
    window.clearTimeout(timeoutId);
    timeoutId = window.setTimeout(() => {
      callback(...args);
    }, wait);
  };
}

export const UrCapchaComp = (props: UrCapchaCompProps) => {
  const { endpoint,label } = props

  const [data, setData] = useState<ImageData | undefined>()
  const [showPuzzle,setShowPuzzle] = useState(false)
  const [verified,setVerifed] = useState<string|undefined>()
  
  const puzzleRef = useRef(null)

  const verify = useRef(debounce(() => {
    if(puzzleRef.current)
    toJpeg(puzzleRef.current).then(console.log);

  }, 2000))

  useEffect(() => {
    fetch(endpoint).then(response => response.json()).then(setData)
  }, [])

  const onDragStart = console.log

  return <div>
    <input  onClick={() => {
      setShowPuzzle(prev=>!prev)
    }} type="checkbox" name="" id="urcapcha" />
    <label htmlFor="urcapcha">{label}</label>
    <input type="hidden" name="urcapcha-validation" value={verified} />
    <div className="puzzle">
      <div className="puzzle-inner" ref={puzzleRef}>
        <img src={"data:image/jpg;base64,"+data?.previewImageUrl} alt="puzzleimage" />
        <img src={'data:image/png;base64,'+data?.pieceImageUrl} alt="puzzlepiece" style={{top:data?.position}} />
      </div>
      <div onDragStart={onDragStart} className="handle"></div>
    </div>
  </div>
}

export default UrCapchaComp
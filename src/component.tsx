import * as React from 'react';
import { toJpeg } from '@jpinsonneau/html-to-image';
import { useState, useRef, useCallback, useMemo } from 'react';
import { load } from '@fingerprintjs/botd';
import styled, { keyframes,StyleSheetManager, css } from 'styled-components';


function shouldForwardProp(propName: string, target: any) {
  if (typeof target === "string") {
    return !propName.startsWith('is')
  }
  return true;
}

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
  id: number | string
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

// Keyframes for animations
const rotate = keyframes`
  100% {
    transform: rotate(360deg);
  }
`;

const prixClipFix = keyframes`
  0% {
    clip-path: polygon(50% 50%, 0 0, 0 0, 0 0, 0 0, 0 0);
  }
  25% {
    clip-path: polygon(50% 50%, 0 0, 100% 0, 100% 0, 100% 0, 100% 0);
  }
  50% {
    clip-path: polygon(50% 50%, 0 0, 100% 0, 100% 100%, 100% 100%, 100% 100%);
  }
  75% {
    clip-path: polygon(50% 50%, 0 0, 100% 0, 100% 100%, 0 100%, 0 100%);
  }
  100% {
    clip-path: polygon(50% 50%, 0 0, 100% 0, 100% 100%, 0 100%, 0 0);
  }
`;

// Styled Components
const Container = styled.div<{ scale: number }>`
  transform: ${props => props.scale ? `scale(${props.scale})` : ''};
`;

const HiddenCheckbox = styled.input`
  display: none;
`;

const PuzzleContainer = styled.div<{ isChecked: boolean }>`
  background-color: beige;
  padding: 1rem;
  border-radius: 1rem;
  text-align: center;
  min-width: 300px;
  position: ${props => props.isChecked ? 'fixed' : 'relative'};
  
  ${props => props.isChecked && css`
    transform: translate(50%, -50%);
    inset-block-start: -50%;
    inset-inline-start: 50%;
    z-index: 4;
  `}
`;

const PuzzleInner = styled.div<{ isChecked: boolean; isLoading: boolean; width?: number; height?: number }>`
  width: 100%;
  transition: all 0.5s ease-in-out;
  overflow: hidden;
  position: relative;
  width: ${props => props.width ? `${props.width}px` : '100%'};
  height: ${props => props.height ? `${props.height}px` : 'auto'};
  
  ${props => (!props.isChecked || props.isLoading) && css`
    height: 0 !important;
  `}
`;

const MainSection = styled.div<{ isChecked: boolean }>`
  display: flex;
  gap: 1rem;
  
  ${props => props.isChecked && css`
    margin-block-end: 1rem;
  `}
`;

const Checkbox = styled.label`
  width: 40px;
  height: 40px;
  display: inline-block;
  border-radius: 2px;
  border: 1px solid gray;
  background-color: white;
  margin-inline-end: 1rem;
  cursor: pointer;
  
  
`;

const StatusIcon = styled.span<{ type: 'check' | 'cross' }>`
  font-weight: 1200;
  color: ${props => props.type === 'check' ? 'green' : 'red'};
  font-size: xx-large;
`;

const LabelContainer = styled.div`
  text-align: start;
  display: flex;
  flex-direction: column;
`;

const ControlButtons = styled.div`
  position: absolute;
  top: 10px;
  gap: 5px;
  display: flex;
  inset-inline-end: 10px;
  
  button:first-child {
    font-size: x-large;
  }
`;

const ControlButton = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.25rem;
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const PreviewImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const PieceImage = styled.img<{ top: number; right: string }>`
  position: absolute;
  top: ${props => props.top}px;
  right: ${props => props.right};
  -webkit-filter: drop-shadow(5px 5px 5px #757575);
  filter: drop-shadow(5px 5px 5px #757575);
`;

const SliderHandle = styled.input<{ isLoading: boolean,isChecked: boolean }>`
  -webkit-appearance: none;
  margin-block-start: 1rem;
  background: transparent;
  width: 100%;
  
  ${props => (props.isLoading || !props.isChecked) && css`
    display: none;
  `}
  
  /* Webkit styles */
  &::-webkit-slider-runnable-track {
    width: 100%;
    height: 5px;
    border: none;
    border-radius: 3px;
  }
  
  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    border: none;
    height: 16px;
    width: 88px;
    border-radius: 50%;
  }
  
  &:focus {
    outline: none;
    
    &::-webkit-slider-runnable-track {
      background: transparent;
    }
  }
  
  /* Firefox styles */
  &::-moz-range-track {
    width: 100%;
    height: 5px;
    border: none;
    border-radius: 3px;
  }
  
  &::-moz-range-thumb {
    border: none;
    height: 16px;
    width: 88px;
    border-radius: 8px;
    background: goldenrod;
  }
  
  &:-moz-focusring {
    outline: 1px solid transparent;
    outline-offset: -1px;
  }
  
  &:focus::-moz-range-track {
    background: transparent;
  }
  
  /* IE styles */
  &::-ms-track {
    width: 100%;
    height: 5px;
    background: transparent;
    border-color: transparent;
    border-width: 6px 0;
    color: transparent;
  }
  
  &::-ms-fill-lower {
    background: transparent;
    border-radius: 10px;
  }
  
  &::-ms-fill-upper {
    background: transparent;
    border-radius: 10px;
  }
  
  &::-ms-thumb {
    border: none;
    height: 16px;
    width: 88px;
    border-radius: 8px;
  }
  
  &:focus::-ms-fill-lower {
    background: transparent;
  }
  
  &:focus::-ms-fill-upper {
    background: transparent;
  }
`;

const Loader = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  position: relative;
  animation: ${rotate} 1s linear infinite;
  display: inline-block;
  min-width: 40px;
  
  &::before {
    content: "";
    box-sizing: border-box;
    position: absolute;
    inset: 0px;
    border-radius: 50%;
    border: 5px solid goldenrod;
    animation: ${prixClipFix} 2s linear infinite;
  }
`;

const ErrorMessage = styled.small`
  color: rgb(129, 35, 35);
`;

const HiddenInput = styled.input`
  display: none;
`;



export const UrCapchaComp = React.memo((props: UrCapchaCompProps) => {
  const { endpoint, label, description = "با تغییر موقعیت دستگیره پایین پازل را حل کنید", onValidated } = props;
  const [data, setData] = useState<ImageData | undefined>();
  const [verified, setVerifed] = useState<string | undefined | false>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [placement, setPlacement] = useState(0);
  const [isChecked, setIsChecked] = useState(false);
  
  const previewSize = useRef({ width: 0, height: 0 });
  const pieceSize = useRef({ width: 0, height: 0 });
  const checkboxRef = useRef<HTMLInputElement | null>(null);
  const puzzleRef = useRef<HTMLDivElement | null>(null);
  
  const verify = useCallback(debounce((verificationId: number | string) => {
    if (puzzleRef.current && verificationId) {
      setError('');
      toJpeg(puzzleRef.current, { width: 400, height: 250 }).then(res => fetch(endpoint, {
        method: 'post',
        body: JSON.stringify({ image: res, id: verificationId }),
        headers: { 'Content-Type': 'application/json' }
      })).then(req => req.json()).then((res: {
        verified: boolean,
        validation_code: string
      }) => {
        if (res.verified) {
          setVerifed(res.validation_code);
          onValidated?.(res.validation_code);
          hide();
        } else {
          setError('انگار پازل رو به درستی حل نکردی');
        }
      });
    }
  }, 3000), [endpoint, onValidated]);

  const checkBot = useCallback(async () => {
    const botd = await load();
    const res = await botd.detect();
    if (res.bot) {
      setVerifed(false);
      return true;
    }
    return false;
  }, []);

  const getImage = useCallback(() => {
    setError('');
    fetch(endpoint).then(response => response.json()).then((res: ImageData) => {
      Promise.all([
        getImagesize(res.previewImageUrl),
        getImagesize(res.pieceImageUrl, 'image/png')
      ]).then(([preview, piece]) => {
        previewSize.current = preview;
        pieceSize.current = piece;
      }).finally(() => {
        setLoading(false);
        setData(res);
        show();
      });
    }).catch((err) => {
      if (err?.data?.message ?? err?.message)
        setError(err?.data?.message ?? err?.message);
    }).finally(() => {
      setLoading(false);
    });
  }, [endpoint]);

  const hide = useCallback(() => {
    setIsChecked(false);
    if (checkboxRef.current) {
      checkboxRef.current.checked = false;
    }
  }, []);

  const show = useCallback(() => {
    setIsChecked(true);
    if (checkboxRef.current) {
      checkboxRef.current.checked = true;
    }
  }, []);

  const start = useCallback(() => {
    setLoading(true);
    setVerifed(undefined);
    checkBot().then((isBot) => {
      if (!isBot)
        getImage();
    });
  }, [checkBot, getImage]);

  const handlePlacementChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setPlacement(Number(e.target.value));
    verify(data?.id);
  }, [data?.id, verify]);

  const handleCheckboxChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setIsChecked(e.target.checked);
  }, []);

  const scale = useMemo(() => {
    return previewSize.current.width ? 300 / previewSize.current.width : 0;
  }, [previewSize.current.width]);

  const pieceRightPosition = useMemo(() => {
    return pieceSize.current.width ? `calc(${placement}/100 * (100% - ${pieceSize.current.width}px))` : '0';
  }, [placement, pieceSize.current.width]);

  return (<StyleSheetManager shouldForwardProp={shouldForwardProp}>
    <Container scale={scale}>
      <HiddenCheckbox
        ref={checkboxRef}
        type="checkbox"
        name=""
        id="urcapcha"
        disabled={loading}
        onChange={handleCheckboxChange}
      />
      <PuzzleContainer isChecked={isChecked}>
        <MainSection isChecked={isChecked}>
          {loading ? (
            <Loader />
          ) : (
            <Checkbox
              onClick={() => {
                if (!data?.pieceImageUrl) start();
              }}
              htmlFor={!verified ? "urcapcha" : undefined}
            >
              {verified && <StatusIcon type="check">✓</StatusIcon>}
              {verified === false && <StatusIcon type="cross">⛌</StatusIcon>}
            </Checkbox>
          )}

          <LabelContainer>
            <label htmlFor="urcapcha"><strong>{label}</strong></label>
            {description && <small>{description}</small>}
          </LabelContainer>
        </MainSection>

        <ControlButtons>
          <ControlButton onClick={start} disabled={loading}>⟳</ControlButton>
          <ControlButton onClick={hide} disabled={loading}>⛌</ControlButton>
        </ControlButtons>

        <PuzzleInner
          ref={puzzleRef}
          isChecked={isChecked}
          isLoading={loading}
          width={previewSize.current.width}
          height={previewSize.current.height}
        >
          {data?.previewImageUrl && (
            <PreviewImage
              src={generateReableBase64(data?.previewImageUrl, 'image/jpg')}
              alt="puzzleimage"
            />
          )}
          {data?.pieceImageUrl && (
            <PieceImage
              src={generateReableBase64(data?.pieceImageUrl, 'image/png')}
              alt="puzzlepiece"
              top={data?.position || 0}
              right={pieceRightPosition}
            />
          )}
        </PuzzleInner>

        {error && <ErrorMessage>{error}</ErrorMessage>}

        <SliderHandle
          type="range"
          name="range-cap"
          min="0"
          max="100"
          value={placement}
          step="1"
          isLoading={loading}
          isChecked={isChecked}
          onChange={handlePlacementChange}
        />
      </PuzzleContainer>
      <HiddenInput type="hidden" name="urcapcha-validation" defaultValue={verified || ''} />
    </Container>
  </StyleSheetManager>
  );
});

UrCapchaComp.displayName = 'UrCapchaComp';

export default UrCapchaComp;
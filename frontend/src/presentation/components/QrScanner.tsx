import { useCallback, useEffect, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";
import { BrowserQRCodeReader } from "@zxing/browser";
import type { IScannerControls } from "@zxing/browser";
import { BarcodeFormat, BarcodeScanner } from "@capacitor-mlkit/barcode-scanning";
import { preparePlateOcr, recognizePlateFromImage } from "@/application/services/plate-ocr.service";
import { Button } from "@/presentation/ui/button";
import { CameraOff, Flashlight, FlashlightOff, Loader2, ScanLine } from "lucide-react";

type CameraTrackCapabilities = MediaTrackCapabilities & {
  focusMode?: string[];
  torch?: boolean;
};

type CameraTrackConstraintSet = MediaTrackConstraintSet & {
  focusMode?: ConstrainDOMString;
  torch?: ConstrainBoolean;
};

type CameraTrackConstraints = Omit<MediaTrackConstraints, "advanced"> & {
  advanced?: CameraTrackConstraintSet[];
};

interface QrScannerProps {
  onDecode: (text: string) => void;
  active: boolean;
  onRecognizePlate?: (imageBase64: string) => Promise<boolean>;
}

export function QrScanner(props: QrScannerProps) {
  if (Capacitor.isNativePlatform()
    && (!props.onRecognizePlate || !navigator.mediaDevices?.getUserMedia)) {
    return <NativeQrScanner {...props} />;
  }
  return <WebQrScanner {...props} />;
}

function NativeQrScanner({ onDecode, active, onRecognizePlate }: QrScannerProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const onDecodeRef = useRef(onDecode);

  useEffect(() => {
    onDecodeRef.current = onDecode;
  }, [onDecode]);

  const scanQr = async () => {
    if (!active || busy) return;
    setError(null);
    setBusy(true);
    try {
      const { camera } = await BarcodeScanner.requestPermissions();
      if (camera !== "granted" && camera !== "limited") {
        setError("Necesitas darle permiso de cámara a la app para escanear.");
        return;
      }

      const result = await BarcodeScanner.scan({ formats: [BarcodeFormat.QrCode] });
      const value = result.barcodes[0]?.rawValue;
      if (value) onDecodeRef.current(value);
    } catch {
      setError("No se pudo leer el código QR. Revisa los permisos de cámara e inténtalo de nuevo.");
    } finally {
      setBusy(false);
    }
  };

  const capturePlate = async () => {
    if (!active || busy) return;
    setError(null);
    setBusy(true);
    try {
      await preparePlateOcr();
      const photo = await Camera.getPhoto({
        quality: 90,
        resultType: CameraResultType.Uri,
        source: CameraSource.Camera,
        correctOrientation: true,
        width: 1600,
      });
      if (!photo.webPath) throw new Error("La cámara no devolvió una imagen.");

      const response = await fetch(photo.webPath);
      if (!response.ok) throw new Error("No se pudo cargar la imagen capturada.");
      const plate = await recognizePlateFromImage(await response.blob());
      if (plate) {
        onDecodeRef.current(plate);
      } else {
        setError("No se encontró una placa colombiana. Acércate a la placa e inténtalo de nuevo.");
      }
    } catch {
      setError("No se pudo capturar o leer la placa. Revisa los permisos e inténtalo de nuevo.");
    } finally {
      setBusy(false);
    }
  };

  const captureAiPlate = async () => {
    if (!active || busy || !onRecognizePlate) return;
    setError(null);
    setBusy(true);
    try {
      const photo = await Camera.getPhoto({
        quality: 75,
        resultType: CameraResultType.Uri,
        source: CameraSource.Camera,
        correctOrientation: true,
        width: 800,
      });
      if (!photo.webPath) throw new Error("La cámara no devolvió una imagen.");
      const response = await fetch(photo.webPath);
      if (!response.ok) throw new Error("No se pudo cargar la imagen capturada.");
      const dataUrl = await response.blob().then((blob) => new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => typeof reader.result === "string"
          ? resolve(reader.result.split(",")[1] ?? "")
          : reject(new Error("No se pudo convertir la imagen."));
        reader.onerror = () => reject(new Error("No se pudo convertir la imagen."));
        reader.readAsDataURL(blob);
      }));
      await onRecognizePlate(dataUrl);
    } catch {
      setError("No se pudo analizar la placa con IA. Revisa la conexión e inténtalo de nuevo.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-xs flex-col items-center gap-3 rounded-2xl bg-muted p-6 text-center">
      {error ? (
        <>
          <CameraOff className="h-8 w-8 text-muted-foreground" />
          <p role="status" className="text-sm text-destructive">{error}</p>
        </>
      ) : (
        <>
          {busy ? <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /> : <ScanLine className="h-8 w-8 text-muted-foreground" />}
          <p role="status" className="text-sm text-muted-foreground">
            {busy ? "Abriendo cámara y leyendo..." : "Listo para escanear un QR o capturar una placa."}
          </p>
        </>
      )}
      <div className="grid w-full grid-cols-1 gap-2">
        <Button type="button" variant="outline" onClick={scanQr} disabled={!active || busy}>
          Escanear código QR
        </Button>
        <Button type="button" onClick={capturePlate} disabled={!active || busy}>
          Escanear placa ahora
        </Button>
        {onRecognizePlate && (
          <Button type="button" variant="outline" onClick={captureAiPlate} disabled={!active || busy}>
            Capturar ahora
          </Button>
        )}
      </div>
    </div>
  );
}

function WebQrScanner({ onDecode, active, onRecognizePlate }: QrScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const videoTrackRef = useRef<MediaStreamTrack | null>(null);
  const torchOnRef = useRef(false);
  const onDecodeRef = useRef(onDecode);
  const activeRef = useRef(active);
  const decodedRef = useRef(false);
  const ocrBusyRef = useRef(false);
  const ocrFailedRef = useRef(false);
  const localOcrEnabledRef = useRef(false);
  const ocrTimerRef = useRef<number | null>(null);
  const runOcrRef = useRef<() => Promise<void>>(async () => undefined);
  const aiTimerRef = useRef<number | null>(null);
  const aiBusyRef = useRef(false);
  const aiFailedRef = useRef(false);
  const runAiRef = useRef<() => Promise<void>>(async () => undefined);
  const recognizePlateRef = useRef(onRecognizePlate);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [ocrStatus, setOcrStatus] =
    useState<"loading" | "scanning" | "reading" | "error">("loading");
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiStatus, setAiStatus] =
    useState<"loading" | "scanning" | "reading" | "error">("loading");
  const [torchAvailable, setTorchAvailable] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [torchError, setTorchError] = useState<string | null>(null);

  useEffect(() => {
    onDecodeRef.current = onDecode;
  }, [onDecode]);

  useEffect(() => {
    recognizePlateRef.current = onRecognizePlate;
  }, [onRecognizePlate]);

  const releaseCamera = useCallback(() => {
    const stream = streamRef.current;
    const track = videoTrackRef.current;
    if (track && torchOnRef.current) {
      const torchOffConstraints: CameraTrackConstraints = {
        advanced: [{ torch: false }],
      };
      void track.applyConstraints(torchOffConstraints).catch(() => undefined);
    }

    controlsRef.current?.stop();
    controlsRef.current = null;
    stream?.getTracks().forEach((streamTrack) => streamTrack.stop());
    if (videoRef.current?.srcObject === stream) videoRef.current.srcObject = null;
    streamRef.current = null;
    videoTrackRef.current = null;
    torchOnRef.current = false;
    setTorchAvailable(false);
    setTorchOn(false);
  }, []);

  const toggleTorch = useCallback(async () => {
    const track = videoTrackRef.current;
    if (!track) return;

    const nextTorchState = !torchOnRef.current;
    const torchConstraints: CameraTrackConstraints = {
      advanced: [{ torch: nextTorchState }],
    };
    try {
      await track.applyConstraints(torchConstraints);
      torchOnRef.current = nextTorchState;
      setTorchOn(nextTorchState);
      setTorchError(null);
    } catch {
      setTorchError("No se pudo cambiar la linterna de la cámara.");
    }
  }, []);

  const runOcr = useCallback(async () => {
    if (!activeRef.current || decodedRef.current || ocrBusyRef.current) return;
    const video = videoRef.current;
    if (!video || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || !video.videoWidth) {
      ocrTimerRef.current = window.setTimeout(() => void runOcrRef.current(), 500);
      return;
    }

    ocrBusyRef.current = true;
    setOcrStatus("reading");
    try {
      const cropWidth = video.videoWidth * 0.85;
      const cropHeight = video.videoHeight * 0.45;
      const scale = Math.min(1, 1200 / cropWidth);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(cropWidth * scale);
      canvas.height = Math.round(cropHeight * scale);
      const context = canvas.getContext("2d");
      if (!context) throw new Error("No se pudo preparar el cuadro de cámara para OCR.");
      context.drawImage(
        video,
        (video.videoWidth - cropWidth) / 2,
        (video.videoHeight - cropHeight) / 2,
        cropWidth,
        cropHeight,
        0,
        0,
        canvas.width,
        canvas.height,
      );

      const plate = await recognizePlateFromImage(canvas);
      if (plate && activeRef.current && !decodedRef.current) {
        decodedRef.current = true;
        releaseCamera();
        onDecodeRef.current(plate);
        return;
      }
      setOcrStatus("scanning");
    } catch {
      ocrFailedRef.current = true;
      setOcrError("No se pudo iniciar el OCR. El escaneo QR sigue disponible.");
      setOcrStatus("error");
    } finally {
      ocrBusyRef.current = false;
      if (activeRef.current && localOcrEnabledRef.current && !decodedRef.current && !ocrFailedRef.current) {
        ocrTimerRef.current = window.setTimeout(() => void runOcrRef.current(), 1600);
      }
    }
  }, [releaseCamera]);

  useEffect(() => {
    runOcrRef.current = runOcr;
  }, [runOcr]);

  const runAiRecognition = useCallback(async () => {
    if (!activeRef.current || decodedRef.current || aiBusyRef.current || aiFailedRef.current) return;
    const video = videoRef.current;
    if (!video || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || !video.videoWidth) {
      aiTimerRef.current = window.setTimeout(() => void runAiRef.current(), 500);
      return;
    }
    const recognize = recognizePlateRef.current;
    if (!recognize) return;

    aiBusyRef.current = true;
    setAiStatus("reading");
    setAiError(null);
    try {
      const cropWidth = video.videoWidth * 0.6;
      const cropHeight = video.videoHeight * 0.35;
      const scale = Math.min(1, 640 / cropWidth);
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(cropWidth * scale));
      canvas.height = Math.max(1, Math.round(cropHeight * scale));
      const context = canvas.getContext("2d");
      if (!context) throw new Error("No se pudo preparar la imagen de cámara.");
      context.drawImage(
        video,
        (video.videoWidth - cropWidth) / 2,
        (video.videoHeight - cropHeight) / 2,
        cropWidth,
        cropHeight,
        0,
        0,
        canvas.width,
        canvas.height,
      );
      const imageBase64 = canvas.toDataURL("image/jpeg", 0.65).split(",")[1];
      if (!imageBase64) throw new Error("No se pudo comprimir la imagen.");
      const detected = await recognize(imageBase64);
      if (detected && activeRef.current && !decodedRef.current) {
        decodedRef.current = true;
        releaseCamera();
        return;
      }
      setAiStatus("scanning");
    } catch {
      aiFailedRef.current = true;
      setAiError("No se pudo analizar la placa con IA. Puedes reintentar o usar el escaneo QR.");
      setAiStatus("error");
    } finally {
      aiBusyRef.current = false;
      if (activeRef.current && !decodedRef.current && !aiFailedRef.current) {
        aiTimerRef.current = window.setTimeout(() => void runAiRef.current(), 2500);
      }
    }
  }, [releaseCamera]);

  useEffect(() => {
    runAiRef.current = runAiRecognition;
  }, [runAiRecognition]);

  useEffect(() => {
    activeRef.current = active;
    if (!active) {
      controlsRef.current?.stop();
      controlsRef.current = null;
      if (ocrTimerRef.current !== null) window.clearTimeout(ocrTimerRef.current);
      if (aiTimerRef.current !== null) window.clearTimeout(aiTimerRef.current);
      return;
    }

    let cancelled = false;
    decodedRef.current = false;
    ocrFailedRef.current = false;
    localOcrEnabledRef.current = false;
    aiFailedRef.current = false;
    setCameraError(null);
    setOcrError(null);
    setOcrStatus("loading");
    setAiError(null);
    setAiStatus("loading");
    setTorchError(null);
    const reader = new BrowserQRCodeReader();
    const videoConstraints: MediaTrackConstraints = {
      facingMode: { ideal: "environment" },
      width: { ideal: 1280 },
      height: { ideal: 720 },
    };

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: videoConstraints,
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        const track = stream.getVideoTracks()[0];
        if (!track) throw new Error("No se encontró una pista de video.");
        videoTrackRef.current = track;

        let capabilities: CameraTrackCapabilities = {};
        try {
          capabilities = track.getCapabilities();
        } catch {
          // Some Android WebViews do not expose camera capabilities.
        }
        if (capabilities.focusMode?.includes("continuous")) {
          const focusConstraints: CameraTrackConstraints = {
            advanced: [{ focusMode: "continuous" }],
          };
          try {
            await track.applyConstraints(focusConstraints);
          } catch {
            // Continue with the camera's default focus mode.
          }
        }
        setTorchAvailable("torch" in capabilities);

        const video = videoRef.current;
        if (!video) throw new Error("No se encontró el visor de cámara.");
        video.srcObject = stream;
        await video.play();
        const controls = await reader.decodeFromVideoElement(
          video,
          (result) => {
            if (result && !cancelled && !decodedRef.current) {
              decodedRef.current = true;
              releaseCamera();
              onDecodeRef.current(result.getText());
            }
          },
        );
        if (cancelled || decodedRef.current) {
          controls.stop();
          return;
        }

        controlsRef.current = controls;
        if (recognizePlateRef.current) {
          setAiStatus("scanning");
          aiTimerRef.current = window.setTimeout(() => void runAiRef.current(), 1500);
        } else {
          localOcrEnabledRef.current = true;
          void preparePlateOcr()
            .then(() => {
              if (!cancelled) {
                setOcrStatus("scanning");
                ocrTimerRef.current = window.setTimeout(() => void runOcrRef.current(), 500);
              }
            })
            .catch(() => {
              if (!cancelled) {
                ocrFailedRef.current = true;
                setOcrError("No se pudo iniciar el OCR. El escaneo QR sigue disponible.");
                setOcrStatus("error");
              }
            });
        }
      } catch {
        if (!cancelled) setCameraError("No se pudo acceder a la cámara. Revisa sus permisos.");
        releaseCamera();
      }
    };
    void startCamera();

    return () => {
      cancelled = true;
      activeRef.current = false;
      releaseCamera();
      if (ocrTimerRef.current !== null) window.clearTimeout(ocrTimerRef.current);
      if (aiTimerRef.current !== null) window.clearTimeout(aiTimerRef.current);
    };
  }, [active, releaseCamera]);

  const handleManualCapture = () => {
    ocrFailedRef.current = false;
    localOcrEnabledRef.current = true;
    setOcrError(null);
    setOcrStatus("loading");
    if (ocrTimerRef.current !== null) window.clearTimeout(ocrTimerRef.current);
    void preparePlateOcr()
      .then(() => {
        setOcrStatus("scanning");
        void runOcr();
      })
      .catch(() => {
        setOcrError("No se pudo iniciar el OCR. El escaneo QR sigue disponible.");
        setOcrStatus("error");
      });
  };

  const handleAiCapture = () => {
    if (aiTimerRef.current !== null) window.clearTimeout(aiTimerRef.current);
    aiFailedRef.current = false;
    setAiError(null);
    setAiStatus("scanning");
    void runAiRecognition();
  };

  return (
    <div className="space-y-3">
      {cameraError ? (
        <div className="flex aspect-square w-full max-w-xs flex-col items-center justify-center gap-2 rounded-2xl bg-muted p-6 text-center">
          <CameraOff className="h-8 w-8 text-muted-foreground" />
          <p role="alert" className="text-sm text-destructive">{cameraError}</p>
        </div>
      ) : (
        <div className="relative mx-auto aspect-square w-full max-w-xs overflow-hidden rounded-2xl bg-black">
          <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
          {torchAvailable && (
            <Button
              type="button"
              size="icon"
              variant="secondary"
              aria-label={torchOn ? "Apagar linterna" : "Encender linterna"}
              title={torchOn ? "Apagar linterna" : "Encender linterna"}
              onClick={() => void toggleTorch()}
              className="absolute right-3 top-3 z-10 rounded-full shadow-md"
            >
              {torchOn
                ? <FlashlightOff className="h-4 w-4" />
                : <Flashlight className="h-4 w-4" />}
            </Button>
          )}
          <div className="pointer-events-none absolute left-[20%] right-[20%] top-[32.5%] bottom-[32.5%] rounded-xl border-2 border-white/70">
            <span className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-black/60 px-2 py-1 text-xs text-white">
              Encuadra la placa aquí
            </span>
          </div>
          {onRecognizePlate && (
            <div className="absolute inset-x-2 bottom-2 rounded-md bg-black/70 px-2 py-1.5 text-center text-xs text-white">
              <p role="status" aria-live="polite" className="flex items-center justify-center gap-2">
                {aiStatus === "reading" || aiStatus === "loading"
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : <ScanLine className="h-3.5 w-3.5" />}
                {aiError ?? (aiStatus === "loading"
                  ? "Iniciando cámara..."
                  : aiStatus === "reading"
                    ? "Analizando con IA..."
                    : "Enfoca la placa dentro del recuadro...")}
              </p>
            </div>
          )}
          {torchError && (
            <p role="status" className="absolute inset-x-2 top-14 rounded bg-black/70 px-2 py-1 text-center text-xs text-white">
              {torchError}
            </p>
          )}
        </div>
      )}
      {onRecognizePlate ? (
        <>
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleAiCapture}
              disabled={!active || !!cameraError || aiStatus === "reading"}
            >
              Capturar ahora
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleManualCapture}
              disabled={!active || !!cameraError || ocrStatus === "loading" || ocrStatus === "reading"}
            >
              OCR local
            </Button>
          </div>
          {ocrError && <p role="status" className="text-center text-xs text-muted-foreground">{ocrError}</p>}
        </>
      ) : (
        <>
          <p role="status" aria-live="polite" className="flex items-center justify-center gap-2 text-center text-sm text-muted-foreground">
            {ocrStatus === "reading" || ocrStatus === "loading"
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <ScanLine className="h-4 w-4" />}
            {ocrError ?? (ocrStatus === "loading"
              ? "Iniciando lectura de placa..."
              : ocrStatus === "reading"
                ? "Analizando cuadro de cámara..."
                : "Buscando códigos QR y placas en el recuadro.")}
          </p>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleManualCapture}
            disabled={!active || !!cameraError || ocrStatus === "loading" || ocrStatus === "reading"}
          >
            Escanear placa ahora
          </Button>
        </>
      )}
    </div>
  );
}

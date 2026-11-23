import { useEffect, useState } from "react";
import QRCode from "qrcode";

interface WasherQrCodeProps {
  token: string;
  size?: number;
}

export function WasherQrCode({ token, size = 160 }: WasherQrCodeProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(token, { width: size, margin: 1 }).then((url) => {
      if (!cancelled) setDataUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [token, size]);

  if (!dataUrl) {
    return <div className="bg-muted animate-pulse rounded-md" style={{ width: size, height: size }} />;
  }

  return <img src={dataUrl} alt="Código QR del lavador" width={size} height={size} className="rounded-md" />;
}

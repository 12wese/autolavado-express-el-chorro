import { extractColombianPlateCandidate } from "@/domain/validators/vehicle-qr.validator";

type PlateOcrWorker = import("tesseract.js").Worker;

let workerPromise: Promise<PlateOcrWorker> | null = null;

async function getWorker(): Promise<PlateOcrWorker> {
  if (!workerPromise) {
    workerPromise = import("tesseract.js")
      .then(async ({ createWorker, PSM }) => {
        const worker = await createWorker("eng");
        await worker.setParameters({
          tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
          tessedit_pageseg_mode: PSM.SINGLE_LINE,
        });
        return worker;
      })
      .catch((error: unknown) => {
        workerPromise = null;
        throw error;
      });
  }

  return workerPromise;
}

export async function preparePlateOcr(): Promise<void> {
  await getWorker();
}

export async function recognizePlateFromImage(
  image: HTMLCanvasElement | Blob,
): Promise<string | null> {
  const worker = await getWorker();
  const { data } = await worker.recognize(image);
  if (data.confidence < 50) return null;
  return extractColombianPlateCandidate(data.text);
}

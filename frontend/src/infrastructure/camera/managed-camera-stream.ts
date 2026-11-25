const activeStreams = new Set<MediaStream>();
let acquisitionGeneration = 0;

export async function acquireManagedCameraStream(
  constraints: MediaStreamConstraints,
): Promise<MediaStream> {
  stopManagedCameraStreams();
  const generation = acquisitionGeneration;
  const stream = await navigator.mediaDevices.getUserMedia(constraints);
  if (generation !== acquisitionGeneration) {
    stream.getTracks().forEach((track) => track.stop());
    throw new Error("Camera request was superseded by another scanner.");
  }
  activeStreams.add(stream);
  return stream;
}

export function releaseManagedCameraStream(stream: MediaStream | null): void {
  if (!stream) return;
  activeStreams.delete(stream);
  stream.getTracks().forEach((track) => track.stop());
}

export function stopManagedCameraStreams(): void {
  acquisitionGeneration += 1;
  activeStreams.forEach((stream) => {
    stream.getTracks().forEach((track) => track.stop());
  });
  activeStreams.clear();
}

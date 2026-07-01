export async function captureClip(
  videoElement: HTMLVideoElement,
  startTime: number,
  clipDuration: number = 6
): Promise<Blob | null> {
  try {
    if (!videoElement || videoElement.readyState < 2) return null

    videoElement.currentTime = startTime
    await new Promise<void>((resolve) => {
      const onSeeked = () => {
        videoElement.removeEventListener('seeked', onSeeked)
        resolve()
      }
      videoElement.addEventListener('seeked', onSeeked)
    })

    const stream = (videoElement as any).captureStream
      ? (videoElement as any).captureStream()
      : null
    if (!stream) return null

    const chunks: Blob[] = []
    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : 'video/webm',
    })

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data)
    }

    const blob = await new Promise<Blob | null>((resolve) => {
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' })
        resolve(blob)
      }
      mediaRecorder.onerror = () => resolve(null)

      mediaRecorder.start()
      videoElement.play().catch(() => resolve(null))

      setTimeout(() => {
        videoElement.pause()
        if (mediaRecorder.state === 'recording') {
          mediaRecorder.stop()
        }
      }, clipDuration * 1000)
    })

    return blob
  } catch {
    return null
  }
}
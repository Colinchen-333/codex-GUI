import { useState, useRef, useCallback, useEffect } from 'react'

interface UseVoiceDictationOptions {
  onTranscript: (text: string) => void
  onError?: (error: string) => void
}

interface UseVoiceDictationReturn {
  isRecording: boolean
  isSupported: boolean
  startRecording: () => void
  stopRecording: () => void
}

export function useVoiceDictation({
  onTranscript,
  onError,
}: UseVoiceDictationOptions): UseVoiceDictationReturn {
  const [isRecording, setIsRecording] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)

  const isSupported = typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof MediaRecorder !== 'undefined'

  const startRecording = useCallback(async () => {
    if (!isSupported) {
      onError?.('Voice input is not supported in this environment')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
        },
      })

      streamRef.current = stream
      chunksRef.current = []

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm'

      const recorder = new MediaRecorder(stream, { mimeType })

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data)
        }
      }

      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: mimeType })

        stream.getTracks().forEach((track) => track.stop())
        streamRef.current = null

        if (blob.size < 1000) {
          onError?.('Recording too short')
          return
        }

        try {
          const text = await transcribeAudio(blob)
          if (text.trim()) {
            onTranscript(text.trim())
          }
        } catch (err) {
          onError?.(err instanceof Error ? err.message : 'Transcription failed')
        }
      }

      recorder.onerror = () => {
        setIsRecording(false)
        onError?.('Recording error')
      }

      mediaRecorderRef.current = recorder
      recorder.start(250)
      setIsRecording(true)
    } catch (err) {
      if (err instanceof DOMException && err.name === 'NotAllowedError') {
        onError?.('Microphone permission denied. Check System Settings > Privacy > Microphone.')
      } else {
        onError?.(err instanceof Error ? err.message : 'Failed to start recording')
      }
    }
  }, [isSupported, onTranscript, onError])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop()
    }
    setIsRecording(false)
  }, [])

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stop()
      }
      streamRef.current?.getTracks().forEach((track) => track.stop())
    }
  }, [])

  return { isRecording, isSupported, startRecording, stopRecording }
}

async function transcribeAudio(blob: Blob): Promise<string> {
  const formData = new FormData()
  formData.append('file', blob, 'recording.webm')
  formData.append('model', 'whisper-1')

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    throw new Error(`Transcription failed: ${response.status}`)
  }

  const data = await response.json() as { text: string }
  return data.text
}

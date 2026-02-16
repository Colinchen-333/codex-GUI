import { useState, useCallback, useRef, useEffect } from 'react'

export interface UseVoiceInputOptions {
  /** Language for speech recognition (default: 'en-US') */
  lang?: string
  /** Silence timeout in ms before auto-stopping (default: 5000) */
  silenceTimeout?: number
  /** Called when transcript is finalized */
  onResult?: (transcript: string) => void
}

export interface UseVoiceInputReturn {
  isListening: boolean
  transcript: string
  error: string | null
  startListening: () => void
  stopListening: () => void
  isSupported: boolean
}

// Web Speech API types (not available in all TS lib targets)
interface SpeechRecognitionCtor {
  new (): SpeechRecognitionInstance
}

interface SpeechRecognitionInstance extends EventTarget {
  lang: string
  interimResults: boolean
  continuous: boolean
  maxAlternatives: number
  onstart: ((this: SpeechRecognitionInstance, ev: Event) => void) | null
  onresult: ((this: SpeechRecognitionInstance, ev: SpeechRecognitionResultEvent) => void) | null
  onerror: ((this: SpeechRecognitionInstance, ev: SpeechRecognitionErrorEv) => void) | null
  onend: ((this: SpeechRecognitionInstance, ev: Event) => void) | null
  start(): void
  stop(): void
}

interface SpeechRecognitionResultEvent extends Event {
  resultIndex: number
  results: SpeechRecognitionResultList
}

interface SpeechRecognitionErrorEv extends Event {
  error: string
}

function getSpeechRecognitionConstructor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as Record<string, unknown>
  return (w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null) as SpeechRecognitionCtor | null
}

export function useVoiceInput(options: UseVoiceInputOptions = {}): UseVoiceInputReturn {
  const { lang = 'en-US', silenceTimeout = 5000, onResult } = options

  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [error, setError] = useState<string | null>(null)

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onResultRef = useRef(onResult)

  // Keep callback ref up to date without causing re-renders
  useEffect(() => {
    onResultRef.current = onResult
  }, [onResult])

  const isSupported = typeof window !== 'undefined' && getSpeechRecognitionConstructor() !== null

  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current)
      silenceTimerRef.current = null
    }
  }, [])

  const resetSilenceTimer = useCallback(() => {
    clearSilenceTimer()
    silenceTimerRef.current = setTimeout(() => {
      recognitionRef.current?.stop()
    }, silenceTimeout)
  }, [clearSilenceTimer, silenceTimeout])

  const stopListening = useCallback(() => {
    clearSilenceTimer()
    if (recognitionRef.current) {
      recognitionRef.current.stop()
    }
  }, [clearSilenceTimer])

  const startListening = useCallback(() => {
    const SpeechRecognitionCtor = getSpeechRecognitionConstructor()
    if (!SpeechRecognitionCtor) {
      setError('Voice input not supported')
      return
    }

    setError(null)
    setTranscript('')

    const recognition = new SpeechRecognitionCtor()
    recognition.lang = lang
    recognition.interimResults = true
    recognition.continuous = true
    recognition.maxAlternatives = 1

    recognition.onstart = () => {
      setIsListening(true)
      resetSilenceTimer()
    }

    recognition.onresult = (event: SpeechRecognitionResultEvent) => {
      resetSilenceTimer()

      let interim = ''
      let final = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        if (result.isFinal) {
          final += result[0].transcript
        } else {
          interim += result[0].transcript
        }
      }

      // Show interim results for real-time preview
      setTranscript(final || interim)

      if (final) {
        onResultRef.current?.(final)
      }
    }

    recognition.onerror = (event: SpeechRecognitionErrorEv) => {
      clearSilenceTimer()
      recognitionRef.current?.stop()

      switch (event.error) {
        case 'not-allowed':
          setError('Microphone permission denied')
          break
        case 'no-speech':
          // Not a real error, just silence
          break
        case 'network':
          setError('Network error during speech recognition')
          break
        case 'aborted':
          // User aborted, not an error
          break
        default:
          setError(`Speech recognition error: ${event.error}`)
      }

      setIsListening(false)
    }

    recognition.onend = () => {
      clearSilenceTimer()
      setIsListening(false)
      recognitionRef.current = null
    }

    recognitionRef.current = recognition

    try {
      recognition.start()
    } catch {
      setError('Failed to start speech recognition')
      setIsListening(false)
    }
  }, [lang, clearSilenceTimer, resetSilenceTimer])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearSilenceTimer()
      recognitionRef.current?.stop()
    }
  }, [clearSilenceTimer])

  return {
    isListening,
    transcript,
    error,
    startListening,
    stopListening,
    isSupported,
  }
}

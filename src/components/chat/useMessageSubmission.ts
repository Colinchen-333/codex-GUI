import { useCallback } from 'react'
import { serverApi, type SkillInput, type Project } from '../../lib/api'
import { log } from '../../lib/logger'
import { executeCommand } from '../../lib/commandExecutor'
import type { CommandContext } from '../../lib/commandExecutor'
import type { SingleThreadState } from '../../stores/thread'

interface UseMessageSubmissionProps {
  inputValue: string
  setInputValue: (value: string) => void
  attachedImages: string[]
  setAttachedImages: (images: string[]) => void
  inputRef: React.RefObject<HTMLTextAreaElement | null>
  projects: Project[]
  selectedProjectId: string | null
  activeThread: SingleThreadState['thread'] | null
  buildCommandContext: () => CommandContext
  sendMessage: (text: string, images?: string[], skills?: SkillInput[]) => Promise<void>
  addInfoItem: (title: string, content: string) => void
  showToast: (message: string, type: 'info' | 'error' | 'success') => void
}

export function useMessageSubmission({
  inputValue,
  setInputValue,
  attachedImages,
  setAttachedImages,
  inputRef,
  projects,
  selectedProjectId,
  activeThread,
  buildCommandContext,
  sendMessage,
  addInfoItem,
  showToast,
}: UseMessageSubmissionProps) {
  const handleSend = useCallback(async () => {
    const text = inputValue.trim()
    if (!text && attachedImages.length === 0) return

    // Preserve input state for potential restoration on error
    const preservedInput = inputValue
    const preservedImages = [...attachedImages]
    const preservedHeight = inputRef.current?.style.height

    // Clear input immediately for better UX
    setInputValue('')
    setAttachedImages([])
    if (inputRef.current) {
      inputRef.current.style.height = 'auto'
    }

    const restoreState = () => {
      setInputValue(preservedInput)
      setAttachedImages(preservedImages)
      if (inputRef.current && preservedHeight) {
        inputRef.current.style.height = preservedHeight
      }
      // Refocus input for easy retry
      requestAnimationFrame(() => {
        inputRef.current?.focus()
      })
    }

    const refocus = () => {
      requestAnimationFrame(() => {
        inputRef.current?.focus()
      })
    }

    // Check if it's a slash command
    if (text.startsWith('/')) {
      try {
        const result = await executeCommand(text, buildCommandContext())
        if (result.handled) {
          refocus()
          return
        }
      } catch (error) {
        log.error(`Failed to execute command: ${error}`, 'ChatView')
        showToast('Failed to execute command', 'error')
        restoreState()
        return
      }
    }

    // Handle ! shell command prefix (like CLI)
    if (text.startsWith('!') && text.length > 1) {
      const shellCommand = text.slice(1).trim()
      if (!shellCommand) {
        showToast('Please provide a command after !', 'error')
        restoreState()
        return
      }

      if (!activeThread) {
        showToast('No active session', 'error')
        restoreState()
        return
      }

      try {
        addInfoItem('Shell Command', `Running: ${shellCommand}`)
        await serverApi.runUserShellCommand(activeThread.id, shellCommand)
        refocus()
      } catch (error) {
        log.error(`Failed to run shell command: ${error}`, 'ChatView')
        showToast('Failed to run shell command', 'error')
        restoreState()
      }
      return
    }

    try {
      const project = projects.find((p) => p.id === selectedProjectId)

      // Detect skill mentions in the text
      const skillMentionPattern = /(?:^|[\s(])(\$([a-zA-Z][a-zA-Z0-9_-]*))(?=[\s,.):]|$)/g
      const skillMentions: string[] = []
      let match
      while ((match = skillMentionPattern.exec(text)) !== null) {
        skillMentions.push(match[2])
      }

      let skills: SkillInput[] | undefined
      if (skillMentions.length > 0 && project) {
        try {
          const response = await serverApi.listSkills([project.path], false, selectedProjectId ?? undefined)
          const allSkills = response.data.flatMap((entry) => entry.skills)
          skills = skillMentions
            .map((name) => {
              const skill = allSkills.find(
                (s) => s.name === name || s.name.toLowerCase() === name.toLowerCase()
              )
              if (skill) {
                return { name: skill.name, path: skill.path }
              }
              return null
            })
            .filter((s): s is SkillInput => s !== null)

          if (skills.length === 0) {
            skills = undefined
          }
        } catch (error) {
          log.warn(`Failed to load skills for mentions: ${error}`, 'ChatView')
        }
      }

      await sendMessage(text, attachedImages.length > 0 ? attachedImages : undefined, skills)
      refocus()
    } catch (error) {
      log.error(`Failed to send message: ${error}`, 'ChatView')
      showToast('Failed to send message. Please try again.', 'error')
      restoreState()
    }
  }, [
    inputValue,
    attachedImages,
    inputRef,
    setInputValue,
    setAttachedImages,
    buildCommandContext,
    sendMessage,
    addInfoItem,
    showToast,
    projects,
    selectedProjectId,
    activeThread,
  ])

  return { handleSend }
}

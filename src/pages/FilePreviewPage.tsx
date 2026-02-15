import { useState, useEffect, useCallback, useRef } from 'react'
import { PanelLeftClose, PanelLeft, FolderOpen, SquareTerminal, Code2, Copy, RefreshCw, File as FileIcon } from 'lucide-react'
import { projectApi } from '../lib/api'
import type { FileEntry } from '../lib/api'
import { useProjectsStore } from '../stores/projects'
import { FileTree } from '../components/files/FileTree'
import { FileViewer } from '../components/files/FileViewer'
import { cn } from '../lib/utils'
import { isTauriAvailable } from '../lib/tauri'
import { IconButton } from '../components/ui/IconButton'
import { copyTextToClipboard } from '../lib/clipboard'
import { openInTerminal, openInVSCode, revealInFinder } from '../lib/hostActions'
import { parseError } from '../lib/errorUtils'
import { useToast } from '../components/ui/Toast'

export function FilePreviewPage() {
  const { projects, selectedProjectId } = useProjectsStore()
  const selectedProject = selectedProjectId ? projects.find((p) => p.id === selectedProjectId) ?? null : null
  const tauriAvailable = isTauriAvailable()
  const { showToast } = useToast()

  const [files, setFiles] = useState<FileEntry[]>([])
  const [filesLoading, setFilesLoading] = useState(false)
  const [filesError, setFilesError] = useState<string | null>(null)

  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null)
  const [fileContent, setFileContent] = useState<string | null>(null)
  const [fileSize, setFileSize] = useState<number | undefined>(undefined)
  const [fileLoading, setFileLoading] = useState(false)
  const [fileError, setFileError] = useState<string | null>(null)

  const [sidebarOpen, setSidebarOpen] = useState(true)

  const listSeqRef = useRef(0)
  const fileSeqRef = useRef(0)

  const loadFileList = useCallback(async () => {
    if (!tauriAvailable || !selectedProject) return
    listSeqRef.current += 1
    const seq = listSeqRef.current

    setFilesLoading(true)
    setFilesError(null)

    try {
      const entries = await projectApi.listFiles(selectedProject.path, undefined, 500)
      if (seq !== listSeqRef.current) return
      setFiles(entries)
    } catch (err) {
      if (seq !== listSeqRef.current) return
      setFiles([])
      setFilesError(parseError(err))
    } finally {
      if (seq === listSeqRef.current) setFilesLoading(false)
    }
  }, [selectedProject, tauriAvailable])

  // Fetch file list when project changes
  useEffect(() => {
    if (!tauriAvailable || !selectedProject) return
    void loadFileList()
    return () => {
      listSeqRef.current += 1
    }
  }, [loadFileList, selectedProject, tauriAvailable])

  // Fetch file content when selected file changes
  const handleSelectFile = useCallback(
    (path: string) => {
      if (!tauriAvailable || !selectedProject) return
      fileSeqRef.current += 1
      const seq = fileSeqRef.current
      setSelectedFilePath(path)
      setFileContent(null)
      setFileError(null)
      setFileSize(undefined)
      setFileLoading(true)

      projectApi
        .readProjectFile(selectedProject.id, path)
        .then((bytes) => {
          if (seq !== fileSeqRef.current) return
          const decoder = new TextDecoder('utf-8', { fatal: false })
          const text = decoder.decode(new Uint8Array(bytes))
          setFileContent(text)
          setFileSize(bytes.length)
          setFileLoading(false)
        })
        .catch((err) => {
          if (seq !== fileSeqRef.current) return
          setFileError(err instanceof Error ? err.message : String(err))
          setFileLoading(false)
        })
    },
    [selectedProject, tauriAvailable]
  )

  if (!tauriAvailable) {
    return (
      <div className="flex items-center justify-center h-full text-text-3">
        <div className="text-center space-y-2">
          <p className="text-sm">Unavailable in web mode</p>
          <p className="text-xs text-text-3/70">File browsing requires the desktop app.</p>
        </div>
      </div>
    )
  }

  // No project selected
  if (!selectedProject) {
    return (
      <div className="flex items-center justify-center h-full text-text-3">
        <div className="text-center space-y-2">
          <p className="text-sm">No project selected</p>
          <p className="text-xs text-text-3/70">Select a project from the sidebar to browse files.</p>
        </div>
      </div>
    )
  }

  const selectedAbsolutePath = selectedFilePath ? `${selectedProject.path}/${selectedFilePath}` : null

  const handleCopySelectedPath = async () => {
    if (!selectedFilePath) return
    try {
      const ok = await copyTextToClipboard(selectedFilePath)
      if (!ok) throw new Error('Clipboard unavailable')
      showToast('Path copied', 'success')
    } catch {
      showToast('Copy failed', 'error')
    }
  }

  const handleOpenProjectInFinder = async () => {
    try {
      await revealInFinder(selectedProject.path)
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to reveal in Finder', 'error')
    }
  }

  const handleOpenProjectInTerminal = async () => {
    try {
      await openInTerminal(selectedProject.path)
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to open in Terminal', 'error')
    }
  }

  const handleOpenProjectInVSCode = async () => {
    try {
      await openInVSCode(selectedProject.path)
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to open in VS Code', 'error')
    }
  }

  const handleOpenSelectedInVSCode = async () => {
    if (!selectedAbsolutePath) return
    try {
      await openInVSCode(selectedAbsolutePath)
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to open file in VS Code', 'error')
    }
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* File tree sidebar */}
      <div
        className={cn(
          'shrink-0 border-r border-stroke/15 bg-surface-solid transition-[width] duration-200 overflow-hidden',
          sidebarOpen ? 'w-[260px]' : 'w-0'
        )}
      >
        {sidebarOpen && (
          <FileTree
            files={files}
            selectedPath={selectedFilePath}
            onSelectFile={handleSelectFile}
            isLoading={filesLoading}
          />
        )}
      </div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Toolbar */}
        <div className="flex items-center gap-2 px-2 py-1 border-b border-stroke/15 bg-surface-solid shrink-0">
          <button
            type="button"
            className="p-1.5 rounded-md hover:bg-hover/5 text-text-3 transition-colors"
            onClick={() => setSidebarOpen((v) => !v)}
            aria-label={sidebarOpen ? 'Hide file tree' : 'Show file tree'}
          >
            {sidebarOpen ? (
              <PanelLeftClose className="icon-sm" />
            ) : (
              <PanelLeft className="icon-sm" />
            )}
          </button>
          <span className="text-xs text-text-3 truncate">
            {selectedProject.displayName || selectedProject.path}
          </span>
          {selectedFilePath && (
            <span className="text-xs text-text-3/70 truncate">
              <span className="mx-1 text-text-3/40">/</span>
              <span className="font-mono">{selectedFilePath}</span>
            </span>
          )}
          {filesError && (
            <span className="ml-auto text-xs text-status-error truncate">{filesError}</span>
          )}
          {!filesError && <span className="ml-auto" />}
          <div className="flex items-center gap-1.5">
            <IconButton
              variant="ghost"
              size="sm"
              onClick={() => void loadFileList()}
              disabled={filesLoading}
              title="Refresh file list"
              aria-label="Refresh file list"
            >
              <RefreshCw size={14} />
            </IconButton>
            <IconButton
              variant="ghost"
              size="sm"
              onClick={() => void handleOpenProjectInFinder()}
              title="Reveal project in Finder"
              aria-label="Reveal project in Finder"
            >
              <FolderOpen size={14} />
            </IconButton>
            <IconButton
              variant="ghost"
              size="sm"
              onClick={() => void handleOpenProjectInTerminal()}
              title="Open project in Terminal"
              aria-label="Open project in Terminal"
            >
              <SquareTerminal size={14} />
            </IconButton>
            <IconButton
              variant="ghost"
              size="sm"
              onClick={() => void handleOpenProjectInVSCode()}
              title="Open project in VS Code"
              aria-label="Open project in VS Code"
            >
              <Code2 size={14} />
            </IconButton>
            <IconButton
              variant="ghost"
              size="sm"
              onClick={() => void handleOpenSelectedInVSCode()}
              disabled={!selectedAbsolutePath}
              title="Open selected file in VS Code"
              aria-label="Open selected file in VS Code"
            >
              <FileIcon size={14} />
            </IconButton>
            <IconButton
              variant="ghost"
              size="sm"
              onClick={() => void handleCopySelectedPath()}
              disabled={!selectedFilePath}
              title="Copy selected path"
              aria-label="Copy selected path"
            >
              <Copy size={14} />
            </IconButton>
          </div>
        </div>

        {/* File viewer */}
        <div className="flex-1 overflow-hidden">
          <FileViewer
            filePath={selectedFilePath}
            content={fileContent}
            fileSize={fileSize}
            isLoading={fileLoading}
            error={fileError}
          />
        </div>
      </div>
    </div>
  )
}

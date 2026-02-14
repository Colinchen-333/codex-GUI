import { useState, useEffect, useCallback } from 'react'
import { PanelLeftClose, PanelLeft } from 'lucide-react'
import { projectApi } from '../lib/api'
import type { FileEntry } from '../lib/api'
import { useProjectsStore } from '../stores/projects'
import { FileTree } from '../components/files/FileTree'
import { FileViewer } from '../components/files/FileViewer'
import { cn } from '../lib/utils'

export function FilePreviewPage() {
  const { projects, selectedProjectId } = useProjectsStore()
  const selectedProject = projects.find((p) => p.id === selectedProjectId) ?? projects[0] ?? null

  const [files, setFiles] = useState<FileEntry[]>([])
  const [filesLoading, setFilesLoading] = useState(false)
  const [filesError, setFilesError] = useState<string | null>(null)

  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null)
  const [fileContent, setFileContent] = useState<string | null>(null)
  const [fileSize, setFileSize] = useState<number | undefined>(undefined)
  const [fileLoading, setFileLoading] = useState(false)
  const [fileError, setFileError] = useState<string | null>(null)

  const [sidebarOpen, setSidebarOpen] = useState(true)

  // Fetch file list when project changes
  useEffect(() => {
    if (!selectedProject) return

    let cancelled = false
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Intentional: start loading state when effect runs
    setFilesLoading(true)
    setFilesError(null)

    projectApi
      .listFiles(selectedProject.path, undefined, 500)
      .then((entries) => {
        if (!cancelled) {
          setFiles(entries)
          setFilesLoading(false)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setFilesError(err instanceof Error ? err.message : String(err))
          setFilesLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [selectedProject])

  // Fetch file content when selected file changes
  const handleSelectFile = useCallback(
    (path: string) => {
      if (!selectedProject) return
      setSelectedFilePath(path)
      setFileContent(null)
      setFileError(null)
      setFileSize(undefined)
      setFileLoading(true)

      projectApi
        .readProjectFile(selectedProject.id, path)
        .then((bytes) => {
          const decoder = new TextDecoder('utf-8', { fatal: false })
          const text = decoder.decode(new Uint8Array(bytes))
          setFileContent(text)
          setFileSize(bytes.length)
          setFileLoading(false)
        })
        .catch((err) => {
          setFileError(err instanceof Error ? err.message : String(err))
          setFileLoading(false)
        })
    },
    [selectedProject]
  )

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
          {filesError && (
            <span className="ml-auto text-xs text-status-error truncate">{filesError}</span>
          )}
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

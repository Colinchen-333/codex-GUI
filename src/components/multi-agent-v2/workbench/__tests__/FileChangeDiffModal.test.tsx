import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FileChangeDiffModal } from '../FileChangeDiffModal'

// Mock DiffView to avoid complex rendering
vi.mock('@/components/ui/DiffView', () => ({
  DiffView: ({ diff }: { diff: { path: string } }) => (
    <div data-testid="diff-view">{diff.path}</div>
  ),
  parseDiff: () => [],
}))

// Mock useFocusTrap
vi.mock('@/hooks/useFocusTrap', () => ({
  useFocusTrap: () => ({ current: null }),
}))

describe('FileChangeDiffModal', () => {
  const mockOnClose = vi.fn()
  const defaultChanges = [
    { path: 'src/app.ts', kind: 'modify', diff: '@@ -1,3 +1,4 @@\n+new line' },
    { path: 'src/new.ts', kind: 'add' },
    { path: 'src/old.ts', kind: 'delete' },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('渲染行为', () => {
    it('当 isOpen=false 时不渲染任何内容', () => {
      render(
        <FileChangeDiffModal
          isOpen={false}
          onClose={mockOnClose}
          changes={defaultChanges}
        />
      )

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('当 isOpen=true 时渲染 Modal', () => {
      render(
        <FileChangeDiffModal
          isOpen={true}
          onClose={mockOnClose}
          changes={defaultChanges}
        />
      )

      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('显示正确的标题', () => {
      render(
        <FileChangeDiffModal
          isOpen={true}
          onClose={mockOnClose}
          changes={defaultChanges}
        />
      )

      expect(screen.getByText('文件变更详情')).toBeInTheDocument()
    })

    it('支持自定义标题', () => {
      render(
        <FileChangeDiffModal
          isOpen={true}
          onClose={mockOnClose}
          changes={defaultChanges}
          title="自定义标题"
        />
      )

      expect(screen.getByText('自定义标题')).toBeInTheDocument()
    })
  })

  describe('文件变更计数', () => {
    it('正确显示各类型文件变更计数', () => {
      render(
        <FileChangeDiffModal
          isOpen={true}
          onClose={mockOnClose}
          changes={defaultChanges}
        />
      )

      expect(screen.getByText('+1')).toBeInTheDocument()
      expect(screen.getByText('~1')).toBeInTheDocument()
      expect(screen.getByText('-1')).toBeInTheDocument()
      expect(screen.getByText('3 file(s)')).toBeInTheDocument()
    })

    it('仅显示存在的变更类型', () => {
      render(
        <FileChangeDiffModal
          isOpen={true}
          onClose={mockOnClose}
          changes={[{ path: 'test.ts', kind: 'modify' }]}
        />
      )

      expect(screen.queryByText('+0')).not.toBeInTheDocument()
      expect(screen.getByText('~1')).toBeInTheDocument()
      expect(screen.queryByText('-0')).not.toBeInTheDocument()
      expect(screen.getByText('1 file(s)')).toBeInTheDocument()
    })
  })

  describe('空状态处理', () => {
    it('当 changes 为空时显示空状态提示', () => {
      render(
        <FileChangeDiffModal
          isOpen={true}
          onClose={mockOnClose}
          changes={[]}
        />
      )

      expect(screen.getByText('没有可显示的差异内容')).toBeInTheDocument()
    })
  })

  describe('DiffView 渲染', () => {
    it('为每个变更渲染 DiffView', () => {
      render(
        <FileChangeDiffModal
          isOpen={true}
          onClose={mockOnClose}
          changes={defaultChanges}
        />
      )

      const diffViews = screen.getAllByTestId('diff-view')
      expect(diffViews).toHaveLength(3)
      expect(diffViews[0]).toHaveTextContent('src/app.ts')
      expect(diffViews[1]).toHaveTextContent('src/new.ts')
      expect(diffViews[2]).toHaveTextContent('src/old.ts')
    })
  })

  describe('关闭行为', () => {
    it('点击关闭按钮时调用 onClose', async () => {
      const user = userEvent.setup()

      render(
        <FileChangeDiffModal
          isOpen={true}
          onClose={mockOnClose}
          changes={defaultChanges}
        />
      )

      const closeButton = screen.getByLabelText('关闭')
      await user.click(closeButton)

      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })

    it('点击底部关闭按钮时调用 onClose', async () => {
      const user = userEvent.setup()

      render(
        <FileChangeDiffModal
          isOpen={true}
          onClose={mockOnClose}
          changes={defaultChanges}
        />
      )

      const closeButtons = screen.getAllByRole('button', { name: '关闭' })
      const footerCloseButton = closeButtons[1]
      await user.click(footerCloseButton)

      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })

    it('点击背景遮罩时调用 onClose', async () => {
      const user = userEvent.setup()

      render(
        <FileChangeDiffModal
          isOpen={true}
          onClose={mockOnClose}
          changes={defaultChanges}
        />
      )

      const backdropOverlay = screen.getByRole('presentation')
      await user.click(backdropOverlay)

      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })

    it('点击 Modal 内容区域时不调用 onClose', async () => {
      const user = userEvent.setup()

      render(
        <FileChangeDiffModal
          isOpen={true}
          onClose={mockOnClose}
          changes={defaultChanges}
        />
      )

      const dialog = screen.getByRole('dialog')
      await user.click(dialog)

      expect(mockOnClose).not.toHaveBeenCalled()
    })
  })

  describe('可访问性', () => {
    it('Modal 具有正确的 ARIA 属性', () => {
      render(
        <FileChangeDiffModal
          isOpen={true}
          onClose={mockOnClose}
          changes={defaultChanges}
        />
      )

      const dialog = screen.getByRole('dialog')
      expect(dialog).toHaveAttribute('aria-modal', 'true')
      expect(dialog).toHaveAttribute('aria-labelledby')
    })

    it('标题通过 aria-labelledby 关联', () => {
      render(
        <FileChangeDiffModal
          isOpen={true}
          onClose={mockOnClose}
          changes={defaultChanges}
        />
      )

      const dialog = screen.getByRole('dialog')
      const labelledById = dialog.getAttribute('aria-labelledby')
      const title = document.getElementById(labelledById!)

      expect(title).toHaveTextContent('文件变更详情')
    })

    it('关闭按钮有正确的 aria-label', () => {
      render(
        <FileChangeDiffModal
          isOpen={true}
          onClose={mockOnClose}
          changes={defaultChanges}
        />
      )

      expect(screen.getByLabelText('关闭')).toBeInTheDocument()
    })
  })
})

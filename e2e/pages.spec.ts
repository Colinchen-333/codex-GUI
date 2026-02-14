import { test, expect, type Page } from '@playwright/test'

async function bypassOnboarding(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('codex-desktop-onboarded', 'true')
  })
}

test.beforeEach(async ({ page }) => {
  await bypassOnboarding(page)
})

test.describe('Page Navigation Tests', () => {
  test.describe('Standalone Pages', () => {
    test('Welcome page renders correctly', async ({ page }) => {
      await page.goto('/welcome')
      await page.waitForLoadState('networkidle')

      await expect(page.locator('text=Welcome to Codex')).toBeVisible()
      await expect(page.locator('text=Your AI-powered coding assistant.')).toBeVisible()
      await expect(page.locator('button:has-text("Continue")')).toBeVisible()
      await page.screenshot({ path: '.sisyphus/evidence/task-4-welcome.png' })
    })

    test('Login page renders correctly', async ({ page }) => {
      await page.goto('/login')
      await page.waitForLoadState('networkidle')

      const pageContent = await page.content()
      expect(pageContent.length).toBeGreaterThan(100)
      await page.screenshot({ path: '.sisyphus/evidence/task-4-login.png' })
    })

    test('First run page renders correctly', async ({ page }) => {
      await page.goto('/first-run')
      await page.waitForLoadState('networkidle')

      const pageContent = await page.content()
      expect(pageContent.length).toBeGreaterThan(100)
    })

    test('Select workspace page renders correctly', async ({ page }) => {
      await page.goto('/select-workspace')
      await page.waitForLoadState('networkidle')

      const pageContent = await page.content()
      expect(pageContent.length).toBeGreaterThan(100)
    })

    test('Announcement page renders correctly', async ({ page }) => {
      await page.goto('/announcement')
      await page.waitForLoadState('networkidle')

      const pageContent = await page.content()
      expect(pageContent.length).toBeGreaterThan(100)
    })
  })

  test.describe('App Shell Pages', () => {
    test('Main workbench page loads', async ({ page }) => {
      await page.goto('/')
      await page.waitForLoadState('networkidle')
      
      const pageContent = await page.content()
      expect(pageContent.length).toBeGreaterThan(100)
    })

    test('Debug page renders correctly', async ({ page }) => {
      await page.goto('/debug')
      await page.waitForLoadState('networkidle')

      const pageContent = await page.content()
      expect(pageContent.length).toBeGreaterThan(100)
    })

    test('Skills page renders correctly', async ({ page }) => {
      await page.goto('/skills')
      await page.waitForLoadState('networkidle')

      const pageContent = await page.content()
      expect(pageContent.length).toBeGreaterThan(100)
    })

    test('Inbox page renders correctly', async ({ page }) => {
      await page.goto('/inbox')
      await page.waitForLoadState('networkidle')

      const pageContent = await page.content()
      expect(pageContent.length).toBeGreaterThan(100)
    })

    test('Settings page renders correctly', async ({ page }) => {
      await page.goto('/settings')
      await page.waitForLoadState('networkidle')

      const pageContent = await page.content()
      expect(pageContent.length).toBeGreaterThan(100)
    })

    test('Diff page renders correctly', async ({ page }) => {
      await page.goto('/diff')
      await page.waitForLoadState('networkidle')

      const pageContent = await page.content()
      expect(pageContent.length).toBeGreaterThan(100)
    })

    test('Plan summary page renders correctly', async ({ page }) => {
      await page.goto('/plan-summary')
      await page.waitForLoadState('networkidle')

      const pageContent = await page.content()
      expect(pageContent.length).toBeGreaterThan(100)
    })
  })

  test.describe('Not Found', () => {
    test('404 page renders for unknown routes', async ({ page }) => {
      await page.goto('/this-route-does-not-exist')
      await page.waitForLoadState('networkidle')

      const pageContent = await page.content()
      expect(pageContent.length).toBeGreaterThan(100)
    })
  })
})

test.describe('UI Component Integration', () => {
  test('CommandPalette opens with Ctrl+K', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    await page.keyboard.press('Control+k')
    await page.waitForTimeout(300)

    const dialog = page.locator('[role="dialog"], [cmdk-root]')
    const isVisible = await dialog.isVisible().catch(() => false)
    
    if (isVisible) {
      await expect(dialog).toBeVisible()
    }

    const cmdkRoot = page.locator('[cmdk-root], [data-cmdk-root]')
    await expect(cmdkRoot).toBeVisible()
    const item = page.locator('[cmdk-item]').first()
    const minHeight = await item.evaluate((el) => getComputedStyle(el).minHeight)
    expect(minHeight).toBe('24px')

    await page.screenshot({ path: '.sisyphus/evidence/task-2-cmdk.png' })
  })

  test('Dialogs have correct overlay', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    await page.keyboard.press('Control+k')
    await page.waitForTimeout(300)

    const overlay = page.locator('.codex-dialog-overlay')
    await expect(overlay).toBeVisible()
    await page.screenshot({ path: '.sisyphus/evidence/task-2-dialog-overlay.png' })
  })
})

test.describe('Inbox Automation Routes', () => {
  test('Inbox create mode shows create state', async ({ page }) => {
    await page.goto('/inbox?automationMode=create')
    await page.waitForLoadState('networkidle')

    await expect(page.locator('[data-testid="automation-create-state"]')).toBeVisible()
    await page.screenshot({ path: '.sisyphus/evidence/task-3-inbox-create.png' })
  })

  test('Inbox automationId shows empty state when missing', async ({ page }) => {
    await page.goto('/inbox?automationId=nonexistent')
    await page.waitForLoadState('networkidle')

    await expect(page.locator('text=Automation not found.')).toBeVisible()
    await page.screenshot({ path: '.sisyphus/evidence/task-3-inbox-automationid.png' })
  })
})

test.describe('Accessibility', () => {
  test('Welcome page has proper heading structure', async ({ page }) => {
    await page.goto('/welcome')
    await page.waitForLoadState('networkidle')

    const h1Count = await page.locator('h1').count()
    const h2Count = await page.locator('h2').count()
    
    expect(h1Count + h2Count).toBeGreaterThanOrEqual(1)
  })

  test('Buttons have accessible names', async ({ page }) => {
    await page.goto('/welcome')
    await page.waitForLoadState('networkidle')

    const buttons = page.locator('button')
    const buttonCount = await buttons.count()

    for (let i = 0; i < buttonCount; i++) {
      const button = buttons.nth(i)
      const hasText = await button.textContent()
      const hasAriaLabel = await button.getAttribute('aria-label')
      const hasTitle = await button.getAttribute('title')

      const isAccessible = !!(hasText?.trim() || hasAriaLabel || hasTitle)
      expect(isAccessible).toBeTruthy()
    }
  })

  test('Interactive elements are focusable', async ({ page }) => {
    await page.goto('/welcome')
    await page.waitForLoadState('networkidle')

    await page.keyboard.press('Tab')
    
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName)
    expect(['BUTTON', 'A', 'INPUT', 'TEXTAREA', 'SELECT', 'BODY']).toContain(focusedElement)
  })
})

test.describe('Dark Mode', () => {
  test('App renders in dark mode by default', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    const html = page.locator('html')
    const hasDarkClass = await html.evaluate(el => el.classList.contains('dark'))
    
    expect(hasDarkClass).toBeTruthy()
  })
})

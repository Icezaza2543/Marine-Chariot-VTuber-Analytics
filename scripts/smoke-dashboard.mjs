import { spawn } from 'node:child_process'
import { chromium } from 'playwright'

const host = '127.0.0.1'
const port = 4173
const defaultUrl = `http://${host}:${port}/`
const smokeUrl = process.env.SMOKE_URL?.trim() || defaultUrl
const shouldStartPreview = !process.env.SMOKE_URL

let previewProcess

try {
  if (shouldStartPreview) {
    if (await isServerResponding(smokeUrl)) {
      throw new Error(`${smokeUrl} is already serving before smoke starts. Stop the existing server or set SMOKE_URL.`)
    }

    previewProcess = startPreviewServer()
    await waitForServer(smokeUrl)
  }

  const browser = await launchBrowser()

  try {
    const desktop = await runDesktopSmoke(browser, smokeUrl)
    const mobile = await runMobileSmoke(browser, smokeUrl)

    console.log(JSON.stringify({ status: 'ok', url: smokeUrl, desktop, mobile }, null, 2))
  } finally {
    await browser.close()
  }
} finally {
  if (previewProcess) {
    await stopPreviewServer(previewProcess)
  }
}

function startPreviewServer() {
  const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx'
  const child = spawn(npx, ['vite', 'preview', '--host', host, '--port', String(port)], {
    shell: process.platform === 'win32',
    stdio: 'ignore',
    windowsHide: true,
  })

  return child
}

async function stopPreviewServer(child) {
  if (process.platform === 'win32') {
    await new Promise((resolve) => {
      const killer = spawn('taskkill', ['/pid', String(child.pid), '/t', '/f'], {
        stdio: 'ignore',
        windowsHide: true,
      })
      killer.on('exit', resolve)
      killer.on('error', resolve)
    })
    return
  }

  child.kill('SIGTERM')
}

async function waitForServer(url) {
  const timeoutAt = Date.now() + 30_000
  let lastError

  while (Date.now() < timeoutAt) {
    try {
      const response = await fetch(url)

      if (response.ok) {
        return
      }

      lastError = new Error(`${url} returned HTTP ${response.status}`)
    } catch (error) {
      lastError = error
    }

    await wait(300)
  }

  throw new Error(`Timed out waiting for ${url}: ${describeError(lastError)}`)
}

async function isServerResponding(url) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(500) })
    return response.ok
  } catch {
    return false
  }
}

async function launchBrowser() {
  try {
    return await chromium.launch({ channel: 'chrome', headless: true })
  } catch (chromeError) {
    try {
      return await chromium.launch({ headless: true })
    } catch (bundledError) {
      throw new Error(
        `Cannot launch Playwright browser. Chrome channel failed: ${describeError(
          chromeError,
        )}. Bundled Chromium failed: ${describeError(bundledError)}`,
      )
    }
  }
}

async function runDesktopSmoke(browser, url) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
  const page = await context.newPage()
  const issues = collectConsoleIssues(page)

  try {
    await page.goto(url, { waitUntil: 'networkidle' })
    await page.locator('.app-shell').waitFor({ timeout: 15_000 })
    await page.locator('.kpi-grid').waitFor({ timeout: 15_000 })
    await page.getByText('ตัวกรองข้อมูล').waitFor({ timeout: 15_000 })

    await page.getByPlaceholder('ชื่อคลิป เกม หรือคำสำคัญ').fill('ASMR')
    await page.getByRole('button', { name: 'ใช้ตัวกรอง' }).click()
    await assertValue(page.getByPlaceholder('ชื่อคลิป เกม หรือคำสำคัญ'), 'ASMR')

    await page.getByText('Disclaimer').scrollIntoViewIfNeeded()
    await page.getByRole('button', { name: 'Disclaimer' }).click()
    await page.locator('dialog[open]').getByText('MIT License').waitFor({ timeout: 10_000 })
    await page.getByRole('button', { name: 'เข้าใจแล้ว' }).click()

    const dataNoticeHref = await page.getByRole('link', { name: 'Data Notice' }).getAttribute('href')
    assert(dataNoticeHref?.includes('NOTICE.md'), 'Data Notice link should point to NOTICE.md')
    assertNoConsoleIssues(issues)

    return {
      title: await page.title(),
      filterSearch: 'ASMR',
      dataNoticeHref,
    }
  } finally {
    await context.close()
  }
}

async function runMobileSmoke(browser, url) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true })
  const page = await context.newPage()
  const issues = collectConsoleIssues(page)

  try {
    await page.goto(url, { waitUntil: 'networkidle' })
    await page.locator('.app-shell').waitFor({ timeout: 15_000 })
    await page.locator('.kpi-grid').waitFor({ timeout: 15_000 })
    await page.getByText('ตัวกรองข้อมูล').waitFor({ timeout: 15_000 })
    await page.getByRole('button', { name: 'ใช้ตัวกรอง' }).waitFor({ timeout: 15_000 })
    assertNoConsoleIssues(issues)

    return {
      viewport: '390x844',
      loaded: true,
    }
  } finally {
    await context.close()
  }
}

function collectConsoleIssues(page) {
  const issues = []

  page.on('console', (message) => {
    if (['error', 'warning'].includes(message.type())) {
      issues.push(`${message.type()}: ${message.text()}`)
    }
  })
  page.on('response', (response) => {
    if (response.status() >= 400) {
      issues.push(`http ${response.status()}: ${response.url()}`)
    }
  })
  page.on('pageerror', (error) => {
    issues.push(`pageerror: ${error.message}`)
  })

  return issues
}

function assertNoConsoleIssues(issues) {
  const relevantIssues = issues.filter((issue) => !issue.includes('favicon'))
  assert(relevantIssues.length === 0, `Console issues found: ${relevantIssues.join(' | ')}`)
}

async function assertValue(locator, expectedValue) {
  const value = await locator.inputValue()
  assert(value === expectedValue, `Expected input value ${expectedValue}, received ${value}`)
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

function describeError(error) {
  return error instanceof Error ? error.message : String(error)
}

function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

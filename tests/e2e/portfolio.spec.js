import { test, expect } from '@playwright/test'

test.beforeAll(async ({ request }) => {
    await expect.poll(async () => {
        try {
            const response = await request.get('/', { timeout: 2000 })
            return response.status()
        } catch {
            return 0
        }
    }, { timeout: 60000 }).toBe(200)
})

test('production home shows the portfolio content and requested links', async ({ page }) => {
    const response = await page.goto('/')
    expect(response.status()).toBe(200)
    await expect(page.getByRole('heading', { level: 1, name: 'かつもん.' })).toBeVisible()
    for (const name of ['Profile', 'Research', 'Missions', 'Equipment', 'Interests', 'Contact']) {
        await expect(page.getByRole('heading', { name, exact: true })).toBeVisible()
    }

    const dpsCard = page.locator('article').filter({ has: page.getByRole('heading', { name: 'DPSCalculator' }) })
    await expect(dpsCard.getByRole('link', { name: /GitHub/ })).toHaveAttribute('href', 'https://github.com/kyobankatu/GenshinImpactDPSCalculator')
    await expect(dpsCard.getByRole('link', { name: /公開ページ/ })).toHaveAttribute('href', /simulation_report\.html/)
    await expect(page.getByRole('link', { name: /Swallow LLM/ })).toHaveAttribute('href', 'https://swallow-llm.github.io/index.ja.html')
    await expect(page.getByRole('link', { name: /ota\.k\.5051/ })).toHaveCount(0)

    const contactSection = page.getByRole('region', { name: 'Contact' })
    const contacts = contactSection.getByRole('link')
    await expect(contacts).toHaveCount(3)
    await expect(contactSection.getByRole('link', { name: /Email/ })).toHaveAttribute('href', 'mailto:kento.ota@rio.scrc.iir.isct.ac.jp')
    await expect(contactSection.getByRole('link', { name: /LinkedIn/ })).toHaveAttribute('href', 'https://www.linkedin.com/in/kento-ota-84bb6a382')
    await expect(contactSection.getByRole('link', { name: /GitHub/ })).toHaveAttribute('href', 'https://github.com/kyobankatu')
})

test('language toggle and keyboard navigation work at desktop and mobile widths', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('html')).toHaveAttribute('lang', 'ja')
    await expect(page.getByRole('button', { name: '英語に切り替え' })).toBeVisible()
    await page.keyboard.press('Tab')
    await expect(page.locator(':focus')).toHaveAttribute('href', '#overview')
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/#overview$/)

    await page.getByRole('button', { name: '英語に切り替え' }).click()
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
    await expect(page.getByRole('heading', { level: 1, name: 'Katumon.' })).toBeVisible()
    await expect(page.getByText('Computer vision with event cameras', { exact: true })).toBeVisible()
    await expect(page.getByText('A Genshin Impact combat simulator for modeling damage and calculating DPS.', { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Switch language to Japanese' })).toBeVisible()
    await expect(page.getByRole('link', { name: /Swallow LLM/ })).toHaveAttribute('href', 'https://swallow-llm.github.io/index.en.html')
    await page.getByRole('button', { name: 'Switch language to Japanese' }).click()
    await expect(page.locator('html')).toHaveAttribute('lang', 'ja')
    await expect(page.getByRole('heading', { level: 1, name: 'かつもん.' })).toBeVisible()
    await expect(page.getByRole('button', { name: '英語に切り替え' })).toBeVisible()

    for (const width of [390, 1440]) {
        await page.setViewportSize({ width, height: 900 })
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
        await expect(page.getByRole('link', { name: '作品を見る' })).toBeVisible()

        if (width === 390) {
            const documentWidth = await page.evaluate(() => document.documentElement.scrollWidth)
            expect(documentWidth).toBeLessThanOrEqual(width)

            for (const locator of [
                page.getByRole('navigation'),
                page.getByRole('link', { name: '作品を見る' }),
            ]) {
                const box = await locator.boundingBox()
                expect(box).not.toBeNull()
                expect(box.x).toBeGreaterThanOrEqual(0)
                expect(box.x + box.width).toBeLessThanOrEqual(width)
                expect(box.y).toBeGreaterThanOrEqual(0)
                expect(box.y + box.height).toBeLessThanOrEqual(900)
            }
        }
    }
})

test('static image is served and an unknown route returns 404', async ({ request }) => {
    const image = await request.get('/fav.png')
    expect(image.status()).toBe(200)
    expect(image.headers()['content-type']).toContain('image/')
    const missing = await request.get('/__portfolio_ci_missing_page__')
    expect(missing.status()).toBe(404)
})

test('character introduces the selected section and honors reduced motion', async ({ page }) => {
    await page.goto('/')
    const character = page.locator('[class*="characterTile"]')
    const introduction = page.getByRole('status')
    await expect(introduction).toContainText('プロフィール')

    await page.getByRole('link', { name: /研究テーマ/ }).click()
    await expect(introduction).toContainText('イベントカメラ')
    await expect(page.getByRole('link', { name: /研究テーマ/ })).toHaveAttribute('aria-current', 'location')

    await page.emulateMedia({ reducedMotion: 'no-preference' })
    const normalMotion = await character.evaluate((element) => getComputedStyle(element).animationName)
    expect(normalMotion).not.toBe('none')

    await page.emulateMedia({ reducedMotion: 'reduce' })
    const reducedMotion = await character.evaluate((element) => getComputedStyle(element).animationName)
    expect(reducedMotion).toBe('none')
    await expect(introduction).toContainText('イベントカメラ')
})

test('Physics Toss is opt-in, moves sections with gravity, and restores the layout', async ({ page }) => {
    await page.goto('/')
    const profile = page.locator('#profile')
    const initialBox = await profile.boundingBox()
    const enableButton = page.getByRole('button', { name: 'Physics Tossを有効にする' })

    await expect(enableButton).toHaveAttribute('aria-pressed', 'false')
    expect(await profile.evaluate((element) => element.style.translate)).toBe('')

    await enableButton.click()
    await expect(page.getByRole('button', { name: 'Physics Tossを無効にする' })).toHaveAttribute('aria-pressed', 'true')
    const resetButton = page.getByRole('button', { name: '配置をリセット' })
    await expect(resetButton).toBeEnabled()

    const startBox = await profile.boundingBox()
    await page.mouse.move(startBox.x + startBox.width / 2, startBox.y + 8)
    await page.mouse.down()
    await page.mouse.move(startBox.x + startBox.width / 2 + 100, startBox.y + 128, { steps: 6 })
    await page.mouse.up()

    await expect.poll(async () => (await profile.boundingBox()).y).toBeGreaterThan(startBox.y + 40)

    await resetButton.click()
    await expect.poll(async () => (await profile.boundingBox()).y).toBe(startBox.y)

    await page.getByRole('navigation').getByRole('link', { name: /研究テーマ/ }).click()
    await expect(page).toHaveURL(/#research$/)
    await expect(page.getByRole('status')).toContainText('イベントカメラ')

    await page.getByRole('button', { name: 'Physics Tossを無効にする' }).click()
    await expect(page.getByRole('button', { name: 'Physics Tossを有効にする' })).toHaveAttribute('aria-pressed', 'false')
    expect(await profile.evaluate((element) => element.style.translate)).toBe('')
    await expect.poll(async () => (await profile.boundingBox()).y).toBe(initialBox.y)
})

test('Physics Toss can move a project card without moving its section or consuming its link click', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Physics Tossを有効にする' }).click()
    const resetButton = page.getByRole('button', { name: '配置をリセット' })
    await expect(resetButton).toBeEnabled()

    const section = page.locator('#missions')
    const card = section.locator('article[data-physics-object]').filter({
        has: page.getByRole('heading', { name: 'DPSCalculator' }),
    })
    await card.scrollIntoViewIfNeeded()
    const initialBox = await card.boundingBox()
    await page.mouse.move(initialBox.x + initialBox.width / 2, initialBox.y + 35)
    await page.mouse.down()
    await page.mouse.move(initialBox.x + initialBox.width / 2 + 100, initialBox.y + 95, { steps: 5 })
    await page.mouse.up()

    await expect.poll(async () => (await card.boundingBox()).y).toBeGreaterThan(initialBox.y + 20)
    expect(await section.evaluate((element) => element.style.translate)).toBe('')

    await resetButton.click()
    await card.scrollIntoViewIfNeeded()
    await expect.poll(async () => (await card.boundingBox()).y).toBe(initialBox.y)

    const popupPromise = page.waitForEvent('popup')
    await card.getByRole('link', { name: /GitHub/ }).click()
    const popup = await popupPromise
    expect(popup.url()).toContain('github.com/kyobankatu/')
    await popup.close()
})

test('Physics Toss can move a heading without moving its section', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Physics Tossを有効にする' }).click()
    const resetButton = page.getByRole('button', { name: '配置をリセット' })
    await expect(resetButton).toBeEnabled()

    const section = page.locator('#research')
    const heading = section.getByRole('heading', { name: 'Research', exact: true })
    await heading.scrollIntoViewIfNeeded()
    const initialBox = await heading.boundingBox()
    await page.mouse.move(initialBox.x + initialBox.width / 2, initialBox.y + initialBox.height / 2)
    await page.mouse.down()
    await page.mouse.move(initialBox.x + initialBox.width / 2 + 80, initialBox.y + initialBox.height / 2 + 60, { steps: 5 })
    await page.mouse.up()

    await expect.poll(async () => (await heading.boundingBox()).y).toBeGreaterThan(initialBox.y + 20)
    expect(await section.evaluate((element) => element.style.translate)).toBe('')

    await resetButton.click()
    await heading.scrollIntoViewIfNeeded()
    await expect.poll(async () => (await heading.boundingBox()).y).toBe(initialBox.y)
})

test('Physics Toss lets a profile card collide with the sidebar', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/')
    await page.getByRole('button', { name: 'Physics Tossを有効にする' }).click()
    await expect(page.getByRole('button', { name: '配置をリセット' })).toBeEnabled()

    const sidebar = page.locator('aside[data-physics-section]')
    const card = page.locator('#profile article[data-physics-object]').first()
    const sidebarBox = await sidebar.boundingBox()
    const cardBox = await card.boundingBox()
    await page.mouse.move(cardBox.x + cardBox.width / 2, cardBox.y + cardBox.height / 2)
    await page.mouse.down()
    await page.mouse.move(cardBox.width / 2, sidebarBox.height / 2, { steps: 8 })
    await page.mouse.up()

    await expect.poll(async () => sidebar.evaluate((element) => element.style.translate)).not.toBe('')
    expect((await card.boundingBox()).x).toBeGreaterThanOrEqual(-1)
})

test('keyboard navigation and browser history keep the section state synchronized', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/')
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    await expect(page.locator(':focus')).toHaveAttribute('href', '#research')
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/#research$/)
    await expect(page.getByRole('link', { name: /研究テーマ/ })).toHaveAttribute('aria-current', 'location')
    await expect(page.getByRole('status')).toContainText('イベントカメラとLLMを研究しています。')

    await page.getByRole('navigation').getByRole('link', { name: /作品/ }).click()
    await expect(page).toHaveURL(/#missions$/)
    await expect(page.getByRole('status')).toContainText('これまでに作った作品です。')
    await page.goBack()
    await expect(page).toHaveURL(/#research$/)
    await expect(page.getByRole('link', { name: /研究テーマ/ })).toHaveAttribute('aria-current', 'location')
    await expect(page.getByRole('status')).toContainText('イベントカメラとLLMを研究しています。')
    await page.goForward()
    await expect(page.getByRole('status')).toContainText('これまでに作った作品です。')
})

test('a direct section URL and a reload select the matching section', async ({ page }) => {
    await page.goto('/#research')
    await expect(page.getByRole('link', { name: /研究テーマ/ })).toHaveAttribute('aria-current', 'location')
    await expect(page.getByRole('status')).toContainText('イベントカメラとLLMを研究しています。')

    await page.reload()
    await expect(page.getByRole('link', { name: /研究テーマ/ })).toHaveAttribute('aria-current', 'location')
    await expect(page.getByRole('status')).toContainText('イベントカメラとLLMを研究しています。')
})

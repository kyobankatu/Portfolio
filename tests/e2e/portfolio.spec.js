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
})

test('language toggle and keyboard navigation work at desktop and mobile widths', async ({ page }) => {
    await page.goto('/')
    await page.keyboard.press('Tab')
    await expect(page.locator(':focus')).toHaveAttribute('href', '#overview')
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/#overview$/)

    await page.getByRole('button', { name: 'Switch language to English' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Katumon.' })).toBeVisible()
    await expect(page.getByRole('link', { name: /Swallow LLM/ })).toHaveAttribute('href', 'https://swallow-llm.github.io/index.en.html')
    await page.getByRole('button', { name: '日本語に切り替え' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'かつもん.' })).toBeVisible()

    for (const width of [390, 1440]) {
        await page.setViewportSize({ width, height: 900 })
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
        await expect(page.getByRole('link', { name: '作品を見る' })).toBeVisible()
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

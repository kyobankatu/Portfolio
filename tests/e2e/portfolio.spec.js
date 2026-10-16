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

test('home page exposes the primary sections', async ({ page }) => {
    const response = await page.goto('/')
    expect(response.status()).toBe(200)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    for (const name of ['Skills', 'Research', 'Projects', 'Contact', 'Hobbies']) {
        await expect(page.getByRole('heading', { name, exact: true })).toBeVisible()
    }
})

test('language selection can be changed in both directions', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'EN', exact: true }).click()
    await expect(page.getByRole('button', { name: 'JA', exact: true })).toBeVisible()
    await expect(page.getByText('B4 Student @ Institute of Science Tokyo', { exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'JA', exact: true }).click()
    await expect(page.getByRole('button', { name: 'EN', exact: true })).toBeVisible()
    await expect(page.getByText('東京科学大学 B4', { exact: true })).toBeVisible()
})

test('static image is served and an unknown route returns 404', async ({ request }) => {
    const image = await request.get('/fav.png')
    expect(image.status()).toBe(200)
    expect(image.headers()['content-type']).toContain('image/')
    const missing = await request.get('/__portfolio_ci_missing_page__')
    expect(missing.status()).toBe(404)
})

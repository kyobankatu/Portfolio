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

test('Physics Toss shows a visible focus indicator on keyboard-operated targets', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Physics Tossを有効にする' }).click()
    await expect(page.getByRole('button', { name: '配置をリセット' })).toBeEnabled()

    const heading = page.locator('#hero-title')
    for (let index = 0; index < 30; index += 1) {
        if (await heading.evaluate((element) => element === document.activeElement)) {
            break
        }
        await page.keyboard.press('Tab')
    }

    await expect(heading).toBeFocused()
    await expect.poll(() => heading.evaluate((element) => {
        const style = getComputedStyle(element)
        return `${style.outlineWidth} ${style.outlineStyle}`
    })).toBe('2px solid')

    const section = page.locator('#overview')
    await page.keyboard.press('Shift+Tab')
    await expect(section).toBeFocused()
    await expect.poll(() => section.evaluate((element) => {
        const style = getComputedStyle(element)
        return `${style.outlineWidth} ${style.outlineStyle}`
    })).toBe('2px solid')
})

test('Physics Toss keeps native Space activation for nested buttons', async ({ page }) => {
    await page.goto('/')
    const section = page.locator('#profile')
    await section.evaluate((element) => {
        const button = document.createElement('button')
        button.id = 'nested-space-button'
        button.type = 'button'
        button.dataset.physicsObject = ''
        button.textContent = 'Nested control'
        button.addEventListener('click', () => {
            button.dataset.activated = 'true'
        })
        element.append(button)
    })

    await page.getByRole('button', { name: 'Physics Tossを有効にする' }).click()
    const button = page.locator('#nested-space-button')
    await expect(page.getByRole('button', { name: '配置をリセット' })).toBeEnabled()
    await button.focus()
    await page.keyboard.press('Space')

    await expect(button).toHaveAttribute('data-activated', 'true')
})

test('Physics Toss prevents page scrolling on repeated Space keydown', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Physics Tossを有効にする' }).click()
    const heading = page.getByRole('heading', { name: 'Profile', exact: true })
    await heading.focus()
    await page.evaluate(() => {
        window.__physicsSpaceRepeated = false
        document.addEventListener('keydown', (event) => {
            if (event.code === 'Space' && event.repeat) {
                window.__physicsSpaceRepeated = true
            }
        })
    })
    const scrollBefore = await page.evaluate(() => window.scrollY)

    await page.keyboard.down('Space')
    await page.keyboard.down('Space')
    await page.waitForTimeout(100)
    await page.keyboard.up('Space')

    expect(await page.evaluate(() => window.__physicsSpaceRepeated)).toBe(true)
    expect(await page.evaluate(() => window.scrollY)).toBe(scrollBefore)
})

test('Physics Toss preserves native Space scrolling on nested links', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Physics Tossを有効にする' }).click()
    const link = page.getByRole('link', { name: /GitHub/ }).first()
    await link.scrollIntoViewIfNeeded()
    await link.focus()
    await page.evaluate(() => {
        window.__physicsSpacePrevented = null
        document.addEventListener('keydown', (event) => {
            if (event.code === 'Space') {
                window.__physicsSpacePrevented = event.defaultPrevented
            }
        })
    })

    await page.keyboard.press('Space')

    expect(await page.evaluate(() => window.__physicsSpacePrevented)).toBe(false)
    await expect(page).toHaveURL('/')
})

test('Physics Toss preserves a moved project card and its normal link click', async ({ page }) => {
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
    const projectLink = card.getByRole('link', { name: /GitHub/ })
    const linkBox = await projectLink.boundingBox()
    const unexpectedPopup = page.waitForEvent('popup', { timeout: 300 }).catch(() => null)
    await page.mouse.move(linkBox.x + linkBox.width / 2, linkBox.y + linkBox.height / 2)
    await page.mouse.down()
    await page.mouse.move(linkBox.x + linkBox.width / 2 + 100, linkBox.y + linkBox.height / 2 + 45, { steps: 5 })
    await page.mouse.up()

    await expect.poll(async () => (await card.boundingBox()).y).toBeGreaterThan(initialBox.y + 20)
    expect(await section.evaluate((element) => element.style.translate)).toBe('')
    expect(await unexpectedPopup).toBeNull()
    await page.waitForTimeout(300)

    const popupPromise = page.waitForEvent('popup')
    await projectLink.click()
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
    await page.emulateMedia({ reducedMotion: 'no-preference' })
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

test('Physics Toss resynchronizes sticky sidebar objects after page scrolling', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/')
    await page.getByRole('button', { name: 'Physics Tossを有効にする' }).click()
    const sidebar = page.locator('aside[data-physics-section]')
    const footer = sidebar.locator('[data-physics-object]').last()

    await page.evaluate(() => window.scrollTo(0, 300))
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(300)
    const box = await footer.boundingBox()
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.down()
    await page.mouse.move(box.x + box.width / 2 + 20, box.y + box.height / 2)

    await expect(footer).toHaveCSS('z-index', '10')
    await page.mouse.up()
})

test('Physics Toss gravity moves a released target after a horizontal drag', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await page.goto('/')
    await page.getByRole('button', { name: 'Physics Tossを有効にする' }).click()
    const heading = page.getByRole('heading', { name: 'Profile', exact: true })
    await heading.scrollIntoViewIfNeeded()
    const initialBox = await heading.boundingBox()
    await page.mouse.move(initialBox.x + initialBox.width / 2, initialBox.y + initialBox.height / 2)
    await page.mouse.down()
    await page.mouse.move(initialBox.x + initialBox.width / 2 + 35, initialBox.y + initialBox.height / 2, { steps: 4 })
    await page.mouse.up()

    await expect.poll(async () => (await heading.boundingBox()).y, { timeout: 5000 }).toBeGreaterThan(initialBox.y + 2)
})

test('Physics Toss keeps a moved target aligned after a language reflow and reset', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Physics Tossを有効にする' }).click()
    const card = page.locator('#missions article[data-physics-object]').first()
    await card.scrollIntoViewIfNeeded()
    const initialBox = await card.boundingBox()
    await page.mouse.move(initialBox.x + 30, initialBox.y + 30)
    await page.mouse.down()
    await page.mouse.move(initialBox.x + 75, initialBox.y + 30, { steps: 4 })
    await page.mouse.up()
    const movedTranslate = await card.evaluate((element) => element.style.translate)
    expect(movedTranslate).not.toBe('')

    await page.getByRole('button', { name: '英語に切り替え' }).click()
    await expect(card).toContainText('ArtifactSimulator')
    expect(await card.evaluate((element) => element.style.translate)).toBe(movedTranslate)

    await page.getByRole('button', { name: 'Reset layout' }).click()
    expect(await card.evaluate((element) => element.style.translate)).toBe('')
})

test('Physics Toss supports Space and arrow-key interaction', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Physics Tossを有効にする' }).click()
    const resetButton = page.getByRole('button', { name: '配置をリセット' })
    await expect(resetButton).toBeEnabled()
    const heading = page.getByRole('heading', { name: 'Profile', exact: true })
    await heading.focus()

    await page.keyboard.press('Space')
    await page.keyboard.press('ArrowRight')
    expect(await heading.evaluate((element) => element.style.translate)).not.toBe('')
    await page.keyboard.press('Space')
    await resetButton.click()
    await page.getByRole('button', { name: 'Physics Tossを無効にする' }).click()
    await expect(heading).not.toHaveAttribute('tabindex')
})

test('Physics Toss honors reduced motion while keeping direct manipulation available', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/')
    await page.getByRole('button', { name: 'Physics Tossを有効にする' }).click()
    await expect(page.getByRole('button', { name: '配置をリセット' })).toBeEnabled()
    const heading = page.getByRole('heading', { name: 'Research', exact: true })
    await heading.scrollIntoViewIfNeeded()
    const box = await heading.boundingBox()
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.down()
    await page.mouse.move(box.x + box.width / 2 + 60, box.y + box.height / 2 + 45, { steps: 4 })
    await page.mouse.up()
    const positionAfterDrag = await heading.evaluate((element) => element.style.translate)
    expect(positionAfterDrag).not.toBe('')
    await page.waitForTimeout(250)
    expect(await heading.evaluate((element) => element.style.translate)).toBe(positionAfterDrag)

    await heading.focus()
    await page.keyboard.press('Space')
    await page.keyboard.press('ArrowRight')
    await page.keyboard.press('Space')
    const positionAfterKeyboard = await heading.evaluate((element) => element.style.translate)
    expect(positionAfterKeyboard).not.toBe(positionAfterDrag)
    await page.waitForTimeout(250)
    expect(await heading.evaluate((element) => element.style.translate)).toBe(positionAfterKeyboard)
})

test('Physics Toss supports real touch dragging while vertical swipes scroll the page', async ({ browser }) => {
    const context = await browser.newContext({
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
        reducedMotion: 'reduce',
    })
    const page = await context.newPage()
    const cdp = await context.newCDPSession(page)
    await page.goto('/')
    await page.getByRole('button', { name: '英語に切り替え' }).click()
    await page.getByRole('button', { name: 'Enable Physics Toss' }).click()
    await expect(page.getByRole('button', { name: 'Reset layout' })).toBeEnabled()
    const heading = page.getByRole('heading', { name: 'Profile', exact: true })
    await heading.scrollIntoViewIfNeeded()
    const box = await heading.boundingBox()
    const startX = box.x + box.width / 2
    const startY = box.y + box.height / 2
    const dispatchTouch = (type, x, y) => cdp.send('Input.dispatchTouchEvent', {
        type,
        touchPoints: type === 'touchEnd' ? [] : [{ id: 1, x, y, radiusX: 4, radiusY: 4, force: 1 }],
    })

    const scrollBefore = await page.evaluate(() => window.scrollY)
    await dispatchTouch('touchStart', startX, startY)
    await dispatchTouch('touchMove', startX, startY - 70)
    await dispatchTouch('touchEnd', startX, startY - 70)
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(scrollBefore)
    expect(await heading.evaluate((element) => element.style.translate)).toBe('')

    await heading.scrollIntoViewIfNeeded()
    const dragBox = await heading.boundingBox()
    const dragStartX = dragBox.x + dragBox.width / 2
    const dragStartY = dragBox.y + dragBox.height / 2
    await dispatchTouch('touchStart', dragStartX, dragStartY)
    await dispatchTouch('touchMove', dragStartX + 55, dragStartY)
    await dispatchTouch('touchEnd', dragStartX + 55, dragStartY)

    await expect.poll(async () => (await heading.boundingBox()).x).toBeGreaterThan(dragBox.x + 20)
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
    await context.close()
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

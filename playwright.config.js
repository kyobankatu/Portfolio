import { defineConfig } from '@playwright/test'

const externalServer = process.env.PORTFOLIO_BASE_URL

export default defineConfig({
    testDir: './tests/e2e',
    fullyParallel: false,
    forbidOnly: Boolean(process.env.CI),
    retries: 0,
    workers: 1,
    reporter: 'list',
    use: {
        baseURL: externalServer || 'http://127.0.0.1:4173',
        browserName: 'chromium',
        reducedMotion: 'reduce',
        trace: 'off',
    },
    webServer: externalServer ? undefined : {
        command: 'npm run start -- --hostname 127.0.0.1 --port 4173',
        url: 'http://127.0.0.1:4173',
        reuseExistingServer: false,
        timeout: 60000,
    },
})

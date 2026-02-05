import { defineConfig, devices } from '@playwright/test';
import { ACTION_TIMEOUT_MS, NAVIGATION_TIMEOUT_MS, EXPECT_TIMEOUT_MS, TEST_TIMEOUT_MS } from './tests/support/fixtures/constants';

export default defineConfig({
    testDir: './tests/e2e',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 1 : undefined,

    timeout: TEST_TIMEOUT_MS,
    expect: {
        timeout: EXPECT_TIMEOUT_MS,
    },

    use: {
        baseURL: process.env.BASE_URL || 'http://localhost:3000',

        trace: 'retain-on-failure',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',

        actionTimeout: ACTION_TIMEOUT_MS,
        navigationTimeout: NAVIGATION_TIMEOUT_MS,

        viewport: { width: 1280, height: 720 },
    },

    reporter: [
        ['html', { outputFolder: 'test-results/html' }],
        ['junit', { outputFile: 'test-results/junit.xml' }],
        ['list'],
    ],

    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
        {
            name: 'firefox',
            use: { ...devices['Desktop Firefox'] },
        },
        {
            name: 'webkit',
            use: { ...devices['Desktop Safari'] },
        },
        {
            name: 'mobile-chrome',
            use: { ...devices['Pixel 5'] },
        },
        {
            name: 'mobile-safari',
            use: { ...devices['iPhone 12'] },
        },
    ],

    webServer: process.env.CI ? undefined : {
        command: 'npm run dev',
        url: 'http://localhost:3000',
        reuseExistingServer: !process.env.CI,
        timeout: 120 * 1000,
    },
});

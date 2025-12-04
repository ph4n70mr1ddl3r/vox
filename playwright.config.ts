import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration for vox Platform
 * 
 * Optimized for trust graph testing, reputation flows, and marketplace interactions.
 * Configured for Next.js MPA architecture with server-side rendering.
 * 
 * Performance targets: <3s page load on 3G, 10K concurrent users support
 */
export default defineConfig({
    testDir: './tests/e2e',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 1 : undefined,

    // Timeout configuration
    timeout: 60 * 1000, // Test timeout: 60s (trust graph calculations may be slower)
    expect: {
        timeout: 15 * 1000, // Assertion timeout: 15s
    },

    use: {
        // Base URL from environment or default to local dev
        baseURL: process.env.BASE_URL || 'http://localhost:3000',

        // Failure artifacts (failure-only strategy to reduce storage)
        trace: 'retain-on-failure',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',

        // Action and navigation timeouts
        actionTimeout: 15 * 1000, // 15s for interactions
        navigationTimeout: 30 * 1000, // 30s for page loads (3G constraint)

        // Mobile emulation for responsive testing
        viewport: { width: 1280, height: 720 },
    },

    // Test reporters
    reporter: [
        ['html', { outputFolder: 'test-results/html' }],
        ['junit', { outputFile: 'test-results/junit.xml' }],
        ['list'],
    ],

    // Browser projects (multi-browser support for 10K+ user base)
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
        // Mobile browsers for responsive verification
        {
            name: 'mobile-chrome',
            use: { ...devices['Pixel 5'] },
        },
        {
            name: 'mobile-safari',
            use: { ...devices['iPhone 12'] },
        },
    ],

    // Development server (Next.js)
    webServer: process.env.CI ? undefined : {
        command: 'npm run dev',
        url: 'http://localhost:3000',
        reuseExistingServer: !process.env.CI,
        timeout: 120 * 1000,
    },
});

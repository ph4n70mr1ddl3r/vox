import { test, expect } from '../support/fixtures';

/**
 * Example Test Suite: User Authentication
 * 
 * Demonstrates:
 * - Using data factories with auto-cleanup
 * - Testing authentication flows
 * - Proper test isolation
 */

test.describe('User Authentication', () => {
    test('should register and login a new user', async ({ page, userFactory, defaultPassword }) => {
        const user = await userFactory.createFollower({
            name: 'Test User',
        });

        await page.goto('/login');

        await page.fill('[data-testid="email-input"]', user.email);
        await page.fill('[data-testid="password-input"]', defaultPassword);
        await page.click('[data-testid="login-button"]');

        await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
        await expect(page.locator('[data-testid="user-name"]')).toHaveText(user.name);
    });

    test('should display error for invalid credentials', async ({ page }) => {
        await page.goto('/login');

        await page.fill('[data-testid="email-input"]', 'invalid@example.com');
        await page.fill('[data-testid="password-input"]', 'wrongpassword');
        await page.click('[data-testid="login-button"]');

        await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
        await expect(page.locator('[data-testid="error-message"]')).toContainText('Invalid credentials');
    });
});

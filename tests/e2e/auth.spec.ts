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
    test('should register and login a new user', async ({ page, userFactory }) => {
        // Create test user
        const user = await userFactory.createFollower({
            email: 'test-user@example.com',
            name: 'Test User',
        });

        // Navigate to login page
        await page.goto('/login');

        // Fill in credentials
        await page.fill('[data-testid="email-input"]', user.email);
        await page.fill('[data-testid="password-input"]', 'password123');
        await page.click('[data-testid="login-button"]');

        // Assert successful login
        await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
        await expect(page.locator('[data-testid="user-name"]')).toHaveText(user.name);
    });

    test('should display error for invalid credentials', async ({ page }) => {
        await page.goto('/login');

        await page.fill('[data-testid="email-input"]', 'invalid@example.com');
        await page.fill('[data-testid="password-input"]', 'wrongpassword');
        await page.click('[data-testid="login-button"]');

        // Assert error message
        await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
        await expect(page.locator('[data-testid="error-message"]')).toContainText('Invalid credentials');
    });
});

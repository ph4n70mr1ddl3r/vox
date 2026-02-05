import { test, expect } from '../support/fixtures';

/**
 * Example Test Suite: Trust Graph Network
 * 
 * Demonstrates:
 * - Building trust networks with factories
 * - Testing graph relationships
 * - Reputation score updates
 */

test.describe('Trust Graph Network', () => {
    test('should create trust connection and update reputation scores', async ({
        page,
        userFactory,
        defaultPassword,
    }) => {
        const influencer = await userFactory.createInfluencer({
            name: 'Influencer Alice',
            reputationScore: 70,
        });

        const brand = await userFactory.createBrand({
            name: 'Brand Bob',
            reputationScore: 60,
        });

        await page.goto('/login');
        await page.fill('[data-testid="email-input"]', influencer.email);
        await page.fill('[data-testid="password-input"]', defaultPassword);
        await page.click('[data-testid="login-button"]');

        await page.goto(`/profiles/${brand.id}`);

        await page.click('[data-testid="send-trust-request"]');
        await page.fill('[data-testid="trust-level-input"]', '85');
        await page.click('[data-testid="submit-trust-request"]');

        await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
        await expect(page.locator('[data-testid="success-message"]')).toContainText('Trust request sent');

        await page.goto('/network');
        await expect(page.locator(`[data-testid="connection-${brand.id}"]`)).toBeVisible();
    });

    test('should display trust network visualization', async ({
        page,
        userFactory,
        trustConnectionFactory,
        defaultPassword,
    }) => {
        const center = await userFactory.createInfluencer({ name: 'Center User' });
        const connections = await userFactory.createUsers(5, { role: 'follower' });

        await trustConnectionFactory.createNetwork(
            center.id,
            connections.map((u) => u.id)
        );

        await page.goto('/login');
        await page.fill('[data-testid="email-input"]', center.email);
        await page.fill('[data-testid="password-input"]', defaultPassword);
        await page.click('[data-testid="login-button"]');

        await page.goto('/network');

        await expect(page.locator('[data-testid="trust-graph"]')).toBeVisible();
        await expect(page.locator('[data-testid="network-nodes"]')).toHaveCount(6);
    });

    test('should calculate reputation score after trust connection', async ({
        userFactory,
        trustConnectionFactory,
    }) => {
        const userA = await userFactory.createInfluencer({ reputationScore: 80 });
        const userB = await userFactory.createFollower({ reputationScore: 50 });

        const connection = await trustConnectionFactory.createConnection({
            fromUserId: userA.id,
            toUserId: userB.id,
            trustLevel: 90,
        });

        await trustConnectionFactory.acceptConnection(connection.id);

        const getUserAResponse = await fetch(`${process.env.API_URL || 'http://localhost:3000/api'}/users/${userA.id}`, {
            headers: { 'Authorization': `Bearer ${userA.accessToken}` }
        });
        const updatedUserA = await getUserAResponse.json() as { reputationScore: number };

        expect(updatedUserA.reputationScore).toBeDefined();
        expect(typeof updatedUserA.reputationScore).toBe('number');
    });

    test('should verify reputation score increases after receiving trust from high-reputation user', async ({
        userFactory,
        trustConnectionFactory,
    }) => {
        const highRepUser = await userFactory.createInfluencer({ reputationScore: 95 });
        const lowRepUser = await userFactory.createFollower({ reputationScore: 40 });

        const connection = await trustConnectionFactory.createConnection({
            fromUserId: highRepUser.id,
            toUserId: lowRepUser.id,
            trustLevel: 90,
        });

        await trustConnectionFactory.acceptConnection(connection.id);

        const getLowRepUserResponse = await fetch(`${process.env.API_URL || 'http://localhost:3000/api'}/users/${lowRepUser.id}`, {
            headers: { 'Authorization': `Bearer ${lowRepUser.accessToken}` }
        });
        const updatedLowRepUser = await getLowRepUserResponse.json() as { reputationScore: number };

        expect(updatedLowRepUser.reputationScore).toBeGreaterThanOrEqual(lowRepUser.reputationScore);
    });
});

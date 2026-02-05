import { test, expect } from '../support/fixtures';
import { DEFAULT_BUDGET } from '../support/fixtures/constants';

/**
 * Example Test Suite: Marketplace Campaigns
 * 
 * Demonstrates:
 * - Campaign creation workflows
 * - Reputation-based filtering
 * - Brand-influencer interactions
 */

test.describe('Marketplace Campaigns', () => {
    test('should create a new campaign as a brand', async ({ page, userFactory, defaultPassword }) => {
        const brand = await userFactory.createBrand({
            name: 'Fashion Brand',
            reputationScore: 75,
        });

        await page.goto('/login');
        await page.fill('[data-testid="email-input"]', brand.email);
        await page.fill('[data-testid="password-input"]', defaultPassword);
        await page.click('[data-testid="login-button"]');

        await page.goto('/campaigns/create');

        await page.fill('[data-testid="campaign-title"]', 'Summer Fashion Collection');
        await page.fill('[data-testid="campaign-description"]', 'Promoting our summer collection');
        await page.fill('[data-testid="campaign-budget"]', `${DEFAULT_BUDGET}`);
        await page.selectOption('[data-testid="campaign-category"]', 'fashion');
        await page.fill('[data-testid="min-reputation-score"]', '70');
        await page.fill('[data-testid="max-influencers"]', '10');

        await page.click('[data-testid="submit-campaign"]');

        await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
        await expect(page.locator('[data-testid="success-message"]')).toContainText('Campaign created');

        await expect(page).toHaveURL(/\/campaigns\/[a-z0-9-]+/);
        await expect(page.locator('[data-testid="campaign-title"]')).toHaveText('Summer Fashion Collection');
    });

    test('should filter campaigns by reputation score', async ({
        page,
        userFactory,
        campaignFactory,
        defaultPassword,
    }) => {
        const brand = await userFactory.createBrand();

        const lowRepCampaign = await campaignFactory.createCampaign({
            brandId: brand.id,
            title: 'Low Rep Campaign',
            minReputationScore: 40,
        });

        const highRepCampaign = await campaignFactory.createCampaign({
            brandId: brand.id,
            title: 'High Rep Campaign',
            minReputationScore: 80,
        });

        const influencer = await userFactory.createInfluencer({
            reputationScore: 60,
        });

        await page.goto('/login');
        await page.fill('[data-testid="email-input"]', influencer.email);
        await page.fill('[data-testid="password-input"]', defaultPassword);
        await page.click('[data-testid="login-button"]');

        await page.goto('/marketplace');

        await expect(page.locator(`[data-testid="campaign-${lowRepCampaign.id}"]`)).toBeVisible();

        await expect(page.locator(`[data-testid="campaign-${highRepCampaign.id}"]`)).not.toBeVisible();
    });

    test('should send collaboration request from influencer to brand', async ({
        page,
        userFactory,
        campaignFactory,
        defaultPassword,
    }) => {
        const brand = await userFactory.createBrand();
        const campaign = await campaignFactory.createCampaign({
            brandId: brand.id,
            budget: 10000,
            minReputationScore: 50,
        });

        const influencer = await userFactory.createInfluencer({
            reputationScore: 75,
        });

        await page.goto('/login');
        await page.fill('[data-testid="email-input"]', influencer.email);
        await page.fill('[data-testid="password-input"]', defaultPassword);
        await page.click('[data-testid="login-button"]');

        await page.goto(`/campaigns/${campaign.id}`);

        await page.click('[data-testid="request-collaboration"]');
        await page.fill('[data-testid="collaboration-message"]', 'I would love to collaborate!');
        await page.fill('[data-testid="proposed-rate"]', '1500');
        await page.click('[data-testid="submit-collaboration-request"]');

        await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
        await expect(page.locator('[data-testid="collaboration-status"]')).toHaveText('Pending');
    });
});

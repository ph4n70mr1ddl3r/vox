import { test, expect } from '../support/fixtures';

/**
 * Example Test Suite: Marketplace Campaigns
 * 
 * Demonstrates:
 * - Campaign creation workflows
 * - Reputation-based filtering
 * - Brand-influencer interactions
 */

test.describe('Marketplace Campaigns', () => {
    test('should create a new campaign as a brand', async ({ page, userFactory, campaignFactory }) => {
        // Create brand user
        const brand = await userFactory.createBrand({
            name: 'Fashion Brand',
            reputationScore: 75,
        });

        // Login as brand
        await page.goto('/login');
        await page.fill('[data-testid="email-input"]', brand.email);
        await page.fill('[data-testid="password-input"]', 'password123');
        await page.click('[data-testid="login-button"]');

        // Navigate to campaign creation
        await page.goto('/campaigns/create');

        // Fill campaign form
        await page.fill('[data-testid="campaign-title"]', 'Summer Fashion Collection');
        await page.fill('[data-testid="campaign-description"]', 'Promoting our summer collection');
        await page.fill('[data-testid="campaign-budget"]', '5000');
        await page.selectOption('[data-testid="campaign-category"]', 'fashion');
        await page.fill('[data-testid="min-reputation-score"]', '70');
        await page.fill('[data-testid="max-influencers"]', '10');

        // Submit campaign
        await page.click('[data-testid="submit-campaign"]');

        // Assert campaign created
        await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
        await expect(page.locator('[data-testid="success-message"]')).toContainText('Campaign created');

        // Verify redirect to campaign page
        await expect(page).toHaveURL(/\/campaigns\/[a-z0-9-]+/);
        await expect(page.locator('[data-testid="campaign-title"]')).toHaveText('Summer Fashion Collection');
    });

    test('should filter campaigns by reputation score', async ({
        page,
        userFactory,
        campaignFactory,
    }) => {
        // Create brand and campaigns with different reputation requirements
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

        // Create influencer with medium reputation
        const influencer = await userFactory.createInfluencer({
            reputationScore: 60,
        });

        // Login as influencer
        await page.goto('/login');
        await page.fill('[data-testid="email-input"]', influencer.email);
        await page.fill('[data-testid="password-input"]', 'password123');
        await page.click('[data-testid="login-button"]');

        // Browse marketplace
        await page.goto('/marketplace');

        // Should see low rep campaign (60 > 40)
        await expect(page.locator(`[data-testid="campaign-${lowRepCampaign.id}"]`)).toBeVisible();

        // Should NOT see high rep campaign (60 < 80)
        await expect(page.locator(`[data-testid="campaign-${highRepCampaign.id}"]`)).not.toBeVisible();
    });

    test('should send collaboration request from influencer to brand', async ({
        page,
        userFactory,
        campaignFactory,
    }) => {
        // Setup campaign
        const brand = await userFactory.createBrand();
        const campaign = await campaignFactory.createCampaign({
            brandId: brand.id,
            budget: 10000,
            minReputationScore: 50,
        });

        // Create qualified influencer
        const influencer = await userFactory.createInfluencer({
            reputationScore: 75,
        });

        // Login as influencer
        await page.goto('/login');
        await page.fill('[data-testid="email-input"]', influencer.email);
        await page.fill('[data-testid="password-input"]', 'password123');
        await page.click('[data-testid="login-button"]');

        // View campaign
        await page.goto(`/campaigns/${campaign.id}`);

        // Send collaboration request
        await page.click('[data-testid="request-collaboration"]');
        await page.fill('[data-testid="collaboration-message"]', 'I would love to collaborate!');
        await page.fill('[data-testid="proposed-rate"]', '1500');
        await page.click('[data-testid="submit-collaboration-request"]');

        // Assert request sent
        await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
        await expect(page.locator('[data-testid="collaboration-status"]')).toHaveText('Pending');
    });
});

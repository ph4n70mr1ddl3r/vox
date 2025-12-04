import { APIRequestContext } from '@playwright/test';
import { faker } from '@faker-js/faker';
import { User } from './user-factory';

/**
 * Campaign Factory for vox marketplace testing
 * 
 * Creates test campaigns with brand owners and automatically
 * tracks them for cleanup after test completion.
 * 
 * Supports:
 * - Campaign creation with customizable budgets
 * - Category and niche targeting
 * - Reputation requirements
 * - Auto-cleanup of created campaigns
 */

export interface CreateCampaignOptions {
    brandId: string;
    title?: string;
    description?: string;
    budget?: number;
    category?: string;
    niches?: string[];
    minReputationScore?: number;
    maxInfluencers?: number;
    startDate?: Date;
    endDate?: Date;
}

export interface Campaign {
    id: string;
    brandId: string;
    title: string;
    description: string;
    budget: number;
    category: string;
    niches: string[];
    minReputationScore: number;
    maxInfluencers: number;
    status: 'draft' | 'active' | 'completed' | 'cancelled';
    startDate: string;
    endDate: string;
}

export class CampaignFactory {
    private request: APIRequestContext;
    private createdCampaignIds: string[] = [];
    private baseURL: string;

    constructor(request: APIRequestContext) {
        this.request = request;
        this.baseURL = process.env.API_URL || 'http://localhost:3000/api';
    }

    /**
     * Create a test campaign
     * 
     * @example
     * const brand = await userFactory.createBrand();
     * const campaign = await campaignFactory.createCampaign({
     *   brandId: brand.id,
     *   budget: 5000,
     *   minReputationScore: 70
     * });
     */
    async createCampaign(options: CreateCampaignOptions): Promise<Campaign> {
        const campaignData = {
            brandId: options.brandId,
            title: options.title || faker.company.catchPhrase(),
            description: options.description || faker.lorem.paragraph(),
            budget: options.budget ?? faker.number.int({ min: 1000, max: 50000 }),
            category: options.category || faker.helpers.arrayElement(['beauty', 'fashion', 'tech', 'food', 'fitness']),
            niches: options.niches || [faker.word.adjective(), faker.word.noun()],
            minReputationScore: options.minReputationScore ?? 50,
            maxInfluencers: options.maxInfluencers ?? 10,
            startDate: options.startDate || new Date(),
            endDate: options.endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        };

        try {
            const response = await this.request.post(`${this.baseURL}/campaigns`, {
                data: campaignData,
            });

            if (!response.ok()) {
                throw new Error(`Failed to create campaign: ${response.status()} ${await response.text()}`);
            }

            const campaign = await response.json();
            this.createdCampaignIds.push(campaign.id);

            return campaign;
        } catch (error) {
            console.error('CampaignFactory.createCampaign failed:', error);
            throw error;
        }
    }

    /**
     * Create multiple campaigns for a brand
     */
    async createCampaigns(count: number, options: CreateCampaignOptions): Promise<Campaign[]> {
        const campaigns: Campaign[] = [];
        for (let i = 0; i < count; i++) {
            campaigns.push(await this.createCampaign(options));
        }
        return campaigns;
    }

    /**
     * Update campaign status
     */
    async updateStatus(campaignId: string, status: Campaign['status']): Promise<Campaign> {
        const response = await this.request.patch(`${this.baseURL}/campaigns/${campaignId}`, {
            data: { status },
        });

        if (!response.ok()) {
            throw new Error(`Failed to update campaign status: ${response.status()}`);
        }

        return response.json();
    }

    /**
     * Cleanup: Delete all campaigns created during the test
     * Called automatically by fixture after test completion
     */
    async cleanup(): Promise<void> {
        const deletePromises = this.createdCampaignIds.map(async (campaignId) => {
            try {
                await this.request.delete(`${this.baseURL}/campaigns/${campaignId}`);
            } catch (error) {
                console.warn(`Failed to delete campaign ${campaignId}:`, error);
            }
        });

        await Promise.all(deletePromises);
        this.createdCampaignIds = [];
    }
}

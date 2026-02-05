import { APIRequestContext } from '@playwright/test';
import { faker } from '@faker-js/faker';
import { DEFAULT_API_URL, DEFAULT_MIN_REPUTATION_SCORE, DEFAULT_MAX_INFLUENCERS, CAMPAIGN_CATEGORIES, CAMPAIGN_STATUSES, CAMPAIGN_DEFAULT_DURATION_DAYS } from '../constants';
import { cleanupResources, type CleanupResult } from '../utils/cleanup';

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
    status: typeof CAMPAIGN_STATUSES[number];
    startDate: string;
    endDate: string;
}

export class CampaignFactory {
    private request: APIRequestContext;
    private createdCampaignIds: string[] = [];
    private baseURL: string;

    constructor(request: APIRequestContext) {
        this.request = request;
        this.baseURL = process.env.API_URL || DEFAULT_API_URL;
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
            category: options.category || faker.helpers.arrayElement(CAMPAIGN_CATEGORIES),
            niches: options.niches || [faker.word.adjective(), faker.word.noun()],
            minReputationScore: options.minReputationScore ?? DEFAULT_MIN_REPUTATION_SCORE,
            maxInfluencers: options.maxInfluencers ?? DEFAULT_MAX_INFLUENCERS,
            startDate: options.startDate || new Date(),
            endDate: options.endDate || new Date(Date.now() + CAMPAIGN_DEFAULT_DURATION_DAYS * 24 * 60 * 60 * 1000),
        };

        try {
            const response = await this.request.post(`${this.baseURL}/campaigns`, {
                data: campaignData,
            });

            if (!response.ok()) {
                const errorText = await response.text();
                throw new Error(`Failed to create campaign for brand ${options.brandId}: ${response.status()} ${errorText}`);
            }

            const campaign = await response.json();
            this.createdCampaignIds.push(campaign.id);

            return campaign;
        } catch (error) {
            if (error instanceof Error) {
                console.error(`CampaignFactory.createCampaign failed for brand ${options.brandId}:`, error.message);
            }
            throw error;
        }
    }

    async createCampaigns(count: number, options: CreateCampaignOptions): Promise<Campaign[]> {
        return Promise.all(Array(count).fill(null).map(() => this.createCampaign(options)));
    }

    /**
     * Update campaign status
     */
    async updateStatus(campaignId: string, status: Campaign['status']): Promise<Campaign> {
        try {
            const response = await this.request.patch(`${this.baseURL}/campaigns/${campaignId}`, {
                data: { status },
            });

            if (!response.ok()) {
                const errorText = await response.text();
                throw new Error(`Failed to update campaign status for ${campaignId} to ${status}: ${response.status()} ${errorText}`);
            }

            return response.json();
        } catch (error) {
            if (error instanceof Error) {
                console.error(`CampaignFactory.updateStatus failed for ${campaignId}:`, error.message);
            }
            throw error;
        }
    }

    /**
     * Cleanup: Delete all campaigns created during the test
     * Called automatically by fixture after test completion
     */
    async cleanup(): Promise<CleanupResult<string>> {
        const result = await cleanupResources(
            this.createdCampaignIds,
            async (campaignId) => {
                const response = await this.request.delete(`${this.baseURL}/campaigns/${campaignId}`);
                if (!response.ok()) {
                    throw new Error(`Failed to delete campaign ${campaignId}: ${response.status()} ${await response.text()}`);
                }
            },
            'campaign'
        );
        this.createdCampaignIds = [];
        return result;
    }
}

import { Context } from 'hono';
import prisma from '../config/prisma';
import { ApiResponse } from '../utils/ApiResponse';
import { cacheService } from '../services/cache/cacheService';
import { CacheKeys } from '../services/cache/cacheKeys';
import { CacheTTL } from '../services/cache/cacheTTL';

export const getOnboardingOptions = async (c: Context) => {
  try {
    const cachedOptions = await cacheService.getOrLoad(
      CacheKeys.metadataOptions(),
      CacheTTL.metadataOptions,
      async () => {
        const records = await prisma.onboarding_master_options.findMany({
          where: { is_active: true },
          orderBy: [
            { category: 'asc' },
            { sort_order: 'asc' }
          ]
        });

        const grouped: Record<string, any[]> = {};
        for (const record of records) {
          if (!grouped[record.category]) {
            grouped[record.category] = [];
          }
          grouped[record.category].push({
            key: record.option_key,
            label: record.label_en,
            labelTa: record.label_ta || record.label_en,
            sortOrder: record.sort_order
          });
        }

        return {
          educationLevels: grouped['EDUCATION'] || [],
          degrees: grouped['DEGREE'] || [],
          schoolMediums: grouped['SCHOOL_MEDIUM'] || [],
          englishProficiencies: grouped['ENGLISH_LEVEL'] || [],
          disabilityTypes: grouped['DISABILITY_TYPE'] || [],
          disabilityAreas: grouped['DISABILITY_AREA'] || [],
          disabilityReasons: grouped['DISABILITY_REASON'] || [],
          languages: grouped['LANGUAGE'] || [],
          experienceLevels: grouped['EXPERIENCE_LEVEL'] || [],
          popularJobRoles: grouped['ROLE'] || [],
          popularSkills: grouped['SKILL'] || []
        };
      }
    );

    return c.json(ApiResponse.ok(cachedOptions));
  } catch (err: any) {
    console.error('Error in getOnboardingOptions:', err);
    return c.json(ApiResponse.error(err.message), 500 as any);
  }
};

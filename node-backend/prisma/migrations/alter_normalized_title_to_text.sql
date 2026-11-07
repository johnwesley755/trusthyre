-- Migration: Alter employer_lead_requirements normalized_title to TEXT
-- Enables storing rich additional JSON details and long titles without column length overflow

ALTER TABLE "employer_lead_requirements" 
ALTER COLUMN "normalized_title" TYPE TEXT;


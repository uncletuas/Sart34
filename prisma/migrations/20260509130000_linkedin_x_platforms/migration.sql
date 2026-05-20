-- Add LinkedIn and X to the supported platforms and integration providers
ALTER TYPE "Platform" ADD VALUE IF NOT EXISTS 'LINKEDIN';
ALTER TYPE "Platform" ADD VALUE IF NOT EXISTS 'X';
ALTER TYPE "IntegrationProvider" ADD VALUE IF NOT EXISTS 'LINKEDIN';
ALTER TYPE "IntegrationProvider" ADD VALUE IF NOT EXISTS 'X';

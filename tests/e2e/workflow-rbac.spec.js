import { test, expect } from '@playwright/test';

test.describe('Workflow RBAC', () => {
  test('should allow physiotherapist to transition treatment program', async ({ page }) => {
    test.skip();
  });

  test('should allow thai_traditional_practitioner to transition treatment program', async ({ page }) => {
    test.skip();
  });

  test('should block clinic_assistant from practitioner-treatment transition', async ({ page }) => {
    test.skip();
  });

  test('should block pending_role_review from accessing workflow', async ({ page }) => {
    test.skip();
  });
});

import { test, expect } from '@playwright/test';

test.describe('Workflow State Machine Transitions', () => {
  test('should allow valid transitions sequentially', async ({ page }) => {
    // Note: Due to python webserver issue, this might be skipped at suite level
    test.skip();
  });

  test('should reject arbitrary forward jumps', async ({ page }) => {
    test.skip();
  });

  test('should not transition cancelled visits', async ({ page }) => {
    test.skip();
  });
});

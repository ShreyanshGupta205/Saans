import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Saans (साँस) Application Test Suite', () => {
  test('Happy Path: Complete onboarding, view dashboard, plan, chat, and community pack', async ({
    page,
  }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.locator('header').waitFor();
    await page.waitForTimeout(500);

    // 1. Open Onboarding Profile Modal via Header
    const profileBtn = page.getByRole('button', { name: /Edit household profile/i });
    await expect(profileBtn).toBeVisible();
    await profileBtn.click();

    // Verify modal is visible
    const modal = page.locator('div[role="dialog"]');
    await expect(modal).toBeVisible();

    // Select a popular Indian city (e.g. Noida)
    const noidaBtn = page.getByRole('button', { name: 'Noida', exact: true });
    if (await noidaBtn.isVisible()) {
      await noidaBtn.click();
    }

    // Save profile
    await page.getByRole('button', { name: /Save & View Dashboard|सुरक्षित करें/i }).click();
    await expect(modal).toBeHidden();

    // 2. Today Dashboard is rendered with 24h forecast
    await expect(
      page.getByRole('heading', { level: 2, name: /Next-24h Hourly Forecast|अगले 24 घंटों का पूर्वानुमान/i })
    ).toBeVisible();

    // 3. Switch to Personalised Plan tab
    await page.getByRole('button', { name: /Personalised Plan|कार्य योजना/i }).click();
    await expect(
      page.getByRole('heading', { name: /Personalised Clean Air Plan|आपकी व्यक्तिगत स्वच्छ वायु योजना/i })
    ).toBeVisible();

    // 4. Switch to Ask Saans Chat tab
    await page.getByRole('button', { name: /Ask Saans Chat|साँस से पूछें/i }).click();
    await expect(page.getByPlaceholder(/Ask anything about masks|मास्क, प्यूरीफायर/i)).toBeVisible();

    // 5. Switch to Community Mode tab
    await page.getByRole('button', { name: /Community Mode|सोसाइटी मोड/i }).click();
    await expect(
      page.getByRole('heading', { name: /Community Mode: Neighbourhood Action Pack|सोसाइटी मोड: पड़ोस कार्य योजना/i })
    ).toBeVisible();
    await expect(
      page.getByLabel(/Number of Participating Households|सोसाइटी में भाग लेने वाले परिवारों की संख्या/i)
    ).toBeVisible();
  });

  test('Keyboard Navigation & Accessible Skip Link', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.locator('header').waitFor();

    // Tab to skip link
    await page.keyboard.press('Tab');
    const skipLink = page.getByRole('link', { name: /Skip to main content|मुख्य सामग्री पर जाएं/i });
    await expect(skipLink).toBeFocused();

    // Activate skip link
    await page.keyboard.press('Enter');
    const mainContent = page.locator('#main-content');
    await expect(mainContent).toBeFocused();
  });

  test('Bilingual Language Switch (EN <-> HI)', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.locator('header').waitFor();
    await page.waitForTimeout(500);

    // Default language is English (lang="en")
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');

    // Click language toggle to switch to Hindi
    const langToggle = page.getByRole('button', { name: /Switch language to हिंदी/i });
    await expect(langToggle).toBeVisible();
    await langToggle.click();

    // Verify html lang updated to "hi"
    await expect(page.locator('html')).toHaveAttribute('lang', 'hi');
    await expect(page.locator('header').getByText('साँस', { exact: true })).toBeVisible();

    // Switch back to English
    const enToggle = page.getByRole('button', { name: /Switch language to English/i });
    await expect(enToggle).toBeVisible();
    await enToggle.click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  });

  test('Degraded Mode Fallback (Simulated API Outage)', async ({ page }) => {
    // Intercept internal /api/aqi and simulate upstream failure
    await page.route('**/api/aqi*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'X-Degraded-Mode': 'true' },
        body: JSON.stringify({
          aqiResult: {
            aqi: 220,
            dominantPollutant: 'pm25',
            category: 'Poor',
            categoryHi: 'खराब',
            healthAdvisoryEn: 'Breathing discomfort to most people.',
            healthAdvisoryHi: 'अधिकांश लोगों को परेशानी हो सकती है।',
            pollutantBreakdown: {},
            whoMultiples: { pm25: 14.5 },
            timestamp: new Date().toISOString(),
            isEmergency: false,
          },
          hourlyForecast: [],
          outdoorWindow: {
            startHour: 13,
            endHour: 15,
            startTimeLabel: '1:00 PM',
            endTimeLabel: '3:00 PM',
            avgPm25: 140,
            minPm25: 120,
            isSafeWindow: false,
            recommendationEn: 'Shift errands to 1:00 PM - 3:00 PM.',
            recommendationHi: 'दोपहर में निकलें।',
            ventilationDurationMinutes: 10,
          },
          isDegraded: true,
          degradedReason: 'Simulated Upstream Down',
        }),
      });
    });

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.locator('header').waitFor();

    // Verify Degraded Mode Alert Banner is present and active
    const degradedBanner = page.locator('div[role="status"]');
    await expect(degradedBanner).toBeVisible();
    await expect(degradedBanner).toContainText(/Degraded \/ Offline Rule Mode Active|Rule Mode/i);
  });

  test('Axe Automated WCAG 2.2 AA Accessibility Audit', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.locator('header').waitFor();

    // Run Axe automated accessibility audit on Today Dashboard
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });
});

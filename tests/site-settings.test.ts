import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_MAINTENANCE_SETTINGS,
  getMaintenanceSettings,
  updateMaintenanceSettings,
  toggleMaintenanceMode,
  DEFAULT_BRANDING_SETTINGS,
  getBrandingSettings,
  updateBrandingSettings,
} from '../lib/site-settings';

test('DEFAULT_MAINTENANCE_SETTINGS fails open, not closed', () => {
  // If the row is missing or unreadable the site must stay up: a placeholder
  // served in place of content is worse than a slightly stale page.
  assert.equal(DEFAULT_MAINTENANCE_SETTINGS.enabled, false);
  assert.equal(DEFAULT_MAINTENANCE_SETTINGS.mode, 'COMING_SOON');
  assert.ok(DEFAULT_MAINTENANCE_SETTINGS.title.length > 0);
  assert.ok(DEFAULT_MAINTENANCE_SETTINGS.subtitle.length > 0);
  assert.equal(typeof DEFAULT_MAINTENANCE_SETTINGS.socialLinks, 'object');
});

test('DEFAULT_BRANDING_SETTINGS has safe defaults', () => {
  assert.equal(DEFAULT_BRANDING_SETTINGS.faviconUrl, null);
  assert.equal(DEFAULT_BRANDING_SETTINGS.ogImageUrl, null);
});

test('updateBrandingSettings persists custom favicon and og image', async () => {
  /*
   * These tests write to whichever database the environment points at — which
   * includes production, because deploy/update.sh runs `npm test`. Snapshot the
   * existing row and restore it in a finally, so running the suite can never
   * leave a live site without its favicon and social-share image.
   */
  const before = await getBrandingSettings();

  try {
    const updated = await updateBrandingSettings({
      faviconUrl: 'https://r2.esportsamaze.com/favicon-custom.png',
      ogImageUrl: 'https://r2.esportsamaze.com/og-banner.webp',
    });
    assert.equal(updated.faviconUrl, 'https://r2.esportsamaze.com/favicon-custom.png');
    assert.equal(updated.ogImageUrl, 'https://r2.esportsamaze.com/og-banner.webp');

    const fetched = await getBrandingSettings();
    assert.equal(fetched.faviconUrl, 'https://r2.esportsamaze.com/favicon-custom.png');
    assert.equal(fetched.ogImageUrl, 'https://r2.esportsamaze.com/og-banner.webp');

    // Test reset/remove
    const reset = await updateBrandingSettings({
      faviconUrl: null,
      ogImageUrl: null,
    });
    assert.equal(reset.faviconUrl, null);
    assert.equal(reset.ogImageUrl, null);

    const finalCheck = await getBrandingSettings();
    assert.equal(finalCheck.faviconUrl, null);
    assert.equal(finalCheck.ogImageUrl, null);
  } finally {
    await updateBrandingSettings(before);
  }
});

test('updateMaintenanceSettings and toggleMaintenanceMode persist correctly', async () => {
  // Same reasoning as the branding test: this row governs whether the public
  // site is visible at all, so snapshot it and put it back afterwards.
  const before = await getMaintenanceSettings();

  try {
    // Test toggle ON
    const enabledResult = await toggleMaintenanceMode(true);
    assert.equal(enabledResult.enabled, true);

    // Fetch should reflect enabled
    const fetched = await getMaintenanceSettings();
    assert.equal(fetched.enabled, true);

    // Update specific fields
    const updated = await updateMaintenanceSettings({
      mode: 'COMING_SOON',
      title: 'Custom Launch Test Title',
    });
    assert.equal(updated.mode, 'COMING_SOON');
    assert.equal(updated.title, 'Custom Launch Test Title');
    assert.equal(updated.enabled, true);

    // Test toggle OFF
    const disabledResult = await toggleMaintenanceMode(false);
    assert.equal(disabledResult.enabled, false);

    const finalCheck = await getMaintenanceSettings();
    assert.equal(finalCheck.enabled, false);
  } finally {
    await updateMaintenanceSettings(before);
  }
});


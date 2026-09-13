import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_MAINTENANCE_SETTINGS,
  getMaintenanceSettings,
  updateMaintenanceSettings,
  toggleMaintenanceMode,
} from '../lib/site-settings';

test('DEFAULT_MAINTENANCE_SETTINGS has safe defaults', () => {
  assert.equal(DEFAULT_MAINTENANCE_SETTINGS.enabled, false);
  assert.equal(DEFAULT_MAINTENANCE_SETTINGS.mode, 'MAINTENANCE');
  assert.ok(DEFAULT_MAINTENANCE_SETTINGS.title.length > 0);
  assert.ok(DEFAULT_MAINTENANCE_SETTINGS.subtitle.length > 0);
  assert.equal(typeof DEFAULT_MAINTENANCE_SETTINGS.socialLinks, 'object');
});

test('updateMaintenanceSettings and toggleMaintenanceMode persist correctly', async () => {
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
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  capabilitiesForRoles,
  capabilityForAdminPath,
  canAccessAdminPath,
  hasCapabilityIn,
  isValidUsername,
  type Capability,
} from '../lib/admin-permissions';

test('OWNER holds every capability', () => {
  const caps = capabilitiesForRoles(['OWNER']);
  const expected: Capability[] = [
    'news',
    'comments',
    'tags',
    'media',
    'data',
    'analytics',
    'settings',
    'users',
    'destructive',
  ];
  for (const capability of expected) {
    assert.equal(caps.has(capability), true, capability);
  }
});

test('EDITOR is scoped to the editorial areas', () => {
  assert.equal(hasCapabilityIn(['EDITOR'], 'news'), true);
  assert.equal(hasCapabilityIn(['EDITOR'], 'comments'), true);
  assert.equal(hasCapabilityIn(['EDITOR'], 'tags'), true);
  assert.equal(hasCapabilityIn(['EDITOR'], 'media'), true);
  assert.equal(hasCapabilityIn(['EDITOR'], 'data'), false);
  assert.equal(hasCapabilityIn(['EDITOR'], 'analytics'), false);
  assert.equal(hasCapabilityIn(['EDITOR'], 'settings'), false);
  assert.equal(hasCapabilityIn(['EDITOR'], 'users'), false);
  assert.equal(hasCapabilityIn(['EDITOR'], 'destructive'), false);
});

test('DATA is scoped to the circuit, not news or owner areas', () => {
  assert.equal(hasCapabilityIn(['DATA'], 'data'), true);
  assert.equal(hasCapabilityIn(['DATA'], 'media'), true);
  assert.equal(hasCapabilityIn(['DATA'], 'news'), false);
  assert.equal(hasCapabilityIn(['DATA'], 'analytics'), false);
  assert.equal(hasCapabilityIn(['DATA'], 'settings'), false);
  // Deleting is the owner's alone, even for the role that owns the circuit.
  assert.equal(hasCapabilityIn(['DATA'], 'destructive'), false);
});

test('holding both roles is the union of their capabilities', () => {
  assert.equal(hasCapabilityIn(['EDITOR', 'DATA'], 'news'), true);
  assert.equal(hasCapabilityIn(['EDITOR', 'DATA'], 'data'), true);
  assert.equal(hasCapabilityIn(['EDITOR', 'DATA'], 'settings'), false);
});

test('dashboard is granted to any signed-in account', () => {
  assert.equal(hasCapabilityIn([], 'dashboard'), true);
  assert.equal(hasCapabilityIn(['EDITOR'], 'dashboard'), true);
});

test('unknown roles grant nothing beyond the dashboard', () => {
  assert.equal(hasCapabilityIn(['GHOST'], 'news'), false);
  assert.equal(hasCapabilityIn(['GHOST'], 'dashboard'), true);
});

test('the path capability uses the longest matching prefix', () => {
  assert.equal(capabilityForAdminPath('/admin/settings'), 'settings');
  assert.equal(capabilityForAdminPath('/admin/analytics/whatever'), 'analytics');
  assert.equal(capabilityForAdminPath('/admin/matches/matrix'), 'data');
  assert.equal(capabilityForAdminPath('/admin/news'), 'news');
  assert.equal(capabilityForAdminPath('/admin/users'), 'users');
  assert.equal(capabilityForAdminPath('/admin/trash'), 'destructive');
  assert.equal(capabilityForAdminPath('/admin'), 'dashboard');
  assert.equal(capabilityForAdminPath('/admin/unknown'), 'dashboard');
});

test('a role cannot open a path outside its capabilities', () => {
  assert.equal(canAccessAdminPath(['EDITOR'], '/admin/news'), true);
  assert.equal(canAccessAdminPath(['EDITOR'], '/admin/tournaments'), false);
  assert.equal(canAccessAdminPath(['EDITOR'], '/admin/settings'), false);
  assert.equal(canAccessAdminPath(['DATA'], '/admin/matches/matrix'), true);
  assert.equal(canAccessAdminPath(['DATA'], '/admin/home'), false);
  assert.equal(canAccessAdminPath(['EDITOR', 'DATA'], '/admin/analytics'), false);
  // Only an owner reaches the trash.
  assert.equal(canAccessAdminPath(['DATA'], '/admin/trash'), false);
  assert.equal(canAccessAdminPath(['OWNER'], '/admin/trash'), true);
});

test('username validation', () => {
  assert.equal(isValidUsername('priya'), true);
  assert.equal(isValidUsername('priya.sharma-01'), true);
  assert.equal(isValidUsername('ab'), false);
  assert.equal(isValidUsername('Priya'), false);
  assert.equal(isValidUsername('pri ya'), false);
  assert.equal(isValidUsername(''), false);
});

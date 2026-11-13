import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import app from '../src/app';
import prisma from '../src/config/prisma';

describe('SEO & Prerender Canonical & Hierarchy Test Suite', () => {
  const testJobId = 'a0000000-0000-4000-a000-000000000099';
  const testEmployerId = 'e0000000-0000-4000-a000-000000000099';

  beforeAll(async () => {
    // 1. Setup employer metadata and profile
    await prisma.user_metadata.upsert({
      where: { id: testEmployerId },
      update: { first_name: 'Metro', last_name: 'Infrastructure', email: 'seo.employer@example.com', role: 'EMPLOYER' },
      create: {
        id: testEmployerId,
        first_name: 'Metro',
        last_name: 'Infrastructure',
        email: 'seo.employer@example.com',
        role: 'EMPLOYER'
      }
    });

    await prisma.employer_profiles.upsert({
      where: { user_id: testEmployerId },
      update: { company_name: 'Metro Infrastructure Ltd' },
      create: {
        id: testEmployerId,
        user_id: testEmployerId,
        company_name: 'Metro Infrastructure Ltd',
      }
    });

    // 2. Create or upsert test job
    await prisma.jobs.upsert({
      where: { id: testJobId },
      update: {
        title: 'Master Electrician',
        description: 'Industrial 3-phase wiring and motor troubleshooting specialist needed in Guindy.',
        employer_name: 'Metro Infrastructure Ltd',
        city: 'Chennai',
        location: 'Guindy',
        address: 'Thiru Vi Ka Industrial Estate, Guindy, Chennai',
        budget: 35000,
        payout_frequency: 'MONTHLY',
        status: 'ACTIVE',
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
      create: {
        id: testJobId,
        employer_id: testEmployerId,
        title: 'Master Electrician',
        description: 'Industrial 3-phase wiring and motor troubleshooting specialist needed in Guindy.',
        employer_name: 'Metro Infrastructure Ltd',
        city: 'Chennai',
        location: 'Guindy',
        address: 'Thiru Vi Ka Industrial Estate, Guindy, Chennai',
        budget: 35000,
        payout_frequency: 'MONTHLY',
        status: 'ACTIVE',
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      }
    });
  });

  afterAll(async () => {
    // Cleanup
    await prisma.jobs.deleteMany({ where: { id: testJobId } });
    await prisma.employer_profiles.deleteMany({ where: { user_id: testEmployerId } });
    await prisma.user_metadata.deleteMany({ where: { id: testEmployerId } });
  });

  it('1. Prerender returns 200 OK with exact job-specific canonical URL and Schema.org for hierarchical path', async () => {
    const hierarchicalPath = `/chennai/master-electrician-in-guindy/job/${testJobId}`;
    const req = new Request(`http://localhost/api/seo/prerender?path=${encodeURIComponent(hierarchicalPath)}`, {
      method: 'GET',
    });

    const res = await app.fetch(req, process.env, {});
    expect(res.status).toBe(200);

    const html = await res.text();
    // Verify canonical tag matches the exact hierarchical job URL
    const expectedCanonical = `https://trusthyre.com/chennai/master-electrician-in-guindy/job/${testJobId}`;
    expect(html).toContain(`<link rel="canonical" href="${expectedCanonical}">`);
    
    // Verify page title and meta description
    expect(html).toContain('<title>Master Electrician | Chennai | TrustHyre Verified Jobs</title>');
    
    // Verify JobPosting Schema.org JSON-LD
    expect(html).toContain('"@type": "JobPosting"');
    expect(html).toContain('"title": "Master Electrician"');
    expect(html).toContain('"name": "Metro Infrastructure Ltd"');
    expect(html).toContain('"currency": "INR"');
    expect(html).toContain('"value": 35000');
    expect(html).toContain('"unitText": "MONTH"');
  });

  it('2. Prerender 301 redirects legacy /job/:id to the canonical hierarchical path', async () => {
    const legacyPath = `/job/${testJobId}`;
    const req = new Request(`http://localhost/api/seo/prerender?path=${encodeURIComponent(legacyPath)}`, {
      method: 'GET',
    });

    const res = await app.fetch(req, process.env, {});
    expect(res.status).toBe(301);

    const locationHeader = res.headers.get('Location');
    const expectedCanonical = `https://trusthyre.com/chennai/master-electrician-in-guindy/job/${testJobId}`;
    expect(locationHeader).toBe(expectedCanonical);
  });

  it('3. Prerender returns 410 Gone with noindex for closed or expired jobs', async () => {
    // Temporarily update job to EXPIRED
    await (prisma as any).jobs.update({
      where: { id: testJobId },
      data: { status: 'EXPIRED' }
    });

    const hierarchicalPath = `/chennai/master-electrician-in-guindy/job/${testJobId}`;
    const req = new Request(`http://localhost/api/seo/prerender?path=${encodeURIComponent(hierarchicalPath)}`, {
      method: 'GET',
    });

    const res = await app.fetch(req, process.env, {});
    expect(res.status).toBe(410);

    const html = await res.text();
    expect(html).toContain('<meta name="robots" content="noindex, nofollow">');
    expect(html).toContain('This job opening has closed');

    // Restore to ACTIVE
    await (prisma as any).jobs.update({
      where: { id: testJobId },
      data: { status: 'ACTIVE' }
    });
  });

  it('4. Sitemap includes the hierarchical canonical job URL', async () => {
    const req = new Request('http://localhost/sitemap.xml', {
      method: 'GET',
    });

    const res = await app.fetch(req, process.env, {});
    expect(res.status).toBe(200);

    const xml = await res.text();
    const expectedUrl = `https://trusthyre.com/chennai/master-electrician-in-guindy/job/${testJobId}`;
    expect(xml).toContain(`<loc>${expectedUrl}</loc>`);
    expect(xml).not.toContain(`<loc>https://trusthyre.com/job/${testJobId}</loc>`);
  });
});

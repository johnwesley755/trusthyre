import { prisma } from '../src/config/prisma';

async function seedBlog() {
  console.log('[Seed] Seeding TrustHyre Blog Categories & Articles...');

  // 1. Create or Upsert Categories
  const categoriesData = [
    {
      name: 'Skilled Trades & Technicians',
      slug: 'trade-jobs',
      description: 'Career guides, license criteria, and hiring standards for electricians, plumbers, HVAC technicians, and carpenters.',
      color: '#059669',
      sort_order: 1,
    },
    {
      name: 'Logistics & Warehouse Staff',
      slug: 'logistics-operations',
      description: 'Fleet management, delivery driver hiring, warehouse fulfillment, and 3PL staffing solutions in India.',
      color: '#D97706',
      sort_order: 2,
    },
    {
      name: 'Hiring & Compliance Playbooks',
      slug: 'hiring-guides',
      description: 'Best practices for attendance tracking, photo check-in verification, wage structures, and blue-collar retention.',
      color: '#2563EB',
      sort_order: 3,
    },
  ];

  const categoryMap = new Map<string, string>();

  for (const cat of categoriesData) {
    const existing = await (prisma as any).blog_categories.findUnique({
      where: { slug: cat.slug },
    });

    if (existing) {
      categoryMap.set(cat.slug, existing.id);
    } else {
      const created = await (prisma as any).blog_categories.create({
        data: cat,
      });
      categoryMap.set(cat.slug, created.id);
    }
  }

  // 2. Seed Articles
  const articles = [
    {
      slug: 'electrician-hiring-guide-chennai',
      title: 'Electrician Jobs & Hiring in Chennai: Required Skills, Safety Certifications, and Standard Rates (2026 Guide)',
      excerpt: 'A comprehensive employer and candidate guide to hiring licensed electricians in Chennai, covering wireman licenses, ITI certifications, safety standards, and wage benchmarks.',
      categoryId: categoryMap.get('trade-jobs'),
      coverImageUrl: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?q=80&w=1200&auto=format&fit=crop',
      authorName: 'Senthil Nathan',
      authorRole: 'Trade Operations Lead, TrustHyre',
      targetCity: 'Chennai',
      targetTrade: 'Electrician',
      tags: ['Electrician', 'Chennai', 'Skilled Trades', 'Hiring Guide', 'Tamil Nadu'],
      readTimeMinutes: 6,
      metaTitle: 'Electrician Jobs & Hiring in Chennai (2026 Guide) | TrustHyre',
      metaDescription: 'Complete checklist for hiring licensed electricians in Chennai. Learn government wireman license criteria, standard daily wages, and verified candidate onboarding.',
      content: `## 1. The Growing Demand for Verified Electricians in Chennai

Chennai's industrial corridors—from Ambattur and Guindy to Sriperumbudur and OMR—are witnessing unprecedented commercial expansion. As manufacturing facilities, residential townships, and IT parks expand, commercial developers and facility management firms face a persistent bottleneck: **finding licensed, safety-compliant electricians**.

Unverified electrical hires risk catastrophic downtime, short-circuit fires, and labor compliance violations. This playbook covers everything hiring managers and skilled technicians must know about hiring in Chennai.

---

## 2. Mandatory Licenses and Certifications in Tamil Nadu

Unlike informal daily-wage labor, electrical work requires certified technical competence. Employers should verify at least one of the following credentials before hiring:

- **Tamil Nadu Electrical Licensing Board (TNEB / TNELB) Wireman License**: Issued under government regulation, certifying that the candidate has completed supervised apprenticeship and understands single-phase and three-phase safety procedures.
- **ITI Electrician Certificate (NCVT/SCVT)**: A 2-year National Trade Certificate covering wiring, motor controls, transformer maintenance, and earthing protocols.
- **Safety Induction & PPE Compliance**: Understanding of arc-flash protection, insulated tool ratings (1000V), and Lockout/Tagout (LOTO) protocols.

> **TrustHyre Standard**: All electricians listed on TrustHyre undergo government ID validation and physical trade skill verification before employer matching.

---

## 3. Standard Wage Benchmarks in Chennai (2026 Rates)

Understanding regional compensation ensures rapid hiring and low turnover:

- **Apprentice / Helper Electrician**: ₹650 – ₹800 per day (₹18,000 – ₹22,000/month)
- **Certified Journeyman Electrician**: ₹900 – ₹1,200 per day (₹24,000 – ₹30,000/month)
- **Industrial Panel / Substation Specialist**: ₹1,300 – ₹1,800 per day (₹32,000 – ₹42,000/month)

---

## 4. Employer Interview & Trade Test Checklist

Before dispatching an electrician to an active project site, evaluate these four practical questions:

1. *Can you explain how to perform an insulation resistance (Megger) test on a 3-phase induction motor?*
2. *What is the standard earthing resistance limit for residential vs commercial installations under Indian Electricity Rules (Rule 61)?*
3. *Demonstrate how you wire an MCB, RCCB, and changeover switch in a distribution board.*
4. *What emergency procedure do you follow if a co-worker experiences an electric shock?*

---

## 5. How TrustHyre Eliminates Absenteeism

A major challenge for Chennai facility managers is sudden technician absenteeism. TrustHyre solves this through:
- **Photo Check-In with Geofencing**: Workers clock in on-site with GPS-validated selfie check-in.
- **Instant Replacement Dispatch**: If an assigned electrician fails to check in within 30 minutes of shift start, TrustHyre automatically alerts standby certified workers in the same zone.`,
    },
    {
      slug: 'hiring-delivery-drivers-warehouse-staff-chennai',
      title: 'Hiring Delivery Drivers & Warehouse Staff in Chennai: Complete Employer Compliance & Verification Checklist',
      excerpt: 'How 3PL logistics, e-commerce hubs, and retail businesses in Chennai can hire verified delivery fleets and warehouse personnel while mitigating theft and absenteeism.',
      categoryId: categoryMap.get('logistics-operations'),
      coverImageUrl: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?q=80&w=1200&auto=format&fit=crop',
      authorName: 'Karthik Raman',
      authorRole: 'Logistics Staffing Specialist',
      targetCity: 'Chennai',
      targetTrade: 'Warehouse Staff',
      tags: ['Delivery Drivers', 'Warehouse Logistics', 'Chennai', 'Fleet Staffing'],
      readTimeMinutes: 5,
      metaTitle: 'Hiring Delivery Drivers & Warehouse Staff in Chennai | TrustHyre',
      metaDescription: 'Essential guide for hiring delivery executives and warehouse pickers in Chennai. Includes vehicle verification, police verification, and attendance tracking.',
      content: `## 1. The Last-Mile Staffing Crunch in Chennai

With major e-commerce fulfillment hubs concentrated around Red Hills, Madhavaram, and Oragadam, logistics managers face turnover rates exceeding 30% per month. Delivery driver shortages and warehouse picker absenteeism directly erode delivery SLA commitments.

Scaling a resilient fleet requires shifting from informal contractor brokers to structured, verified hiring channels.

---

## 2. Essential Candidate Background Verification Checklist

To prevent parcel theft, vehicle misuse, and absconding, every candidate must pass:

- **Driving License (DL) & RTO Validation**: Verification of valid LMV or transport-category license via the Sarathi portal.
- **Aadhaar Identity & Address Authentication**: Ensuring the candidate has a verifiable local residence in the Chennai metropolitan area.
- **Previous Employer Reference Check**: Verifying that the candidate has no unresolved disciplinary or absconding records with prior delivery platforms.
- **Vehicle Fitness & Insurance (for Owner-Drivers)**: Valid RC book, third-party insurance, and PUC certificate.

> **Pro Tip**: Use structured digital verification rather than paper photocopies. Digital validation prevents fraudulent or expired license submissions.

---

## 3. Chennai Warehouse Staff Compensation & Shift Models

- **Picker / Packer**: ₹16,000 – ₹20,000/month + Attendance Incentives
- **Forklift Operator (Heavy Machinery Certified)**: ₹22,000 – ₹28,000/month
- **Last-Mile Delivery Executive**: ₹18,000 – ₹26,000/month (Fixed + per-order delivery payouts)

---

## 4. Reducing Fleet Absenteeism with TrustHyre

TrustHyre provides last-mile logistics operators with:
- **Instant Candidate Matching**: Filter candidates by pincode (e.g., T. Nagar, Velachery, Porur, Madhavaram).
- **Attendance Accountability**: Geofenced shift check-ins with photo verification.
- **Automated Standby Pools**: Rapid replacement staffing during festival peak sales (Diwali, Pongal, New Year).`,
    },
    {
      slug: 'solving-absenteeism-blue-collar-workforce-india',
      title: 'How Photo Check-In & Skill Verification Is Solving Absenteeism in India\'s Blue-Collar Workforce',
      excerpt: 'Discover how geofenced photo check-in, skill badging, and biometric verification eliminate ghost workers and absent shifts for commercial contractors across India.',
      categoryId: categoryMap.get('hiring-guides'),
      coverImageUrl: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?q=80&w=1200&auto=format&fit=crop',
      authorName: 'TrustHyre Product Team',
      authorRole: 'Platform Intelligence',
      targetCity: 'Chennai',
      targetTrade: 'Technician',
      tags: ['Workforce Management', 'Attendance Verification', 'Blue Collar', 'Technology'],
      readTimeMinutes: 5,
      metaTitle: 'Solving Absenteeism in Blue-Collar Hiring in India | TrustHyre',
      metaDescription: 'Learn how modern photo check-in verification and skill badging reduce absenteeism and eliminate contractor ghost workers across Indian commercial sites.',
      content: `## 1. The Multi-Crore Cost of Unplanned Absenteeism

In India's blue-collar sector, absenteeism rates regularly fluctuate between 15% and 25%. For construction sites, commercial kitchens, manufacturing lines, and logistics hubs, an absent shift is not merely an inconvenience—it triggers missed delivery deadlines, idle equipment, and costly contractor penalty clauses.

Traditional punch cards and manual paper attendance registers are easily manipulated, leading to:
- **Buddy Punching & Ghost Workers**: Paying wages for unverified workers who were never on-site.
- **Late Starts & Premature Departures**: Shifts commencing 45 minutes late without managerial oversight.
- **Zero Visibility Across Multiple Sites**: Regional managers unable to verify staff attendance across decentralized locations.

---

## 2. How Geofenced Photo Check-In Works

Modern workforce platforms replace manual logs with biometric-adjacent smartphone verification:

1. **Geofenced Check-In Perimeter**: The employer establishes a digital perimeter (e.g. 50-meter radius around the job site). Check-ins outside this perimeter are rejected automatically.
2. **Real-Time Selfie Verification**: The worker captures a quick on-site photo. Facial recognition matches the photo against the verified onboarding profile.
3. **Instant Shift Confirmation**: Both worker and project supervisor receive real-time timestamped confirmation.

---

## 3. Skill Badging & Trust Scores

Beyond attendance, ensuring that the worker on-site has the specific skill required for the job is paramount. TrustHyre introduces:

- **Verified Skill Levels**: Certified trade evaluation from Level 1 (Apprentice) to Level 4 (Master Craftsman).
- **Reliability Rating**: Workers maintain a transparent Trust Score based on on-time arrival, completed shifts, and employer reviews.
- **Incentive Alignment**: Workers with higher Trust Scores unlock premium wage shifts, creating organic incentives for punctual attendance.`,
    },
  ];

  for (const art of articles) {
    const existing = await (prisma as any).blog_posts.findUnique({
      where: { slug: art.slug },
    });

    if (existing) {
      await (prisma as any).blog_posts.update({
        where: { id: existing.id },
        data: {
          title: art.title,
          excerpt: art.excerpt,
          content: art.content,
          cover_image_url: art.coverImageUrl,
          author_name: art.authorName,
          author_role: art.authorRole,
          category_id: art.categoryId,
          status: 'PUBLISHED',
          meta_title: art.metaTitle,
          meta_description: art.metaDescription,
          target_city: art.targetCity,
          target_trade: art.targetTrade,
          tags: art.tags,
          read_time_minutes: art.readTimeMinutes,
          published_at: existing.published_at || new Date(),
          updated_at: new Date(),
        },
      });
      console.log(`[Seed] Updated article: ${art.slug}`);
    } else {
      await (prisma as any).blog_posts.create({
        data: {
          slug: art.slug,
          title: art.title,
          excerpt: art.excerpt,
          content: art.content,
          cover_image_url: art.coverImageUrl,
          author_name: art.authorName,
          author_role: art.authorRole,
          category_id: art.categoryId,
          status: 'PUBLISHED',
          meta_title: art.metaTitle,
          meta_description: art.metaDescription,
          target_city: art.targetCity,
          target_trade: art.targetTrade,
          tags: art.tags,
          read_time_minutes: art.readTimeMinutes,
          published_at: new Date(),
        },
      });
      console.log(`[Seed] Created article: ${art.slug}`);
    }
  }

  console.log('[Seed] Successfully seeded all blog categories and articles!');
}

seedBlog()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[Seed Error]:', err);
    process.exit(1);
  });

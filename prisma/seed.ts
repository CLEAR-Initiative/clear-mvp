import { PrismaClient } from "../generated/prisma";

const db = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Create demo user
  const user = await db.user.upsert({
    where: { email: "demo@clearinitiative.io" },
    update: {},
    create: {
      id: "seed-user-001",
      name: "Demo User",
      email: "demo@clearinitiative.io",
      emailVerified: true,
      role: "PROGRAM_MANAGER",
      organization: "Norwegian Refugee Council",
      country: "Norway",
    },
  });

  console.log(`Created user: ${user.name}`);

  // Create crises based on real humanitarian situations
  const crises = await Promise.all([
    db.crisis.create({
      data: {
        title: "Sudan Armed Conflict",
        type: "CONFLICT",
        severity: "CRITICAL",
        location: "Khartoum, Sudan",
        latitude: 15.5007,
        longitude: 32.5599,
        description:
          "Ongoing armed conflict between SAF and RSF resulting in mass displacement, civilian casualties, and collapse of essential services across multiple states.",
        affectedPopulation: 24800000,
        status: "ACTIVE",
        createdById: user.id,
      },
    }),
    db.crisis.create({
      data: {
        title: "Gaza Humanitarian Crisis",
        type: "CONFLICT",
        severity: "CRITICAL",
        location: "Gaza Strip, Palestine",
        latitude: 31.3547,
        longitude: 34.3088,
        description:
          "Severe humanitarian crisis with widespread civilian casualties, displacement, infrastructure destruction, and acute food insecurity.",
        affectedPopulation: 2300000,
        status: "ACTIVE",
        createdById: user.id,
      },
    }),
    db.crisis.create({
      data: {
        title: "Ethiopia Drought Emergency",
        type: "FAMINE",
        severity: "HIGH",
        location: "Somali Region, Ethiopia",
        latitude: 5.9631,
        longitude: 43.1456,
        description:
          "Prolonged drought affecting pastoral and agro-pastoral communities, leading to severe food insecurity, water scarcity, and livestock losses.",
        affectedPopulation: 7600000,
        status: "ACTIVE",
        createdById: user.id,
      },
    }),
    db.crisis.create({
      data: {
        title: "DRC Displacement Crisis",
        type: "CONFLICT",
        severity: "HIGH",
        location: "North Kivu, DRC",
        latitude: -1.6789,
        longitude: 29.2343,
        description:
          "Armed group activity and intercommunal violence causing mass displacement in eastern DRC, with limited humanitarian access.",
        affectedPopulation: 6900000,
        status: "ACTIVE",
        createdById: user.id,
      },
    }),
    db.crisis.create({
      data: {
        title: "Türkiye-Syria Earthquake Recovery",
        type: "NATURAL_DISASTER",
        severity: "MODERATE",
        location: "Southeast Türkiye",
        latitude: 37.5744,
        longitude: 36.9264,
        description:
          "Ongoing recovery and reconstruction following the February 2023 earthquakes. Continued shelter needs and livelihood recovery.",
        affectedPopulation: 1500000,
        status: "MONITORING",
        createdById: user.id,
      },
    }),
  ]);

  console.log(`Created ${crises.length} crises`);

  // Create decisions linked to crises
  const decisions = await Promise.all([
    db.decision.create({
      data: {
        crisisId: crises[0]!.id,
        title: "Emergency Cash Assistance Scale-up",
        decisionText:
          "Scale up multi-purpose cash assistance program to 50,000 additional displaced households in Khartoum state.",
        rationale:
          "Market analysis shows functional markets in target areas. Cash modality allows beneficiary choice and supports local economy recovery.",
        confidenceScore: 78,
        optionA: "Scale up cash assistance to 50,000 HH",
        optionB: "In-kind food distribution to 50,000 HH",
        optionC: "Hybrid approach: cash + food vouchers",
        selectedOption: "OPTION_A",
        madeById: user.id,
      },
    }),
    db.decision.create({
      data: {
        crisisId: crises[0]!.id,
        title: "Staff Relocation from Khartoum",
        decisionText:
          "Relocate international staff from Khartoum to Port Sudan while maintaining national staff presence.",
        rationale:
          "Security assessment indicates high risk for international staff. National staff can maintain programming with remote support.",
        confidenceScore: 85,
        optionA: "Full staff relocation to Port Sudan",
        optionB: "Partial relocation, maintain skeleton crew",
        optionC: "Shelter in place with enhanced security",
        selectedOption: "OPTION_A",
        madeById: user.id,
      },
    }),
    db.decision.create({
      data: {
        crisisId: crises[1]!.id,
        title: "Cross-border Supply Route",
        decisionText:
          "Activate Rafah crossing supply route for medical supplies and shelter materials.",
        rationale:
          "Only viable supply route. Coordination with Egyptian authorities and UNRWA confirmed logistics capacity.",
        confidenceScore: 62,
        optionA: "Rafah crossing with UNRWA coordination",
        optionB: "Maritime corridor from Cyprus",
        optionC: "Air drops for critical medical supplies only",
        selectedOption: "OPTION_A",
        madeById: user.id,
      },
    }),
    db.decision.create({
      data: {
        crisisId: crises[2]!.id,
        title: "Water Trucking vs. Borehole Rehabilitation",
        decisionText:
          "Prioritize borehole rehabilitation over emergency water trucking for long-term water access.",
        rationale:
          "Cost-benefit analysis shows borehole rehabilitation is 5x more cost-effective over 12 months. Community ownership ensures sustainability.",
        confidenceScore: 91,
        optionA: "Borehole rehabilitation (15 sites)",
        optionB: "Emergency water trucking (3 months)",
        optionC: "Combined: trucking now + boreholes in parallel",
        selectedOption: "OPTION_C",
        madeById: user.id,
      },
    }),
  ]);

  console.log(`Created ${decisions.length} decisions`);

  // Create alerts
  const alerts = await Promise.all([
    db.alert.create({
      data: {
        crisisId: crises[0]!.id,
        type: "THRESHOLD_EXCEEDED",
        severity: "CRITICAL",
        message:
          "IPC Phase 5 (Famine) conditions confirmed in parts of Khartoum. Immediate food security intervention required.",
        isActive: true,
      },
    }),
    db.alert.create({
      data: {
        crisisId: crises[0]!.id,
        type: "DATA_ANOMALY",
        severity: "HIGH",
        message:
          "Cholera cases in White Nile state increased 340% in the past 2 weeks. WASH response needed.",
        isActive: true,
      },
    }),
    db.alert.create({
      data: {
        crisisId: crises[1]!.id,
        type: "THRESHOLD_EXCEEDED",
        severity: "CRITICAL",
        message:
          "95% of population displaced at least once. Shelter capacity at maximum in all designated safe zones.",
        isActive: true,
      },
    }),
    db.alert.create({
      data: {
        crisisId: crises[2]!.id,
        type: "NEW_CRISIS_DETECTED",
        severity: "HIGH",
        message:
          "New displacement from Somali-Oromia border conflict. Estimated 45,000 newly displaced in past 72 hours.",
        isActive: true,
      },
    }),
    db.alert.create({
      data: {
        crisisId: crises[3]!.id,
        type: "SYSTEM_HEALTH",
        severity: "MODERATE",
        message:
          "Humanitarian access restricted on 3 of 5 supply routes to North Kivu. Alternative logistics planning required.",
        isActive: true,
      },
    }),
    db.alert.create({
      data: {
        crisisId: crises[4]!.id,
        type: "DATA_ANOMALY",
        severity: "LOW",
        message:
          "Winterization supplies distribution 87% complete. Final distributions on track for completion by month end.",
        isActive: false,
        resolvedAt: new Date(),
      },
    }),
  ]);

  console.log(`Created ${alerts.length} alerts`);

  console.log("Seed completed successfully.");
}

main()
  .then(async () => {
    await db.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await db.$disconnect();
    process.exit(1);
  });

import { PrismaClient, LeadStatus } from "@prisma/client";
import * as bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.SART34_ADMIN_EMAIL ?? "admin@sart34.test";
  const adminPassword = process.env.SART34_ADMIN_PASSWORD ?? "AdminPassword123!";

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      firstName: "Sart34",
      lastName: "Admin",
      role: "SUPER_ADMIN",
      isActive: true
    },
    create: {
      firstName: "Sart34",
      lastName: "Admin",
      email: adminEmail,
      role: "SUPER_ADMIN",
      isActive: true,
      passwordHash: await bcrypt.hash(adminPassword, 12)
    }
  });

  const stages: Array<{ key: LeadStatus; name: string; position: number }> = [
    { key: "NEW_LEAD", name: "New Lead", position: 1 },
    { key: "CONTACTED", name: "Contacted", position: 2 },
    { key: "INTERESTED", name: "Interested", position: 3 },
    { key: "FOLLOW_UP", name: "Follow-Up", position: 4 },
    { key: "APPOINTMENT_SCHEDULED", name: "Inspection/Appointment Scheduled", position: 5 },
    { key: "NEGOTIATION", name: "Negotiation", position: 6 },
    { key: "WON", name: "Won", position: 7 },
    { key: "LOST", name: "Lost", position: 8 }
  ];

  for (const stage of stages) {
    await prisma.pipelineStage.upsert({
      where: { key: stage.key },
      update: stage,
      create: stage
    });
  }

  const bundles = [
    { name: "Starter Credits", credits: 100, amount: 5000 },
    { name: "Growth Credits", credits: 300, amount: 12000 },
    { name: "Pro Credits", credits: 800, amount: 30000 }
  ];

  for (const bundle of bundles) {
    await prisma.creditBundle.upsert({
      where: { id: bundle.name.toLowerCase().replace(/\s+/g, "-") },
      update: bundle,
      create: { id: bundle.name.toLowerCase().replace(/\s+/g, "-"), ...bundle }
    });
  }

  const prompts = [
    {
      key: "campaign-generation",
      content:
        "Generate a compliant Meta advertising campaign as strict JSON with campaign_name, objective, audiences, ad_copies, lead_form_questions, follow_up_messages, budget_recommendation, and policy_risk."
    },
    {
      key: "policy-review",
      content:
        "Review ad material for Meta policy risk. Return JSON with level, warnings, restricted_categories, and should_require_human_review."
    },
    {
      key: "follow-up-message",
      content:
        "Generate concise WhatsApp, email, or SMS follow-up copy for the lead context. Avoid guarantees and misleading claims."
    }
  ];

  for (const prompt of prompts) {
    await prisma.promptTemplate.upsert({
      where: { key: prompt.key },
      update: prompt,
      create: prompt
    });
  }

  const templates = [
    "Real estate land sale",
    "House sale",
    "Rental property",
    "School admission",
    "Training program",
    "Restaurant promo",
    "Fashion product",
    "Beauty service",
    "Event registration",
    "Professional service",
    "E-commerce product"
  ];

  for (const name of templates) {
    await prisma.aiTemplate.upsert({
      where: { name },
      update: { active: true },
      create: {
        name,
        category: "industry-template",
        industry: name,
        content: `Campaign structure and compliance guidance for ${name}.`
      }
    });
  }
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });

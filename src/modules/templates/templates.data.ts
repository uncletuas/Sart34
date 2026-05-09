export type CampaignTemplate = {
  id: string;
  industry: string;
  name: string;
  goal: string;
  description: string;
  defaultDurationDays: number;
  defaultDailyBudget: number;
  callToAction: string;
  audienceHints: string;
  copyExamples: string[];
  recommendedPlatforms: string[];
};

export const CAMPAIGN_TEMPLATES: CampaignTemplate[] = [
  {
    id: "real-estate-listing",
    industry: "Real Estate",
    name: "New listing announcement",
    goal: "REAL_ESTATE_LISTING",
    description: "Showcase a new property to qualified buyers in the area.",
    defaultDurationDays: 14,
    defaultDailyBudget: 8000,
    callToAction: "Send WhatsApp message",
    audienceHints: "Home buyers and renters within 25 km of the listing",
    copyExamples: [
      "3 bedroom apartment in {{location}}. Move-in ready. Tap to see photos.",
      "Open house this weekend in {{location}}. DM for the address."
    ],
    recommendedPlatforms: ["META", "GOOGLE"]
  },
  {
    id: "school-enrolment",
    industry: "Schools & Training",
    name: "School enrolment drive",
    goal: "GENERATE_LEADS",
    description: "Bring parents and students into the admissions inbox.",
    defaultDurationDays: 21,
    defaultDailyBudget: 5000,
    callToAction: "Sign up",
    audienceHints: "Parents 28-55 in the catchment area",
    copyExamples: [
      "Admissions are open at {{school}}. Tap to book a campus tour.",
      "Limited slots for the new term. Apply in 2 minutes."
    ],
    recommendedPlatforms: ["META", "GOOGLE"]
  },
  {
    id: "training-course",
    industry: "Schools & Training",
    name: "Training course launch",
    goal: "EVENT_REGISTRATION",
    description: "Fill seats for a cohort, bootcamp, or workshop.",
    defaultDurationDays: 10,
    defaultDailyBudget: 4000,
    callToAction: "Sign up",
    audienceHints: "Working professionals or students in {{location}}",
    copyExamples: [
      "Become a {{skill}} pro in 6 weeks. Cohort starts {{date}}.",
      "Hands-on training with job placement support. Apply now."
    ],
    recommendedPlatforms: ["META", "TIKTOK"]
  },
  {
    id: "restaurant-promo",
    industry: "Restaurants",
    name: "Daily special promotion",
    goal: "WHATSAPP_MESSAGES",
    description: "Drive walk-ins or delivery orders for a special menu item.",
    defaultDurationDays: 7,
    defaultDailyBudget: 3000,
    callToAction: "Send WhatsApp message",
    audienceHints: "Foodies within 5 km, age 18-45",
    copyExamples: [
      "Tonight only: {{dish}} for ₦{{price}}. Tap to order on WhatsApp.",
      "Buy 1 get 1 on {{dish}} this weekend. DM to reserve."
    ],
    recommendedPlatforms: ["META", "TIKTOK"]
  },
  {
    id: "fashion-collection",
    industry: "Fashion",
    name: "New collection drop",
    goal: "SELL_PRODUCTS",
    description: "Sell out a new fashion drop with vertical video and shop links.",
    defaultDurationDays: 14,
    defaultDailyBudget: 6000,
    callToAction: "Shop now",
    audienceHints: "Style-conscious 18-34 in major cities",
    copyExamples: [
      "{{brand}} drop is live. Shop the new pieces before they sell out.",
      "Limited run. {{n}} pieces only. Tap to claim yours."
    ],
    recommendedPlatforms: ["META", "TIKTOK"]
  },
  {
    id: "beauty-booking",
    industry: "Beauty",
    name: "Salon and spa booking",
    goal: "BOOK_APPOINTMENTS",
    description: "Fill chairs at a salon, spa, or beauty studio.",
    defaultDurationDays: 14,
    defaultDailyBudget: 4000,
    callToAction: "Book now",
    audienceHints: "Women 22-45 within 10 km",
    copyExamples: [
      "Book your {{service}} this week and get a free upgrade.",
      "Same-day {{service}} appointments. Tap to pick a time."
    ],
    recommendedPlatforms: ["META", "TIKTOK"]
  },
  {
    id: "event-registration",
    industry: "Events",
    name: "Event registration",
    goal: "EVENT_REGISTRATION",
    description: "Sell out a launch, workshop, conference, or party.",
    defaultDurationDays: 14,
    defaultDailyBudget: 5000,
    callToAction: "Get tickets",
    audienceHints: "Audience interested in {{topic}} in {{location}}",
    copyExamples: [
      "{{event}} on {{date}} at {{venue}}. Limited tickets, grab yours.",
      "Early bird tickets close Friday. Tap to secure your seat."
    ],
    recommendedPlatforms: ["META", "GOOGLE"]
  },
  {
    id: "ecommerce-catalog",
    industry: "E-commerce",
    name: "Catalog sales",
    goal: "SELL_PRODUCTS",
    description: "Run dynamic shopping ads for an entire product catalog.",
    defaultDurationDays: 30,
    defaultDailyBudget: 10000,
    callToAction: "Shop now",
    audienceHints: "Past visitors and lookalikes of buyers",
    copyExamples: [
      "Bestsellers from {{store}}. Free delivery on orders over ₦{{amount}}.",
      "Shop the {{category}} collection. Today's deals end at midnight."
    ],
    recommendedPlatforms: ["META", "GOOGLE", "TIKTOK"]
  },
  {
    id: "service-leads",
    industry: "Services",
    name: "Local service leads",
    goal: "GET_CALLS",
    description: "Capture call and WhatsApp leads for local service providers.",
    defaultDurationDays: 14,
    defaultDailyBudget: 4000,
    callToAction: "Call now",
    audienceHints: "Homeowners and renters in {{location}}",
    copyExamples: [
      "{{service}} in {{location}}. Tap to call for a free quote.",
      "Same-day {{service}} appointments. Licensed and insured."
    ],
    recommendedPlatforms: ["GOOGLE", "META"]
  }
];

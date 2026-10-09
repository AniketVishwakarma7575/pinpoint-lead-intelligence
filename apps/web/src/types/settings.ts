import type { IcpProfile } from "./index"

export const defaultIcpProfile: IcpProfile = {
  weights: {
    companyFit: 25,
    revenueFit: 20,
    companySize: 15,
    industryFit: 15,
    contactQuality: 10,
    technologyFit: 10,
    intentSignal: 5,
  },
  industries: ["SaaS", "Technology", "Financial Services", "Healthcare"],
  minEmployees: 50,
  maxEmployees: 2000,
  minRevenue: 5_000_000,
  maxRevenue: 500_000_000,
  regions: ["United States", "Canada"],
  technologies: [
    "HubSpot",
    "Salesforce",
    "AWS",
    "Stripe",
    "Snowflake",
    "Segment",
    "Intercom",
    "Datadog",
    "Shopify",
    "Workday",
  ],
}

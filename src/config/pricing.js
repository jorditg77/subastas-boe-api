export const PLANS = {
  free: {
    name: 'Free',
    priceUsd: 0,
    requestsPerMonth: 100,
    concurrentRequests: 1,
    support: 'community',
  },
  starter: {
    name: 'Starter',
    priceUsd: 9.9,
    requestsPerMonth: 500,
    concurrentRequests: 2,
    support: 'email',
  },
  pro: {
    name: 'Pro',
    priceUsd: 29.9,
    requestsPerMonth: 2000,
    concurrentRequests: 3,
    support: 'priority',
  },
  business: {
    name: 'Business',
    priceUsd: 89,
    requestsPerMonth: 10000,
    concurrentRequests: 5,
    support: 'priority',
  },
};

export const RAPIDAPI_COMMISSION = 0.20;

export function getNetRevenue(planKey) {
  const plan = PLANS[planKey];
  if (!plan) return 0;
  return plan.priceUsd * (1 - RAPIDAPI_COMMISSION);
}

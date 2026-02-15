# Subscription Management & Freemium Evaluation

## Executive Summary

Your current subscription system is a **custom implementation** with:
- Manual tier management (Free, Advanced, Premium)
- Feature flags and site limits stored in PostgreSQL
- Custom middleware for subscription validation
- No payment processing integration yet
- Prepared for Stripe integration (stripeSubscriptionId field)

This evaluation examines **5 approaches** for subscription management and payment processing to help you decide whether to keep your custom implementation or switch to a standard solution.

---

## Current Implementation Analysis

### Architecture
- **Database**: PostgreSQL with Prisma ORM
- **Service Layer**: [SubscriptionService](src/services/subscriptionService.ts:1) - Custom tier management
- **Middleware**: [SubscriptionMiddleware](src/middleware/subscriptionMiddleware.ts:1) - Request validation
- **Types**: [subscriptionTypes.ts](src/types/subscriptionTypes.ts:1) - Tier definitions and feature flags

### Current Features ✅
- ✅ **Freemium tiers**: Free (2 sites), Advanced (5 sites), Premium (20 sites)
- ✅ **Feature flags**: History, Snapshots, Logging, Workflows, API access
- ✅ **Site limits**: Enforced at API level with middleware
- ✅ **Grace periods**: 7-day grace period for expired subscriptions
- ✅ **Subscription validation**: Middleware for action-based permission checks
- ✅ **Automatic tier management**: Free tier creation for new users
- ✅ **Response headers**: Subscription info injected in API responses

### Missing Features ❌
- ❌ **Payment processing**: No actual payment collection
- ❌ **Billing portal**: No customer self-service UI
- ❌ **Invoice generation**: No automated invoicing
- ❌ **Dunning management**: No failed payment retry logic
- ❌ **Tax calculation**: No VAT/sales tax handling
- ❌ **Proration**: No mid-cycle subscription changes
- ❌ **Usage metering**: No consumption-based pricing
- ❌ **Webhook handling**: No payment provider event processing

### What Works Well ✅
1. **Clean separation**: Service layer cleanly separated from middleware
2. **Type safety**: Full TypeScript typing throughout
3. **Flexible validation**: Action-based permission system is extensible
4. **Database integration**: Tight integration with existing Prisma schema
5. **Low complexity**: Simple, understandable business logic

### What's Missing ❌
1. **Payment processing**: The actual money collection part
2. **Self-service billing**: Users can't upgrade/downgrade themselves
3. **Compliance**: Tax calculation, invoicing, receipts
4. **Dunning**: Payment retry logic and failed payment handling

---

## Option 1: Add Stripe to Current System ⭐ RECOMMENDED

**Overview**: Keep your custom subscription logic and add Stripe for payment processing only.

### Architecture
```
Your Custom System               Stripe
─────────────────────            ─────────
SubscriptionService  ─────>      Stripe API
  │                               │
  ├─ Tier management              ├─ Payment processing
  ├─ Feature flags                ├─ Card storage
  ├─ Site limits                  ├─ Invoices
  ├─ Validation logic             ├─ Tax calculation
  │                               ├─ Webhooks
  └─ Database (Prisma)            └─ Customer portal
```

### Implementation Approach

#### What You Keep (Custom)
- ✅ Your SubscriptionService for tier logic
- ✅ Your feature flags and site limits
- ✅ Your validation middleware
- ✅ Your database schema (add Stripe fields)
- ✅ Your business rules and grace periods

#### What Stripe Handles
- 💳 Payment collection
- 📧 Invoice generation
- 🧾 Tax calculation (via Stripe Tax)
- 🔄 Automatic billing cycles
- 🔁 Dunning (failed payment retry)
- 👤 Customer portal for plan changes

### Implementation Steps

#### Phase 1: Stripe Setup (1-2 days)
1. Create Stripe account
2. Install `stripe` npm package
3. Add Stripe API keys to environment
4. Set up Stripe products and prices in dashboard
5. Create Stripe service wrapper

**Code Example**:
```typescript
// src/services/stripeService.ts
import Stripe from 'stripe';

export class StripeService {
  private stripe: Stripe;

  constructor() {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2025-06-30.basil',
      typescript: true
    });
  }

  async createCheckoutSession(
    userId: string,
    priceId: string,
    tier: SubscriptionTier
  ): Promise<string> {
    const session = await this.stripe.checkout.sessions.create({
      mode: 'subscription',
      customer_email: userEmail,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.APP_URL}/subscription/success`,
      cancel_url: `${process.env.APP_URL}/pricing`,
      metadata: {
        userId,
        tier
      }
    });
    return session.url!;
  }
}
```

#### Phase 2: Webhook Integration (2-3 days)
1. Set up webhook endpoint in Express
2. Verify webhook signatures
3. Handle subscription lifecycle events
4. Update your SubscriptionService on payment events

**Code Example**:
```typescript
// Webhook handler
app.post('/api/webhooks/stripe',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const sig = req.headers['stripe-signature']!;
    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET!
      );
    } catch (err) {
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutComplete(event.data.object);
        break;
      case 'customer.subscription.updated':
        await handleSubscriptionUpdate(event.data.object);
        break;
      case 'customer.subscription.deleted':
        await handleSubscriptionCancel(event.data.object);
        break;
      case 'invoice.payment_succeeded':
        await handlePaymentSuccess(event.data.object);
        break;
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;
    }

    res.json({ received: true });
  }
);

async function handleCheckoutComplete(session: Stripe.Checkout.Session) {
  const { userId, tier } = session.metadata;
  const subscription = session.subscription as string;

  // Update your subscription service
  await subscriptionService.updateSubscriptionTier(
    userId,
    tier as SubscriptionTier,
    subscription
  );
}
```

#### Phase 3: Billing Portal (1 day)
1. Create customer portal sessions
2. Add "Manage Billing" button in UI
3. Handle portal return URL

**Code Example**:
```typescript
app.post('/api/billing-portal', async (req, res) => {
  const { userId } = req;

  // Get customer from your database
  const subscription = await subscriptionService.getUserSubscription(userId);

  const session = await stripe.billingPortal.sessions.create({
    customer: subscription.stripeCustomerId!,
    return_url: `${process.env.APP_URL}/settings/billing`
  });

  res.json({ url: session.url });
});
```

### Pros ✅
- **Keep your logic**: Your business rules remain in your control
- **Minimal changes**: Only add payment processing layer
- **Type safety**: Stripe has excellent TypeScript support
- **Low cost**: Stripe's 2.9% + 30¢ is industry standard
- **Battle-tested**: Stripe handles billions in payments
- **Compliance**: PCI, tax, invoicing all handled
- **Developer-friendly**: Excellent docs and testing tools
- **Incremental migration**: Add payment gradually

### Cons ❌
- **Webhook complexity**: Must handle webhook events correctly
- **Stripe learning curve**: Need to understand Stripe concepts
- **Two sources of truth**: Stripe + your DB must stay in sync
- **Testing complexity**: Need to test webhook scenarios

### Implementation Effort
**Effort**: 🟡 MEDIUM (4-6 days)
- Day 1-2: Stripe setup and basic integration
- Day 3-4: Webhook implementation
- Day 5: Billing portal and testing
- Day 6: Production deployment

### Cost Analysis
**Stripe Pricing**:
- **Transaction fee**: 2.9% + $0.30 per successful card charge
- **No monthly fee**: No base subscription cost
- **Stripe Tax**: +0.5% for automatic tax calculation (optional)
- **Stripe Billing**: Free (included with standard pricing)

**Example Revenue Scenarios**:
| Monthly Revenue | Stripe Fees (2.9% + 30¢) | Your Net Revenue |
|-----------------|---------------------------|------------------|
| $0 (Free users) | $0 | $0 |
| $1,000 | ~$40 | ~$960 |
| $10,000 | ~$380 | ~$9,620 |
| $100,000 | ~$3,200 | ~$96,800 |

### Recommendation Level
🥇 **HIGHLY RECOMMENDED**

**Why**: Best balance of control and convenience. You keep your business logic while outsourcing the complex payment processing parts.

---

## Option 2: Clerk Billing (If Using Clerk Auth)

**Overview**: If you adopt Clerk for authentication (from previous evaluation), use Clerk Billing for subscriptions.

### Architecture
```
Clerk Ecosystem
─────────────────
Clerk Auth + Billing
  │
  ├─ User authentication
  ├─ User profile management
  ├─ Subscription plans (in Clerk dashboard)
  ├─ Feature flags (via has() helper)
  ├─ Payment processing (powered by Stripe)
  └─ Billing UI (<PricingTable />, <UserProfile />)
```

### How It Works
1. Define plans in Clerk Dashboard (Free, Advanced, Premium)
2. Add feature flags to each plan
3. Use `<PricingTable />` component for pricing page
4. Check access with `user.has({ feature: 'advanced_workflows' })`
5. Stripe handles payments in background (no webhooks needed)

### Pros ✅
- **Zero webhooks**: No custom webhook code needed
- **Unified UX**: Auth + billing in one system
- **Drop-in components**: Pre-built pricing table and checkout
- **Sandbox mode**: Test without Stripe account
- **Simple feature checks**: `has()` helper for access control
- **Fast implementation**: 1-2 days to add billing

### Cons ❌
- **Requires Clerk**: Only works if you switch to Clerk auth
- **Vendor lock-in**: Heavily tied to Clerk ecosystem
- **Limited customization**: Less control over subscription logic
- **Not Stripe Billing**: Plans aren't synced to Stripe dashboard
- **Separate product**: Additional cost on top of Clerk auth
- **New product**: Clerk Billing is very new (2025 launch)

### Implementation Effort
**Effort**: 🟢 LOW (1-2 days)
- Requires migrating to Clerk Auth first
- Then add Clerk Billing configuration
- Drop in components and feature checks

### Cost Analysis
**Clerk Billing Pricing**:
- Not yet publicly disclosed (very new product)
- Likely bundled with Clerk Auth pricing
- Stripe fees still apply (2.9% + 30¢)

**Combined Clerk Auth + Billing**:
- Free tier: 10,000 MAU
- Pro: $25/month + $0.02/MAU
- At 100K MAU: ~$1,825/month + Stripe fees

### Recommendation Level
🥈 **CONSIDER IF**: You're already switching to Clerk for auth

**Otherwise**: Stick with Option 1 (custom + Stripe)

---

## Option 3: Paddle (Merchant of Record)

**Overview**: Paddle acts as Merchant of Record, handling all payments, taxes, and compliance globally.

### What Paddle Handles
- 💳 Payment processing (cards, PayPal, wire transfer)
- 🧾 **Global tax compliance** (VAT, sales tax, GST)
- 📧 Invoicing and receipts
- 🌍 Multi-currency pricing
- 🔐 PCI compliance
- 📊 Revenue recognition and reporting
- 👤 Customer portal

### Merchant of Record Benefits
As MoR, Paddle is the "seller" for tax purposes. This means:
- **No tax registration needed**: Paddle handles VAT/tax in 200+ countries
- **No tax remittance**: Paddle pays taxes, not you
- **No compliance burden**: Paddle handles all regulatory requirements
- **Simplified accounting**: You receive net payouts from Paddle

### Pros ✅
- **Tax compliance**: Complete global tax handling
- **No tax complexity**: Paddle handles everything
- **Higher conversion**: Supports local payment methods
- **Revenue recognition**: Automated for SaaS accounting
- **PCI Level 1**: Highest security compliance
- **Multi-currency**: Automatic currency conversion
- **Good for EU/global**: Ideal if selling internationally

### Cons ❌
- **Higher fees**: 5% + $0.50 (vs Stripe's 2.9% + $0.30)
- **Payout delay**: Net-30 or Net-60 payment terms
- **Customer data**: Paddle owns customer relationship
- **Less control**: More abstracted than Stripe
- **API complexity**: More complex integration than Stripe
- **Fewer features**: Less flexible than Stripe for custom scenarios

### Implementation Effort
**Effort**: 🟡 MEDIUM-HIGH (5-7 days)
- Similar webhook integration to Stripe
- More complex API for subscription management
- Different mental model (MoR vs payment processor)

### Cost Analysis
**Paddle Pricing**:
- **Transaction fee**: 5% + $0.50 per transaction
- **No monthly fee**: Like Stripe

**Comparison to Stripe**:
| Monthly Revenue | Stripe (2.9% + 30¢) | Paddle (5% + 50¢) | Difference |
|-----------------|---------------------|-------------------|------------|
| $1,000 | $40 | $100 | +$60 |
| $10,000 | $380 | $650 | +$270 |
| $100,000 | $3,200 | $5,500 | +$2,300 |

### Recommendation Level
⚠️ **USE IF**: Selling globally and need tax compliance

**Otherwise**: Too expensive for your use case

---

## Option 4: Lemon Squeezy (Acquired by Stripe)

**Overview**: Simplified billing platform, now owned by Stripe (acquired July 2024).

### Target Audience
- Small businesses, creators, solopreneurs
- Digital products and simple subscriptions
- Users wanting simplicity over features

### Pros ✅
- **Simple setup**: Very easy to get started
- **MoR included**: Handles global tax like Paddle
- **Lower barrier**: Great for first-time SaaS builders
- **0% fees**: First 30 days free (promotional)

### Cons ❌
- **Uncertain future**: Recently acquired by Stripe
- **Limited features**: Basic subscription management
- **Higher fees**: 5% + 50¢ base, +1.5% for international
- **Less enterprise-ready**: Not built for complex billing
- **Manual chargebacks**: No automated chargeback handling

### Implementation Effort
**Effort**: 🟢 LOW-MEDIUM (3-4 days)

### Cost Analysis
- **Base**: 5% + $0.50 per transaction
- **International**: +1.5% (total 6.5%)

### Recommendation Level
❌ **NOT RECOMMENDED**

**Why**: Uncertain future post-acquisition, higher fees than Stripe, less mature than alternatives.

---

## Option 5: Lago (Open Source Billing)

**Overview**: Open-source metering and usage-based billing platform.

### What Lago Offers
- 📊 **Usage metering**: Track consumption events
- 💰 **Hybrid pricing**: Subscription + usage-based
- 🔢 **Event ingestion**: 15,000 events/second
- 📧 **Invoice generation**: Automated invoicing
- 💳 **Payment orchestration**: Integrates with Stripe/Adyen
- 📈 **Revenue analytics**: Built-in reporting

### Best For
- **Usage-based pricing**: Pay-per-API-call, pay-per-GB, etc.
- **Complex metering**: Track multiple usage dimensions
- **Hybrid models**: Fixed subscription + variable usage
- **API-first companies**: API calls, data transfer, compute time

### Pros ✅
- **Open source**: Free to self-host
- **Usage metering**: Best-in-class event tracking
- **Flexible pricing**: Supports complex pricing models
- **API-first**: Everything via API
- **Self-hostable**: Full control over data
- **Modern architecture**: Built for cloud-native apps

### Cons ❌
- **Overkill for simple tiers**: Too complex for Free/Pro/Enterprise
- **Self-hosting burden**: Must run infrastructure
- **Learning curve**: Complex setup and configuration
- **Still need Stripe**: Lago doesn't process payments itself
- **Limited community**: Smaller ecosystem than Stripe

### Implementation Effort
**Effort**: 🔴 HIGH (2-3 weeks)
- Week 1: Self-host Lago or set up Lago Cloud
- Week 2: Configure plans, metrics, and pricing
- Week 3: Integrate with your app and Stripe

### Cost Analysis
**Self-hosted**: Free (MIT license) + infrastructure costs
**Lago Cloud**: Contact for pricing (usage-based)

### Recommendation Level
❌ **NOT RECOMMENDED for your use case**

**Why**: You have simple tier-based pricing, not usage-based. Lago is overkill.

---

## Comparison Matrix

| Solution | Best For | Implementation | Cost (Monthly) | Control | Complexity |
|----------|----------|----------------|----------------|---------|------------|
| **Custom + Stripe** | Full control + payments | 4-6 days | 2.9% + 30¢ | ⭐⭐⭐⭐⭐ | Medium |
| **Clerk Billing** | Clerk auth users | 1-2 days | ~$1,825 @ 100K MAU | ⭐⭐ | Low |
| **Paddle** | Global tax compliance | 5-7 days | 5% + 50¢ | ⭐⭐⭐ | Medium-High |
| **Lemon Squeezy** | Simplicity | 3-4 days | 5-6.5% | ⭐⭐⭐ | Low-Medium |
| **Lago** | Usage-based pricing | 2-3 weeks | Free + infra | ⭐⭐⭐⭐⭐ | High |

---

## Decision Framework

### Choose **Custom + Stripe** if:
✅ You want to keep your subscription logic
✅ You need full control over business rules
✅ You want the lowest transaction fees
✅ You're comfortable with webhooks
✅ Your pricing is tier-based (not usage-based)

**This is 95% of SaaS companies.**

### Choose **Clerk Billing** if:
✅ You're already using Clerk for auth
✅ You want zero webhook code
✅ You prioritize speed over control
✅ You're okay with higher costs at scale

### Choose **Paddle** if:
✅ You're selling globally and need tax compliance
✅ You don't want to handle VAT/tax registration
✅ You're okay with 5% fees
✅ You want a Merchant of Record

### Choose **Lago** if:
✅ You have usage-based pricing (API calls, data, compute)
✅ You need complex metering
✅ You want open-source billing infrastructure
✅ You have engineering resources for self-hosting

---

## Recommended Approach

### 🥇 **Recommendation: Keep Custom System + Add Stripe**

#### Why This Is Best For You:

1. **You've already built the hard part**: Your subscription logic, feature flags, and validation are clean and working
2. **Minimal disruption**: Only add payment processing, not rebuild everything
3. **Type safety**: Keep your TypeScript types and Prisma schema
4. **Lowest cost**: Stripe's 2.9% + 30¢ is industry standard
5. **Maximum control**: Your business rules stay in your codebase
6. **Future flexibility**: Easy to swap payment processors later

#### What You Keep:
```typescript
// Your existing code (no changes needed)
subscriptionService.validateAction(userId, 'add_site')
subscriptionService.canAddSite(userId)
subscriptionService.getSubscriptionLimits(userId)
subscriptionMiddleware.checkSiteLimit
```

#### What You Add:
```typescript
// New Stripe integration layer
stripeService.createCheckoutSession(userId, priceId, tier)
stripeService.createBillingPortalSession(customerId)
webhookHandler.handleSubscriptionEvent(event)
```

---

## Implementation Roadmap (Custom + Stripe)

### Phase 1: Stripe Setup (Day 1-2)
1. **Create Stripe account**
   - Sign up at stripe.com
   - Complete business verification
   - Get API keys (test + production)

2. **Install dependencies**
   ```bash
   npm install stripe @stripe/stripe-js
   ```

3. **Create Stripe products**
   - Dashboard → Products → Create product
   - Free: $0/month (for tracking)
   - Advanced: $29/month
   - Premium: $99/month
   - Copy price IDs for integration

4. **Environment variables**
   ```env
   STRIPE_SECRET_KEY=sk_live_...
   STRIPE_PUBLISHABLE_KEY=pk_live_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```

### Phase 2: Checkout Integration (Day 3)
1. **Create StripeService**
   ```typescript
   // src/services/stripeService.ts
   export class StripeService {
     createCheckoutSession(...)
     createCustomer(...)
     createBillingPortalSession(...)
   }
   ```

2. **Add checkout endpoint**
   ```typescript
   app.post('/api/checkout/create-session', async (req, res) => {
     const { tier } = req.body;
     const userId = req.userId;

     const session = await stripeService.createCheckoutSession(
       userId,
       PRICE_IDS[tier],
       tier
     );

     res.json({ url: session.url });
   });
   ```

3. **Frontend integration**
   - Add "Upgrade" buttons
   - Redirect to Stripe Checkout
   - Handle success/cancel URLs

### Phase 3: Webhook Handler (Day 4)
1. **Create webhook endpoint**
   ```typescript
   app.post('/api/webhooks/stripe',
     express.raw({ type: 'application/json' }),
     webhookHandler
   );
   ```

2. **Implement event handlers**
   - `checkout.session.completed`: Upgrade tier
   - `customer.subscription.updated`: Update tier/status
   - `customer.subscription.deleted`: Downgrade to free
   - `invoice.payment_failed`: Mark as grace period

3. **Update SubscriptionService**
   - Add Stripe customer ID to User model
   - Store subscription status from Stripe
   - Sync tier on webhook events

### Phase 4: Billing Portal (Day 5)
1. **Add portal endpoint**
   ```typescript
   app.post('/api/billing-portal', async (req, res) => {
     const session = await stripe.billingPortal.sessions.create({
       customer: user.stripeCustomerId,
       return_url: `${APP_URL}/settings/billing`
     });
     res.json({ url: session.url });
   });
   ```

2. **Frontend "Manage Billing" button**
   - Settings page
   - Opens Stripe Customer Portal
   - Users can change plans, update cards, view invoices

### Phase 5: Testing (Day 6)
1. **Test webhook scenarios**
   - Use Stripe CLI for local testing
   - Test all subscription lifecycle events
   - Verify database updates correctly

2. **Test checkout flow**
   - Free → Advanced upgrade
   - Advanced → Premium upgrade
   - Premium → Advanced downgrade
   - Cancel subscription

3. **Test edge cases**
   - Failed payments
   - Expired cards
   - Subscription cancellations

### Phase 6: Production (Day 7)
1. **Switch to live keys**
2. **Deploy webhook endpoint**
3. **Configure webhook in Stripe Dashboard**
4. **Monitor first transactions**

---

## Database Schema Updates

### Add to User Model
```prisma
model User {
  // ... existing fields
  stripeCustomerId String? @unique
  subscriptions     Subscription[]
}
```

### Update Subscription Model
```prisma
model Subscription {
  // ... existing fields
  stripeSubscriptionId String? @unique
  stripePriceId        String?
  stripeStatus         String?  // active, past_due, canceled, etc.
  currentPeriodEnd     DateTime?
}
```

Run migration:
```bash
npx prisma migrate dev --name add_stripe_fields
```

---

## Cost Analysis: Custom + Stripe

### Development Costs (One-time)
- **Your time**: 6-7 days implementation
- **Testing**: 1 day
- **Total**: ~1-2 weeks developer time

### Ongoing Costs
- **Stripe fees**: 2.9% + $0.30 per successful charge
- **No monthly fee**: $0 base cost
- **Optional Stripe Tax**: +0.5% (if you want automatic tax calculation)

### Revenue Scenarios
| Scenario | MRR | Customers | Stripe Fees | Net Revenue |
|----------|-----|-----------|-------------|-------------|
| Launch | $0 | 100 free | $0 | $0 |
| Early Growth | $500 | 20 paying | $25 | $475 |
| Steady Growth | $2,000 | 75 paying | $90 | $1,910 |
| Scale | $10,000 | 350 paying | $380 | $9,620 |
| Mature | $50,000 | 1,500 paying | $1,750 | $48,250 |

**Key Insight**: Stripe fees scale linearly with revenue. No surprise jumps or tier changes.

---

## Migration Strategy

### Keep Your Custom Code, Add Stripe Layer

```
Current Architecture          With Stripe
──────────────────           ───────────────────
SubscriptionService          SubscriptionService
  ↓                            ↓         ↓
PostgreSQL                  PostgreSQL  Stripe API
                                          ↓
                                      Webhooks
                                          ↓
                                    SubscriptionService
```

### No Breaking Changes
- Your existing API endpoints continue working
- Your middleware continues working
- Your feature flags continue working
- Your validation logic continues working

### What Changes
- Add Stripe customer ID to users
- Add webhook endpoint for Stripe events
- Add checkout endpoint for upgrades
- Add billing portal endpoint
- Frontend: Add "Upgrade" and "Manage Billing" buttons

---

## Alternative: What If You Go All-In on a Platform?

### If You Chose Paddle or Lemon Squeezy (MoR)
You'd replace your entire subscription system with theirs:

**What You'd Lose**:
- ❌ Your custom tier logic
- ❌ Your feature flag system
- ❌ Your validation middleware
- ❌ Full control over business rules

**What You'd Gain**:
- ✅ Global tax compliance
- ✅ Invoice generation
- ✅ Customer portal
- ✅ Simpler initial setup

**Trade-off Analysis**:
- **Higher fees**: 5% vs 2.9% = ~$1,000/month extra at $50K MRR
- **Less control**: Can't implement custom business logic easily
- **Vendor lock-in**: Hard to migrate later

**Verdict**: Not worth it for your use case. You already have the subscription logic built.

---

## FAQ

### Q: Should I use Stripe Checkout or Stripe Elements?
**A**: Start with Stripe Checkout (hosted page). It's easier, PCI compliant out of the box, and handles SCA/3DS automatically. Use Elements later if you need custom UI.

### Q: How do I handle prorated charges?
**A**: Stripe handles this automatically when customers upgrade/downgrade mid-cycle. Just update the subscription with the new price.

### Q: What about tax calculation?
**A**:
- **US only**: You likely don't need Stripe Tax initially (economic nexus thresholds)
- **EU sales**: Use Stripe Tax (adds 0.5% to fees)
- **Global**: Consider Paddle (Merchant of Record handles everything)

### Q: Do I need a webhook for every event?
**A**: No. Start with these critical events:
- `checkout.session.completed` - User completed purchase
- `customer.subscription.updated` - Subscription changed
- `customer.subscription.deleted` - Subscription canceled
- `invoice.payment_failed` - Payment failed (trigger grace period)

### Q: How do I test webhooks locally?
**A**: Use [Stripe CLI](https://stripe.com/docs/stripe-cli):
```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
stripe trigger payment_intent.succeeded
```

### Q: What if Stripe goes down?
**A**:
- Your app continues working (subscription checks are in your DB)
- New signups fail (can't process payments)
- Stripe has 99.99% uptime SLA
- Consider: Queue webhook events for retry

### Q: Should I store credit card details?
**A**: **Never.** Let Stripe handle all card storage. You only store:
- `stripeCustomerId` (safe, non-sensitive)
- `stripeSubscriptionId` (safe, non-sensitive)
- Never store card numbers, CVV, or sensitive data

---

## Security Checklist

### When Implementing Stripe:

✅ **Webhook signature verification**
```typescript
const event = stripe.webhooks.constructEvent(
  req.body,
  signature,
  webhookSecret
);
```

✅ **Use environment variables for keys**
```typescript
// ❌ Never commit keys to git
const stripe = new Stripe('sk_live_...');

// ✅ Use environment variables
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
```

✅ **Rate limit checkout endpoint**
```typescript
const checkoutRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5 // 5 checkout sessions per 15min
});

app.post('/api/checkout/create-session',
  checkoutRateLimit,
  handler
);
```

✅ **Validate user owns subscription before changes**
```typescript
// ❌ Trust user input
app.post('/api/cancel-subscription', async (req, res) => {
  await stripe.subscriptions.cancel(req.body.subscriptionId);
});

// ✅ Verify ownership
app.post('/api/cancel-subscription', async (req, res) => {
  const sub = await prisma.subscription.findUnique({
    where: {
      id: req.body.subscriptionId,
      userId: req.userId // Verify ownership
    }
  });
  if (!sub) return res.status(403).json({ error: 'Forbidden' });

  await stripe.subscriptions.cancel(sub.stripeSubscriptionId);
});
```

✅ **Use webhook idempotency**
```typescript
// Stripe sends same event multiple times
// Store processed event IDs to avoid double-processing
const processed = await redis.get(`webhook:${event.id}`);
if (processed) {
  return res.json({ received: true });
}
await processWebhook(event);
await redis.set(`webhook:${event.id}`, 'true', 'EX', 86400);
```

---

## Conclusion

### 🎯 Final Recommendation: Keep Custom System + Add Stripe

**Your custom subscription system is well-architected.** You have:
- Clean service layer separation
- Type-safe validation logic
- Flexible feature flag system
- Grace periods and tier management

**What you're missing is payment processing.** Stripe is the perfect addition because:
- ✅ Lowest fees (2.9% + 30¢)
- ✅ Best developer experience
- ✅ Minimal code changes needed
- ✅ You keep all your business logic
- ✅ 4-6 days to implement

**Don't rebuild what's working.** Your custom tier management is actually better than most platforms because:
- You control the logic
- You can customize instantly
- No platform limitations
- No per-user pricing
- TypeScript type safety

**Add Stripe for what it's best at:**
- Processing payments securely
- Generating invoices
- Handling failed payments
- Providing customer portal
- Managing tax compliance

---

## Next Steps

### Week 1: Stripe Integration
1. **Day 1**: Set up Stripe account and create products
2. **Day 2**: Implement StripeService wrapper
3. **Day 3**: Build checkout endpoint and test flow
4. **Day 4**: Implement webhook handler
5. **Day 5**: Add billing portal
6. **Day 6**: Testing and edge cases
7. **Day 7**: Production deployment

### Week 2: Frontend Polish
1. Build pricing page
2. Add "Upgrade" CTAs throughout app
3. Add "Manage Billing" to settings
4. Add subscription status badges
5. Test full user journey

### Week 3: Monitor & Optimize
1. Monitor webhook reliability
2. Track conversion rates
3. Optimize pricing page
4. Add analytics events
5. Set up alerts for failed payments

---

## Resources & Sources

### Stripe Documentation
- [Build Subscriptions Integration](https://docs.stripe.com/billing/subscriptions/build-subscriptions?platform=web&ui=elements)
- [Stripe TypeScript Guide](https://www.xjavascript.com/blog/stripe-typescript/)
- [Stripe Node.js Library](https://github.com/stripe/stripe-node)
- [Subscription Integration Guide 2024](https://dev.to/ivanivanovv/stripe-subscription-integration-in-nodejs-2024-ultimate-guide-2ba3)
- [Stripe Subscriptions API](https://stripe.com/docs/api/subscriptions?lang=node)

### Alternative Payment Platforms
- [Paddle vs Lemon Squeezy](https://www.paddle.com/compare/lemon-squeezy)
- [Lemon Squeezy Alternative](https://www.lemonsqueezy.com/paddle-alternative)
- [Paddle Alternatives for SaaS 2025](https://affonso.io/blog/paddle-alternatives-for-saas)
- [SaaS Payment Fee Calculator](https://saasfeecalc.com/)

### Clerk Billing
- [Clerk + Stripe at Stripe Sessions 2025](https://stripe.com/sessions/2025/instant-zero-integration-saas-billing-with-clerk-stripe)
- [Clerk Billing Documentation](https://clerk.com/docs/guides/billing/overview)
- [Getting Started with Clerk Billing](https://dev.to/arapp_clerkian/getting-started-with-clerk-billing-4j17)

### Open Source Billing
- [Lago - Open Source Billing](https://github.com/getlago/lago)
- [Lago Documentation](https://getlago.com/docs/guide/introduction/welcome-to-lago)
- [Subscriber - Node.js Library](https://github.com/deitch/subscriber)
- [Weld Subscription Service](https://github.com/weld-io/subscription-service)

### Implementation Guides
- [Recurring Billing with Node.js](https://medium.com/@pholiveiradev/developing-a-recurring-billing-system-with-node-js-499dfa0f6c0b)
- [Subscription Management with Express](https://www.geeksforgeeks.org/node-js/subscription-management-system-with-nodejs-and-expressjs/)
- [Stripe Integration Best Practices](https://medium.com/@thisunwork/implementing-the-stripe-payment-service-in-nodejs-express-js-to-manage-subscriptions-cdff7a4fef33)

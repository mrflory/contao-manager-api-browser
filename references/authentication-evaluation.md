# Authentication System Evaluation: Standard Packages vs Custom Implementation

## Executive Summary

Your current authentication system is a **custom JWT-based implementation** with:
- Manual user registration/login with bcrypt password hashing
- JWT access tokens (15min) + refresh tokens (7-30 days)
- Email verification system
- Password reset flows
- Custom middleware for authentication
- CSRF protection and rate limiting

This evaluation examines **5 standard authentication libraries** that could replace your custom code and provide **MFA + Passkey/WebAuthn** support.

---

## Current Implementation Analysis

### Architecture
- **Backend**: Custom [UserAuthService](src/services/userAuthService.ts) with Prisma ORM
- **Routes**: Manual route definitions in [authRoutes.ts](src/routes/authRoutes.ts)
- **Middleware**: Custom JWT validation in [userAuthMiddleware.ts](src/middleware/userAuthMiddleware.ts)
- **Database**: PostgreSQL with Prisma (User, Session, PasswordResetToken tables)
- **Security**: Manual implementation of bcrypt, JWT, CSRF tokens, rate limiting

### Current Features ✅
- ✅ Email/password authentication
- ✅ JWT access + refresh tokens
- ✅ Email verification
- ✅ Password reset
- ✅ Session management
- ✅ Rate limiting
- ✅ CSRF protection

### Missing Features ❌
- ❌ Multi-factor authentication (TOTP, SMS)
- ❌ Passkeys / WebAuthn
- ❌ Biometric authentication
- ❌ OAuth/Social login providers
- ❌ Magic link authentication
- ❌ Account linking
- ❌ Session management UI
- ❌ Admin user management

---

## Authentication Library Options

### 1. **Better Auth** ⭐ RECOMMENDED

**Overview**: Modern, TypeScript-first authentication framework released in 2024-2025.

#### Pros ✅
- **Framework-agnostic**: Works with Express, Fastify, Next.js, Vue, Svelte, etc.
- **Excellent TypeScript support**: Full type safety throughout
- **Built-in Passkey plugin**: Powered by SimpleWebAuthn
- **Built-in MFA/2FA**: TOTP plugin included
- **Modern features**: Magic links, username auth, social providers
- **Simple API**: Minimal configuration, intuitive plugin system
- **Active development**: YC-backed, very recent (2024-2025)
- **Great documentation**: Clear examples for all features
- **Database agnostic**: Works with Prisma, Drizzle, etc.

#### Cons ❌
- **New project**: Less battle-tested than Auth0/Passport.js
- **Smaller ecosystem**: Fewer third-party integrations
- **Community size**: Smaller community compared to established solutions

#### Implementation Effort
**Effort**: 🟢 LOW-MEDIUM (2-4 days)

**Steps**:
1. Install `better-auth` package
2. Configure auth instance with passkey + twoFactor plugins
3. Replace custom routes with Better Auth routes
4. Update frontend to use Better Auth React hooks
5. Migrate existing users (password hash compatible)
6. Update middleware to use Better Auth sessions

**Code Example**:
```typescript
import { betterAuth } from "better-auth";
import { passkey, twoFactor } from "better-auth/plugins";

export const auth = betterAuth({
  database: prisma,
  plugins: [
    passkey(),
    twoFactor()
  ],
  emailAndPassword: {
    enabled: true
  }
});
```

**Migration Path**:
- Your existing Prisma schema can be adapted
- Existing bcrypt passwords are compatible
- Can run alongside custom auth during migration

#### Cost
- **Free**: 100% open source, MIT license
- **Self-hosted**: No per-user pricing

**Links**:
- [GitHub Repository](https://github.com/better-auth/better-auth)
- [Documentation](https://www.better-auth.com/docs/introduction)
- [Passkey Plugin](https://www.better-auth.com/docs/plugins/passkey)

---

### 2. **Passport.js + Plugins**

**Overview**: Established Node.js authentication middleware (10+ years, battle-tested).

#### Pros ✅
- **Battle-tested**: Used by millions of applications
- **Huge ecosystem**: 500+ authentication strategies
- **WebAuthn support**: Official `passport-fido2-webauthn` plugin
- **Modular**: Pick only what you need
- **Express integration**: Native Express middleware
- **TOTP support**: `passport-totp` for MFA

#### Cons ❌
- **Manual integration**: Requires more boilerplate code
- **Strategy complexity**: Each feature needs separate strategy setup
- **Session management**: Need to handle sessions separately
- **No built-in UI**: All UI must be custom-built
- **TypeScript support**: Mixed, some strategies lack types
- **Configuration overhead**: More code to wire everything together

#### Implementation Effort
**Effort**: 🟡 MEDIUM-HIGH (5-8 days)

**Steps**:
1. Install passport, passport-local, passport-fido2-webauthn, passport-totp
2. Configure each strategy separately
3. Implement custom serialization/deserialization
4. Build session management layer
5. Create custom routes for each auth method
6. Build UI for registration, login, MFA setup, passkey registration
7. Update middleware to use passport.authenticate()

**Code Example**:
```typescript
import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { Strategy as WebAuthnStrategy } from 'passport-fido2-webauthn';
import { Strategy as TotpStrategy } from 'passport-totp';

// Local strategy (email/password)
passport.use(new LocalStrategy(async (username, password, done) => {
  // Your custom validation logic
}));

// WebAuthn strategy (passkeys)
passport.use(new WebAuthnStrategy({
  // Complex configuration required
}, async (user, id, publicKey, done) => {
  // Your custom credential storage
}));

// TOTP strategy (2FA)
passport.use(new TotpStrategy(async (user, done) => {
  // Your custom TOTP verification
}));
```

**Migration Path**:
- Can wrap existing auth logic in Passport strategies
- Incremental migration possible
- Keep existing database schema

#### Cost
- **Free**: 100% open source, MIT license
- **Self-hosted**: No per-user pricing

**Links**:
- [GitHub - Passport Core](https://github.com/jaredhanson/passport)
- [GitHub - Passport WebAuthn](https://github.com/jaredhanson/passport-webauthn)
- [FIDO2 WebAuthn Package](https://www.passportjs.org/packages/passport-fido2-webauthn/)
- [Documentation](https://www.passportjs.org/concepts/authentication/)

---

### 3. **Clerk** (SaaS)

**Overview**: Modern authentication-as-a-service with beautiful pre-built UI components.

#### Pros ✅
- **Pre-built UI**: Beautiful, customizable components out-of-the-box
- **Excellent DX**: Minimal configuration, works in minutes
- **Full feature set**: MFA, passkeys (beta), social login, magic links
- **Session management**: Built-in session handling and user management
- **Admin dashboard**: Web UI for user management
- **React integration**: Excellent hooks and components
- **Bot protection**: Built-in security features
- **Webhooks**: Event-driven user lifecycle hooks

#### Cons ❌
- **Vendor lock-in**: Proprietary SaaS platform
- **Cost**: Starts free (10,000 MAU), then $25/month + $0.02/MAU
- **Data residency**: User data stored in Clerk's infrastructure
- **Customization limits**: Limited control over auth flows
- **Migration difficulty**: Hard to migrate away later
- **Beta features**: Passkeys still in beta

#### Implementation Effort
**Effort**: 🟢 LOW (1-2 days)

**Steps**:
1. Sign up for Clerk account
2. Install `@clerk/express` and `@clerk/react`
3. Add Clerk middleware to Express
4. Replace auth routes with Clerk components
5. Update frontend to use Clerk React hooks
6. Migrate users via Clerk API or CSV import

**Code Example**:
```typescript
// Backend (Express)
import { clerkMiddleware } from '@clerk/express';
app.use(clerkMiddleware());

// Frontend (React)
import { SignIn, SignUp, UserButton } from '@clerk/react';

function App() {
  return (
    <ClerkProvider publishableKey={key}>
      <SignIn />
      <UserButton />
    </ClerkProvider>
  );
}
```

**Migration Path**:
- Requires migrating users to Clerk
- Cannot run alongside custom auth
- Full replacement required

#### Cost
- **Free tier**: Up to 10,000 monthly active users
- **Pro**: $25/month + $0.02 per MAU over 10,000
- **Enterprise**: Custom pricing

**Revenue Considerations**:
- For a SaaS product, user auth costs scale with revenue
- At 100,000 MAU: ~$1,825/month ($25 + $1,800)
- At 500,000 MAU: ~$9,825/month

**Links**:
- [User Management Comparison](https://clerk.com/articles/user-management-platform-comparison-react-clerk-auth0-firebase)
- [Clerk vs Supabase](https://clerk.com/articles/clerk-vs-supabase-auth)

---

### 4. **Supabase Auth** (Open Source + SaaS)

**Overview**: PostgreSQL-based auth system, part of the Supabase ecosystem.

#### Pros ✅
- **Open source**: Can self-host or use managed service
- **Database integration**: Tight PostgreSQL integration with Row Level Security
- **Cost-effective**: Simple pricing based on Supabase usage
- **Magic links**: Built-in passwordless authentication
- **Social providers**: Easy OAuth integration
- **Self-hosting option**: Full control if needed
- **TypeScript SDK**: Excellent TypeScript support

#### Cons ❌
- **Supabase dependency**: Works best with full Supabase stack
- **Limited MFA**: Basic TOTP, no advanced MFA options
- **No passkeys**: No native passkey/WebAuthn support
- **Database migration**: Requires using Supabase database or replication
- **Less enterprise features**: Not as feature-rich as Auth0/Clerk

#### Implementation Effort
**Effort**: 🟡 MEDIUM (3-5 days)

**Steps**:
1. Set up Supabase project (or self-host)
2. Install `@supabase/supabase-js`
3. Configure Supabase auth settings
4. Migrate database to Supabase (or use connection pooling)
5. Replace auth routes with Supabase client calls
6. Update frontend to use Supabase auth hooks
7. Set up Row Level Security policies

**Code Example**:
```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Sign up
await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'password'
});

// MFA enrollment
await supabase.auth.mfa.enroll({
  factorType: 'totp'
});
```

**Migration Path**:
- Requires database migration or connection to Supabase
- User data must be synced to Supabase Auth tables
- Can use Supabase as auth layer with existing database

#### Cost
**Managed (Supabase Cloud)**:
- **Free tier**: Up to 50,000 MAU
- **Pro**: $25/month + usage-based billing
- **Team**: $599/month

**Self-hosted**:
- **Free**: Self-host with Docker
- **Infrastructure costs**: Your server costs

**Links**:
- [Supabase vs Clerk](https://www.devtoolsacademy.com/blog/supabase-vs-clerk/)
- [Comparing Auth Providers](https://blog.hyperknot.com/p/comparing-auth-providers)

---

### 5. **Hanko** (Open Source Passkey-First)

**Overview**: Modern open source authentication focused on passkeys and WebAuthn.

#### Pros ✅
- **Passkey-first**: Built specifically for WebAuthn/FIDO2
- **Open source**: MIT license, fully self-hostable
- **FIDO2 certified**: Official certification for WebAuthn
- **Passkey API**: Can add to existing auth systems
- **Node.js SDK**: Good Express.js integration
- **Web Components**: Pre-built UI elements (Hanko Elements)
- **Privacy-focused**: Data minimalism principles

#### Cons ❌
- **Passkey-focused**: Less mature for traditional email/password
- **Smaller community**: Newer project, smaller ecosystem
- **Limited MFA**: Passkeys are primary, traditional MFA limited
- **Documentation gaps**: Some advanced scenarios lack examples
- **Integration complexity**: Requires understanding WebAuthn concepts

#### Implementation Effort
**Effort**: 🟡 MEDIUM (4-6 days)

**Steps**:
1. Set up Hanko Cloud or self-host Hanko backend
2. Install `@teamhanko/hanko-elements` and Node.js SDK
3. Configure Hanko tenant and API keys
4. Integrate Hanko Elements in frontend for passkey registration
5. Set up backend endpoints for passkey verification
6. Migrate existing users (can keep password auth as fallback)
7. Implement traditional auth alongside passkeys

**Code Example**:
```typescript
// Backend (Express.js)
import { tenant } from '@teamhanko/hanko-sdk';

const hankoTenant = tenant({
  tenantId: HANKO_TENANT_ID,
  apiKey: HANKO_API_KEY
});

// Initialize passkey registration
app.post('/passkey/register/init', async (req, res) => {
  const options = await hankoTenant.registration.initialize({
    userId: req.user.id,
    username: req.user.email
  });
  res.json(options);
});

// Finalize passkey registration
app.post('/passkey/register/finalize', async (req, res) => {
  const result = await hankoTenant.registration.finalize({
    userId: req.user.id,
    credential: req.body.credential
  });
  res.json(result);
});
```

**Migration Path**:
- Can add passkeys to existing auth system
- Use Passkey API alongside current implementation
- Gradual migration: keep passwords, add passkeys

#### Cost
**Hanko Cloud**:
- **Community**: Free up to 5,000 MAU
- **Team**: $99/month up to 10,000 MAU
- **Enterprise**: Custom pricing

**Self-hosted**:
- **Free**: MIT license
- **Infrastructure costs**: Your server costs

**Links**:
- [GitHub Repository](https://github.com/teamhanko/hanko)
- [Passkey API Guide](https://www.hanko.io/blog/passkeys-node-js-app)
- [Documentation](https://docs.hanko.io/passkey-api/introduction)

---

## Comparison Matrix

| Feature | Current Custom | Better Auth | Passport.js | Clerk | Supabase Auth | Hanko |
|---------|---------------|-------------|-------------|-------|---------------|-------|
| **Email/Password** | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ (Limited) |
| **Passkeys/WebAuthn** | ❌ | ✅ | ✅ | ⚠️ (Beta) | ❌ | ✅✅ (Core feature) |
| **MFA/2FA (TOTP)** | ❌ | ✅ | ✅ | ✅ | ⚠️ (Basic) | ⚠️ (Limited) |
| **Social Login** | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Magic Links** | ❌ | ✅ | ⚠️ (Plugin) | ✅ | ✅ | ✅ |
| **TypeScript Support** | ✅ | ✅✅ (Excellent) | ⚠️ (Mixed) | ✅ | ✅ | ✅ |
| **Self-Hosted** | ✅ | ✅ | ✅ | ❌ | ✅ (Option) | ✅ |
| **Open Source** | ✅ | ✅ (MIT) | ✅ (MIT) | ❌ | ✅ (Apache 2.0) | ✅ (MIT) |
| **Pre-built UI** | ❌ | ⚠️ (Basic) | ❌ | ✅✅ (Excellent) | ⚠️ (Basic) | ✅ (Elements) |
| **Session Management** | ✅ | ✅ | ⚠️ (Manual) | ✅✅ | ✅ | ✅ |
| **Admin Dashboard** | ❌ | ❌ | ❌ | ✅✅ | ✅ (Supabase) | ✅ (Hanko Cloud) |
| **Implementation Effort** | N/A | 🟢 Low-Med | 🟡 Med-High | 🟢 Low | 🟡 Medium | 🟡 Medium |
| **Monthly Cost (0-10K MAU)** | $0 | $0 | $0 | $0 | $0 | $0 |
| **Monthly Cost (100K MAU)** | $0 | $0 | $0 | ~$1,825 | ~$25-50 | ~$99+ |
| **Vendor Lock-in Risk** | None | None | None | High | Medium | Low |

---

## Recommendation by Use Case

### 🏆 **Best Overall: Better Auth**

**Recommended if**:
- You want modern TypeScript-first authentication
- You need passkeys + MFA without vendor lock-in
- You want to self-host and maintain control
- You prefer a simple, plugin-based architecture
- Implementation speed is important

**Why**: Best balance of features, simplicity, and control. Active development, excellent documentation, no vendor lock-in, and full MFA + passkey support.

---

### 🎯 **Best for Speed: Clerk**

**Recommended if**:
- You want to ship authentication in 1-2 days
- Pre-built UI components are valuable
- You're building a SaaS with budget for auth
- User management dashboard is important
- You don't mind vendor lock-in

**Why**: Fastest implementation, beautiful UI out-of-the-box, excellent developer experience. Trade-off: monthly costs and vendor dependency.

---

### 🔧 **Best for Flexibility: Passport.js**

**Recommended if**:
- You need maximum control and customization
- You want battle-tested, proven technology
- You have time to build custom UI
- You prefer established, mature libraries
- You want to integrate obscure auth providers

**Why**: Most flexible, huge ecosystem, completely customizable. Trade-off: more code to write and maintain.

---

### 🔐 **Best for Passkeys: Hanko**

**Recommended if**:
- Passkeys are your primary authentication method
- You want FIDO2-certified implementation
- Privacy and security are top priorities
- You're willing to invest in modern auth UX
- You want to phase out passwords entirely

**Why**: Purpose-built for passkeys, FIDO2 certified, excellent WebAuthn support. Trade-off: less mature for traditional auth flows.

---

## Implementation Roadmap (Better Auth)

### Phase 1: Setup (Day 1)
1. Install Better Auth: `npm install better-auth`
2. Configure auth instance with Prisma adapter
3. Set up passkey and twoFactor plugins
4. Generate Prisma schema migrations

### Phase 2: Backend Integration (Day 2)
1. Create Better Auth routes in Express
2. Replace custom JWT middleware with Better Auth session middleware
3. Update authentication checks across existing routes
4. Test authentication flows

### Phase 3: Frontend Integration (Day 3)
1. Install Better Auth React client
2. Replace login/register forms with Better Auth hooks
3. Add passkey enrollment UI
4. Add 2FA/TOTP setup UI
5. Test user flows

### Phase 4: Migration (Day 4)
1. Write migration script for existing users
2. Migrate password hashes (bcrypt compatible)
3. Test existing user login
4. Update password reset flows
5. Verify email verification still works

### Phase 5: Testing & Cleanup (Day 5)
1. End-to-end testing of all auth flows
2. Remove old custom auth code
3. Update documentation
4. Deploy to staging
5. User acceptance testing

---

## Cost Analysis (5-Year Projection)

Assuming your SaaS grows from 0 → 100K MAU over 5 years:

| Solution | Year 1 | Year 2 | Year 3 | Year 4 | Year 5 | 5-Yr Total |
|----------|--------|--------|--------|--------|--------|------------|
| **Better Auth** | $0 | $0 | $0 | $0 | $0 | **$0** |
| **Passport.js** | $0 | $0 | $0 | $0 | $0 | **$0** |
| **Hanko (Self-host)** | $0 | $0 | $0 | $0 | $0 | **$0** |
| **Supabase Auth** | $0 | $300 | $600 | $600 | $600 | **$2,100** |
| **Hanko Cloud** | $0 | $1,188 | $1,188 | $1,188 | $1,188 | **$4,752** |
| **Clerk** | $0 | $3,600 | $10,800 | $16,200 | $21,900 | **$52,500** |

*Assumptions: 0 → 10K → 30K → 50K → 75K → 100K MAU growth*

---

## Migration Complexity

### Better Auth Migration 🟢
- **User Data**: Can keep existing Prisma schema with modifications
- **Passwords**: bcrypt compatible, no re-hashing needed
- **Sessions**: New session table required
- **Frontend**: Update auth hooks and components
- **Downtime**: Zero-downtime migration possible

### Passport.js Migration 🟡
- **User Data**: Keep existing database as-is
- **Passwords**: Wrap existing bcrypt logic in strategies
- **Sessions**: Need to add session store (Redis/PostgreSQL)
- **Frontend**: No changes to API surface
- **Downtime**: Can run alongside existing auth

### Clerk Migration 🔴
- **User Data**: Must migrate to Clerk's database
- **Passwords**: Clerk handles password hashing
- **Sessions**: Clerk session management
- **Frontend**: Complete rewrite with Clerk components
- **Downtime**: Requires full cutover, risky migration

---

## Security Considerations

### Better Auth ✅
- Modern security practices built-in
- CSRF protection included
- Rate limiting supported
- Session rotation
- Open source: community security audits

### Passport.js ✅
- Battle-tested over 10+ years
- Security vulnerabilities quickly patched
- Large community finding issues
- Requires manual security setup (CSRF, rate limiting)

### Clerk ✅
- Professional security team
- SOC 2 Type II compliance (in progress)
- Regular penetration testing
- Closed source: relies on vendor security

### Supabase Auth ✅
- Open source security audits
- PostgreSQL Row Level Security
- Self-hosting option for maximum control

### Hanko ✅
- FIDO2 certified (highest WebAuthn standard)
- Open source security review
- Privacy-focused architecture
- WebAuthn provides phishing resistance

---

## Final Recommendation

### 🥇 **Primary Recommendation: Better Auth**

**Rationale**:
1. **Modern Architecture**: TypeScript-first, built for 2025+ standards
2. **Feature Complete**: Passkeys + MFA + all traditional auth methods
3. **Zero Vendor Lock-in**: Open source, self-hosted, no per-user pricing
4. **Reasonable Implementation**: 2-4 days vs 1+ weeks for Passport.js
5. **Active Development**: Recent project with strong momentum
6. **Cost**: $0 forever, scales to millions of users

**Best for your use case because**:
- You already have PostgreSQL + Prisma (perfect fit)
- You value TypeScript and type safety
- You want to add passkeys + MFA without complexity
- You're building a SaaS where auth costs should be $0
- You want modern features without vendor lock-in

---

### 🥈 **Alternative: Passport.js + Plugins**

**Use if**:
- You prefer battle-tested, proven technology
- You need maximum control and customization
- You have development time for integration work
- You want the largest ecosystem of auth strategies

**Trade-off**: More implementation work (5-8 days), more code to maintain, but maximum flexibility.

---

### 🥉 **Alternative: Clerk (SaaS)**

**Use if**:
- You need auth implemented in 1-2 days
- Beautiful pre-built UI is worth the cost
- You have budget for per-user pricing
- Admin dashboard and user management are critical
- You're early-stage and speed > cost

**Trade-off**: Vendor lock-in, $0 → $21,900/year as you scale to 100K users.

---

## Next Steps

### To implement Better Auth:

1. **Review Documentation**: https://www.better-auth.com/docs/introduction
2. **Prototype**: Set up a test project with passkey + 2FA plugins
3. **Plan Migration**: Create detailed migration plan for existing users
4. **Staging Deployment**: Test in staging environment
5. **Gradual Rollout**: Deploy to production with feature flags
6. **Monitor**: Track authentication success rates and errors

### Questions to Answer Before Decision:

1. **Timeline**: How quickly do you need MFA + passkeys?
2. **Budget**: Is $0 auth cost critical for your business model?
3. **Control**: How important is self-hosting and data ownership?
4. **UI**: Do you need pre-built UI or are you building custom?
5. **Scale**: What MAU do you expect in 1 year? 5 years?

---

## Conclusion

For your Contao Manager API project with **PostgreSQL + Prisma + TypeScript + Express**, **Better Auth** is the optimal choice. It provides:

✅ **Everything you need**: Passkeys, MFA, email/password, social login
✅ **Zero ongoing costs**: No per-user pricing, fully self-hosted
✅ **Modern architecture**: TypeScript-first, excellent DX
✅ **Reasonable migration**: 2-4 days implementation time
✅ **No vendor lock-in**: Open source MIT license

Alternative paths exist (Clerk for speed, Passport.js for flexibility, Hanko for passkey-first), but Better Auth offers the best balance for your technical stack and business needs.

---

## Sources

### Better Auth
- [GitHub Repository](https://github.com/better-auth/better-auth)
- [Documentation](https://www.better-auth.com/docs/introduction)
- [Passkey Plugin](https://www.better-auth.com/docs/plugins/passkey)
- [Better Auth vs NextAuth](https://www.devtoolsacademy.com/blog/betterauth-vs-nextauth/)
- [LogRocket Review](https://blog.logrocket.com/better-auth-authentication/)

### Passport.js
- [GitHub - Passport Core](https://github.com/jaredhanson/passport)
- [GitHub - Passport WebAuthn](https://github.com/jaredhanson/passport-webauthn)
- [FIDO2 WebAuthn Package](https://www.passportjs.org/packages/passport-fido2-webauthn/)
- [Documentation](https://www.passportjs.org/concepts/authentication/)
- [Descope Passport Strategy](https://www.descope.com/blog/post/passportjs-strategy)

### Clerk
- [User Management Comparison](https://clerk.com/articles/user-management-platform-comparison-react-clerk-auth0-firebase)
- [Clerk vs Supabase](https://clerk.com/articles/clerk-vs-supabase-auth)
- [Next.js Auth Tools Guide](https://clerk.com/articles/authentication-tools-for-nextjs)

### Supabase Auth
- [Supabase vs Clerk](https://www.devtoolsacademy.com/blog/supabase-vs-clerk/)
- [Comparing Auth Providers](https://blog.hyperknot.com/p/comparing-auth-providers)

### Hanko
- [GitHub Repository](https://github.com/teamhanko/hanko)
- [Passkey API Guide](https://www.hanko.io/blog/passkeys-node-js-app)
- [Passkey API Documentation](https://www.hanko.io/passkey-api)
- [Documentation](https://docs.hanko.io/passkey-api/introduction)

### General Authentication
- [Top Authentication Providers 2025](https://kinde.com/comparisons/top-authentication-providers-2025/)
- [Passwordless Authentication Solutions](https://stytch.com/blog/passwordless-authentication-solutions/)
- [Auth0 Alternatives](https://www.osohq.com/learn/auth0-alternatives)
- [Passkeys and MFA](https://www.theregister.com/2025/12/06/multifactor_authentication_passkeys/)

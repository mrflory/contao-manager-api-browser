# Phase 3.2 Subscription Management System - Frontend Testing Guide

## 🧪 **Frontend Testing Checklist for Phase 3.2 Subscription System**

### **1. Login Screen Behavior**
**What to Test:**
- [x] Page loads without console errors
- [x] No more "404 subscription/status" errors in console
- [x] Login functionality still works normally -> login works but console errors, see file tests-1-console

**Expected Behavior:**
- ✅ Clean console (no subscription API errors)
- ✅ Normal login flow preserved
- ✅ Background subscription hook handles authentication gracefully

---

### **2. Dashboard/Sites Overview Page**
**What to Test:**
- [x] Page loads showing subscription status
- [x] Site usage display (X of Y sites used)
- [x] "Add Site" button state based on limits

**Expected Results:**
- ✅ Should see: **"Free Plan: 2 sites"**
- ✅ Progress bar showing site usage (0/2, 1/2, etc.)
- ✅ **"Add Site" button enabled** if under limit
- ❌ **"Add Site" button disabled** if at limit (2/2 sites)

---

### **3. Add Site Page - Site Limit Testing**
**What to Test:**

#### **Scenario A: Under Site Limit (0-1 sites)**
- [x] Navigate to Add Site page
- [x] Normal site addition workflow

**Expected Results:**
- ✅ Page loads normally
- ✅ All form fields enabled
- ✅ Can submit site creation
- ✅ No upgrade prompts

#### **Scenario B: At Site Limit (2/2 sites on Free tier)**
- [x] Navigate to Add Site page
- [x] Try to add a new site

**Expected Results:**
- ❌ **Upgrade prompt displayed**: *"Site Limit Reached"*
- ❌ Form should be disabled or show warning
- ✅ Upgrade button should appear
- ✅ Message: *"You have reached your limit of 2 sites on the free plan"*

---

### **4. Subscription Status Components**
**What to Test:**
- [x] Find subscription status in UI (likely in header/sidebar)
- [x] Check subscription badge display
- [x] Verify feature availability indicators

**Expected Visual Elements:**
- ✅ **Subscription Badge**: "Free" with appropriate styling
- ✅ **Site Counter**: "2 sites used of 2 available"
- ✅ **Progress Bar**: Visual representation of usage
- ✅ **Feature Indicators**: ❌ for disabled features (History, Snapshots, etc.)

---

### **5. Feature Access Restrictions**
**What to Test:**
- [x] Try accessing premium features (if UI exists for them)
- [x] Look for disabled/grayed out premium features

**Expected Restrictions on Free Tier:**
- ❌ **History & Logging**: Should be disabled/hidden
- ❌ **Snapshots**: Should be disabled/hidden
- ❌ **Advanced Workflows**: Should be disabled/hidden
- ❌ **API Access**: Should be limited
- ❌ **Priority Support**: Not available

---

### **6. Error Scenarios to Test**

#### **Site Creation at Limit**
**What to Test:**
- [x] Create 2 sites first
- [x] Try to create a 3rd site

**Expected Error:**
```
❌ "Site limit exceeded. You have 2 of 2 sites. Upgrade to add more sites."
```

#### **Network/API Errors**
**What to Test:**
- [ ] Stop backend server
- [ ] Refresh frontend

**Expected Graceful Degradation:**
- ✅ Fallback to default subscription state
- ✅ Error message in subscription components
- ✅ App doesn't crash

---

### **7. Console Testing**
**What to Monitor:**
- [x] No 404 errors for subscription endpoints
- [x] Subscription data loads successfully
- [x] API calls use correct URLs (no double /api prefix)

**Console Commands to Test:**
```javascript
// In browser console:
// Check subscription state
console.log(window.localStorage); // Look for any subscription data

// Test API calls directly
fetch('/api/subscription/plans').then(r => r.json()).then(console.log);
```

---

### **8. User Flow Testing**

#### **New User Journey**
1. [ ] Register new account
2. [ ] Check initial subscription (should be Free tier)
3. [ ] Add first site (should work)
4. [ ] Add second site (should work)
5. [ ] Try to add third site (should show upgrade prompt)

#### **Existing User Journey**
1. [ ] Login with existing account
2. [ ] Verify subscription status loads correctly
3. [ ] Check site count matches actual sites

---

### **9. Upgrade Flow Testing**
**What to Test:**
- [ ] Click upgrade button/link (if implemented)
- [ ] Verify upgrade messaging

**Expected Behavior:**
- ✅ Upgrade button should be present when limits reached
- ✅ Should show plan comparison (Free vs Advanced vs Premium)
- ⚠️ *Note: Actual payment processing not implemented yet*

**Expected Plan Details:**
- **Free**: 2 sites, $0/month, basic features
- **Advanced**: 5 sites, $29/month, enhanced features (history, snapshots, logging)
- **Premium**: 20 sites, $99/month, all features including priority support

---

### **10. Component Rendering**
**What to Look For:**

#### **SubscriptionStatusSimple Component:**
- [ ] Displays current tier
- [ ] Shows site usage progress bar
- [ ] Shows upgrade button on free tier

#### **UpgradePromptSimple Component:**
- [ ] Appears when hitting site limits
- [ ] Shows appropriate messaging
- [ ] Has functional dismiss/upgrade buttons

---

### **11. API Integration Testing**

#### **Test API Endpoints Directly:**
```bash
# Test subscription status (requires authentication)
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3000/api/subscription/status

# Test subscription plans (no auth required)
curl http://localhost:3000/api/subscription/plans

# Test subscription limits (requires authentication)
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3000/api/subscription/limits

# Test action validation (requires authentication)
curl -X POST -H "Content-Type: application/json" -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"action":"add_site"}' http://localhost:3000/api/subscription/validate-action
```

#### **Expected API Responses:**
- `/subscription/status` → Current subscription with tier, status, limits, features
- `/subscription/plans` → All available subscription plans
- `/subscription/limits` → Site usage and limits information
- `/subscription/validate-action` → Whether specific actions are allowed

---

### **🚨 Critical Test Cases**

1. **Site Limit Enforcement**: Can you actually create more than 2 sites?
2. **UI Feedback**: Are users clearly informed about their limits?
3. **Graceful Degradation**: Does the app work if subscription service fails?
4. **Authentication Integration**: Does subscription data load after login?
5. **Real-time Updates**: Does site count update immediately after adding/removing sites?

---

### **🐛 Expected Issues to Watch For**

- Subscription hook might run before authentication completes
- Site count might not update immediately after adding/removing sites
- Upgrade prompts might not dismiss properly
- Progress bars might not render correctly
- Chakra UI v3 compatibility issues with subscription components
- API calls timing out or failing gracefully

---

### **📋 Test Results Template**

```markdown
## Test Results - [Date]

### ✅ Passing Tests
- [ ] Login screen loads without errors
- [ ] Dashboard shows subscription status
- [ ] Site limits enforced correctly
- [ ] etc.

### ❌ Failing Tests
- [ ] Issue description
- [ ] Steps to reproduce
- [ ] Expected vs actual behavior

### 🐛 Bugs Found
1. **Bug Title**: Description
   - **Steps**: How to reproduce
   - **Expected**: What should happen
   - **Actual**: What actually happens
   - **Priority**: High/Medium/Low

### 📝 Notes
- Additional observations
- Performance issues
- UX feedback
```

---

### **📚 Component Integration Guide**

#### **Where to Find Subscription Components:**
- `src/hooks/useSubscription.ts` - Main subscription hook
- `src/components/subscription/SubscriptionStatusSimple.tsx` - Status display
- `src/components/subscription/UpgradePromptSimple.tsx` - Upgrade prompts
- `src/pages/AddSite.tsx:167-175` - Site limit integration

#### **How to Debug Subscription Issues:**
1. Check browser console for API errors
2. Verify authentication tokens are present
3. Check network tab for failed subscription API calls
4. Use React DevTools to inspect subscription hook state
5. Test with backend server running (`npm run dev`)

#### **Test Data Setup:**
- Default users start with Free tier (2 sites max)
- Use multiple test accounts to verify isolation
- Create sites to test limit enforcement
- Backend provides automatic free tier provisioning

---

**🎯 Success Criteria:** All critical test cases pass, subscription limits are properly enforced, and users receive clear feedback about their plan status and limitations.
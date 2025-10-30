# Resend Email Setup Guide

This guide explains how to set up Resend for email delivery on Railway (or any platform that blocks SMTP).

## Why Resend?

Railway blocks outbound SMTP connections on ports 25, 465, and 587 to prevent spam. Resend solves this by using an HTTP API instead of SMTP, making it Railway-compatible.

## Free Tier

- **3,000 emails/month**
- **100 emails/day**
- Perfect for small to medium applications

## Setup Steps

### 1. Create a Resend Account

1. Go to [https://resend.com](https://resend.com)
2. Sign up for a free account
3. Verify your email address

### 2. Get Your API Key

1. Navigate to [https://resend.com/api-keys](https://resend.com/api-keys)
2. Click "Create API Key"
3. Give it a name (e.g., "Contao Manager Production")
4. Select "Full access" permission
5. Copy the API key (starts with `re_`)

### 3. Configure Domain (Optional but Recommended)

For production use with your own domain:

1. Go to [https://resend.com/domains](https://resend.com/domains)
2. Click "Add Domain"
3. Enter your domain (e.g., `yourdomain.com`)
4. Add the DNS records shown to your domain's DNS settings
5. Wait for verification (usually takes a few minutes)

**Note:** Without a verified domain, you can only send from `onboarding@resend.dev`

### 4. Add Environment Variables to Railway

1. Open your Railway project
2. Go to your service settings
3. Click "Variables" tab
4. Add the following variables:

```bash
# Required
RESEND_API_KEY=re_your_api_key_here

# Recommended (use your verified domain)
EMAIL_FROM=noreply@yourdomain.com

# Or use Resend's default (works immediately but less professional)
# EMAIL_FROM=onboarding@resend.dev
```

### 5. Deploy

1. Railway will automatically redeploy with the new environment variables
2. Check the logs to confirm email service initialization:
   ```
   [Email] Resend provider initialized with from: your@email.com
   [Email] Active email provider: Resend
   ```

## Testing

### Test Password Reset

1. Go to your application login page
2. Click "Forgot Password"
3. Enter a registered email address
4. Check your email for the password reset link

### Check Resend Dashboard

1. Go to [https://resend.com/emails](https://resend.com/emails)
2. You should see your sent emails with delivery status
3. Click on any email to see delivery details and logs

## Troubleshooting

### "Email service not configured"

- Check that `RESEND_API_KEY` is set in Railway environment variables
- Verify the API key is valid (starts with `re_`)
- Check Railway logs for initialization errors

### "Invalid from address"

- If using your own domain, ensure it's verified in Resend
- Alternatively, use `onboarding@resend.dev` for testing

### Emails not being received

- Check the Resend dashboard for delivery status
- Verify the recipient email is correct
- Check spam folder
- For custom domains, ensure DNS records are properly configured

## Fallback to SMTP

The application automatically falls back to SMTP if Resend is not configured. This is useful for:
- Local development
- Self-hosted deployments
- Environments without SMTP blocking

To use SMTP instead of Resend, configure these environment variables:

```bash
# Remove or don't set RESEND_API_KEY

# SMTP Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
EMAIL_FROM=noreply@yourapp.com
```

**Note:** SMTP will NOT work on Railway due to port blocking.

## Cost Estimation

### Free Tier Limits
- 3,000 emails/month = ~100 emails/day
- Enough for most small applications

### Example Usage
- 50 users signing up per day = 50 verification emails
- 10 password resets per day = 10 emails
- **Total: 60 emails/day** (well within free tier)

### Paid Plans
If you exceed the free tier:
- **Pro:** $20/month for 50,000 emails
- **Enterprise:** Custom pricing

## Additional Resources

- [Resend Documentation](https://resend.com/docs)
- [Resend API Reference](https://resend.com/docs/api-reference)
- [Resend Node.js SDK](https://github.com/resendlabs/resend-node)
- [Railway Email Delivery Guide](https://docs.railway.app/guides/email)

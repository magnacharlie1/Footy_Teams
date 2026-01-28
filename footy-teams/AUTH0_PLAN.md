# Auth0 Migration Plan (Footy Teams)

Goal: Replace direct Google/Apple OAuth with Auth0 as the single provider, so users can pick multiple sign-ins via Auth0.

## 1) Auth0 setup (one-time in Auth0 dashboard)
- Create a new **Regular Web App**.
- Note: Domain + Client ID + Client Secret.
- Configure Allowed Callback URLs:
  - https://teamspicker.netlify.app/api/auth/callback/auth0
  - (optional) https://$DEPLOY_PRIME_URL/api/auth/callback/auth0 for previews
- Configure Allowed Logout URLs:
  - https://teamspicker.netlify.app
- Configure Allowed Web Origins:
  - https://teamspicker.netlify.app
- Create an Auth0 tenant app connection:
  - Enable Google (and Apple later) inside Auth0.

## 2) Netlify env vars
Set these in Netlify (Production and optionally Deploy Preview):
- AUTH0_ISSUER = https://YOUR_TENANT.auth0.com
- AUTH0_CLIENT_ID = ...
- AUTH0_CLIENT_SECRET = ...
- NEXTAUTH_URL = https://teamspicker.netlify.app
- NEXTAUTH_SECRET = ...

Optional:
- AUTH0_AUDIENCE (only if you add API authorization in Auth0)

## 3) Code changes (NextAuth)
Files to change:
- src/auth.ts
  - Replace Google/Apple providers with Auth0 provider:
    - import Auth0 from "next-auth/providers/auth0"
    - providers: [Auth0({ clientId, clientSecret, issuer })]
  - Remove applePrivateKey logic.
- src/components/login-actions.tsx
  - Simplify to single "Sign in" button for Auth0.
- src/app/login/page.tsx
  - Remove Apple-specific text/logic.
- .env.example
  - Replace GOOGLE_*/APPLE_* with AUTH0_*.

## 4) Rollout
- Push changes to GitHub.
- Redeploy Netlify.
- Test login at /login.

## 5) Optional polish
- Add provider buttons later (Google/Apple) by enabling them in Auth0.
- Add Auth0 branding (logo, colors) in Auth0 dashboard.

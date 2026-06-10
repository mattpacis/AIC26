# Google & Microsoft sign-in (Campus360)

## New account on first Google login

Set in `backend/.env`:

```env
OAUTH_AUTO_PROVISION=true
```

When enabled:

1. User clicks **Sign in with Google** on the login page (Student or Staff tab).
2. Google returns their email + name.
3. If no user exists → Campus360 **creates** a new account (+ student profile for students).
4. User lands on the dashboard logged in.

If `OAUTH_AUTO_PROVISION` is **false** (default), unknown emails get:
`No Campus360 account exists for this email.`

---

## Google Cloud setup

1. [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials
2. **OAuth client ID** → Web application
3. **Authorized redirect URI:**

   ```text
   http://localhost:3001/api/auth/google/callback
   ```

4. Copy Client ID + Client Secret into `backend/.env`:

```env
OAUTH_CALLBACK_BASE_URL=http://localhost:3001
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-secret

# Optional — restrict to Ateneo Google Workspace
GOOGLE_OAUTH_HD=ateneo.edu.ph
OAUTH_GOOGLE_ALLOWED_DOMAINS=ateneo.edu.ph

# Create new users on first Google sign-in
OAUTH_AUTO_PROVISION=true
```

5. Restart backend: `cd backend && npm run dev`

---

## Login page flow

| Step | What happens |
|------|----------------|
| 1 | User picks **Student** or **Staff** |
| 2 | Clicks **Sign in with Google** |
| 3 | `GET /api/auth/google?role=student` → Google |
| 4 | `GET /api/auth/google/callback` → create/find user → session cookie |
| 5 | Redirect to `/login/oauth-callback` → dashboard |

---

## Microsoft (Outlook)

Same pattern with:

```text
http://localhost:3001/api/auth/microsoft/callback
```

```env
MICROSOFT_CLIENT_ID=...
MICROSOFT_CLIENT_SECRET=...
MICROSOFT_OAUTH_TENANT=common
OAUTH_MICROSOFT_ALLOWED_DOMAINS=outlook.com,live.com
```

---

## Dev password login still works

`alex.johnson@university.edu` / `campus360` (seed accounts)

# GoTrue (Supabase Auth) email templates — OTP-only

These templates strip the default magic-link (`{{ .ConfirmationURL }}`) and show
only the 6-digit `{{ .Token }}`. The Lacunose app verifies via
`supabase.auth.verifyOtp({ email, token, type: 'email' })`; users don't need a
clickable link.

## Deploy (first time)

1. Copy this directory to the VPS (the deploy script does this via rsync of
   the whole `lacunose-backend` repo):

   ```bash
   scp -r gotrue-templates deploy@vps:/home/deploy/lacunose-backend/infra/
   ```

2. Mount the templates into the `auth` (GoTrue) container. Edit the Supabase
   `docker-compose.yml` on the VPS (usually at `/opt/supabase/docker/docker-compose.yml`):

   ```yaml
   services:
     auth:
       volumes:
         - /home/deploy/lacunose-backend/infra/gotrue-templates:/etc/gotrue/templates:ro
       environment:
         GOTRUE_MAILER_TEMPLATES_MAGIC_LINK: /etc/gotrue/templates/magic_link.html
         GOTRUE_MAILER_TEMPLATES_CONFIRMATION: /etc/gotrue/templates/confirmation.html
         GOTRUE_MAILER_TEMPLATES_RECOVERY: /etc/gotrue/templates/recovery.html
         GOTRUE_MAILER_TEMPLATES_EMAIL_CHANGE: /etc/gotrue/templates/email_change.html
         GOTRUE_MAILER_TEMPLATES_INVITE: /etc/gotrue/templates/invite.html
         # Subjects (optional, nicer than the defaults):
         GOTRUE_MAILER_SUBJECTS_MAGIC_LINK: "Your Lacunose sign-in code"
         GOTRUE_MAILER_SUBJECTS_CONFIRMATION: "Confirm your Lacunose email"
         GOTRUE_MAILER_SUBJECTS_RECOVERY: "Reset your Lacunose password"
         GOTRUE_MAILER_SUBJECTS_EMAIL_CHANGE: "Confirm your new email address"
         GOTRUE_MAILER_SUBJECTS_INVITE: "You've been invited to Lacunose"
   ```

3. Restart just the auth service:

   ```bash
   cd /opt/supabase/docker
   docker compose up -d auth
   # or: docker compose restart auth
   ```

4. Test: trigger a sign-in from the app and check that the email contains only
   the code, no link.

## Editing

The `{{ .Token }}` variable renders the 6-digit OTP. Other available
variables: `{{ .Email }}`, `{{ .SiteURL }}`, `{{ .TokenHash }}`. Do **not**
use `{{ .ConfirmationURL }}` — that's the broken magic link we're removing.

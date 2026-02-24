# Barzunko

## Firebase Config Migration

This project uses modern Firebase Functions config:

- Local/emulator: `functions/.env` or `functions/.env.<project-id>`
- Production: Secret Manager (`firebase functions:secrets:set`)
- Code access: `process.env.*` (not `functions.config()`)

### Set production secrets

Run once per secret:

```bash
firebase functions:secrets:set STRIPE_SECRET_KEY
firebase functions:secrets:set STRIPE_WEBHOOK_SECRET
firebase functions:secrets:set TELEGRAM_BOT_TOKEN
firebase functions:secrets:set TELEGRAM_CHAT_IDS
firebase functions:secrets:set GMAIL_USER
firebase functions:secrets:set GMAIL_PASS
firebase functions:secrets:set GMAIL_FROM
```

Then deploy:

```bash
firebase deploy --only functions
```

const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf-8');

const target = `        if (process.env.NODE_ENV !== 'production') {
          console.log(\`Starting Telegram Bot Poller for Tenant: \${tenantId}...\`);
          startTenantTelegramBot(tenantId, config.telegram.botToken, config.telegram.chatIdAllowed);
        } else {
          console.log(\`Skipping Telegram Poller for Tenant: \${tenantId} (Assuming Webhooks are configured in Production)\`);
        }`;

const replacement = `        if (process.env.NODE_ENV !== 'production' && !process.env.RENDER_EXTERNAL_URL) {
          console.log(\`Starting Telegram Bot Poller for Tenant: \${tenantId}...\`);
          startTenantTelegramBot(tenantId, config.telegram.botToken, config.telegram.chatIdAllowed);
        } else {
          const baseUrl = process.env.RENDER_EXTERNAL_URL || process.env.APP_URL;
          if (baseUrl) {
             const webhookUrl = \`\${baseUrl}/api/telegram-webhook/\${tenantId}\`;
             console.log(\`Registering Webhook on boot for Tenant: \${tenantId} -> \${webhookUrl}\`);
             fetch(\`https://api.telegram.org/bot\${config.telegram.botToken}/setWebhook?url=\${encodeURIComponent(webhookUrl)}\`)
               .then(res => res.json())
               .then(data => console.log(\`[Boot Webhook Tenant: \${tenantId}] Result:\`, data))
               .catch(err => console.error(\`[Boot Webhook Tenant: \${tenantId}] Error:\`, err.message));
          } else {
             console.log(\`Skipping Telegram Poller for Tenant: \${tenantId} (Production, but no RENDER_EXTERNAL_URL provided. Assuming webhook is already active.)\`);
          }
        }`;

content = content.replace(target, replacement);
fs.writeFileSync('server.ts', content);

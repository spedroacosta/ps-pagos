const fs = require('fs');

// Patch server.ts
let serverCode = fs.readFileSync('server.ts', 'utf-8');
serverCode = serverCode.replace(
/        logoUrl: \(tenant as any\).logoUrl \|\| null,/,
`        logoUrl: (tenant as any).logoUrl || null,
        circularLogoUrl: (tenant as any).circularLogoUrl || null,`
);
fs.writeFileSync('server.ts', serverCode);

// Patch PublicQueryPortal.tsx
let queryCode = fs.readFileSync('src/components/PublicQueryPortal.tsx', 'utf-8');
queryCode = queryCode.replace(
/    tenant: \{ id: string; name: string; logoUrl: string \| null \};/,
`    tenant: { id: string; name: string; logoUrl: string | null; circularLogoUrl?: string | null };`
);

queryCode = queryCode.replace(
/              <img\n                src=\{queryResult.tenant.logoUrl\}\n                alt="Logo"\n                referrerPolicy="no-referrer"\n                className="w-10 h-10 rounded-full bg-white object-cover border border-\[\#d95c0f\]"\n              \/>/,
`              <img
                src={queryResult.tenant.circularLogoUrl || queryResult.tenant.logoUrl}
                alt="Logo"
                referrerPolicy="no-referrer"
                className="w-10 h-10 rounded-full bg-white object-cover border border-[#d95c0f]"
              />`
);

queryCode = queryCode.replace(
/                      <img\n                        src=\{queryResult.tenant.logoUrl\}\n                        alt="Logo"\n                        referrerPolicy="no-referrer"\n                        className="w-10 h-10 rounded-full bg-white object-cover border border-\[\#d95c0f\]"\n                      \/>/,
`                      <img
                        src={queryResult.tenant.circularLogoUrl || queryResult.tenant.logoUrl}
                        alt="Logo"
                        referrerPolicy="no-referrer"
                        className="w-10 h-10 rounded-full bg-white object-cover border border-[#d95c0f]"
                      />`
);

fs.writeFileSync('src/components/PublicQueryPortal.tsx', queryCode);

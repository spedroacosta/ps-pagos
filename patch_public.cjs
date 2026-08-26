const fs = require('fs');
let code = fs.readFileSync('src/components/PublicQueryPortal.tsx', 'utf-8');

// 1. Add import for InvoiceModal
if (!code.includes("InvoiceModal")) {
  code = code.replace(
    "import { formatUSD, formatVES } from '../utils/calculations';",
    "import { formatUSD, formatVES } from '../utils/calculations';\nimport { InvoiceModal } from './InvoiceModal';"
  );
}

// 2. Instead of selectedReceiptTargetId rendering the custom modal, render InvoiceModal
// First, find the state for selectedReceiptTargetId.
code = code.replace(
  "const [selectedReceiptTargetId, setSelectedReceiptTargetId] = useState<string | null>(null);",
  "const [selectedReceiptTargetId, setSelectedReceiptTargetId] = useState<string | null>(null);\n  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);"
);

// When they click the button, open InvoiceModal.
code = code.replace(
  "onClick={() => setSelectedReceiptTargetId(p.targetId)}",
  "onClick={() => {\n                                setSelectedReceiptTargetId('tx-' + p.id);\n                                setIsInvoiceModalOpen(true);\n                              }}"
);

// We should also replace the actual render of the old modal with the new one.
// Let's remove the old modal logic by finding: `{selectedReceiptTargetId && queryResult && solvencySummary && (`
// up to the closing tags. Wait, it's easier to just append InvoiceModal at the end of the return statement.
code = code.replace(
  "    </div>\n  );\n};",
  `      {isInvoiceModalOpen && queryResult && solvencySummary && (
        <InvoiceModal
          isOpen={isInvoiceModalOpen}
          onClose={() => setIsInvoiceModalOpen(false)}
          member={queryResult.member}
          solvencySummary={solvencySummary}
          months={queryResult.months}
          quotas={queryResult.quotas}
          payments={queryResult.payments}
          initialTargetId={selectedReceiptTargetId || undefined}
        />
      )}
    </div>
  );
};`
);

fs.writeFileSync('src/components/PublicQueryPortal.tsx', code);

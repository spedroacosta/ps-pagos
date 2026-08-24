import React from 'react';
import { renderToString } from 'react-dom/server';
import { ResumenSolvencia } from './src/components/ResumenSolvencia';
import { INITIAL_MONTHS } from './src/data/initialData';

try {
  const html = renderToString(
    <ResumenSolvencia
      members={[{ id: 'test1', name: 'Test' }]}
      months={INITIAL_MONTHS}
      quotas={[]}
      payments={[]}
      onOpenPaymentModalForMember={() => {}}
      onOpenInvoiceModal={() => {}}
      onSelectMemberForSearch={() => {}}
    />
  );
  console.log("RENDER SUCCESS", html.length);
} catch(e) {
  console.error("RENDER FAILED:", e);
}

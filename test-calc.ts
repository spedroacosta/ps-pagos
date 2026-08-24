import { calculateMemberSolvency } from './src/utils/calculations';

const members = [{"id":"test1","name":"Test"}];
const months: any = [];
const quotas: any = [];
const payments: any = [];
const lateFeeConfig = null;

try {
  members.map(m => calculateMemberSolvency(m as any, months, quotas, payments, lateFeeConfig));
  console.log("Success");
} catch(e) {
  console.error("Crash:", e);
}

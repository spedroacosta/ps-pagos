import { calculateMemberSolvency } from './src/utils/calculations';
import { INITIAL_MONTHS } from './src/data/initialData';

const members = [{"id":"test1","name":"Test"}];
const months = INITIAL_MONTHS;
const quotas: any = [];
const payments: any = [];
const lateFeeConfig = null;

try {
  members.map(m => calculateMemberSolvency(m as any, months, quotas, payments, lateFeeConfig));
  console.log("Success");
} catch(e) {
  console.error("Crash:", e);
}

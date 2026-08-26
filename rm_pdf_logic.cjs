const fs = require('fs');
let code = fs.readFileSync('src/components/PublicQueryPortal.tsx', 'utf-8');

const regex2 = /const handleDownloadReceiptPDF = async [\s\S]*?setIsGeneratingPDF\(false\);\s*\}\s*\};/;
code = code.replace(regex2, "");

// Remove jsPDF and html2canvas imports if they exist
code = code.replace(/import html2canvas from 'html2canvas-pro';\n/, "");
code = code.replace(/import { jsPDF } from 'jspdf';\n/, "");
code = code.replace(/const \[isGeneratingPDF, setIsGeneratingPDF\] = useState\(false\);\n/, "");

fs.writeFileSync('src/components/PublicQueryPortal.tsx', code);

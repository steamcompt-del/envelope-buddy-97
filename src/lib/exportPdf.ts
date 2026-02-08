import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Envelope, Transaction, Income } from '@/contexts/BudgetContext';

// Extend jsPDF type for autoTable
declare module 'jspdf' {
  interface jsPDF {
    lastAutoTable: { finalY: number };
  }
}

// Modern color palette (RGB values)
const colors = {
  primary: [16, 185, 129] as [number, number, number],      // Emerald green
  primaryLight: [209, 250, 229] as [number, number, number], // Light emerald
  primaryDark: [6, 78, 59] as [number, number, number],      // Dark emerald
  secondary: [99, 102, 241] as [number, number, number],     // Indigo
  success: [34, 197, 94] as [number, number, number],        // Green
  danger: [239, 68, 68] as [number, number, number],         // Red
  warning: [251, 191, 36] as [number, number, number],       // Amber
  dark: [17, 24, 39] as [number, number, number],            // Gray 900
  medium: [75, 85, 99] as [number, number, number],          // Gray 600
  light: [156, 163, 175] as [number, number, number],        // Gray 400
  lighter: [243, 244, 246] as [number, number, number],      // Gray 100
  white: [255, 255, 255] as [number, number, number],
  cardBg: [249, 250, 251] as [number, number, number],       // Gray 50
};

// Envelope color mapping
const envelopeColors: Record<string, [number, number, number]> = {
  blue: [59, 130, 246],
  green: [34, 197, 94],
  orange: [249, 115, 22],
  pink: [236, 72, 153],
  purple: [168, 85, 247],
  yellow: [234, 179, 8],
  red: [239, 68, 68],
  teal: [20, 184, 166],
};

interface ExportData {
  monthKey: string;
  householdName?: string;
  toBeBudgeted: number;
  envelopes: Envelope[];
  transactions: Transaction[];
  incomes: Income[];
}

const monthNames = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

function formatCurrency(amount: number): string {
  const formatted = amount.toFixed(2).replace('.', ',');
  const parts = formatted.split(',');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return parts.join(',') + ' €';
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
}

function getMonthDisplay(monthKey: string): string {
  const [year, month] = monthKey.split('-').map(Number);
  return `${monthNames[month - 1]} ${year}`;
}

// Draw a rounded rectangle
function drawRoundedRect(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  fillColor?: [number, number, number],
  strokeColor?: [number, number, number]
) {
  if (fillColor) {
    doc.setFillColor(...fillColor);
  }
  if (strokeColor) {
    doc.setDrawColor(...strokeColor);
  }
  doc.roundedRect(x, y, width, height, radius, radius, fillColor && strokeColor ? 'FD' : fillColor ? 'F' : 'S');
}

// Draw a progress bar
function drawProgressBar(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number,
  percent: number,
  color: [number, number, number]
) {
  // Background
  doc.setFillColor(...colors.lighter);
  doc.roundedRect(x, y, width, height, height / 2, height / 2, 'F');
  
  // Progress
  if (percent > 0) {
    const progressWidth = Math.min(percent / 100, 1) * width;
    doc.setFillColor(...color);
    doc.roundedRect(x, y, Math.max(progressWidth, height), height, height / 2, height / 2, 'F');
  }
}

export function exportMonthlyReportPDF(data: ExportData): void {
  const { monthKey, householdName, toBeBudgeted, envelopes, transactions, incomes } = data;
  
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 16;
  const contentWidth = pageWidth - margin * 2;
  let yPosition = 0;
  
  // Calculate totals
  const totalIncome = incomes.reduce((sum, inc) => sum + inc.amount, 0);
  const totalAllocated = envelopes.reduce((sum, env) => sum + env.allocated, 0);
  const totalSpent = envelopes.reduce((sum, env) => sum + env.spent, 0);
  
  // ========== MODERN HEADER ==========
  // Gradient-like header with two overlapping shapes
  doc.setFillColor(...colors.primary);
  doc.rect(0, 0, pageWidth, 52, 'F');
  
  // Decorative accent
  doc.setFillColor(255, 255, 255);
  doc.setGState(doc.GState({ opacity: 0.1 }));
  doc.circle(pageWidth - 20, 26, 60, 'F');
  doc.circle(pageWidth + 10, 10, 40, 'F');
  doc.setGState(doc.GState({ opacity: 1 }));
  
  // Header text
  doc.setTextColor(...colors.white);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('Rapport Budgétaire', margin, 24);
  
  doc.setFontSize(13);
  doc.setFont('helvetica', 'normal');
  doc.text(getMonthDisplay(monthKey), margin, 36);
  
  // Right side info
  if (householdName) {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(householdName, pageWidth - margin, 22, { align: 'right' });
  }
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(255, 255, 255);
  doc.setGState(doc.GState({ opacity: 0.8 }));
  doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')}`, pageWidth - margin, householdName ? 32 : 22, { align: 'right' });
  doc.setGState(doc.GState({ opacity: 1 }));
  
  yPosition = 62;
  
  // ========== SUMMARY CARDS ==========
  const cardWidth = (contentWidth - 12) / 4;
  const cardHeight = 38;
  const cardSpacing = 4;
  
  const summaryCards = [
    { label: 'Revenus', value: totalIncome, color: colors.success, bgColor: [220, 252, 231] as [number, number, number] },
    { label: 'Dépenses', value: totalSpent, color: colors.danger, bgColor: [254, 226, 226] as [number, number, number] },
    { label: 'Alloué', value: totalAllocated, color: colors.secondary, bgColor: [224, 231, 255] as [number, number, number] },
    { label: 'Disponible', value: toBeBudgeted, color: toBeBudgeted >= 0 ? colors.primary : colors.danger, bgColor: toBeBudgeted >= 0 ? colors.primaryLight : [254, 226, 226] as [number, number, number] },
  ];
  
  summaryCards.forEach((card, index) => {
    const x = margin + index * (cardWidth + cardSpacing);
    
    // Card background
    drawRoundedRect(doc, x, yPosition, cardWidth, cardHeight, 4, card.bgColor);
    
    // Label
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...colors.medium);
    doc.text(card.label, x + 8, yPosition + 12);
    
    // Value
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...card.color);
    doc.text(formatCurrency(card.value), x + 8, yPosition + 26);
  });
  
  yPosition += cardHeight + 16;
  
  // ========== ENVELOPES SECTION ==========
  // Section header
  doc.setFillColor(...colors.dark);
  doc.setTextColor(...colors.dark);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('Enveloppes', margin, yPosition);
  
  // Underline accent
  doc.setDrawColor(...colors.primary);
  doc.setLineWidth(2);
  doc.line(margin, yPosition + 3, margin + 30, yPosition + 3);
  
  yPosition += 12;
  
  // Envelope cards grid (2 columns)
  const envCardWidth = (contentWidth - 8) / 2;
  const envCardHeight = 32;
  
  envelopes.forEach((env, index) => {
    const column = index % 2;
    const row = Math.floor(index / 2);
    const x = margin + column * (envCardWidth + 8);
    const y = yPosition + row * (envCardHeight + 6);
    
    // Check for page break
    if (y + envCardHeight > pageHeight - 40) {
      doc.addPage();
      yPosition = 20;
      return;
    }
    
    const remaining = env.allocated - env.spent;
    const percentUsed = env.allocated > 0 ? (env.spent / env.allocated) * 100 : 0;
    const envColor = envelopeColors[env.color] || colors.medium;
    
    // Card background
    drawRoundedRect(doc, x, y, envCardWidth, envCardHeight, 4, colors.cardBg);
    
    // Color indicator bar
    doc.setFillColor(...envColor);
    doc.roundedRect(x, y, 4, envCardHeight, 2, 2, 'F');
    
    // Envelope name
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...colors.dark);
    doc.text(env.name, x + 10, y + 10);
    
    // Progress bar
    const progressColor = percentUsed > 100 ? colors.danger : percentUsed > 80 ? colors.warning : envColor;
    drawProgressBar(doc, x + 10, y + 14, envCardWidth - 70, 4, percentUsed, progressColor);
    
    // Amount remaining
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    const remainingColor = remaining >= 0 ? colors.success : colors.danger;
    doc.setTextColor(...remainingColor);
    doc.text(formatCurrency(remaining), x + envCardWidth - 8, y + 10, { align: 'right' });
    
    // Spent / Allocated
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...colors.light);
    doc.text(`${formatCurrency(env.spent)} / ${formatCurrency(env.allocated)}`, x + 10, y + 26);
    
    // Percentage
    doc.text(`${Math.round(percentUsed)}%`, x + envCardWidth - 8, y + 26, { align: 'right' });
  });
  
  // Calculate new yPosition after envelope grid
  const totalEnvelopeRows = Math.ceil(envelopes.length / 2);
  yPosition += totalEnvelopeRows * (envCardHeight + 6) + 16;
  
  // ========== TRANSACTIONS TABLE ==========
  if (yPosition > pageHeight - 80) {
    doc.addPage();
    yPosition = 20;
  }
  
  doc.setTextColor(...colors.dark);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('Transactions', margin, yPosition);
  
  doc.setDrawColor(...colors.primary);
  doc.setLineWidth(2);
  doc.line(margin, yPosition + 3, margin + 36, yPosition + 3);
  
  yPosition += 10;
  
  // Group transactions by envelope
  const transactionsByEnvelope: Record<string, Transaction[]> = {};
  transactions.forEach(t => {
    if (!transactionsByEnvelope[t.envelopeId]) {
      transactionsByEnvelope[t.envelopeId] = [];
    }
    transactionsByEnvelope[t.envelopeId].push(t);
  });
  
  envelopes.forEach(env => {
    const envTransactions = transactionsByEnvelope[env.id] || [];
    if (envTransactions.length === 0) return;
    
    // Check for page break
    if (yPosition > pageHeight - 50) {
      doc.addPage();
      yPosition = 20;
    }
    
    const envColor = envelopeColors[env.color] || colors.medium;
    
    // Envelope header pill
    doc.setFillColor(...envColor);
    doc.setGState(doc.GState({ opacity: 0.15 }));
    doc.roundedRect(margin, yPosition, doc.getTextWidth(env.name) + 16, 8, 4, 4, 'F');
    doc.setGState(doc.GState({ opacity: 1 }));
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...envColor);
    doc.text(env.name, margin + 8, yPosition + 6);
    
    yPosition += 12;
    
    const transactionData = envTransactions
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map(t => [
        formatDate(t.date),
        t.description,
        t.merchant || '—',
        formatCurrency(t.amount)
      ]);
    
    autoTable(doc, {
      startY: yPosition,
      head: [['Date', 'Description', 'Commerçant', 'Montant']],
      body: transactionData,
      theme: 'plain',
      headStyles: {
        fillColor: colors.lighter,
        textColor: colors.medium,
        fontStyle: 'bold',
        fontSize: 8,
        cellPadding: 4,
      },
      styles: {
        fontSize: 8,
        cellPadding: 3,
        textColor: colors.dark,
      },
      columnStyles: {
        0: { cellWidth: 22 },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 35, textColor: colors.light },
        3: { halign: 'right', cellWidth: 28, fontStyle: 'bold' },
      },
      margin: { left: margin, right: margin },
    });
    
    yPosition = doc.lastAutoTable.finalY + 8;
  });
  
  // ========== INCOMES TABLE ==========
  if (incomes.length > 0) {
    if (yPosition > pageHeight - 60) {
      doc.addPage();
      yPosition = 20;
    }
    
    doc.setTextColor(...colors.dark);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('Revenus', margin, yPosition);
    
    doc.setDrawColor(...colors.success);
    doc.setLineWidth(2);
    doc.line(margin, yPosition + 3, margin + 26, yPosition + 3);
    
    yPosition += 10;
    
    const incomeData = incomes
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map(inc => [
        formatDate(inc.date),
        inc.description,
        formatCurrency(inc.amount)
      ]);
    
    // Total row
    incomeData.push(['', 'Total', formatCurrency(totalIncome)]);
    
    autoTable(doc, {
      startY: yPosition,
      head: [['Date', 'Description', 'Montant']],
      body: incomeData,
      theme: 'plain',
      headStyles: {
        fillColor: [220, 252, 231],
        textColor: colors.success,
        fontStyle: 'bold',
        fontSize: 8,
        cellPadding: 4,
      },
      styles: {
        fontSize: 8,
        cellPadding: 3,
        textColor: colors.dark,
      },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 'auto' },
        2: { halign: 'right', cellWidth: 32, fontStyle: 'bold', textColor: colors.success },
      },
      didParseCell: function(data) {
        if (data.row.index === incomeData.length - 1) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [220, 252, 231];
        }
      },
      margin: { left: margin, right: margin },
    });
  }
  
  // ========== MODERN FOOTER ==========
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    
    // Footer line
    doc.setDrawColor(...colors.lighter);
    doc.setLineWidth(0.5);
    doc.line(margin, pageHeight - 16, pageWidth - margin, pageHeight - 16);
    
    // Page number
    doc.setFontSize(8);
    doc.setTextColor(...colors.light);
    doc.setFont('helvetica', 'normal');
    doc.text(`Page ${i} sur ${pageCount}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
    
    // App branding
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...colors.primary);
    doc.text('Envelope Buddy', margin, pageHeight - 10);
  }
  
  // Save the PDF
  const fileName = `budget_${monthKey}_${householdName?.replace(/\s/g, '_') || 'recap'}.pdf`;
  doc.save(fileName);
}

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Envelope, Transaction, Income } from '@/contexts/BudgetContext';

// Extend jsPDF type for autoTable
declare module 'jspdf' {
  interface jsPDF {
    lastAutoTable: { finalY: number };
  }
}

// Color mapping for envelopes (RGB values)
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
  return amount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
}

function getMonthDisplay(monthKey: string): string {
  const [year, month] = monthKey.split('-').map(Number);
  return `${monthNames[month - 1]} ${year}`;
}

export function exportMonthlyReportPDF(data: ExportData): void {
  const { monthKey, householdName, toBeBudgeted, envelopes, transactions, incomes } = data;
  
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let yPosition = 20;
  
  // Primary color (teal/green from the app)
  const primaryColor: [number, number, number] = [20, 184, 166];
  
  // Calculate totals
  const totalIncome = incomes.reduce((sum, inc) => sum + inc.amount, 0);
  const totalAllocated = envelopes.reduce((sum, env) => sum + env.allocated, 0);
  const totalSpent = envelopes.reduce((sum, env) => sum + env.spent, 0);
  
  // ========== HEADER ==========
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 45, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('Récapitulatif Budget', margin, 25);
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.text(getMonthDisplay(monthKey), margin, 35);
  
  if (householdName) {
    doc.setFontSize(12);
    doc.text(householdName, pageWidth - margin, 25, { align: 'right' });
  }
  
  doc.setFontSize(10);
  doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')}`, pageWidth - margin, 35, { align: 'right' });
  
  yPosition = 55;
  
  // ========== SUMMARY BOXES ==========
  doc.setTextColor(0, 0, 0);
  const boxWidth = (pageWidth - margin * 2 - 20) / 4;
  const boxHeight = 25;
  
  // Box 1: Revenus
  doc.setFillColor(236, 253, 245); // Light green
  doc.roundedRect(margin, yPosition, boxWidth, boxHeight, 3, 3, 'F');
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text('Revenus', margin + 5, yPosition + 8);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(34, 197, 94);
  doc.text(formatCurrency(totalIncome), margin + 5, yPosition + 18);
  
  // Box 2: Dépenses
  doc.setFillColor(254, 242, 242); // Light red
  doc.roundedRect(margin + boxWidth + 5, yPosition, boxWidth, boxHeight, 3, 3, 'F');
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.setFont('helvetica', 'normal');
  doc.text('Dépenses', margin + boxWidth + 10, yPosition + 8);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(239, 68, 68);
  doc.text(formatCurrency(totalSpent), margin + boxWidth + 10, yPosition + 18);
  
  // Box 3: Alloué
  doc.setFillColor(243, 244, 246); // Light gray
  doc.roundedRect(margin + (boxWidth + 5) * 2, yPosition, boxWidth, boxHeight, 3, 3, 'F');
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.setFont('helvetica', 'normal');
  doc.text('Alloué', margin + (boxWidth + 5) * 2 + 5, yPosition + 8);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(55, 65, 81);
  doc.text(formatCurrency(totalAllocated), margin + (boxWidth + 5) * 2 + 5, yPosition + 18);
  
  // Box 4: Non alloué
  doc.setFillColor(243, 244, 246); // Light gray
  doc.roundedRect(margin + (boxWidth + 5) * 3, yPosition, boxWidth, boxHeight, 3, 3, 'F');
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.setFont('helvetica', 'normal');
  doc.text('Non alloué', margin + (boxWidth + 5) * 3 + 5, yPosition + 8);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(55, 65, 81);
  doc.text(formatCurrency(toBeBudgeted), margin + (boxWidth + 5) * 3 + 5, yPosition + 18);
  
  yPosition += boxHeight + 15;
  
  // ========== ENVELOPES TABLE ==========
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...primaryColor);
  doc.text('Récapitulatif des enveloppes', margin, yPosition);
  yPosition += 8;
  
  const envelopeTableData = envelopes.map(env => {
    const remaining = env.allocated - env.spent;
    const percentUsed = env.allocated > 0 ? Math.round((env.spent / env.allocated) * 100) : 0;
    return [
      env.name,
      formatCurrency(env.allocated),
      formatCurrency(env.spent),
      formatCurrency(remaining),
      `${percentUsed}%`
    ];
  });
  
  // Add totals row
  const totalRemaining = totalAllocated - totalSpent;
  const totalPercentUsed = totalAllocated > 0 ? Math.round((totalSpent / totalAllocated) * 100) : 0;
  envelopeTableData.push([
    'TOTAL',
    formatCurrency(totalAllocated),
    formatCurrency(totalSpent),
    formatCurrency(totalRemaining),
    `${totalPercentUsed}%`
  ]);
  
  autoTable(doc, {
    startY: yPosition,
    head: [['Enveloppe', 'Alloué', 'Dépensé', 'Restant', '% utilisé']],
    body: envelopeTableData,
    theme: 'striped',
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    styles: {
      fontSize: 10,
      cellPadding: 4,
    },
    columnStyles: {
      0: { fontStyle: 'bold' },
      1: { halign: 'right' },
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'center' },
    },
    didParseCell: function(data) {
      // Color the last row (totals)
      if (data.row.index === envelopeTableData.length - 1) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [229, 231, 235];
      }
      // Color the "Restant" column based on value
      if (data.column.index === 3 && data.row.index < envelopeTableData.length - 1) {
        const envelope = envelopes[data.row.index];
        if (envelope && envelope.spent > envelope.allocated) {
          data.cell.styles.textColor = [239, 68, 68]; // Red for overspent
        } else {
          data.cell.styles.textColor = [34, 197, 94]; // Green for remaining
        }
      }
    },
    margin: { left: margin, right: margin },
  });
  
  yPosition = doc.lastAutoTable.finalY + 15;
  
  // ========== TRANSACTIONS BY ENVELOPE ==========
  // Check if we need a new page
  if (yPosition > 220) {
    doc.addPage();
    yPosition = 20;
  }
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...primaryColor);
  doc.text('Détail des transactions', margin, yPosition);
  yPosition += 8;
  
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
    
    // Check for new page
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 20;
    }
    
    const envColor = envelopeColors[env.color] || [100, 100, 100];
    
    // Envelope name header
    doc.setFillColor(...envColor);
    doc.rect(margin, yPosition, 4, 6, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(55, 65, 81);
    doc.text(env.name, margin + 8, yPosition + 5);
    yPosition += 10;
    
    const transactionData = envTransactions
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map(t => [
        formatDate(t.date),
        t.description,
        t.merchant || '-',
        formatCurrency(t.amount)
      ]);
    
    autoTable(doc, {
      startY: yPosition,
      head: [['Date', 'Description', 'Commerçant', 'Montant']],
      body: transactionData,
      theme: 'plain',
      headStyles: {
        fillColor: [243, 244, 246],
        textColor: [100, 100, 100],
        fontStyle: 'bold',
        fontSize: 9,
      },
      styles: {
        fontSize: 9,
        cellPadding: 3,
      },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 40 },
        3: { halign: 'right', cellWidth: 30 },
      },
      margin: { left: margin, right: margin },
    });
    
    yPosition = doc.lastAutoTable.finalY + 10;
  });
  
  // ========== INCOMES ==========
  if (incomes.length > 0) {
    if (yPosition > 220) {
      doc.addPage();
      yPosition = 20;
    }
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(...primaryColor);
    doc.text('Revenus', margin, yPosition);
    yPosition += 8;
    
    const incomeData = incomes
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map(inc => [
        formatDate(inc.date),
        inc.description,
        formatCurrency(inc.amount)
      ]);
    
    // Add total row
    incomeData.push(['', 'TOTAL', formatCurrency(totalIncome)]);
    
    autoTable(doc, {
      startY: yPosition,
      head: [['Date', 'Description', 'Montant']],
      body: incomeData,
      theme: 'striped',
      headStyles: {
        fillColor: [34, 197, 94],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      styles: {
        fontSize: 10,
        cellPadding: 4,
      },
      columnStyles: {
        0: { cellWidth: 30 },
        1: { cellWidth: 'auto' },
        2: { halign: 'right', cellWidth: 40 },
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
  
  // ========== FOOTER ==========
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Page ${i} / ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
  }
  
  // Save the PDF
  const fileName = `budget_${monthKey}_${householdName?.replace(/\s/g, '_') || 'recap'}.pdf`;
  doc.save(fileName);
}

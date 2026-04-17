export const REPORT_THEME = {
  primary: '#f97316', // orange
  accent: '#facc15', // yellow
  onPrimary: '#ffffff',
  ink: '#111827',
  muted: '#374151',
  border: '#e5e7eb',
  summaryBg: '#ffedd5',
  summaryFg: '#9a3412',
  attendeesBg: '#fef9c3',
  attendeesFg: '#854d0e',
} as const;

export function drawReportHeader(
  // pdfkit's type exports vary across environments; keep this helper unblocked.
  doc: any,
  opts: {
    communityName: string;
    title?: string;
    logoPath?: string | null;
    margin: number;
  },
) {
  const pageW = doc.page.width;
  const headerH = 78;
  const stripeH = 6;
  const totalH = headerH + stripeH;

  // Background
  doc.save();
  doc.rect(0, 0, pageW, headerH).fill(REPORT_THEME.primary);
  doc.rect(0, headerH, pageW, stripeH).fill(REPORT_THEME.accent);
  doc.restore();

  const x = opts.margin;
  const y = 18;
  const rightPad = opts.margin;

  // Logo (rounded mask, no white box)
  if (opts.logoPath) {
    const size = 44;
    const logoX = pageW - rightPad - size;
    const logoY = 16;
    doc.save();
    doc.roundedRect(logoX, logoY, size, size, 10).clip();
    doc.image(opts.logoPath, logoX, logoY, { fit: [size, size], align: 'center', valign: 'center' });
    doc.restore();
  }

  // Text
  const textRightLimit = opts.logoPath ? pageW - rightPad - 54 : pageW - rightPad;
  const textW = Math.max(100, textRightLimit - x);

  doc.fillColor(REPORT_THEME.onPrimary);
  doc.fontSize(16).text(opts.communityName || 'Comunidad', x, y, { width: textW });
  doc.fontSize(11).text(opts.title || 'Reporte', x, y + 26, { width: textW });
  doc.fillColor('#000000');

  return { headerHeight: totalH };
}

import React from "react";
import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { QuotePdfData } from "@/lib/pdf/quote-pdf-types";
import {
  EMPTY_COMPANY_BRANDING,
  buildPdfLineRows,
  computePdfTotals,
  formatCompanyAddress,
  resolveQuoteDateLabel,
} from "@/lib/pdf/quote-pdf-shared";
import { formatCurrency } from "@/types/quote";

const TEAL = "#0D9488";
const NAVY = "#0F172A";
const MUTED = "#64748b";
const BORDER = "#e2e8f0";
const WHITE = "#ffffff";
const DUE_BG = "#0F172A";

const styles = StyleSheet.create({
  page: {
    paddingTop: 36,
    paddingHorizontal: 40,
    paddingBottom: 64,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: NAVY,
    backgroundColor: WHITE,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  logoFrame: {
    borderWidth: 1.5,
    borderColor: TEAL,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  logoText: {
    fontSize: 12,
    fontWeight: "bold",
    color: TEAL,
    letterSpacing: 1.5,
  },
  companyName: {
    fontSize: 9,
    color: MUTED,
    marginTop: 6,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: TEAL,
  },
  metaBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: TEAL,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 18,
  },
  metaBarText: {
    fontSize: 8,
    color: WHITE,
    fontWeight: "bold",
  },
  midRow: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 18,
  },
  billCol: {
    flex: 1,
  },
  billLabel: {
    fontSize: 8,
    fontWeight: "bold",
    color: TEAL,
    letterSpacing: 0.7,
    marginBottom: 8,
  },
  iconRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 6,
  },
  iconDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: TEAL,
    marginRight: 8,
    marginTop: 3,
  },
  iconText: {
    fontSize: 10,
    color: NAVY,
    flex: 1,
  },
  iconMuted: {
    fontSize: 9,
    color: MUTED,
  },
  dueBox: {
    width: 170,
    backgroundColor: DUE_BG,
    padding: 12,
    borderRadius: 4,
  },
  dueLabel: {
    fontSize: 8,
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  dueAmount: {
    fontSize: 16,
    fontWeight: "bold",
    color: TEAL,
  },
  dueProject: {
    fontSize: 8,
    color: "#94a3b8",
    marginTop: 8,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: TEAL,
    paddingVertical: 7,
    paddingHorizontal: 8,
  },
  th: {
    fontSize: 8,
    fontWeight: "bold",
    color: WHITE,
    textTransform: "uppercase",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    paddingVertical: 7,
    paddingHorizontal: 8,
  },
  td: { fontSize: 9, color: NAVY },
  colDesc: { width: "46%" },
  colRate: { width: "18%", textAlign: "right" },
  colQty: { width: "14%", textAlign: "center" },
  colAmt: { width: "22%", textAlign: "right" },
  afterTable: {
    flexDirection: "row",
    marginTop: 16,
    gap: 16,
  },
  paymentCol: { flex: 1 },
  sectionLabel: {
    fontSize: 8,
    fontWeight: "bold",
    color: TEAL,
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  sectionText: {
    fontSize: 9,
    color: MUTED,
    lineHeight: 1.4,
    marginBottom: 2,
  },
  summaryCol: { width: 200 },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 5,
  },
  summaryLabel: { fontSize: 9, color: MUTED },
  summaryValue: { fontSize: 9, color: NAVY },
  grandRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 2,
    borderTopColor: TEAL,
    paddingTop: 8,
    marginTop: 4,
  },
  grandLabel: { fontSize: 11, fontWeight: "bold", color: NAVY },
  grandValue: { fontSize: 11, fontWeight: "bold", color: TEAL },
  terms: {
    marginTop: 16,
  },
  signature: {
    marginTop: 22,
  },
  signatureLabel: {
    fontSize: 8,
    color: MUTED,
    marginBottom: 16,
  },
  signatureLine: {
    borderBottomWidth: 1,
    borderBottomColor: NAVY,
    width: 180,
  },
  footer: {
    position: "absolute",
    bottom: 44,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: BORDER,
    paddingTop: 8,
  },
  footerText: {
    fontSize: 7,
    color: TEAL,
  },
  thankYou: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: TEAL,
    paddingVertical: 12,
    alignItems: "center",
  },
  thankYouText: {
    fontSize: 10,
    fontWeight: "bold",
    color: WHITE,
    letterSpacing: 1,
  },
});

function resolveCompany(data: QuotePdfData) {
  const c = { ...EMPTY_COMPANY_BRANDING, ...data.company };
  const companyName = c.companyName || "Your Company Name";
  const markSource = (c.companyName || "EMAx").replace(/\s+/g, "");
  return {
    companyName,
    tagline: c.tagline || "Your Company Tagline Here",
    email: c.email || "",
    phone: c.phone || "",
    website: c.website || "",
    address: formatCompanyAddress(c) || "Your Company Address",
    logoMark:
      markSource.length >= 4
        ? markSource.slice(0, 5).toUpperCase()
        : "EMAx",
  };
}

export function QuotePdfModernTeal({ data }: { data: QuotePdfData }) {
  const company = resolveCompany(data);
  const dates = resolveQuoteDateLabel(data.validUntil);
  const rows = buildPdfLineRows(data);
  const totals = computePdfTotals(data);
  const quoteNo = data.quoteNumber || "—";
  const gstRate = data.gstRate ?? data.taxRate ?? 0;
  const pstRate = data.pstRate ?? 0;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <View style={styles.logoFrame}>
              <Text style={styles.logoText}>{company.logoMark}</Text>
            </View>
            <Text style={styles.companyName}>{company.companyName}</Text>
          </View>
          <Text style={styles.title}>PRE-INVOICE</Text>
        </View>

        <View style={styles.metaBar}>
          <Text style={styles.metaBarText}>No: {quoteNo}</Text>
          <Text style={styles.metaBarText}>Date: {dates.issued}</Text>
          <Text style={styles.metaBarText}>
            Valid Until: {dates.validUntil}
          </Text>
        </View>

        <View style={styles.midRow}>
          <View style={styles.billCol}>
            <Text style={styles.billLabel}>BILL TO</Text>
            <View style={styles.iconRow}>
              <View style={styles.iconDot} />
              <Text style={styles.iconText}>{data.customerName || "—"}</Text>
            </View>
            {data.customerEmail ? (
              <View style={styles.iconRow}>
                <View style={styles.iconDot} />
                <Text style={[styles.iconText, styles.iconMuted]}>
                  {data.customerEmail}
                </Text>
              </View>
            ) : null}
            {data.customerPhone ? (
              <View style={styles.iconRow}>
                <View style={styles.iconDot} />
                <Text style={[styles.iconText, styles.iconMuted]}>
                  {data.customerPhone}
                </Text>
              </View>
            ) : null}
            <View style={styles.iconRow}>
              <View style={styles.iconDot} />
              <Text style={[styles.iconText, styles.iconMuted]}>
                Project: {data.projectName || "—"}
              </Text>
            </View>
          </View>
          <View style={styles.dueBox}>
            <Text style={styles.dueLabel}>Amount Due</Text>
            <Text style={styles.dueAmount}>
              {formatCurrency(totals.grandTotal)}
            </Text>
            <Text style={styles.dueProject}>
              {data.projectName || company.tagline}
            </Text>
          </View>
        </View>

        <View style={styles.tableHeader}>
          <Text style={[styles.th, styles.colDesc]}>Item Description</Text>
          <Text style={[styles.th, styles.colRate]}>Rate</Text>
          <Text style={[styles.th, styles.colQty]}>Qty</Text>
          <Text style={[styles.th, styles.colAmt]}>Amount</Text>
        </View>
        {rows.map((row, index) => (
          <View key={`${row.kind}-${index}`} style={styles.tableRow} wrap={false}>
            <Text style={[styles.td, styles.colDesc]}>
              {row.item}
              {row.brand && row.brand !== "—" ? ` · ${row.brand}` : ""}
            </Text>
            <Text style={[styles.td, styles.colRate]}>
              {formatCurrency(row.unitPrice)}
            </Text>
            <Text style={[styles.td, styles.colQty]}>
              {row.quantity} {row.unit}
            </Text>
            <Text style={[styles.td, styles.colAmt]}>
              {formatCurrency(row.total)}
            </Text>
          </View>
        ))}

        <View style={styles.afterTable}>
          <View style={styles.paymentCol}>
            <Text style={styles.sectionLabel}>PAYMENT METHOD</Text>
            <Text style={styles.sectionText}>
              Please pay according to the agreed terms.
            </Text>
            <Text style={styles.sectionText}>{company.email || "—"}</Text>
            <Text style={styles.sectionText}>{company.phone || "—"}</Text>
            <View style={styles.terms}>
              <Text style={styles.sectionLabel}>TERMS</Text>
              <Text style={styles.sectionText}>
                Valid for {data.validityDays} days from issue date. Prices
                reflect confirmed supplier rates at time of quote.
              </Text>
              {data.notes?.trim() ? (
                <Text style={styles.sectionText}>{data.notes.trim()}</Text>
              ) : null}
            </View>
          </View>
          <View style={styles.summaryCol}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Sub Total</Text>
              <Text style={styles.summaryValue}>
                {formatCurrency(totals.subtotal)}
              </Text>
            </View>
            {totals.discountApplied > 0 ? (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Discount</Text>
                <Text style={styles.summaryValue}>
                  −{formatCurrency(totals.discountApplied)}
                </Text>
              </View>
            ) : null}
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>
                Tax/VAT ({gstRate + pstRate}%)
              </Text>
              <Text style={styles.summaryValue}>
                {formatCurrency(totals.gst + totals.pst)}
              </Text>
            </View>
            <View style={styles.grandRow}>
              <Text style={styles.grandLabel}>GRAND TOTAL</Text>
              <Text style={styles.grandValue}>
                {formatCurrency(totals.grandTotal)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.signature}>
          <Text style={styles.signatureLabel}>Authorized Signature</Text>
          <View style={styles.signatureLine} />
        </View>

        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>{company.address}</Text>
          <Text style={styles.footerText}>{company.phone || "—"}</Text>
          <Text style={styles.footerText}>{company.email || "—"}</Text>
          <Text style={styles.footerText}>{company.website || "—"}</Text>
        </View>

        <View style={styles.thankYou} fixed>
          <Text style={styles.thankYouText}>
            THANK YOU FOR YOUR BUSINESS WITH US!
          </Text>
        </View>
      </Page>
    </Document>
  );
}

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

const GREEN = "#16A34A";
const NAVY = "#0F172A";
const MUTED = "#64748b";
const BORDER = "#e2e8f0";
const WHITE = "#ffffff";

const styles = StyleSheet.create({
  page: {
    paddingTop: 32,
    paddingHorizontal: 40,
    paddingBottom: 72,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: NAVY,
    backgroundColor: WHITE,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "stretch",
    marginBottom: 22,
    minHeight: 88,
  },
  brandCol: {
    flex: 1,
    paddingRight: 16,
    justifyContent: "center",
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  diamond: {
    width: 18,
    height: 18,
    backgroundColor: GREEN,
    transform: "rotate(45deg)",
    marginRight: 10,
  },
  logoMark: {
    position: "absolute",
    left: 5,
    top: 2,
    fontSize: 10,
    fontWeight: "bold",
    color: WHITE,
  },
  companyName: {
    fontSize: 14,
    fontWeight: "bold",
    color: NAVY,
  },
  tagline: {
    fontSize: 8,
    color: MUTED,
    marginTop: 3,
  },
  address: {
    fontSize: 8,
    color: MUTED,
    marginTop: 6,
  },
  greenBlock: {
    width: 210,
    backgroundColor: GREEN,
    paddingVertical: 14,
    paddingHorizontal: 16,
    transform: "skewX(-10deg)",
    justifyContent: "center",
  },
  greenInner: {
    transform: "skewX(10deg)",
  },
  greenTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: WHITE,
    marginBottom: 8,
  },
  greenMeta: {
    fontSize: 8,
    color: WHITE,
    marginBottom: 3,
    opacity: 0.95,
  },
  sections: {
    flexDirection: "row",
    gap: 28,
    marginBottom: 18,
  },
  sectionCol: {
    flex: 1,
  },
  sectionLabel: {
    fontSize: 8,
    fontWeight: "bold",
    color: GREEN,
    letterSpacing: 0.7,
    marginBottom: 4,
  },
  underline: {
    borderBottomWidth: 1.5,
    borderBottomColor: GREEN,
    marginBottom: 8,
    width: 48,
  },
  sectionText: {
    fontSize: 10,
    color: NAVY,
    marginBottom: 2,
  },
  sectionMuted: {
    fontSize: 9,
    color: MUTED,
    marginBottom: 2,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: GREEN,
    paddingVertical: 7,
    paddingHorizontal: 6,
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
    paddingHorizontal: 6,
  },
  td: {
    fontSize: 9,
    color: NAVY,
  },
  colNum: { width: "7%", textAlign: "center" },
  colDesc: { width: "37%" },
  colQty: { width: "10%", textAlign: "center" },
  colUnit: { width: "12%", textAlign: "center" },
  colPrice: { width: "17%", textAlign: "right" },
  colTotal: { width: "17%", textAlign: "right" },
  bottomRow: {
    flexDirection: "row",
    marginTop: 16,
    gap: 16,
  },
  notesCol: { flex: 1 },
  notesLabel: {
    fontSize: 8,
    fontWeight: "bold",
    color: GREEN,
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  notesText: {
    fontSize: 9,
    color: MUTED,
    lineHeight: 1.4,
  },
  summaryCol: { width: 200 },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 5,
  },
  summaryLabel: { fontSize: 9, color: MUTED },
  summaryValue: { fontSize: 9, color: NAVY },
  grandBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: GREEN,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginTop: 6,
  },
  grandLabel: { fontSize: 10, fontWeight: "bold", color: WHITE },
  grandValue: { fontSize: 12, fontWeight: "bold", color: WHITE },
  signatureBlock: {
    marginTop: 24,
    marginBottom: 8,
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
  footerBand: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: GREEN,
    paddingVertical: 12,
    paddingHorizontal: 40,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerText: {
    fontSize: 8,
    color: WHITE,
  },
});

function resolveCompany(data: QuotePdfData) {
  const c = { ...EMPTY_COMPANY_BRANDING, ...data.company };
  return {
    companyName: c.companyName || "Your Company Name",
    tagline: c.tagline || "Your Company Tagline Here",
    email: c.email || "",
    phone: c.phone || "",
    website: c.website || "",
    address: formatCompanyAddress(c) || "Your Company Address",
  };
}

export function QuotePdfBoldGreen({ data }: { data: QuotePdfData }) {
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
          <View style={styles.brandCol}>
            <View style={styles.logoRow}>
              <View>
                <View style={styles.diamond} />
                <Text style={styles.logoMark}>Z</Text>
              </View>
              <View>
                <Text style={styles.companyName}>{company.companyName}</Text>
                <Text style={styles.tagline}>{company.tagline}</Text>
              </View>
            </View>
            <Text style={styles.address}>{company.address}</Text>
          </View>
          <View style={styles.greenBlock}>
            <View style={styles.greenInner}>
              <Text style={styles.greenTitle}>PRE-INVOICE</Text>
              <Text style={styles.greenMeta}>No: {quoteNo}</Text>
              <Text style={styles.greenMeta}>Date: {dates.issued}</Text>
              <Text style={styles.greenMeta}>
                Valid Until: {dates.validUntil}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.sections}>
          <View style={styles.sectionCol}>
            <Text style={styles.sectionLabel}>BILL TO</Text>
            <View style={styles.underline} />
            <Text style={styles.sectionText}>{data.customerName || "—"}</Text>
            {data.customerEmail ? (
              <Text style={styles.sectionMuted}>{data.customerEmail}</Text>
            ) : null}
            {data.customerPhone ? (
              <Text style={styles.sectionMuted}>{data.customerPhone}</Text>
            ) : null}
          </View>
          <View style={styles.sectionCol}>
            <Text style={styles.sectionLabel}>PROJECT DETAILS</Text>
            <View style={styles.underline} />
            <Text style={styles.sectionText}>{data.projectName || "—"}</Text>
            <Text style={styles.sectionMuted}>
              Validity: {data.validityDays} days
            </Text>
          </View>
        </View>

        <View style={styles.tableHeader}>
          <Text style={[styles.th, styles.colNum]}>#</Text>
          <Text style={[styles.th, styles.colDesc]}>Description</Text>
          <Text style={[styles.th, styles.colQty]}>Qty</Text>
          <Text style={[styles.th, styles.colUnit]}>Unit</Text>
          <Text style={[styles.th, styles.colPrice]}>Unit Price</Text>
          <Text style={[styles.th, styles.colTotal]}>Total</Text>
        </View>
        {rows.map((row, index) => (
          <View key={`${row.kind}-${index}`} style={styles.tableRow} wrap={false}>
            <Text style={[styles.td, styles.colNum]}>{index + 1}</Text>
            <Text style={[styles.td, styles.colDesc]}>
              {row.item}
              {row.brand && row.brand !== "—" ? ` · ${row.brand}` : ""}
            </Text>
            <Text style={[styles.td, styles.colQty]}>{row.quantity}</Text>
            <Text style={[styles.td, styles.colUnit]}>{row.unit}</Text>
            <Text style={[styles.td, styles.colPrice]}>
              {formatCurrency(row.unitPrice)}
            </Text>
            <Text style={[styles.td, styles.colTotal]}>
              {formatCurrency(row.total)}
            </Text>
          </View>
        ))}

        <View style={styles.bottomRow}>
          <View style={styles.notesCol}>
            <Text style={styles.notesLabel}>NOTES</Text>
            <Text style={styles.notesText}>{data.notes?.trim() || "—"}</Text>
          </View>
          <View style={styles.summaryCol}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Materials</Text>
              <Text style={styles.summaryValue}>
                {formatCurrency(totals.materialsTotal)}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Labour</Text>
              <Text style={styles.summaryValue}>
                {formatCurrency(totals.labourTotal)}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
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
              <Text style={styles.summaryLabel}>GST/HST ({gstRate}%)</Text>
              <Text style={styles.summaryValue}>
                {formatCurrency(totals.gst)}
              </Text>
            </View>
            {pstRate > 0 ? (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>PST ({pstRate}%)</Text>
                <Text style={styles.summaryValue}>
                  {formatCurrency(totals.pst)}
                </Text>
              </View>
            ) : null}
            <View style={styles.grandBar}>
              <Text style={styles.grandLabel}>GRAND TOTAL</Text>
              <Text style={styles.grandValue}>
                {formatCurrency(totals.grandTotal)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.signatureBlock}>
          <Text style={styles.signatureLabel}>Authorized Signature</Text>
          <View style={styles.signatureLine} />
        </View>

        <View style={styles.footerBand} fixed>
          <Text style={styles.footerText}>{company.email || "—"}</Text>
          <Text style={styles.footerText}>{company.phone || "—"}</Text>
          <Text style={styles.footerText}>{company.website || "—"}</Text>
        </View>
      </Page>
    </Document>
  );
}

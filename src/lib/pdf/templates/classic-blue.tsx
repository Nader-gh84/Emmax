import React from "react";
import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { QuotePdfData } from "@/lib/pdf/quote-pdf";
import {
  EMPTY_COMPANY_BRANDING,
  buildPdfLineRows,
  computePdfTotals,
  formatCompanyAddress,
  resolveQuoteDateLabel,
} from "@/lib/pdf/quote-pdf-shared";
import { formatCurrency } from "@/types/quote";

const BLUE = "#2563EB";
const NAVY = "#0F172A";
const MUTED = "#64748b";
const BORDER = "#e2e8f0";
const WHITE = "#ffffff";

const styles = StyleSheet.create({
  page: {
    paddingTop: 36,
    paddingHorizontal: 40,
    paddingBottom: 56,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: NAVY,
    backgroundColor: WHITE,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 22,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  logoOuter: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  logoDiamond: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: BLUE,
    transform: "rotate(45deg)",
  },
  logoInner: {
    position: "absolute",
    fontSize: 7,
    fontWeight: "bold",
    color: NAVY,
  },
  companyName: {
    fontSize: 13,
    fontWeight: "bold",
    color: NAVY,
  },
  tagline: {
    fontSize: 8,
    color: MUTED,
    marginTop: 2,
  },
  titleBlock: {
    alignItems: "flex-end",
  },
  titleRow: {
    flexDirection: "row",
    marginBottom: 6,
  },
  titlePre: {
    fontSize: 18,
    fontWeight: "bold",
    color: NAVY,
  },
  titleAccent: {
    fontSize: 18,
    fontWeight: "bold",
    color: BLUE,
  },
  metaLine: {
    fontSize: 8,
    color: MUTED,
    marginBottom: 2,
  },
  metaValue: {
    color: NAVY,
    fontWeight: "bold",
  },
  boxes: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 18,
  },
  box: {
    flex: 1,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 4,
    padding: 10,
  },
  boxLabel: {
    fontSize: 8,
    fontWeight: "bold",
    color: BLUE,
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  boxText: {
    fontSize: 10,
    color: NAVY,
    marginBottom: 2,
  },
  boxMuted: {
    fontSize: 9,
    color: MUTED,
    marginBottom: 2,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: BLUE,
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
  td: {
    fontSize: 9,
    color: NAVY,
  },
  colDesc: { width: "40%" },
  colQty: { width: "10%", textAlign: "center" },
  colUnit: { width: "12%", textAlign: "center" },
  colPrice: { width: "19%", textAlign: "right" },
  colTotal: { width: "19%", textAlign: "right" },
  bottomRow: {
    flexDirection: "row",
    marginTop: 18,
    gap: 16,
  },
  notesCol: {
    flex: 1,
  },
  notesLabel: {
    fontSize: 8,
    fontWeight: "bold",
    color: BLUE,
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  notesText: {
    fontSize: 9,
    color: MUTED,
    lineHeight: 1.4,
  },
  summaryCol: {
    width: 200,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 5,
  },
  summaryLabel: {
    fontSize: 9,
    color: MUTED,
  },
  summaryValue: {
    fontSize: 9,
    color: NAVY,
  },
  grandBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: BLUE,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginTop: 6,
  },
  grandLabel: {
    fontSize: 10,
    fontWeight: "bold",
    color: WHITE,
  },
  grandValue: {
    fontSize: 12,
    fontWeight: "bold",
    color: WHITE,
  },
  signature: {
    marginTop: 28,
  },
  signatureLabel: {
    fontSize: 8,
    color: MUTED,
    marginBottom: 18,
  },
  signatureLine: {
    borderBottomWidth: 1,
    borderBottomColor: NAVY,
    width: 180,
  },
  footer: {
    position: "absolute",
    bottom: 36,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: BORDER,
    paddingTop: 8,
  },
  footerText: {
    fontSize: 8,
    color: MUTED,
  },
  diagonal: {
    position: "absolute",
    bottom: 0,
    left: -40,
    right: -40,
    height: 18,
    backgroundColor: BLUE,
    transform: "skewX(-18deg)",
  },
});

function resolveCompany(data: QuotePdfData) {
  const c = { ...EMPTY_COMPANY_BRANDING, ...data.company };
  return {
    companyName: c.companyName || "Your Company Name",
    tagline: c.tagline || "Your Company Tagline Here",
    fullName: c.fullName || "",
    email: c.email || "",
    phone: c.phone || "",
    website: c.website || "",
    address: formatCompanyAddress(c) || "Your Company Address",
  };
}

export function QuotePdfClassicBlue({ data }: { data: QuotePdfData }) {
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
          <View style={styles.brandRow}>
            <View style={styles.logoOuter}>
              <View style={styles.logoDiamond} />
              <Text style={styles.logoInner}>V</Text>
            </View>
            <View>
              <Text style={styles.companyName}>{company.companyName}</Text>
              <Text style={styles.tagline}>{company.tagline}</Text>
            </View>
          </View>
          <View style={styles.titleBlock}>
            <View style={styles.titleRow}>
              <Text style={styles.titlePre}>PRE-</Text>
              <Text style={styles.titleAccent}>INVOICE</Text>
            </View>
            <Text style={styles.metaLine}>
              No: <Text style={styles.metaValue}>{quoteNo}</Text>
            </Text>
            <Text style={styles.metaLine}>
              Date: <Text style={styles.metaValue}>{dates.issued}</Text>
            </Text>
            <Text style={styles.metaLine}>
              Valid Until:{" "}
              <Text style={styles.metaValue}>{dates.validUntil}</Text>
            </Text>
          </View>
        </View>

        <View style={styles.boxes}>
          <View style={styles.box}>
            <Text style={styles.boxLabel}>BILL TO</Text>
            <Text style={styles.boxText}>{data.customerName || "—"}</Text>
            {data.customerEmail ? (
              <Text style={styles.boxMuted}>{data.customerEmail}</Text>
            ) : null}
            {data.customerPhone ? (
              <Text style={styles.boxMuted}>{data.customerPhone}</Text>
            ) : null}
          </View>
          <View style={styles.box}>
            <Text style={styles.boxLabel}>PROJECT DETAILS</Text>
            <Text style={styles.boxText}>{data.projectName || "—"}</Text>
            <Text style={styles.boxMuted}>
              Validity: {data.validityDays} days
            </Text>
          </View>
        </View>

        <View style={styles.tableHeader}>
          <Text style={[styles.th, styles.colDesc]}>Description</Text>
          <Text style={[styles.th, styles.colQty]}>Qty</Text>
          <Text style={[styles.th, styles.colUnit]}>Unit</Text>
          <Text style={[styles.th, styles.colPrice]}>Unit Price</Text>
          <Text style={[styles.th, styles.colTotal]}>Total</Text>
        </View>
        {rows.map((row, index) => (
          <View key={`${row.kind}-${index}`} style={styles.tableRow} wrap={false}>
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
            <Text style={styles.notesText}>
              {data.notes?.trim() || "—"}
            </Text>
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
              <Text style={styles.summaryLabel}>GST ({gstRate}%)</Text>
              <Text style={styles.summaryValue}>
                {formatCurrency(totals.gst)}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>PST ({pstRate}%)</Text>
              <Text style={styles.summaryValue}>
                {formatCurrency(totals.pst)}
              </Text>
            </View>
            <View style={styles.grandBar}>
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
          <Text style={styles.footerText}>{company.email || "—"}</Text>
          <Text style={styles.footerText}>{company.phone || "—"}</Text>
          <Text style={styles.footerText}>{company.website || "—"}</Text>
          <Text style={styles.footerText}>{company.address}</Text>
        </View>
        <View style={styles.diagonal} fixed />
      </Page>
    </Document>
  );
}

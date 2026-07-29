import React from "react";
import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import {
  calculateVoiceQuoteTotals,
  formatCurrency,
  labourLineTotal,
  materialLineTotal,
} from "@/types/quote";
import type { QuoteEmailData } from "@/lib/email/quote-email";

export interface QuotePdfData extends QuoteEmailData {
  customerPhone?: string;
}

const navy = "#0F172A";
const accent = "#3B82F6";
const slate400 = "#94a3b8";
const white = "#ffffff";

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: navy,
    backgroundColor: white,
  },
  header: {
    backgroundColor: navy,
    padding: 24,
    marginBottom: 24,
    borderRadius: 4,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: white,
  },
  headerAccent: {
    color: accent,
  },
  headerSubtitle: {
    fontSize: 11,
    color: slate400,
    marginTop: 4,
  },
  section: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 8,
    textTransform: "uppercase",
    color: slate400,
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  sectionText: {
    fontSize: 11,
    color: navy,
    marginBottom: 2,
  },
  scopeBox: {
    backgroundColor: "#f8fafc",
    borderLeftWidth: 3,
    borderLeftColor: accent,
    padding: 12,
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f1f5f9",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    paddingVertical: 8,
    paddingHorizontal: 6,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    paddingVertical: 8,
    paddingHorizontal: 6,
  },
  colItem: { width: "28%" },
  colBrand: { width: "14%", textAlign: "center" },
  colQty: { width: "8%", textAlign: "center" },
  colUnit: { width: "12%", textAlign: "center" },
  colPrice: { width: "18%", textAlign: "right" },
  colTotal: { width: "20%", textAlign: "right" },
  th: {
    fontSize: 8,
    fontWeight: "bold",
    color: slate400,
    textTransform: "uppercase",
  },
  td: {
    fontSize: 10,
    color: navy,
  },
  totalsBox: {
    marginTop: 16,
    marginLeft: "auto",
    width: 220,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  totalLabel: {
    fontSize: 10,
    color: slate400,
  },
  totalValue: {
    fontSize: 10,
    color: navy,
  },
  grandTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 2,
    borderTopColor: navy,
    paddingTop: 8,
    marginTop: 4,
  },
  grandTotalLabel: {
    fontSize: 13,
    fontWeight: "bold",
    color: navy,
  },
  grandTotalValue: {
    fontSize: 13,
    fontWeight: "bold",
    color: accent,
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingTop: 12,
    textAlign: "center",
  },
  footerText: {
    fontSize: 9,
    color: slate400,
  },
  footerBold: {
    fontWeight: "bold",
    color: navy,
  },
});

function buildRows(data: QuotePdfData) {
  const materials = data.materials.map((item, index) => ({
    id: `m-${index}`,
    ...item,
  }));
  const labour = (data.labourItems ?? []).map((item, index) => ({
    id: `l-${index}`,
    ...item,
  }));
  const mode = data.priceDisplayMode ?? "detailed";

  const materialRows =
    mode === "merged" && materials.length > 0
      ? [
          {
            item: "Materials (combined)",
            brand: "—",
            quantity: 1,
            unit: "lot",
            unitPrice: materials.reduce(
              (sum, item) => sum + materialLineTotal(item),
              0
            ),
            total: materials.reduce(
              (sum, item) => sum + materialLineTotal(item),
              0
            ),
          },
        ]
      : materials.map((item) => ({
          item: item.item,
          brand: item.brand || "—",
          quantity: item.quantity,
          unit: item.unit,
          unitPrice: item.unitPrice,
          total: materialLineTotal(item),
        }));

  const labourRows = labour.map((item) => ({
    item: item.description,
    brand: "Labour",
    quantity: item.hours,
    unit: "hour",
    unitPrice: item.rate,
    total: labourLineTotal(item),
  }));

  return [...materialRows, ...labourRows];
}

export function QuotePdfDocument({ data }: { data: QuotePdfData }) {
  const gstRate = data.gstRate ?? data.taxRate ?? 0;
  const pstRate = data.pstRate ?? 0;
  const totals = calculateVoiceQuoteTotals({
    materials: data.materials.map((item, index) => ({
      id: `m-${index}`,
      ...item,
    })),
    labourItems: (data.labourItems ?? []).map((item, index) => ({
      id: `l-${index}`,
      ...item,
    })),
    gstRate,
    pstRate,
    discountMode: data.discountMode ?? "amount",
    discountAmount: data.discountAmount ?? 0,
    discountPercent: data.discountPercent ?? 0,
  });
  const rows = buildRows(data);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>
            Ema<Text style={styles.headerAccent}>X</Text> Quote
          </Text>
          <Text style={styles.headerSubtitle}>
            Professional Quote
            {data.quoteNumber ? ` · ${data.quoteNumber}` : ""}
          </Text>
        </View>

        <View style={{ flexDirection: "row", marginBottom: 16 }}>
          <View style={{ flex: 1, marginRight: 24 }}>
            <Text style={styles.sectionLabel}>Customer</Text>
            <Text style={styles.sectionText}>{data.customerName}</Text>
            <Text style={[styles.sectionText, { color: slate400 }]}>
              {data.customerEmail}
            </Text>
            {data.customerPhone ? (
              <Text style={[styles.sectionText, { color: slate400 }]}>
                {data.customerPhone}
              </Text>
            ) : null}
          </View>
          {data.projectName ? (
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionLabel}>Project</Text>
              <Text style={styles.sectionText}>{data.projectName}</Text>
            </View>
          ) : null}
        </View>

        {data.notes ? (
          <View style={styles.scopeBox}>
            <Text style={styles.sectionLabel}>Scope of Work</Text>
            <Text style={styles.sectionText}>{data.notes}</Text>
          </View>
        ) : null}

        <View style={styles.tableHeader}>
          <Text style={[styles.th, styles.colItem]}>Item</Text>
          <Text style={[styles.th, styles.colBrand]}>Brand</Text>
          <Text style={[styles.th, styles.colQty]}>Qty</Text>
          <Text style={[styles.th, styles.colUnit]}>Unit</Text>
          <Text style={[styles.th, styles.colPrice]}>Unit Price</Text>
          <Text style={[styles.th, styles.colTotal]}>Total</Text>
        </View>

        {rows.map((item, index) => (
          <View key={index} style={styles.tableRow}>
            <Text style={[styles.td, styles.colItem]}>{item.item}</Text>
            <Text style={[styles.td, styles.colBrand]}>{item.brand}</Text>
            <Text style={[styles.td, styles.colQty]}>{item.quantity}</Text>
            <Text style={[styles.td, styles.colUnit]}>{item.unit}</Text>
            <Text style={[styles.td, styles.colPrice]}>
              {formatCurrency(item.unitPrice)}
            </Text>
            <Text style={[styles.td, styles.colTotal]}>
              {formatCurrency(item.total)}
            </Text>
          </View>
        ))}

        <View style={styles.totalsBox}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Materials</Text>
            <Text style={styles.totalValue}>
              {formatCurrency(totals.materialsTotal)}
            </Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Labour</Text>
            <Text style={styles.totalValue}>
              {formatCurrency(totals.labourTotal)}
            </Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text style={styles.totalValue}>
              {formatCurrency(totals.subtotal)}
            </Text>
          </View>
          {totals.discountApplied > 0 ? (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Discount</Text>
              <Text style={styles.totalValue}>
                -{formatCurrency(totals.discountApplied)}
              </Text>
            </View>
          ) : null}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>GST ({gstRate}%)</Text>
            <Text style={styles.totalValue}>{formatCurrency(totals.gst)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>PST ({pstRate}%)</Text>
            <Text style={styles.totalValue}>{formatCurrency(totals.pst)}</Text>
          </View>
          <View style={styles.grandTotalRow}>
            <Text style={styles.grandTotalLabel}>Grand Total</Text>
            <Text style={styles.grandTotalValue}>
              {formatCurrency(totals.grandTotal)}
            </Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            This quote is valid for{" "}
            <Text style={styles.footerBold}>{data.validityDays} days</Text>
            {data.validUntil ? ` (until ${data.validUntil})` : ""} from the date
            of issue.
          </Text>
          <Text style={[styles.footerText, { marginTop: 6 }]}>
            Sent via EmaX — AI-powered quotes for Canadian tradespeople
          </Text>
        </View>
      </Page>
    </Document>
  );
}

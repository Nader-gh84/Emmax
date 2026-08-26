import React from "react";
import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
  Font,
} from "@react-pdf/renderer";
import type { TranscriptionJobWithSegments } from "@/types/translator";
import { formatDuration, formatTimestamp, platformLabel } from "@/lib/translator/job-service";

// Use built-in fonts; Persian may render with limited glyphs in Helvetica.
// For production Persian PDF quality, embed a Farsi-capable font later.
Font.registerHyphenationCallback((word) => [word]);

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 11,
    fontFamily: "Helvetica",
    lineHeight: 1.45,
  },
  title: { fontSize: 16, marginBottom: 8, fontFamily: "Helvetica-Bold" },
  meta: { fontSize: 10, color: "#444", marginBottom: 4 },
  section: { marginTop: 16, marginBottom: 6, fontFamily: "Helvetica-Bold" },
  timestamp: { fontSize: 9, color: "#666", marginTop: 8 },
  body: { marginTop: 2 },
  pair: { marginTop: 8, paddingBottom: 6, borderBottom: "1 solid #ddd" },
  label: { fontSize: 9, color: "#666", marginBottom: 2 },
});

export function TranscriptPdfDocument({
  job,
  mode,
}: {
  job: TranscriptionJobWithSegments;
  mode: "original" | "english" | "persian" | "english_persian";
}) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>{job.media_title || "Transcript"}</Text>
        <Text style={styles.meta}>
          Platform: {platformLabel(job.source_platform)}
        </Text>
        <Text style={styles.meta}>
          Detected language: {job.detected_language || "Unknown"}
        </Text>
        <Text style={styles.meta}>
          Duration: {formatDuration(job.media_duration_seconds)}
        </Text>

        {mode === "english_persian" ? (
          <View>
            <Text style={styles.section}>English + Persian</Text>
            {job.segments.map((segment) => (
              <View key={segment.id} style={styles.pair} wrap={false}>
                {segment.start_time != null && (
                  <Text style={styles.timestamp}>
                    {formatTimestamp(segment.start_time)}
                  </Text>
                )}
                <Text style={styles.label}>English</Text>
                <Text style={styles.body}>{segment.english_text}</Text>
                <Text style={[styles.label, { marginTop: 4 }]}>Persian</Text>
                <Text style={styles.body}>{segment.persian_text}</Text>
              </View>
            ))}
          </View>
        ) : (
          <View>
            <Text style={styles.section}>
              {mode === "original"
                ? "Original"
                : mode === "english"
                  ? "English"
                  : "Persian"}
            </Text>
            {job.segments.map((segment) => {
              const text =
                mode === "original"
                  ? segment.original_text
                  : mode === "english"
                    ? segment.english_text
                    : segment.persian_text;
              return (
                <View key={segment.id} wrap={false}>
                  {segment.start_time != null && (
                    <Text style={styles.timestamp}>
                      {formatTimestamp(segment.start_time)}
                    </Text>
                  )}
                  <Text style={styles.body}>{text}</Text>
                </View>
              );
            })}
          </View>
        )}
      </Page>
    </Document>
  );
}

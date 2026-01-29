/**
 * PDF Export Utility
 * Export data to PDF format using jsPDF
 */

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface PDFColumn {
  header: string;
  dataKey: string;
}

interface PDFExportOptions {
  title: string;
  filename: string;
  columns: PDFColumn[];
  data: any[];
  orientation?: "portrait" | "landscape";
}

/**
 * Export data to PDF
 */
export function exportToPDF({
  title,
  filename,
  columns,
  data,
  orientation = "portrait",
}: PDFExportOptions) {
  try {
    const doc = new jsPDF({
      orientation,
      unit: "mm",
      format: "a4",
    });

    // Add title
    doc.setFontSize(18);
    doc.text(title, 14, 20);

    // Add date
    doc.setFontSize(10);
    doc.text(`Tarih: ${new Date().toLocaleDateString("tr-TR")}`, 14, 30);

    // Add table
    autoTable(doc, {
      head: [columns.map((col) => col.header)],
      body: data.map((row) =>
        columns.map((col) => {
          const value = row[col.dataKey];

          // Format dates
          if (value instanceof Date) {
            return value.toLocaleDateString("tr-TR");
          }

          // Format booleans
          if (typeof value === "boolean") {
            return value ? "Evet" : "Hayır";
          }

          return value ?? "-";
        }),
      ),
      startY: 40,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [59, 130, 246], textColor: 255 },
      alternateRowStyles: { fillColor: [245, 245, 245] },
    });

    // Save PDF
    doc.save(`${filename}.pdf`);

    return true;
  } catch (error) {
    console.error("[PDF_EXPORT_ERROR]", error);
    return false;
  }
}

/**
 * Export articles to PDF
 */
export function exportArticlesToPDF(articles: any[]) {
  return exportToPDF({
    title: "Makale Listesi",
    filename: `articles_${new Date().toISOString().split("T")[0]}`,
    orientation: "landscape",
    columns: [
      { header: "Başlık", dataKey: "title" },
      { header: "Kategori", dataKey: "category" },
      { header: "Durum", dataKey: "status" },
      { header: "Görüntülenme", dataKey: "views" },
      { header: "Skor", dataKey: "score" },
      { header: "Tarih", dataKey: "publishedAt" },
    ],
    data: articles.map((article) => ({
      title:
        article.title.slice(0, 50) + (article.title.length > 50 ? "..." : ""),
      category: article.category?.name || "-",
      status: article.status === "PUBLISHED" ? "Yayında" : "Taslak",
      views: article.views,
      score: article.score,
      publishedAt: article.publishedAt
        ? new Date(article.publishedAt).toLocaleDateString("tr-TR")
        : "-",
    })),
  });
}

/**
 * Export analytics report to PDF
 */
export function exportAnalyticsReportToPDF(data: {
  summary: any;
  topArticles: any[];
  categoryStats: any[];
}) {
  try {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    // Title
    doc.setFontSize(20);
    doc.text("Analytics Raporu", 14, 20);

    // Date
    doc.setFontSize(10);
    doc.text(
      `Oluşturulma: ${new Date().toLocaleDateString("tr-TR", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })}`,
      14,
      30,
    );

    // Summary Section
    doc.setFontSize(14);
    doc.text("Özet İstatistikler", 14, 45);

    const summaryData = [
      ["Toplam Makale", data.summary.totalArticles.toString()],
      ["Yayında", data.summary.publishedArticles.toString()],
      ["Taslak", data.summary.draftArticles.toString()],
      ["Toplam Görüntülenme", data.summary.totalViews.toLocaleString("tr-TR")],
      ["Ortalama Skor", data.summary.averageScore.toFixed(2)],
    ];

    autoTable(doc, {
      body: summaryData,
      startY: 50,
      theme: "grid",
      styles: { fontSize: 10 },
    });

    // Top Articles
    doc.setFontSize(14);
    const topArticlesY = (doc as any).lastAutoTable.finalY + 10;
    doc.text("En Popüler Makaleler", 14, topArticlesY);

    autoTable(doc, {
      head: [["Başlık", "Görüntülenme", "Skor"]],
      body: data.topArticles
        .slice(0, 10)
        .map((a) => [
          a.title.slice(0, 40) + (a.title.length > 40 ? "..." : ""),
          a.views.toLocaleString("tr-TR"),
          a.score.toString(),
        ]),
      startY: topArticlesY + 5,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [59, 130, 246] },
    });

    // Category Stats
    doc.setFontSize(14);
    const categoryStatsY = (doc as any).lastAutoTable.finalY + 10;
    doc.text("Kategori İstatistikleri", 14, categoryStatsY);

    autoTable(doc, {
      head: [["Kategori", "Makale Sayısı", "Toplam Görüntülenme"]],
      body: data.categoryStats.map((c) => [
        c.name,
        c.count.toString(),
        c.views.toLocaleString("tr-TR"),
      ]),
      startY: categoryStatsY + 5,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [59, 130, 246] },
    });

    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.text(
        `Sayfa ${i} / ${pageCount}`,
        doc.internal.pageSize.getWidth() / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: "center" },
      );
    }

    // Save
    doc.save(`analytics_report_${new Date().toISOString().split("T")[0]}.pdf`);

    return true;
  } catch (error) {
    console.error("[PDF_REPORT_EXPORT_ERROR]", error);
    return false;
  }
}

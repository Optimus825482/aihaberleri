/**
 * Excel Export Utility
 * Export data to Excel (.xlsx) format
 */

import * as XLSX from "xlsx";

interface ExportColumn {
  header: string;
  key: string;
  width?: number;
}

interface ExportOptions {
  filename: string;
  sheetName?: string;
  columns: ExportColumn[];
  data: any[];
}

/**
 * Export data to Excel file
 */
export function exportToExcel({
  filename,
  sheetName = "Sheet1",
  columns,
  data,
}: ExportOptions) {
  try {
    // Prepare data with headers
    const headers = columns.map((col) => col.header);
    const rows = data.map((row) =>
      columns.map((col) => {
        const value = row[col.key];

        // Format dates
        if (value instanceof Date) {
          return value.toLocaleDateString("tr-TR");
        }

        // Format booleans
        if (typeof value === "boolean") {
          return value ? "Evet" : "Hayır";
        }

        return value ?? "";
      }),
    );

    // Create worksheet
    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);

    // Set column widths
    worksheet["!cols"] = columns.map((col) => ({
      wch: col.width || 15,
    }));

    // Create workbook
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    // Generate Excel file
    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });
    const blob = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    // Download file
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${filename}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    return true;
  } catch (error) {
    console.error("[EXCEL_EXPORT_ERROR]", error);
    return false;
  }
}

/**
 * Export articles to Excel
 */
export function exportArticlesToExcel(articles: any[]) {
  return exportToExcel({
    filename: `articles_${new Date().toISOString().split("T")[0]}`,
    sheetName: "Makaleler",
    columns: [
      { header: "Başlık", key: "title", width: 40 },
      { header: "Kategori", key: "category", width: 15 },
      { header: "Durum", key: "status", width: 12 },
      { header: "Görüntülenme", key: "views", width: 12 },
      { header: "Skor", key: "score", width: 10 },
      { header: "Yayın Tarihi", key: "publishedAt", width: 15 },
      { header: "Oluşturulma", key: "createdAt", width: 15 },
    ],
    data: articles.map((article) => ({
      title: article.title,
      category: article.category?.name || "-",
      status: article.status === "PUBLISHED" ? "Yayında" : "Taslak",
      views: article.views,
      score: article.score,
      publishedAt: article.publishedAt ? new Date(article.publishedAt) : "-",
      createdAt: new Date(article.createdAt),
    })),
  });
}

/**
 * Export audit logs to Excel
 */
export function exportAuditLogsToExcel(logs: any[]) {
  return exportToExcel({
    filename: `audit_logs_${new Date().toISOString().split("T")[0]}`,
    sheetName: "Aktivite Geçmişi",
    columns: [
      { header: "Kullanıcı", key: "user", width: 25 },
      { header: "İşlem", key: "action", width: 15 },
      { header: "Kaynak", key: "resource", width: 15 },
      { header: "Detay", key: "details", width: 30 },
      { header: "IP Adresi", key: "ipAddress", width: 15 },
      { header: "Tarih", key: "createdAt", width: 20 },
    ],
    data: logs.map((log) => ({
      user: log.user.name || log.user.email,
      action: log.action,
      resource: log.resource,
      details: log.details ? JSON.stringify(log.details) : "-",
      ipAddress: log.ipAddress || "-",
      createdAt: new Date(log.createdAt),
    })),
  });
}

/**
 * Export analytics to Excel
 */
export function exportAnalyticsToExcel(analytics: {
  summary: any;
  articles: any[];
  categories: any[];
}) {
  try {
    const workbook = XLSX.utils.book_new();

    // Sheet 1: Summary
    const summaryData = [
      ["Metrik", "Değer"],
      ["Toplam Makale", analytics.summary.totalArticles],
      ["Yayında", analytics.summary.publishedArticles],
      ["Taslak", analytics.summary.draftArticles],
      ["Toplam Görüntülenme", analytics.summary.totalViews],
      ["Ortalama Skor", analytics.summary.averageScore],
    ];
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, "Özet");

    // Sheet 2: Articles
    const articlesHeaders = ["Başlık", "Kategori", "Görüntülenme", "Skor"];
    const articlesRows = analytics.articles.map((a) => [
      a.title,
      a.category?.name || "-",
      a.views,
      a.score,
    ]);
    const articlesSheet = XLSX.utils.aoa_to_sheet([
      articlesHeaders,
      ...articlesRows,
    ]);
    XLSX.utils.book_append_sheet(workbook, articlesSheet, "Makaleler");

    // Sheet 3: Categories
    const categoriesHeaders = [
      "Kategori",
      "Makale Sayısı",
      "Toplam Görüntülenme",
    ];
    const categoriesRows = analytics.categories.map((c) => [
      c.name,
      c.count,
      c.views,
    ]);
    const categoriesSheet = XLSX.utils.aoa_to_sheet([
      categoriesHeaders,
      ...categoriesRows,
    ]);
    XLSX.utils.book_append_sheet(workbook, categoriesSheet, "Kategoriler");

    // Download
    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });
    const blob = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `analytics_${new Date().toISOString().split("T")[0]}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    return true;
  } catch (error) {
    console.error("[ANALYTICS_EXPORT_ERROR]", error);
    return false;
  }
}

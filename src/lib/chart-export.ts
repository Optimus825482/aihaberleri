/**
 * Chart Export Utility
 * Export charts to PNG/SVG format
 */

import html2canvas from "html2canvas";

/**
 * Export chart element to PNG
 */
export async function exportChartToPNG(
  elementId: string,
  filename: string,
): Promise<boolean> {
  try {
    const element = document.getElementById(elementId);

    if (!element) {
      throw new Error(`Element with ID "${elementId}" not found`);
    }

    // Convert to canvas
    const canvas = await html2canvas(element, {
      backgroundColor: "#ffffff",
      scale: 2, // Higher quality
      logging: false,
    });

    // Convert to blob
    canvas.toBlob((blob) => {
      if (!blob) {
        throw new Error("Failed to create blob");
      }

      // Download
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${filename}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    });

    return true;
  } catch (error) {
    console.error("[CHART_PNG_EXPORT_ERROR]", error);
    return false;
  }
}

/**
 * Export chart element to SVG
 */
export function exportChartToSVG(elementId: string, filename: string): boolean {
  try {
    const element = document.getElementById(elementId);

    if (!element) {
      throw new Error(`Element with ID "${elementId}" not found`);
    }

    // Find SVG element
    const svgElement = element.querySelector("svg");

    if (!svgElement) {
      throw new Error("No SVG element found in chart");
    }

    // Clone SVG
    const svgClone = svgElement.cloneNode(true) as SVGElement;

    // Set background
    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.setAttribute("width", "100%");
    rect.setAttribute("height", "100%");
    rect.setAttribute("fill", "#ffffff");
    svgClone.insertBefore(rect, svgClone.firstChild);

    // Serialize to string
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svgClone);

    // Create blob
    const blob = new Blob([svgString], { type: "image/svg+xml" });

    // Download
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${filename}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    return true;
  } catch (error) {
    console.error("[CHART_SVG_EXPORT_ERROR]", error);
    return false;
  }
}

/**
 * Export multiple charts at once
 */
export async function exportMultipleCharts(
  charts: Array<{ elementId: string; filename: string }>,
  format: "png" | "svg" = "png",
): Promise<{ success: number; failed: number }> {
  let success = 0;
  let failed = 0;

  for (const chart of charts) {
    try {
      if (format === "png") {
        await exportChartToPNG(chart.elementId, chart.filename);
      } else {
        exportChartToSVG(chart.elementId, chart.filename);
      }
      success++;
    } catch (error) {
      console.error(`Failed to export chart ${chart.elementId}:`, error);
      failed++;
    }

    // Add delay between exports to prevent browser freeze
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  return { success, failed };
}

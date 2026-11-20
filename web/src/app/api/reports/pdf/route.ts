import { NextResponse } from "next/server";
import { degrees, PDFDocument, rgb, StandardFonts } from "pdf-lib";
import {
  getProjectProgress,
  getProjectReport,
  getTimeline,
  parseDate,
  statusColors,
  statusLabels,
  type ReportActivity,
} from "@/lib/projectReport";

export const runtime = "nodejs";

const pageWidth = 1190;
const pageHeight = 842;
const margin = 28;
const activityColumnWidth = 390;
const columnWidths = [170, 65, 36, 70, 49];
const daysPerPage = 28;
const rowsPerPage = 22;
const rowHeight = 24;
const headerHeight = 54;

function colorFromHex(hex: string) {
  const value = Number.parseInt(hex, 16);
  return rgb(((value >> 16) & 255) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255);
}

const statusBarColors: Record<ReportActivity["status"], ReturnType<typeof rgb>> = {
  pending: colorFromHex(statusColors.pending),
  "in-progress": colorFromHex(statusColors["in-progress"]),
  completed: colorFromHex(statusColors.completed),
  delayed: colorFromHex(statusColors.delayed),
};

function printableText(value: string) {
  return value.replace(/[^\x20-\x7E\u00A0-\u00FF]/g, "?");
}

function clippedText(
  value: string,
  maxWidth: number,
  font: Awaited<ReturnType<PDFDocument["embedFont"]>>,
  size: number,
) {
  let text = printableText(value);
  if (font.widthOfTextAtSize(text, size) <= maxWidth) return text;
  while (text.length && font.widthOfTextAtSize(`${text}...`, size) > maxWidth) {
    text = text.slice(0, -1);
  }
  return text ? `${text}...` : "";
}

function dayOffset(date: string, startDate: string) {
  return Math.round((parseDate(date).getTime() - parseDate(startDate).getTime()) / 86400000);
}

function weekdayLetter(date: string) {
  return ["D", "L", "M", "X", "J", "V", "S"][parseDate(date).getUTCDay()];
}

function sameMonth(a: string, b: string) {
  return a.slice(0, 7) === b.slice(0, 7);
}

function drawSummary(
  page: ReturnType<PDFDocument["addPage"]>,
  metrics: ReturnType<typeof getProjectProgress>,
  bold: Awaited<ReturnType<PDFDocument["embedFont"]>>,
) {
  const cards = [
    { label: "ACTIVIDADES", value: String(metrics.total), color: rgb(0.14, 0.3, 0.41) },
    { label: "COMPLETADAS", value: String(metrics.completed), color: rgb(0.08, 0.54, 0.34) },
    { label: "AVANCE", value: `${metrics.percent}%`, color: rgb(0.14, 0.39, 0.65) },
    { label: "ATRASADAS", value: String(metrics.delayed), color: rgb(0.78, 0.22, 0.24) },
  ];
  const gap = 12;
  const cardWidth = (pageWidth - margin * 2 - gap * 3) / cards.length;
  cards.forEach((card, index) => {
    const x = margin + index * (cardWidth + gap);
    page.drawRectangle({
      x,
      y: 738,
      width: cardWidth,
      height: 34,
      color: rgb(0.94, 0.96, 0.97),
      borderColor: rgb(0.83, 0.88, 0.91),
      borderWidth: 0.7,
    });
    page.drawRectangle({ x, y: 738, width: 4, height: 34, color: card.color });
    page.drawText(card.label, {
      x: x + 12,
      y: 757,
      size: 8,
      font: bold,
      color: rgb(0.35, 0.41, 0.46),
    });
    page.drawText(card.value, {
      x: x + cardWidth - 38,
      y: 746,
      size: 16,
      font: bold,
      color: card.color,
    });
  });
}

function drawLegend(
  page: ReturnType<PDFDocument["addPage"]>,
  font: Awaited<ReturnType<PDFDocument["embedFont"]>>,
  bold: Awaited<ReturnType<PDFDocument["embedFont"]>>,
) {
  page.drawText("ESTADO", { x: margin, y: 66, size: 8, font: bold, color: rgb(0.28, 0.35, 0.4) });
  const statuses: ReportActivity["status"][] = ["pending", "in-progress", "completed", "delayed"];
  let x = margin + 48;
  for (const status of statuses) {
    page.drawRectangle({ x, y: 64, width: 10, height: 10, color: statusBarColors[status] });
    const label = statusLabels[status];
    page.drawText(label, { x: x + 15, y: 66, size: 8, font, color: rgb(0.28, 0.35, 0.4) });
    x += 15 + font.widthOfTextAtSize(label, 8) + 22;
  }
  page.drawText("Hito: marcador en forma de diamante", {
    x: pageWidth - margin - 205,
    y: 66,
    size: 8,
    font,
    color: rgb(0.35, 0.41, 0.46),
  });
}

function drawPage(
  page: ReturnType<PDFDocument["addPage"]>,
  projectName: string,
  activities: ReportActivity[],
  timeline: string[],
  pageActivities: ReportActivity[],
  horizontalPage: number,
  verticalPage: number,
  pageNumber: number,
  totalPages: number,
  metrics: ReturnType<typeof getProjectProgress>,
  font: Awaited<ReturnType<PDFDocument["embedFont"]>>,
  bold: Awaited<ReturnType<PDFDocument["embedFont"]>>,
) {
  const dates = timeline.slice(horizontalPage * daysPerPage, (horizontalPage + 1) * daysPerPage);
  const timelineX = margin + activityColumnWidth;
  const timelineWidth = pageWidth - margin * 2 - activityColumnWidth;
  const dayWidth = dates.length ? timelineWidth / daysPerPage : 0;
  const tableTop = 690;
  const bodyTop = tableTop - headerHeight;
  const visibleRows = pageActivities.length;
  const bodyBottom = bodyTop - Math.max(visibleRows, 1) * rowHeight;

  page.drawText(clippedText(projectName, pageWidth - margin * 2, bold, 20), {
    x: margin,
    y: 804,
    size: 20,
    font: bold,
    color: rgb(0.09, 0.2, 0.3),
  });
  const pageCaption = dates.length
    ? `CARTA GANTT  ·  ${dates[0]} al ${dates[dates.length - 1]}`
    : "CARTA GANTT  ·  Sin actividades programadas";
  page.drawText(printableText(pageCaption), {
    x: margin,
    y: 785,
    size: 9,
    font,
    color: rgb(0.36, 0.43, 0.49),
  });
  if (horizontalPage === 0 && verticalPage === 0) drawSummary(page, metrics, bold);

  page.drawRectangle({
    x: margin,
    y: tableTop - headerHeight,
    width: pageWidth - margin * 2,
    height: headerHeight,
    color: rgb(0.96, 0.97, 0.98),
  });
  page.drawRectangle({
    x: margin,
    y: tableTop - headerHeight,
    width: activityColumnWidth,
    height: headerHeight,
    color: rgb(0.15, 0.29, 0.39),
  });
  const headerLabels = ["ACTIVIDAD", "INICIO", "DÍAS", "RESPONSABLE", "ANT."];
  let x = margin;
  headerLabels.forEach((label, index) => {
    const width = columnWidths[index];
    page.drawText(label, {
      x: x + 5,
      y: tableTop - 33,
      size: 7,
      font: bold,
      color: rgb(1, 1, 1),
    });
    x += width;
  });

  for (let offset = 0; offset < dates.length;) {
    let count = 1;
    while (offset + count < dates.length && sameMonth(dates[offset], dates[offset + count])) count++;
    const bandX = timelineX + offset * dayWidth;
    const bandWidth = count * dayWidth;
    page.drawRectangle({
      x: bandX,
      y: tableTop - 18,
      width: bandWidth,
      height: 18,
      color: rgb(0.15, 0.29, 0.39),
    });
    const monthName = parseDate(dates[offset]).toLocaleDateString("es-CL", {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }).toLocaleUpperCase("es-CL");
    const label = clippedText(monthName, bandWidth - 4, bold, 8);
    page.drawText(label, {
      x: bandX + Math.max(2, (bandWidth - bold.widthOfTextAtSize(label, 8)) / 2),
      y: tableTop - 13,
      size: 8,
      font: bold,
      color: rgb(1, 1, 1),
    });
    offset += count;
  }

  dates.forEach((date, index) => {
    const dateX = timelineX + index * dayWidth;
    page.drawRectangle({
      x: dateX,
      y: tableTop - 38,
      width: dayWidth,
      height: 20,
      color: rgb(0.86, 0.9, 0.93),
    });
    page.drawText(date.slice(8), {
      x: dateX + 2,
      y: tableTop - 31,
      size: 8,
      font: bold,
      color: rgb(0.15, 0.22, 0.27),
    });
    page.drawText(weekdayLetter(date), {
      x: dateX + 2,
      y: tableTop - 48,
      size: 7,
      font,
      color: rgb(0.36, 0.43, 0.49),
    });

    if ([0, 6].includes(parseDate(date).getUTCDay())) {
      page.drawRectangle({
        x: dateX,
        y: bodyBottom,
        width: dayWidth,
        height: bodyTop - bodyBottom,
        color: rgb(0.94, 0.95, 0.96),
      });
    }
  });

  for (let index = 0; index <= dates.length; index++) {
    const dateX = timelineX + index * dayWidth;
    page.drawLine({
      start: { x: dateX, y: tableTop },
      end: { x: dateX, y: bodyBottom },
      thickness: index % 7 === 0 ? 0.8 : 0.35,
      color: index % 7 === 0 ? rgb(0.65, 0.71, 0.76) : rgb(0.85, 0.88, 0.9),
    });
  }

  const rowById = new Map(pageActivities.map((activity, index) => [activity.id, index]));
  if (dates.length) {
    pageActivities.forEach((activity, index) => {
      const targetStart = dayOffset(activity.start, dates[0]);
      if (targetStart < 0 || targetStart >= dates.length) return;
      const targetX = timelineX + targetStart * dayWidth + 2;
      const targetY = bodyTop - index * rowHeight - rowHeight / 2;
      for (const predecessorId of activity.predecessors) {
        const predecessor = activities.find(item => item.id === predecessorId);
        const predecessorRow = rowById.get(predecessorId);
        if (!predecessor || predecessorRow === undefined) continue;
        const predecessorEnd = dayOffset(predecessor.start, dates[0]) + Math.max(1, predecessor.duration);
        if (predecessorEnd <= 0 || predecessorEnd > dates.length) continue;
        const sourceX = timelineX + predecessorEnd * dayWidth - 2;
        const sourceY = bodyTop - predecessorRow * rowHeight - rowHeight / 2;
        if (sourceX >= targetX - 2) continue;
        const middleX = (sourceX + targetX) / 2;
        const lineColor = rgb(0.38, 0.45, 0.51);
        page.drawLine({ start: { x: sourceX, y: sourceY }, end: { x: middleX, y: sourceY }, thickness: 0.9, color: lineColor });
        page.drawLine({ start: { x: middleX, y: sourceY }, end: { x: middleX, y: targetY }, thickness: 0.9, color: lineColor });
        page.drawLine({ start: { x: middleX, y: targetY }, end: { x: targetX, y: targetY }, thickness: 0.9, color: lineColor });
        page.drawLine({ start: { x: targetX - 5, y: targetY + 3 }, end: { x: targetX, y: targetY }, thickness: 0.9, color: lineColor });
        page.drawLine({ start: { x: targetX - 5, y: targetY - 3 }, end: { x: targetX, y: targetY }, thickness: 0.9, color: lineColor });
      }
    });
  }

  pageActivities.forEach((activity, index) => {
    const rowTop = bodyTop - index * rowHeight;
    const rowBottom = rowTop - rowHeight;
    const background = index % 2 ? rgb(0.98, 0.985, 0.99) : rgb(1, 1, 1);
    page.drawRectangle({
      x: margin,
      y: rowBottom,
      width: activityColumnWidth,
      height: rowHeight,
      color: background,
    });
    page.drawRectangle({
      x: margin,
      y: rowBottom,
      width: 4,
      height: rowHeight,
      color: statusBarColors[activity.status],
    });
    page.drawLine({
      start: { x: margin, y: rowBottom },
      end: { x: pageWidth - margin, y: rowBottom },
      thickness: 0.45,
      color: rgb(0.83, 0.87, 0.9),
    });

    const values = [
      activity.title,
      activity.start.slice(5),
      String(activity.duration),
      activity.responsible || "—",
      activity.predecessors.length ? activity.predecessors.join(",") : "—",
    ];
    let cellX = margin;
    values.forEach((value, columnIndex) => {
      const width = columnWidths[columnIndex];
      page.drawText(clippedText(value, width - 9, columnIndex === 0 ? bold : font, 8), {
        x: cellX + 7,
        y: rowBottom + 8,
        size: 8,
        font: columnIndex === 0 ? bold : font,
        color: rgb(0.2, 0.27, 0.32),
      });
      cellX += width;
    });

    if (!dates.length) return;
    const startOffset = dayOffset(activity.start, dates[0]);
    const endOffset = startOffset + Math.max(1, activity.duration) - 1;
    const visibleStart = Math.max(0, startOffset);
    const visibleEnd = Math.min(dates.length - 1, endOffset);
    if (visibleEnd < visibleStart) return;

    const barX = timelineX + visibleStart * dayWidth + 2;
    const barWidth = Math.max(4, (visibleEnd - visibleStart + 1) * dayWidth - 4);
    const barY = rowBottom + 6;
    const barHeight = 12;
    if (activity.type === "milestone") {
      page.drawRectangle({
        x: barX + Math.max(0, (barWidth - 10) / 2),
        y: barY + 1,
        width: 10,
        height: 10,
        rotate: degrees(45),
        color: statusBarColors[activity.status],
      });
    } else {
      page.drawRectangle({
        x: barX,
        y: barY,
        width: barWidth,
        height: barHeight,
        color: statusBarColors[activity.status],
      });
    }
  });

  if (!pageActivities.length) {
    page.drawRectangle({
      x: margin,
      y: bodyTop - 48,
      width: pageWidth - margin * 2,
      height: 48,
      color: rgb(0.98, 0.985, 0.99),
      borderColor: rgb(0.83, 0.87, 0.9),
      borderWidth: 0.7,
    });
    page.drawText("No hay actividades registradas para este proyecto.", {
      x: margin + 16,
      y: bodyTop - 29,
      size: 9,
      font,
      color: rgb(0.4, 0.46, 0.51),
    });
  }

  page.drawLine({
    start: { x: margin, y: tableTop },
    end: { x: pageWidth - margin, y: tableTop },
    thickness: 0.8,
    color: rgb(0.55, 0.62, 0.68),
  });
  drawLegend(page, font, bold);
  page.drawText(`Página ${pageNumber} de ${totalPages}`, {
    x: pageWidth - margin - 100,
    y: 31,
    size: 8,
    font,
    color: rgb(0.45, 0.5, 0.55),
  });
}

export async function GET(request: Request) {
  try {
    const projectId = Number(new URL(request.url).searchParams.get("projectId"));
    if (!Number.isInteger(projectId) || projectId < 1) {
      return NextResponse.json({ error: "ID de proyecto inválido." }, { status: 400 });
    }

    const report = getProjectReport(projectId);
    if (!report) return NextResponse.json({ error: "Proyecto no encontrado." }, { status: 404 });

    const { activities, project } = report;
    const timeline = getTimeline(activities);
    const metrics = getProjectProgress(activities);
    const horizontalPages = Math.max(1, Math.ceil(timeline.length / daysPerPage));
    const verticalPages = Math.max(1, Math.ceil(activities.length / rowsPerPage));
    const totalPages = horizontalPages * verticalPages;
    const pdf = await PDFDocument.create();
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

    let pageNumber = 0;
    for (let verticalPage = 0; verticalPage < verticalPages; verticalPage++) {
      const pageActivities = activities.slice(
        verticalPage * rowsPerPage,
        (verticalPage + 1) * rowsPerPage,
      );
      for (let horizontalPage = 0; horizontalPage < horizontalPages; horizontalPage++) {
        pageNumber++;
        const page = pdf.addPage([pageWidth, pageHeight]);
        drawPage(
          page,
          project.name,
          activities,
          timeline,
          pageActivities,
          horizontalPage,
          verticalPage,
          pageNumber,
          totalPages,
          metrics,
          font,
          bold,
        );
      }
    }

    const pdfBytes = await pdf.save();
    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="carta-gantt-proyecto-${projectId}.pdf"`,
      },
    });
  } catch (error) {
    console.error("Error exportando PDF:", error);
    return NextResponse.json({ error: "No se pudo generar el archivo PDF" }, { status: 500 });
  }
}

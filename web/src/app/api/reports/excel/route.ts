import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import {
  finishDate,
  getProjectProgress,
  getProjectReport,
  getTimeline,
  parseDate,
  statusColors,
  statusLabels,
} from "@/lib/projectReport";

const fixedColumns = [
  { title: "ID", width: 8 },
  { title: "Actividad", width: 30 },
  { title: "Inicio", width: 13 },
  { title: "Duración", width: 11 },
  { title: "Término", width: 13 },
  { title: "Responsable", width: 20 },
  { title: "Estado", width: 16 },
  { title: "Predecesoras", width: 15 },
  { title: "Tipo", width: 12 },
];

const timelineChunkSize = 35;
const statusFills: Record<keyof typeof statusColors, string> = {
  pending: "FFE2E8F0",
  "in-progress": "FFBFDBFE",
  completed: "FFBBF7D0",
  delayed: "FFFECACA",
};

function fill(color: string): ExcelJS.Fill {
  return { type: "pattern", pattern: "solid", fgColor: { argb: color } };
}

function monthLabel(date: string): string {
  return parseDate(date).toLocaleDateString("es-CL", { month: "long", year: "numeric", timeZone: "UTC" });
}

function weekdayLabel(date: string): string {
  return parseDate(date).toLocaleDateString("es-CL", { weekday: "narrow", timeZone: "UTC" }).toUpperCase();
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
    const progress = getProjectProgress(activities);
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "ConstruPlan";
    workbook.subject = `Carta Gantt - ${project.name}`;
    workbook.title = `Carta Gantt - ${project.name}`;
    workbook.created = new Date();
    workbook.modified = new Date();

    const periods = timeline.length
      ? Array.from({ length: Math.ceil(timeline.length / timelineChunkSize) }, (_, index) =>
          timeline.slice(index * timelineChunkSize, (index + 1) * timelineChunkSize))
      : [[]];

    periods.forEach((dates, periodIndex) => {
      const worksheet = workbook.addWorksheet(periods.length === 1 ? "Carta Gantt" : `Gantt ${periodIndex + 1}`);
      const timelineStartColumn = fixedColumns.length + 1;
      const lastColumn = fixedColumns.length + dates.length;
      fixedColumns.forEach((column, index) => {
        worksheet.getColumn(index + 1).width = column.width;
      });
      dates.forEach((_, index) => {
        worksheet.getColumn(timelineStartColumn + index).width = 4;
      });

      worksheet.mergeCells(1, 1, 1, lastColumn);
      const title = worksheet.getCell(1, 1);
      title.value = project.name;
      title.font = { name: "Aptos Display", size: 20, bold: true, color: { argb: "FFFFFFFF" } };
      title.fill = fill("FF17324D");
      title.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
      worksheet.getRow(1).height = 36;

      worksheet.mergeCells(2, 1, 2, lastColumn);
      const subtitle = worksheet.getCell(2, 1);
      subtitle.value = dates.length
        ? `CARTA GANTT · ${dates[0]} al ${dates[dates.length - 1]} · Fechas de término inclusivas`
        : "CARTA GANTT · Sin actividades programadas";
      subtitle.font = { size: 10, italic: true, color: { argb: "FF475569" } };
      subtitle.alignment = { vertical: "middle", indent: 1 };
      worksheet.getRow(2).height = 22;

      const summaryCards = [
        { start: 1, end: 2, value: `ACTIVIDADES  ${progress.total}` },
        { start: 3, end: 4, value: `COMPLETADAS  ${progress.completed}` },
        { start: 5, end: 6, value: `AVANCE  ${progress.percent}%` },
        { start: 7, end: fixedColumns.length, value: `ATRASADAS  ${progress.delayed}` },
      ];
      summaryCards.forEach(card => {
        worksheet.mergeCells(3, card.start, 3, card.end);
        const cell = worksheet.getCell(3, card.start);
        cell.value = card.value;
        cell.font = { bold: true, size: 10, color: { argb: "FF17324D" } };
        cell.fill = fill("FFE8F1F5");
        cell.alignment = { vertical: "middle", horizontal: "center" };
        cell.border = { bottom: { style: "thin", color: { argb: "FFB8C9D3" } } };
      });
      worksheet.getRow(3).height = 24;
      worksheet.getRow(4).height = 8;

      fixedColumns.forEach((column, index) => {
        const columnNumber = index + 1;
        worksheet.mergeCells(5, columnNumber, 7, columnNumber);
        const cell = worksheet.getCell(5, columnNumber);
        cell.value = column.title;
        cell.font = { bold: true, size: 9, color: { argb: "FFFFFFFF" } };
        cell.fill = fill("FF274C68");
        cell.alignment = { vertical: "middle", horizontal: index === 1 ? "left" : "center", wrapText: true };
        cell.border = {
          right: { style: "thin", color: { argb: "FFB8C9D3" } },
          bottom: { style: "thin", color: { argb: "FFB8C9D3" } },
        };
      });

      for (let offset = 0; offset < dates.length;) {
        const label = monthLabel(dates[offset]);
        let count = 1;
        while (offset + count < dates.length && monthLabel(dates[offset + count]) === label) count++;
        const column = timelineStartColumn + offset;
        if (count > 1) worksheet.mergeCells(5, column, 5, column + count - 1);
        const cell = worksheet.getCell(5, column);
        cell.value = label.toLocaleUpperCase("es-CL");
        cell.font = { bold: true, size: 9, color: { argb: "FFFFFFFF" } };
        cell.fill = fill("FF274C68");
        cell.alignment = { horizontal: "center", vertical: "middle" };
        offset += count;
      }

      dates.forEach((date, index) => {
        const column = timelineStartColumn + index;
        const dayCell = worksheet.getCell(6, column);
        dayCell.value = parseDate(date);
        dayCell.numFmt = "d";
        const weekend = [0, 6].includes(parseDate(date).getUTCDay());
        const headerFill = fill(weekend ? "FFCBD5E1" : "FFDCE8EF");
        dayCell.fill = headerFill;
        dayCell.font = { bold: true, size: 9, color: { argb: "FF17324D" } };
        dayCell.alignment = { horizontal: "center", vertical: "middle" };

        const weekdayCell = worksheet.getCell(7, column);
        weekdayCell.value = weekdayLabel(date);
        weekdayCell.fill = headerFill;
        weekdayCell.font = { size: 8, color: { argb: "FF475569" } };
        weekdayCell.alignment = { horizontal: "center", vertical: "middle" };
        weekdayCell.border = { bottom: { style: "thin", color: { argb: "FF94A3B8" } } };
      });
      worksheet.getRow(5).height = 20;
      worksheet.getRow(6).height = 20;
      worksheet.getRow(7).height = 17;

      if (!activities.length) {
        worksheet.mergeCells(8, 1, 8, fixedColumns.length);
        worksheet.getCell(8, 1).value = "No hay actividades registradas para este proyecto.";
        worksheet.getCell(8, 1).font = { italic: true, color: { argb: "FF64748B" } };
        worksheet.getRow(8).height = 28;
      }

      activities.forEach((activity, index) => {
        const rowNumber = index + 8;
        const row = worksheet.getRow(rowNumber);
        const values = [
          activity.id,
          activity.title,
          activity.start,
          activity.duration,
          finishDate(activity),
          activity.responsible || "—",
          statusLabels[activity.status],
          activity.predecessors.length ? activity.predecessors.join(", ") : "—",
          activity.type === "milestone" ? "Hito" : "Tarea",
        ];
        values.forEach((value, cellIndex) => {
          const cell = row.getCell(cellIndex + 1);
          cell.value = value;
          cell.alignment = { vertical: "middle", horizontal: cellIndex === 1 || cellIndex === 5 ? "left" : "center" };
          cell.border = {
            bottom: { style: "hair", color: { argb: "FFD3DCE4" } },
            right: { style: "hair", color: { argb: "FFE2E8F0" } },
          };
          if (index % 2 === 1) cell.fill = fill("FFF8FAFC");
          if (cellIndex === 6) {
            cell.fill = fill(statusFills[activity.status]);
            cell.font = { bold: true, color: { argb: `FF${statusColors[activity.status]}` } };
          }
        });

        dates.forEach((date, dayIndex) => {
          const cell = row.getCell(timelineStartColumn + dayIndex);
          const scheduled = date >= activity.start && date <= finishDate(activity);
          const weekend = [0, 6].includes(parseDate(date).getUTCDay());
          cell.value = scheduled && activity.type === "milestone" && date === activity.start ? "◆" : scheduled ? " " : null;
          cell.fill = fill(scheduled ? statusFills[activity.status] : weekend ? "FFF1F5F9" : index % 2 ? "FFF8FAFC" : "FFFFFFFF");
          cell.alignment = { horizontal: "center", vertical: "middle" };
          cell.border = {
            bottom: { style: "hair", color: { argb: "FFD3DCE4" } },
            right: { style: "hair", color: { argb: "FFE2E8F0" } },
          };
          if (scheduled && activity.type === "milestone") {
            cell.font = { bold: true, color: { argb: `FF${statusColors[activity.status]}` } };
          }
        });
        row.height = 21;
      });

      worksheet.views = [{ state: "frozen", xSplit: fixedColumns.length, ySplit: 7, zoomScale: 85 }];
      worksheet.pageSetup = {
        orientation: "landscape",
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
        paperSize: 9,
        printTitlesRow: "1:7",
        printArea: `A1:${worksheet.getColumn(lastColumn).letter}${Math.max(8, activities.length + 7)}`,
        margins: { left: 0.25, right: 0.25, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 },
      };
    });

    const detailSheet = workbook.addWorksheet("Detalle");
    const detailHeaders = fixedColumns.map(column => column.title);
    detailSheet.addRow(detailHeaders);
    const header = detailSheet.getRow(1);
    header.font = { bold: true, color: { argb: "FFFFFFFF" } };
    header.fill = fill("FF274C68");
    header.alignment = { vertical: "middle", horizontal: "center" };
    header.height = 24;
    activities.forEach(activity => {
      detailSheet.addRow([
        activity.id,
        activity.title,
        activity.start,
        activity.duration,
        finishDate(activity),
        activity.responsible || "—",
        statusLabels[activity.status],
        activity.predecessors.length ? activity.predecessors.join(", ") : "—",
        activity.type === "milestone" ? "Hito" : "Tarea",
      ]);
    });
    fixedColumns.forEach((column, index) => {
      detailSheet.getColumn(index + 1).width = column.width;
    });
    detailSheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: fixedColumns.length },
    };
    detailSheet.views = [{ state: "frozen", ySplit: 1 }];
    detailSheet.pageSetup = { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9 };

    const bytes = await workbook.xlsx.writeBuffer();
    return new NextResponse(Buffer.from(bytes), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="carta-gantt-proyecto-${projectId}.xlsx"`,
      },
    });
  } catch (error) {
    console.error("Error exportando Excel:", error);
    return NextResponse.json({ error: "No se pudo generar el archivo Excel" }, { status: 500 });
  }
}

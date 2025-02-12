import ExcelJS from "exceljs";
import PDFDocument from "pdfkit-table";
import SalesReport from "../model/salesModel.js";
// _______________________________________________________________________//

// =============================== HELPER FUNCTION ===============================
// To get date filters based on the period
const getDateFilter = (period, startDate, endDate) => {
  const filters = {};
  const now = new Date();

  switch (period) {
    case "daily":
      filters.orderDate = {
        $gte: new Date(now.setHours(0, 0, 0)),
        $lt: new Date(),
      };
      break;
    case "weekly":
      filters.orderDate = {
        $gte: new Date(now.setDate(now.getDate() - 7)),
        $lt: new Date(),
      };
      break;
    case "monthly":
      filters.orderDate = {
        $gte: new Date(now.setMonth(now.getMonth() - 1)),
        $lt: new Date(),
      };
      break;
    case "yearly":
      filters.orderDate = {
        $gte: new Date(now.setFullYear(now.getFullYear() - 1)),
        $lt: new Date(),
      };
      break;
    case "custom":
      if (startDate && endDate) {
        filters.orderDate = {
          $gte: new Date(startDate).setHours(0, 0, 0, 0),
          $lte: new Date(endDate).setHours(23, 59, 59, 999),
        };
      }
      break;
  }

  return filters;
};

// =============================== ADMIN CONTROLLERS ===============================
// METHOD GET || SALES REPORT
export const getSalesReport = async (req, res,next) => {
  const {
    period = "daily",
    startDate,
    endDate,
    page = 1,
    limit = 10,
  } = req.query;

  try {
    const filter = getDateFilter(period, startDate, endDate);
    const skip = (page - 1) * limit;

    const [total, reports] = await Promise.all([
      SalesReport.countDocuments(filter),
      SalesReport.find(filter)
        .populate({
          path: "product.productId",
          select: "name price",
        })
        .populate({
          path: "customer",
          select: "firstName",
        })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
    ]);

    console.log(reports);

    const summary = {
      totalSales: reports.length,
      totalAmount: reports.reduce(
        (sum, report) => sum + (report.finalAmount || 0),
        0
      ),
      totalDiscount: reports.reduce(
        (sum, report) =>
          sum +
          report.product.reduce(
            (subtotal, product) =>
              subtotal +
              (product.discount || 0) +
              (product.couponDeduction || 0),
            0
          ),
        0
      ),
    };

    res.json({
      success: true,
      data: {
        reports,
        summary,
        pagination: {
          total,
          pages: Math.ceil(total / limit),
          currentPage: Number(page),
          limit: Number(limit),
        },
      },
    });
  } catch (error) {
    console.error("Sales report error:", error);
    next(error)
  }
};

// METHOD GET || DOWLOAD SALES REPORT PDF
export const downloadPDFReport = async (req, res,next) => {
  try {
    const { period, startDate, endDate } = req.query;
    const filter = getDateFilter(period, startDate, endDate);
    const reports = await SalesReport.find(filter)
      .populate({
        path: "customer",
        select: "firstName",
      })
      .lean();
    const doc = new PDFDocument({ margin: 20, size: "A4" });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=salesReport.pdf"
    );
    doc.pipe(res);
    doc.fontSize(18).text("Sales Report", { align: "center" }).moveDown();
    if (startDate && endDate) {
      doc.text(`From: ${startDate} To: ${endDate}`, { align: "center" });
    }
    const totalAmount = reports.reduce(
      (sum, report) => sum + report.finalAmount,
      0
    );
    doc
      .moveDown()
      .fontSize(12)
      .text(`Total Orders: ${reports.length}`)
      .text(`Total Amount: $${totalAmount.toFixed(2)}`)
      .moveDown();
    const table = {
      headers: [
        "Date",
        "Customer",
        "Products (Name, Unit Price, Qty, Total Price)",
        "Final Amount",
        "Payment Method",
        "Status",
      ],
      rows: reports.map((report) => [
        new Date(report.orderDate).toLocaleDateString(),
        report.customer?.firstName || "N/A",
        report.product
          .map(
            (p) =>
              `${p.productName} ($${p.unitPrice.toFixed(2)} x${p.quantity})`
          )
          .join(",\n"),
        `$${report.finalAmount.toFixed(2)}`,
        report.paymentMethod,
        report.deliveryStatus,
      ]),
    };
    await doc.table(table, { prepareRow: (row) => doc.fontSize(8) });
    doc.end();
  } catch (error) {
    console.error("PDF generation error:", error);
   next(error)
  }
};

// METHOD GET || DOWLOAD SALES REPORT EXCEL
export const downloadExcelReport = async (req, res,next) => {
  try {
    const { period, startDate, endDate } = req.query;
    const filter = getDateFilter(period, startDate, endDate);
    const reports = await SalesReport.find(filter)
      .populate({
        path: "customer",
        select: "firstName",
      })
      .lean();
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Sales Report");

    // Add title and summary
    worksheet.mergeCells("A1:G1");
    worksheet.getCell("A1").value = "Sales Report";
    worksheet.getCell("A1").alignment = { horizontal: "center" };
    worksheet.getCell("A1").font = { bold: true, size: 14 };
    const totalAmount = reports.reduce(
      (sum, report) => sum + report.finalAmount,
      0
    );
    worksheet.getRow(2).values = [
      `Total Orders: ${reports.length}`,
      `Total Amount: $${totalAmount.toFixed(2)}`,
    ];
    worksheet.addRow([
      "Order Date",
      "Customer",
      "Products (Name, Unit Price, Qty, Total Price)",
      "Final Amount",
      "Payment Method",
      "Delivery Status",
    ]);
    reports.forEach((report) => {
      worksheet.addRow([
        new Date(report.orderDate).toLocaleDateString(),
        report.customer?.firstName || "N/A",
        report.product
          .map(
            (p) =>
              `${p.productName} ($${p.unitPrice.toFixed(2)} x ${p.quantity})`
          )
          .join(", "),
        `$${report.finalAmount.toFixed(2)}`,
        report.paymentMethod,
        report.deliveryStatus,
      ]);
    });
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=salesReport.xlsx"
    );
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Excel generation error:", error);
    next(error)
  }
};
// _______________________________________________________________________//
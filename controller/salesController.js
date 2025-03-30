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
export const getSalesReport = async (req, res, next) => {
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

    const summary = {
      totalSales: reports.length,
      totalAmount: reports.reduce((sum, report) => {
        return sum + (report.finalAmount || 0);
      }, 0),
      
      totalDiscount: reports.reduce((sum, report) => {
        const reportDiscount = report.product.reduce((subtotal, product) => {
          // console.log(product)
          // product.productId.price 
          const discountValue =
            (product.productId.price - product.unitPrice) + (product.couponDeduction || 0);
          return subtotal + discountValue;
        }, 0);
      
        return sum + reportDiscount;
      }, 0),      
    };
    
    console.log("Final Summary:", summary);
    

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
    next(error);
  }
};

// METHOD GET || DOWNLOAD SALES REPORT PDF
export const downloadPDFReport = async (req, res, next) => {
  try {
    const { period, startDate, endDate } = req.query;
    const filter = getDateFilter(period, startDate, endDate);
    
    const reports = await SalesReport.find(filter)
      .populate({
        path: "product.productId",
        select: "name price",
      })
      .populate({
        path: "customer",
        select: "firstName",
      })
      .lean();

    // Create PDF document using pdfkit-table
    const doc = new PDFDocument({ margin: 20, size: "A4" });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=salesReport.pdf");
    doc.pipe(res);

    // Title and Date Range
    doc.fontSize(18)
       .text("Sales Report", { align: "center" })
       .moveDown();
    if (startDate && endDate) {
      const formattedStart = new Date(startDate).toLocaleDateString();
      const formattedEnd = new Date(endDate).toLocaleDateString();
      doc.fontSize(12)
         .text(`From: ${formattedStart} To: ${formattedEnd}`, { align: "center" })
         .moveDown();
    }

    // Summary data (Total Orders & Total Amount)
    const totalOrders = reports.length;
    const totalAmount = reports.reduce(
      (sum, report) => sum + report.finalAmount,
      0
    );
    doc.fontSize(12)
       .text(`Total Orders: ${totalOrders}`)
       .text(`Total Amount: ${totalAmount}`)
       .moveDown();

    // Build table rows – one row per product entry (matching Excel export)
    const rows = [];
    reports.forEach((report) => {
      console.log('reports',report)
      report.product.forEach((product) => {
        rows.push([
          new Date(report.orderDate).toLocaleDateString(), // Order Date
          report.customer?.firstName || "N/A",              // Customer
          product.productId?.name || product.productName,   // Product Name
          product.quantity,                                 // Quantity
          `${product.unitPrice.toFixed(2)}`,               // Unit Price
          `${product.discount.toFixed(2)}`,                // Discount
          `${product.totalPrice.toFixed(2)}`,              // Total Price
          report.paymentMethod,                             // Payment Method
          report.deliveryStatus                             // Status
        ]);
      });
    });

    console.log('rows is this : ', rows)

    // Define table structure matching the Excel headers
    const table = {
      headers: [
        "Order Date",
        "Customer",
        "Product Name",
        "Quantity",
        "Unit Price",
        "Discount",
        "Total Price",
        "Payment Method",
        "Status"
      ],
      rows: rows,
    };

    // Generate the table in the PDF
    await doc.table(table, {
      prepareHeader: () => doc.font("Helvetica-Bold").fontSize(10),
      prepareRow: (row, i) => doc.font("Helvetica").fontSize(8)
    });

    doc.end();
  } catch (error) {
    console.error("PDF generation error:", error);
    next(error);
  }
};


// METHOD GET || DOWNLOAD SALES REPORT EXCEL
export const downloadExcelReport = async (req, res, next) => {
  try {
    const { period, startDate, endDate } = req.query;
    const filter = getDateFilter(period, startDate, endDate);

    const reports = await SalesReport.find(filter)
      .populate({
        path: "product.productId",
        select: "name price",
      })
      .populate({
        path: "customer",
        select: "firstName",
      })
      .lean();

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Sales Report");

    // Add headers
    worksheet.columns = [
      { header: "Order Date", key: "orderDate", width: 20 },
      { header: "Customer", key: "customer", width: 20 },
      { header: "Product Name", key: "productName", width: 25 },
      { header: "Quantity", key: "quantity", width: 10 },
      { header: "Unit Price", key: "unitPrice", width: 15 },
      { header: "Discount", key: "discount", width: 15 },
      { header: "Total Price", key: "totalPrice", width: 15 },
      { header: "Payment Method", key: "paymentMethod", width: 20 },
      { header: "Status", key: "status", width: 15 },
    ];

    // Add data rows
    reports.forEach((report) => {
      report.product.forEach((product) => {
        worksheet.addRow({
          orderDate: new Date(report.orderDate).toLocaleDateString(),
          customer: report.customer?.firstName || "N/A",
          productName: product.productId?.name || "N/A",
          quantity: product.quantity,
          unitPrice: product.unitPrice,
          discount: product.discount,
          totalPrice: product.totalPrice,
          paymentMethod: report.paymentMethod,
          status: report.deliveryStatus,
        });
      });
    });

    // Set headers
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=sales_report.xlsx"
    );

    // Send file
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Excel export error:", error);
    next(error);
  }
};

// _______________________________________________________________________//

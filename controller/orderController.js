import mongoose from "mongoose";
import Order from "../model/orderModel.js";
import Product from "../model/productModel.js";
import Wallet from "../model/walletModel.js";
import SalesReport from "../model/salesModel.js";
import PDFDocument from 'pdfkit-table';
import path from 'path';


// _______________________________________________________________________//

// =========================== ADMIN CONTROLLERS ===========================
// METHOD GET || Get all orders with detailed information
export const getAllOrdersAdmin = async (req, res, next) => {
  try {
    const { page = 1, limit = 5 } = req.query;
    const totalOrders = await Order.countDocuments();
    const orders = await Order.find()
      .populate("userId", "firstName lastName email")
      .populate("addressId")
      .populate("products.productId")
      .sort({ createdAt: -1 });

    const processedOrders = orders.map((order) => ({
      _id: order._id,
      customerName: `${order.addressId?.name || "Unknown"}`,
      customerEmail: order.userId?.email || "Unknown",
      address: `${order.addressId?.address}, ${order.addressId?.city}, ${order.addressId?.state} - ${order.addressId?.pincode}`,
      products: order.products.map((p) => ({
        productId: p.productId._id,
        name: p.productId.name,
        price: p.productPrice,
        image: p.productId.image,
        quantity: p.quantity,
        status: p.status,
      })),
      paymentMethod: order.paymentMethod,
      totalAmount: order.totalAmount,
      status: order.status,
      createdAt: order.createdAt,
    }));
    
    res.status(200).json({ orders: processedOrders, totalOrders });
  } catch (error) {
    console.error("Error fetching orders:", error);
    next(error);
  }
};

// METHOD PUT || Update order item status
export const updateOrderStatus = async (req, res, next) => {
  try {
    const { orderId, productId } = req.params;
    const { status } = req.body;
    const validStatuses = ["Pending", "Shipped", "Delivered", "Cancelled"];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });

    // Find the index of the product in the order's products array
    const productIndex = order.products.findIndex(
      (p) =>
        p.productId.toString() ===
        new mongoose.Types.ObjectId(productId).toString()
    );

    if (productIndex === -1) {
      return res.status(404).json({ message: "Product not found in order" });
    }

    // Update the product status
    order.products[productIndex].status = status;

    // If delivered, set the delivery date
    if (status === "Delivered") {
      order.products[productIndex].deliveryDate = new Date();
    }

    // If cancelled, update wallet balance if payment method is not COD
    if (status === "Cancelled") {
      if (order.paymentMethod !== "COD") {
        // Fetch product details to access discountedPrice
        const productData = await Product.findById(productId);
        if (productData) {
          const refundAmount =
            productData.discountedPrice * order.products[productIndex].quantity;
          let userWallet = await Wallet.findOne({ user: order.userId });
          if (!userWallet) {
            userWallet = new Wallet({ user: order.userId, balance: 0 });
          }
          userWallet.balance += Number(refundAmount);
          await userWallet.save();
        }
      }
      // If every product in the order is cancelled, update order status as well
      if (order.products.every((p) => p.status === "Cancelled")) {
        order.status = "Cancelled";
      }
    }

    // If every product is delivered, update the order status and set order delivery date
    if (order.products.every((p) => p.status === "Delivered")) {
      order.status = "Delivered";
      order.deliveryDate = new Date();
    }

    await order.save();
    res.json({ message: "Product status updated", order });
  } catch (error) {
    console.error("Error updating order status:", error);
    next(error);
  }
};

// METHOD PATCH || Handle product return requests
export const handleReturnRequest = async (req, res, next) => {
  try {
    const { orderId, productId } = req.params;
    const { action } = req.body;

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });

    const product = order.products.find(
      (p) => p.productId.toString() === productId
    );
    if (!product) return res.status(404).json({ message: "Product not found" });

    if (product.status !== "Return Pending") {
      return res.status(400).json({ message: "Product not in return pending state" });
    }

    if (action === "approve") {
      product.status = "Return Approved";

      // Process refund for ALL payment methods if product was delivered
      const totalAmount = product.productPrice * product.quantity;
      
      await Wallet.findOneAndUpdate(
        { user: order.userId },
        {
          $inc: { balance: totalAmount },
          $push: {
            transactions: {
              transactionDate: new Date(),
              transactionType: "credit",
              transactionStatus: "completed",
              amount: totalAmount,
              description: `Refund for approved return of a product`,
            },
          },
        },
        { new: true, upsert: true }
      );
    } else if (action === "reject") {
      product.status = "Return Rejected";
    } else {
      return res.status(400).json({ message: "Invalid action" });
    }

    await order.save();
    res.json({ success: true, message: `Return ${action}d`, order });
  } catch (error) {
    console.error("Error handling return request:", error);
    next(error);
  }
};

// =========================== USER CONTROLLERS ============================
// METHOD GET || Get user's order history
export const getAllOrders = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const orders = await Order.find({ userId })
      .populate("addressId")
      .sort({ createdAt: -1 });

    const processedOrders = await Promise.all(
      orders.map(async (order) => {
        const groupedProducts = {};

        for (const product of order.products) {
          const productDetails = await Product.findById(product.productId);
          if (productDetails) {
            if (groupedProducts[product.productId]) {
              groupedProducts[product.productId].quantity += product.quantity;
            } else {
              groupedProducts[product.productId] = {
                ...productDetails.toObject(),
                price: product.productPrice, 
                quantity: product.quantity,
                status: product.status,
                deliveryDate: product.deliveryDate || null,
              };
            }
          }
        }

        return {
          ...order.toObject(),
          products: Object.values(groupedProducts),
        };
      })
    );

    res.json(processedOrders);
  } catch (error) {
    console.error("Error fetching orders:", error);
    next(error);
  }
};

// METHOD PATCH || Initiate product return process
export const initiateReturn = async (req, res, next) => {
  try {
    const { orderId, productId } = req.params;

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });

    const productIndex = order.products.findIndex(
      (p) => p.productId.toString() === productId
    );

    if (productIndex === -1) {
      return res.status(404).json({ message: "Product not found in order" });
    }

    if (order.products[productIndex].status !== "Delivered") {
      return res
        .status(400)
        .json({ message: "Product must be delivered to initiate return" });
    }

    order.products[productIndex].status = "Return Pending";
    await order.save();

    res.json({ message: "Return request initiated", order });
  } catch (error) {
    console.error("Error initiating return:", error);
    next(error);
  }
};



export const generateInvoice = async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId)
      .populate('userId', 'firstName lastName email')
      .populate('addressId')
      .populate('products.productId');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const brandColor = '#1a237e';
    const lightBrand = '#e8eaf6';

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice-${order._id}.pdf`);

    // Error handling
    doc.on('error', (err) => {
      console.error('PDF stream error:', err);
      if (!res.headersSent) {
        res.status(500).end();
      }
    });

    doc.pipe(res);

    // ========== HEADER SECTION ==========
    try {
      const logoPath = path.join(process.cwd(), 'public', 'images', 'Logo.png');
      doc.image(logoPath, 50, 45, { width: 100 });
    } catch (err) {
      console.log('Logo not found, proceeding without it');
    }

    doc.fillColor(brandColor)
      .fontSize(20)
      .font('Helvetica-Bold')
      .text('XPWIDE Pvt. Ltd.', 200, 65)
      .fontSize(10)
      .font('Helvetica')
      .text('123 Business Street', 200, 90)
      .text('New Delhi, India - 110001', 200, 105)
      .text('xpwidestore@gmail.com | +91 98765 43210', 200, 120)
      .moveTo(50, 160)
      .lineTo(550, 160)
      .lineWidth(2)
      .strokeColor(brandColor)
      .stroke();

    // ========== INVOICE METADATA ==========
    doc.fontSize(15)
      .font('Helvetica-Bold')
      .fillColor(brandColor)
      .fontSize(10)
      .fillColor('#333')
      .text(`Invoice #: ${order._id}`, 50, 180)
      .text(`Date: ${new Date(order.createdAt).toLocaleDateString()}`, 50, 195)
      .text(`Payment Method: ${order.paymentMethod.toUpperCase()}`, 50, 210)
      .moveDown(2);

    // ========== CUSTOMER DETAILS ==========
    doc.fontSize(12)
      .font('Helvetica-Bold')
      .fillColor(brandColor)
      .text('BILL TO:', 50, 260)
      .font('Helvetica')
      .fillColor('#333')
      .text(order.addressId.name, 50, 280)
      .text(order.userId.email, 50, 295)
      .text(`${order.addressId.address}, ${order.addressId.city}`, 50, 310)
      .text(`${order.addressId.state} - ${order.addressId.pincode}`, 50, 325);

    // ========== PRODUCT TABLE ==========
    const tableTop = 380;
    const colPositions = {
      sno: 50,
      desc: 100,
      qty: 350,
      price: 420,
      total: 500
    };

    // Table Header
    doc.rect(colPositions.sno, tableTop, 500, 25)
      .fillColor(lightBrand)
      .fill()
      .fontSize(12)
      .font('Helvetica-Bold')
      .fillColor(brandColor)
      .text('#', colPositions.sno + 10, tableTop + 5)
      .text('PRODUCTS', colPositions.desc, tableTop + 5)
      .text('QTY', colPositions.qty, tableTop + 5)
      .text('PRICE', colPositions.price, tableTop + 5)
      .text('TOTAL', colPositions.total, tableTop + 5);

    // Table Rows
    let y = tableTop + 30;
    order.products.forEach((item, index) => {
      const rowColor = index % 2 === 0 ? '#f5f5f5' : '#fff';
      const itemTotal = item.quantity * item.productPrice;
      
      doc.rect(colPositions.sno, y, 500, 25)
        .fillColor(rowColor)
        .fill();

      doc.fontSize(10)
        .fillColor('#333')
        .font('Helvetica')
        .text(index + 1, colPositions.sno + 10, y + 5)
        .text(item.productId.name, colPositions.desc, y + 5)
        .text(item.quantity, colPositions.qty, y + 5)
        doc.font('Courier').text(formatCurrency(item.productPrice), colPositions.price, y + 5);
        doc.font('Courier').text(formatCurrency(itemTotal), colPositions.total, y + 5);
        
      y += 25;
    });

    // ========== TOTAL SECTION ==========
    doc.fontSize(12)
      .font('Helvetica-Bold')
      .fillColor(brandColor)
      .text('Grand Total:', colPositions.total - 50, y + 60)
      .font('Helvetica')
      .fillColor('#333')
      doc.font('Courier').text(formatCurrency(order.totalAmount), colPositions.total, y + 60);


    // ========== FOOTER ==========
    doc.moveDown(4)
      .fontSize(10)
      .fillColor('#666')
      .text('Terms & Conditions:', 50, doc.page.height - 100)
      .text('1. Goods once sold will not be taken back.', 50, doc.page.height - 85)
      .text('2. All disputes subject to Delhi jurisdiction.', 50, doc.page.height - 70)
      .text('Thank you for your business!', 400, doc.page.height - 70, { align: 'right' })
      .text('Authorized Signature', 400, doc.page.height - 55, { align: 'right' });

    // Add page numbers
    const addPageNumbers = () => {
      try {
        const pages = doc.bufferedPageRange();
        for (let i = pages.start; i < pages.start + pages.count; i++) {
          doc.switchToPage(i);
          doc.fontSize(8)
            .fillColor('#666')
            .text(`Page ${i - pages.start + 1} of ${pages.count}`, 50, doc.page.height - 30);
        }
      } catch (err) {
        console.error('Error adding page numbers:', err);
      }
    };

    addPageNumbers();

    doc.end();

  } catch (error) {
    console.error('Error generating invoice:', error);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Error generating invoice' });
    }
  }
};

// Currency formatting helper
const formatCurrency = (amount) => {
  return '\u20B9' + amount.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
};



// =========================== COMMON CONTROLLERS ==========================
// METHOD PATCH || Cancel order item
export const cancelOrderItem = async (req, res, next) => {
  try {
    const { orderId, productId } = req.params;

    const order = await Order.findById(orderId).populate("products.productId");
    if (!order) return res.status(404).json({ message: "Order not found" });

    const product = order.products.find(
      (p) => p.productId && p.productId._id.toString() === productId
    );

    if (!product) {
      return res.status(404).json({ message: "Product not found in order" });
    }

    if (product.status === "Cancelled") {
      return res.status(400).json({ message: "Product already cancelled" });
    }

    product.status = "Cancelled";

    if (order.products.every((p) => p.status === "Cancelled")) {
      order.status = "Cancelled";
    }

    if (order.paymentMethod !== "COD") {
      let userWallet = await Wallet.findOne({ user: order.userId });
      if (!userWallet) {
        userWallet = new Wallet({ user: order.userId, balance: 0 });
      }

      const refundAmount = product.productId.discountedPrice * product.quantity;
      userWallet.balance += Number(refundAmount);
      await userWallet.save();
    }
    await order.save();

    await SalesReport.updateOne(
      { orderId },
      { $set: { deliveryStatus: "Cancelled" } }
    );

    res.json({
      message: "Product cancelled and amount added to wallet",
      order,
    });
  } catch (error) {
    console.error("Error cancelling product:", error);
    next(error);
  }
};
// _______________________________________________________________________//

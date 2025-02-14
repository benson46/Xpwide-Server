import mongoose from "mongoose";
import Cart from "../model/cartModel.js";
import Order from "../model/orderModel.js";
import Product from "../model/productModel.js";
import Wallet from "../model/walletModel.js";
import { calculateBestOffer } from "../utils/calculateBestOffer.js";
import SalesReport from "../model/salesModel.js";
// _______________________________________________________________________//

// =============================== USER CONTROLLERS ===============================
// METHOD GET || Fetch cart items for checkout
export const getCartItems = async (req, res, next) => {
  const userId = req.user.id;
  try {
    const cart = await Cart.findOne({ userId }).populate("items.productId");
    if (!cart) {
      return res.status(200).json({
        items: [],
        totalAmount: 0,
        message: "No products in cart to order.",
      });
    }

    const validItems = cart.items.filter(
      (item) => item.productId && item.productId.stock > 0
    );
    const updatedItems = await Promise.all(
      validItems.map(async (item) => {
        const pricing = await calculateBestOffer(item.productId);

        return {
          ...item.toObject(), // Convert to plain object to avoid Mongoose reversion
          effectivePrice: pricing.hasOffer
            ? pricing.discountedPrice
            : item.productId.price,
          hasOffer: pricing.hasOffer,
          discountedPrice: pricing.discountedPrice,
          offer: pricing.offer,
          productId: {
            ...item.productId.toObject(),
            discountedPrice: pricing.hasOffer
              ? pricing.discountedPrice
              : item.productId.price,
          },
        };
      })
    );

    const totalQuantity = updatedItems.reduce(
      (sum, item) => sum + item.quantity,
      0
    );
    const totalAmount = updatedItems.reduce((sum, item) => {
      const price =
        item.effectivePrice !== undefined
          ? item.effectivePrice
          : item.productId.price;
      return sum + price * item.quantity;
    }, 0);

    res.status(200).json({
      items: updatedItems,
      total: totalAmount,
      totalQuantity,
      message:
        updatedItems.length > 0
          ? "Products fetched successfully."
          : "No in-stock items in the cart.",
    });
  } catch (error) {
    next(error);
  }
};

// METHOD POST || Process checkout order
export const checkoutOrderSuccess = async (req, res, next) => {
  try {
    const { products, paymentMethod, addressId } = req.body;
    const userId = req.user.id;
    const userName = req.user.name;
    if (!products?.length) {
      return res.status(400).json({ message: "No products in order." });
    }
    const validPaymentMethods = ["COD", "Razorpay", "Wallet"];
    if (!validPaymentMethods.includes(paymentMethod)) {
      return res.status(400).json({
        message: `Invalid payment method. Must be one of: ${validPaymentMethods.join(
          ", "
        )}`,
      });
    }
    const processedProducts = await Promise.all(
      products.map(async (item) => {
        const product = await Product.findById(item.productId);
        if (!product) {
          throw new Error(`Product with id ${item.productId} not found.`);
        }

        // Validate stock availability early
        if (product.stock < item.quantity) {
          throw new Error(`Insufficient stock for product: ${product.name}`);
        }

        const pricing = await calculateBestOffer(product);
        return {
          productId: item.productId,
          name: product.name,
          quantity: item.quantity,
          originalPrice: product._doc.price,
          price: pricing.hasOffer
            ? pricing.discountedPrice
            : product._doc.price,
          discount: pricing.hasOffer
            ? product._doc.price - pricing.discountedPrice
            : 0,
        };
      })
    );

    const recalculatedTotalAmount = processedProducts.reduce((total, item) => {
      if (!Number.isFinite(item.price) || !Number.isFinite(item.quantity)) {
        throw new Error(`Invalid price or quantity for product: ${item.name}`);
      }
      return total + item.price * item.quantity;
    }, 0);

    if (paymentMethod === "Wallet") {
      const wallet = await Wallet.findOne({ user: userId });
      if (!wallet?.balance || wallet.balance < recalculatedTotalAmount) {
        return res
          .status(400)
          .json({ message: "Insufficient wallet balance." });
      }

      await Wallet.findOneAndUpdate(
        { user: userId },
        {
          $inc: { balance: -recalculatedTotalAmount },
          $push: {
            transactions: {
              orderId: new mongoose.Types.ObjectId(),
              transactionDate: new Date(),
              transactionType: "debit",
              transactionStatus: "completed",
              amount: recalculatedTotalAmount,
              description: "Order payment",
            },
          },
        }
      );
    }

    await Promise.all(
      processedProducts.map((item) =>
        Product.findByIdAndUpdate(item.productId, {
          $inc: { stock: -item.quantity },
        })
      )
    );

    const order = await Order.create({
      addressId,
      paymentMethod,
      products: processedProducts,
      userId,
      totalAmount: recalculatedTotalAmount,
      status: "Pending",
    });

    // Create sales report
    await SalesReport.create({
      orderId: order._id,
      product: processedProducts.map((item) => ({
        productId: item.productId,
        productName: item.name,
        quantity: item.quantity,
        unitPrice: item.originalPrice,
        totalPrice: item.price * item.quantity,
        discount: item.discount,
        couponDeduction: 0,
      })),
      finalAmount: recalculatedTotalAmount,
      orderDate: new Date(),
      customer: userId,
      paymentMethod,
      deliveryStatus: "Pending",
    });

    // Clear cart
    await Cart.findOneAndUpdate({ userId }, { $set: { items: [] } });
    return res.status(201).json({
      message: "Order placed successfully.",
      order,
      totalAmount: recalculatedTotalAmount,
    });
  } catch (error) {
    next(error);
  }
};
// _______________________________________________________________________//
import mongoose from "mongoose";
import Cart from "../model/cartModel.js";
import Order from "../model/orderModel.js";
import Product from "../model/proudctModel.js";
import Wallet from "../model/walletModel.js";
import { calculateBestOffer } from "../utils/calculateBestOffer.js";

//--------------------------------------------------------------------------------------------------------

// METHOD GET || GET CART ITEMS IN CHECKOUT
export const getCartItems = async (req, res, next) => {
  const userId = req.user.id;

  try {
    const cart = await Cart.findOne({ userId }).populate("items.productId");
    if (!cart) {
      return res.status(200).json({
        items: [],
        totalAmount: 0,
        message: "No products in cart to order",
      });
    }

    // Filter items with available stock
    const validItems = cart.items.filter(
      (item) => item.productId && item.productId.stock > 0
    );

    // For each valid item, recalc the pricing using calculateBestOffer.
    const updatedItems = await Promise.all(
      validItems.map(async (item) => {
        const pricing = await calculateBestOffer(item.productId);
        // Set an effectivePrice field:
        item.productId.effectivePrice =
          pricing.hasOffer && pricing.discountedPrice
            ? pricing.discountedPrice
            : item.productId.price;
        // Also update the offer fields if needed.
        item.productId.hasOffer = pricing.hasOffer;
        item.productId.discountedPrice = pricing.discountedPrice;
        item.productId.offer = pricing.offer;
        return item;
      })
    );

    // Calculate total quantity
    const totalQuantity = updatedItems.reduce(
      (sum, item) => sum + item.quantity,
      0
    );

    // Calculate total amount based on effective price
    const totalAmount = updatedItems.reduce(
      (sum, item) => sum + (item.productId.effectivePrice || 0) * item.quantity,
      0
    );

    res.status(200).json({
      items: updatedItems,
      subtotal: totalAmount,
      quantity: totalQuantity,
      message:
        updatedItems.length > 0
          ? "Products fetched successfully"
          : "No in-stock items in the cart",
    });
  } catch (error) {
    next(error);
  }
};

// METHOD POST || CHECK THE ORDER SUCCESS OR NOT

export const checkoutOrderSuccess = async (req, res, next) => {
  try {
    const { products, paymentMethod, addressId } = req.body;
    const userId = req.user.id;
    
    if (!products || products.length === 0) {
      return res.status(400).json({ message: "No products in order" });
    }
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: "Unauthorized user" });
    }
    const processedProducts = await Promise.all(
      products.map(async (item) => {
        const product = await Product.findById(item.productId);
        if (!product) {
          throw new Error(`Product with id ${item.productId} not found`);
        }
        const pricing = await calculateBestOffer(product);
        return {
          ...item,
         
          price: pricing.hasOffer && pricing.discountedPrice && Number(pricing.discountedPrice) > 0
                   ? Number(pricing.discountedPrice)
                   : product.price,
          originalPrice: product.price,
        };
      })
    );
    
    
    // Recalculate the total amount using the effective (discounted) prices.
    const recalculatedTotalAmount = processedProducts.reduce(
      (total, item) => total + item.price * item.quantity, 
      0
  );
  
    
    // Handle wallet payment if paymentMethod is "Wallet"
    if (paymentMethod === "Wallet") {
      const wallet = await Wallet.findOne({ user: userId });
      if (!wallet || wallet.balance < recalculatedTotalAmount) {
        return res.status(400).json({ message: "Insufficient wallet balance" });
      }
      wallet.balance -= recalculatedTotalAmount;
      wallet.transactions.push({
        orderId: new mongoose.Types.ObjectId(),
        transactionDate: new Date(),
        transactionType: "debit",
        transactionStatus: "completed",
        amount: recalculatedTotalAmount,
        description: `Paid for order`,
      });
      await wallet.save();
    }
    
    // Check each product’s stock and update it accordingly.
    for (const item of processedProducts) {
      const product = await Product.findById(item.productId);
      if (product.stock < item.quantity) {
        return res.status(400).json({ 
          message: `Insufficient stock for product: ${product.name}` 
        });
      }
      // Explicitly recalculate and set discountedPrice:
      if (product.hasOffer && product.activeOffer && product.activeOffer.value) {
        product.discountedPrice = product.price * (1 - product.activeOffer.value / 100);
      } else {
        product.discountedPrice = product.price;
      }
      // Update stock and save the product
      product.stock -= item.quantity;
      await product.save();
    }
    
    // Create the order with the processed products and the recalculated total.
    const order = new Order({
      addressId,
      paymentMethod,
      products: processedProducts,
      userId,
      totalAmount: recalculatedTotalAmount,
      status: "Pending",
    });
    
    await order.save();
    
    // Clear the user's cart.
    const cart = await Cart.findOne({ userId });
    if (cart) {
      cart.items = [];
      await cart.save();
    }
    
    res.status(201).json({ 
      message: "Order placed successfully", 
      order,
      totalAmount: recalculatedTotalAmount 
    });
    
  } catch (error) {
    console.error("Checkout error:", error);
    next(error);
  }
};


//--------------------------------------------------------------------------------------------------------

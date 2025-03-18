import mongoose from "mongoose";
import SalesReport from "./salesModel.js"; // Import SalesReport model

const orderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    addressId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Address",
      required: true,
    },
    paymentMethod: {
      type: String,
      enum: ["COD", "Razorpay", "Wallet"],
      required: true,
    },
    products: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        productPrice: {
          type: Number,
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
          min: 1,
        },
        status: {
          type: String,
          enum: [
            "Pending",
            "Shipped",
            "Delivered",
            "Cancelled",
            "Return Pending",
            "Return Approved",
            "Return Rejected",
          ],
          default: "Pending",
        },
        deliveryDate: {
          type: Date,
          default: null,
        },
      },
    ],
    totalAmount: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["Pending", "Shipped", "Delivered", "Cancelled"],
      default: "Pending",
    },
    paymentStatus: {
      type: String,
      enum: ["Success", "Failed"],
      default: "Failed",
    },
    deliveryDate: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);


orderSchema.pre("save", async function (next) {
  try {
    for (let product of this.products) {
      const productData = await mongoose
        .model("Product")
        .findById(product.productId)
        .select("price discountedPrice hasOffer");

      if (productData) {
        // Use discounted price if offer exists, else regular price
        const priceToUse = productData.hasOffer 
          ? productData.discountedPrice 
          : productData.price;
      } else {
        return next(new Error(`Product not found: ${product.productId}`));
      }
    }
    next();
  } catch (error) {
    console.error("Error fetching product price:", error);
    next(error);
  }
});

// Mongoose Pre-Save Hook to Sync Order Status with SalesReport
orderSchema.pre("save", async function (next) {
  if (this.isModified("status")) {
    try {
      await SalesReport.updateOne(
        { orderId: this._id.toString() },
        { $set: { deliveryStatus: this.status } }
      );
    } catch (error) {
      console.error("Error updating SalesReport delivery status:", error);
      return next(error);
    }
  }
  next();
});

const Order = mongoose.model("Order", orderSchema);
export default Order;

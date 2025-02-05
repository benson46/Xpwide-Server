import mongoose from "mongoose";

const couponSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true,
  },
  discount: {
    type: Number,
    required: true,
    min: [1, "Discount must be at least 1%"],
    max: [100, "Discount cannot exceed 100%"],
  },
  discountType: {
    type: String,
    default: "percentage", // Always "percentage"
    enum: ["percentage"],
  },
  minPurchaseAmount: {
    type: Number,
    default: 0,
    min: [0, "Minimum purchase amount cannot be negative"],
  },
  expiryDate: {
    type: Date,
    required: true,
  },
  usageLimit: {
    type: Number,
    default: null,
    min: [1, "Usage limit must be at least 1 if specified"],
  },
  usageCount: {
    type: Number,
    default: 0,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  eligibleCategories: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "categorie",
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Index for automatic expiration of coupons
couponSchema.index({ expiryDate: 1 }, { expireAfterSeconds: 0 });

// Middleware to update `updatedAt` and `isActive` before saving
couponSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  
  // Check expiration
  if (this.expiryDate && this.expiryDate < new Date()) {
    this.isActive = false;
  } else if (this.usageLimit !== null && this.usageCount >= this.usageLimit) {
    this.isActive = false;
  } else {
    this.isActive = true;
  }
  
  next();
});

const Coupon = mongoose.model("coupon", couponSchema);

export default Coupon;
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
    max: [90, "Discount cannot exceed 90%"],
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
  startingDate: {
    type: Date,
    required: function () {
      return this.isNew; // Only required when creating a new coupon
    },
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
  usageLimitPerUser:{
    type:Number,
    default:null,
    min:[1,"Per-user usage limit must be at least 1 "],
    required:true,
  },
  usedBy: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    count: {
      type: Number,
      default: 0,
      min: [0, "Usage count cannot be negative"]
    }
  }],
  isActive: {
    type: Boolean,
    default: true,
  },
  // New field to control visibility on the user side:
  isPublic: {
    type: Boolean,
    default: false,
  },
  eligibleCategories: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
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
couponSchema.index({ 'usedBy.userId': 1 });

// Middleware to update `updatedAt` and `isActive` before saving
couponSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  
  // Check expiration and usage limits
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

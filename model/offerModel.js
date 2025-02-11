import mongoose from "mongoose";

const offerSchema = new mongoose.Schema(
  {
    offerType: {
      type: String,
      enum: ["product", "category"],
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    value: {
      type: Number,
      required: true,
      min: 1,
      max: 80,
    },
    endDate: {
      type: Date,
      required: true,
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

offerSchema.methods.isValidOffer = function () {
  return this.isActive && this.endDate > new Date();
};

offerSchema.pre("save", function (next) {
  if (this.offerType === "product" && !this.product) {
    return next(new Error("Product reference is required for product offers"));
  }
  if (this.offerType === "category" && !this.category) {
    return next(
      new Error("Category reference is required for category offers")
    );
  }
  next();
});

const Offer = mongoose.model("Offer", offerSchema);
export default Offer;

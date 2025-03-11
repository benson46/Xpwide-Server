import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  brand: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "brand",
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Category",
    required: true,
  },
  price:{
    type:Number,
    default:0,
    required:true,
  },
  discountedPrice: {
    type: Number,
    default:0,
    required: true,
  },
  hasOffer: {
    type: Boolean,
    default: false,
  },
  offer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Offer",
    default: null,
  },
  stock: {
    type: Number,
    required: true,
    min: [0, "Price cannot be negative"],
  },
  images: {
    type: [String],
    require: true,
  },
  tags: {
    type: [String],
    default: [],
  },
  releaseDate: {
    type: Date,
  },
  isFeatured: {
    type: Boolean,
    default: false,
  },
  isBlocked: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  reviews: [
    {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
      },
      rating: {
        type: Number,
      },
      comment: {
        type: String,
      },
      created_at: {
        type: Date,
        default: Date.now,
      },
    },
  ],
  activeOffer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Offer",
    default: null,
  },
});

const Product = mongoose.model("Product", productSchema);

export default Product;

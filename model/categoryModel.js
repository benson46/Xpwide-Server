import mongoose from "mongoose";

const categorySchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  icon: {
    type: String,
    required: true,
    trim: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  hasOffer:{
    type:Boolean,
    default:false,
  },
  isBlocked: {
    type: Boolean,
    default: false,
  },
});

const Category = mongoose.model("Category", categorySchema);

export default Category;

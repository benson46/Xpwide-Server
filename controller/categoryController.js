import Category from "../model/categoryModel.js";

// Method GET || Get all categories
export const getAllCategories = async (req, res,next) => {
  try {
    const categories = await Category.find();
    res.status(200).json({ success: true, categories });
  } catch (error) {
    next(error)
  }
};

// Method Post || Add new category
export const addNewCategory = async (req, res,next) => {
  const { title, description } = req.body;
  try {
    if (!title || !description) {
      return res
        .status(400)
        .json({ success: false, message: "All fields are required" });
    }

    const category = new Category({ title, description });
    await category.save();

    res.status(201).json({
      success: true,
      message: "Category added successfully.",
      category,
    });
  } catch (error) {
    next(error)
  }
};

// Method Patch || List & Unlist category
export const updateCategoryStatus = async (req, res,next) => {
  const { categoryId } = req.body;
  try {
    const category = await Category.findById(categoryId);

    if (!category) {
      return res
        .status(404)
        .json({ success: false, message: "Category not found." });
    }

    category.isBlocked = !category.isBlocked;
    await category.save();
    res
      .status(200)
      .json({ success: true, message: "Category status updated.", category });
  } catch (error) {
    next(error)
  }
};

// Method Put || Update category
export const updateCategory = async (req, res,next) => {
  const { categoryId, title, description } = req.body;
  try {
    const category = await Category.findById(categoryId);
    if (!category) {
      return res
        .status(404)
        .json({ success: false, message: "Category not found" });
    }

    category.title = title || category.title;
    category.description = description || category.description;
    await category.save();

    res
      .status(200)
      .json({ success: true, message: "Category updated successfully" });
  } catch (error) {
    next(error)
  }
};

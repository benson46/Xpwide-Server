import Category from "../model/categoryModel.js";
// _______________________________________________________________________//

// =========================== ADMIN CONTROLLERS ===========================
// METHOD POST || Add a new category
export const addCategory = async (req, res, next) => {
  const { title, icon } = req.body;
  try {
    if (!title || !icon) {
      return res.status(400).json({ success: false, message: "All fields are required." });
    }
    const category = new Category({ title, icon });
    await category.save();
    res.status(201).json({ success: true, message: "Category added successfully.", category });
  } catch (error) {
    next(error);
  }
};

// METHOD PUT || Update category details
export const updateCategory = async (req, res, next) => {
  const { categoryId, title, icon } = req.body;
  try {
    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(404).json({ success: false, message: "Category not found." });
    }
    category.title = title || category.title;
    category.icon = icon || category.icon;
    await category.save();
    res.status(200).json({ success: true, message: "Category updated successfully." });
  } catch (error) {
    next(error);
  }
};

// METHOD PATCH || Toggle category status (block/unblock)
export const updateCategoryStatus = async (req, res, next) => {
  const { categoryId } = req.body;
  try {
    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(404).json({ success: false, message: "Category not found." });
    }
    category.isBlocked = !category.isBlocked;
    await category.save();
    res.status(200).json({ success: true, message: `Category ${category.isBlocked ? "blocked" : "unblocked"} successfully.` });
  } catch (error) {
    next(error);
  }
};

// =========================== COMMON CONTROLLERS ===========================
// METHOD GET || Fetch all categories
export const getAllCategories = async (req, res, next) => {
  try {
    const { page = 1, limit = 5 } = req.query;
    const skip = (page - 1) * limit;
    const totalCategories = await Category.countDocuments();

    const categories = await Category.find().skip(skip).limit(parseInt(limit));
    res.status(200).json({ success: true, categories,totalCategories });
  } catch (error) {
    next(error);
  }
};
// _______________________________________________________________________//
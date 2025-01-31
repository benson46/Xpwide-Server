import Category from "../model/categoryModel.js";

//------------------------------------------ ADMIN CONTROLLES --------------------------------------------------------------

// METHOD POST || Add New Category
export const addNewCategory = async (req, res, next) => {
  const { title, icon } = req.body;
  try {
    if (!title || !icon) {
      return res
        .status(400)
        .json({ success: false, message: "All fields are required" });
    }

    const category = new Category({ title, icon });
    await category.save();

    res.status(201).json({
      success: true,
      message: "Category added successfully.",
      category,
    });
  } catch (error) {
    next(error);
  }
};

// METHOD PATCH || Soft delete category
export const updateCategoryStatus = async (req, res, next) => {
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
    next(error);
  }
};

// METHOD PUT || Edit category
export const updateCategory = async (req, res, next) => {
  const { categoryId, title, icon } = req.body;
  try {
    const category = await Category.findById(categoryId);
    if (!category) {
      return res
        .status(404)
        .json({ success: false, message: "Category not found" });
    }

    category.title = title || category.title;
    category.icon = icon || category.icon;
    await category.save();

    res
      .status(200)
      .json({ success: true, message: "Category updated successfully" });
  } catch (error) {
    next(error);
  }
};

//------------------------------------------ COMMON CONTROLLES --------------------------------------------------------------

// METHOD GET || Show all categories
export const getAllCategories = async (req, res, next) => {
  try {
    const categories = await Category.find();
    res.status(200).json({ success: true, categories });
  } catch (error) {
    next(error);
  }
};

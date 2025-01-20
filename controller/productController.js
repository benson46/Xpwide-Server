import Product from "../model/proudctModal.js";
import Category from "../model/categoryModel.js";
import Brand from "../model/brandModel.js";
import { storeRefreshToken } from "../config/redis.js";

// Method GET || Get all products
export const getAllProducts = async (req, res) => {
  try {
    const products = await Product.find()
      .populate({
        path: "category",
        select: "title",
      })
      .populate({
        path: "brand",
        select: "title",
      });

    res.status(200).json({ products });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch products" });
  }
};

// Method POST || Add a new product
export const addNewProduct = async (req, res) => {
  const { name, brand, category, description, price, stock, images } = req.body;
  if (!name || !category || !brand || !price || !stock || !description) {
    return res.status(400).json({
      message: "All fields are required.",
    });
  }

  if (!images || !Array.isArray(images) || images.length !== 3) {
    return res.status(400).json({ message: "Exactly 3 images are required." });
  }

  const brandData = await Brand.findById(brand);
  if (!brandData) {
    return res.status(400).json({ success: false, message: "Brand not found" });
  }

  const categoryData = await Category.findById(category);
  if (!categoryData) {
    return res
      .status(400)
      .json({ success: false, message: "Category not found" });
  }

  const newProduct = new Product({
    name,
    category,
    brand,
    price,
    stock,
    description,
    images,
  });

  const savedProduct = await newProduct.save();

  res.status(201).json({
    success: true,
    message: "Product added successfully",
    product: savedProduct,
  });
};

// Method PATCH || List & Unlist product
export const updateProductStatus = async (req, res) => {
  const { productId } = req.body;

  try {
    const productData = await Product.findById(productId);

    if (!productData) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const updateProductData = await Product.findByIdAndUpdate(
      productId,
      { $set: { isBlocked: !productData.isBlocked } },
      { new: true }
    );

    if (updateProductData.isBlocked) {
      await storeRefreshToken(updateProductData._id, null);
    }

    res.json({
      success: true,
      message: `User status updated to ${
        updateProductData.isBlocked ? "blocked" : "active"
      }`,
      updateProductData,
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

// Method PUT || Edit a product
export const editProduct = async (req, res) => {
  const { id, name, brand, category, description, price, stock, images } =
    req.body;
  try {
    const [product, categories, brands] = await Promise.all([
      Product.findById(id),
      Category.findOne({ title: category }),
      Brand.findOne({ title: brand }),
    ]);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    product.name = name || product.name;
    product.category = categories._id;
    product.brand = brands._id;
    product.price = price || product.price;
    product.stock = stock || product.stock;
    product.description = description || product.description;
    product.images = images || product.images;
    await product.save();

    res
      .status(200)
      .json({ success: true, message: "Product updated successfully" });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getProductDetails = async (req, res) => {
  const { productId } = req.query;

  const product = await Product.findById(productId)
    .populate({
      path: "brand",
      select: "title",
    })
    .populate({
      path: "category",
      select: "title",
    });

  if (!product) {
    res.status(400).json({
      message: "Prooduct Not Found",
      success: false,
    });
  }

  console.log(product);
  res.status(200).json({
    product,
    success: true,
    message: "Product fetched Successfully",
  });
};

export const getRelatedProducts = async (req, res) => {
  try {
    const {categoryId , brandId } = req.query;
    if(!categoryId || !brandId){
      res.status(400).json({message:"Missing categoryId or brandId"})
    }

    const relatedProducts = await Product.find({
      category:categoryId,
      brand:brandId,
      isBlocked:false,
    }).limit(3)

    res.status(200).json({ products: relatedProducts });
  } catch (error) {
    console.log(`error on getRelatedProducts ${error}`);
    res.status(500).json({
      message: "Failed to fetch products",
      error: error.message,
    });
  }
};

import Product from "../model/proudctModel.js";
import Category from "../model/categoryModel.js";
import Brand from "../model/brandModel.js";
import { storeRefreshToken } from "../config/redis.js";

//------------------------------------------ ADMIN CONTROLLES --------------------------------------------------------------

// METHOD GET || Show all products
export const getAllProducts = async (req, res, next) => {
  const { isUser } = req.query;
  try {
    const products = await Product.find()
      .populate({
        path: "category",
        select: "title isBlocked",
      })
      .populate({
        path: "brand",
        select: "title",
      });

    if (isUser) {
      const filteredProducts = products.filter((product) => {
        return !product.category.isBlocked;
      });
      return res.status(200).json({ products: filteredProducts });
    }

    res.status(200).json({ products });
  } catch (error) {
    next(error);
  }
};

// METHOD POST || Add a new product
export const addNewProduct = async (req, res, next) => {
  try {
    const { name, brand, category, description, price, stock, images } =
      req.body;
    if (!name || !category || !brand || !price || !stock || !description) {
      return res.status(400).json({
        message: "All fields are required.",
      });
    }

    if (!images || !Array.isArray(images) || images.length !== 3) {
      return res
        .status(400)
        .json({ message: "Exactly 3 images are required." });
    }

    const brandData = await Brand.findById(brand);
    if (!brandData) {
      return res
        .status(400)
        .json({ success: false, message: "Brand not found" });
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
  } catch (error) {
    next(error);
  }
};

// METHOD PATCH || Soft delete products
export const updateProductStatus = async (req, res, next) => {
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
    next(error);
  }
};

// METHOD PUT || Edit a product
export const editProduct = async (req, res, next) => {
  const { id, name, brand, category, description, price, stock, images } =
    req.body;
    console.log(category,brand)
  try {
    const [product, categories, brands] = await Promise.all([
      Product.findById(id),
      Category.findOne({ _id: category }),
      Brand.findOne({ _id: brand }),
    ]);

    console.log(categories)
    console.log(brands)

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    if (!categories || !brands) {
      return res.status(404).json({
        success: false,
        message: "Category or Brand not found",
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

    res.status(200).json({ success: true, message: "Product updated successfully" });
  } catch (error) {
    next(error);
  }
};


// METHOD PATCH || Change a product status featured or not featured
export const updateFeaturedProducts = async (req, res, next) => {
  const { productId } = req.body;

  try {
    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    product.isFeatured = !product.isFeatured;
    await product.save();

    res.status(200).json({
      success: true,
      message: `Product feature status updated to ${
        product.isFeatured ? "featured" : "not featured"
      }`,
      product: product,
    });
  } catch (error) {
    next(error);
  }
};

//-----------------------------------------  USER CONTROLLES ---------------------------------------------------------------

// METHOD GET || GET A PRODUCT DETIALS
export const getProductDetails = async (req, res, next) => {
  const { productId } = req.query;

  try {
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

    res.status(200).json({
      product,
      success: true,
      message: "Product fetched Successfully",
    });
  } catch (error) {
    next(error);
  }
};

// Method GET || GET CATEGORY BASED PRODUCTS
export const getProducts = async (req, res, next) => {
  try {
    const { category } = req.query;

    const products = await Product.find({}).populate({
      path: "category",
      select: "title isBlocked",
    });

    const filteredProducts =
      category === "all" || !category
        ? products.filter((product) => !product.category.isBlocked)
        : products.filter(
            (product) =>
              product.category &&
              product.category.title === category &&
              !product.category.isBlocked
          );

    if (filteredProducts.length === 0) {
      return res.status(200).json({
        products: [],
        message: "No products available in this category",
      });
    }

    return res.status(200).json({ products: filteredProducts });
  } catch (error) {
    next(error);
  }
};

// METHOD GET || GET FEATURED PRODUCTS
export const getFeaturedProducts = async (req, res, next) => {
  try {
    const products = await Product.find()
      .populate({
        path: "category",
        select: "title isBlocked",
      })
      .populate({
        path: "brand",
        select: "title",
      });

    const filteredProducts = products.filter((product) => {
      return !product.category.isBlocked && product.isFeatured;
    });
    return res.status(200).json({ products: filteredProducts });
  } catch (error) {
    next(error);
  }
};

// METHOD GET || GET RELATED PRODUCTS
export const getRelatedProducts = async (req, res, next) => {
  try {
    const { categoryId, brandId, productId } = req.query;

    if (!categoryId || !brandId) {
      return res.status(400).json({ message: "Missing categoryId or brandId" });
    }

    const relatedProducts = await Product.find({
      category: categoryId,
      brand: brandId,
      isBlocked: false,
      _id: { $ne: productId },
    }).limit(3);

    res.status(200).json({ products: relatedProducts });
  } catch (error) {
    next(error);
  }
};

// --------------------------------------------------------------------------------------------------------

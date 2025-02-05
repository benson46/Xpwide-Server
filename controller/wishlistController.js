import Wishlist from "../model/wishlistModel.js";

export const getWishlist = async (req, res) => {
    const userId = req.user.id;
    const wishlistItems = await Wishlist.findOne({ user: userId }).populate({
        path: 'products.product',
        match: { isBlocked: false }
    });

    if (!wishlistItems) {
        return res.status(404).json({ success: false });
    }
    res.json({ success: true, wishlists: wishlistItems.products });
};

export const addWishlist = async (req, res) => {
    const userId = req.user.id;
    const { productId } = req.body;

    let wishlist = await Wishlist.findOne({ user: userId });

    if (!wishlist) {
        wishlist = new Wishlist({
            user: userId,
            products: [{ product: productId }],
        });
    } else {
        const productIndex = wishlist.products.findIndex(
            (item) => item.product.toString() === productId
        );

        if (productIndex !== -1) {
            // Product already in wishlist, remove it
            wishlist.products.splice(productIndex, 1);
            await wishlist.save();
            return res.status(200).json({ success: true, message: "Removed from wishlist", wishlist });
        } else {
            // Product not in wishlist, add it
            wishlist.products.push({ product: productId });
        }
    }

    await wishlist.save();
    res.status(201).json({ success: true, message: "Added to wishlist", wishlist });
};
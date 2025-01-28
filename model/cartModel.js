import mongoose from "mongoose";

const cartSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  items: [
    {
      productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: true,
      },
      quantity: {
        type: Number,
        required: true,
        min: 1,
      },
    },
  ],
  totalAmount: {
    type: Number,
    required: true,
    default: 0, 
  },
});


cartSchema.pre("save", async function (next) {
    let total = 0;
  
    for (const item of this.items) {
      const product = await mongoose.model("Product").findById(item.productId);
      if (product) {
        total += product.price * item.quantity;
      }
    }
  
    this.totalAmount = total;
    next();
  });

  
  cartSchema.pre("updateOne", async function (next) {
    const cart = this;
    if (cart.items) {
      let total = 0;
      for (const item of cart.items) {
        const product = await mongoose.model("Product").findById(item.productId);
        if (product) {
          total += product.price * item.quantity;
        }
      }
      cart.set({ totalAmount: total });
    }
    next();
  });

  
  

const Cart = mongoose.model("Cart", cartSchema);

export default Cart;

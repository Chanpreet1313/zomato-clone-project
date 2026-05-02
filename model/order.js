import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema({
  foodId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "MenuItem"
  },
  name: { type: String, required: true },
  image: String,
  foodType: { type: String, enum: ["veg", "nonveg"] },
  portion: String,

  quantity: { type: Number, required: true },

  unitPrice: { type: Number, required: true },
  totalPrice: { type: Number, required: true }
}, { _id: false });


const orderSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  restaurantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Restaurant",
    required: true
  },

  items: [orderItemSchema],
  subtotal: { type: Number, required: true },
  taxRate: Number,
  taxAmount: Number,
  deliveryCharge: Number,
  discount: { type: Number, default: 0 },
  grandTotal: { type: Number, required: true },

  deliveryAgentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null
  },

  deliveryAgentSnapshot: {
    name: String,
    phone: String,
    rating: Number
  },
  
  address: {
    fullName: String,
    phone: String,
    street: String,
    city: String,
    state: String,
    pincode: String
  },
  note: String,
  paymentMethod: {
    type: String,
    enum: ["COD", "ONLINE"],
    default: "COD"
  },
  paymentStatus: {
    type: String,
    enum: ["pending", "paid", "failed"],
    default: "pending"
  },
  orderStatus: {
    type: String,
    enum: [
      "placed",
      "confirmed",
      "preparing",
      "ready",
      "accepted",
      "picked",
      "delivered",
      "cancelled"
    ],
    default: "placed"
  },
  ownerStatus: {
    type: String,
    enum: ["pending", "confirmed", "rejected"],
    default: "pending"
  }

}, { timestamps: true });

export default mongoose.model("Order", orderSchema);
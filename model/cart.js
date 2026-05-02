import mongoose from "mongoose";

const cartItemSchema = new mongoose.Schema({
  foodId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MenuItem',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  image: {
    type: String
  },
  foodType: {
    type: String,
    enum: ['veg', 'nonveg'],
  },
  category: {
    type: String
  },
  portion: {
    type: String,
    enum: ['half', 'full', 'regular'],
    default: 'regular'
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  unitPrice: {
    type: Number,
    required: true
  },
  totalPrice: {
    type: Number,
    required: true   
  }
});
const cartSchema = new mongoose.Schema({
  customerId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
  items:        [cartItemSchema],
  totalAmount:  { type: Number, default: 0 }
}, { timestamps: true });

export default mongoose.model("Cart", cartSchema);
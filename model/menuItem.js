import mongoose from "mongoose";

const menuSchema = new mongoose.Schema({
    restaurantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Restaurant",
        required: true
    },
    itemName: { type: String, required: true, trim: true },
    foodType: {                          
        type: String,
        enum: ["veg", "nonveg"],
        required: true,
        default: "veg"
    },
    hasHalfFullOption: { type: Boolean, default: false },
    halfPrice: { type: Number, required: function() { return this.hasHalfFullOption; } },
    fullPrice:  { type: Number, required: function() { return this.hasHalfFullOption; } },
    price:      { type: Number, required: function() { return !this.hasHalfFullOption; }, min: 0 },
    image:      { type: String, default: null },
    available:  { type: Boolean, default: true },
    category: {
        type: String,
        required: true,
        enum: ["Starters", "Main Course", "Desserts", "Beverages", "Breads", "Rice & Biryani","Fast-Food"]
    }
}, { timestamps: true });

export default mongoose.model("menuItem", menuSchema);
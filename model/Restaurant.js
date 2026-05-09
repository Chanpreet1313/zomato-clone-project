import mongoose from "mongoose";

const restaurantSchema = new mongoose.Schema({
    ownerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    restaurantName: {
        type: String,
        unique: true,
        required: true
    },
    foodType: {
        type: String,
        required: true
    },
    logoImage: {
        type: String,
        default: 'default-logo.png'
    },
    location:{
        type: String,
        required: true,
        trim: true
    },
    isOpen: {
        type: Boolean,
        default: true
    }
},{timestamps: true});

export default mongoose.model("Restaurant",restaurantSchema);
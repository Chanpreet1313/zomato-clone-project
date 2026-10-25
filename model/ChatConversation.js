
import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
    {
        role: {
            type: String,
            enum: ["user", "assistant"],
            required: [true, "Message role is required"]
        },

        content: {
            type: String,
            required: [true, "Message content is required"],
            trim: true,
            maxlength: [5000, "Message cannot exceed 5000 characters"]
        }
    },
    {
        timestamps: true
    }
);

const chatConversationSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: [true, "User ID is required"],
            index: true
        },

        title: {
            type: String,
            trim: true,
            maxlength: [100, "Title cannot exceed 100 characters"],
            default: "New Foodie AI Chat"
        },

        messages: {
            type: [messageSchema],
            default: []
        }
    },
    {
        timestamps: true,
        versionKey: false
    }
);

// Retrieve a customer's conversations, newest first.
chatConversationSchema.index({
    userId: 1,
    updatedAt: -1
});

// Reuse the model if it has already been registered.
const ChatConversation =
    mongoose.models.ChatConversation ||
    mongoose.model("ChatConversation", chatConversationSchema);

export default ChatConversation;

import User from "../models/user.model.js";
import Message from "../models/message.model.js";
import cloudinary from "../lib/cloudinary.js";
import { io, getReceiverSocketId } from "../lib/socket.js";

export async function getUsersForSidebar(req,res) {
    try {
        const currentUserId = req.user._id;
        const users = await User.find({_id: {$ne: currentUserId}}).select("-password");
        res.status(200).json(users);
    } catch (error) {
        console.error("Error in getUsersForSidebar: ", error.message);
        res.status(500).json({error: "Internal Server Error"});
    }
}

export async function getMessages(req,res) {
    try {
        const {id:receiverId} = req.params;
        const senderId = req.user._id;
        const messages = await Message.find({
            $or: [
                {senderId: senderId, receiverId:receiverId},
                {senderId: receiverId, receiverId:senderId},
            ]
        });
        res.status(200).json(messages);
    } catch (error) {
        console.error("Error in getMessages: ", error.message);
        res.status(500).json({error: "Internal Server Error"});
    }
}

export async function sendMessage(req,res) {
    try {
        const {text,image} = req.body;
        const {id:receiverId} = req.params;
        const senderId = req.user._id;
        
        let imageURL;
        if (image) {
            const uploadResponse = await cloudinary.uploader.upload(image);
            imageURL = uploadResponse.secure_url;
        };

        const newMessage = new Message({
            senderId,
            receiverId,
            text,
            image:imageURL,
        });

        await newMessage.save();

        // socket. - realtime functionality
        // Check if receiver of message is online, if they are we send them the message straight away!
        const receiverSocketId = getReceiverSocketId(receiverId);
        if (receiverSocketId) {
            io.to(receiverSocketId).emit("newMessage", newMessage);
        }

        res.status(201).json(newMessage);

    } catch (error) {
        console.error("Error in sendMessage: ", error.message);
        res.status(500).json({error: "Internal Server Error"});
    }
}
import User from "../models/user.model.js";
import brcrypt from "bcryptjs";
import { generateToken } from "../lib/utils.js";
import bcrypt from "bcryptjs";
import cloudinary from "../lib/cloudinary.js";

export const signup = async (req,res) => {
    const {fullName,email,password} = req.body;
    try {
        if (!fullName || !email || !password) {
            return res.status(400).json({message: "All fields are required."});
        }

        // hash password
        if (password.length < 6) {
            return res.status(400).json({message: "Password must be at least 6 characters."});
        }
        const user = await User.findOne({email});
        if (user) {
            return res.status(400).json({message: "Email already exists"});
        }
        const salt = await brcrypt.genSalt(10);
        const hashedPassword = await brcrypt.hash(password,salt);

        const newUser = new User({
            fullName:fullName,
            email:email,
            password:hashedPassword
        });

        if (newUser) {
            // generate JWT token here.
            generateToken(newUser._id, res);
            await newUser.save();
            res.status(201).json({
                _id: newUser._id,
                fullName: newUser.fullName,
                email: newUser.email,
                profilePic: newUser.profilePic,
            });
        } else {
            return res.status(400).json({message: "Invalid user data"});
        }

    } catch (error) {
        console.log("Error in sign up controller: ", error.message);
        return res.status(500).json({message: "Internal Server Error"});
    };
}

export const login = async (req,res) => {
    const {email, password} = req.body;
    try {
        const user = await User.findOne({email});

        if (!user) {
            res.status(404).json({message: "Email or password is incorrect"});
        }

        const isPasswordCorrect = await bcrypt.compare(password, user.password);
        if (!isPasswordCorrect) {
            res.status(404).json({message: "Email or password is incorrect"});
        }

        generateToken(user._id, res);

        res.status(200).json({
            _id:user._id,
            fullName: user.fullName,
            email: user.email,
            profilePic: user.profilePic
        });

    } catch (error) {
        console.log("Error in login controller", error.message);
        res.status(500).json({message: "Internal Server Error"});
    }
}

export const logout = (req,res) => {
    try {
        res.cookie("jwt", "", {maxAge:0});
        res.status(200).json({message: "Logged out successfully!"});
    } catch (error) {
        console.log("Error in logout controller", error.message);
        res.status(500).json({message: "Internal Server Error"});
    }
}

export const updateProfile = async (req,res) => {
    try {
        const {profilePic} = req.body;
        const userID = req.user._id;

        if(!profilePic) {
            res.status(400).json({message: "Profile pic is required"});
        }

        const upload = await cloudinary.uploader.upload(profilePic);
        const updatedUser = await User.findByIdAndUpdate(userID, {profilePic:upload.secure_url}, {new:true});
        res.status(200).json(updatedUser);

    } catch(error) {
        console.log("Error in updateProfile controller", error);
        res.status(500).json({message: "Internal Server Errror"});
    }
}

export const checkAuth = (req,res) => {
    try {
        res.status(200).json(req.user);
    } catch (error) {
        console.log("Error in checkAuth controller", error);
        res.status(500).json({message: "Internal Server Errror"});
    }
}
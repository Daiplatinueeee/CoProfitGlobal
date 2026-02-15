import mongoose from "mongoose"
import bcrypt from "bcryptjs"

const userSchema = new mongoose.Schema(
    {

        email: {
            type: String,
            unique: true,
            trim: true,
            lowercase: true,
            sparse: true,
        },

        password: {
            type: String,
            minlength: [6, "Password must be at least 6 characters long"],
        },

        accountType: {
            type: String,
            enum: ["admin", "user"],
        },

        status: {
            type: String,
            enum: ["pending", "active", "inactive", "declined"],
            default: "pending",
        },

        profilePicture: {
            type: String,
        },

        otp: {
            type: String,
            default: null,
        },

        otpExpires: {
            type: Date,
            default: null,
        },

        username: {
            type: String,
            trim: true,
        },

        isVerified: {
            type: Boolean,
            default: false,
        },
    },
    
    { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } },
)

// Hash password before saving the user
userSchema.pre("save", async function (next) {
    if (this.isModified("password") && this.password) {
        const salt = await bcrypt.genSalt(10)
        this.password = await bcrypt.hash(this.password, salt)
    }
    next()
})

const User = mongoose.model("User", userSchema)

export { User }
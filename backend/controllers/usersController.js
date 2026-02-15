import { User } from "../models/users.js"
import bcrypt from "bcryptjs"
import nodemailer from "nodemailer"
import jwt from "jsonwebtoken"

const validatePassword = (password) => {
  if (!password || password.length < 6) {
    return "Password must be at least 6 characters long."
  }
  return null
}

// Nodemailer transporter setup
const transporter = nodemailer.createTransport({
  service: "gmail", // You can use other services or SMTP
  auth: {
    user: process.env.USER_EMAIL, // Your email address
    pass: process.env.APP_PASSWORD, // Your generated App Password
  },
})

// Function to generate a 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

// Send OTP via email (for both login and registration)
export const sendOtpEmail = async (req, res) => {
  const { email, isRegistration } = req.body

  if (!email) {
    return res.status(400).json({ message: "Email is required." })
  }

  try {
    // For registration, just send OTP. For login, check if user exists.
    if (!isRegistration) {
      const user = await User.findOne({ email })
      if (!user) {
        return res.status(404).json({ message: "Email not registered. Please create an account first." })
      }
    }

    const otp = generateOTP()
    const otpExpires = new Date(Date.now() + 5 * 60 * 1000) // OTP valid for 5 minutes

    // Only save OTP to database if user exists (for login flow)
    if (!isRegistration) {
      const user = await User.findOne({ email })
      user.otp = otp
      user.otpExpires = otpExpires
      await user.save()
    }

    const mailOptions = {
      from: process.env.USER_EMAIL,
      to: email,
      subject: "Your HandyGo Magic Link / OTP",
      html: `
    <h2>Your One-Time Password (OTP)</h2>
    <p>Please use the following code to complete your verification:</p>
    <h1 style="font-size: 24px; font-weight: bold; color: #007bff;">${otp}</h1>
    <p>This code is valid for 5 minutes.</p>
    <p>If you did not request this, please ignore this email.</p>
  `,
    }

    await transporter.sendMail(mailOptions)
    res.status(200).json({ message: "OTP sent to your email." })
  } catch (error) {
    console.error("Error sending OTP email:", error)
    res.status(500).json({ message: "Failed to send OTP. Please try again." })
  }
}

// Verify OTP (for both login and registration)
export const verifyOtp = async (req, res) => {
  const { email, otp, isRegistration, password, username, accountType } = req.body

  if (!email || !otp) {
    return res.status(400).json({ message: "Email and OTP are required." })
  }

  try {
    let user = await User.findOne({ email })

    // For registration, create new user if doesn't exist
    if (isRegistration) {
      if (!password || !username) {
        return res.status(400).json({ message: "Password and username are required for registration." })
      }

      // Create new user during registration OTP verification
      user = new User({
        email,
        password,
        username,
        accountType: accountType || "user",
        status: "active",
      })

      // For registration, we trust the OTP sent to email
      await user.save()
    } else {
      // For login, user must already exist
      if (!user) {
        return res.status(404).json({ message: "User not found." })
      }

      // Check OTP validity
      if (user.otp !== otp || user.otpExpires < new Date()) {
        return res.status(400).json({ message: "Invalid or expired OTP." })
      }

      // OTP is valid, clear it
      user.otp = null
      user.otpExpires = null
      user.status = "active"
      await user.save()
    }

    // Generate JWT for verified user
    const jwtSecret = process.env.JWT_KEY
    if (!jwtSecret) {
      console.error("JWT_KEY is not defined in environment variables.")
      return res.status(500).json({ message: "Server configuration error: JWT secret missing." })
    }
    const token = jwt.sign({ userId: user._id, email: user.email, accountType: user.accountType }, jwtSecret, {
      expiresIn: "1h",
    })

    // Return user data (excluding password, otp, otpExpires)
    const userData = user.toObject()
    const { password: _, otp: __, otpExpires: ___, ...cleanUserData } = userData
    res.status(200).json({ 
      message: isRegistration ? "Account created successfully! OTP verified." : "OTP verified successfully! Login successful.", 
      user: cleanUserData, 
      token: token 
    })
  } catch (error) {
    console.error("Error verifying OTP:", error)
    res.status(500).json({ message: "Server error during OTP verification." })
  }
}

export const sendEmailVerificationCode = async (req, res, emailVerificationCodes) => {
  const { email } = req.body

  if (!email) {
    return res.status(400).json({ message: "Email is required." })
  }

  try {
    const code = generateOTP() // Reuse OTP generation logic
    const expiresAt = Date.now() + 10 * 60 * 1000 // Code valid for 10 minutes

    emailVerificationCodes.set(email, { code, expiresAt }) // Store code in the map

    const mailOptions = {
      from: process.env.USER_EMAIL,
      to: email,
      subject: "Your Email Verification Code",
      html: `
        <h2>Verify Your Email Address</h2>
        <p>Please use the following code to verify your email address:</p>
        <h1 style="font-size: 24px; font-weight: bold; color: #007bff;">${code}</h1>
        <p>This code is valid for 10 minutes.</p>
        <p>If you did not request this, please ignore this email.</p>
      `,
    }

    await transporter.sendMail(mailOptions)
    res.status(200).json({ message: "Verification code sent to your email." })
  } catch (error) {
    console.error("Error sending email verification code:", error)
    res.status(500).json({ message: "Failed to send verification code. Please try again." })
  }
}

export const verifyEmailVerificationCode = async (req, res, emailVerificationCodes) => {
  const { email, code } = req.body
  const userId = req.userId // Get current user ID from authenticated token

  if (!email || !code || !userId) {
    return res.status(400).json({ message: "Email, code, and user ID are required." })
  }

  try {
    const stored = emailVerificationCodes.get(email)

    if (!stored || stored.code !== code || stored.expiresAt < Date.now()) {
      return res.status(400).json({ message: "Invalid or expired verification code." })
    }

    // Code is valid, remove it from temporary storage
    emailVerificationCodes.delete(email)

    // Update the user's email in the database
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { email: email },
      { new: true, runValidators: true },
    ).select("-password")

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found for email update." })
    }

    res.status(200).json({ message: "Email verified and updated successfully!", user: updatedUser })
  } catch (error) {
    console.error("Error verifying email verification code:", error)
    res.status(500).json({ message: "Server error during email verification." })
  }
}

export const registerAccount = async (req, res) => {
  try {
    const { email, password, username, accountType } = req.body

    if (!email || !password || !username) {
      return res.status(400).json({ message: "Email, password, and username are required." })
    }

    const passwordError = validatePassword(password)
    if (passwordError) {
      return res.status(400).json({ message: passwordError })
    }

    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return res.status(409).json({ message: "Email already registered." })
    }

    // Store registration data temporarily in session (in production, use Redis or session storage)
    // For now, we'll return a message and expect the OTP to be verified before account creation
    res.status(200).json({ 
      message: "Validation successful. Please verify OTP to complete registration.",
      email: email,
      username: username,
      accountType: accountType || "user"
    })
  } catch (error) {
    console.error("Registration error:", error)
    res.status(500).json({ message: "Server error during registration." })
  }
}

export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required." })
    }

    const user = await User.findOne({ email })

    if (!user) {
      return res.status(404).json({ message: "User not found." })
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) {
      return res.status(401).json({ message: "Incorrect password." })
    }

    // Password is correct, return user data (will trigger OTP on frontend)
    const { password: _, otp: __, otpExpires: ___, ...userData } = user.toObject()
    res.status(200).json({ 
      message: "Password verified. Please verify OTP.", 
      user: userData 
    })
  } catch (error) {
    console.error("Login error:", error)
    res.status(500).json({ message: "Server error during login." })
  }
}

export const logoutUser = async (req, res) => {
  try {
    const userId = req.userId // must come from JWT middleware
    if (!userId) {
      return res.status(401).json({ message: "User not authenticated." })
    }

    res.status(200).json({ message: "Logout successful." })
  } catch (error) {
    console.error("Logout error:", error)

    res.status(500).json({ message: "Server error during logout." })
  }
}

export const checkEmailAvailability = async (req, res) => {
  const { email } = req.body
  const userId = req.userId // Get current user ID from authenticated token

  if (!email) {
    return res.status(400).json({ message: "Email is required." })
  }

  try {
    // Find a user with the given email, but exclude the current user
    const existingUser = await User.findOne({ email, _id: { $ne: userId } })

    if (existingUser) {
      return res.status(200).json({ available: false, message: "This email is already in use by another account." })
    } else {
      return res.status(200).json({ available: true, message: "Email is available." })
    }
  } catch (error) {
    console.error("Error checking email availability:", error)
    res.status(500).json({ message: "Server error checking email availability." })
  }
}

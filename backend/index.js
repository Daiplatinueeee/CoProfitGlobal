import express from "express"
import mongoose from "mongoose"
import dotenv from "dotenv"
import jwt from "jsonwebtoken"
import {
    loginUser,
    logoutUser,
    registerAccount,
    sendOtpEmail,
    verifyOtp,
    sendEmailVerificationCode,
    verifyEmailVerificationCode,
    checkEmailAvailability
} from "./controllers/usersController.js"

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3000

const requestLogger = (req, res, next) => {
    const start = Date.now()
    const originalSend = res.send

    res.send = function (data) {
        const duration = Date.now() - start
        console.log(
            `[${new Date().toISOString()}] ${req.method} ${req.url} - ${res.statusCode} - ${duration}ms - IP: ${req.ip}`,
        )
        originalSend.call(this, data)
    }

    next()
}

const rateLimitMap = new Map()

const cleanupRateLimitMap = () => {
    const now = Date.now()
    let cleanedCount = 0

    rateLimitMap.forEach((data, clientId) => {
        if (now > data.resetTime) {
            rateLimitMap.delete(clientId)
            cleanedCount++
        }
    })

    if (cleanedCount > 0) {
        console.log(`[${new Date().toISOString()}] Cleaned up ${cleanedCount} expired rate limit entries`)
    }
}

setInterval(cleanupRateLimitMap, 1 * 60 * 1000)

const rateLimit = (maxRequests = 1000, windowMs = 15 * 60 * 1000) => {
    return (req, res, next) => {
        const token = req.headers["authorization"]?.split(" ")[1]
        let clientId = req.ip || req.connection.remoteAddress

        if (token) {
            try {
                const decoded = jwt.verify(token, process.env.JWT_KEY)
                clientId = `user_${decoded.userId}`
            } catch (err) {
                clientId = req.ip || req.connection.remoteAddress
            }
        }

        const now = Date.now()

        if (!rateLimitMap.has(clientId)) {
            rateLimitMap.set(clientId, { count: 1, resetTime: now + windowMs })
            return next()
        }

        const clientData = rateLimitMap.get(clientId)

        if (now > clientData.resetTime) {
            rateLimitMap.set(clientId, { count: 1, resetTime: now + windowMs })
            return next()
        }

        if (clientData.count >= maxRequests) {
            const retryAfter = Math.ceil((clientData.resetTime - now) / 1000)
            return res.status(429).json({
                message: "Too many requests. Please try again later.",
                retryAfter: retryAfter,
            })
        }

        clientData.count++
        next()
    }
}

app.use(requestLogger)
app.use(rateLimit(500, 15 * 60 * 1000))

app.use((req, res, next) => {
    const start = process.hrtime.bigint()
    res.on("finish", () => {
        const end = process.hrtime.bigint()
        const duration = Number(end - start) / 1_000_000
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} - ${duration.toFixed(2)}ms`)
    })
    next()
})

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*")
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization")
    if (req.method === "OPTIONS") {
        res.sendStatus(200)
    } else {
        next()
    }
})

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers["authorization"]
    const token = authHeader && authHeader.split(" ")[1]

    if (token == null) {
        console.warn("Authentication: No token provided.")
        return res.status(401).json({ message: "Authentication token required." })
    }

    const jwtSecret = process.env.JWT_KEY
    if (!jwtSecret) {
        console.error("JWT_KEY is not defined in environment variables.")
        return res.status(500).json({ message: "Server configuration error: JWT key missing." })
    }

    jwt.verify(token, jwtSecret, (err, user) => {
        if (err) {
            console.error("JWT verification error:", err)
            if (err.name === "TokenExpiredError") {
                console.error("Token expired at:", err.expiredAt)
                return res.status(401).json({ message: "Token expired. Please log in again." })
            } else if (err.name === "JsonWebTokenError") {
                console.error("Invalid token:", err.message)
                return res.status(403).json({ message: "Invalid token. Please log in again." })
            } else {
                return res.status(403).json({ message: "Authentication failed. Invalid token." })
            }
        }
        req.userId = user.userId
        req.userEmail = user.email
        req.accountType = user.accountType
        next()
    })
}

mongoose.set("bufferCommands", false)
mongoose.connection.on("error", (err) => console.error("Mongoose error:", err))
mongoose.connection.on("disconnected", () => console.warn("MongoDB disconnected"))

mongoose
    .connect(process.env.MONGO_URL)
    .then(() => console.log("MongoDB connected successfully"))
    .catch((err) => console.error("MongoDB connection error:", err))

const emailVerificationCodes = new Map()

// Authentication routes
app.post("/api/users/register", registerAccount)
app.post("/api/users/login", loginUser)
app.post("/api/users/logout", authenticateToken, logoutUser)

// OTP routes
app.post("/api/users/send-otp", (req, res) => {
    console.log("[v0] POST /api/users/send-otp received")
    sendOtpEmail(req, res)
})
app.post("/api/users/verify-otp", (req, res) => {
    console.log("[v0] POST /api/users/verify-otp received")
    verifyOtp(req, res)
})

// Email verification routes
app.post("/api/users/send-email-verification", (req, res) =>
    sendEmailVerificationCode(req, res, emailVerificationCodes),
)
app.post("/api/users/verify-email-code", authenticateToken, (req, res) =>
    verifyEmailVerificationCode(req, res, emailVerificationCodes),
)

// Utility routes
app.post("/api/users/check-email-availability", authenticateToken, checkEmailAvailability)

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
})

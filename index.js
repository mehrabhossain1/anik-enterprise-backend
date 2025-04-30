const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const { MongoClient } = require("mongodb");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const verifyToken = require("./middlewares/verifyToken");

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection URL
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function run() {
  try {
    // Connect to MongoDB
    await client.connect();
    console.log("Connected to MongoDB");

    const db = client.db("anik-enterprise");
    const usersCollection = db.collection("users");
    const stocksCollection = db.collection("stocks");
    const salesCollection = db.collection("sales");

    // User Registration
    app.post("/api/v1/register", async (req, res) => {
      const { name, email, password } = req.body;

      // Check if email already exists
      const existingUser = await usersCollection.findOne({ email });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: "User already exists",
        });
      }

      // Hash the password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Insert user into the database
      await usersCollection.insertOne({
        name,
        email,
        password: hashedPassword,
      });

      res.status(201).json({
        success: true,
        message: "User registered successfully",
      });
    });

    // User Login
    app.post("/api/v1/login", async (req, res) => {
      const { email, password } = req.body;

      // Find user by email
      const user = await usersCollection.findOne({ email });
      if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      // Compare hashed password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      // Generate JWT token
      const token = jwt.sign({ email: user.email }, process.env.JWT_SECRET, {
        expiresIn: process.env.EXPIRES_IN,
      });

      res.json({
        success: true,
        message: "Login successful",
        token,
      });
    });

    // ==============================================================
    // WRITE YOUR CODE HERE
    // ==============================================================

    // STOCKS API
    // Create a new stock item
    app.post("/api/v1/stocks", verifyToken, async (req, res) => {
      try {
        const { name, quantity, price } = req.body;

        if (!name || quantity == null || price == null) {
          return res
            .status(400)
            .json({ success: false, message: "Missing required fields" });
        }

        const newStock = {
          name,
          quantity,
          price,
          date: new Date().toISOString(), // Auto-generated date
        };

        const result = await stocksCollection.insertOne(newStock);

        res.status(201).json({
          success: true,
          message: "Stock item added successfully",
          data: { id: result.insertedId, ...newStock },
        });
      } catch (err) {
        console.error("Error adding stock:", err);
        res
          .status(500)
          .json({ success: false, message: "Internal server error" });
      }
    });

    // Get all stock items
    app.get("/api/v1/stocks", verifyToken, async (req, res) => {
      try {
        const stocks = await stocksCollection.find().toArray();
        res.json({
          success: true,
          data: stocks,
        });
      } catch (err) {
        console.error("Error fetching stocks:", err);
        res
          .status(500)
          .json({ success: false, message: "Internal server error" });
      }
    });
    // STOCKS API

    // SALES API
    // Create a new sale
    app.post("/api/v1/sales", verifyToken, async (req, res) => {
      try {
        const { productName, customerName, quantitySold, salePrice } = req.body;

        if (!productName || quantitySold == null || salePrice == null) {
          return res
            .status(400)
            .json({ success: false, message: "Missing required fields" });
        }

        const newSale = {
          productName,
          customerName,
          quantitySold,
          salePrice,
          date: new Date().toISOString(),
        };

        const result = await salesCollection.insertOne(newSale);

        res.status(201).json({
          success: true,
          message: "Sale recorded successfully",
          data: { id: result.insertedId, ...newSale },
        });
      } catch (err) {
        console.error("Error recording sale:", err);
        res
          .status(500)
          .json({ success: false, message: "Internal server error" });
      }
    });

    // Get all sales
    app.get("/api/v1/sales", verifyToken, async (req, res) => {
      try {
        const sales = await salesCollection.find().toArray();
        res.json({
          success: true,
          data: sales,
        });
      } catch (err) {
        console.error("Error fetching sales:", err);
        res
          .status(500)
          .json({ success: false, message: "Internal server error" });
      }
    });
    // SALES API

    // Start the server
    app.listen(port, () => {
      console.log(`Server is running on http://localhost:${port}`);
    });
  } finally {
  }
}

run().catch(console.dir);

// Test route
app.get("/", (req, res) => {
  const serverStatus = {
    message: "Server is running smoothly",
    timestamp: new Date(),
  };
  res.json(serverStatus);
});

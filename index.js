const express = require("express");
const app = express();
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const port = process.env.PORT || 5000;

// MIDDLEWARE
app.use(cors());
app.use(express.json());

// VERIFY JWT ================>
const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res
      .status(401)
      .send({ error: true, message: "Unauthorized access" });
  }
  // ACCESS TOKEN ================>
  const token = authorization.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
    if (err) {
      return res
        .status(401)
        .send({ error: true, message: "Unauthorized access" });
    }
    req.decoded = decoded;
    next();
  });
};

// BASIC API
app.get("/", (req, res) => {
  res.send("e-shop server");
});

// MONGODB CODE HERE

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.7rh25i5.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    // ALL COLLECTION HERE =========>
    const productCollection = client.db("eShopServer").collection("products");
    const usersCollection = client.db("eShopServer").collection("users");

    // =========> JWT API
    app.post("/jwt", (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN, {
        expiresIn: "1h",
      });
      res.send({ token });
    });

    // ==============> VERIFY ADMIN
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      if (user.role !== "admin") {
        return res
          .status(403)
          .send({ error: true, message: "forbidden access" });
      }
      next();
    };

    // ALL PRODUCTS API ==========>
    app.get("/products", async (req, res) => {
      const result = await productCollection.find().toArray();
      res.send(result);
    });

    app.get("/singleProduct/:id", async (req, res) => {
      const id = req.params.id;
      // console.log(id);
      const query = { _id: new ObjectId(id) };
      const result = await productCollection.findOne(query);
      res.send(result);
    });

    // =========== USER RELATED ALL API HERE ===============
    app.post("/newUser", async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const existUser = await usersCollection.findOne(query);
      if (existUser) {
        return res.send({ message: "User already have !!!" });
      }
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    app.patch("/verifyNumber", async (req, res) => {
      const phoneNumber = req.body;
      const filter = { number: phoneNumber.number };
      const matchNumber = await usersCollection.findOne(filter);
      if (!matchNumber) {
        return res.send({ error: true, message: "Number not found" });
      } else {
        res.send(matchNumber);
      }
    });

    // =========== ADMIN API HERE ===============
    // CHECK ADMIN
    app.get("/admin/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      if (req.decoded.email !== email) {
        return res.send({ admin: false });
      }
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      const result = { admin: user?.role === "admin" };
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log("server is running or port", port);
});

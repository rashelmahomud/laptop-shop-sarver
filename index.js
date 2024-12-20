const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const { verify } = require("jsonwebtoken");
const { urlencoded } = require("express");
require("dotenv").config();

const stripe = require("stripe")(process.env.STRIPE_SICRET_KEY);
const port = process.env.PORT || 5000;
const app = express();

//middleware

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.paezf.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

//veryfy JWT starte here
function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ message: "Unauthorized access" });
  }
  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: "accessToken forbiden" });
    }

    req.decoded = decoded;
    next();
  });
}
//veryfy JWT ends here

async function run() {
  try {
    await client.connect();
    const serviceCollection = client.db("laptop-server").collection("service");
    const reviewCollection = client.db("laptop-server").collection("review");
    const orderCollection = client.db("laptop-server").collection("orders");
    const userCollection = client.db("laptop-server").collection("users");
    const profilCollection = client.db("laptop-server").collection("profiles");
    const blogsCollection = client.db("laptop-server").collection("blogs");
    const blogsReviewCollection = client.db("laptop-server").collection("blogreview");

    //   //=======VeryFy for Admin Started===========>=============

    //   const veryfyAdmin = async (req, res, next) => {
    //     const requester = req.decoded.email;
    //     const requesterAccount = await userCollection.findOne({ email: requester });
    //     if (requesterAccount.role === 'admin') {
    //         next();
    //     } else {
    //         res.status(403).send({ message: 'forbidden' });
    //     }
    // }
    // //=======VeryFy for Admin Ends===========^=============

    // all service data load kora display te
    app.get("/service", async (req, res) => {
      const query = {};
      const cursor = serviceCollection.find(query);
      const services = await cursor.toArray();
      res.send(services);
    });

    //single data id set korar jonno

    // add service product only admin use this system======>

    app.post("/service", async (req, res) => {
      const service = req.body;
      const result = await serviceCollection.insertOne(service);
      res.send(result);
    });
    // add service product only admin use this system======^

    app.get("/service/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const service = await serviceCollection.findOne(query);
      res.send(service);
    });

    // update user product  quentity add and setup
    app.put("/service/:id", async (req, res) => {
      const id = req.params.id;
      const updateUser = req.body.Quantity;
      console.log(req.body.Quantity);
      const filter = { _id: ObjectId(id) };
      const options = { upsert: true };
      const updatedDoc = {
        $set: { Quantity: updateUser },
      };
      const result = await serviceCollection.updateOne(
        filter,
        updatedDoc,
        options
      );
      res.send(result);
    });

    // product order add for code started here====>
    app.post("/order", async (req, res) => {
      const order = req.body;
      const result = await orderCollection.insertOne(order);
      res.send(result);
    });
    // product order for code Ends==== here====^

    //=======================================>

    app.post("/create-payment-intent", verifyJWT, async (req, res) => {
      const service = req.body;
      const cost = service.cost;
      const amount = cost * 100;
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });
      res.send({ clientSecret: paymentIntent.client_secret });
    });

    //=======================================^

// load all order

    app.get("/orders", async (req, res) => {
      const query = {};
      const cursor = orderCollection.find(query);
      const order = await cursor.toArray();
      res.send(order);
    });


    // order payment sent in database============>
    app.get("/order/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const orders = await orderCollection.findOne(query);
      res.send(orders);
    });
    // order payment sent in database============^

    // delete a product in display orders=====>
    app.delete("/order/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await orderCollection.deleteOne(query);
      res.send(result);
    });
    // delete a product in display orders=====^

    //===========Single person for order loaded display code started here=====>
    app.get("/order", verifyJWT, async (req, res) => {
      const userEmail = req.query.userEmail;
      const decodedEmail = req.decoded.email;
      if (userEmail === decodedEmail) {
        const query = { userEmail: userEmail };
        const order = await orderCollection.find(query).toArray();
        return res.send(order);
      } else {
        return res.status(403).send({ message: "forbidden access" });
      }
    });
    //===========Single person for order loaded display code Ends    here=====^

    //===User Information calection code started here=============>

    app.put("/user/:email", async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      const filter = { email: email };
      const options = { upsert: true };
      const updatedDoc = {
        $set: user,
      };
      const result = await userCollection.updateOne(
        filter,
        updatedDoc,
        options
      );
      const token = jwt.sign(
        { email: email },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: "1h" }
      );
      res.send({ result, token });
    });

    //===User Information calection code Ends    here=============^

    //==========All User loded for display Code Started here=========>

    app.get("/user", verifyJWT, async (req, res) => {
      const users = await userCollection.find().toArray();
      res.send(users);
    });

    //==========All User loded for display Code Ends    here=========^
    // =========================== addded and my first excellent work.

    //====================Single person for admin make code started here===>

    app.put("/user/admin/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      const requester = req.decoded.email;
      const requesterAccount = await userCollection.findOne({
        email: requester,
      });
      if (requesterAccount.role === "admin") {
        const filter = { email: email };
        const updatedDoc = {
          $set: { role: "admin" },
        };
        const result = await userCollection.updateOne(filter, updatedDoc);
        res.send(result);
      } else {
        res.status(403).send({ message: "forbidden" });
      }
    });

    //====================Single person for admin make code Ends    here===>

    //============Admin for code ==================>
    app.get("/admin/:email", async (req, res) => {
      const email = req.params.email;
      const user = await userCollection.findOne({ email: email });
      const isAdmin = user.role === "admin";
      res.send({ admin: isAdmin });
    });
    //============Admin for code ==================^

    //============Load reviews data from backend ======started=====
    app.get("/review", async (req, res) => {
      const reviews = await reviewCollection.find().toArray();
      res.send(reviews);
    });
    //============Load reviews data from backend ======Ends   =====

    // customer reviews add in database code started here====>
    app.post("/review", async (req, res) => {
      const order = req.body;
      const result = await reviewCollection.insertOne(order);
      res.send(result);
    });
    // customer reviews add order for code Ends======here====^

    // all service data load kora display te
    app.get("/blogs", async (req, res) => {
      const query = {};
      const cursor = blogsCollection.find(query);
      const blogs = await cursor.toArray();
      res.send(blogs);
    });

    //single data id set korar jonno

    // Blogs reviews add in database code started here====>
    app.post("/blogreview", async (req, res) => {
      const blog = req.body;
      const blogResult = await blogsReviewCollection.insertOne(blog);
      res.send(blogResult);
    });
    // Blogs reviews show add order for code Ends======here====^

    //============Load reviews data from backend ======started=====
    app.get("/blogreview", async (req, res) => {
      const blogs = await blogsReviewCollection.find().toArray();
      res.send(blogs);
    });
    //============Load reviews show data from backend ======Ends   =====

    // customer profile add in database code started here====>
    app.post("/profile", async (req, res) => {
      const order = req.body;
      const result = await profilCollection.insertOne(order);
      res.send(result);
    });
    // customer profile add in database code Ends  here=======>

    app.get("/profile", async (req, res) => {
      const person = await profilCollection.find().toArray();
      res.send(person);
    });

    // Customer detailes sent from database (display load)===^
  } finally {
  }
}

run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Running this website");
});

app.listen(port, () => {
  console.log("lisining to port", port);
});

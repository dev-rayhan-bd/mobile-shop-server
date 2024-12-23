const express = require("express");
const app = express();
var jwt = require('jsonwebtoken');

const cors = require("cors");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const port = process.env.PORT || 5000;

// middleware
const corsOptions = {
  origin: "*",
  credentials: true,
  optionSuccessStatus: 200,
};
app.use(cors(corsOptions));
app.use(express.json());


// jwt verify middleware

const verifyJWT = (req, res, next) => {
    const authorization = req.headers.authorization;
    console.log(authorization);
    if (!authorization) {
      return res.status(401).send({ error: true, message: 'You are not valid user,unauthorized access ' });
    }
  
    const token = authorization.split(' ')[1];
  // console.log(token);
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
      if (err) {
        return res.status(401).send({ error: true, message: 'You are not valid user,unauthorized access' })
      }
      req.decoded = decoded;
      // console.log(req.decoded);
      next();
    })
  }

  const veryfySeller=async(req,res,next)=>{
    const email = req.decoded.email;
    const query = {email}
    const user = await usersCollection.findOne(query);
    if(user?.role !== 'seller'){
      return res.send({message:"Forbidden access"})
    }
    next()
  }
  const veryfyAdmin=async(req,res,next)=>{
    const email = req.decoded.email;
    // console.log(email);
    const query = {email}
    const user = await usersCollection.findOne(query);
    if(user?.role !== 'admin'){
      return res.send({message:"Forbidden access"})
    }
    next()
  }





app.get("/", (req, res) => {
  res.send("NextGen Phone Server is running");
});

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.njyz70v.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    const usersCollection = client.db("NextGenPhnDb").collection("users");
    const productsCollection = client.db("NextGenPhnDb").collection("products");
    const cartCollection = client.db("NextGenPhnDb").collection("myCart");
    const wishListCollection = client.db("NextGenPhnDb").collection("wishList");

//get token
    app.post('/authentication',(req,res)=>{
        const {email} = req.body;
        console.log(email);
        const token =jwt.sign(email,process.env.ACCESS_SECRET_TOKEN,{expiresIn:"1d"})
        res.send({token});
      
      })
      


    app.post("/users", async (req, res) => {
      const { name, email, photo } = req.body;
      const role = "buyer";
      const query = { email: email };
      const previousUser = await usersCollection.findOne(query);
      if (previousUser) {
        return res.send({ message: "user already exist" });
      }
      const userData = {
        name,
        email,
        photo,
        role,
      };
      const result = await usersCollection.insertOne(userData);
      res.send(result);
    });

    // get users
    app.get("/allUsers", async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });

//make seller

app.patch("/seller/:id", async (req, res) => {
    const id = req.params.id;
    const filter = { _id: new ObjectId(id) };
    const updatedoc = {
      $set: {
        role: "seller",
      },
    };
    const result = await usersCollection.updateOne(filter, updatedoc);
    res.send(result);
  });

//make admin

  // make admin
  app.patch("/admin/:id", async (req, res) => {
    const id = req.params.id;
    const filter = { _id: new ObjectId(id) };
    const updateDoc = {
      $set: {
        role: "admin",
      },
    };
    const result = await usersCollection.updateOne(filter, updateDoc);
    res.send(result);
  });

    // get admin role
    app.get("/admin/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      const result = { admin: user?.role === "admin" };
      res.send(result);
    });
    // get seller role
    app.get("/seller/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      const result = { seller: user?.role === "seller" };
      res.send(result);
    });

//delete user
app.delete("/user/delete/:id",async (req,res)=>{
const id = req.params.id;
const query = { _id: new ObjectId(id) };
const result = await usersCollection.deleteOne(query);
res.send(result);
})
//seller 
//add products
app.post("/seller/addProduct", async (req, res) => {
  const newProduct = req.body;

  const result = await productsCollection.insertOne(newProduct);
  res.send(result);
});
//add products on cart
app.post("/addToCart/:id/:email", async (req, res) => {
  const id = req.params.id;
  const email = req.params.email;
  const query = { _id: new ObjectId(id) };
  const product = await productsCollection.findOne(query);
const newProd = {...product,buyerEmail:email}
const existingProduct = await cartCollection.findOne(query);
if(existingProduct){
  return res.send({ message: "You  already add this product on cart" });
}
  const result = await cartCollection.insertOne(newProd);
  res.send(result);
});

//get products on cart
app.get("/myCart/:email", async (req, res) => {
  const email = req.params.email;
  const query = {buyerEmail: email };
  const result = await cartCollection.find(query).toArray();
  res.send(result);
});
//add products on wishList
app.post("/wishList/:id/:email", async (req, res) => {
  const id = req.params.id;
  const email = req.params.email;
  const query = { _id: new ObjectId(id) };
  const product = await productsCollection.findOne(query);
const newProd = {...product,buyerEmail:email}
const existingProduct = await wishListCollection.findOne(query);
if(existingProduct){
  return res.send({ message: "You  already add this product on cart" });
}
  const result = await wishListCollection.insertOne(newProd);
  res.send(result);
});

//get products on Wishlist
app.get("/wishList/:email", async (req, res) => {
  const email = req.params.email;
  const query = {buyerEmail: email };
  const result = await wishListCollection.find(query).toArray();
  res.send(result);
});


 // get products for each seller
 app.get("/product/:email", async (req, res) => {
  const email = req.params.email;
  const query = { sellerEmail: email };
  const result = await productsCollection.find(query).toArray();
  res.send(result);
});
//get all products
 app.get("/allProducts", async (req, res) => {
 const {title,sort,category,brand,filter}=req.query;
 const query={};
 if(title){
  query.title={$regex:title,$options:"i"}
 }
 if(category){
  query.category={$regex:category,$options:"i"}
 }

 if(brand){
  query.brand=brand
 }
 const sortOption = sort === 'asc'?1:-1;
  const result = await productsCollection.find(query).sort({price:sortOption}).toArray();
  res.send(result);
});
   // update products
   app.patch("/updateProduct/:id", async (req, res) => {
    const id = req.params.id;
    const updateProduct = req.body;

    const filter = { _id: new ObjectId(id) };
    const option = { upsert: true };

    const updateDoc = {
      $set: {
      
        price: updateProduct.price,
        quantity: updateProduct.quantity,
      },
    };
    const result = await productsCollection.updateOne(
      filter,
      updateDoc,
      option
    );

    res.send(result);
  });
// get single product using params
app.get("/single-product/:id", async (req, res) => {
  const id = req.params.id;
  const query = { _id: new ObjectId(id) };
  const result = await productsCollection.findOne(query);

  res.send(result);
});

//delete product
app.delete("/product/delete/:id",async (req,res)=>{
  const id = req.params.id;
  const query = { _id: new ObjectId(id) };
  const result = await productsCollection.deleteOne(query);
  res.send(result);
  })



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
  console.log(`NextGen Phone is running on port ${port}`);
});

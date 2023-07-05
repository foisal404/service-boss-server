const express = require('express');
const cors = require('cors');
const app=express()
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const stripe = require('stripe')(process.env.Payment_Secret)
const port = process.env.PORT || 5000;

//midlleware
// app.use(cors())
const corsOptions ={
  origin:'*',
  credentials:true,
  optionSuccessStatus:200,
  }
  app.use(cors(corsOptions))
app.use(express.json())


app.get('/',(req,res)=>{
    res.send("Hero server is running ...")
})


//mongodb
const uri = `mongodb+srv://${process.env.User}:${process.env.Pass}@cluster0.pxrxjz6.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const serviceCollection = client.db("serviceDB").collection("services");
    const usersCollection = client.db("serviceDB").collection("users");
    const commentsCollection = client.db("serviceDB").collection("comments");
    const cartCollection = client.db("serviceDB").collection("cart");
    const paymentCollection = client.db("serviceDB").collection("payment");


    // payment related api
    app.get("/payments",async(req,res)=>{
        const result = await paymentCollection.find().toArray();
        res.send(result)
    })
    app.post('/payments/:id', async (req, res) => {
      const payment = req.body;
      const id = req.params.id;
      // console.log(id);
      const insertResult = await paymentCollection.insertOne(payment);
      const query = { _id: new ObjectId(id) }
      const deleteResult = await cartCollection.deleteOne(query)
      res.send({ insertResult, deleteResult });
    })

    //create payment intent
    app.post('/create-payment-intent', async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100);
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: [
          "card"
        ],
      });
      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    })

    //cart related api
    app.delete("/cart/delete/:id",async(req,res)=>{
      const id=req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await cartCollection.deleteOne(query);
      res.send(result)
    })
    
    app.get("/cart",async(req,res)=>{
      const id=req.query;
      // console.log(id);
      if(id){
        const query={_id: new ObjectId(id?.id)}
        const result = await cartCollection.find(query).toArray();
        res.send(result)
      }
      else{
        const result = await cartCollection.find().toArray();
        res.send(result)
      }
    })

    app.get("/cart/:email",async(req,res)=>{
      const email=req.params.email;
      const query = { useremail: email };
        const result = await cartCollection.find(query).toArray();
        res.send(result)
    })

    app.post('/cart/add',async(req,res)=>{
      const doc=req.body;
      // console.log(doc);
      const result =await cartCollection.insertOne(doc);
      res.send(result)
    })

    //comments related api
    app.post("/comment/add",async(req,res)=>{
      const doc=req.body;
      // console.log(doc);
      const result =await commentsCollection.insertOne(doc);
      res.send(result)
    })

    app.get('/comments/:id',async(req,res)=>{
      const id=req.params.id;
        const query = { serviceID: id };
        const result = await commentsCollection.find(query).toArray();
        res.send(result)
    })

    //services related api

    app.patch('/service/update/:id',async(req,res)=>{
      const id=req.params.id;
      const doc=req.body;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          category:doc.category,
            image:doc.image,
            price: doc.price,
            service_details:doc.service_details,
            subtitle:doc.subtitle,
            title:doc.title,
            unit:doc.unit,
            service_includes: {
              whats_included: [doc.incluide1, doc.incluide2, doc.incluide3],
              whats_excluded: [doc.excluide1, doc.excluide2, doc.excluide3],
              available_services: [doc.available1, doc.available2, doc.available3],
            }
        },
      };
      const result = await serviceCollection.updateOne(filter, updateDoc );
      res.send(result)
    })
    app.delete('/service/:id',async(req,res)=>{
      const id=req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await serviceCollection.deleteOne(query);
      res.send(result)
    })
    app.post('/service/add',async(req,res)=>{
      const doc=req.body;
      const result =await serviceCollection.insertOne(doc);
      res.send(result)

    })
    app.get('/services',async(req,res)=>{
        const cursor =await serviceCollection.find().toArray();
        res.send(cursor)
    })
    app.get('/service/:id',async(req,res)=>{
        const id=req.params.id;
        // console.log(id);
        const query = { _id: new ObjectId(id) };
        const result = await serviceCollection.findOne(query);
        res.send(result)
    })

    //Users related api
    app.patch('/user/admin/:email',async(req,res)=>{
      const email=req.params.email;
      const filter = { useremail: email };
      const updateDoc = {
        $set: {
          role: 'admin'
        },
      };
      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send(result)
    })
    app.get('/user/role/:email',async(req,res)=>{
      const email=req.params.email;
      // console.log(email);
      const query = { useremail: email };
      const movie = await usersCollection.findOne(query);
      // console.log(movie);
      res.send({role:movie?.role})

    })
    app.post('/user',async(req,res)=>{
      const doc=req.body;
      // console.log(doc);
      const query = { useremail: doc.useremail };
      const isexist = await usersCollection.findOne(query);
      if(isexist){
        res.send([])
      }
      else{
        const result = await usersCollection.insertOne(doc);
        res.send(result)
      }
    })
    app.get('/users',async(req,res)=>{
      const cursor =await usersCollection.find().toArray();
      res.send(cursor)
    })

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

// listen
app.listen(port,()=>{
    console.log(`server listening on port ${port}`);
})
const express = require('express');
const app = express();
require('dotenv').config();
const cors = require("cors");
const jwt = require('jsonwebtoken');
const port = process.env.PORT || 8000;

//middleware

app.use(cors());
app.use(express.json());


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.a3qxp45.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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
    await client.connect();


    const userCollection = client.db('bistroDB').collection('users');
    const menuCollection = client.db('bistroDB').collection('menu');
    const reviewCollection = client.db('bistroDB').collection('reviews');
    const cartCollection = client.db('bistroDB').collection('cart');

    //jwt related API
    app.post('/jwt', async (req, res) => {
        const user = req.body;
        const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {expiresIn: '7d'});
        res.send({ token })
    })

    // middlewares
    const verifyToken = (req, res, next) =>{
        console.log('Inside verifiedToken:  ',req.headers.authorization);

        if(!req.headers.authorization){
            return res.status(401).send({message: 'Unauthorized Access!!!'});
        }

        const token = req.headers.authorization.split(' ')[1];
        jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err , decoded) => {
            if(err){
                return res.status(401).send({message: 'Unauthorized Access!!!'});
            }
            req.decoded = decoded;
            next();
        })
    }

    // use verify admin after --> (verifyToken)
    const verifyAdmin = async (req, res, next) => {
        const email= req.decoded.email;
        const query = { email: email};
        const user = await userCollection.findOne(query);
        const isAdmin = user?.role === 'admin';
        if(!isAdmin){
            return res.status(403).send({message: "Forbidden Access!!!"})
        }

        next();
    }

    // User related API
    app.get('/users', verifyToken, verifyAdmin, async(req, res) => {

        const result = await userCollection.find().toArray();
        res.send(result);
    })

    // check user role status 'admin or not'
    app.get('/users/admin/:email', verifyToken, async ( req, res ) => {
        const email = req.params.email;
        if(email !== req.decoded.email){
            return res.status(403).send({message: 'Forbidden Access!!!'});
        }

        const query = {email: email};
        const user = await userCollection.findOne(query);
        let isAdmin = false;
        if(user){
            isAdmin = user?.role === 'admin'
        }

        res.send({ isAdmin});
    })

    app.post('/users', async(req, res) => {
        const user = req.body;
        const query = { email: user.email };
        const existingUser = await userCollection.findOne(query);
        if(existingUser){
            return res.send({message: 'User already exist', insertedId: null})
        }
        const result = await userCollection.insertOne(user);
        res.send(result);
    })

    // set user role
    app.patch('/users/admin/:id',verifyToken, verifyAdmin, async(req, res) => {
        const filter = {_id: new ObjectId (req.params.id)}
        const updatedDoc = {
            $set:{
                role: 'admin'
            }
        }

        const result = await userCollection.updateOne(filter, updatedDoc);
        res.send(result);
    })

    app.delete('/users/:id', verifyToken, verifyAdmin, async(req, res) => {
        const query = {_id: new ObjectId (req.params.id)};
        const result = await userCollection.deleteOne(query);
        res.send(result);
    })

    // menu related api
    app.post('/menu', verifyToken, verifyAdmin, async(req, res) => {
        const menuItem = req.body;
        const result = await menuCollection.insertOne(menuItem);
        res.send(result);
    });

    app.patch('/menu/:id', async ( req, res ) => {
        const item = req.body;
        const id = req.params.id;
        const filter = {_id: new ObjectId (id)};
        const updatedDoc = {
            $set: {
                ...item,
            }
        }
        const result = await menuCollection.updateOne( filter, updatedDoc );
        res.send(result);
    })

    app.delete('/menu/:id', verifyToken, verifyAdmin, async(req, res) => {
        const query = {_id: new ObjectId (req.params.id)};
        const result = await menuCollection.deleteOne(query);
        res.send(result);
    })

    app.get('/menu', async(req, res) => {
        const result = await menuCollection.find().toArray();
        res.send(result);
    });

    app.get('/menu/:id', async (req, res) => {
        const result = await menuCollection.findOne({_id: new ObjectId (req.params.id)});

        res.send(result);
    })

    app.get('/reviews', async(req, res) => {
        const result = await reviewCollection.find().toArray();
        res.send(result);
    })

    // cart collection
    app.get('/carts', async(req, res) => {
        const email = req.query.email;
        const query = { email: email};
        const result = await cartCollection.find(query).toArray();
        res.send(result);
    })

    app.post('/cart', async(req, res) => {
        const cartItem = req.body;
        const result = await cartCollection.insertOne(cartItem);
        res.send(result);
    })

    app.delete('/cart/:id', async( req, res ) => {
        const result = await cartCollection.deleteOne({_id: new ObjectId (req.params.id)});
        res.send(result);
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


app.get('/', (req, res) => {
    res.send('Bistro Boss Server is running...');
})

app.listen(port, () => {
    console.log(`Bistro Boss Ser is Running on Port ${port}`)
})
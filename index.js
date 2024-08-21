const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken')
require('dotenv').config()
const app = express();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 5000;

app.use(cors())
app.use(express.json())

app.get('/', (req, res) => {
    res.send("Car-doctor server is On")
})



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.4fvtstz.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

const verifyJWT = (req, res, next) => {
    // console.log("hitting verify JWT");
    // console.log(req.headers.authorization);
    const authorization = req.headers.authorization;
    if (!authorization) {
        return res.status(401).send({ error: true, message: "unauthorized access" })
    }
    const token = authorization.split(' ')[1];
    // console.log('token varifyed', token);
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (error, decoded) => {
        if (error) {
            return res.status(403).send({ error: true, message: "unauthorized access" })
        }
        req.decoded = decoded;
        next();
    })
}

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();
        const serviceCollection = client.db('carDoctor').collection('services')
        const bookingCollection = client.db('carDoctor').collection('bookings')
        //jwt
        app.post('/jwt', (req, res) => {
            const user = req.body;
            // console.log(user);
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
            res.send({ token });
        })



        app.get('/serviecs', async (req, res) => {

            let src = req.query.search
            // const query = {}
            const query = { title: { $regex: src, $options: 'i' } }
            // const query = { price: { $gte: 70, $lte: 150 } }

            let asc = req.query.sort;
            // console.log(src);

            const options = {
                sort: { "price": asc === 'asc' ? 1 : -1 }
            }



            const result = await serviceCollection.find(query, options).toArray()
            // console.log(result);
            res.send(result)
        })

        app.get('/checkout/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }
            const options = {
                projection: {
                    title: 1,
                    price: 1,
                    img: 1

                }
            }
            const result = await serviceCollection.findOne(filter, options);
            res.send(result)
        })

        app.post('/bookings', async (req, res) => {
            const order = req.body;
            const result = await bookingCollection.insertOne(order);
            res.send(result)
        })
        app.get('/bookings', verifyJWT, async (req, res) => {
            // console.log("i am in");
            // console.log(req.headers.authorization);
            if (req.decoded.email !== req.query.email) {
                return res.status(403).send({ error: 1, message: "forbidden access" })
            }
            let query = {};
            if (req.query?.email) {
                query = { email: req.query.email }
            }
            const result = await bookingCollection.find(query).toArray();
            res.send(result)
        })


        app.delete('/delete/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const result = await bookingCollection.deleteOne(filter);
            res.send(result)
        })


        app.patch('/bookings/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }
            const updateBooking = req.body;
            // console.log(updateBooking);
            const updatedDoc = {
                $set: {
                    status: updateBooking.status
                },
            }
            const result = await bookingCollection.updateOne(filter, updatedDoc);
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



app.listen(port, () => {
    console.log("Car doctor is running", port);
})
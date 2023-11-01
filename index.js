const express = require('express')
const cors = require('cors')
const port = process.env.PORT || 3000;
require('dotenv').config();
const { MongoClient, ServerApiVersion } = require('mongodb');
const app = express();
// middleware
app.use(cors());
app.use(express.json())

app.get('/', (req, res) => {
    res.send("server is running");
})
console.log(process.env.DB_USER, "db user");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.PASSWORD}@cluster0.e2ikgn4.mongodb.net/?retryWrites=true&w=majority`;

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
        await client.connect();
        const userCollections = client.db('hospitalDb').collection('allUsers')
        app.get('/user', async (req, res) => {
            const result = await userCollections.find().toArray();
            res.send(result)
        })

        app.post('/user', async (req, res) => {
            const user = req.body;
            const result = await userCollections.insertOne(user);
            console.log(user);
            res.send(result)
        })
        app.get('/user/profile', async (req, res) => {
            console.log(req.query?.email, "emaiiilllll que");
            if (req.query?.email) {
                const query = { email: req.query.email }
                const result = await userCollections.find(query).toArray()
                res.send(result);

            }

        })

        // update user
        app.put(`/user/profile`, async (req, res) => {
            console.log(req.body);
        })






        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    }
    catch (error) {
        console.log(error);
    }
}
run().catch(console.dir);


// connet to port 
app.listen(port, () => {
    console.log('server is running on port ', port);
})





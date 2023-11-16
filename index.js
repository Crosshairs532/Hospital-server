const express = require('express')
const cors = require('cors')
const port = process.env.PORT || 3000;
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const {scheduler} = require('./scheduler/schedules');



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
        const appointmentCollection = client.db('hospitalDb').collection('allAppointments')
        const allDoctorsCollection = client.db('hospitalDb').collection('allDoctors')
        const allAdmissionCollection = client.db('hospitalDb').collection('allAdmissions')

        //Schedule Email Remainder
        sendEmail(appointmentCollection);

        const testCollection = client.db('hospitalDb').collection('allTests')
        app.get('/user', async (req, res) => {
            const result = await userCollections.find().toArray();
            res.send(result)
        })

        app.post('/user', async (req, res) => {
            const user = req.body;
            const result = await userCollections.insertOne(user);
            console.log(user, "server user");
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
            const id = req.body._id;
            const { name, photo, email } = req.body;
            const options = { upsert: true };
            const filter = { _id: new ObjectId(id) }
            const updatedUser = { $set: { name, photo, email } }
            const result = await userCollections.updateOne(filter, updatedUser, options)
            res.send({ message: 'successfully updated', result });

        })


        app.delete('/user/:id', async (req, res) => {
            const id = req.params.id;
            const deleteResult = await userCollections.deleteOne({ _id: new ObjectId(id) });
            res.send(deleteResult)
        })



        // appointment
        app.post('/appointments', async (req, res) => {
            const appointment = req.body;
            const result = await appointmentCollection.insertOne(appointment);
            console.log(appointment, "server user");
            res.send(result)
        })

        //Get Appointments
        app.get('/appointments',async (req,res) =>{
            const result = await appointmentCollection.find().toArray();
            res.send(result);
        })

        app.get('/appointments', async (req, res) => {
            const Uemail = req.query?.email;
            let query = {};
            if (req.query?.email) {
                query = { Pemail: req.query?.email }
            }
            const result = await appointmentCollection.find(query).toArray();
            res.send(result)
        })
        app.put('/appointments/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }
            const options = { upsert: true };
            const updated = req.body;

            const appnt = {
                $set: {

                    Pname: updated.Pname,
                    Page: updated.Page,
                    Pgender: updated.Pgender,
                    address: updated.address,
                    Ddpt: updated.Ddpt,
                    number: updated.number,
                    Dname: updated.Dname,
                    Pstatus: updated.Pstatus,
                    Pemail: updated.Pemail,
                    ampm: updated.ampm,
                    appointment: updated.appointment,
                    ATime: updated.ATime
                }
            }

            const result = await appointmentCollection.updateOne(filter, appnt, options);
            res.send(result);

        })

        app.delete('/appointments/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await appointmentCollection.deleteOne(query);
            console.log(result)
            res.send(result);
        })







        app.get('/alldoctors', async (req, res) => {
            const result = await allDoctorsCollection.find().toArray();
            res.send(result)
        })

        // admission
        app.post('/admission', async (req, res) => {
            const admission = req.body;
            const result = await allAdmissionCollection.insertOne(admission);
            console.log(admission, "server user");
            res.send({ success: true })
        })
        app.get('/admission', async (req, res) => {
            let query = {}
            if (req.query?.Pemail) {
                query['Pemail'] = req.query.Pemail;
            }
            const result = await allAdmissionCollection.find(query).toArray()
            res.send(result)
        })


        // test
        app.post('/tests', async (req, res) => {
            const test = req.body;
            const result = await testCollection.insertOne(test);
            console.log(test, "patient test");
            res.send(result)
        })


        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    }
    catch (error) {
        console.log(error);
    }
}
run().catch(console.dir);

const sendEmail = async(appointmentCollection)=>{
    const res = await appointmentCollection.find().toArray();

    console.log(res);
}



//Run the notification scheduler
scheduler.run();
// connet to port 
app.listen(port, () => {
    console.log('server is running on port ', port);
})




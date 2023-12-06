const express = require('express')
const cors = require('cors')
const path = require('path');
const cron = require('node-cron');
const port = process.env.PORT || 3000;
const axios = require('axios');
const jwt = require('jsonwebtoken')
const pdf = require('pdfkit');
const fs = require('fs');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
const socketIO = require('socket.io');
const http = require('http');
const server = http.createServer(app);
const { parseISO } = require('date-fns');
const io = socketIO(server, {
    cors: {
        origin: 'http://localhost:5173',
        methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
});
io.on('connection', (socket) => {
    console.log('Client connected');
    socket.emit('notification', { message: 'Welcome to the Pharmacy Management System' });
    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});
// middleware
app.use(cors(
    {
        origin: ['http://localhost:5173'],
        credentials: true
    }
));
app.use(express.json())
app.get('/', (req, res) => {
    res.send("server is running");
})
console.log(process.env.DB_USER, "db user");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.PASSWORD}@cluster0.e2ikgn4.mongodb.net/?retryWrites=true&w=majority`;

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
        const testCollection = client.db('hospitalDb').collection('allTests')
        const medicineCollection = client.db('hospitalDb').collection('Medicines');
        const Report = client.db('hospitalDb').collection('AllReport');
        const expiredMedicineCollection = client.db('hospitalDb').collection('MedicinesExpired')
        const stockMedicineCollection = client.db('hospitalDb').collection('MedicinesStock')


        setInterval(async () => {
            try {
                const currentDate = new Date();
                const currentDateString = currentDate.toISOString().split('T')[0];
                const expiredMedicines = await medicineCollection.find({
                    expirationDate: { $lt: currentDateString }
                }).toArray();
                const nearExpirationMedicines = await medicineCollection.find({
                    expirationDate: {
                        $gte: currentDateString,
                        $lt: new Date(currentDate.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
                    },
                }).toArray();
                console.log(nearExpirationMedicines, "Expired Medicines");
                for (const medicine of expiredMedicines) {
                    try {
                        const exist = await expiredMedicineCollection.findOne({ name: medicine.name });

                        const upDoc = {
                            $set: {
                                status: "expired"
                            }
                        };

                        if (exist) {
                            const updatedExpired = await expiredMedicineCollection.updateOne({ name: medicine.name }, upDoc);
                            const updatedMedicine = await medicineCollection.updateOne({ name: medicine.name }, upDoc);

                            console.log(`Updated existing document for ${medicine.name}`);
                        } else {
                            const result = await expiredMedicineCollection.insertOne(medicine);

                            console.log(`Inserted new document for ${medicine.name}`);
                        }
                    } catch (error) {
                        console.error('Error updating/inserting document:', error);
                    }
                }
                if (nearExpirationMedicines.length > 0) {
                    console.log("Sending notification");
                    io.emit('notification', {
                        near: `Alert: ${nearExpirationMedicines.length} medicines is near to expire.`,
                    });
                }
                if (expiredMedicines.length > 0) {
                    io.emit('notification', {
                        message: `Alert: ${expiredMedicines.length} medicines have expired.`,
                    });
                }
                const quantity = await medicineCollection.find({ quantity: { $lt: 5 } }).toArray();
                for (const medicine of quantity) {
                    try {
                        const exist = await stockMedicineCollection.findOne({ name: medicine.name });

                        const upDoc = {
                            $set: {
                                stockStatus: "near out of stock"
                            }
                        };

                        if (exist) {
                            const updatedExpired = await stockMedicineCollection.updateOne({ name: medicine.name }, upDoc);
                            const updatedMedicine = await medicineCollection.updateOne({ name: medicine.name }, upDoc);

                            console.log(`Updated existing document for ${medicine.name}`);
                        } else {
                            const result = await stockMedicineCollection.insertOne(medicine);

                            console.log(`Inserted new document for ${medicine.name}`);
                        }
                    } catch (error) {
                        console.error('Error updating/inserting document:', error);
                    }
                }
                if (quantity.length > 0) {
                    io.emit('notification', {
                        stock: `Alert: ${quantity.length} some medicine has lower stock or or of stock.`,
                    });
                }
            } catch (error) {
                console.error('Error in periodic check:', error);
            }
        }, 1000 * 24);

        // 24 * 60 * 60 * 1000



        app.get('/pagination/medicine', async (req, res) => {
            const result = await medicineCollection.estimatedDocumentCount();
            res.send({ count: result })

        })
        app.get('/pagination/allexpired', async (req, res) => {
            const result = await expiredMedicineCollection.estimatedDocumentCount();
            res.send({ count: result })
        })





        app.get('/stock', async (req, res) => {
            const result = await stockMedicineCollection.find().sort({ quantity: -1 }).toArray();
            res.send(result)
        })
        app.get('/expired', async (req, res) => {
            const page = parseInt(req.query.page);
            const size = parseInt(req.query.size);
            const result = await expiredMedicineCollection.find().skip(page * size).limit(size).toArray();
            res.send(result)
        })


        app.get('/allTests', async (req, res) => {
            const { email } = req.query;
            let query = {};
            if (email) {
                query.Pemail = email
            }
            const result = await testCollection.find(query).toArray();
            res.send(result);

        })
        app.get('/admission', async (req, res) => {
            let query = {}
            if (req.query?.Pemail) {
                query['Pemail'] = req.query.Pemail;
            }
            const result = await allAdmissionCollection.find(query).toArray()
            res.send(result)
        })
        app.get('/alldoctors', async (req, res) => {
            const result = await allDoctorsCollection.find().toArray();
            res.send(result)
        })

        app.get('/user', async (req, res) => {
            const result = await userCollections.find().toArray();
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
        app.get('/appointments', async (req, res) => {
            const email = req.query?.email;
            let query = {};
            if (req.query?.email) {
                query = { Pemail: req.query?.email }
            }
            const result = await appointmentCollection.find(query).toArray();
            res.send(result)
        })




        app.get('/medicine', async (req, res) => {
            // console.log(req.sort, "sorrrrrrr");
            const page = parseInt(req.query.page);
            const size = parseInt(req.query.size);
            const result = await medicineCollection.find().skip(page * size).limit(size).sort({ status: -1 }).toArray();
            res.send(result)

        })
        app.get('/update/medicine', async (req, res) => {
            const medicine_id = req.query?.medicine_id;
            console.log(req.query, "lahfiafafia");
            let query = {};
            console.log(query, medicine_id, "hello boy");
            if (req.query?.medicine_id) {
                query = { _id: new ObjectId(medicine_id) }
            }
            console.log(query, "hh");
            const result = await medicineCollection.find(query).toArray();
            console.log(result, "hhh");
            res.send(result)
        })

        app.post('/medicine', async (req, res) => {
            try {
                const medicine = req.body;
                const result = await medicineCollection.insertOne(medicine);
                console.log(medicine, "medddd");
                res.status(201).send({ result: result, message: 'Medicine inserted successfully', });
                // res.status(201).send({ message: 'Medicine inserted successfully', insertedId: result.insertedId });
            } catch (error) {
                console.error('Error inserting medicine:', error);
                res.status(500).send({ message: error.message })
            }
        });
        app.post('/admission', async (req, res) => {
            const admission = req.body;
            const result = await allAdmissionCollection.insertOne(admission);
            console.log(admission, "server user");
            res.send({ success: true })
        })
        app.post('/user', async (req, res) => {
            const user = req.body;
            const result = await userCollections.insertOne(user);
            console.log(user, "server user");
            res.send(result)
        })
        app.post('/appointments', async (req, res) => {
            const appointment = req.body;
            const result = await appointmentCollection.insertOne(appointment);
            console.log(appointment, "server user");
            res.send(result)
        })

        app.post('/tests', async (req, res) => {
            const test = req.body;
            const result = await testCollection.insertOne(test);
            console.log(test, "patient test");
            res.send(result)
        })
        app.put(`/user/profile`, async (req, res) => {
            const id = req.body._id;
            const { name, photo, email } = req.body;
            const options = { upsert: true };
            const filter = { _id: new ObjectId(id) }
            const updatedUser = { $set: { name, photo, email } }
            const result = await userCollections.updateOne(filter, updatedUser, options)
            res.send({ message: 'successfully updated', result });

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
        app.patch('/medicine', async (req, res) => {
            try {
                const medicine_id = req.query?.medicine_id;
                const filter = { _id: new ObjectId(medicine_id) }
                const updated = req.body;
                console.log(updated, "server upppp");
                const med = {
                    $set: {
                        name: updated.name,
                        price: parseFloat(updated.price),
                        quantity: updated.quantity,
                        expirationDate: updated.expirationDate,
                        productionDate: updated.productionDate,
                        usage: updated.usage,
                        stockStatus: updated.stockStatus,
                        status: updated.status
                    }
                }
                const result = await medicineCollection.updateOne(filter, med);
                res.send(result);
            } catch (error) {
                res.status(500).send({ message: error.message })
            }

        }
        )

        app.delete('/user/:id', async (req, res) => {
            const id = req.params.id;
            const deleteResult = await userCollections.deleteOne({ _id: new ObjectId(id) });
            res.send(deleteResult)
        })
        app.delete('/appointments/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await appointmentCollection.deleteOne(query);
            console.log(result)
            res.send(result);
        })
        app.delete('/medicine/:id', async (req, res) => {
            try {
                const id = req.params.id;
                const query = { _id: new ObjectId(id) }
                const result = await medicineCollection.deleteOne(query);
                res.send(result);
            }
            catch (error) {
                res.send({ message: error.message, Stack_trace: error.stack, })
            }
        })

        // Example Express route to serve PDF reports
        // app.get('/reports', async (req, res) => {
        //     const { reportEmail, id } = req.query;
        //     console.log(reportEmail, "eeeee");
        //     let query = {};
        //     if (reportEmail) {
        //         query.email = reportEmail;
        //     }
        //     if (id) {
        //         query._id = new ObjectId(id);
        //     }
        //     try {
        //         const reports = await Report.find(query).toArray();
        //         if (!reports || reports.length === 0) {
        //             return res.status(404).json({ error: 'Reports not found for the given email' });
        //         }
        //         const doc = new pdf();
        //         reports.forEach((report, index) => {
        //             doc.text(`Report ${index + 1}`);
        //             doc.text(`Test Name: ${report.test_name}\nResult: ${report.test_result}\nInterpretation: ${report.test_interpretation}\n\n`);
        //         });
        //         const filePath = path.join(__dirname, './Public/Files', `report_${reportEmail}.pdf`);
        //         doc.pipe(fs.createWriteStream(filePath));
        //         doc.end();
        //         res.json({ reports, pdfPath: filePath });
        //     } catch (error) {
        //         console.error('Error:', error);
        //         res.status(500).json({ error: 'Internal Server Error' });
        //     }
        // });
        app.get('/reports', async (req, res) => {
            const { reportEmail, id } = req.query;
            console.log(reportEmail, "eeeee");
            let query = {};
            if (reportEmail) {
                query.email = reportEmail;
            }
            if (id) {
                query._id = new ObjectId(id);
            }
            try {
                const reports = await Report.find(query).toArray();

                res.send({ reports, pdfPath: "repeort" });
            } catch (error) {
                console.error('Error:', error);
                res.status(500).json({ error: 'Internal Server Error' });
            }
        });


        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    }
    catch (error) {
        console.log(error);
    }
}
run().catch(console.dir);
server.listen(process.env.PORT || 3000, () => {
    console.log('Server is running on port', process.env.PORT || 3000);
});




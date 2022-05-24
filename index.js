const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const { verify } = require('jsonwebtoken');
const { urlencoded } = require('express');
require('dotenv').config();
const port = process.env.PORT || 5000;
const app = express();

//middleware

app.use(cors());
app.use(express.json());




const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.6kdyi.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


//veryfy JWT starte here 
function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ message: 'Unauthorized access' })
    }
    const token = authHeader.split(" ")[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'accessToken forbiden' })
        }

        req.decoded = decoded;
        next();
    });
}
//veryfy JWT ends here 


async function run() {

    try {
        await client.connect();
        const serviceCollection = client.db('laptop-parts').collection('service');
        const orderCollection = client.db('laptop-parts').collection('orders');
        const userCollection = client.db('laptop-parts').collection('users');


        // all service data load kora display te
        app.get('/service', async (req, res) => {
            const query = {};
            const cursor = serviceCollection.find(query);
            const services = await cursor.toArray();
            res.send(services);
        });

        //single data id set korar jonno
        app.get('/service/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const service = await serviceCollection.findOne(query);
            res.send(service);
        });


        // update user product  quentity add and setup
        app.put('/service/:id', async (req, res) => {
            const id = req.params.id;
            const updateUser = req.body.Quantity;
            console.log(req.body.Quantity)
            const filter = { _id: ObjectId(id) };
            const options = { upsert: true };
            const updatedDoc = {
                $set: { Quantity: updateUser }
            }
            const result = await serviceCollection.updateOne(filter, updatedDoc, options);
            res.send(result)
        });

        // product order add for code started here====>
        app.post('/order', async (req, res) => {
            const order = req.body;
            const result = await orderCollection.insertOne(order);
            res.send(result);

        })
        // product order for code Ends==== here====^

        //===========Single person for order loaded display code started here=====>
        app.get('/order', verifyJWT, async (req, res) => {
            const userEmail = req.query.userEmail;
            const decodedEmail = req.decoded.email;
            if (userEmail === decodedEmail) {

                const query = { userEmail: userEmail };
                const order = await orderCollection.find(query).toArray();
                return res.send(order);

            }
            else {
                return res.status(403).send({ message: 'forbidden access' })
            }
        });
        //===========Single person for order loaded display code Ends    here=====^


        //===User Information calection code started here=============>

        app.put('/user/:email', async (req, res) => {
            const email = req.params.email;
            const user = req.body;
            const filter = { email: email };
            const options = { upsert: true };
            const updatedDoc = {
                $set: user,
            };
            const result = await userCollection.updateOne(filter, updatedDoc, options);
            const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
            res.send({ result, token });

        });

        //===User Information calection code Ends    here=============^


        //==========All User loded for display Code Started here=========>

        app.get('/user', verifyJWT, async (req, res) => {
            const users = await userCollection.find().toArray();
            res.send(users);
        })

        //==========All User loded for display Code Ends    here=========^


        //====================Single person for admin make code started here===>

        app.put('/user/admin/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;
            const requester = req.decoded.email;
            const requesterAccount = await userCollection.findOne({ email: requester });
            if (requesterAccount.role === 'admin') {

                const filter = { email: email };
                const updatedDoc = {
                    $set: { role: 'admin' },
                };
                const result = await userCollection.updateOne(filter, updatedDoc);
                res.send(result);

            }
            else {
                res.status(403).send({ message: 'forbidden' })
            }
        });

        //====================Single person for admin make code Ends    here===>


    }


    finally {

    }

}

run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('Running this website');
});

app.listen(port, () => {
    console.log('lisining to port', port);
});
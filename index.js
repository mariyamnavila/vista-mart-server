const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion } = require('mongodb');
const dotenv = require("dotenv");

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const uri = process.env.DB_URI
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
        // await client.connect();

        const db = client.db('vista-mart-db')
        const productCollection = db.collection('products')

        // GET /products?page=1&limit=8&search=pro&brand=Apple&minPrice=300&sort=newest
        app.get("/products", async (req, res) => {
            try {
                const {
                    page = 1,
                    limit = 10,
                    search,
                    brand,
                    category,
                    minPrice,
                    maxPrice,
                    sort,
                } = req.query;

                const query = {};

                // 🔎 Search by name
                if (search) {
                    query.name = { $regex: search, $options: "i" };
                }

                // 🎯 Filter
                if (brand) query.brand = brand;
                if (category) query.category = category;

                if (minPrice && maxPrice) {
                    query.price = {
                        $gte: Number(minPrice),
                        $lte: Number(maxPrice),
                    };
                }

                // 🔃 Sorting
                let sortOption = {};
                if (sort === "priceLow") sortOption.price = 1;
                if (sort === "priceHigh") sortOption.price = -1;
                if (sort === "newest") sortOption.createdAt = -1;

                const skip = (Number(page) - 1) * Number(limit);

                const products = await productCollection
                    .find(query)
                    .sort(sortOption)
                    .skip(skip)
                    .limit(Number(limit))
                    .toArray();

                const total = await productCollection.countDocuments(query);

                res.send({
                    products,
                    totalPages: Math.ceil(total / limit),
                    currentPage: Number(page),
                    totalProducts: total,
                });

            } catch (error) {
                res.status(500).send({ message: error.message });
            }
        });

        app.post("/products", async (req, res) => {
            try {
                const newProduct = req.body;

                newProduct.createdAt = new Date();

                const result = await productCollection.insertOne(newProduct);

                res.send(result);
            } catch (error) {
                res.status(500).send({ message: error.message });
            }
        });

        // await client.db("admin").command({ ping: 1 });
        // console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('Vista mart server is running')
})

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
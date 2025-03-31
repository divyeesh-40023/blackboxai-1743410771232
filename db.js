const { MongoClient, ServerApiVersion } = require('mongodb');

const uri = "mongodb+srv://mahi:mahi%40123@cluster0.jv20r.mongodb.net/attendanceSystem?retryWrites=true&w=majority";

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    },
    connectTimeoutMS: 5000,
    socketTimeoutMS: 30000,
    serverSelectionTimeoutMS: 5000,
    retryWrites: true
});

let db;
const dbName = "attendanceSystem";

async function connectDB() {
    try {
        await client.connect();
        db = client.db(dbName);
        await db.command({ ping: 1 });
        console.log("Successfully connected to MongoDB!");
        return db;
    } catch (err) {
        console.error("MongoDB connection error:", err);
        throw err;
    }
}

module.exports = {
    connectDB,
    getDb: () => db,
    client
};
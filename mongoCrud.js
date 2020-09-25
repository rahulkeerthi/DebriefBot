require("dotenv").config()

const MongoClient = require("mongodb").MongoClient
const uri = process.env.MONGODB_URI
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true })
;(async function () {
	try {
		await client.connect()
		const db = client.db("debriefStore")
		collection = db.collection("debriefs")
		// perform actions on the collection object
		const cursor = collection.find({ ts: "test" })
		if ((await cursor.count()) === 0) {
			console.log("No debriefs found!")
		}
		await cursor.forEach(console.dir)
	} catch (err) {
		console.error(err)
	} finally {
		await client.close()
	}
})()
const client2 = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true })

;(async function () {
	try {
		await client2.connect()
		const db = client2.db("debriefStore")
		const collection = db.collection("debriefs")
		const entry = { ts: "inserted", channel: "it worked" }
		// perform actions on the collection object
		await collection.insertOne(entry)
	} catch (err) {
		console.error(err)
	} finally {
		await client2.close()
	}
})()

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const express = require("express");
const app = express();
const port = process.env.PORT || 5000;
const cors = require("cors");
const e = require("express");
require("dotenv").config();
app.use(cors());
app.use(express.json());

// job-seeker
// cQZmGYaALr1x5Dux

const uri = `mongodb+srv://${process.env.USER_DB}:${process.env.USER_PASS}@cluster0.73pqt.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();

    const jobCollection = client.db("Job-portal").collection("jobs");
    const jobApplicationCollection = client
      .db("Job-portal")
      .collection("job-application");

    app.get("/allJobs", async (req, res) => {
      const email = req.query.email;
      let query = {};
      if (email) {
        query = { hr_email: email };
      }
      const cursor = jobCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });

    app.get("/job-application", async (req, res) => {
      const cursor = jobApplicationCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    app.get("/job-application/:email", async (req, res) => {
      const email = req.params.email;
      const cursor = jobApplicationCollection.find({ email });
      const result = await cursor.toArray();
      for (const application of result) {
        console.log(application.job_id);
        const query1 = { _id: new ObjectId(application.job_id) };
        const result1 = await jobCollection.findOne(query1);
        if (result1) {
          application.title = result1.title;
          application.company = result1.company;
        }
      }
      res.send(result);
    });

    app.get("/allJobs/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await jobCollection.findOne(query);
      res.send(result);
    });

    app.post("/job-application", async (req, res) => {
      const application = req.body;
      const result = await jobApplicationCollection.insertOne(application);
      const id = application.job_id;
      const query = { _id: new ObjectId(id) };
      const job = await jobCollection.findOne(query);
      let jobCount = 0;
      if (job.applicationCount) {
        jobCount = job.applicationCount + 1;
      } else {
        jobCount = 1;
      }
      const filter = { _id: new ObjectId(id) };
      const updatedCount = {
        $set: {
          applicationCount: jobCount,
        },
      };
      const updatedResult = await jobCollection.updateOne(filter, updatedCount);

      res.send(result, updatedResult);
    });

    app.get("/job-application/jobs/:job_id", async (req, res) => {
      const jobId = req.params.job_id;
      const query = { job_id: jobId };
      const result = await jobApplicationCollection.find(query).toArray()
      res.send(result)
    });

    app.patch("/job-application/:id", async(req, res)=>{
      const id = req.params.id;
      const data = req.body;
      const filter = {_id : new ObjectId(id)};
      const updatedStatus = {
        $set : {
          status : data.status
        }
      }
      const result = await jobApplicationCollection.updateOne(filter, updatedStatus)
      res.send(result)
    })

    app.post("/addJobs", async (req, res) => {
      const newJob = req.body;
      const result = await jobCollection.insertOne(newJob);
      res.send(result);
    });

    app.get("/myAddedJobs", async (req, res) => {
      const cursor = jobCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Job server is running");
});

app.listen(port, () => {
  console.log("Job portal website is running on port", port);
});

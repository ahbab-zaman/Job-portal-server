const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const express = require("express");
const app = express();
const port = process.env.PORT || 5000;
const cors = require("cors");
const jwt = require("jsonwebtoken");
const cookie = require("cookie-parser");
require("dotenv").config();
app.use(
  cors({
    origin: ["http://localhost:5173"],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookie());

const verifyToken = (req, res, next) => {
  console.log("inside verify token");
  const token = req?.cookies?.token;
  if (!token) {
    return res.status(401).send({ message: "Unauthorized Access" });
  }
  jwt.verify(token, process.env.JWT_SECRET, (error, decoded) => {
    if (error) {
      return res.status(401).send({ message: "Unauthorized Access" });
    }
    req.user = decoded;
    next();
  });
};

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
    // await client.connect();

    const jobCollection = client.db("Job-portal").collection("jobs");
    const jobApplicationCollection = client
      .db("Job-portal")
      .collection("job-application");

    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.JWT_SECRET, {
        expiresIn: "10h",
      });
      res.cookie("token", token, {
        httpOnly: true,
        secure: false,
      });
      res.send({ success: true });
    });

    app.post("/logout", (req, res) => {
      res.clearCookie("token", {
        httpOnly: true,
        secure: false,
      });
      res.send({ success: true });
    });

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

    app.get("/job-application/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      const cursor = jobApplicationCollection.find({ email });
      if (req.user.email !== req.params.email) {
        return res.status(403).send({ message: "Forbidden" });
      }
      const result = await cursor.toArray();
      for (const application of result) {
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
      const result = await jobApplicationCollection.find(query).toArray();
      res.send(result);
    });

    app.patch("/job-application/:id", async (req, res) => {
      const id = req.params.id;
      const data = req.body;
      const filter = { _id: new ObjectId(id) };
      const updatedStatus = {
        $set: {
          status: data.status,
        },
      };
      const result = await jobApplicationCollection.updateOne(
        filter,
        updatedStatus
      );
      res.send(result);
    });

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

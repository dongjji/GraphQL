require("dotenv").config();
const path = require("path");

const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const multer = require("multer");
const { graphqlHTTP } = require("express-graphql");

const auth = require("./middleware/auth");

const app = express();

const fileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "images");
  },
  filename: (req, file, cb) => {
    cb(null, new Date().toISOString() + "-" + file.originalname);
  },
});

const fileFilter = (req, file, cb) => {
  if (
    file.mimetype === "image/png" ||
    file.mimetype === "image/jpg" ||
    file.mimetype === "image/jpeg"
  ) {
    cb(null, true);
  } else {
    cb(null, false);
  }
};

// app.use(bodyParser.urlencoded()); // x-www-form-urlencoded <form>
app.use(bodyParser.json()); // application/json
app.use(
  multer({ storage: fileStorage, fileFilter: fileFilter }).single("image")
);
app.use("/images", express.static(path.join(__dirname, "images")));

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "OPTIONS, GET, POST, PUT, PATCH, DELETE"
  );
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

const schema = require("./graphql/schema");
const resolvers = require("./graphql/resolvers");

app.use(auth);

app.use(
  "/graphql",
  graphqlHTTP({
    schema,
    rootValue: resolvers,
    graphiql: true,
    customFormatErrorFn(err) {
      if (!err.originalError) {
        return err;
      }
      const message = err.message;
      const code = err.originalError.code || 500;
      const data = err.originalError.data;
      return { message, status: code, data };
    },
  })
);

app.use((error, req, res, next) => {
  console.log(error);
  const status = error.statusCode || 500;
  const message = error.message;
  const data = error.data;
  res.status(status).json({ message: message, data: data });
});

mongoose
  .connect(
    `mongodb+srv://dongjoon:${process.env.mongoAtlasPassword}@cluster0.u6gwl.mongodb.net/rest?retryWrites=true&w=majority`,
    { useNewUrlParser: true, useUnifiedTopology: true }
  )
  .then((result) => {
    console.log("dbs connected");
    const server = app.listen(8080, () =>
      console.log("server is listening on 8080")
    );
  })
  .catch((err) => console.log(err));

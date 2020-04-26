const express = require('express');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

// app
const app = express();

// database
const databaseName = process.env.DB_NAME;
const databaseUser = process.env.DB_USER;
const databasePassword = process.env.DB_PASSWORD;
const databaseUrl = `mongodb+srv://${databaseUser}:${databasePassword}@blogs-wdfix.gcp.mongodb.net/${databaseName}?retryWrites=true&w=majority`;
mongoose
  .connect(databaseUrl, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log('DB connected.'));

// middlewares
app.use(morgan('dev'));
app.use(bodyParser.json());
app.use(cookieParser());
// cors
app.use(
  cors({
    origin: `${process.env.CLIENT_URL}`,
  })
);

// routes
app.get('/api', (req, res) => {
  res.json({ time: Date().toString() });
});

// port
const port = process.env.PORT || 8000;
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

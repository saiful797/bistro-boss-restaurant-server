const express = require('express');
const app = express();
require('dotenv').config();
const cors = require("cors");
const port = process.env.PORT || 8000;

//middleware

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.send('Bistro Boss Server is running...');
})

app.listen(port, () => {
    console.log(`Bistro Boss Ser is Running on Port ${port}`)
})
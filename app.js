require('dotenv').config();

const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const path = require('path');
const mongoose = require('mongoose');

const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({extended: true}));
app.use('/static', express.static(path.join(__dirname, 'public')));
app.use("/images", express.static('images'));

////////////////////////////////

mongoose.connect("mongodb://127.0.0.1:27017/personalBlogDB", {useNewUrlParser: true});

const postSchema = new mongoose.Schema ({
    title: String,
    date: String,
    content: String
});

const Post = new mongoose.model("Post", postSchema);

///////////////////////////////

app.get("/", function(req, res) {
    res.render("login");
})

app.get("/compose", function(req, res){
    res.render("compose")
})

app.get("/home", function(req, res) {
    res.render("home");
})

app.listen(3000, function() {
    console.log("Server started on port 3000");
});
  
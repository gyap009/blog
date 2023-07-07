require('dotenv').config();

const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const path = require('path');
const mongoose = require('mongoose');
const axios = require('axios');

const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({extended: true}));
app.use('/static', express.static(path.join(__dirname, 'public')));
app.use("/images", express.static('images'));

////////////////////////////////

mongoose.connect("mongodb://127.0.0.1:27017/personalBlogDB", {useNewUrlParser: true})
.then(() => {console.log('Connected to MongoDB');})
.catch((error) => {console.error('Error connecting to MongoDB:', error);});

const postSchema = new mongoose.Schema ({
    title: String,
    date: Date,
    content: String
});

const Post = new mongoose.model("Post", postSchema); // "Posts" collection

////////////////////// Routes //////////////////////

app.get("/", function(req,res){
    res.render("login");
})

app.route("/compose")
    .get(function(req, res){
        res.render("compose")
    })

    .post(function(req, res) {
        const post = new Post({
            title: req.body.postTitle,
            date: req.body.postDate,
            content: req.body.postBody
        });
        post.save()
        .then(function(){
            res.redirect("/home");
        })
        .catch(function(err){
            console.log(err);
        });
    })

app.route("/home") 
    .get(function(req, res) {
        Post.find({})
        .then(function(posts){ 
            console.log(posts);
            res.render("home", {posts: posts}); // Pass "Posts" collection to "home"
        }).catch(function(err){
            console.log(err);
        });
    })

    .post(function(req, res) {
        res.render("home");
    })


app.get("/posts/:postId", function(req, res){
    const requestedPostId = req.params.postId;  

    Post.findOne({_id: requestedPostId})
    .then(function(post){
        res.render("post", {
            title: post.title,
            date: post.date,
            content: post.content
        });
    })
    .catch(function(err){
        console.log(err);
    });
});


app.get("/ideas", function(req, res) {
    res.render("ideas");
})

// POST route to receive the user input and generate AI-generated topics 
// app.post("/ideas", function(req, res) {
//     const userInput = req.body.inputIdea;

//     // need to change from console.log to displaying in web pg
//     generateTopics(userInput) // Pass user input as the prompt
//     .then(topics => console.log(topics)) // Receive response from the backend and store in a var "topics"
//     .catch(error => console.error(error));

//     const topicsList = req.body.topics-list;

//     // Clear any existing content
//     topicsList.innerHTML = '';

//     // Iterate over the topics and create list items
//     topics.forEach(topic => {
//         const listItem = document.createElement('li');
//         listItem.textContent = topic;
//         topicsList.appendChild(listItem);
//     });
// })

app.post("/loggout", function(req, res) {
    res.redirect("/");
})

app.listen(3000, function() {
    console.log("Server started on port 3000");
});


/////////////////////////////

// // Set up API key and endpoint
// const apiKey = process.env.OPENAI_API_KEY;
// const apiUrl = 'https://api.openai.com/v1/engines/davinci-codex/completions';

// // Function to generate topics
// async function generateTopics(userInput) {
//   try {
//     const response = await axios.post(apiUrl, {
//       prompt: userInput,
//       max_tokens: 5, // Adjust the number of tokens to limit the length of generated topics
//       temperature: 0.7, // Adjust the temperature to control the randomness of the generated topics
//       n: 3, // Adjust the number of topics you want to generate
//     }, {
//       headers: {
//         'Content-Type': 'application/json',
//         'Authorization': `Bearer ${apiKey}`,
//       },
//     });

//     const generatedTopics = response.data.choices.map(choice => choice.text.trim());
//     return generatedTopics;
//   } catch (error) {
//     console.error('Error generating topics:', error); // Handle error scenarios
//   }
// }

///////////////////////////////
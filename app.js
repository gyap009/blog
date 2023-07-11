require('dotenv').config();

const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const path = require('path');
const mongoose = require('mongoose');
const lodash = require("lodash");
const axios = require('axios');
const Post = require('./models/schema');
const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require("mongoose-findorcreate");

const app = express();
 
app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({extended: true}));
app.use('/static', express.static(path.join(__dirname, 'public')));
app.use("/images", express.static('images'));
app.use(session({
    secret: "Our little secret.",
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

const apiKey = process.env.OPENAI_API_KEY;
const apiUrl = 'https://api.openai.com/v1/engines/davinci-codex/completions';

////////////////////// Initialise MongoDB collection ///////////////////

mongoose.connect("mongodb://127.0.0.1:27017/personalBlogDB", {useNewUrlParser: true})
.then(() => {console.log('Connected to MongoDB');})
.catch((error) => {console.error('Error connecting to MongoDB:', error);});    

////////////////////// Authentication //////////////////
const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    googleId: String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy()); // Configure Passport/Passport-Local

// Only needed when using cookie sessions:
passport.serializeUser(function(user, cb) {
    process.nextTick(function() {
      return cb(null, {
        id: user.id,
        username: user.username,
        picture: user.picture
      });
    });
});
  
passport.deserializeUser(function(user, cb) {
    process.nextTick(function() {
      return cb(null, user);
    });
});

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/personalblog",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo" 
    },
    function(accessToken, refreshToken, profile, cb) {
        // console.log(profile);
        User.findOrCreate({googleId: profile.id}, function (err, user) {
            return cb(err, user);
        });
    }
));

////////////////////// Routes //////////////////////

app.get("/", function(req,res){
    res.render("login");
})

app.get('/auth/google',
    // Use passport to authenticate user using google Strategy as outlined above
    passport.authenticate('google', { scope: ["profile"] })
);

app.get("/auth/google/personalblog", 
    passport.authenticate('google', { failureRedirect: "/" }),
    function(req, res) {
        // Successful authentication, redirect to secrets.
        res.redirect("/home");
});

app.get("/register", function(req, res){
    res.render("register");
})

// Save user-information to database
app.post("/register", function(req, res) {
    // use method from passport-local-mongoose package
    User.register({username: req.body.email}, req.body.password, function(err, user){
        if (err) {
            console.log(err);
            res.redirect("/register");
        } else {
            passport.authenticate("local")(req, res, function(){
                res.redirect("/home");
            });
        }
    })
});

app.post("/", function(req, res){
    const user = new User ({
        usename: req.body.username,
        password: req.body.password
    });

    // Use Passport to login and authenticate
    req.login(user, function(err) {
        if (err) { 
            console.log(err); 
        } else {
            passport.authenticate("local")(req, res, function(){
                res.redirect("/");
            });
        } 
    });
})

app.get("/compose", function(req, res){
    res.render("compose")
})

app.post("/compose", function(req, res) {
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

app.get("/home", function(req, res) {
    if (req.isAuthenticated()){
        Post.find({})
        .then(function(posts){ 
            res.render("home", {posts:posts}); // Pass "Posts" collection to "home"
        }).catch(function(err){
            console.log(err);
        });
    } else {
        res.redirect("/");
    }
})

app.post("/home", function(req, res) {
    res.render("home");
})

app.get("/ideas", function(req, res) {
    res.render("ideas");
})

// app.post("/ideas", function(req, res) {
//     async function generateTopics(userInput) {
//         try {
//           const response = await axios.post(apiUrl, {
//             prompt: userInput,
//             max_tokens: 5, // Adjust the number of tokens to limit the length of generated topics
//             temperature: 0.7, // Adjust the temperature to control the randomness of the generated topics
//             n: 3, // Adjust the number of topics you want to generate
//           }, {
//             headers: {
//               'Content-Type': 'application/json',
//               'Authorization': `Bearer ${apiKey}`,
//             },
//           });
      
//           const generatedTopics = response.data.choices.map(choice => choice.text.trim());
//           console.log("topics: "+generateTopics);
//         } catch (error) {
//           console.error('Error generating topics:', error);
//         }
//       }

//     const userInput = req.body.inputIdea;
//     generateTopics(userInput) // Pass user input as the prompt
//     .then(topics => console.log("Here are the topics: " + topics)) // Receive response from the backend and store in a var "topics"
//     .catch(error => console.error("This is the error:" + error));

//     // const topicsList = req.body.topics-list;
//     // topicsList.innerHTML = ''; // Clear any existing content

//     // // Iterate over the topics and create list items
//     // topics.forEach(topic => {
//     //     const listItem = document.createElement('li');
//     //     listItem.textContent = topic;
//     //     topicsList.appendChild(listItem);
//     // });
// })

app.get("/posts/:postId", function(req, res){
    const requestedPostId = req.params.postId;
    // Find the post with a matching id in the "posts" collection, then render it      
    Post.findOne({_id: requestedPostId})
    .then(function(post){
        res.render("post", {
            title: post.title,
            date: post.date,
            content: post.content,
            postId: post._id,
        });
    }).catch(function(err){
        console.log(err);
    });
});

app.post("/posts/posts/:postId/delete", function(req,res) {
    const oldrequestedPostId = req.params.postId;
    const requestedPostId = oldrequestedPostId.substring(1, oldrequestedPostId.length);
    Post.deleteOne({_id: requestedPostId})
    .then(function(){
        console.log("Successfully deleted blog post.");
        res.redirect("/home");
    })
    .catch(function(){
        console.log("No documents matched the query.");
    });
})

app.get("/posts/:postId/edit", function(req,res) {
    const oldrequestedPostId = req.params.postId;
    const requestedPostId = oldrequestedPostId.substring(1, oldrequestedPostId.length);   
    Post.findOne({_id: requestedPostId})
    .then(function(post){
        res.render("edit", {
            title: post.title,
            date: post.date,
            content: post.content,
            postId: post._id,
        });
    }).catch(function(err){
        console.log(err);
    });
})

app.post("/posts/:postId/edit", function(req, res) {
    const oldrequestedPostId = req.params.postId;
    const requestedPostId = oldrequestedPostId.substring(1, oldrequestedPostId.length);
    console.log("post id is: "+oldrequestedPostId);
    
    Post.findOneAndUpdate({_id: oldrequestedPostId}, {$set: {title: req.body.title, date: req.body.date, content: req.body.content}}, { returnOriginal: false }, {new: false})
    .then(function(post){
        console.log('Post updated successfully after edit made:', post);
        res.redirect("/home");
    }).catch(function(err){
        console.log("WRONG: " + requestedPostId);
        console.log("Error is at edit-POST: ")
        console.log(err);
    });
})

app.get('/logout', function(req, res){
    req.logout(function(err) {
      if (err) { console.log(err); }
      res.redirect('/');
    });
});

app.listen(3000, function() {
    console.log("Server started on port 3000");
});
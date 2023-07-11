const { ObjectId } = require('mongodb');
const mongoose = require('mongoose');
const postSchema = new mongoose.Schema ({
    title: String,
    date: Date,
    content: String,
});

const Post = new mongoose.model("post", postSchema); // "posts" collection

module.exports = Post;

// export default Mongoose.models?.Post || Mongoose.model("Post", postSchema);
const mongoose = require('mongoose')
const connectDB = async()=>{
    await mongoose.connect('mongodb+srv://ketan:l40c1rBPQ95qaIyi@cluster0.b7jzqx6.mongodb.net/skillsync')
}

module.exports = {connectDB}
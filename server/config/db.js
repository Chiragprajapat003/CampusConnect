const mongoose = require('mongoose');

const connectDB = async () => {
    try{
        const connection = await mongoose.connect(process.env.MONGO_URI);

        console.log(`mongodb connected successful : ${connection.connection.host}`)

    }catch(error){
        console.log("mongodb connection error",error.message);
        process.exit(1);
    }
};


module.exports = connectDB; 
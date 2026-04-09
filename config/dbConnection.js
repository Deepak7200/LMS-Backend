// these two lines 🥲 found in very long time, not possible to connect atlas without them
import dns from "dns";
import mongoose from "mongoose";

dns.setServers(["1.1.1.1", "8.8.8.8"]);
mongoose.set('strictQuery',true); // default in mongoose 7+ versions

// Connecting and check connection stablished or not
// 2 ways to check : 1) .then like 4.express/5.js  2) async/await
const connectionToDB = async () => {
    try{
        const {connection} = await mongoose.connect(
            process.env.MONGO_URL || `mongodb://localhost:27017/config`
        );
    
        if(connection){
            console.log(`Connected to MongoDB: ${connection.host}`);
        }
    } catch(e) {
        console.log(e);
        process.exit(1); // database hi connect nhi hei, to aage jake kya kroge. (Can add retry also)
    }
} 

export default connectionToDB;
const mongoose = require("mongoose")
 
mongoose.connect(process.env['MONGODB_URI'], { useNewUrlParser: true, useUnifiedTopology: true }).then(() => {
  console.log('database Conectada com sucesso! 👌')
}) 

const schemaudb = mongoose.Schema({
    name: String,
    id: String,
    pfp: { type: String, default: `https://media.discordapp.net/attachments/730426604228050945/951817926921580594/unknown.png`},
    banner: { type: String},
    favs: Array
});

let a = new mongoose.model("User", schemaudb)
exports.User = a
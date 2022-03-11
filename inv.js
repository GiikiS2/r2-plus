const mongoose = require("mongoose")

mongoose.connect(process.env['MONGODB_URI'], {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log('inventario Conectado com sucesso! 👌')
})

const schemaudb = mongoose.Schema({
    nome: String,
    link: String,
    id: String,
    series: Array,
    pfp: String
});

let a = new mongoose.model("Inv", schemaudb)
exports.Inv = a
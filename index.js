var express = require("express");
var app = express();

let config = require("./config.json");
require('dotenv').config()

app.set("view engine", "ejs");
app.use(express.static(__dirname + "/public"));
app.use("/js", express.static(__dirname + "/js"));
app.use("/css", express.static(__dirname + "/css"));
app.use("/assets", express.static(__dirname + "/assets"));
app.use(express.json())
app.use(express.urlencoded({
    extended: true
}))

const FormData = require("form-data");
const fetch = require("node-fetch");
const axios = require("axios")

const https = require('https');

app.use(require("express-session")(config.session));

const pdi = require("./inv");

const pdb = require("./db");

require("./back")

app.get("/login/callback", async (req, resp) => {
    const accessCode = req.query.code;
    if (!accessCode) return resp.send("No access code specified");

    const data = new FormData();
    data.append("client_id", process.env["clientid"]);
    data.append("client_secret", process.env["clientsecret"]);
    data.append("grant_type", "authorization_code");
    data.append("redirect_uri", process.env["redirect"]);
    data.append("scope", "identify");
    data.append("code", accessCode);

    const json = await (
        await fetch("https://discord.com/api/oauth2/token", {
            method: "POST",
            body: data,
        })
    ).json();
    req.session.bearer_token = json.access_token;


    const user = await fetch(`https://discord.com/api/users/@me`, {
        headers: {
            Authorization: `Bearer ${req.session.bearer_token}`
        },
    });

    const ruser = await user.json();

    if (ruser.id) {
        console.log(ruser.id, ruser.username + " logou")
    } else {
        console.log("usuario desconhecido logou")
    }

    if (!await pdb.User.findOne({
            id: ruser.id
        })) {
        console.log("usuario não encontrado na db")
        if (!ruser.id) {
            consoel.log("db não criada por falta de informação")
        } else {
            let pfp = `https://cdn.discordapp.com/avatars/${ruser.id}/${ruser.avatar}.png?size=256`

            await pdb.User.create({
                name: ruser.username,
                id: ruser.id,
                pfp: pfp,
                favs: []
            });
        }
        if (await pdb.User.findOne({
                id: ruser.id
            })) {
            console.log("db criada")
        }
    }

    resp.redirect("/user?id=" + ruser.id);
});

app.get("/login", (req, res) => {
    res.redirect(`https://discord.com/api/oauth2/authorize` +
        `?client_id=${process.env["clientid"]}` +
        `&redirect_uri=${process.env["redirect"]}` +
        `&response_type=code&scope=identify%20guilds`)
});

app.get("/", async function (req, res) {
    const user = await fetch(`https://discord.com/api/users/@me`, {
        headers: {
            Authorization: `Bearer ${req.session.bearer_token}`
        },
    }); // Fetching user data
    const json = await user.json();

    res.render("../views/home.ejs", {
        req,
        json
    });
});

function videoid(url) {
    var regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    var match = url.match(regExp);
    return (match && match[7].length == 11) ? match[7] : false;
}

function channelid(str) {
    var pattern = /youtube.com\/channel\/([^#\&\?]*).*/;
    var match = str.match(pattern);
    return match[1]
}

function playlistId(str) {
    let pattern = /[&?]list=([^&]+)/i;
    var match = str.match(pattern);
    return match[1]
}

function getpfp(str) {
    var pattern = /youtube.com\/channel\/([^#\&\?]*).*/;
    var match = str.match(pattern);
    let json = `https://youtube.googleapis.com/youtube/v3/channels?part=snippet&id=${match[1]}&key=${process.env["ytkey"]}`
    axios.get(json).then(res => {
        let pfp = res.data.items[0].snippet.thumbnails.medium.url || "https://i.kym-cdn.com/entries/icons/original/000/034/421/cover1.jpg";
        return pfp;
    })
}

app.get("/streaming", async function (req, res) {

    const {
        type
    } = req.query;

    const duser = await fetch(`https://discord.com/api/users/@me`, {
        headers: {
            Authorization: `Bearer ${req.session.bearer_token}`
        },
    }); // Fetching user data
    const json = await duser.json();

    let user = await pdb.User.findOne({
        id: json.id
    })

    if (type === "canais") {

        let lol = await pdi.Inv.find({})

        res.render("../views/canais.ejs", {
            req,
            json,
            type,
            videoid,
            channelid,
            lol
        });
    } else {

        let canalrandom = Math.floor(Math.random() * pdi.Inv.length);

        let inv = await pdi.Inv.find({})

        let canal = inv[canalrandom]

        let serierandom = Math.floor(Math.random() * canal.series.length);
        let titulo = canal.series[serierandom]

        res.render("../views/series.ejs", {
            req,
            json,
            type,
            videoid,
            user,
            pdi,
            titulo,
            inv
        });
    }
});

app.get("/serie", async function (req, res) {

    const {
        serieu
    } = req.query;

    if (!serieu) res.redirect("/")

    const duser = await fetch(`https://discord.com/api/users/@me`, {
        headers: {
            Authorization: `Bearer ${req.session.bearer_token}`
        },
    }); // Fetching user data
    const json = await duser.json();

    let user = await pdb.User.findOne({
        id: json.id
    })

    let lol = await pdi.Inv.find({})

    let canal = lol.filter(yt => yt.series.some(s => s.nome === serieu));

    const titulo = canal[0].series.find(s => s.nome === serieu);

    res.render("../views/serie.ejs", {
        req,
        json,
        videoid,
        serieu,
        canal,
        titulo,
        playlistId
    })
});

app.get("/user", async function (req, res) {

    const user = await fetch(`https://discord.com/api/users/@me`, {
        headers: {
            Authorization: `Bearer ${req.session.bearer_token}`
        },
    }); // Fetching user data
    const json = await user.json();

    const {
        id
    } = req.query;

    if (!await pdb.User.findOne({
            id: id
        })) {
        res.redirect("/")
    } else {
        let user = await pdb.User.findOne({
            id: id
        })

        if (!await pdi.Inv.findOne({
                id: user.id
            })) {
            resu = false
        } else {
            resu = true
        }

        let lol = await pdi.Inv.find({})

        function serief(seriep) {
            const result = lol.filter(yt => yt.series.some(s => s.nome === seriep));
            const serie = result[0].series.find(s => s.nome === seriep)
            return serie
        }

        res.render("../views/perfil.ejs", {
            req,
            json,
            user,
            pdi,
            videoid,
            id,
            resu,
            serief
        });
    }


});

app.post('/fav', async function (req, res, next) {

    if (!req.session.bearer_token) {
        return res.redirect("/streaming")
    }

    const duser = await fetch(`https://discord.com/api/users/@me`, {
        headers: {
            Authorization: `Bearer ${req.session.bearer_token}`
        },
    }); // Fetching user data
    const json = await duser.json();

    let user = await pdb.User.findOne({
        id: json.id
    })

    let sen = req.body.serie

    if (req.body.fav) {
        //favoritou
        await pdb.User.findOneAndUpdate({
            id: user.id
        }, {
            $push: {
                favs: sen
            }
        });
    } else {
        //retirar dos favs
        if (user.favs.some(s => s === sen)) {
            await pdb.User.findOneAndUpdate({
                id: user.id
            }, {
                $pull: {
                    favs: sen
                }
            });
        }

    }
})

app.get("/api/catalago", async function (req, res) {
    let catalago = require("./collections/inventario.json")
    res.send(catalago)
});

app.get("/api/users", async function (req, res) {
    let catalago = require("./collections/users.json")
    res.send(catalago)
});

app.get("*", async function (req, res) {
    res.redirect("/")
});

const server = app.listen(process.env.PORT || 1370, () => {
    const port = server.address().port;
    console.log(`Express is working on port ${port}`);
});
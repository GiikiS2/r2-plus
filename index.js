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

const {
    Database
} = require('simpl.db');
const db = new Database();

const inv = require('./collections/inventario.json')

const Users = db.createCollection('users');

const inventario = db.createCollection('inventario');


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

    if (!Users.get(user => user.id === ruser.id)) {
        console.log("usuario não encontrado na db")
        if (!ruser.id) {
            consoel.log("db não criada por falta de informação")
        } else {
            let pfp = `https://cdn.discordapp.com/avatars/${ruser.id}/${ruser.avatar}.png?size=256`

            Users.create({
                name: ruser.username,
                id: ruser.id,
                pfp: pfp,
                favs: []
            });
        }
        if (Users.get(user => user.id === ruser.id)) {
            console.log("db criada")
        }
    }

    resp.redirect("/user?id="+ruser.id);
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


inv.forEach(canal => {
    let json = `https://youtube.googleapis.com/youtube/v3/channels?part=snippet&id=${channelid(canal.link)}&key=${process.env["ytkey"]}`
    axios.get(json).then(res => {
        let pfp = res.data.items[0].snippet.thumbnails.medium.url || "https://i.kym-cdn.com/entries/icons/original/000/034/421/cover1.jpg";
        if (!canal.pfp) {
            inventario.update(
                user => user.pfp = pfp,
                target => target.nome === canal.nome
            )
        } else if (canal.pfp !== pfp) {
            inventario.update(
                user => user.pfp = pfp,
                target => target.nome === canal.nome
            )
        }
    })
})

inv.forEach(canal => {
    canal.series.forEach(r2d2 => {

        r2d2.temps.forEach(tempse => {

            axios.get(`https://youtube.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${playlistId(tempse.link)}&key=${process.env["ytkey"]}`).then(res => {
                inventario.update(
                    a => a.series.forEach(b => {
                        b.temps.forEach(tempo => {
                            if (tempo.link === tempse.link) {
                                tempo.eps = res.data.items
                            }
                        })
                    })
                )
            })

        })

    })
})


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

    let user = Users.get(user => user.id === json.id)

    if (type === "canais") {
        res.render("../views/canais.ejs", {
            req,
            json,
            type,
            inv,
            videoid,
            channelid,
        });
    } else {
        res.render("../views/series.ejs", {
            req,
            json,
            type,
            inv,
            videoid,
            user,
            inventario
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

    let user = Users.get(user => user.id === json.id)

    const canal = inventario.get(yt => yt.series.some(s => s.nome === serieu));

    const titulo = canal.series.find(s => s.nome === serieu);

    res.render("../views/serie.ejs", {
        req,
        json,
        inv,
        videoid,
        serieu,
        inventario,
        canal,
        titulo,
        playlistId,
        https
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

    if (!Users.get(user => user.id === id)) {
        res.redirect("/")
    } else {
        let user = Users.get(user => user.id === id)

        res.render("../views/perfil.ejs", {
            req,
            json,
            inv,
            user,
            inventario,
            videoid,
            id
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

    let user = Users.get(user => user.id === json.id)

    let sen = req.body.serie

    if (req.body.fav) {
        //favoritou
        Users.update(
            user => user.favs.push(sen),
            target => target.id === user.id
        )
    } else {
        //retirar dos favs
        if (user.favs.some(s => s === sen)) {
            Users.update(
                user => user.favs = user.favs.filter(f => f !== sen),
                target => target.id === user.id
            )
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
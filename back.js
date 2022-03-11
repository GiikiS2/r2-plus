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


let lol = await pdi.Inv.find({})
lol.forEach(canal => {
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


ata()
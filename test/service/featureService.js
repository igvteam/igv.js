import * as http from "http"
import fs from "fs"

http.createServer(processQuery).listen(8080)


function processQuery(req, res) {

    const sIdx = req.url.lastIndexOf("/")
    const qIdx = req.url.lastIndexOf('?')
    const file = decodeURIComponent(req.url.substring(sIdx + 1, qIdx))
    const queryString = req.url.substring(qIdx + 1)
    const tokens = queryString.split('&')
    let chr, start, end
    for (let t of tokens) {
        const kv = t.split('=')
        switch (kv[0]) {
            case 'chr':
                chr = kv[1]
                break
            case 'start':
                start = kv[1]
                break
            case 'end':
                end = kv[1]
        }
    }

    res.writeHead(200, {'Content-Type': 'text/html', 'Access-Control-Allow-Origin': '*'})


    const allFileContents = fs.readFileSync(file, 'utf-8')
    const lines = allFileContents.split(/\r?\n/)
    for(let line of lines) {
        const tokens = line.split('\t')
        if(chr === tokens[0]) {
            const fStart = Number.parseInt(tokens[1])
            const fEnd = Number.parseInt(tokens[0])
            if(fStart > end) {
                break
            } else if(fEnd < start) {
                continue
            } else {
                res.write(line)
                res.write('\n')
            }
        }
    }

    res.end()
}


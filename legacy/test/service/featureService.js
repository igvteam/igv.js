import * as http from "http"
import fs from "fs"

http.createServer(processQuery).listen(8080)


function processQuery(req, res) {

    const sIdx = req.url.lastIndexOf("/")
    const qIdx = req.url.lastIndexOf('?')
    const file = decodeURIComponent(req.url.substring(sIdx + 1, qIdx))
    const queryString = req.url.substring(qIdx + 1)
    const tokens = queryString.split('&')
    let className, chr, start, end
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
                break
            case 'class':
                className = kv[1]
                break
        }
    }

    const extIdx  = file.lastIndexOf(".")
    let format = file.substring(extIdx + 1)

    res.writeHead(200, {'Content-Type': 'text/html', 'Access-Control-Allow-Origin': '*'})


    const seqnames = new Set()
    const allFileContents = fs.readFileSync(file, 'utf-8')
    const lines = allFileContents.split(/\r?\n/)
    for (let line of lines) {

        if ("header" === className) {
            if (line.startsWith("track") || line.startsWith("#")) {
                res.write(line)
                res.write('\n')
            } else {
                break
            }
        } else {
            if (line.startsWith("track") || line.startsWith("#")) continue
            const tokens = line.split('\t')
            if ("seqnames" === className) {
                seqnames.add(tokens[0])
            } else {
                if (chr === tokens[0]) {

                    let fStart, fEnd
                    switch(format) {
                        case "vcf":
                            const position = Number.parseInt(tokens[1])
                            fStart = position - 1
                            fEnd = position   //  Note - this really only works for snps
                            break
                        default:
                            fStart = Number.parseInt(tokens[1])
                            fEnd = Number.parseInt(tokens[2])
                    }
                    if (fStart > end) {
                        break
                    } else if (fEnd < start) {
                        continue
                    } else {
                        res.write(line)
                        res.write('\n')
                    }
                }
            }
        }
    }

    if ("seqnames" === className) {
        res.write(Array.from(seqnames).toString())
        res.write('\n')
    }

    res.end()
}


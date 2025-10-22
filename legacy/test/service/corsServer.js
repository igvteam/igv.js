// A simple server to test resources that do not include CORS headers.  For testing only.
// Example URL:  http://localhost:9615/downloads.pacbcloud.com/public/dataset/HG002-CpG-methylation-202202/HG002.GRCh38.haplotagged.bam

import * as http from "http"

http.createServer(async function (request, response) {

    const remoteURL = `https:/${request.url}`
    const headers = request.headers

    const remoteHeaders = {}
    if (headers["range"]) {
       remoteHeaders["range"] = headers["range"]
    }


    const res = await fetch(remoteURL, {
        method: "GET",
        headers: remoteHeaders,
        responseType: "arraybuffer"
    })

    const buffer = await res.arrayBuffer()

    const outgoingHeaders = {}
    outgoingHeaders['Access-Control-Allow-Origin'] = '*'
    for (const pair of res.headers.entries()) {
        if(pair[0].toLowerCase().startsWith("content-encoding")) continue
                outgoingHeaders[pair[0]] = pair[1]
    }

    const statusCode = remoteHeaders["range"] ? "206" : "200"
    response.writeHead(statusCode, outgoingHeaders)
    response.write(new Uint8Array(buffer))
    response.end()

}).listen(9615)

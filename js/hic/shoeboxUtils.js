import HicFile from "./straw/hicFile.js"


async function translateSession(juiceboxSession) {

    const jbBrowser = juiceboxSession.browsers[0]
    const igvSession = {}

    const hicFile = new HicFile({url: jbBrowser.url})
    await hicFile.readHeaderAndFooter()
    //`${this.chr1},${this.chr2},${this.zoom},${this.x},${this.y},${this.width},${this.height},${this.pixelSize}`


    igvSession.sampleNameViewportWidth = 20
    igvSession.genome = "hg38"  // TODO -- determine from hicfile

    const stateTokens = jbBrowser.state.split(",")
    const binSize = hicFile.bpResolutions[Number.parseInt(stateTokens[2])]
    const screenWidth = 1700  // Approximate guess
    const chrIdx = Number.parseInt(stateTokens[0])
    const start = Math.floor(Number.parseFloat(stateTokens[3]) * binSize) //- 100
    const end = start + Math.floor(screenWidth * binSize) //+ 100
    igvSession.locus = `${hicFile.chromosomes[chrIdx].name}:${start}-${end}`


    igvSession.tracks = (jbBrowser.tracks || []).filter(t => !(t.format === "refgene" || t.name === "cellType"))

    igvSession.tracks.push({
        type: "shoebox",
        url: jbBrowser.url,
        name: jbBrowser.name,
        colorScale: jbBrowser.colorScale,
        _hicFile: hicFile
    })

    return igvSession

}


export {translateSession}
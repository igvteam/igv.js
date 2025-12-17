/**
 * Handles incoming messages from the WebSocket connection.  Performs requested actions on the IGV browser instance
 * and returns a response message.
 *
 * @param json
 * @param browser
 * @returns {Promise<{uniqueID, message: string, status: string}>}
 */


export default async function handleMessage(json, browser) {

    const returnMsg = {uniqueID: json.uniqueID, status: 'ok'}

    try {
        let tracks
        const {type, args} = json
        switch (type.toLowerCase()) {

            case "goto":
            case "search":
                const term = args.locus || args.term
                const found = await browser.search(term)
                if (found) {
                    returnMsg.message = `Locus ${term} found and navigated to successfully`
                } else {
                    returnMsg.message = `Locus ${term} not found`
                    returnMsg.status = 'warning'
                }
                break

            case "currentloci":
                returnMsg.data = browser.currentLoci()
                returnMsg.message = `Retrieved current loci successfully`
                break

            case "visibilityChange":
                returnMsg.message = await browser.visibilityChange()
                break

            case "tojson":
                returnMsg.data = browser.toJSON()
                returnMsg.message = `Session serialized to JSON successfully`
                break

            case "compressedsession":
                returnMsg.data = browser.compressedSession()
                returnMsg.message = `Session serialized and compressed successfully`
                break

            case "tosvg":
                returnMsg.data = browser.toSVG()
                returnMsg.message = `Session exported to SVG successfully`
                break

            case "removetrackbyname": {
                let {trackName} = args
                if(trackName) {
                    tracks = browser.findTracks(t => trackName ? t.name === trackName : true)
                    if (tracks) {
                        tracks.forEach(t => browser.removeTrack(t))
                        returnMsg.message = `Removed track(s) ${trackName} for ${tracks.length} track(s)`
                    } else {
                        returnMsg.message = `No tracks found matching name ${trackName}`
                        returnMsg.status = 'warning'
                    }
                } else {
                    returnMsg.message = `No track name provided`
                    returnMsg.status = 'warning'
                }
                break
            }

            case "loadsampleinfo": {
                browser.loadSampleInfo(args)
                returnMsg.message = `Sample info loaded successfully`
                break
            }

            case "discardsampleinfo":
                browser.discardSampleInfo()
                returnMsg.message = `Sample info discarded successfully`
                break

            case "loadroi":
                browser.loadROI(args)
                returnMsg.message = `ROI loaded successfully`
                break

            case "clearrois":
                browser.clearROIs()
                returnMsg.message = `ROIs cleared successfully`
                break

            case "getuserdefinedrois":
                const rois = await browser.getUserDefinedROIs()
                returnMsg.data = rois
                returnMsg.message = `Retrieved ${rois.length} user-defined ROIs successfully`
                break

            case 'loadtrack': {
                const {url, indexURL} = args
                const track = await browser.loadTrack({url, indexURL})
                returnMsg.message = `Track ${track.name} loaded successfully`
                break
            }

            case "genome":
                const id = args.id
                await browser.loadGenome(id)
                returnMsg.message = `Genome ${id} loaded successfully`
                break

            case "loadsession":
                const url = args.url
                await browser.loadSession({url})
                returnMsg.message = `Session loaded successfully from ${url}`
                break

            case "zoomin":
                await browser.zoomIn()
                returnMsg.message = `Zoomed in successfully`
                break

            case "zoomout":
                await browser.zoomOut()
                returnMsg.message = `Zoomed out successfully`
                break

            case "setcolor":

                let {color, trackName} = args

                if (color.includes(",") && !color.startsWith("rgb(")) {
                    // Convert "R,G,B" to "rgb(R,G,B)"
                    color = `rgb(${color})`
                }

                tracks = browser.findTracks(t => trackName ? t.name === trackName : true)
                if (tracks) {
                    tracks.forEach(t => t.color = color)
                    browser.repaintViews()
                    returnMsg.message = `Set color to ${color} for ${tracks.length} track(s)`
                } else {
                    returnMsg.message = `No tracks found matching name ${trackName}`
                    returnMsg.status = 'warning'
                }

            case "renametrack":

                const {currentName, newName} = args

                tracks = browser.findTracks(t => currentName === t.name)
                if (tracks && tracks.length > 0) {
                    tracks.forEach(t => {
                        t.name = newName
                        browser.fireEvent('tracknamechange', [t])
                    })
                    returnMsg.message = `Renamed ${tracks.length} track(s) from ${currentName} to ${newName}`
                } else {
                    returnMsg.message = `No track found with name ${currentName}`
                    returnMsg.status = 'warning'
                }
                break

            default:
                returnMsg.message = `Unrecognized message type: ${type}`
                returnMsg.status = 'error'
        }
    } catch (err) {
        returnMsg.message = err?.message || String(err)
        returnMsg.status = 'error'
    }

    return returnMsg
}
// This file contains model code to integrate igv.js into the UCSC genome browser, specifically to support loading
// local files and sensitive URLs.  In this model the UCSC browser page is simulated with a static HTML page and
// some javascript to simulate page reloads and navigation.  The igv.js instance is created and inserted into the
// track image table in response to user selection of local files from a companion "file picker" window.  This window
// remains open while the UCSC browser page is in use, providing a cache of sorts for the local file blobs.  On
// page reload this cache can be used to restore igv.js track File references.
//
// Currently, igv.js tracks are removed using the "igv.js" gear menu.  When all igv.js tracks are removed the igv.js
// instance is removed from the page.  This is likely to be confusing to UCSC browser users, in a future version
// we will add a track control widget in the control area below the browser track image table, perhaps in the
// existing "Custom Tracks" category, or perhaps in a new category.

// Assumption - assuming "igv.js" and "igvFileHelper.js", which define the globals "igv" and "igvHelper" respectively,
// are included in the page with a script tag.

// Note: The UCSC browser does not use modules, so wrap code in a self-executing function to limit
// scope of variables to this file.

(function () {

    // Use constants for message channel types
    const MSG = {
        SELECTED_FILES: 'selectedFiles',
        RESTORE_FILES: 'restoreFiles',
        REMOVED_TRACK: 'removedTrack',
        LOAD_URL: 'loadURL',
        FILE_PICKER_READY: 'filePickerReady',
        PING: 'ping',
        PONG: 'pong'
    }

    let filePicker = null
    let igvBrowser = null

    // Channel for communicating with file picker window
    const channel = new BroadcastChannel('igv_file_channel')

    // Represents the current state of the UCSC browser page.  Its not clear yet how this obtained, this is just a placeholder.
    const ucscState = {
        genomeID: "hg19", locus: "chr1:155140000-155160000"
    }


    window.addEventListener("DOMContentLoaded", async () => {
        initializeDialog()
        setupUIEventListeners()
        await restoreSavedSession()
        addNavigationButtons()
    })

    // Restore the browser session from local storage, if possible. This includes UCSC state (locus) and igv.js state
    // This is a gross implification of UCSC session handling, but illustrates the basic idea of restoring igv.js state.
    async function restoreSavedSession() {

        const sessionString = localStorage.getItem("ucscSession")
        if (!sessionString) return

        let ucscSession
        try {
            ucscSession = JSON.parse(sessionString)
        } catch (e) {
            console.warn("Invalid ucscSession JSON", e)
            return
        }

        if (ucscSession.locus) {
            ucscState.locus = ucscSession.locus
        }

        const posEl = document.getElementById("positionDisplay")
        if (posEl) posEl.innerText = ucscState.locus

        if (!ucscSession.igvSession) return

        let igvSession
        try {
            const igvSessionString = igv.uncompressSession(`blob:${ucscSession.igvSession}`)
            igvSession = JSON.parse(igvSessionString)
        } catch (e) {
            console.warn("Failed to uncompress / parse IGV session", e)
            return
        }

        if (igvSession.tracks) {
            try {
                const failed = await igvHelper.restoreTrackConfigurations(igvSession.tracks)
                if (failed.length > 0) {

                    const sendRestoreRequest = () => channel.postMessage({type: "restoreFiles", files: failed})

                    if (filePicker && !filePicker.closed) {
                        sendRestoreRequest()
                        filePicker.focus()
                        return
                    }

                    if (filePicker) {
                        // Unexpected: reference exists but window is closed.
                        showDialog(
                            `The following file connections could not be restored:\n<ul>${failed.map(f => `<li>${f.name}</li>`).join("")}</ul>\nTo restore the connection select the files in the file picker.`
                        )
                        sendRestoreRequest()
                    } else {
                        sessionStorage.setItem("filesToRestore", JSON.stringify(failed))
                        showDialog(
                            `The following file connections could not be restored:\n<ul>${failed.map(f => `<li>${f.name}</li>`).join("")}</ul>\nTo restore the connection open the file picker and select the files.`,
                            {
                                "Open File Picker": function () {
                                    $(this).dialog("close")
                                    filePicker = window.open(
                                        "file-picker.html",
                                        "filePicker" + Date.now(),
                                        "width=600,height=800"
                                    )
                                }
                            }
                        )
                    }
                }
            } catch (e) {
                console.warn("Failed restoring track configurations", e)
            }
        }

        igvSession.locus = ucscState.locus
        await createIGVBrowser(igvSession)
    }

    // Initialize a jQuery UI dialog used for user messages.
    function initializeDialog() {
        $("#myAlertDialog").dialog({
            autoOpen: false,
            modal: true,
            position: {my: "center", at: "center", of: $("#imgTbl")}
        })
    }

    function setupUIEventListeners() {

        // The "Add IGV track" button handler.  Tracks are added from the filePicker page by selecting track files.
        document.getElementById('igv_track_add').addEventListener('click', async function () {
            if (filePicker && !filePicker.closed) {
                filePicker.focus()
                return
            }
            // A filePicker might be open from a previous instance of this page.  We can detect this by sending
            // a message on the channel and waiting briefly for a response, but we cannot get a reference to the window
            // so we ask the user to bring it to the front.
            const responded = await pingFilePicker(channel)
            if (responded) {
                showDialog("File picker is already open. Please switch to that window.")
            } else {
                filePicker = window.open('file-picker.html', 'filePicker' + Date.now(), 'width=600,height=600')
            }
        })

        // Button for testing -- remove igvBrowser and clear local storage
        document.getElementById("clearTracks").addEventListener("click", function () {
            if (igvBrowser) {
                igvBrowser.removeAllTracks()
                igvBrowser = null
            }
            localStorage.removeItem("ucscSession")
        })
    }


    // Detect a page refresh (visibility change to hidden) and save the session to local storage.  This is meant to
    // simulate  UCSC browser session handling.
    document.onvisibilitychange = () => {
        if (document.visibilityState === "hidden") {
            const ucscSession = Object.assign({}, ucscState) // Obviously a gross simplification here.
            if (igvBrowser) {
                ucscSession.igvSession = igvBrowser.compressedSession()
            }
            localStorage.setItem("ucscSession", JSON.stringify(ucscSession))
        }
    }


    /**
     * Create an IGV browser instance and insert it into the image table as a new row. The IGV browser essentially becomes
     * a track in the UCSC browser context.  This function is called when the user adds the first IGV track, or
     * the igv session is restored on page reload.
     *
     * @param config -- The IGV browser configuration object.  Must include a reference genome, but might also include
     *                  an initial locus or tracks.
     * @returns {Promise<Browser>}
     */
    async function createIGVBrowser(config) {

        // Insert the IGV row into the image table.
        const imgTbl = document.getElementById('imgTbl')
        const tbody = imgTbl.querySelector('tbody')
        const igvRow = document.createElement('tr')
        igvRow.id = 'tr_igv'
        igvRow.innerHTML = `
                        <td style="background: grey">
                            <div style="width:13px"></div>
                        </td>
                        <td style="background: #24d6ff">
                            <div style="width: 140px;">blank</div>
                        </td>
                        <td>
                            <div id="igv_div" style="width: auto"></div>
                        </td>
                    `
        tbody.appendChild(igvRow)

        // Ammend the config to remove most of the IGV widgets.  We only want the track display area.
        Object.assign(config, {
            showNavigation: false, showIdeogram: false, showRuler: false, showSequence: false, showAxis: false
            //TODO discuss if we want IGV track drag handles.  It allows users to rearrange IGV tracks within the IGV area
            //showTrackDragHandles: false
        })

        const div = document.getElementById("igv_div")
        igvBrowser = await igv.createBrowser(div, config)

        // Add event handler to remove IGV row from table if all IGV tracks are removed.
        igvBrowser.on('trackremoved', function (track) {

            channel.postMessage({type: "removedTrack", config: track.config})

            const allTracks = igvBrowser.findTracks(t => true)
            if (allTracks.length === 0) {
                igvRow.remove()
                igvBrowser = null
            }
        })

        // Add event handler to track igv.js track dragging (locus change).  On the UCSC side this should be treated
        // as if the user had dragged a track image
        igvBrowser.on('locuschange', referenceFrameList => {
            // We are currently not supporting multi-locus view, so there is a single reference frame.
            const locusString = referenceFrameList[0].getLocusString()
            ucscState.locus = locusString
            document.getElementById("positionDisplay").innerText = locusString
        })
        return igvBrowser
    }

    // Respond to messages from the filePicker window.
    channel.onmessage = async function (event) {
        const msg = event.data
        if (!msg || !msg.type) return

        switch (msg.type) {

            case MSG.SELECTED_FILES:
                await handleSelectedFiles(msg.files)
                break

            case MSG.LOAD_URL:
                if (igvBrowser) {
                    igvBrowser.loadTrack(msg.config)
                }
                break

            case MSG.FILE_PICKER_READY: {
                const filesToRestore = JSON.parse(sessionStorage.getItem('filesToRestore'))
                if (filesToRestore) {
                    channel.postMessage({type: MSG.RESTORE_FILES, files: filesToRestore})
                    sessionStorage.removeItem('filesToRestore')
                }
                break
            }

            // case MSG.PONG: // (optional handling)
            //     break
        }
    }

    async function handleSelectedFiles(files) {

        // Convert file descriptor objects to igv.js track configuration objects.
        const configs = igvHelper.getTrackConfigurations(files)

        if (configs.length > 0) {

            // Create igvBrowser if needed -- i.e. this is the first track being added.  State needs to be obtained
            // from the UCSC browser for genome and locus.
            if (!igvBrowser) {
                const defaultConfig = {
                    reference: getMinimalReference(ucscState.genomeID), locus: ucscState.locus
                }
                await createIGVBrowser(defaultConfig)
            }

            // First search for existing tracks referencing the same files.  This is to handle the situation
            // of a user closing the file picker window, thus loosing file references, then reopening the file picker
            // to restore them.
            const newConfigs = []

            for (let config of configs) {

                const matchingTracks = igvBrowser.findTracks(t => t.url && config.url.id === t.url.id)
                if (matchingTracks.length > 0) {
                    // Just select the first matching track, there should only be one.  Restore its file reference(s).
                    matchingTracks[0].config.url.file = config.url.file
                    if (config.indexURL) {
                        matchingTracks[0].config.indexURL.file = config.indexURL.file
                    }
                } else {
                    // This is a new track
                    newConfigs.push(config)
                }
            }

            igvBrowser.loadTrackList(newConfigs)
        }
    }


    /**
     * Opens a modal dialog with a message and custom buttons.
     * @param {string} message - The HTML message to display.
     * @param {Object} [buttons] - An object where keys are button labels and values are click handler functions.
     */
    function showDialog(message, buttons) {
        $("#myAlertDialog").html(message)
        const buttonsToShow = buttons || {
            "OK": function () {
                $(this).dialog("close")
            }
        }
        $("#myAlertDialog").dialog("option", "buttons", buttonsToShow).dialog("open")
    }


    /**
     * Send a "ping" message to the file picker window and wait up to 100 msec for a "pong" response.  Used to
     * determine if a file picker window is already open.
     * @param channel
     * @returns {Promise<unknown>}
     */
    async function pingFilePicker(channel) {
        const waitForResponse = new Promise((resolve) => {
            const originalOnMessage = channel.onmessage
            channel.onmessage = (event) => {
                if (event.data && event.data.type === "pong") {
                    channel.onmessage = originalOnMessage
                    resolve(true)
                }
            }
            setTimeout(() => {
                channel.onmessage = originalOnMessage
                resolve(false)
            }, 100)
        })

        channel.postMessage({type: "ping"})

        const responded = await waitForResponse
        return responded
    }

    /**
     * Return a minimal reference object for the given genomeID. We don't need or want default IGV tracks, only the
     * reference sequence.
     *
     * Eventually expand or reimplement this function to support all UCSC browser genomes.
     *
     * @param genomeID
     * @returns {{id: string, twoBitURL: string}}
     */
    function getMinimalReference(genomeID) {

        switch (genomeID) {
            case "hg19":
                return {
                    "id": "hg19", "twoBitURL": "https://hgdownload.soe.ucsc.edu/goldenPath/hg19/bigZips/hg19.2bit",
                }
            case "hg38":
                return {
                    "id": "hg38", "twoBitURL": "https://hgdownload.soe.ucsc.edu/goldenPath/hg38/bigZips/hg38.2bit",
                }
            case "mm10":
                return {
                    "id": "mm10", "twoBitURL": "https://hgdownload.soe.ucsc.edu/goldenPath/mm10/bigZips/mm10.2bit",
                }
            case "mm39": // GRCm39
                return {
                    "id": "mm39", "twoBitURL": "https://hgdownload.soe.ucsc.edu/goldenPath/mm39/bigZips/mm39.2bit",
                }
            default:
                throw new Error(`Unsupported genomeID: ${genomeID}`)
        }
    }

    /**
     * Parse a UCSC style locus string, e.g. chr1:155140000-155160000, into its components.
     * @param locusString
     * @returns {{chr: *, start: number, end: number}}
     */
    function parseLocusString(locusString) {
        const tokens = locusString.split(/[:-]/)
        if (tokens.length === 3) {
            const chr = tokens[0]
            const start = parseInt(tokens[1].replace(/,/g, ''))
            const end = parseInt(tokens[2].replace(/,/g, ''))
            if (isNaN(start) || isNaN(end) || start < 0 || end <= start) {
                throw new Error(`Invalid locus string: ${locusString}`)
            }
            return {chr, start, end}
        } else {
            throw new Error(`Invalid locus string: ${locusString}`)
        }
    }


    // Code below is for testing only, not part of the UCSC integration, it simulates form submission from the navigation buttons
    function addNavigationButtons() {
        const moveButtons = [["hgt.left3", -0.95], ["hgt.left2", -0.475], ["hgt.left1", -0.1], ["hgt.right1", 0.1], ["hgt.right2", 0.475], ["hgt.right3", 0.95]]
        moveButtons.forEach(function (item) {
            document.getElementById(item[0]).addEventListener('click', function () {
                const l = parseLocusString(ucscState.locus)
                const width = l.end - l.start
                const shift = width * item[1]
                const newStart = Math.max(0, Math.round(l.start + shift))
                const newEnd = newStart + width
                const locusString = `${l.chr}:${newStart}-${newEnd}`
                // Update UCSC state with new locus and refresh page -- this is simulating a form submission in the UCSC browser
                // The session state (local storage) is updated on page hide (see above)
                ucscState.locus = locusString
                window.location.reload()

            })
        })

        const zoomButtons = [["hgt.in1", 1.5], ["hgt.in2", 3], ["hgt.in3", 10], ["hgt.inBase", "base"], ["hgt.out1", 1 / 1.5], ["hgt.out2", 1 / 3], ["hgt.out3", 1 / 10], ["hgt.out4", 1 / 100]]
        zoomButtons.forEach(function (item) {
            document.getElementById(item[0]).addEventListener('click', function () {
                const l = parseLocusString(ucscState.locus)
                const center = (l.start + l.end) / 2
                const width = l.end - l.start
                const newWidth = item[1] === "base" ? 100 : Math.max(100, Math.round(width / item[1]))
                const newStart = Math.max(0, Math.round(center - newWidth / 2))
                const newEnd = newStart + newWidth
                const locusString = `${l.chr}:${newStart}-${newEnd}`
                // Update UCSC state with new locus and refresh page -- this is simulating a form submission in the UCSC browser
                // The session state (local storage) is updated on page hide (see above)
                ucscState.locus = locusString
                window.location.reload()

            })
        })
    }

})()
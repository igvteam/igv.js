// Helper functions for using igv.js with local files in the UCSC genome browser
//
// The UCSC browser does not use modules, so wrap code in a self-executing function to limit
// scope of variables to this file.

(function () {
    const indexExtensions = new Set(['bai', 'csi', 'tbi', 'idx', 'crai'])
    const requireIndex = new Set(['bam', 'cram'])

    const channel = new BroadcastChannel('igv_file_channel')

    /**
     * Given a list of files, return a list of track configurations.  Each configuration contains a url (MockFile) and
     * optionally an indexURL (MockFile).
     * @param files
     * @returns {*[]}
     */
    function getTrackConfigurations(files) {

        // Index look up table, key is the data file name, value is {id, file}
        const indexLUT = new Map()

        // Separate data files from index files
        const dataFiles = []
        for (let {id, file} of files) {

            const name = file.name
            const {dataPath, extension} = getExtension(name)

            if (indexExtensions.has(extension)) {
                // key is the data file name
                const key = dataPath
                indexLUT.set(key, {id, file})
            } else {
                dataFiles.push({id, file})
            }
        }

        // Now create configurations, matching index files when possible
        const configurations = []
        for (let {id, file} of dataFiles) {

            const filename = file.name
            const {extension} = getExtension(filename)

            if (indexLUT.has(filename)) {

                const indexURL = indexLUT.get(filename)

                configurations.push({
                    url: new MockFile(id, file),
                    indexURL: new MockFile(indexURL.id, indexURL.file)
                })

            } else if (requireIndex.has(extension)) {
                throw new Error(`Unable to load track file ${filename} - you must select both ${filename} and its corresponding index file`)
            } else {
                configurations.push({url: new MockFile(id, file)})
            }

        }
        return configurations
    }

    /**
     * Given a file name return the data path (file name without extension) and the extension.  If no extension
     * is present the extension is the empty string.
     *
     * @param name
     * @returns {{dataPath, extension: string}|{dataPath: string, extension: string}}
     */
    function getExtension(name) {
        const idx = name.lastIndexOf('.')

        if (idx > 0) {
            let dataPath = name.substring(0, idx)
            const extension = name.substring(idx + 1)

            // Special case for Picard  file convention
            if ('bai' === extension && !dataPath.endsWith('.bam')) {
                dataPath = dataPath + '.bam'
            } else if ('crai' === extension && !dataPath.endsWith('.cram')) {
                dataPath = dataPath + '.cram'
            }

            return {dataPath, extension}
        } else {
            return {
                dataPath: name,
                extension: ''
            }
        }
    }

    async function restoreTrackConfigurations(trackConfigurations) {
        const failed = []
        for (let config of trackConfigurations) {

            if (config.url && 'MockFile' === config.url.type) {
                const {id, name} = config.url
                const file = await restoreFile(id)
                if (!file) {
                    failed.push({id, name})
                }
                config.url = new MockFile(id, file, name)
            }
            if (config.indexURL && 'MockFile' === config.indexURL.type) {
                const {id, name} = config.indexURL
                const file = await restoreFile(id)
                if (!file) {
                    failed.push({id, name})
                }
                config.indexURL = new MockFile(id, file, name)
            }
        }
        return failed
    }

    /**
     * Attempt to restore a File object given its id by sending a "getFile" message on the BroadcastChannel and waiting for
     * a "file" message in response.  If no response is received within 1 second undefined is returned.
     *
     * @param id
     * @returns {Promise<unknown>}
     */
    async function restoreFile(id) {
        return new Promise((resolve, reject) => {

            const previousOnMessage = channel.onmessage
            const timeoutId = setTimeout(() => {
                cleanup()
                console.error(`Timeout waiting for file with id: ${id}`)
                resolve(undefined)
            }, 1000)

            function cleanup() {
                channel.onmessage = previousOnMessage
                clearTimeout(timeoutId)
            }

            channel.onmessage = function (event) {
                try {
                    const msg = event.data
                    if (msg.type === 'file') {
                        cleanup()
                        resolve(msg.data)
                    }
                } catch (error) {
                    cleanup()
                    console.error(error)
                    resolve(undefined)
                }
            }

            channel.postMessage({type: 'getFile', id})
        })
    }

    /**
     * A mock File object that wraps a real File object.  The purpose of this class is to provide a stable
     * identifier (id) for the file that can be used to restore the File object on page refresh. The object
     * looks like a File object to igv.js but has an extra "id" attribute.
     */
    class MockFile {

        constructor(id, file, name) {
            this.id = id
            this.file = file
            this.name = name || (file ? file.name : undefined)
            this.type = 'MockFile'
        }

        slice(start, end) {
            return this.file.slice(start, end)
        }

        async text() {
            return this.file.text()
        }

        async arrayBuffer() {
            return this.file.arrayBuffer()
        }
    }


    // Emulate an export, of sorts, functions listed here will be available to other files as members of igvHelper
    window.igvHelper = {
        getTrackConfigurations,
        restoreTrackConfigurations
    }

})()

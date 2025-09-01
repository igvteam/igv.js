
const indexExtensions = new Set(['bai', 'csi', 'tbi', 'idx', 'crai', 'fai'])
const requireIndex = new Set(['bam', 'cram', 'fa', 'fasta'])

/**
 * Given a list of files, return a list of track configurations.  Each configuration contains a url (MockFile) and
 * optionally an indexURL (MockFile).
 * @param files
 * @returns {*[]}
 */
function getTrackConfigurations  (files) {

    // Search for index files  (.bai, .csi, .tbi, .idx)
    const indexLUT = new Map()

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

    const configurations = []

    for (let {id, file} of dataFiles) {

        const filename = file.name
        const {dataPath, extension} = getExtension(filename)

        if (indexLUT.has(filename)) {

            const indexURL = indexLUT.get(filename)

            configurations.push({
                url: new MockFile(id, file),
                indexURL: new MockFile(indexURL.id, indexURL.file)
            })

        } else if (requireIndex.has(extension)) {
            throw new Error(`Unable to load track file ${filename} - you must select both ${filename} and its corresponding index file`)
        } else {
            configurations.push({url: new MockFile(file.id, file.file)})
        }

    }
    return configurations
}

function getExtension(name) {
    const idx = name.lastIndexOf('.')
    if (idx > 0) {
        return {
            dataPath: name.substring(0, idx),
            extension: name.substring(idx + 1)
        }
    } else {
        return {
            dataPath: name,
            extension: ''
        }
    }
}

class MockFile {

    static channel = new BroadcastChannel('igv_file_channel')

    constructor(id, file) {
        this.id = id
        this.file = file
        this.name = file ? file.name : undefined
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

    toJSON() {
        return {id: this.id, name: this.name, classname: 'MockFile'}
    }

}

async function restoreConfigurations(trackConfigurations) {
    const failed = []
    for (let config of trackConfigurations) {

        if (config.url && 'MockFile' === config.url.classname) {
            const file = await restoreFile(config.url.id)
            if (!file) {
                failed.push(config.url.name)
            }
            config.url = new MockFile(config.url.id, file)
        }
        if (config.indexURL && 'MockFile' === config.indexURL.classname) {
            const file = await restoreFile(config.indexURL.id)
            config.indexURL = new MockFile(config.indexURL.id, file)
        }
    }
    if (failed.length > 0) {
        alert(`The following file connections could not be restored: ${failed.join(',')}. 
        To restore the connection open the file picker and select the files.`)
    }
}

async function restoreFile(id) {
    return new Promise((resolve) => {
        const previousOnMessage = MockFile.channel.onmessage
        MockFile.channel.onmessage = async function (event) {
            const msg = event.data
            if (msg.type === 'file') {
                MockFile.channel.onmessage = previousOnMessage
                resolve(msg.data)
            }
        }
        setTimeout(() => {
            MockFile.channel.onmessage = previousOnMessage
            resolve(undefined)
        }, 1000)
        MockFile.channel.postMessage({type: 'getFile', id})
    })
}

// Emulate an export, of sorts
window.igvHelper = {
    getTrackConfigurations,
    restoreConfigurations,
    MockFile
}


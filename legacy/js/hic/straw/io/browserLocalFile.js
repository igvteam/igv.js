class BrowserLocalFile {

    constructor(blob) {
        this.file = blob
    }

    async read(position, length) {
        const file = this.file
        if (position !== undefined) {
            return file.slice(position, position + length).arrayBuffer()

        } else {
            return file.arrayBuffer()

        }
    }
}

export default BrowserLocalFile

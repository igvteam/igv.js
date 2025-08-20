export default class MockFile {

    static channel = new BroadcastChannel('file_channel')

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

    async restore() {
        const id = this.id
        return new Promise((resolve) => {
            MockFile.channel.onmessage = async function (event) {
                const msg = event.data
                if (msg.type === 'file') {
                    resolve(msg.data)
                }
            }
            MockFile.channel.postMessage({type: 'getFile', id})
        })
    }

    toJSON() {
        return {id: this.id, name: this.name, classname: 'MockFile'}
    }

    static async restoreConfigurations(trackConfigurations) {
        for (let config of trackConfigurations) {

            if (config.url && 'MockFile' === config.url.classname) {
                const file = await restoreFile(config.url.id)
                if(!file) {
                    alert(`Could not restore file for track ${config.name}, url: ${config.url}`)
                }
                config.url = new MockFile(config.url.id, file)
            }
            if (config.indexURL && 'MockFile' === config.indexURL.classname) {
                const file = await restoreFile(config.indexURL.id)
                config.indexURL = new MockFile(config.indexURL.id, file)
            }

        }
    }
}

async function restoreFile(id) {
    return new Promise((resolve) => {
        const previousOnMessage = MockFile.channel.onmessage;
        MockFile.channel.onmessage = async function (event) {
            const msg = event.data;
            if (msg.type === 'file') {
                MockFile.channel.onmessage = previousOnMessage;
                resolve(msg.data);
            }
        };
        setTimeout(() => {
            MockFile.channel.onmessage = previousOnMessage;
            resolve(undefined);
        }, 1000);
        MockFile.channel.postMessage({type: 'getFile', id})
    })
}
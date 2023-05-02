const isNode = typeof process !== 'undefined' && process.versions != null && process.versions.node != null

class RemoteFile {

    constructor(args) {
        this.config = args
        this.url = mapUrl(args.path || args.url)
    }


    async read(position, length) {

        length = Math.ceil(length)
        const headers = this.config.headers || {}
        const rangeString = "bytes=" + position + "-" + (position + length - 1)
        headers['Range'] = rangeString

        let url = this.url.slice()    // slice => copy
        headers['User-Agent'] = 'straw'
        if (this.config.oauthToken) {
            const token = resolveToken(this.config.oauthToken)
            headers['Authorization'] = `Bearer ${token}`
        }
        if (this.config.apiKey) {
            url = addParameter(url, "key", this.config.apiKey)
        }

        const response = await fetch(url, {
            method: 'GET',
            headers: headers,
            redirect: 'follow',
            mode: 'cors',

        })

        const status = response.status

        if (status >= 400) {
            console.error(`${status}  ${this.config.url}`)
            const err = Error(response.statusText)
            err.code = status
            throw err
        } else {
            return response.arrayBuffer()
        }

        /**
         * token can be a string, a function that returns a string, or a function that returns a Promise for a string
         * @param token
         * @returns {Promise<*>}
         */
        async function resolveToken(token) {
            if (typeof token === 'function') {
                return await Promise.resolve(token())    // Normalize the result to a promise, since we don't know what the function returns
            } else {
                return token
            }
        }

    }
}


function mapUrl(url) {

    if (url.includes("//www.dropbox.com")) {
        return url.replace("//www.dropbox.com", "//dl.dropboxusercontent.com")
    } else if (url.startsWith("ftp://ftp.ncbi.nlm.nih.gov")) {
        return url.replace("ftp://", "https://")
    } else {
        return url
    }
}


function addParameter(url, name, value) {
    const paramSeparator = url.includes("?") ? "&" : "?"
    return url + paramSeparator + name + "=" + value
}


export default RemoteFile
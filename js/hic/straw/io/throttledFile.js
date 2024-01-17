class ThrottledFile {

    constructor(file, rateLimiter) {
        this.file = file
        this.rateLimiter = rateLimiter
    }


    async read(position, length) {

        const file = this.file
        const rateLimiter = this.rateLimiter

        return new Promise(function (fulfill, reject) {
            rateLimiter.limiter(async function (f) {
                try {
                    const result = await f.read(position, length)
                    fulfill(result)
                } catch (e) {
                    reject(e)
                }
            })(file)
        })
    }
}


export default ThrottledFile;
export default class BufferCache {

    constructor({fetch, size = 100000000, chunkSize = 10000}) {
        this.fetch = fetch
        this.position = 0
        this.buffer = Buffer.allocUnsafe(0)
    }

    async get(outputBuffer, offset, length, position) {

        if (outputBuffer.length < offset + length) {
            throw new Error('output buffer not big enough for request')
        }

        if (position >= this.position + this.buffer.length || position + length <= this.position) {
            // No overlap
            const data = await this.fetch(position, length)
            this.buffer = Buffer.from(data)
            this.position = position
        } else if (position >= this.position && length <= this.buffer.length) {
            // complete overlap
        } else {
            // partial overlap
        }

        const targetStart = offset
        const sourceStart = position - this.position
        const sourceEnd = sourceStart + length

        this.buffer.copy(outputBuffer, targetStart, sourceStart, sourceEnd)
        this.buffer = Buffer.allocUnsafe(0)
    }
}

import {igvxhr} from "../../node_modules/igv-utils/src/index.js"
import {buildOptions} from "../util/igvUtils.js"
import BinaryParser from "../binary.js"

export default class DynamicBPTree {

    constructor(path, startOffset) {
        this.path = path
        this.startOffset = startOffset
    }

    async init() {
        const binaryParser = await this.#getParserFor(this.startOffset, 32)
        const magic = binaryParser.getInt()
        const blockSize = binaryParser.getInt()
        const keySize = binaryParser.getInt()
        const valSize = binaryParser.getInt()
        const itemCount = binaryParser.getLong()
        const reserved = binaryParser.getLong()
        const nodeOffset = this.startOffset + 32
        this.header = {magic, blockSize, keySize, valSize, itemCount, reserved, nodeOffset}
    }

    async search(term) {

        const {keySize, valSize} = this.header
        const map = this.map
        const self = this

        let leafCount = 0

        async function readTreeNode(offset) {

           // const assumedCount = 100
            //const assumedSize = 4 + assumedCount * (keySize + valSize)
            //let binaryParser = await self.#getParserFor(offset, assumedSize)
            let binaryParser = await self.#getParserFor(offset, 4)
            const type = binaryParser.getByte()
            const reserved = binaryParser.getByte()
            const count = binaryParser.getUShort()

            if (type === 1) {
                // Leaf node
                leafCount++
                const size = count * (keySize + valSize)
                binaryParser = await self.#getParserFor(offset + 4, size)

                for (let i = 0; i < count; i++) {

                    // if(binaryParser.available() < keySize + valSize) {
                    //     const newStart = offset + binaryParser.position
                    //     const newSize = (count - assumedCount) * (keySize + valSize)
                    //     binaryParser = await self.#getParserFor(newStart, newSize)
                    // }

                    const key = binaryParser.getFixedLengthString(keySize)
                    if (valSize === 16) {
                        // Assuming this is an "extraIndex"
                        const offset = binaryParser.getLong()
                        const length = binaryParser.getInt()
                        const reserved = binaryParser.getInt()
                        const value = {offset, length}
                        if (term === key) return value
                    } else {
                        throw Error(`Unexpected valSize: ${valSize}`)
                    }
                }
            } else {
                const size = count * (keySize + 8)
                binaryParser = await self.#getParserFor(offset + 4, size)

                // Read and discard the first key.
                const firstKey = binaryParser.getFixedLengthString(keySize)
                let childOffset = binaryParser.getLong()

                // non-leaf
                for (let i = 1; i < count; i++) {
                    const key = binaryParser.getFixedLengthString(keySize)
                    //console.log(key)
                    if (term.localeCompare(key) < 0) {
                        return readTreeNode(childOffset)
                    }
                    childOffset = binaryParser.getLong()
                }

                return readTreeNode(childOffset)
            }
        }

        // Kick things off
        return readTreeNode(this.header.nodeOffset)
    }

    async #getParserFor(start, size) {
        console.log(`loading ${start}   ${size}`)
        const data = await igvxhr.loadArrayBuffer(this.path, {range: {start, size}})
        return new BinaryParser(new DataView(data))
    }

}

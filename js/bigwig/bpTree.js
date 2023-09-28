import {igvxhr} from "../../node_modules/igv-utils/src/index.js"
import {buildOptions} from "../util/igvUtils.js"
import BinaryParser from "../binary.js"

/**
 * A UCSC BigBed B+ tree, used to support searching the "extra indexes".
 *
 * Nodes are loaded on demand during search, avoiding the need to read the entire tree into
 * memory.  Tree nodes can be scattered across the file, making loading the entire tree unfeasible in reasonable time.
 */
export default class BPTree {

    static async loadBpTree(path, startOffset) {
        const bpTree = new BPTree(path, startOffset)
        return bpTree.init()
    }

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
        return this
    }

    async search(term) {

        const {keySize, valSize} = this.header

        if (valSize !== 16) {
            throw Error(`Unexpected valSize: ${valSize}`)
        }

        const readTreeNode = async (offset) => {

            let binaryParser = await this.#getParserFor(offset, 4)
            const type = binaryParser.getByte()
            const reserved = binaryParser.getByte()
            const count = binaryParser.getUShort()

            if (type === 1) {
                // Leaf node
                const size = count * (keySize + valSize)
                binaryParser = await this.#getParserFor(offset + 4, size)
                for (let i = 0; i < count; i++) {
                    const key = binaryParser.getFixedLengthString(keySize)
                    const offset = binaryParser.getLong()
                    const length = binaryParser.getInt()
                    const reserved = binaryParser.getInt()
                    const value = {offset, length}
                    if (term === key) return value
                }
            } else {
                // Non leaf node
                const size = count * (keySize + 8)
                binaryParser = await this.#getParserFor(offset + 4, size)

                // Read and discard the first key.
                const firstKey = binaryParser.getFixedLengthString(keySize)
                let childOffset = binaryParser.getLong()

                for (let i = 1; i < count; i++) {
                    const key = binaryParser.getFixedLengthString(keySize)
                    if (term.localeCompare(key) < 0) {
                        break
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
        const data = await igvxhr.loadArrayBuffer(this.path, {range: {start, size}})
        return new BinaryParser(new DataView(data))
    }

}

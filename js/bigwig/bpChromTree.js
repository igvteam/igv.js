import {igvxhr} from "../../node_modules/igv-utils/src/index.js"
import {buildOptions} from "../util/igvUtils.js"
import BinaryParser from "../binary.js"

/**
 * A UCSC BigBed B+ tree, used to support searching the "extra indexes".
 *
 * Nodes are loaded on demand during search, avoiding the need to read the entire tree into
 * memory.  Tree nodes can be scattered across the file, making loading the entire tree unfeasible in reasonable time.
 */
export default class BPChromTree {

    static magic = 2026540177
    littleEndian = true
    nodeCache = new Map()

    static async loadBpTree(path, startOffset) {
        const bpTree = new BPChromTree(path, startOffset)
        return bpTree.init()
    }

    constructor(path, startOffset) {
        this.path = path
        this.startOffset = startOffset
        this.littleEndian = littleEndian
    }

    async init() {
        const binaryParser = await this.#getParserFor(this.startOffset, 32)
        let magic = binaryParser.getInt()
        if(magic !== BPChromTree.magic) {
            binaryParser.setPosition(0)
            this.littleEndian = !this.littleEndian
            binaryParser.littleEndian = this.littleEndian
            magic = binaryParser.getInt()
            if(magic !== BPChromTree.magic) {
                throw Error(`Bad magic number ${magic}`)
            }
        }
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

        if(!this.header) {
            await this.init();
        }

        const {keySize, valSize} = this.header

        if (valSize !== 8) {
            throw Error(`Unexpected valSize ${valSize}`)
        }

        const readTreeNode = async (offset) => {

            if (this.nodeCache.has(offset)) {
                return this.nodeCache.get(offset)
            } else {

                let binaryParser = await this.#getParserFor(offset, 4)
                const type = binaryParser.getByte()
                const reserved = binaryParser.getByte()
                const count = binaryParser.getUShort()
                const items = []

                if (type === 1) {
                    // Leaf node -- we walk through all items, rather return on match,  because nodes are cached
                    const size = count * (keySize + valSize)
                    binaryParser = await this.#getParserFor(offset + 4, size)
                    for (let i = 0; i < count; i++) {
                        const key = binaryParser.getFixedLengthString(keySize)
                        const chromId = binaryParser.getUInt();
                        const chromSize = binaryParser.getUInt();
                        items.push({key, chromId, chromSize})
                    }
                } else {
                    // Non leaf node
                    const size = count * (keySize + 8)
                    binaryParser = await this.#getParserFor(offset + 4, size)

                    for (let i = 0; i < count; i++) {
                        const key = binaryParser.getFixedLengthString(keySize)
                        const offset = binaryParser.getLong()
                        items.push({key, offset})
                    }
                }

                const node = {type, count, items}
                this.nodeCache.set(offset, node)
                return node
            }
        }

        const walkTreeNode = async (offset) => {

            const node = await readTreeNode(offset)

            if (node.type === 1) {
                // Leaf node
                for (let item of node.items) {
                    if (term === item.key) {
                        return item
                    }
                }
            } else {
                // Non leaf node
                // Read and discard the first key.
                let childOffset = node.items[0].offset

                for (let i = 1; i < node.items.length; i++) {
                    const key = node.items[i].key
                    if (term.localeCompare(key) < 0) {
                        break
                    }
                    childOffset = node.items[i].offset
                }

                return walkTreeNode(childOffset)
            }
        }

        // Kick things off
        return walkTreeNode(this.header.nodeOffset)
    }

    async #getParserFor(start, size) {
        const data = await igvxhr.loadArrayBuffer(this.path, {range: {start, size}})
        return new BinaryParser(new DataView(data), this.littleEndian)
    }

}

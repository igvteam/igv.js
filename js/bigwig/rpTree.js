import {igvxhr} from "../../node_modules/igv-utils/src/index.js"
import BinaryParser from "../binary.js"
import {buildOptions} from "../util/igvUtils.js"

const RPTREE_HEADER_SIZE = 48
const RPTREE_NODE_LEAF_ITEM_SIZE = 32   // leaf item size
const RPTREE_NODE_CHILD_ITEM_SIZE = 24  // child item size

export default class RPTree {

    static magic = 610839776
    littleEndian = true
    nodeCache = new Map()

    constructor(path, config, startOffset) {

        this.path = path
        this.config = config
        this.startOffset = startOffset
    }


    async init() {
        const binaryParser = await this.#getParserFor(this.startOffset, RPTREE_HEADER_SIZE)
        let magic = binaryParser.getInt()
        if (magic !== RPTree.magic) {
            binaryParser.setPosition(0)
            this.littleEndian = !this.littleEndian
            binaryParser.littleEndian = this.littleEndian
            magic = binaryParser.getInt()
            if (magic !== RPTree.magic) {
                throw Error(`Bad magic number ${magic}`)
            }
        }

        const blockSize = binaryParser.getUInt()
        const itemCount = binaryParser.getLong()
        const startChromIx = binaryParser.getUInt()
        const startBase = binaryParser.getUInt()
        const endChromIx = binaryParser.getUInt()
        const endBase = binaryParser.getUInt()
        const endFileOffset = binaryParser.getLong()
        const itemsPerSlot = binaryParser.getUInt()
        const reserved = binaryParser.getUInt()
        const rootNodeOffset = this.startOffset + RPTREE_HEADER_SIZE
        this.header = {
            magic,
            blockSize,
            itemCount,
            startChromIx,
            startBase,
            endChromIx,
            endBase,
            endFileOffset,
            itemsPerSlot,
            reserved,
            rootNodeOffset
        }
        return this
    }

    async #getParserFor(start, size) {
        const data = await igvxhr.loadArrayBuffer(this.path, buildOptions(this.config, {range: {start, size}}))
        return new BinaryParser(new DataView(data), this.littleEndian)
    }


    async findLeafItemsOverlapping(chrIdx1, startBase, chrIdx2, endBase) {

        const leafItems = []
        const walkTreeNode = async (offset) => {
            const node = await this.readNode(offset)
            for (let item of node.items) {
                if (overlaps(item, chrIdx1, startBase, chrIdx2, endBase)) {
                    if (node.type === 1) {   // Leaf node
                        leafItems.push(item)
                    } else { // Non leaf node
                        await walkTreeNode(item.childOffset)
                    }
                }
            }
        }

        await walkTreeNode(this.header.rootNodeOffset)
        return leafItems
    }


    async readNode(offset) {

        const nodeKey = offset
        if (this.nodeCache.has(nodeKey)) {
            return this.nodeCache.get(nodeKey)
        }

        let binaryParser = await this.#getParserFor(offset, 4)
        const type = binaryParser.getByte()
        const isLeaf = (type === 1)
        const reserved = binaryParser.getByte()
        const count = binaryParser.getUShort()
        let bytesRequired = count * (isLeaf ? RPTREE_NODE_LEAF_ITEM_SIZE : RPTREE_NODE_CHILD_ITEM_SIZE)
        binaryParser = await this.#getParserFor(offset + 4, bytesRequired)

        const items = []
        for (let i = 0; i < count; i++) {
            let item = {
                isLeaf: isLeaf,
                startChrom: binaryParser.getInt(),
                startBase: binaryParser.getInt(),
                endChrom: binaryParser.getInt(),
                endBase: binaryParser.getInt(),
                childOffset: binaryParser.getLong()
            }
            if (isLeaf) {
                item.dataSize =  binaryParser.getLong()
                item.dataOffset = item.childOffset
            }
            items.push(item)
        }

        const node = {type, items}
        this.nodeCache.set(nodeKey, node)
        return node
    }

}

/**
 * Return true if {chrIdx1:startBase-chrIdx2:endBase} overlaps item's interval
 * @returns {boolean}
 */
function overlaps(item, chrIdx1, startBase, chrIdx2, endBase) {

    if (!item) {
        console.log("null item for " + chrIdx1 + " " + startBase + " " + endBase)
        return false
    }

    return ((chrIdx2 > item.startChrom) || (chrIdx2 === item.startChrom && endBase >= item.startBase)) &&
        ((chrIdx1 < item.endChrom) || (chrIdx1 === item.endChrom && startBase <= item.endBase))


}

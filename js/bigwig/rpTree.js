import {isDataURL} from "../util/igvUtils.js"
import BufferedReader from "./bufferedReader.js"
import BinaryParser from "../binary.js"

let RPTREE_HEADER_SIZE = 48
let RPTREE_NODE_LEAF_ITEM_SIZE = 32   // leaf item size
let RPTREE_NODE_CHILD_ITEM_SIZE = 24  // child item size
let BUFFER_SIZE = 512000     //  buffer

export default class RPTree {

    constructor(fileOffset, config, littleEndian, loader) {

        this.config = config
        this.loader = loader
        this.fileOffset = fileOffset // File offset to beginning of tree
        this.path = config.url
        this.littleEndian = littleEndian
    }

    async load() {
        const rootNodeOffset = this.fileOffset + RPTREE_HEADER_SIZE
        const bufferedReader = isDataURL(this.path) || this.config.wholeFile ?
            this.loader :
            new BufferedReader(this.config, BUFFER_SIZE)
        this.rootNode = await this.readNode(rootNodeOffset, bufferedReader)
        return this
    }

    async readNode(filePosition, bufferedReader) {

        let dataView = await bufferedReader.dataViewForRange({start: filePosition, size: 4}, false)
        let binaryParser = new BinaryParser(dataView, this.littleEndian)
        const type = binaryParser.getByte()
        const isLeaf = (type === 1)
        const reserved = binaryParser.getByte()
        const count = binaryParser.getUShort()
        filePosition += 4

        let bytesRequired = count * (isLeaf ? RPTREE_NODE_LEAF_ITEM_SIZE : RPTREE_NODE_CHILD_ITEM_SIZE)
        let range2 = {start: filePosition, size: bytesRequired}
        dataView = await bufferedReader.dataViewForRange(range2, false)
        const items = new Array(count)
        binaryParser = new BinaryParser(dataView)

        if (isLeaf) {
            for (let i = 0; i < count; i++) {
                let item = {
                    isLeaf: true,
                    startChrom: binaryParser.getInt(),
                    startBase: binaryParser.getInt(),
                    endChrom: binaryParser.getInt(),
                    endBase: binaryParser.getInt(),
                    dataOffset: binaryParser.getLong(),
                    dataSize: binaryParser.getLong()
                }
                items[i] = item

            }
            return new RPTreeNode(items)
        } else { // non-leaf
            for (let i = 0; i < count; i++) {

                let item = {
                    isLeaf: false,
                    startChrom: binaryParser.getInt(),
                    startBase: binaryParser.getInt(),
                    endChrom: binaryParser.getInt(),
                    endBase: binaryParser.getInt(),
                    childOffset: binaryParser.getLong()
                }
                items[i] = item
            }

            return new RPTreeNode(items)
        }

    }

    async findLeafItemsOverlapping(chrIdx1, startBase, chrIdx2, endBase) {

        let self = this

        return new Promise(function (fulfill, reject) {

            let leafItems = [],
                processing = new Set(),
                bufferedReader = isDataURL(self.path) || self.config.wholeFile ?
                    self.loader :
                    new BufferedReader(self.config, BUFFER_SIZE)

            processing.add(0)  // Zero represents the root node
            findLeafItems(self.rootNode, 0)

            function findLeafItems(node, nodeId) {

                if (overlaps(node, chrIdx1, startBase, chrIdx2, endBase)) {

                    let items = node.items

                    items.forEach(function (item) {

                        if (overlaps(item, chrIdx1, startBase, chrIdx2, endBase)) {

                            if (item.isLeaf) {
                                leafItems.push(item)
                            } else {
                                if (item.childNode) {
                                    findLeafItems(item.childNode)
                                } else {
                                    processing.add(item.childOffset)  // Represent node to-be-loaded by its file position

                                    self.readNode(item.childOffset, bufferedReader)
                                        .then(function (node) {
                                            item.childNode = node
                                            findLeafItems(node, item.childOffset)
                                        })
                                        .catch(reject)
                                }
                            }
                        }
                    })

                }

                if (nodeId !== undefined) processing.delete(nodeId)

                // Wait until all nodes are processed
                if (processing.size === 0) {
                    fulfill(leafItems)
                }
            }
        })
    }
}

class RPTreeNode {

    constructor(items) {

        this.items = items

        let minChromId = Number.MAX_SAFE_INTEGER,
            maxChromId = 0,
            minStartBase = Number.MAX_SAFE_INTEGER,
            maxEndBase = 0,
            i,
            item

        for (i = 0; i < items.length; i++) {
            item = items[i]
            minChromId = Math.min(minChromId, item.startChrom)
            maxChromId = Math.max(maxChromId, item.endChrom)
            minStartBase = Math.min(minStartBase, item.startBase)
            maxEndBase = Math.max(maxEndBase, item.endBase)
        }

        this.startChrom = minChromId
        this.endChrom = maxChromId
        this.startBase = minStartBase
        this.endBase = maxEndBase
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

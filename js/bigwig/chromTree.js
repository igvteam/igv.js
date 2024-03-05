/**
 * A ChromTree parses a UCSC bigbed/bigwig "chromosomeTree" section of the header to produce 2 maps,
 * (1) ID -> chromosome names, and its
 * (2) chromsome name -> ID
 *
 * Both maps are needed by IGV
 *
 * The chromosome tree is a B+ index, but is located continguously in memory in the header section of the file. This
 * makes it feasible to parse the whole tree with data from a single fetch.   In the end the tree is discarded
 * leaving only the mapps.
 */
export default class ChromTree {

    constructor(header, nameToID, valueToKey, sumLengths) {
        this.header = header
        this.nameToId = nameToID
        this.idToName = valueToKey
        this.sumLengths = sumLengths
    }

    static parseTree(binaryParser, startOffset, genome = false) {
        {
            const magic = binaryParser.getInt()
            const blockSize = binaryParser.getInt()
            const keySize = binaryParser.getInt()
            const valSize = binaryParser.getInt()
            const itemCount = binaryParser.getLong()
            const reserved = binaryParser.getLong()

            const header = {magic, blockSize, keySize, valSize, itemCount, reserved}
            const nameToId = new Map()
            const idToName = []
            let sumLengths = 0
            const readTreeNode = (offset) => {

                if (offset >= 0) binaryParser.position = offset
                const type = binaryParser.getByte()
                const reserved = binaryParser.getByte()
                const count = binaryParser.getUShort()

                if (type === 1) {
                    // Leaf node
                    for (let i = 0; i < count; i++) {
                        let key = binaryParser.getFixedLengthString(keySize)
                        let value
                        if (valSize === 8) {
                            value = binaryParser.getInt()
                            const chromSize = binaryParser.getInt()
                            sumLengths += chromSize
                            if (genome) key = genome.getChromosomeName(key)  // Translate to canonical chr name
                            nameToId.set(key, value)
                            idToName[value] = key

                        } else {
                            throw Error(`Unexpected "valSize" value in chromosome tree.  Expected 8, actual value is ${valSize}`)
                        }
                    }
                } else {
                    // non-leaf
                    for (let i = 0; i < count; i++) {
                        const key = binaryParser.getFixedLengthString(keySize)
                        const childOffset = binaryParser.getLong()
                        const bufferOffset = childOffset - startOffset
                        const currOffset = binaryParser.position
                        readTreeNode(bufferOffset)
                        binaryParser.position = currOffset
                    }
                }
            }

            // Recursively walk tree to populate dictionary
            readTreeNode(binaryParser, -1)

            return new ChromTree(header, nameToId, idToName, sumLengths)
        }
    }

}

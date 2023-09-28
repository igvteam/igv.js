import BufferedReader from "./bufferedReader.js"
export default class BPTree {

    constructor(header, keyToValue, valueToKey) {
        this.header = header
        this.keyToValue = keyToValue
        this.valueToKey = valueToKey
    }

    static  parseTree(binaryParser, startOffset, genome, isAsync = false) {
        {
            const magic = binaryParser.getInt()
            const blockSize = binaryParser.getInt()
            const keySize = binaryParser.getInt()
            const valSize = binaryParser.getInt()
            const itemCount = binaryParser.getLong()
            const reserved = binaryParser.getLong()

            const header = {magic, blockSize, keySize, valSize, itemCount, reserved}
            const keyToValue = {}
            const valueToKey = []
            const readTreeNode =  (offset) => {

                if (offset >= 0) binaryParser.position = offset
                const type = binaryParser.getByte()
                const reserved = binaryParser.getByte()
                const count = binaryParser.getUShort()

                if (type === 1) {
                    // Leaf node
                    for (let i = 0; i < count; i++) {
                        let key = binaryParser.getFixedLengthString(keySize)
                        let value
                        if(valSize === 8) {
                            // Assuming this is the chromosome BP tree
                            value = binaryParser.getInt()
                            const chromSize = binaryParser.getInt()
                            if (genome) key = genome.getChromosomeName(key)  // Translate to canonical chr name
                            keyToValue[key] = value
                            valueToKey[value] = key

                        } else {
                            // Assuming this is an "extraIndex"
                            const offset = binaryParser.getLong()
                            const length = binaryParser.getInt()
                            const reserved = binaryParser.getInt()
                            value = {offset, length}
                            keyToValue[key] = value
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

                        console.log(`${childOffset}  ${bufferOffset}`)

                        binaryParser.position = currOffset
                    }
                }

            }
            // Recursively walk tree to populate dictionary
            readTreeNode(binaryParser, -1)

            console.log(`bptree size= ${binaryParser.position - startOffset}`)
            return new BPTree(header, keyToValue, valueToKey)
        }
    }

}

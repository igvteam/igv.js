export default class BPTree {

    constructor(binaryParser, startOffset, genome) {

        let magic = binaryParser.getInt()
        let blockSize = binaryParser.getInt()
        let keySize = binaryParser.getInt()
        let valSize = binaryParser.getInt()
        let itemCount = binaryParser.getLong()
        let reserved = binaryParser.getLong()
        let keyToValue = {}
        let valueToKey = []

        this.header = {
            magic: magic,
            blockSize: blockSize,
            keySize: keySize,
            valSize: valSize,
            itemCount: itemCount,
            reserved: reserved
        }
        this.keyToValue = keyToValue
        this.valueToKey = valueToKey

        // Recursively walk tree to populate dictionary
        readTreeNode(binaryParser, -1)


        function readTreeNode(byteBuffer, offset) {

            if (offset >= 0) byteBuffer.position = offset

            const type = byteBuffer.getByte()
            const reserved = byteBuffer.getByte()
            const count = byteBuffer.getUShort()

            if (type === 1) {

                for (let i = 0; i < count; i++) {

                    let key = byteBuffer.getFixedLengthTrimmedString(keySize)
                    let value
                    if(valSize === 8) {
                        // Assuming this is the chromosome BP tree
                        value = byteBuffer.getInt()
                        const chromSize = byteBuffer.getInt()
                        if (genome) key = genome.getChromosomeName(key)  // Translate to canonical chr name
                        keyToValue[key] = value
                        valueToKey[value] = key

                    } else {
                        const offset = byteBuffer.getLong()
                        const length = byteBuffer.getInt()
                        const reserved = byteBuffer.getInt()
                        value = {offset, length}
                        keyToValue[key] = value
                    }


                }
            } else { // non-leaf

                for (let i = 0; i < count; i++) {

                    const key = byteBuffer.getFixedLengthTrimmedString(keySize)
                    const childOffset = byteBuffer.getLong()
                    const bufferOffset = childOffset - startOffset
                    const currOffset = byteBuffer.position
                    readTreeNode(byteBuffer, bufferOffset)
                    byteBuffer.position = currOffset
                }
            }

        }
    }
}

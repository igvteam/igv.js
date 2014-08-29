/**
 * Created by jrobinso on 4/7/14.
 */


var igv = (function (igv) {

    var BPTREE_MAGIC_LTH = 0x78CA8C91;
    var BPTREE_MAGIC_HTL = 0x918CCA78;
    var BPTREE_HEADER_SIZE = 32;


    igv.BPTree = function (binaryParser, treeOffset) {


        this.treeOffset = treeOffset; // File offset to beginning of tree

        this.header = {};
        this.header.magic = binaryParser.getInt();
        this.header.blockSize = binaryParser.getInt();
        this.header.keySize = binaryParser.getInt();
        this.header.valSize = binaryParser.getInt();
        this.header.itemCount = binaryParser.getLong();
        this.header.reserved = binaryParser.getLong();

        this.dictionary = {};

        // Recursively walk tree to populate dictionary
        readTreeNode(binaryParser, -1, this.header.keySize, this.dictionary);

    }


    function readTreeNode(byteBuffer, offset, keySize, dictionary) {

        if (offset >= 0) byteBuffer.position = offset;

        var type = byteBuffer.getByte(),
            reserved = byteBuffer.getByte(),
            count = byteBuffer.getShort(),
            i,
            key,
            chromId,
            chromSize,
            childOffset,
            bufferOffset;


        if (type == 1) {
            for (i = 0; i < count; i++) {
                key = byteBuffer.getString(keySize);
                chromId = byteBuffer.getInt();
                chromSize = byteBuffer.getInt();
                dictionary[key] = chromId;

            }
        }
        else { // non-leaf
            for (i = 0; i < count; i++) {
                childOffset = byteBuffer.nextLong();
                bufferOffset = childOffset - self.treeOffset;
                readTreeNode(byteBuffer, offset, keySize, dictionary);
            }
        }

    }


    return igv;

})(igv || {});
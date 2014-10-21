/**
 * Created by jrobinso on 4/7/14.
 */


var igv = (function (igv) {

    var RPTREE_MAGIC_LTH = 0x2468ACE0;
    var RPTREE_MAGIC_HTL = 0xE0AC6824;
    var RPTREE_HEADER_SIZE = 48;
    var RPTREE_NODE_LEAF_ITEM_SIZE = 32;   // leaf item size
    RPTREE_NODE_CHILD_ITEM_SIZE = 24;  // child item size
    var BUFFER_SIZE = 512000;     //  buffer

    igv.RPTree = function (fileOffset, filesize, path, littleEndian) {

        this.filesize = filesize;
        this.fileOffset = fileOffset; // File offset to beginning of tree
        this.path = path;
        this.littleEndian = littleEndian;
    }


    igv.RPTree.prototype.load = function (continuation) {

        var tree = this,
            rootNodeOffset = this.fileOffset + RPTREE_HEADER_SIZE,
            bufferedReader = new igv.BufferedReader(this.path, this.filesize, BUFFER_SIZE);

        this.readNode(rootNodeOffset, bufferedReader, function (node) {
            tree.rootNode = node;
            continuation(this);
        });

    }


    igv.RPTree.prototype.readNode = function (filePosition, bufferedReader, continuation) {


        bufferedReader.dataViewForRange({start: filePosition, size: 4}, function (dataView) {
            var binaryParser = new igv.BinaryParser(dataView, this.littleEndian);

            var type = binaryParser.getByte();
            var isLeaf = (type === 1) ? true : false;
            var reserved = binaryParser.getByte();
            var count = binaryParser.getShort();

            filePosition += 4;

            var bytesRequired = count * (isLeaf ? RPTREE_NODE_LEAF_ITEM_SIZE : RPTREE_NODE_CHILD_ITEM_SIZE);
            var range2 = {start: filePosition, size: bytesRequired};

            bufferedReader.dataViewForRange(range2, function (dataView) {

                var i,
                    items = new Array(count),
                    binaryParser = new igv.BinaryParser(dataView);

                if (isLeaf) {
                    for (i = 0; i < count; i++) {
                        var item = {
                            isLeaf: true,
                            startChrom: binaryParser.getInt(),
                            startBase: binaryParser.getInt(),
                            endChrom: binaryParser.getInt(),
                            endBase: binaryParser.getInt(),
                            dataOffset: binaryParser.getLong(),
                            dataSize: binaryParser.getLong()};
                        items[i] = item;

                    }
                    continuation(new RPTreeNode(items));
                }
                else { // non-leaf
                    for (i = 0; i < count; i++) {

                        var item = {
                            isLeaf: false,
                            startChrom: binaryParser.getInt(),
                            startBase: binaryParser.getInt(),
                            endChrom: binaryParser.getInt(),
                            endBase: binaryParser.getInt(),
                            childOffset: binaryParser.getLong()};
                        items[i] = item;

                    }

                    continuation(new RPTreeNode(items));
                }
            });
        });
    }


    igv.RPTree.prototype.findLeafItemsOverlapping = function (chrIdx, startBase, endBase, continuation) {

        var rpTree = this,
            leafItems = [],
            processing = new Set();
        bufferedReader = new igv.BufferedReader(this.path, this.filesize, BUFFER_SIZE);

        processing.add(0);  // Zero represents the root node
        findLeafItems(this.rootNode, 0);

        function findLeafItems(node, nodeId) {

            if (overlaps(node, chrIdx, startBase, endBase)) {

                var items = node.items;

                items.forEach(function (item) {

                    if (overlaps(item, chrIdx, startBase, endBase)) {

                        if (item.isLeaf) {
                            leafItems.push(item);
                        }

                        else {
                            if (item.childNode) {
                                findLeafItems(item.childNode);
                            }
                            else {
                                processing.add(item.childOffset);  // Represent node to-be-loaded by its file position
                                rpTree.readNode(item.childOffset, bufferedReader, function (node) {
                                    item.childNode = node;
                                    findLeafItems(node, item.childOffset);
                                });
                            }
                        }
                    }
                });

            }

            if(nodeId != undefined) processing.remove(nodeId);

            // Wait until all nodes are processed
            if (processing.isEmpty()) {
                continuation(leafItems);
            }
        }
    }


    function RPTreeNode(items) {


        this.items = items;

        var minChromId = Number.MAX_VALUE,
            maxChromId = 0,
            minStartBase = Number.MAX_VALUE,
            maxEndBase = 0,
            i,
            item;

        for (i = 0; i < items.length; i++) {
            item = items[i];
            minChromId = Math.min(minChromId, item.startChrom);
            maxChromId = Math.max(maxChromId, item.endChrom);
            minStartBase = Math.min(minStartBase, item.startBase);
            maxEndBase = Math.max(maxEndBase, item.endBase);
        }

        this.startChrom = minChromId;
        this.endChrom = maxChromId;
        this.startBase = minStartBase;
        this.endBase = maxEndBase;

    }

    /**
     * Return true if {chrIdx:startBase-endBase} overlaps item's interval
     * @returns {boolean}
     */
    function overlaps(item, chrIdx, startBase, endBase) {

        //  if (chrIdx > item.endChrom || chrIdx < item.startChrom) return false;

        if(!item) {
            console.log("null item");
            return false;
        }

        return ((chrIdx > item.startChrom) || (chrIdx == item.startChrom && endBase >= item.startBase)) &&
            ((chrIdx < item.endChrom) || (chrIdx == item.endChrom && startBase < item.endBase));


    }


    return igv;


})(igv || {});
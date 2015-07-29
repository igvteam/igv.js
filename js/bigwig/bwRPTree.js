/*
 * The MIT License (MIT)
 *
 * Copyright (c) 2014 Broad Institute
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

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

    igv.RPTree = function (fileOffset, contentLength, config, littleEndian) {

        this.config = config;
        this.filesize = contentLength;
        this.fileOffset = fileOffset; // File offset to beginning of tree
        this.path = config.url;
        this.littleEndian = littleEndian;
    }


    igv.RPTree.prototype.load = function (continuation) {

        var tree = this,
            rootNodeOffset = this.fileOffset + RPTREE_HEADER_SIZE,
            bufferedReader = new igv.BufferedReader(this.config, this.filesize, BUFFER_SIZE);

        this.readNode(rootNodeOffset, bufferedReader, function (node) {
            tree.rootNode = node;
            continuation(tree);
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
                            dataSize: binaryParser.getLong()
                        };
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
                            childOffset: binaryParser.getLong()
                        };
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
            processing = new Set(),
            bufferedReader = new igv.BufferedReader(this.config, this.filesize, BUFFER_SIZE);

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

            if (nodeId != undefined) processing.delete(nodeId);

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

        if (!item) {
            console.log("null item");
            return false;
        }

        return ((chrIdx > item.startChrom) || (chrIdx == item.startChrom && endBase >= item.startBase)) &&
            ((chrIdx < item.endChrom) || (chrIdx == item.endChrom && startBase < item.endBase));


    }


    return igv;


})(igv || {});
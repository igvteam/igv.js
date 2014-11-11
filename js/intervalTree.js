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

/** An implementation of an interval tree, following the explanation.
 * from CLR.
 *
 * Public interface:
 *   Constructor  IntervalTree
 *   Insertion    insert
 *   Search       findOverlapping
 */



var igv = (function (igv) {

    var BLACK = 1;
    var RED = 2;

    var NIL = {}
    NIL.color = BLACK;
    NIL.parent = NIL;
    NIL.left = NIL;
    NIL.right = NIL;


    igv.IntervalTree = function () {
        this.root = NIL;
    }


    igv.IntervalTree.prototype.insert = function (start, end, value) {

        var interval = new Interval(start, end, value);
        var x = new Node(interval);
        this.treeInsert(x);
        x.color = RED;
        while (x != this.root && x.parent.color == RED) {
            if (x.parent == x.parent.parent.left) {
                var y = x.parent.parent.right;
                if (y.color == RED) {
                    x.parent.color = BLACK;
                    y.color = BLACK;
                    x.parent.parent.color = RED;
                    x = x.parent.parent;
                } else {
                    if (x == x.parent.right) {
                        x = x.parent;
                        leftRotate.call(this, x);
                    }
                    x.parent.color = BLACK;
                    x.parent.parent.color = RED;
                    rightRotate.call(this, x.parent.parent);
                }
            } else {
                var y = x.parent.parent.left;
                if (y.color == RED) {
                    x.parent.color = BLACK;
                    y.color = BLACK;
                    x.parent.parent.color = RED;
                    x = x.parent.parent;
                } else {
                    if (x == x.parent.left) {
                        x = x.parent;
                        rightRotate.call(this, x);
                    }
                    x.parent.color = BLACK;
                    x.parent.parent.color = RED;
                    leftRotate.call(this, x.parent.parent);
                }
            }
        }
        this.root.color = BLACK;
    }


    /**
     *
     * @param start - query interval
     * @param end - query interval
     * @returns Array of all intervals overlapping the query region
     */
    igv.IntervalTree.prototype.findOverlapping = function (start, end) {


        var searchInterval = new Interval(start, end, 0);

        if (this.root === NIL) return [];

        var intervals = searchAll.call(this, searchInterval, this.root, []);

        if(intervals.length > 1) {
            intervals.sort(function(i1, i2) {
                 return i1.low - i2.low;
            });
        }

        return intervals;
    }

    /**
     * Dump info on intervals to console.  For debugging.
     */
    igv.IntervalTree.prototype.logIntervals = function() {

        logNode(this.root, 0);

        function logNode(node, indent) {

            var space = "";
            for(var i=0; i<indent; i++) space += " ";
            console.log(space + node.interval.low + " " + node.interval.high); // + " " + (node.interval.value ? node.interval.value : " null"));

            indent += 5;

            if(node.left != NIL) logNode(node.left, indent);
            if(node.right != NIL) logNode(node.right, indent);
        }

    }


    igv.IntervalTree.prototype.mapIntervals = function(func) {

        applyInterval(this.root);

        function applyInterval(node) {

            func(node.interval);

            if(node.left != NIL) applyInterval(node.left);
            if(node.right != NIL) applyInterval(node.right);
        }
    }

    function searchAll(interval, node, results) {

        if (node.interval.overlaps(interval)) {
            results.push(node.interval);
        }

        if (node.left != NIL && node.left.max >= interval.low) {
            searchAll.call(this, interval, node.left, results);
        }

        if (node.right != NIL && node.right.min <= interval.high) {
            searchAll.call(this, interval, node.right, results);
        }

        return results;
    }

    function leftRotate(x) {
        var y = x.right;
        x.right = y.left;
        if (y.left != NIL) {
            y.left.parent = x;
        }
        y.parent = x.parent;
        if (x.parent == NIL) {
            this.root = y;
        } else {
            if (x.parent.left == x) {
                x.parent.left = y;
            } else {
                x.parent.right = y;
            }
        }
        y.left = x;
        x.parent = y;

        applyUpdate.call(this, x);
        // no need to apply update on y, since it'll y is an ancestor
        // of x, and will be touched by applyUpdate().
    }


    function rightRotate(x) {
        var y = x.left;
        x.left = y.right;
        if (y.right != NIL) {
            y.right.parent = x;
        }
        y.parent = x.parent;
        if (x.parent == NIL) {
            this.root = y;
        } else {
            if (x.parent.right == x) {
                x.parent.right = y;
            } else {
                x.parent.left = y;
            }
        }
        y.right = x;
        x.parent = y;


        applyUpdate.call(this, x);
        // no need to apply update on y, since it'll y is an ancestor
        // of x, and will be touched by applyUpdate().
    }


    /**
     * Note:  Does not maintain RB constraints,  this is done post insert
     *
     * @param x  a Node
     */
    igv.IntervalTree.prototype.treeInsert = function (x) {
        var node = this.root;
        var y = NIL;
        while (node != NIL) {
            y = node;
            if (x.interval.low <= node.interval.low) {
                node = node.left;
            } else {
                node = node.right;
            }
        }
        x.parent = y;

        if (y == NIL) {
            this.root = x;
            x.left = x.right = NIL;
        } else {
            if (x.interval.low <= y.interval.low) {
                y.left = x;
            } else {
                y.right = x;
            }
        }

        applyUpdate.call(this, x);
    }


    // Applies the statistic update on the node and its ancestors.
    function applyUpdate (node) {
        while (node != NIL) {
            var nodeMax = node.left.max > node.right.max ? node.left.max : node.right.max;
            var intervalHigh = node.interval.high;
            node.max = nodeMax > intervalHigh ? nodeMax : intervalHigh;

            var nodeMin = node.left.min < node.right.min ? node.left.min : node.right.min;
            var intervalLow = node.interval.low;
            node.min = nodeMin < intervalLow ? nodeMin : intervalLow;

            node = node.parent;
        }
    }


    function Interval (low, high, value) {
        this.low = low;
        this.high = high;
        this.value = value;
    }


    Interval.prototype.equals = function (other) {
        if (!other) {
            return false;
        }
        if (this == other) {
            return true;
        }
        return (this.low == otherInterval.low &&
            this.high == otherInterval.high);

    }


    Interval.prototype.compareTo = function (other) {
        if (this.low < other.low)
            return -1;
        if (this.low > other.low)
            return 1;

        if (this.high < other.high)
            return -1;
        if (this.high > other.high)
            return 1;

        return 0;
    }

    /**
     * Returns true if this interval overlaps the other.
     */
    Interval.prototype.overlaps = function (other) {
        try {
            return (this.low <= other.high && other.low <= this.high);
        } catch (e) {
            alert(e);
        }
    }

    function Node(interval) {
        this.parent = NIL;
        this.left = NIL;
        this.right = NIL;
        this.interval = interval;
        this.color = RED;
    }



//
//
//    function minimum(node) {
//        while (node.left != NIL) {
//            node = node.left;
//        }
//        return node;
//    }
//
//
//    function maximum(node) {
//
//        while (node.right != NIL) {
//            node = node.right;
//        }
//        return node;
//    }
//
//
//    function successor(x) {
//
//        if (x.right != NIL) {
//            return minimum(x.right);
//        }
//        var y = x.parent;
//        while (y != NIL && x == y.right) {
//            x = y;
//            y = y.parent;
//        }
//        return y;
//    }
//
//
//    function predecessor(x) {
//        if (x.left != NIL) {
//            return maximum(x.left);
//        }
//        var y = x.parent;
//        while (y != NIL && x == y.left) {
//            x = y;
//            y = y.parent;
//        }
//        return y;
//    }
//
//
//
//    igv.IntervalTree.prototype.allRedNodesFollowConstraints = function (node) {
//        if (node == NIL)
//            return true;
//
//        if (node.color == BLACK) {
//            return (this.allRedNodesFollowConstraints(node.left) &&
//                this.allRedNodesFollowConstraints(node.right));
//        }
//
//        // At this point, we know we're on a RED node.
//        return (node.left.color == BLACK &&
//            node.right.color == BLACK &&
//            this.allRedNodesFollowConstraints(node.left) &&
//            this.allRedNodesFollowConstraints(node.right));
//    }
//
//
//    // Check that both ends are equally balanced in terms of black height.
//    igv.IntervalTree.prototype.isBalancedBlackHeight = function (node) {
//        if (node == NIL)
//            return true;
//        return (blackHeight(node.left) == blackHeight(node.right) &&
//            this.isBalancedBlackHeight(node.left) &&
//            this.isBalancedBlackHeight(node.right));
//    }
//
//
//    // The black height of a node should be left/right equal.
//    igv.IntervalTree.prototype.blackHeight = function (node) {
//        if (node == NIL)
//            return 0;
//        var leftBlackHeight = blackHeight(node.left);
//        if (node.color == BLACK) {
//            return leftBlackHeight + 1;
//        } else {
//            return leftBlackHeight;
//        }
//    }


    /**
     * Test code: make sure that the tree has all the properties
     * defined by Red Black trees and interval trees
     * <p/>
     * o.  Root is black.
     * <p/>
     * o.  NIL is black.
     * <p/>
     * o.  Red nodes have black children.
     * <p/>
     * o.  Every path from root to leaves contains the same number of
     * black nodes.
     * <p/>
     * o.  getMax(node) is the maximum of any interval rooted at that node..
     * <p/>
     * This code is expensive, and only meant to be used for
     * assertions and testing.
     */
//
//    igv.IntervalTree.prototype.isValid = function () {
//        if (this.root.color != BLACK) {
//            logger.warn("root color is wrong");
//            return false;
//        }
//        if (NIL.color != BLACK) {
//            logger.warn("NIL color is wrong");
//            return false;
//        }
//        if (allRedNodesFollowConstraints(this.root) == false) {
//            logger.warn("red node doesn't follow constraints");
//            return false;
//        }
//        if (isBalancedBlackHeight(this.root) == false) {
//            logger.warn("black height unbalanced");
//            return false;
//        }
//
//        return hasCorrectMaxFields(this.root) &&
//            hasCorrectMinFields(this.root);
//    }
//
//
//    igv.IntervalTree.prototype.hasCorrectMaxFields = function (node) {
//        if (node == NIL)
//            return true;
//        return (getRealMax(node) == (node.max) &&
//            this.hasCorrectMaxFields(node.left) &&
//            this.hasCorrectMaxFields(node.right));
//    }
//
//
//    igv.IntervalTree.prototype.hasCorrectMinFields = function (node) {
//        if (node == NIL)
//            return true;
//        return (getRealMin(node) == (node.min) &&
//            this.hasCorrectMinFields(node.left) &&
//            this.hasCorrectMinFields(node.right));
//    }

    return igv;

})(igv || {});
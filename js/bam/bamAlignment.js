var igv = (function (igv) {

    var BAM_MAGIC = 21840194;
    var BAI_MAGIC = 21578050;
    var SECRET_DECODER = ['=', 'A', 'C', 'x', 'G', 'x', 'x', 'x', 'T', 'x', 'x', 'x', 'x', 'x', 'x', 'N'];
    var CIGAR_DECODER = ['M', 'I', 'D', 'N', 'S', 'H', 'P', '=', 'X', '?', '?', '?', '?', '?', '?', '?'];
    var READ_PAIRED_FLAG = 0x1;
    var PROPER_PAIR_FLAG = 0x2;
    var READ_UNMAPPED_FLAG = 0x4;
    var MATE_UNMAPPED_FLAG = 0x8;
    var READ_STRAND_FLAG = 0x10;
    var MATE_STRAND_FLAG = 0x20;
    var FIRST_OF_PAIR_FLAG = 0x40;
    var SECOND_OF_PAIR_FLAG = 0x80;
    var NOT_PRIMARY_ALIGNMENT_FLAG = 0x100;
    var READ_FAILS_VENDOR_QUALITY_CHECK_FLAG = 0x200;
    var DUPLICATE_READ_FLAG = 0x400;
    var SUPPLEMENTARY_ALIGNMENT_FLAG = 0x800;

    /**
     * readName
     * chr
     * cigar
     * lengthOnRef
     * start
     * seq
     * qual
     * mq
     * strand
     * blocks
     */

    igv.BamAlignment = function () {

    }


    igv.BamAlignment.prototype.isPaired = function () {
        return (this.flags & READ_PAIRED_FLAG) != 0;
    }

    igv.BamAlignment.prototype.isSecondOfPair = function() {
        return (this.flags & SECOND_OF_PAIR_FLAG) != 0;
    }



    igv.BamAlignment.prototype.tags = function () {

        if (!this.tagDict) {
            if (this.tagBA) {
                this.tagDict = decodeTags(this.tagBA);
                this.tagBA = undefined;
            } else {
                this.tagDict = {};  // Mark so we don't try again.  The record has not tags
            }
        }

        function decodeTags(ba) {

            var p = 0,
                len = ba.length,
                tags = {};

            while (p < len) {
                var tag = String.fromCharCode(ba[p]) + String.fromCharCode(ba[p + 1]);
                var type = String.fromCharCode(ba[p + 2]);
                var value;

                if (type == 'A') {
                    value = String.fromCharCode(ba[p + 3]);
                    p += 4;
                } else if (type == 'i' || type == 'I') {
                    value = readInt(ba, p + 3);
                    p += 7;
                } else if (type == 'c' || type == 'C') {
                    value = ba[p + 3];
                    p += 4;
                } else if (type == 's' || type == 'S') {
                    value = readShort(ba, p + 3);
                    p += 5;
                } else if (type == 'f') {
                    throw 'FIXME need floats';
                } else if (type == 'Z') {
                    p += 3;
                    value = '';
                    for (; ;) {
                        var cc = ba[p++];
                        if (cc == 0) {
                            break;
                        } else {
                            value += String.fromCharCode(cc);
                        }
                    }
                } else {
                    //    throw 'Unknown type ' + type;
                }
                tags[tag] = value;
            }
            return tags;
        }
    }

    igv.BamAlignment.prototype.popupData = function (genomicLocation) {

        nameValues = [];

        nameValues.push({name: 'Read Name', value: this.readName});
        // Sample
        // Read group
        nameValues.push("-------------------------------");

        // Add 1 to genomic location to map from 0-based computer units to user-based units
        nameValues.push({name: 'Location ', value: igv.numberFormatter(1 + genomicLocation)});
        nameValues.push({name: 'Alignment Start', value: igv.numberFormatter(1 + this.start)});

        nameValues.push({name: 'Read Strand', value: (true === this.strand ? '(+)' : '(-)')});
        nameValues.push({name: 'Cigar', value: this.cigar});
        // Mapped
        nameValues.push({name: 'Mapping Quality', value: this.mq });

        // Secondary
        // Supplementary
        // Duplicate
        // Failed QC


        if(this.isPaired()) {
            nameValues.push("--------------------------------");
            nameValues.push({name: 'First in Pair', value: !this.isSecondOfPair()});
            // Mate is Mapped
            // Mate Start
            // Mate Strand
            // Insert Size
            // First in Pair
            // Pair Orientation

        }

        nameValues.push("--------------------------------");
        this.tags();
        for (var key in this.tagDict) {
            if (this.tagDict.hasOwnProperty(key)) {
                nameValues.push({name: key, value: this.tagDict[key]});
            }
        }
        // -----------------------
        // tags...
        //    nameValues.push({name: 'Base', value: readChar});

//            refSeqIndex = genomicLocation - alignmentManager.coverageMap.bpStart;
//            markup += "ref seq base " + alignmentManager.coverageMap.refSeq[ refSeqIndex ];

        return nameValues;
    }

    return igv;

})(igv || {});

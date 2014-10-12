var igv = (function (igv) {


    var sampleJson = JSON.stringify({
        "id": "ChZDTXZuaHBLVEZoQ2p6OV8yNWVfbEN3EgExGPip_UkoAA",
        "name": "SRR068145.68016244",
        "readsetId": "CMvnhpKTFhCjz9_25e_lCw",
        "flags": 163,
        "referenceSequenceName": "1",
        "position": 155145465,
        "mappingQuality": 60,
        "cigar": "101M",
        "mateReferenceSequenceName": "1",
        "matePosition": 155145765,
        "templateLength": 385,
        "originalBases": "CCCCTCCAAGAACTCCCGGGACTGCAGCCACACGCCCCAACTCCCCACACCGCGCGGCAACCCCTACGTATTGCCCAGCCCCGGACACCCCGAACCCTCCC",
        "alignedBases": "CCCCTCCAAGAACTCCCGGGACTGCAGCCACACGCCCCAACTCCCCACACCGCGCGGCAACCCCTACGTATTGCCCAGCCCCGGACACCCCGAACCCTCCC",
        "baseQuality": "?BCABAACDECFEGFEE=FFDGHHFGHDFEGGG=GFFEGH@IGFFFHGFGF=G=G=GGADFEFEHFG=C/DD7=@EGCEDFG=\u003eBGAFFF-/\u003e\u003c6DCFC\u003c8",
        "tags": {
            "AM": [
                "37"
            ],
            "BQ": [
                "FHHC@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@"
            ],
            "MD": [
                "72C28"
            ],
            "MQ": [
                "60"
            ],
            "NM": [
                "1"
            ],
            "RG": [
                "SRR068145"
            ],
            "SM": [
                "37"
            ],
            "X0": [
                "1"
            ],
            "X1": [
                "0"
            ],
            "XT": [
                "U"
            ]
        }
    });

    /**
     * Decode an array of ga4gh
     */
    igv.decodeGa4ghReads = function (jsonRecords) {

        var i,
            len=jsonRecords.length,
            json,
            alignment,
            cigarDecoded;

        for(i=0; i<len; i++) {

        json = jsonRecords[i];
            alignment = new igv.BamAlignment();

            alignment.readName = json.name;
            alignment.flags = json.flags;
            alignment.chr = json.referenceSequenceName;
            alignment.start = json.position - 1;
            //alignment.strand
            alignment.matePos = json.matePosition;
            alignment.tlen = json.templateLength;
            alignment.cigar = json.cigar;
            //alignment.lengthOnRef
            alignment.seq = json.originalBases;
            alignment.qual = json.baseQuality;
            alignment.mq = json.mappingQuality;
            alignment.mateChr = json.mateReferenceSequenceName;
            //alignment.tagBA
           // alignment.blocks

            cigarDecoded = decodeCigar(json.cigar);

            alignment.lengthOnRef = cigarDecoded.lengthOnRef;

            alignment.blocks = makeBlocks(alignment, cigarDecoded.array);

    }


        function decodeCigar(textCigar) {

            var cigarArray = [],
                i,
                opLen = "",
                opLtr,
                lengthOnRef = 0;

            for (i = 0; i < textCigar.length; ++i) {

                if(isDigit(textCigar.charCodeAt(i))) {
                    opLen = opLen + textCigar.charAt(i);
                }
                else {
                    opLtr = textCigar.charAt(i);

                    if (opLtr == 'M' || opLtr == 'EQ' || opLtr == 'X' || opLtr == 'D' || opLtr == 'N' || opLtr == '=')
                        lengthOnRef += opLen;

                    cigarArray.push({len: parseInt(len), op: op});
                    opLen = "";
                }
            }

            }
            return {lengthOnRef: lengthOnRef, array: cigarArray};


            function isDigit(c) {

                return c >= ZERO_CHAR && c <= NINE_CHAR;
            }
        }

    /**
     * Split the alignment record into blocks as specified in the cigarArray.  Each aligned block contains
     * its portion of the read sequence and base quality strings.  A read sequence or base quality string
     * of "*" indicates the value is not recorded.  In all other cases the length of the block sequence (block.seq)
     * and quality string (block.qual) must == the block length.
     *
     * NOTE: Insertions are not yet treated // TODO
     *
     * @param record
     * @param cigarArray
     * @returns array of blocks
     */
    function makeBlocks(record, cigarArray) {


        var blocks = [],
            seqOffset = 0,
            pos = record.start,
            len = cigarArray.length,
            blockSeq,
            blockQuals;

        for (var i = 0; i < len; i++) {

            var c = cigarArray[i];

            switch (c.ltr) {
                case 'H' :
                    break; // ignore hard clips
                case 'P' :
                    break; // ignore pads
                case 'S' :
                    seqOffset += c.len;
                    break; // soft clip read bases
                case 'N' :
                    pos += c.len;
                    break;  // reference skip
                case 'D' :
                    pos += c.len;
                    break;
                case 'I' :
                    seqOffset += c.len;
                    break;
                case 'M' :
                case 'EQ' :
                case '=' :
                case 'X' :
                    blockSeq = record.seq === "*" ? "*" : record.seq.substr(seqOffset, c.len);
                    blockQuals = record.qual === "*" ? "*" : record.qual.substr(seqOffset, c.len);
                    blocks.push({start: pos, len: c.len, seq: blockSeq, qual: blockQuals});
                    seqOffset += c.len;
                    pos += c.len;
                    break;
                default :
                    console.log("Error processing cigar element: " + c.len + c.ltr);
            }
        }

        return blocks;

    }


    const ZERO_CHAR = "0".charCodeAt(0);
    const NINE_CHAR = "9".charCodeAt(0);


    return igv;

})(igv || {});
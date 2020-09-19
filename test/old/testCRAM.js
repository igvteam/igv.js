import CramReader from "../../js/cram/cramReader.js";
import FastaSequence from "../../js/genome/fasta.js";
import {assert} from 'chai';
import {setup} from "../util/setup.js";

suite("testCRAM", function () {

    setup();

    test("CRAM header", async function () {

        // Mock object
        const genome = {

            getChromosomeName: function (chr) {

                switch (chr) {
                    case 'CHROMOSOME_I':
                        return 'chr1';
                    case 'CHROMOSOME_II':
                        return 'chr2';
                    case 'CHROMOSOME_III':
                        return 'chr3';
                    case 'CHROMOSOME_IV':
                        return 'chr4';
                    case 'CHROMOSOME_V':
                        return 'chr5'

                }
            }
        }

        const cramReader = new CramReader({
                url: require.resolve('./data/cram/ce_5.tmp.cram'),
                indexURL: require.resolve('./data/cram/ce_5.tmp.cram.crai')
            },
            genome);

        const header = await cramReader.getHeader();
        assert.ok(header);
        const expectedChrNames = ['CHROMOSOME_I', 'CHROMOSOME_II', 'CHROMOSOME_III', 'CHROMOSOME_IV', 'CHROMOSOME_V']
        assert.deepEqual(header.chrNames, expectedChrNames)

    })

    test("CRAM alignments", async function () {
        // Mock genome object
        const fasta = new FastaSequence({
            fastaURL: require.resolve('./data/cram/hg19_test.fasta'),
            indexed: false
        });

        await fasta.init();

        const genome = {
            getChromosomeName: function (chr) {
                return chr;
            },
            sequence: fasta
        };

        const cramReader = new CramReader({
                url: require.resolve('./data/cram/na12889.cram'),
                indexURL: require.resolve('./data/cram/na12889.cram.crai')
            },
            genome);


        const alignmentContainer = await cramReader.readAlignments('chr1', 155140000, 155160000);

        // 2 alignments, 1 paired and 1 single
        assert.equal(alignmentContainer.alignments.length, 2);
        const firstAlignment = alignmentContainer.alignments[0].firstAlignment;
        assert.equal(firstAlignment.seq, 'TTCATCTAAAAATCACATTGCAAATTATTCAATATATTTGGGCCTCCATCTCGTTTACATCAATATGTGTTTGTTGAAGTATCTGCCCTGCAATGTCCATA');
        assert.deepEqual(firstAlignment.qual, [34, 9, 12, 10, 24, 17, 10, 5, 19, 7, 28, 17, 23, 29, 10,
            26, 10, 8, 14, 7, 15, 17, 32, 33, 31, 23, 34, 16, 33, 28, 34, 27, 10, 29, 10, 17, 11, 26,
            8, 27, 4, 4, 35, 32, 12, 32, 40, 39, 38, 41, 40, 36, 3, 34, 17, 30, 37, 10, 29, 36, 41,
            35, 24, 34, 11, 19, 11, 16, 24, 16, 26, 10, 11, 19, 13, 18, 11, 28, 30, 37, 30, 38, 43,
            43, 40, 43, 43, 41, 32, 34, 39, 41, 31, 37, 36, 36, 36, 33, 37, 34, 30]);
        assert.equal(firstAlignment.start, 155148856);
        assert.equal(firstAlignment.scStart, 155148856 - 20);
        assert.equal(firstAlignment.lengthOnRef, 81);
        assert.equal(firstAlignment.scLengthOnRef, 101);
        assert.equal(firstAlignment.pairOrientation, 'F2R1');
        assert.equal(firstAlignment.fragmentLength, 307);
        assert.equal(firstAlignment.mq, 29);
        assert.equal(firstAlignment.readGroupId, 1);

        const blocks = firstAlignment.blocks;
        assert.equal(blocks.length, 4);
        const expectedLength = [20, 46, 8, 24];
        const expectedOffset = [0, 20, 66, 77];
        const expectedTypes = ['S', 'M', 'M', 'M'];
        for (let i = 0; i < 4; i++) {
            const b = blocks[i];
            assert.equal(b.len, expectedLength[i]);
            assert.equal(b.type, expectedTypes[i]);
            assert.equal(b.seqOffset, expectedOffset[i]);
        }

        const insertions = firstAlignment.insertions;
        assert.equal(insertions.length, 1);
        assert.equal(insertions[0].len, 3);
        assert.equal(insertions[0].type, 'I');

        const tags = firstAlignment.tags();
        assert.equal(tags["BQ"], "@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@TPEO@@KPXPZJKS@@@@@@@@@@@@@@@@@@@@@@@@@@@");
        assert.equal(tags["AM"], 29);
        assert.equal(tags["MQ"], 29);
        assert.equal(tags["AM"], 29);
        assert.equal(tags["XT"], "M");
    })

    test("CRAM lossy alignments - in slice mate", async function () {

        const cramReader = new CramReader({
            url: require.resolve('./data/cram/na12889_lossy.cram'),
            indexURL: require.resolve('./data/cram/na12889_lossy.cram.crai'),
            seqFetch: function (seqId, start, end) {
                var fakeSeq = ''
                for (let i = start; i <= end; i += 1) {
                    fakeSeq += 'A'
                }
                return Promise.resolve(fakeSeq)
            },
            checkSequenceMD5: false
        });

        const alignmentContainer = await cramReader.readAlignments('chr1', 155140000, 155160000);
        const pairedAlignment = alignmentContainer.alignments[0];
        assert.ok(pairedAlignment.firstAlignment);
        assert.ok(pairedAlignment.secondAlignment);
        assert.equal(pairedAlignment.firstAlignment.readName, pairedAlignment.secondAlignment.readName);

    })

    test("CRAM lossy alignments - out of slice mate", async function () {

        const cramReader = new CramReader({
            url: require.resolve('./data/cram/na12889_lossy.cram'),
            indexURL: require.resolve('./data/cram/na12889_lossy.cram.crai'),
            seqFetch: function (seqId, start, end) {
                var fakeSeq = ''
                for (let i = start; i <= end; i += 1) {
                    fakeSeq += 'A'
                }
                return Promise.resolve(fakeSeq)
            },
            checkSequenceMD5: false
        });

        let alignmentContainer = await cramReader.readAlignments('chr1', 155150690, 155150700)
        const firstOfPair = alignmentContainer.alignments[0];
        assert.equal("ERR234328.62863390", firstOfPair.readName);

        alignmentContainer = await cramReader.readAlignments('chr16', 12100200, 12100300);
        const secondOfPair = alignmentContainer.alignments[0];
        assert.equal("ERR234328.62863390", secondOfPair.readName);

    })


    test("CRAM - out of region query", async function () {

        const cramReader = new CramReader({
            url: require.resolve('./data/cram/na12889_lossy.cram'),
            indexURL: require.resolve('./data/cram/na12889_lossy.cram.crai'),
            seqFetch: function (seqId, start, end) {
                var fakeSeq = ''
                for (let i = start; i <= end; i += 1) {
                    fakeSeq += 'A'
                }
                return Promise.resolve(fakeSeq)
            }
        });

        const alignmentContainer = await cramReader.readAlignments('chr16', 1, 100);
        assert.equal(0, alignmentContainer.alignments.length);

    })
});





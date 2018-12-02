function runCRAMTests() {


    QUnit.test("CRAM header", function (assert) {

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

        var done = assert.async();

        const cramReader = new igv.CramReader({
                url: 'data/cram/ce_5.tmp.cram',
                indexURL: 'data/cram/ce_5.tmp.cram.crai'
            },
            genome);


        cramReader.getHeader()

            .then(function (header) {

                assert.ok(header);

                const expectedChrNames = ['CHROMOSOME_I', 'CHROMOSOME_II', 'CHROMOSOME_III', 'CHROMOSOME_IV', 'CHROMOSOME_V']
                assert.deepEqual(header.chrNames, expectedChrNames)

                done();
            })

            .catch(function (error) {
                console.error(error);
                assert.ok(false, error);  // failed

            });
    });

    QUnit.test("CRAM alignments", function (assert) {

        var done = assert.async();


        // Mock genome object
        const fasta = new igv.FastaSequence({
            fastaURL: 'data/cram/test.fasta',
            indexed: false
        });


        fasta.init()

            .then(function (ignore) {

                const genome = {
                    getChromosomeName: function (chr) {
                        return chr;
                    },
                    sequence: fasta
                };

                const cramReader = new igv.CramReader({
                        url: 'data/cram/na12889.cram',
                        indexURL: 'data/cram/na12889.cram.crai'
                        // ,
                        // seqFetch: function (seqId, start, end) {
                        //     var fakeSeq = ''
                        //     for (let i = start; i <= end; i += 1) {
                        //         fakeSeq += 'A'
                        //     }
                        //     return Promise.resolve(fakeSeq)
                        // }
                    },
                    genome);


                return cramReader.readAlignments('chr1', 155140000, 155160000)
            })

            .then(function (alignmentContainer) {

                assert.ok(alignmentContainer);

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

                done();
            })


            .catch(function (error) {
                console.error(error);
                assert.ok(false, error);  // failed

            });

    });

    QUnit.test("CRAM lossy alignments - in slice mate", function (assert) {

        var done = assert.async();


        const cramReader = new igv.CramReader({
            url: 'data/cram/na12889_lossy.cram',
            indexURL: 'data/cram/na12889_lossy.cram.crai',
            seqFetch: function (seqId, start, end) {
                var fakeSeq = ''
                for (let i = start; i <= end; i += 1) {
                    fakeSeq += 'A'
                }
                return Promise.resolve(fakeSeq)
            }
        });

        cramReader.readAlignments('chr1', 155140000, 155160000)

            .then(function (alignmentContainer) {

                const pairedAlignment = alignmentContainer.alignments[0];
                assert.ok(pairedAlignment.firstAlignment);
                assert.ok(pairedAlignment.secondAlignment);
                assert.equal(pairedAlignment.firstAlignment.readName, pairedAlignment.secondAlignment.readName);
                done();
            })

            .catch(function (error) {
                console.error(error);
                assert.ok(false, error);  // failed
                done();
            });

    });

    QUnit.test("CRAM lossy alignments - out of slice mate", function (assert) {

        var done = assert.async();


        const cramReader = new igv.CramReader({
            url: 'data/cram/na12889_lossy.cram',
            indexURL: 'data/cram/na12889_lossy.cram.crai',
            seqFetch: function (seqId, start, end) {
                var fakeSeq = ''
                for (let i = start; i <= end; i += 1) {
                    fakeSeq += 'A'
                }
                return Promise.resolve(fakeSeq)
            }
        });

        cramReader.readAlignments('chr1', 155150690, 155150700)
            .then(function (alignmentContainer) {

                const firstOfPair = alignmentContainer.alignments[0];
                assert.equal("ERR234328.62863390", firstOfPair.readName);

                return cramReader.readAlignments('chr16', 12100200, 12100300);
            })

            .then(function (alignmentContainer) {
                const secondOfPair = alignmentContainer.alignments[0];
                assert.equal("ERR234328.62863390", secondOfPair.readName);
                done();
            })

            .catch(function (error) {
                console.error(error);
                assert.ok(false, error);  // failed
                done();
            });

    });


    QUnit.test("CRAM - out of region query", function (assert) {

        var done = assert.async();


        const cramReader = new igv.CramReader({
            url: 'data/cram/na12889_lossy.cram',
            indexURL: 'data/cram/na12889_lossy.cram.crai',
            seqFetch: function (seqId, start, end) {
                var fakeSeq = ''
                for (let i = start; i <= end; i += 1) {
                    fakeSeq += 'A'
                }
                return Promise.resolve(fakeSeq)
            }
        });

        cramReader.readAlignments('chr16', 1, 100)

            .then(function (alignmentContainer) {

                assert.equal(0, alignmentContainer.alignments.length);

                done();
            })

            .catch(function (error) {
                console.error(error);
                assert.ok(false, error);  // failed
                done();
            });

    });
}




// Tests in this file require a server which supports range-byte requests, e.g. Apache.

function runFastaTests() {

    var dataURL = "https://data.broadinstitute.org/igvdata/test/data/";

    QUnit.test("FastaSequence - Test fasata with no index", function (assert) {
        var done = assert.async();

        var sequence = new igv.FastaSequence(
            {
                fastaURL: dataURL + "fasta/test.fasta",
                indexed: false
            }
        );

        sequence.init()

            .then(function () {

                // Note -- coordinates are UCSC style
                // chr22:29565177-29565216
                var expectedSequence = "GCTGC";

                sequence.getSequence("CACNG6--RPLP2", 60, 65)

                    .then(function (seq) {

                        assert.equal(seq, expectedSequence);
                        done();
                    }).catch(function (error) {
                    console.log(error);

                    assert.ok(false);

                    done();
                })
            })
    })

    QUnit.test("FastaSequence - Test getSequence", function (assert) {
        var done = assert.async();

        var sequence = new igv.FastaSequence({fastaURL: dataURL + "fasta/chr22.fa"});

        sequence.init()
            .then(function () {

                // Note -- coordinates are UCSC style
                // chr22:29565177-29565216
                sequence.getSequence("chr22", 29565176, 29565216).then(function (sequence) {

                    assert.ok(sequence, "sequence");

                    var expectedSeqString = "CTTGTAAATCAACTTGCAATAAAAGCTTTTCTTTTCTCAA",
                        seqString = sequence.toUpperCase();

                    assert.equal(seqString, expectedSeqString);

                    done();
                })
            })
            .catch(function (error) {
                console.log(error);

                assert.ok(false);

                done();
            })
    })

    QUnit.test("FastaSequence - Test readSequence", function (assert) {
        var done = assert.async();

        var sequence = new igv.FastaSequence({fastaURL: dataURL + "fasta/chr22.fa"});

        sequence.init()

            .then(function () {

                // Note -- coordinates are UCSC style
                // chr22:29565177-29565216
                sequence.getSequence("chr22", 29565176, 29565216).then(function (sequence) {

                    assert.ok(sequence, "sequence");

                    var expectedSeqString = "CTTGTAAATCAACTTGCAATAAAAGCTTTTCTTTTCTCAA",
                        seqString = sequence.toUpperCase();

                    assert.equal(seqString, expectedSeqString);

                    done();
                })
                    .catch(function (error) {
                        console.log(error);

                        assert.ok(false);

                        done();
                    })
            })
    })

    QUnit.test("FastaSequence - Test readSequence - with unknown sequence", function (assert) {
        var done = assert.async();

        var sequence = new igv.FastaSequence({fastaURL: dataURL + "fasta/chr22.fa"});

        sequence.init()
            .then(function () {

                // Note -- coordinates are UCSC style
                // chr22:29565177-29565216
                sequence.getSequence("noSuchChromosome", 29565176, 29565216).then(function (nullSeq) {

                    assert.ok(!nullSeq);
                    done();
                }).catch(function (error) {
                    console.log(error);
                })
            })
            .catch(function (error) {
                console.log(error);

                assert.ok(false);

                done();
            })
    })


    // >chr1:1000001-1000025
    // GGGCACAGCCTCACCCAGGAAAGCA

    QUnit.test("FastaSequence - Test fasta with start offset", function (assert) {

        var done = assert.async();

        var sequence = new igv.FastaSequence({fastaURL: "data/fasta/sliced.fasta", indexed: false});

        sequence.init()

            .then(function () {

                let expected = "GGGCACAGCCTCACCCAGGAAAGCA";

                sequence.getSequence("chr1", 1000000, 1000025)

                    .then(function (seq) {

                        assert.equal(seq, expected);

                    })
            })
            // .then(function () {
            //
            //     // Off right side
            //     let expected = ""AAGCA*****"";
            //     sequence.getSequence("chr1", 1000020, 1000030)
            //
            //         .then(function (seq) {
            //
            //             assert.equal(seq, expected);
            //
            //         })
            //
            // })
            .then(function () {

                // Off left side
                let expected = "*****GGGCA";
                sequence.getSequence("chr1", 999995, 1000005)

                    .then(function (seq) {

                        assert.equal(seq, expected);

                    })

            })
            .then(function () {

                // way....   Off left side
                let expected = "**********";

                sequence.getSequence("chr1", 10, 20)

                    .then(function (seq) {

                        assert.equal(seq, expected);

                        done();
                    })

            })
            .catch(function (error) {
                console.log(error);

                assert.ok(false);

                done();
            })
    })
}


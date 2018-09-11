// Tests in this file require a server which supports range-byte requests, e.g. Apache.

function runFastaTests() {

    var dataURL = "https://data.broadinstitute.org/igvdata/test/data/";

//    QUnit.test("Fasta index", function (assert) {
//
//        var sequence = igv.FastaSequence.ance();
//
//        sequence.loadIndex(function (index) {
//
//            assert.ok(index, "Expected non-nil index.  Got: " + index);
//
//            var indexEntry = index["chr22"];
//
//            assert.equal(indexEntry.size, 51304566, "indexEntry size");
//            assert.equal(indexEntry.position, 7, "indexEntry position");
//            assert.equal(indexEntry.basesPerLine, 50, "indexEntry basesPerLine");
//            assert.equal(indexEntry.bytesPerLine, 51, "indexEntry bytesPerLine");
//            done();
//        });
//
//    });

    function handleError(error) {
        console.log(error);
        assert.ok(false);
    }

    QUnit.test("FastaSequence - Test fasata with no index", function (assert) {
        var done = assert.async();

        var sequence = new igv.FastaSequence(
            {
                fastaURL: dataURL + "fasta/test.fasta",
                indexed: false
            }
        );

        sequence.init().then(function () {

            // Note -- coordinates are UCSC style
            // chr22:29565177-29565216
            var expectedSequence = "GCTGC";
            sequence.getSequence("CACNG6--RPLP2", 60, 65).then(function (seq) {

                assert.equal(seq, expectedSequence);
                done();
            }).catch(function (error) {
                console.log(error);
            })
        }).catch(handleError)
    })

    QUnit.test("FastaSequence - Test getSequence", function (assert) {
        var done = assert.async();

        var sequence = new igv.FastaSequence({fastaURL: dataURL + "fasta/chr22.fa"});

        sequence.init().then(function () {

            // Note -- coordinates are UCSC style
            // chr22:29565177-29565216
            sequence.getSequence("chr22", 29565176, 29565216).then(function (sequence) {

                assert.ok(sequence, "sequence");

                var expectedSeqString = "CTTGTAAATCAACTTGCAATAAAAGCTTTTCTTTTCTCAA", seqString = sequence.toUpperCase();

                assert.equal(seqString, expectedSeqString);

                done();
            })
        }).catch(handleError)
    })

    QUnit.test("FastaSequence - Test readSequence", function (assert) {
        var done = assert.async();

        var sequence = new igv.FastaSequence({fastaURL: dataURL + "fasta/chr22.fa"});

        sequence.init().then(function () {

            // Note -- coordinates are UCSC style
            // chr22:29565177-29565216
            sequence.readSequence("chr22", 29565176, 29565216).then(function (sequence) {

                assert.ok(sequence, "sequence");

                var expectedSeqString = "CTTGTAAATCAACTTGCAATAAAAGCTTTTCTTTTCTCAA", seqString = sequence.toUpperCase();

                assert.equal(seqString, expectedSeqString);

                done();
            }).catch(handleError)
        })
    })

    QUnit.test("FastaSequence - Test readSequence - with unknown sequence", function (assert) {
        var done = assert.async();

        var sequence = new igv.FastaSequence({fastaURL: dataURL + "fasta/chr22.fa"});

        sequence.init().then(function () {

            // Note -- coordinates are UCSC style
            // chr22:29565177-29565216
            sequence.readSequence("noSuchChromosome", 29565176, 29565216).then(function (nullSeq) {

                assert.ok(!nullSeq);
                done();
            }).catch(function (error) {
                console.log(error);
            })
        }).catch(handleError)
    })

}



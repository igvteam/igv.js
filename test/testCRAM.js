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

        const chr = 'chr1';
        const bpStart = 155140000;
        const bpEnd = 155160000;

        // Mock genome object
        const fasta = new igv.FastaSequence({
            fastaURL: 'data/cram/test.fasta',
            indexed: false
        });


        const bamReader = new igv.BamReader({
            type: 'bam',
            url: 'data/cram/na12889.bam',
            indexURL: 'data/cram/na12889.bam.bai'
        });

        let bamAlignments;

        bamReader.readAlignments(chr, bpStart, bpEnd)

            .then(function (alignments) {

                bamAlignments = alignments;
                return alignments;

            })
            .then(function(ignore) {

                return fasta.init()

            })

            .then(function (ignore) {

                const genome = {
                    getChromosomeName: function (chr) {
                        return chr;
                    },
                    sequence: fasta};

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


                cramReader.readAlignments('chr1', 155140000, 155160000)

                    .then(function (alignmentContainer) {

                        assert.ok(alignmentContainer);

                        // 2 alignments, 1 paired and 1 single
                        assert.equal(alignmentContainer.alignments.length, 2);

                        const firstAlignment = alignmentContainer.alignments[0].firstAlignment;
                        assert.equal(firstAlignment.seq, 'TTCATCTAAAAATCACATTGCAAATTATTCAATATATTTGGGCCTCCATCTCGTTTACATCAATATGTGTTTGTTGAAGTATCTGCCCTGCAATGTCCATA')

                        done();
                    })

            })

            .catch(function (error) {
                console.error(error);
                assert.ok(false, error);  // failed

            });

    });
}




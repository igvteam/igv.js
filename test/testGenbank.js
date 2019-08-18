import igvxhr from "../js/igvxhr.js";

function runGenbankTests() {

    QUnit.test("pten genbank", function (assert) {

        const done = assert.async();

        const url = "data/gbk/pten_test.gbk";
        const parser = new igv.GenbankParser({});


        return igvxhr.loadString(url, {})

            .then(function (data) {
                return parser.parseFeatures(data);
            })
            .then(function (features) {
                const expectedTypes = ["gene", "mRNA", "CDS", "gene", "variation", "variation"];
                const expectedStarts = [0, 0, 1032, 82042, -79, 10554];
                const expectedEnds = [105338, 105338, 102035, 82643, -78, 10555];

                for(let i=0; i<expectedTypes.length; i++) {
                    const bf = features[i];
                    assertEquals(expectedTypes[i], bf.type);
                    assertEquals(expectedStarts[i], bf.start);
                    assertEquals(expectedEnds[i], bf.end);
                }
            })

            .catch(function (error) {

                console.log(error);
                assert.ok(false);
                done();
            })
    });

/*
    String chr = genbankParser.getChr();
    int start = 60;
    int end = 70;
    String expectedSequence = "ttccgaggcg";
    byte[] seqbytes = genbankParser.getSequence(chr, start, end);
    String sequence = new String(seqbytes);
    assertEquals(expectedSequence, sequence);

    // Test end of sequence
    expectedSequence = "tcttgtca";
    end = 105338;
    start = end - expectedSequence.length();
    seqbytes = genbankParser.getSequence(chr, start, end);
    sequence = new String(seqbytes);
    assertEquals(expectedSequence, sequence);


    assertEquals(105338, genbankParser.getSequenceLenth());*/

}

export default runGenbankTests;
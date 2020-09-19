import igvxhr from "../../js/igvxhr.js";
import {setup} from "../util/setup.js";
import GenbankParser from "../../js/gbk/genbank.js"

suite("testGenbank", function () {

    setup();

    test("pten genbank", async function () {

        const url = require.resolve("./data/gbk/pten_test.gbk");
        const parser = new GenbankParser({});

        const data = await igvxhr.loadString(url, {});
        const features = parser.parseFeatures(data);
        const expectedTypes = ["gene", "mRNA", "CDS", "gene", "variation", "variation"];
        const expectedStarts = [0, 0, 1032, 82042, -79, 10554];
        const expectedEnds = [105338, 105338, 102035, 82643, -78, 10555];

        for (let i = 0; i < expectedTypes.length; i++) {
            const bf = features[i];
            assertEquals(expectedTypes[i], bf.type);
            assertEquals(expectedStarts[i], bf.start);
            assertEquals(expectedEnds[i], bf.end);
        }

    })

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

})
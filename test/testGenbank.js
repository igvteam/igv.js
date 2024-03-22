import "./utils/mockObjects.js"
import {igvxhr} from "../node_modules/igv-utils/src/index.js"
import {loadGenbank} from "../js/gbk/genbankParser.js"
import {assert} from 'chai'


//https://ftp.ncbi.nlm.nih.gov/genomes/archive/old_genbank/Fungi/Candida_dubliniensis_CD36_uid38659/FM992689.gbk
suite("testGenbank", function () {

    test("pten genbank", async function () {

        const url = "test/data/gbk/pten_test.gbk"

        const genbank = await loadGenbank(url)
        assert.equal(genbank.locus, "NT_030059")
        assert.equal(genbank.accession, "NT_030059")

        const expectedTypes = ["gene", "mRNA", "CDS", "gene", "variation", "variation"]
        const expectedStarts = [0, 0, 1032, 82042, -79, 10554]
        const expectedEnds = [105338, 105338, 102035, 82643, -78, 10555]

        for (let i = 0; i < expectedTypes.length; i++) {
            const bf = genbank.features[i]
            assert.equal(expectedTypes[i], bf.type)
            assert.equal(expectedStarts[i], bf.start)
            assert.equal(expectedEnds[i], bf.end)
        }

        // Test exons
        //join(1..1111,30588..30672,62076..62120,67609..67652,
        //    69576..69814,88681..88822,94416..94582,97457..97681,
        //    101850..105338)
        const mRNA = genbank.features[1]
        assert.equal(mRNA.exons.length, 9)
        const thirdExon = mRNA.exons[2]
        assert.equal(thirdExon.start, 62076-1)
        assert.equal(thirdExon.end, 62120)

        // Sequence
        const expectedSequence = "gatgtggcgg"
        const start = 120
        const end = start + expectedSequence.length
        const seq = await genbank.getSequence(genbank.chr, start, end)
        assert.equal(seq, expectedSequence)

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
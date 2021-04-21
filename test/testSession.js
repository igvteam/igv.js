import "./utils/mockObjects.js"
import {decodeReference, encodeReference} from "../js/session/sessionConstants.js";
import {assert} from 'chai';

suite("testSession", function () {

    test("Encode object", async function () {

        const refObject = {
            "id": "hg19",
            "name": "Human (CRCh37/hg19)",
            "fastaURL": "https://s3.amazonaws.com/igv.broadinstitute.org/genomes/seq/hg19/hg19.fasta",
            "indexURL": "https://s3.amazonaws.com/igv.broadinstitute.org/genomes/seq/hg19/hg19.fasta.fai",
            "cytobandURL": "https://s3.amazonaws.com/igv.broadinstitute.org/genomes/seq/hg19/cytoBand.txt"
        }

        const input = Object.assign({}, refObject);
        const encodedObject = encodeReference(input);

        assert.equal(Object.keys(refObject).length, Object.keys(encodedObject).length);
        assert.equal(encodedObject["1"], refObject["id"]);
        assert.equal(encodedObject["2"], refObject["name"]);
        assert.equal(encodedObject["3"], refObject["fastaURL"]);
        assert.equal(encodedObject["4"], refObject["indexURL"]);
        assert.equal(encodedObject["5"], refObject["cytobandURL"]);

        const decodedObject = decodeReference(encodedObject);
        assert.equal(Object.keys(refObject).length, Object.keys(encodedObject).length);
        assert.equal(decodedObject["id"], refObject["id"]);
        assert.equal(decodedObject["name"], refObject["name"]);
        assert.equal(decodedObject["fastaURL"], refObject["fastaURL"]);
        assert.equal(decodedObject["indexURL"], refObject["indexURL"]);
        assert.equal(decodedObject["cytobandURL"], refObject["cytobandURL"]);

    })


})




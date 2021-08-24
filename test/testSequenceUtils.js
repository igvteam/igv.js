import "./utils/mockObjects.js"
import {assert} from 'chai';
import {reverseComplementSequence, complementSequence, complementBase} from "../js/util/sequenceUtils.js";

suite("testSequenceUtils", function () {


    test("Complement sequence", async function () {


        const sequence = "ATCG"
        const expectedSequence = "TAGC";
        const compSequence = complementSequence(sequence);
        assert.equal(compSequence, expectedSequence);

    })

    test("Reverse complement sequence",  function () {

        const sequence = "ACCTGAG"
        const expectedSequence = "CTCAGGT";
        const revCompSequence = reverseComplementSequence(sequence);
        assert.equal(revCompSequence, expectedSequence);
    })


})
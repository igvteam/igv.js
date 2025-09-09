import "./utils/mockObjects.js"
import {assert} from 'chai'
import {reverseComplementSequence, complementSequence, complementBase} from "../js/util/sequenceUtils.js"

suite("testSequenceUtils", function () {


    test("Complement sequence", async function () {


        const sequence = "ATCG"
        const expectedSequence = "TAGC"
        const compSequence = complementSequence(sequence)
        assert.equal(compSequence, expectedSequence)
        assert.equal(complementSequence("*"), "*")

    })

    test("Reverse complement sequence", function () {

        const sequence = "ACCTGAG"
        const expectedSequence = "CTCAGGT"
        const revCompSequence = reverseComplementSequence(sequence)
        assert.equal(revCompSequence, expectedSequence)
        assert.equal(reverseComplementSequence("*"), "*")
    })

    test("Complement base", function () {

        assert.equal(complementBase('A'), 'T')
        assert.equal(complementBase('a'), 't')
        assert.equal(complementBase('C'), 'G')
        assert.equal(complementBase('c'), 'g')
        assert.equal(complementBase('G'), 'C')
        assert.equal(complementBase('g'), 'c')
        assert.equal(complementBase('T'), 'A')
        assert.equal(complementBase('t'), 'a')

        assert.equal(complementBase('N'), 'N')
        assert.equal(complementBase('n'), 'n')
        assert.equal(complementBase('X'), 'X')
        assert.equal(complementBase('*'), '*')

    })


})
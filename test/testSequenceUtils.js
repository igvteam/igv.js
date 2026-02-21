import {assert} from './utils/assert.js'
import {reverseComplementSequence, complementSequence, complementBase} from "../js/util/sequenceUtils.js"

describe("testSequenceUtils", function () {


    it("Complement sequence", async function () {


        const sequence = "ATCG"
        const expectedSequence = "TAGC"
        const compSequence = complementSequence(sequence)
        assert.equal(compSequence, expectedSequence)
        assert.equal(complementSequence("*"), "*")

    })

    it("Reverse complement sequence", function () {

        const sequence = "ACCTGAG"
        const expectedSequence = "CTCAGGT"
        const revCompSequence = reverseComplementSequence(sequence)
        assert.equal(revCompSequence, expectedSequence)
        assert.equal(reverseComplementSequence("*"), "*")
    })

    it("Complement base", function () {

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
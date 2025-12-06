import "./utils/mockObjects.js"
import {assert} from 'chai'
import {ClinVar} from "../js/genome/clinVar.js"


suite("test ClinVar", function () {

    test("ClinVar record exists", async function () {
        const existingHgvs = "NM_000546.5:c.215C>G" // Known to exist
        const nonExistingHgvs = "NM_000000.0:c.9999A>T" // Known not to exist
        const existingResult = await ClinVar.getClinVarURL(existingHgvs)
        const expectedValue = "https://www.ncbi.nlm.nih.gov/clinvar/variation/237944/"
        assert.equal(existingResult, expectedValue)

        const nonExistingResult = await ClinVar.getClinVarURL(nonExistingHgvs)
        assert.isNull(nonExistingResult)
    })

})

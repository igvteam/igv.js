import "./utils/mockObjects.js"
import loadPlinkFile from "../js/sample/plinkSampleInformation.js"
import {assert} from 'chai'
import SampleInfo from "../js/sample/sampleInfo.js"

suite("test sample info", function () {

    // Mock browser object
    const browser = {
        tracks: [{getSamples: function (){}}]
    }

    test('Sample Info', async function () {
        const sampleInfo = new SampleInfo(browser)
        await sampleInfo.loadSampleInfoFile('test/data/sample/GBM.txt')
        const attributes = sampleInfo.getAttributes("FALLS_p_TCGAaffxB4_1_GenomeWideSNP_6_C06_190576")
        assert.equal(sampleInfo.attributeCount, 12)
        assert.ok(sampleInfo.hasAttributes())
        assert.equal(attributes["Subtype"], "Proneural")
    })

    test('Sample table', async function () {
        const sampleInfo = new SampleInfo(browser)
        await sampleInfo.loadSampleInfoFile('test/data/sample/GBM-sampletable.txt')
        const attributes = sampleInfo.getAttributes("FALLS_p_TCGAaffxB4_1_GenomeWideSNP_6_C06_190576")
        assert.equal(sampleInfo.attributeCount, 12)
        assert.ok(sampleInfo.hasAttributes())
        assert.equal(attributes["Subtype"], "Proneural")
    })

    test('Sample mapping & colors', async function () {
        //TCGA-06-0173	Neural	0.084929651	FEMALE	NA	73	No	136	DEAD	0	Methylated	95	17.5
        const sampleInfo = new SampleInfo(browser)
        await sampleInfo.loadSampleInfoFile('test/data/sample/GBM-sampletable-samplemapping-colors.txt')
        const attributes = sampleInfo.getAttributes("FALLS_p_TCGAaffxB4_1_GenomeWideSNP_6_C06_190576")
        assert.equal(sampleInfo.attributeCount, 12)
        assert.ok(sampleInfo.hasAttributes())
        assert.equal(attributes["Subtype"], "Neural")   // Note the data files are inconsistent for this sample

        //*	Neural	10,150,220
        const color = sampleInfo.getAttributeColor("Subtype", "Neural")
        assert.equal(color, "rgb(10,150,220)")
    })


    test('Sort by attribute retains samples with no value', async function () {

        const sampleInfo = new SampleInfo(browser)
        await sampleInfo.loadSampleInfoFile('test/data/sample/GBM.txt')

        const known = "FALLS_p_TCGAaffxB4_1_GenomeWideSNP_6_C06_190576"
        const unknown = "NO_SUCH_SAMPLE"         // no attribute record at all
        const sampleKeys = [known, unknown]

        for (const direction of [1, -1]) {
            const sorted = sampleInfo.sortSampleKeysByAttribute(sampleKeys, "Subtype", direction)
            assert.equal(sorted.length, sampleKeys.length)
            assert.includeMembers(sorted, sampleKeys)
            assert.equal(sorted[sorted.length - 1], unknown)   // no-value samples sort last
        }
    })

    // PLINK support is deprecated
    test('PLINK', async function () {
        const sampleInfo = await loadPlinkFile('test/data/misc/pedigree.fam')
        const attributes = sampleInfo.getAttributes('SS0012979')
        assert.ok(attributes)
        assert.equal(attributes["familyId"], "14109")

    })
})
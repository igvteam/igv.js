import "./utils/mockObjects.js"
import {assert} from 'chai'
import Hub from "../js/ucsc/ucscHub.js"
import Trix from "../js/ucsc/trix.js"
import BWReader from "../js/bigwig/bwReader.js"
import DynamicBPTree from "../js/bigwig/dynamicBPTree.js"


suite("ucsc utilities", function () {


    test("hub.txt", async function () {

        this.timeout(200000)

        const hub = await Hub.loadHub({url: "https://hgdownload.soe.ucsc.edu/hubs/GCF/000/186/305/GCF_000186305.1/hub.txt"})
        assert.ok(hub.hub)
        assert.ok(hub.genomeStanza)
        assert.equal(22, hub.trackStanzas.length)

        const genomeConfig = hub.getGenomeConfig()
        //const genome = await GenomeUtils.loadGenome(genomeConfig)

        assert.ok(genomeConfig)
        assert.equal("GCF_000186305.1", genomeConfig.id)
        assert.equal("Python bivittatus", genomeConfig.name)
        assert.ok(genomeConfig.twobitURL)
        assert.ok(genomeConfig.aliasBbURL)
        assert.ok(genomeConfig.cytobandBbURL)

        //const genome = await GenomeUtils.loadGenome(genomeConfig)
        //assert.ok(genome)

    })

    test("trix", async function () {

        this.timeout(200000)
        const ixFile = "https://hgdownload.soe.ucsc.edu/hubs/GCF/019/356/215/GCF_019356215.1/ixIxx/GCF_019356215.1_ASM1935621v1.ncbiGene.ix"
        const ixxFile = "https://hgdownload.soe.ucsc.edu/hubs/GCF/019/356/215/GCF_019356215.1/ixIxx/GCF_019356215.1_ASM1935621v1.ncbiGene.ixx"

        const trix = new Trix(ixxFile, ixFile, 10)

        const results = await trix.search("adeG")

        console.log(results)

    })

    /**
     * Test parsing a gene file from the T2T hub
     * https://hgdownload.soe.ucsc.edu/hubs/GCA/009/914/755/GCA_009914755.4/bbi/GCA_009914755.4_T2T-CHM13v2.0.ncbiRefSeq.bb
     */
    test("test gene bb", async function () {

        const url = "https://hgdownload.soe.ucsc.edu/hubs/GCA/009/914/755/GCA_009914755.4/bbi/GCA_009914755.4_T2T-CHM13v2.0.ncbiRefSeq.bb"
        //const url = "test/GCA_009914755.4_T2T-CHM13v2.0.ncbiRefSeq.bb"


        const bbReader = new BWReader({url: url, format: "bigbed"})
        const header = await bbReader.loadHeader()
        assert.ok(header)

        const indexOffset = bbReader.header.indexOffset[0]

        const bpTree = new DynamicBPTree(url, indexOffset)
        assert.ok(bpTree)

        await bpTree.init()

        const results = await bpTree.search("XR_007095612.1") //"NM_000275.3")

        console.log(results)

    })

})

/*  Example genome stanza
genome GCF_000186305.1
taxId 176946
groups groups.txt
description Burmese python
twoBitPath GCF_000186305.1.2bit
twoBitBptUrl GCF_000186305.1.2bit.bpt
chromSizes GCF_000186305.1.chrom.sizes.txt
chromAliasBb GCF_000186305.1.chromAlias.bb
organism Python_molurus_bivittatus-5.0.2 Sep. 2013
defaultPos NW_006532014.1:484194-494194
scientificName Python bivittatus
htmlPath html/GCF_000186305.1_Python_molurus_bivittatus-5.0.2.description.html
blat dynablat-01.soe.ucsc.edu 4040 dynamic GCF/000/186/305/GCF_000186305.1
transBlat dynablat-01.soe.ucsc.edu 4040 dynamic GCF/000/186/305/GCF_000186305.1
isPcr dynablat-01.soe.ucsc.edu 4040 dynamic GCF/000/186/305/GCF_000186305.1
 */
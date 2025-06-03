import "./utils/mockObjects.js"
import {assert} from 'chai'
import {convertToHubURL} from "../src/igvCore/ucsc/ucscUtils.js"
import {loadStanzas, loadHub} from "../src/igvCore/ucsc/hub/hubParser.js"
import TrackDbHub from "../src/igvCore/ucsc/hub/trackDbHub.js"
import {parseMetadata} from "../src/igvCore/ucsc/hub/trackDbHub.js"

suite("hub.txt", function () {

    test("get genome configs", async function () {

        const hubFile = "test/data/hubs/hub.txt"
        const hub = await loadHub(hubFile)
        assert.ok(hub.hubStanza)
        // assert.ok(hub.genomeStanza);
        // assert.equal(22, hub.trackStanzas.length);

        const genomeConfig = hub.getGenomeConfig("GCF_000186305.1")
        assert.ok(genomeConfig)
        assert.equal("GCF_000186305.1", genomeConfig.id)
        assert.equal("Burmese python (GCF_000186305.1)", genomeConfig.name)
        assert.ok(genomeConfig.twoBitBptURL)
        assert.ok(genomeConfig.twoBitURL)
        assert.ok(genomeConfig.chromAliasBbURL)
    })


    test("genome config", async function () {

        this.timeout(20000)

        const hubURL = convertToHubURL("GCF_000186305.1")
        const hub = await loadHub(hubURL)
        assert.ok(hub.hubStanza)
        assert.ok(hub.genomeStanzas)
        assert.equal(22, hub.trackStanzas.length)

        const genomeConfig = hub.getGenomeConfig()
        //const genome = await Genome.loadGenome(genomeConfig)

        assert.ok(genomeConfig)
        assert.equal("GCF_000186305.1", genomeConfig.id)
        assert.equal("Burmese python (GCF_000186305.1)", genomeConfig.name)
        assert.ok(genomeConfig.twoBitBptURL)
        assert.ok(genomeConfig.twoBitURL)
        assert.ok(genomeConfig.chromAliasBbURL)
    })

    test("track configs", async function () {

        this.timeout(20000)
        const hubURL = convertToHubURL("GCF_000186305.1")
        const hub = await loadHub(hubURL)
        const groupedTrackConfigurations = await hub.getGroupedTrackConfigurations("GCF_000186305.1")
        assert.equal(5, groupedTrackConfigurations.length)
    })

    /**
     * group roadmap
     * .. track CompRoadmapbySample
     * .... track CompRoadmap_HUES64
     * ...... track CompRoadmap_HUES64ViewCOV
     * ........ track ENCFF002FAZ_HUES64_ChIP-seq_bySample
     * ........ track ENCFF021OWW_HUES64_ChIP-seq_bySample
     *
     * @throws IOException
     */

    test("supertrack", async function () {

        const stanzas = await loadStanzas("test/data/hubs/supertrack_hub.txt")
        assert.equal(stanzas.length, 7)
        const trackDbHub = new TrackDbHub(stanzas, null)

        const containers = trackDbHub.getGroupedTrackConfigurations()
        assert.equal(1, containers.length)

        const superTrack = containers[0]
        assert.equal("CompRoadmapbySample", superTrack.name)
        assert.equal(1, superTrack.children.length)

        const compositeTrack = superTrack.children[0]
        assert.equal("HUES64 tracks", compositeTrack.label)
        assert.equal(1, compositeTrack.children.length)

        const view = compositeTrack.children[0]
        assert.equal("Coverage", view.label)
        assert.equal(0, view.children.length)
        assert.equal(2, view.tracks.length)

        const track = view.tracks[0]
        const meta = track.attributes
        assert.equal(4, meta.size)
    })

    test("grouped containers", async function () {
        const stanzas = await loadStanzas("test/data/hubs/gtexCoverage.txt")
        const groupStanzas = await loadStanzas("test/data/hubs/groups.txt")
        const trackDbHub = new TrackDbHub(stanzas, groupStanzas)
        const containers = trackDbHub.getGroupedTrackConfigurations()
        assert.equal(1, containers.length)

        const groupContainer = containers[0]
        assert.equal("expression", groupContainer.name)
        assert.equal(1, groupContainer.children.length)
        assert.equal(0, groupContainer.tracks.length)

        const compositeContainer = groupContainer.children[0]
        assert.equal("gtexCov", compositeContainer.name)
        assert.equal(0, compositeContainer.children.length)
        assert.equal(2, compositeContainer.tracks.length)
    })

    test("NCBI Hosted Hub", async function () {

        this.timeout(20000)

        const hubFile = "https://ftp.ncbi.nlm.nih.gov/snp/population_frequency/TrackHub/latest/hub.txt"
        const hub = await loadHub(hubFile)
        const groupedTrackConfigurations = await hub.getGroupedTrackConfigurations("hg38")
        assert.equal(1, groupedTrackConfigurations.length)
        assert.equal(12, groupedTrackConfigurations[0].tracks.length)
    })

    test("parse metadata", async function () {
        const metadata = "differentiation=\"10 hour\" treatment=X donor=A lab=\"List Meta Lab\" data_set_id=ucscTest1 access=group assay=long-RNA-seq enriched_in=exon life_stage=postpartum species=\"Homo sapiens\" ucsc_db=hg38"
        const metadataMap = parseMetadata(metadata)
        assert.equal(11, metadataMap.size)
        assert.equal("X", metadataMap.get("Treatment"))
        assert.equal("10 hour", metadataMap.get("Differentiation"))
        assert.equal("A", metadataMap.get("Donor"))
        assert.equal("group", metadataMap.get("Access"))
        assert.equal("hg38", metadataMap.get("Ucsc_db"))
        assert.equal("Homo sapiens", metadataMap.get("Species"))
        assert.equal("postpartum", metadataMap.get("Life_stage"))
        assert.equal("long-RNA-seq", metadataMap.get("Assay"))
    })

    test("parse metadata2", async function () {
        const metadata = "\"Epigenome_Mnemonic\"=\"GI.STMC.GAST\" \"Standardized_Epigenome_name\"=\"Gastric\" \"EDACC_Epigenome_name\"=\"Gastric\" \"Group\"=\"<span style=\"color:#C58DAA\">Digestive</span>\" \"Age\"=\"34Y\" \"Lab\"=\"UCSD\" \"Sex\"=\"Male\" \"Anatomy\"=\"GI_STOMACH\" \"EID\"=\"E094\" \"Type\"=\"PrimaryTissue\" \"Order\"=\"100\" \"Ethnicity\"=\"Caucasian\""
        const metadataMap = parseMetadata(metadata)
        assert.equal("GI.STMC.GAST", metadataMap.get("Epigenome_Mnemonic"))
        assert.equal("Digestive", metadataMap.get("Group"))
        assert.equal("Caucasian", metadataMap.get("Ethnicity"))
    })

})


import TextFeatureSource from "../js/feature/textFeatureSource.js"
import QTLSelections from "../js/qtl/qtlSelections.js"
import FeatureRenderer from "../js/feature/featureRenderer.js"
import AnnotationRenderService from './annotationRenderService.js'

function createAnnotationRenderService(container, genome) {
    const featureSourceConfig = {
        "id": "refseqSelect",
        "url": "https://hgdownload.soe.ucsc.edu/goldenPath/hg19/database/ncbiRefSeqSelect.txt.gz",
        "format": "refgene",
        "html": "https://www.ncbi.nlm.nih.gov/refseq/refseq_select/",
        "type": "annotation"
    }

    const featureSource = new TextFeatureSource(featureSourceConfig)

    const featureRendererConfig = {
        "format": "refgene",
        "type": "annotation",
        browser: { genome, qtlSelections: new QTLSelections() }
    }

    const featureRenderer = new FeatureRenderer(featureRendererConfig)

    return new AnnotationRenderService(container, featureRenderer, featureSource)
} 

export { createAnnotationRenderService }
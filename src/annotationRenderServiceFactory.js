import TextFeatureSource from "./igvCore/feature/textFeatureSource.js"
import QTLSelections from "./igvCore/qtl/qtlSelections.js"
import FeatureRenderer from "./igvCore/feature/featureRenderer.js"
import AnnotationRenderService from './annotationRenderService.js'

function createAnnotationRenderService(container, genome) {

    const [ refseqSelectTrackConfig ] = genome.config.tracks

    const featureSource = new TextFeatureSource({ ...refseqSelectTrackConfig, type: "annotation" })

    const browser = { genome, qtlSelections: new QTLSelections() }
    const featureRendererConfig = { format: "refgene", type: "annotation", displayMode: "COLLAPSED", browser }

    const featureRenderer = new FeatureRenderer(featureRendererConfig)

    return new AnnotationRenderService(container, featureRenderer, featureSource)
}

export { createAnnotationRenderService }

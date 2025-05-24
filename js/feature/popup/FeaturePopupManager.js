import {StringUtils} from "../../../node_modules/igv-utils/src/index.js"

export default class FeaturePopupManager {
    constructor(config) {
        this.infoURL = config.infoURL
    }

    getPopupData(clickState, features) {
        if (features === undefined) features = this.clickedFeatures(clickState)
        const genomicLocation = clickState.genomicLocation
        const data = []

        for (let feature of features) {
            // Whole genome hack, whole-genome psuedo features store the "real" feature in an _f field
            const f = feature._f || feature

            const featureData = (typeof f.popupData === "function") ?
                f.popupData(genomicLocation) :
                this.extractPopupData(f)

            if (featureData) {
                if (data.length > 0) {
                    data.push("<hr/><hr/>")
                }

                // Handle infoURL for name properties
                const infoURL = this.infoURL || this.config.infoURL
                for (let fd of featureData) {
                    data.push(fd)
                    if (infoURL &&
                        fd.name &&
                        fd.name.toLowerCase() === "name" &&
                        fd.value &&
                        StringUtils.isString(fd.value) &&
                        !fd.value.startsWith("<")) {
                        const href = infoURL.replace("$$", feature.name)
                        fd.value = `<a target=_blank href=${href}>${fd.value}</a>`
                    }
                }

                // Handle exon numbers
                const isGFF = "gff" === this.config.format || "gff3" === this.config.format || "gtf" === this.config.format
                if (f.exons && f.exons.length > 1) {
                    for (let i = 0; i < f.exons.length; i++) {
                        const exon = f.exons[i]
                        if (genomicLocation >= exon.start && genomicLocation <= exon.end) {
                            const exonNumber = isGFF ?
                                exon.number :
                                f.strand === "-" ? f.exons.length - i : i + 1
                            if (exonNumber) {
                                data.push('<hr/>')
                                data.push({name: "Exon Number", value: exonNumber})
                            }
                            break
                        }
                    }
                }
            }
        }

        return data
    }

    extractPopupData(feature) {
        // This method should be implemented by the specific feature type
        return []
    }
} 
import {igvxhr} from "../../node_modules/igv-utils/src/index.js"

const GtexUtils = {

    getTissueInfo: function (datasetId, baseURL) {
        datasetId = datasetId || 'gtex_v8'
        baseURL = baseURL || 'https://gtexportal.org/api/v2'
        let url = baseURL + '/dataset/tissueInfo?datasetId=' + datasetId
        return igvxhr.loadJson(url, {})
    },

    trackConfiguration: function (tissueSummary, baseURL) {
        baseURL = baseURL || 'https://gtexportal.org/api/v2'
        return {
            type: "eqtl",
            sourceType: "gtex-ws",
            url: baseURL + '/association/singleTissueEqtlByLocation',
            tissueSiteDetailId: tissueSummary.tissueSiteDetailId,
            name: (tissueSummary.tissueSiteDetailId.split('_').join(' ')),
            visibilityWindow: 250000
        }
    }
}

export default GtexUtils
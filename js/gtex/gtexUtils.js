import {igvxhr} from "../../node_modules/igv-utils/src/index.js";

const GtexUtils = {

    getTissueInfo: function (datasetId, baseURL) {
        datasetId = datasetId || 'gtex_v8';
        baseURL = baseURL || 'https://gtexportal.org/rest/v1';
        let url = baseURL + '/dataset/tissueInfo?datasetId=' + datasetId;
        return igvxhr.loadJson(url, {})
    },

    //https://gtexportal.org/rest/v1/association/singleTissueEqtlByLocation?chromosome=7&start=98358766&end=101523798&tissueName=Liver&datasetId=gtex_v7
    //https://gtexportal.org/rest/v1/association/singleTissueEqtlByLocation?chromosome=7&start=98358766&end=101523798&tissueSiteDetailId=Liver&datasetId=gtex_v8
    trackConfiguration: function (tissueSummary, baseURL) {
        baseURL = baseURL || 'https://gtexportal.org/rest/v1';
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

export default GtexUtils;
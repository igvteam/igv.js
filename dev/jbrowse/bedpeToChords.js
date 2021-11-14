const fs = require('fs');
import VcfParser from "../../js/variant/vcfParser.js";
import getDataWrapper from "../../js/feature/dataWrapper.js";

vcfToBed();

async function vcfToChords() {

    const input = require.resolve("../../test/data/vcf/SKBR3_Sniffles_variants_tra.vcf");
    const data = fs.readFileSync(input, 'utf-8');

    const parser = new VcfParser();
    let dataWrapper = getDataWrapper(data);
    await parser.parseHeader(dataWrapper);

    dataWrapper = getDataWrapper(data)
    const featureList = await parser.parseFeatures(dataWrapper);
    for (let v of featureList) {

        if (v.info.CHR2 && v.info.END) {
            const chr2 = v.info.CHR2;
            const pos2 = Number.parseInt(v.info.END);
            const start2 = pos2 - 100;
            const end2 = pos2 + 100;

            if(bedPE) {
                console.log(`${v.chr}\t${v.start - 100}\t${v.end + 100}\t${chr2}\t${start2}\t${end2}`);
            } else {
                console.log(`${v.chr}\t${v.start - 100}\t${v.end + 100}`);
                console.log(`${chr2}\t${start2}\t${end2}`);
            }
        }
    }

}

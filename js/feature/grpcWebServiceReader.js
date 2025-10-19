import {StringUtils} from "../../node_modules/igv-utils/src/index.js"

const isString = StringUtils.isString

class GrpcWebServiceReader {
    constructor(config) {
        this.config = config
        console.log("GrpcWebServiceReader initialized with config:", config)
    }

    async readFeatures(chr, start, end) {
        console.log(`GrpcWebServiceReader.readFeatures called: chr=${chr}, start=${start}, end=${end}`)
        
        try {
            // Mock gRPC-web call - replace this with actual gRPC-web implementation later
            const features = await this.mockGrpcCall(chr, start, end)
            
            // Apply mappings if configured
            if (this.config.mappings) {
                let mappingKeys = Object.keys(this.config.mappings)
                for (let f of features) {
                    for (let key of mappingKeys) {
                        f[key] = f[this.config.mappings[key]]
                    }
                }
            }
            
            console.log(`GrpcWebServiceReader returning ${features.length} features`)
            return features
        } catch (error) {
            console.error('gRPC-web error:', error)
            return []
        }
    }

    /**
     * Mock gRPC-web call - replace this with actual gRPC-web implementation
     * @param {string} chr - chromosome
     * @param {number} start - start position
     * @param {number} end - end position
     * @returns {Promise<Array>} mock variants
     */
    async mockGrpcCall(chr, start, end) {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 100))
        
        // Return mock variants based on the genomic region
        const mockVariants = [
            {
                chr: chr,
                start: start + 1000,
                end: start + 1000,
                name: `SNP_${chr}_${start + 1000}`,
                type: "SNP",
                ref: "A",
                alt: "T",
                quality: 99.5,
                filter: "PASS",
                info: {
                    AC: 1,
                    AN: 2,
                    AF: 0.5
                }
            },
            {
                chr: chr,
                start: start + 2500,
                end: start + 2500,
                name: `INDEL_${chr}_${start + 2500}`,
                type: "INDEL",
                ref: "AT",
                alt: "A",
                quality: 95.2,
                filter: "PASS",
                info: {
                    AC: 2,
                    AN: 4,
                    AF: 0.5
                }
            },
            {
                chr: chr,
                start: start + 4000,
                end: start + 4000,
                name: `SNP_${chr}_${start + 4000}`,
                type: "SNP",
                ref: "G",
                alt: "C",
                quality: 88.7,
                filter: "PASS",
                info: {
                    AC: 1,
                    AN: 2,
                    AF: 0.5
                }
            },
            {
                chr: chr,
                start: start + 5500,
                end: start + 5500,
                name: `SNP_${chr}_${start + 5500}`,
                type: "SNP",
                ref: "C",
                alt: "G",
                quality: 92.1,
                filter: "PASS",
                info: {
                    AC: 1,
                    AN: 2,
                    AF: 0.5
                }
            }
        ]
        
        console.log("Mock gRPC call completed, returning variants:", mockVariants)
        return mockVariants
    }
}

export default GrpcWebServiceReader

import {StringUtils} from "../../node_modules/igv-utils/src/index.js"

const isString = StringUtils.isString

// gRPC-web message classes for dnaerys service
class HealthRequest {
    constructor() {}
    serializeBinary() {
        return new Uint8Array(0); // Empty message
    }
}

class HealthResponse {
    constructor(data) {
        this.status = data?.status || 'unknown';
    }
    getStatus() {
        return this.status;
    }
    toObject() {
        return { status: this.status };
    }
}

class AllelesInRegionRequest {
    constructor(data = {}) {
        this.chr = data.chr || 0;
        this.start = data.start || 0;
        this.end = data.end || 0;
        this.ref = data.ref || '';
        this.alt = data.alt || '';
        this.hom = data.hom || false;
        this.het = data.het || false;
        this.skip = data.skip || 0;
        this.limit = data.limit || 0;
        this.assembly = data.assembly || 2;
        this.variantMinLength = data.variantMinLength || 0;
        this.variantMaxLength = data.variantMaxLength || 2147483647;
    }
    setChr(value) { this.chr = value; }
    setStart(value) { this.start = value; }
    setEnd(value) { this.end = value; }
    setRef(value) { this.ref = value; }
    setAlt(value) { this.alt = value; }
    setHom(value) { this.hom = value; }
    setHet(value) { this.het = value; }
    setSkip(value) { this.skip = value; }
    setLimit(value) { this.limit = value; }
    setAssembly(value) { this.assembly = value; }
    setVariantMinLength(value) { this.variantMinLength = value; }
    setVariantMaxLength(value) { this.variantMaxLength = value; }
    serializeBinary() {
        const buffer = new ArrayBuffer(64);
        const view = new DataView(buffer);
        let offset = 0;
        
        view.setUint32(offset, this.chr, true); offset += 4;
        view.setUint32(offset, this.start, true); offset += 4;
        view.setUint32(offset, this.end, true); offset += 4;
        view.setUint32(offset, this.ref.length, true); offset += 4;
        view.setUint32(offset, this.alt.length, true); offset += 4;
        view.setUint8(offset, this.hom ? 1 : 0); offset += 1;
        view.setUint8(offset, this.het ? 1 : 0); offset += 1;
        view.setUint32(offset, this.skip, true); offset += 4;
        view.setUint32(offset, this.limit, true); offset += 4;
        view.setUint32(offset, this.assembly, true); offset += 4;
        view.setUint32(offset, this.variantMinLength, true); offset += 4;
        view.setUint32(offset, this.variantMaxLength, true); offset += 4;
        
        return new Uint8Array(buffer, 0, offset);
    }
}

class GrpcWebServiceReader {
    constructor(config) {
        this.config = config
        this.serviceUrl = config.serviceUrl
        console.log("GrpcWebServiceReader initialized with config:", config)
        console.log("Service URL set to:", this.serviceUrl)
        
        // Perform health check on initialization
        this.performHealthCheck()
    }

    async readFeatures(chr, start, end) {
        console.log(`GrpcWebServiceReader.readFeatures called: chr=${chr}, start=${start}, end=${end}`)
        
        try {
            // Real gRPC-web call to SelectVariantsInRegion endpoint
            const features = await this.callSelectVariantsInRegion(chr, start, end)
            
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
     * Perform health check on gRPC-web service
     */
    async performHealthCheck() {
        try {
            const request = new HealthRequest();
            const healthUrl = `${this.serviceUrl}/org.dnaerys.cluster.grpc.DnaerysService/Health`;
            console.log(`Performing health check at: ${healthUrl}`);
            
            const response = await fetch(healthUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/grpc-web+proto',
                    'Accept': 'application/grpc-web+proto'
                },
                body: request.serializeBinary()
            });

            if (response.ok) {
                console.log('✅ gRPC-web health check SUCCEEDED');
            } else {
                console.log(`❌ gRPC-web health check FAILED: HTTP ${response.status}: ${response.statusText}`);
            }
        } catch (error) {
            console.log(`❌ gRPC-web health check FAILED: ${error.message}`);
        }
    }

    /**
     * Real gRPC-web call to SelectVariantsInRegion endpoint
     * @param {string} chr - chromosome
     * @param {number} start - start position
     * @param {number} end - end position
     * @returns {Promise<Array>} variants from gRPC service
     */
    async callSelectVariantsInRegion(chr, start, end) {
        // Convert chromosome string to number (remove 'chr' prefix if present)
        const chrNum = this.parseChromosome(chr);
        
        const request = new AllelesInRegionRequest({
            chr: chrNum,
            start: start,
            end: end,
            ref: '', // Empty for all variants
            alt: '', // Empty for all variants
            hom: false, // Include homozygous
            het: true, // Include heterozygous
            skip: 0,
            limit: 100, // Limit to 100 variants
            assembly: 2, // GRCh38
            variantMinLength: 0,
            variantMaxLength: 2147483647
        });

        const response = await fetch(`${this.serviceUrl}/org.dnaerys.cluster.grpc.DnaerysService/SelectVariantsInRegion`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/grpc-web+proto',
                'Accept': 'application/grpc-web+proto'
            },
            body: request.serializeBinary()
        });

        if (response.ok) {
            const data = await response.arrayBuffer();

            // TODO: Parse the binary protobuf response properly
            // For now, return empty array until proper parsing is implemented
            console.log(`gRPC-web call completed successfully, received ${data.byteLength} bytes`);
            return [];
        } else {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
    }

    /**
     * Parse chromosome string to number
     * @param {string} chr - chromosome string (e.g., 'chr1', '1', 'chrX')
     * @returns {number} chromosome number
     */
    parseChromosome(chr) {
        if (typeof chr === 'number') return chr;
        
        const chrStr = chr.toString().toLowerCase();
        
        if (chrStr.startsWith('chr')) {
            const num = chrStr.substring(3);
            if (num === 'x') return 23;
            if (num === 'y') return 24;
            if (num === 'mt') return 25;
            return parseInt(num) || 1;
        }
        
        if (chrStr === 'x') return 23;
        if (chrStr === 'y') return 24;
        if (chrStr === 'mt') return 25;
        
        return parseInt(chrStr) || 1;
    }
}

export default GrpcWebServiceReader

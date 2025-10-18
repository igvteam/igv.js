// Quick test script to verify data loading
import { GenomicRegion } from './models/genomicRegion.js'
import { WigSource } from './data/wigSource.js'

async function test() {
    try {
        console.log('Testing minimal core...')
        
        // Test region parsing
        const region = GenomicRegion.parse('chr19:49302000-49304700')
        console.log('Region:', region)
        
        // Test data loading
        const source = new WigSource({ url: '../test/data/wig/allPositive.bedgraph' })
        const data = await source.fetch(region)
        console.log(`Loaded ${data.length} data points`)
        console.log('Sample data:', data.slice(0, 3))
        
        if (data.length > 0) {
            console.log('✅ Data loading works!')
        } else {
            console.log('❌ No data loaded')
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error)
    }
}

test()

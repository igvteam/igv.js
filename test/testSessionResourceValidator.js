import {assert} from 'chai'
import {
    isLocalFile,
    isGoogleDriveURL,
    isProblematicResource
} from '../js/util/sessionResourceValidator.js'

suite('Session Resource Validator', function () {

    test('isGoogleDriveURL detects googleapis.com URLs', function () {
        const url1 = 'https://www.googleapis.com/drive/v3/files/1pO8Czk913zXRhU7MeWnXB6uSIwNpNqDV?alt=media&supportsAllDrives=true'
        const url2 = 'https://drive.google.com/file/d/abc123/view'
        const url3 = 'https://example.com/file.bed'
        const url4 = 'https://s3.amazonaws.com/bucket/file.bed'
        
        assert.equal(isGoogleDriveURL(url1), true, 'Should detect googleapis.com/drive URL')
        assert.equal(isGoogleDriveURL(url2), true, 'Should detect drive.google.com URL')
        assert.equal(isGoogleDriveURL(url3), false, 'Should not detect normal URL')
        assert.equal(isGoogleDriveURL(url4), false, 'Should not detect S3 URL')
        assert.equal(isGoogleDriveURL(null), false, 'Should handle null')
        assert.equal(isGoogleDriveURL(123), false, 'Should handle non-string')
        assert.equal(isGoogleDriveURL(undefined), false, 'Should handle undefined')
    })

    test('isLocalFile detects File objects', function () {
        const notAFile1 = 'https://example.com/file.bed'
        const notAFile2 = { name: 'file.txt' }
        const notAFile3 = null
        
        assert.equal(isLocalFile(notAFile1), false, 'Should not detect string as File')
        assert.equal(isLocalFile(notAFile2), false, 'Should not detect object as File')
        assert.equal(isLocalFile(notAFile3), false, 'Should handle null')
    })

    test('isProblematicResource detects resource types', function () {
        const googleDriveURL = 'https://drive.google.com/file/d/abc123'
        const normalURL = 'https://example.com/file.bed'
        
        assert.equal(isProblematicResource(googleDriveURL), 'google-drive', 'Should detect Google Drive URL')
        assert.equal(isProblematicResource(normalURL), null, 'Should return null for normal URL')
        assert.equal(isProblematicResource(null), null, 'Should handle null')
    })

    test('isGoogleDriveURL detects various Google Drive URL formats', function () {
        const formats = [
            'https://www.googleapis.com/drive/v3/files/abc123?alt=media',
            'https://drive.google.com/file/d/abc123/view',
            'https://drive.google.com/open?id=abc123',
            'https://googleapis.com/drive/v3/files/xyz789'
        ]
        
        formats.forEach(url => {
            assert.equal(isGoogleDriveURL(url), true, `Should detect: ${url}`)
        })
    })

    test('isGoogleDriveURL does not false positive on similar URLs', function () {
        const nonGoogleDrive = [
            'https://google.com/search',
            'https://mydrive.example.com/file.bed',
            'https://example.googleapis.com/api/data',
            'https://example.com/drive/files/abc'
        ]
        
        nonGoogleDrive.forEach(url => {
            assert.equal(isGoogleDriveURL(url), false, `Should not detect: ${url}`)
        })
    })
})


function parseGeneList(data) {
    const lines = data.split('\n');
    const header = lines[0].split('\t');
    const records = [];

    // Skip empty lines and lines starting with #
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line === '' || line.startsWith('#')) {
            continue;
        }
        
        const fields = line.split('\t');
        if (fields.length !== header.length) {
            continue; // Skip malformed lines
        }

        const record = {};
        header.forEach((key, index) => {
            record[key] = fields[index];
        });
        records.push(record);
    }

    return records;
} 
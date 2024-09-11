import { fileURLToPath } from 'url';
import path from 'path';
import XLSX from 'xlsx';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const excelBufferToJson = (buffer) => {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet);
    return jsonData;
};

const ensureDirectoryExists = async (dirPath) => {
    await fs.promises.mkdir(dirPath, { recursive: true });
};

export const filterCreatedContact = async () => {
    try {
        const uploadFolderPath = path.join(__dirname, 'upload');
        const files = await fs.promises.readdir(uploadFolderPath);

        const outputFolderPath = path.join(__dirname, 'doneData');
        await ensureDirectoryExists(outputFolderPath);

        const failedDataFile = path.join(outputFolderPath, 'failedData.json');
        const successDataFile = path.join(outputFolderPath, 'successData.txt');
        const doubleDataFile = path.join(outputFolderPath, 'doubleData.txt');
        const logFile = path.join(outputFolderPath, 'processingLog.txt');

        for (let file of files) {
            const startTime = new Date().toISOString();
            console.log(`Processing file: ${file}`);

            // Write start time to log file
            await fs.promises.appendFile(logFile, `Processing started for file: ${file} at ${startTime}\n`);

            const fullFilePath = path.join(uploadFolderPath, file);
            const fileBuffer = await fs.promises.readFile(fullFilePath);
            const data = excelBufferToJson(fileBuffer);

            for (let element of data) {
                try {
                    const checkContact = await fetch(`https://spandanasphoorty.freshdesk.com/api/v2/search/contacts?query="customer_id:${element.CustomerId}"`, {
                        method: 'GET',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': 'Basic ' + Buffer.from('nmNdZMqExqsXEVzES:X').toString('base64') // Replace with your actual API key
                        }
                    });

                    const response = await checkContact.json();

                    if (Object.keys(response.results).length === 0) {
                        await fs.promises.appendFile(failedDataFile, JSON.stringify({ CustomerId: element.CustomerId }) + '\n');
                    } else if (Object.keys(response.results).length === 2) {
                        await fs.promises.appendFile(doubleDataFile, JSON.stringify({ CustomerId: element.CustomerId }) + '\n');
                    } else {
                        await fs.promises.appendFile(successDataFile, `CustomerId: ${element.CustomerId} - Success\n`);
                    }
                } catch (error) {
                    await fs.promises.appendFile(failedDataFile, JSON.stringify({ CustomerId: element.CustomerId, error: error.message }) + '\n');
                }
            }

            const endTime = new Date().toISOString();
            // Write end time to log file
            await fs.promises.appendFile(logFile, `Processing completed for file: ${file} at ${endTime}\n\n`);
        }
    } catch (error) {
        console.error('Error during file processing:', error);
    }
};

const { BlobServiceClient } = require('@azure/storage-blob');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs').promises;
const path = require('path');

module.exports = async function (context, req) {
    try {
        // Get the base64 string from the POST request body
        const base64Data = req.body.base64;

        if (!base64Data) {
            context.res = {
                status: 400,
                body: "Please pass a base64 string in the request body"
            };
            return;
        }

        // Convert base64 to binary data (Buffer)
        const buffer = Buffer.from(base64Data, 'base64');

        // Generate a unique filename
        const fileName = `${uuidv4()}.jpeg`;

        // Save the buffer as a JPEG file locally
        const tempFilePath = path.join(context.executionContext.functionDirectory, fileName);
        await fs.writeFile(tempFilePath, buffer);

        // Upload the file to Azure Blob Storage
        const AZURE_STORAGE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING;
        const containerName = process.env.CONTAINER_NAME || 'images';

        const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);
        const containerClient = blobServiceClient.getContainerClient(containerName);

        // Ensure the container exists
        await containerClient.createIfNotExists();

        const blockBlobClient = containerClient.getBlockBlobClient(fileName);
        await blockBlobClient.uploadFile(tempFilePath);

        // Delete the temporary file
        await fs.unlink(tempFilePath);

        context.res = {
            status: 200,
            body: `File uploaded to blob storage with name: ${fileName}`
        };
    } catch (err) {
        context.log.error('Error:', err);
        context.res = {
            status: 500,
            body: "An error occurred while processing the request"
        };
    }
};

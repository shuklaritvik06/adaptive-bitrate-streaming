import {S3Client} from "@aws-sdk/client-s3";

export const s3 = new S3Client({
    region: process.env.APP_AWS_REGION,
    credentials: {
        accessKeyId: process.env.APP_AWS_ACCESS_KEY_ID as string,
        secretAccessKey: process.env.APP_AWS_SECRET_ACCESS_KEY as string,
    },
});

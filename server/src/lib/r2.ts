import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { r2Config } from "../config/env.js";

export const r2Client = new S3Client({
  region: "auto",
  endpoint: r2Config.endpoint,
  credentials: {
    accessKeyId: r2Config.accessKeyId,
    secretAccessKey: r2Config.secretAccessKey
  }
});

export const uploadBufferToR2 = async (key: string, body: Buffer, contentType: string) => {
  await r2Client.send(
    new PutObjectCommand({
      Bucket: r2Config.bucket,
      Key: key,
      Body: body,
      ContentType: contentType
    })
  );
  return `${r2Config.publicUrl}/${key}`;
};

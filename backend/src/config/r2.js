import "dotenv/config";

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  CopyObjectCommand,
} from "@aws-sdk/client-s3";

const {
  CLOUDFLARE_R2_ENDPOINT,
  CLOUDFLARE_ACCESS_KEY_ID,
  CLOUDFLARE_SECRET_ACCESS_KEY,
  CLOUDFLARE_BUCKET_NAME,
} = process.env;

if (
  !CLOUDFLARE_R2_ENDPOINT ||
  !CLOUDFLARE_ACCESS_KEY_ID ||
  !CLOUDFLARE_SECRET_ACCESS_KEY ||
  !CLOUDFLARE_BUCKET_NAME
) {
  throw new Error("Variáveis de ambiente do Cloudflare R2 não configuradas.");
}


console.log("R2 CONFIG", {
  endpoint: process.env.CLOUDFLARE_R2_ENDPOINT,
  bucket: process.env.CLOUDFLARE_BUCKET_NAME,
  accessKey: process.env.CLOUDFLARE_ACCESS_KEY_ID?.slice(0, 8),
  hasSecret: !!process.env.CLOUDFLARE_SECRET_ACCESS_KEY,
});


const s3 = new S3Client({
  region: "auto",
  endpoint: process.env.CLOUDFLARE_R2_ENDPOINT.trim(),
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_ACCESS_KEY_ID.trim(),
    secretAccessKey: process.env.CLOUDFLARE_SECRET_ACCESS_KEY.trim(),
  },
  forcePathStyle: true, // Importante para compatibilidade S3 API no R2
});

export const uploadFile = async ({
  fileBuffer,
  key,
  contentType,
}) => {
  await s3.send(
    new PutObjectCommand({
      Bucket: process.env.CLOUDFLARE_BUCKET_NAME,
      Key: key,
      Body: fileBuffer,
      ContentType: contentType,
    }),
  );

  return key;
};

export const getFile = async (key) => {
  return s3.send(
    new GetObjectCommand({
      Bucket: process.env.CLOUDFLARE_BUCKET_NAME,
      Key: key,
    }),
  );
};

export const deleteFile = async (key) => {
  await s3.send(
    new DeleteObjectCommand({
      Bucket: process.env.CLOUDFLARE_BUCKET_NAME,
      Key: key,
    }),
  );
};

export const moveFile = async ({
  sourceKey,
  destinationKey,
}) => {
  await s3.send(
    new CopyObjectCommand({
      Bucket: process.env.CLOUDFLARE_BUCKET_NAME,
      CopySource: `${process.env.CLOUDFLARE_BUCKET_NAME}/${sourceKey}`,
      Key: destinationKey,
    }),
  );

  await s3.send(
    new DeleteObjectCommand({
      Bucket: process.env.CLOUDFLARE_BUCKET_NAME,
      Key: sourceKey,
    }),
  );

  return destinationKey;
};
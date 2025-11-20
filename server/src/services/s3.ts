import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3"

const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "eu-central-1"
const bucket = process.env.S3_BUCKET_NAME

// Use custom env var names to avoid Railway build-time "secret" handling
const accessKeyId = process.env.S3_ACCESS_KEY_ID
const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY

if (!bucket) {
  console.warn("[s3] S3_BUCKET_NAME is not set. File upload/download will fail until it is configured.")
}

if (!accessKeyId || !secretAccessKey) {
  console.warn("[s3] S3_ACCESS_KEY_ID or S3_SECRET_ACCESS_KEY is not set. S3 operations will fail until configured.")
}

export const s3 = new S3Client({
  region,
  credentials: accessKeyId && secretAccessKey
    ? { accessKeyId, secretAccessKey }
    : undefined,
})

export async function uploadToS3(key: string, body: Buffer | Uint8Array | string, contentType?: string) {
  if (!bucket) throw new Error("S3_BUCKET_NAME is not configured")

  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  )
}

export async function getFromS3(key: string) {
  if (!bucket) throw new Error("S3_BUCKET_NAME is not configured")

  return s3.send(
    new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    })
  )
}

export async function deleteFromS3(key: string) {
  if (!bucket) throw new Error("S3_BUCKET_NAME is not configured")

  await s3.send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    })
  )
}



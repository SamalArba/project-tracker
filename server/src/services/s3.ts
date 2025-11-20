import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3"

const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "eu-central-1"
const bucket = process.env.S3_BUCKET_NAME

if (!bucket) {
  console.warn("[s3] S3_BUCKET_NAME is not set. File upload/download will fail until it is configured.")
}

export const s3 = new S3Client({ region })

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



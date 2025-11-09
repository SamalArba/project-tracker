/**
 * ================================================================
 * middleware/upload.ts - File Upload Middleware
 * ================================================================
 * 
 * Configures Multer middleware for handling file uploads.
 * 
 * Features:
 * - Disk storage in uploads/ directory
 * - Random filename generation for security
 * - File size limit (10 MB per file)
 * - Preserves original file extension
 * 
 * Used by file upload routes to handle multipart/form-data.
 */

// ================================================================
// IMPORTS
// ================================================================
import multer from 'multer'
import path from 'path'
import { randomBytes } from 'crypto'

// ================================================================
// STORAGE CONFIGURATION
// ================================================================
/**
 * Multer disk storage configuration
 * 
 * Files are stored in: server/uploads/
 * Filename format: {timestamp}-{random32chars}{extension}
 * 
 * Example: 1762196665972-729111a521b4a8d8880daf413e7fc663.docx
 */
const storage = multer.diskStorage({
  /**
   * Set destination directory for uploaded files
   */
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads'))
  },
  
  /**
   * Generate unique filename
   * 
   * Format: {timestamp}-{random-hex}{original-extension}
   * This prevents:
   * - Filename collisions
   * - Directory traversal attacks
   * - Exposing original filenames in URLs
   */
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname)
    const randomName = randomBytes(16).toString('hex')
    cb(null, `${Date.now()}-${randomName}${ext}`)
  }
})

// ================================================================
// MULTER INSTANCE
// ================================================================
/**
 * Configured Multer middleware
 * 
 * Limits:
 * - File size: 10 MB (10 * 1024 * 1024 bytes)
 * 
 * Usage in routes:
 *   router.post('/upload', upload.single('file'), handler)
 */
const upload = multer({
  storage,
  limits: { 
    fileSize: 10 * 1024 * 1024  // 10 MB limit per file
  }
})

export default upload

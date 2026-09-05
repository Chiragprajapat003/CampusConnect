const multer = require("multer");
const path = require("path");
const fs = require("fs");

/**
 * Upload Middleware (Multer)
 * 
 * WHAT IT DOES:
 * Handles incoming `multipart/form-data` HTTP requests containing images (from camera or gallery).
 * It validates that the file is an image, gives it a unique collision-free filename,
 * and saves it into the local `uploads/` folder.
 * 
 * WHY IT'S STRUCTURED THIS WAY:
 * Standard Express `express.json()` cannot process binary file streams.
 * Multer separates the binary file stream from text fields:
 * - Binary file metadata is attached to `req.file`
 * - Text fields (title, description, location) are attached to `req.body`
 */

// Ensure the 'uploads' directory exists before saving files
const uploadDir = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 1. Storage Configuration: Define where and how files are saved on disk
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // cb(error, destinationFolder)
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate a unique filename using timestamp + random integer to prevent file overwrites
    // Example: item-1725254928123-894729104.jpg
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const fileExtension = path.extname(file.originalname).toLowerCase();
    cb(null, `item-${uniqueSuffix}${fileExtension}`);
  },
});

// 2. File Filter: Security check to only permit image MIME types
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
  
  if (allowedMimeTypes.includes(file.mimetype.toLowerCase())) {
    cb(null, true); // Accept file
  } else {
    cb(
      new Error("Invalid file type. Only JPEG, PNG, and WEBP image formats are allowed."),
      false // Reject file
    );
  }
};

// 3. Multer Instance with file size limit (5 MB max per image)
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 Megabytes in bytes
  },
});

module.exports = upload;

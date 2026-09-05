const express = require("express");
const {
  createItem,
  getItems,
  getItemById,
  getSmartMatches,
  updateItem,
  toggleResolveItem,
  deleteItem,
} = require("../controllers/item.controller");
const { protect } = require("../middleware/auth.middleware");
const upload = require("../middleware/upload.middleware");

const router = express.Router();

/**
 * Item Routes (/api/items)
 * 
 * WHAT IT DOES:
 * Connects URL endpoints to controller methods and applies the necessary middleware chain.
 * 
 * MIDDLEWARE CHAINS EXPLAINED:
 * - router.post("/", protect, upload.single("image"), createItem):
 *   1st: `protect` verifies the JWT token and attaches `req.user`.
 *   2nd: `upload.single("image")` parses multipart form data, handles the file upload, and attaches `req.file`.
 *   3rd: `createItem` executes the database write.
 */

// Feed route: get all items (with filters/search) OR create a new item
router
  .route("/")
  .get(getItems)
  .post(protect, upload.single("image"), createItem);

// Smart matches endpoint (compares lost vs found items)
router.get("/:id/matches", getSmartMatches);

// Single item routes: get item detail, update item, delete item
router
  .route("/:id")
  .get(getItemById)
  .put(protect, upload.single("image"), updateItem)
  .delete(protect, deleteItem);

// Mark item as resolved / active toggle
router.patch("/:id/resolve", protect, toggleResolveItem);

module.exports = router;

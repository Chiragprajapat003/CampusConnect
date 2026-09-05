const Item = require("../models/Item");
const fs = require("fs");
const path = require("path");
const { triggerNotification } = require("./notification.controller");

/**
 * Item Controller
 * 
 * WHAT IT DOES:
 * Handles CRUD operations (Create, Read, Update, Delete) and search/filtering for Lost & Found items.
 * 
 * WHY IT'S STRUCTURED THIS WAY:
 * Separating route handlers into controller functions ensures single-responsibility.
 * Each function handles parameter validation, authorization checks (verifying the user owns
 * the item before updating/deleting), and database queries with Mongoose `.populate()`.
 */

/**
 * @desc    Create a new Lost or Found report
 * @route   POST /api/items
 * @access  Private (Protected by `protect` middleware)
 */
const createItem = async (req, res) => {
  try {
    // 1. Support flexible field names (e.g. description or discription typo)
    const rawDescription = req.body.description || req.body.discription;
    const { title, type, category, locationName, latitude, longitude, date } = req.body;

    if (!title || !rawDescription || !type || !locationName) {
      return res.status(400).json({
        message: "Please provide all required fields: title, description, type (lost/found), and locationName.",
      });
    }

    // 2. Normalize category (e.g. "Bottle" -> "Bottles & Containers")
    const categoryMap = {
      electronics: "Electronics",
      "cards & wallets": "Cards & Wallets",
      wallet: "Cards & Wallets",
      wallets: "Cards & Wallets",
      keys: "Keys",
      clothing: "Clothing",
      clothes: "Clothing",
      "books & notes": "Books & Notes",
      books: "Books & Notes",
      bottle: "Bottles & Containers",
      bottles: "Bottles & Containers",
      "bottles & containers": "Bottles & Containers",
      accessories: "Accessories",
      other: "Other",
    };
    const normalizedCategory = category
      ? categoryMap[category.toLowerCase().trim()] || "Other"
      : "Other";

    // 3. Handle image URL if an image was uploaded via Multer
    let imageUrl = "";
    if (req.file) {
      imageUrl = `/uploads/${req.file.filename}`;
    }

    // 4. Format location object
    const parsedLat = latitude ? parseFloat(latitude) : null;
    const parsedLng = longitude ? parseFloat(longitude) : null;

    const location = {
      name: locationName.trim(),
      latitude: !isNaN(parsedLat) ? parsedLat : null,
      longitude: !isNaN(parsedLng) ? parsedLng : null,
    };

    // 5. Create new item document linked to authenticated user
    const newItem = await Item.create({
      title: title.trim(),
      description: rawDescription.trim(),
      type: type.toLowerCase().trim(),
      category: normalizedCategory,
      status: "active",
      imageUrl,
      location,
      date: date ? new Date(date) : new Date(),
      createdBy: req.user._id, // Attached by `protect` middleware
    });

    // 5. Populate creator details for immediate UI display
    const populatedItem = await newItem.populate("createdBy", "name email phone");

    // 6. Broadcast campus notification
    const isLost = newItem.type === "lost";
    await triggerNotification({
      type: isLost ? "lost_item" : "found_item",
      title: isLost ? `🔴 Lost: ${newItem.title}` : `🟢 Found: ${newItem.title}`,
      message: `${req.user.name || "A student"} reported a ${newItem.type} item near ${newItem.location.name || "campus"}.`,
      relatedId: newItem._id,
      createdBy: req.user._id,
    });

    res.status(201).json({
      message: "Item reported successfully",
      item: populatedItem,
    });
  } catch (error) {
    console.error("Create Item Error:", error.message);
    res.status(500).json({
      message: "Server error while creating item report",
      error: error.message,
    });
  }
};

/**
 * @desc    Get all items with optional filters, search, and sorting
 * @route   GET /api/items
 * @access  Public
 */
const getItems = async (req, res) => {
  try {
    const { type, category, status, search, sort } = req.query;

    // Build dynamic query filter object
    const filter = {};

    // Filter by type: 'lost' or 'found'
    if (type && ["lost", "found"].includes(type.toLowerCase())) {
      filter.type = type.toLowerCase();
    }

    // Filter by category: e.g. 'Electronics', 'Keys', 'Cards & Wallets'
    if (category && category !== "All") {
      filter.category = category;
    }

    // Filter by status: 'active' or 'resolved'
    if (status) {
      filter.status = status;
    }

    // Search query across title, description, or location name (case-insensitive regex)
    if (search && search.trim() !== "") {
      const searchRegex = new RegExp(search.trim(), "i");
      filter.$or = [
        { title: searchRegex },
        { description: searchRegex },
        { "location.name": searchRegex },
      ];
    }

    // Sorting: default is newest first
    let sortBy = { createdAt: -1 };
    if (sort === "oldest") {
      sortBy = { createdAt: 1 };
    }

    const items = await Item.find(filter)
      .populate("createdBy", "name email phone")
      .sort(sortBy);

    res.status(200).json({
      count: items.length,
      items,
    });
  } catch (error) {
    console.error("Get Items Error:", error.message);
    res.status(500).json({
      message: "Server error while fetching items",
      error: error.message,
    });
  }
};

/**
 * @desc    Get a single item by ID with reporter contact details
 * @route   GET /api/items/:id
 * @access  Public
 */
const getItemById = async (req, res) => {
  try {
    const item = await Item.findById(req.params.id).populate(
      "createdBy",
      "name email phone createdAt"
    );

    if (!item) {
      return res.status(404).json({
        message: "Item not found with this ID",
      });
    }

    res.status(200).json({
      item,
    });
  } catch (error) {
    console.error("Get Item By ID Error:", error.message);
    // If the ID format is invalid in MongoDB (CastError), return 400
    if (error.name === "CastError") {
      return res.status(400).json({ message: "Invalid item ID format" });
    }
    res.status(500).json({
      message: "Server error while fetching item details",
      error: error.message,
    });
  }
};

/**
 * @desc    Update item details or replace image (Owner only)
 * @route   PUT /api/items/:id
 * @access  Private (Owner only)
 */
const updateItem = async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);

    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }

    // Check authorization: ensure the user making the request is the one who created it
    if (item.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: "Forbidden: You are not authorized to update this item.",
      });
    }

    const rawDescription = req.body.description || req.body.discription;
    const { title, category, type, status, locationName, latitude, longitude } = req.body;

    // Update text fields if provided
    if (title) item.title = title.trim();
    if (rawDescription) item.description = rawDescription.trim();
    if (category) {
      const categoryMap = {
        electronics: "Electronics",
        "cards & wallets": "Cards & Wallets",
        wallet: "Cards & Wallets",
        wallets: "Cards & Wallets",
        keys: "Keys",
        clothing: "Clothing",
        clothes: "Clothing",
        "books & notes": "Books & Notes",
        books: "Books & Notes",
        bottle: "Bottles & Containers",
        bottles: "Bottles & Containers",
        "bottles & containers": "Bottles & Containers",
        accessories: "Accessories",
        other: "Other",
      };
      item.category = categoryMap[category.toLowerCase().trim()] || category;
    }
    if (type) item.type = type.toLowerCase().trim();
    if (status) item.status = status;

    // Update location if provided
    if (locationName) {
      item.location.name = locationName.trim();
    }
    if (latitude !== undefined) {
      const parsedLat = parseFloat(latitude);
      item.location.latitude = !isNaN(parsedLat) ? parsedLat : item.location.latitude;
    }
    if (longitude !== undefined) {
      const parsedLng = parseFloat(longitude);
      item.location.longitude = !isNaN(parsedLng) ? parsedLng : item.location.longitude;
    }

    // If a new image was uploaded, update imageUrl
    if (req.file) {
      item.imageUrl = `/uploads/${req.file.filename}`;
    }

    const updatedItem = await item.save();
    const populated = await updatedItem.populate("createdBy", "name email phone");

    res.status(200).json({
      message: "Item updated successfully",
      item: populated,
    });
  } catch (error) {
    console.error("Update Item Error:", error.message);
    res.status(500).json({
      message: "Server error while updating item",
      error: error.message,
    });
  }
};

/**
 * @desc    Toggle item status between active and resolved (Owner only)
 * @route   PATCH /api/items/:id/resolve
 * @access  Private (Owner only)
 */
const toggleResolveItem = async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);

    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }

    // Check authorization
    if (item.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: "Forbidden: You can only resolve your own items.",
      });
    }

    // Toggle status: if active -> resolved, if resolved -> active
    item.status = item.status === "active" ? "resolved" : "active";
    await item.save();

    res.status(200).json({
      message: `Item status changed to ${item.status}`,
      status: item.status,
      item,
    });
  } catch (error) {
    console.error("Toggle Resolve Error:", error.message);
    res.status(500).json({
      message: "Server error toggling resolve status",
      error: error.message,
    });
  }
};

/**
 * @desc    Delete an item and its associated image file (Owner only)
 * @route   DELETE /api/items/:id
 * @access  Private (Owner only)
 */
const deleteItem = async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);

    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }

    // Check authorization
    if (item.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: "Forbidden: You can only delete your own items.",
      });
    }

    // Optionally delete uploaded image file from disk to save storage
    if (item.imageUrl && item.imageUrl.startsWith("/uploads/")) {
      const filename = path.basename(item.imageUrl);
      const filePath = path.join(__dirname, "..", "uploads", filename);
      if (fs.existsSync(filePath)) {
        fs.unlink(filePath, (err) => {
          if (err) console.error("Error deleting image file:", err);
        });
      }
    }

    await item.deleteOne();

    res.status(200).json({
      message: "Item deleted successfully",
      id: req.params.id,
    });
  } catch (error) {
    console.error("Delete Item Error:", error.message);
    res.status(500).json({
      message: "Server error while deleting item",
      error: error.message,
    });
  }
};

/**
 * @desc    Find smart matches for an item (e.g. Find matching 'found' items for a 'lost' report)
 * @route   GET /api/items/:id/matches
 * @access  Public
 */
const getSmartMatches = async (req, res) => {
  try {
    const currentItem = await Item.findById(req.params.id);
    if (!currentItem) {
      return res.status(404).json({ message: "Item not found" });
    }

    // Determine target opposite type: if current is 'lost', search 'found', and vice-versa
    const targetType = currentItem.type === "lost" ? "found" : "lost";

    // 1. Extract significant keywords from title and description (ignoring common stop words)
    const stopWords = new Set(["the", "a", "an", "in", "on", "at", "to", "for", "of", "and", "or", "is", "my", "with", "it", "this", "that"]);
    const rawWords = `${currentItem.title} ${currentItem.description}`
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !stopWords.has(w));

    const uniqueKeywords = [...new Set(rawWords)];

    // 2. Query opposite items in the same category or with keyword match
    const orClauses = [
      { category: currentItem.category },
      ...uniqueKeywords.map((word) => ({ title: new RegExp(word, "i") })),
      ...uniqueKeywords.map((word) => ({ description: new RegExp(word, "i") })),
    ];

    const candidateQuery = {
      _id: { $ne: currentItem._id },
      type: targetType,
      status: "active",
      $or: orClauses,
    };

    const candidates = await Item.find(candidateQuery)
      .populate("createdBy", "name email phone")
      .limit(10);

    // 3. Score candidates based on category match, keyword overlap, and location match
    const scoredMatches = candidates.map((item) => {
      let score = 0;
      let matchReasons = [];

      // Category match (+40 points)
      if (item.category === currentItem.category) {
        score += 40;
        matchReasons.push(`Category match (${item.category})`);
      }

      // Keyword overlap (+20 points per matching word)
      const candidateText = `${item.title} ${item.description}`.toLowerCase();
      const matchedWords = uniqueKeywords.filter((w) => candidateText.includes(w));
      if (matchedWords.length > 0) {
        score += Math.min(matchedWords.length * 20, 40);
        matchReasons.push(`Keywords: ${matchedWords.slice(0, 3).join(", ")}`);
      }

      // Location match (+20 points)
      if (
        currentItem.location?.name &&
        item.location?.name &&
        (item.location.name.toLowerCase().includes(currentItem.location.name.toLowerCase()) ||
          currentItem.location.name.toLowerCase().includes(item.location.name.toLowerCase()))
      ) {
        score += 20;
        matchReasons.push(`Location proximity (${item.location.name})`);
      }

      return {
        item,
        score,
        matchReasons,
      };
    });

    // 4. Sort by score descending and return top matches with score >= 30
    const topMatches = scoredMatches
      .filter((m) => m.score >= 30)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    res.status(200).json({
      count: topMatches.length,
      matches: topMatches,
    });
  } catch (error) {
    console.error("Smart Match Error:", error.message);
    res.status(500).json({
      message: "Server error calculating smart matches",
      error: error.message,
    });
  }
};

module.exports = {
  createItem,
  getItems,
  getItemById,
  getSmartMatches,
  updateItem,
  toggleResolveItem,
  deleteItem,
};

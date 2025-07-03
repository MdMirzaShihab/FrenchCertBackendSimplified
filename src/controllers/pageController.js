const Page = require("../models/Page");
const mongoose = require("mongoose");

// Helper functions
const validatePageData = (data) => {
  const requiredFields = ["title", "slug", "content"];
  return requiredFields.filter((field) => !data[field]);
};

const preparePageData = (body) => ({
  title: body.title?.trim(),
  slug: body.slug?.trim().toLowerCase(),
  content: body.content,
  metaTitle: body.metaTitle?.trim(),
  metaDescription: body.metaDescription?.trim(),
  isPublished: body.isPublished !== undefined ? body.isPublished : true,
  showInNavbar: body.showInNavbar !== undefined ? body.showInNavbar : true,
  navbarOrder: body.navbarOrder || 0
});

// Create new page
exports.createPage = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Validate required fields
    const missingFields = validatePageData(req.body);
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(", ")}`,
      });
    }

    const pageData = preparePageData(req.body);
    const page = await Page.create([pageData], { session });

    await session.commitTransaction();

    res.status(201).json({
      success: true,
      data: page[0],
    });
  } catch (error) {
    await session.abortTransaction();

    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((val) => val.message);
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: messages,
      });
    }

    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        success: false,
        message: `${field} must be unique`,
        error: "DUPLICATE_KEY",
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to create page",
      error: error.message,
    });
  } finally {
    session.endSession();
  }
};

// Get all pages (admin)
exports.getAllPages = async (req, res) => {
    try {
      const { search, page = 1, limit = 10 } = req.query;
      const query = {};
      const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        sort: { createdAt: -1 },
      };
  
      if (search) {
        query.$text = { $search: search };
      }
  
      const result = await Page.paginate(query, options);
      
      res.status(200).json({
        success: true,
        data: {
          docs: result.docs,  // Array of documents
          total: result.totalDocs,
          limit: result.limit,
          page: result.page,
          pages: result.totalPages,  // Total number of pages
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to fetch pages",
        error: error.message,
      });
    }
  };

// Get navbar pages (public)
exports.getNavbarPages = async (req, res) => {
  try {
    const pages = await Page.find({ 
      isPublished: true,
      showInNavbar: true 
    })
    .select('title slug navbarOrder')
    .sort({ navbarOrder: 1 })
    .lean();

    res.status(200).json({
      success: true,
      data: pages
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch navbar pages",
      error: error.message,
    });
  }
};

// Get single page by slug (public)
exports.getPageBySlug = async (req, res) => {
    try {
      const page = await Page.findOne({ 
        slug: req.params.slug,
        isPublished: true 
      });
  
      if (!page) {
        return res.status(404).json({
          success: false,
          message: "Page not found or not published",
        });
      }
  
      res.status(200).json({
        success: true,
        data: page
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to fetch page",
        error: error.message,
      });
    }
  };

// Get single page by ID (admin)
exports.getPageById = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid page ID format",
      });
    }

    const page = await Page.findById(req.params.id);

    if (!page) {
      return res.status(404).json({
        success: false,
        message: "Page not found",
      });
    }

    res.status(200).json({
      success: true,
      data: page
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch page",
      error: error.message,
    });
  }
};

// Update page
exports.updatePage = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid page ID format",
      });
    }

    const updateData = preparePageData(req.body);
    const page = await Page.findByIdAndUpdate(
      req.params.id,
      updateData,
      {
        new: true,
        runValidators: true,
        session,
      }
    );

    if (!page) {
      return res.status(404).json({
        success: false,
        message: "Page not found",
      });
    }

    await session.commitTransaction();

    res.status(200).json({
      success: true,
      data: page,
    });
  } catch (error) {
    await session.abortTransaction();

    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((val) => val.message);
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: messages,
      });
    }

    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        success: false,
        message: `${field} must be unique`,
        error: "DUPLICATE_KEY",
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to update page",
      error: error.message,
    });
  } finally {
    session.endSession();
  }
};

// Delete page
exports.deletePage = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid page ID format",
      });
    }

    const page = await Page.findByIdAndDelete(req.params.id).session(session);

    if (!page) {
      return res.status(404).json({
        success: false,
        message: "Page not found",
      });
    }

    await session.commitTransaction();

    res.status(200).json({
      success: true,
      message: "Page deleted successfully",
    });
  } catch (error) {
    await session.abortTransaction();
    res.status(500).json({
      success: false,
      message: "Failed to delete page",
      error: error.message,
    });
  } finally {
    session.endSession();
  }
};
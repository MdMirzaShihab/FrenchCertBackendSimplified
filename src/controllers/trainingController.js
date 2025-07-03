const Training = require("../models/Training");
const CompanyTraining = require("../models/CompanyTraining");
const mongoose = require("mongoose");

// Helper functions
const buildSearchQuery = (searchTerm) => ({
  $or: [
    { name: { $regex: searchTerm, $options: "i" } },
    { trainingType: { $regex: searchTerm, $options: "i" } },
    { description: { $regex: searchTerm, $options: "i" } },
  ],
});

const validateTrainingData = (data) => {
  const requiredFields = [
    "name",
    "shortDescription",
    "description",
    "trainingType",
    "callToAction",
    "trainingMethod",
    "fields",
    "durationInHours",
  ];
  return requiredFields.filter((field) => !data[field]);
};

const prepareTrainingData = (body) => ({
  name: body.name?.trim(),
  shortDescription: body.shortDescription?.trim(),
  description: body.description, // Already sanitized by schema
  trainingType: body.trainingType?.trim(),
  callToAction: body.callToAction?.trim(),
  trainingMethod: body.trainingMethod,
  fields: body.fields,
  durationInHours: body.durationInHours,
});

// Get all trainings with pagination and search
exports.getAllTrainings = async (req, res) => {
  try {
    const { search, type, method, field, page = 1, limit = 10 } = req.query;
    const query = {};
    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      populate: "fields",
      sort: { name: 1 },
    };

    // Text search (searches name, trainingType and description fields)
    if (search) {
      Object.assign(query, buildSearchQuery(search));
    }

    // Filter by trainingType - EXACT MATCH
    if (type) {
      query.trainingType = type;
    }

    // Filter by training method
    if (method) {
      query.trainingMethod = { $in: [method] };
    }

    // Field filter
    if (field) {
      if (!mongoose.Types.ObjectId.isValid(field)) {
        return res.status(400).json({
          success: false,
          message: "Invalid field ID format",
        });
      }
      query.fields = { $in: [new mongoose.Types.ObjectId(field)] };
    }

    const result = await Training.paginate(query, options);

    res.status(200).json({
      success: true,
      data: {
        trainings: result.docs,
        total: result.totalDocs,
        limit: result.limit,
        page: result.page,
        pages: result.totalPages,
      },
    });
  } catch (error) {
    console.error("Filter error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch trainings",
      error: error.message,
    });
  }
};

// Get single training
exports.getTraining = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid training ID format",
      });
    }

    const training = await Training.findById(req.params.id).populate("fields");

    if (!training) {
      return res.status(404).json({
        success: false,
        message: "Training not found",
      });
    }

    res.status(200).json({
      success: true,
      data: training,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch training",
      error: error.message,
    });
  }
};

// Get all trainings for dropdown
exports.getAllTrainingsForDropdown = async (req, res) => {
  try {
    const trainings = await Training.find({})
      .select('name') // Only select name field
      .sort({ name: 1 })
      .lean(); // Convert to plain JS object
    
    // Transform the data to ensure only _id and name are included
    const simplifiedTrainings = trainings.map(training => ({
      _id: training._id,
      name: training.name
    }));

    res.status(200).json({
      success: true,
      data: simplifiedTrainings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch trainings",
      error: error.message,
    });
  }
};

// Create new training
exports.createTraining = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Validate required fields
    const missingFields = validateTrainingData(req.body);
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(", ")}`,
      });
    }

    const trainingData = prepareTrainingData(req.body);
    const training = await Training.create([trainingData], { session });

    await session.commitTransaction();

    res.status(201).json({
      success: true,
      data: training[0],
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
      message: "Failed to create training",
      error: error.message,
    });
  } finally {
    session.endSession();
  }
};

// Update training
exports.updateTraining = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid training ID format",
      });
    }

    const updateData = prepareTrainingData(req.body);
    if (
      req.body.fields &&
      (!Array.isArray(req.body.fields) || req.body.fields.length === 0)
    ) {
      return res.status(400).json({
        success: false,
        message: "At least one field is required",
      });
    }

    if (
      req.body.trainingMethod &&
      (!Array.isArray(req.body.trainingMethod) || req.body.trainingMethod.length === 0)
    ) {
      return res.status(400).json({
        success: false,
        message: "At least one training method is required",
      });
    }

    const training = await Training.findByIdAndUpdate(
      req.params.id,
      updateData,
      {
        new: true,
        runValidators: true,
        session,
      }
    ).populate("fields");

    if (!training) {
      return res.status(404).json({
        success: false,
        message: "Training not found",
      });
    }

    await session.commitTransaction();

    res.status(200).json({
      success: true,
      data: training,
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
      message: "Failed to update training",
      error: error.message,
    });
  } finally {
    session.endSession();
  }
};

// Delete training
exports.deleteTraining = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid training ID format",
      });
    }

    // Check if training exists
    const training = await Training.findById(req.params.id).session(session);
    if (!training) {
      return res.status(404).json({
        success: false,
        message: "Training not found",
      });
    }

    // Check if any companies have this training
    const companyCount = await CompanyTraining.countDocuments({
      training: req.params.id,
    }).session(session);

    if (companyCount > 0) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete training as it is assigned to one or more companies",
        error: "REFERENCE_ERROR",
      });
    }

    await Training.findByIdAndDelete(req.params.id).session(session);
    await session.commitTransaction();

    res.status(200).json({
      success: true,
      message: "Training deleted successfully",
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("Delete training error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while deleting training",
      error: error.message,
    });
  } finally {
    session.endSession();
  }
};

// Get training types
exports.getTrainingTypes = async (req, res) => {
  try {
    const types = await Training.distinct("trainingType");
    res.status(200).json({
      success: true,
      count: types.length,
      data: types,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch training types",
      error: error.message,
    });
  }
};

// Get public trainings
exports.getPublicTrainings = async (req, res) => {
  try {
    const { search, type, method, page = 1, limit = 10, exclude } = req.query;
    const query = {};
    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      select: "name shortDescription trainingType trainingMethod durationInHours",
      sort: { name: 1 },
    };

    // Text search (searches name, trainingType and description fields)
    if (search) {
      Object.assign(query, buildSearchQuery(search));
    }

    // Filter by trainingType
    if (type) {
      query.trainingType = type;
    }

    // Filter by training method
    if (method) {
      query.trainingMethod = { $in: [method] };
    }

    // Exclude specific training(s)
    if (exclude) {
      const excludeIds = exclude.split(',').map(id => id.trim());
      // Validate each ID is a valid ObjectId
      if (excludeIds.some(id => !mongoose.Types.ObjectId.isValid(id))) {
        return res.status(400).json({
          success: false,
          message: "Invalid training ID(s) in exclude parameter"
        });
      }
      query._id = { $nin: excludeIds };
    }

    const result = await Training.paginate(query, options);

    res.status(200).json({
      success: true,
      data: {
        trainings: result.docs,
        total: result.totalDocs,
        limit: result.limit,
        page: result.page,
        pages: result.totalPages,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch public trainings",
      error: error.message,
    });
  }
};

// Get public training details
exports.getPublicTrainingDetails = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid training ID format",
      });
    }

    const training = await Training.findById(req.params.id).select(
      "name description trainingType callToAction trainingMethod durationInHours"
    );

    if (!training) {
      return res.status(404).json({
        success: false,
        message: "Training not found",
      });
    }

    res.status(200).json({
      success: true,
      data: training,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch training details",
      error: error.message,
    });
  }
};
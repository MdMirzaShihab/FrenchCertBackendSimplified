const mongoose = require("mongoose");
const sanitizeHtml = require('sanitize-html');
mongoose.plugin(require('mongoose-paginate-v2'));

const trainingSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Training name is required'],
      trim: true,
      unique: true,
      maxlength: [100, 'Training name cannot exceed 100 characters'],
      minlength: [3, 'Training name must be at least 3 characters long']
    },
    shortDescription: {
      type: String,
      required: [true, 'Short description is required'],
      trim: true,
      validate: {
        validator: function(v) {
          const wordCount = v.trim().split(/\s+/).filter(word => word.length > 0).length;
          return wordCount >= 10 && wordCount <= 35;
        },
        message: 'Short description must contain between 10 to 35 words',
      },
      maxlength: [300, 'Short description cannot exceed 300 characters']
    },
    description: {
      type: String,
      required: true,
      set: (value) => sanitizeHtml(value, {
        allowedTags: sanitizeHtml.defaults.allowedTags, 
        allowedAttributes: {
          ...sanitizeHtml.defaults.allowedAttributes,
          a: ['href', 'name', 'target', 'rel'] 
        },
        allowedSchemes: ['http', 'https'] 
      })
    },
    trainingType: {
      type: String,
      required: [true, 'Training type is required'],
      trim: true,
      unique: true
    },
    callToAction: {
      type: String,
      required: [true, 'Call to action text is required'],
      trim: true,
      maxlength: [150, 'Call to action cannot exceed 150 characters']
    },
    trainingMethod: {
      type: [String],
      required: [true, 'Training method is required'],
      enum: {
        values: ["online", "in-person", "hybrid"],
        message: 'Training method must be one of: online, in-person, hybrid'
      },
      validate: {
        validator: function(v) {
          return Array.isArray(v) && v.length > 0 && v.length <= 3;
        },
        message: 'At least one training method is required and maximum 3 methods allowed'
      }
    },
    fields: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Field",
          required: [true, 'Field reference is required'],
        },
      ],
      validate: {
        validator: function(value) {
          return Array.isArray(value) && value.length > 0 && value.length <= 5;
        },
        message: 'At least one field is required and maximum 5 fields allowed'
      },
      required: [true, "At least one field is required"]
    },
    durationInHours: {
      type: Number,
      min: [1, 'Duration must be at least 1 hour'],
      max: [999, 'Duration cannot exceed 999 hours'],
      required: [true, 'Duration is required'],
    },
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual for duration in days (rounded to 1 decimal)
trainingSchema.virtual('durationInDays').get(function() {
  return parseFloat((this.durationInHours / 8).toFixed(1)); // Assuming 8-hour work day
});

// Case-insensitive text index
trainingSchema.index({ 
  name: 'text', 
  trainingType: 'text',
  description: 'text'
}, {
  collation: { locale: 'en', strength: 2 } 
});

// Regular indexes
trainingSchema.index({ trainingType: 1 });
trainingSchema.index({ fields: 1 });
trainingSchema.index({ trainingMethod: 1 });

module.exports = mongoose.model("Training", trainingSchema);
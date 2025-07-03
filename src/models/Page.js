const mongoose = require("mongoose");
const sanitizeHtml = require('sanitize-html');

const pageSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Page title is required'],
      trim: true,
      unique: true,
      maxlength: [100, 'Title cannot exceed 100 characters'],
      minlength: [3, 'Title must be at least 3 characters long']
    },
    slug: {
      type: String,
      required: [true, 'Slug is required'],
      trim: true,
      unique: true,
      lowercase: true,
      match: [/^[a-z0-9-]+$/, 'Slug can only contain letters, numbers and hyphens']
    },
    content: {
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
    metaTitle: {
      type: String,
      trim: true,
      maxlength: [100, 'Meta title cannot exceed 100 characters']
    },
    metaDescription: {
      type: String,
      trim: true,
      maxlength: [160, 'Meta description cannot exceed 160 characters']
    },
    isPublished: {
      type: Boolean,
      default: true
    },
    showInNavbar: {
      type: Boolean,
      default: true
    },
    navbarOrder: {
      type: Number,
      default: 0,
      min: [0, 'Navbar order must be at least 0']
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  },
  { 
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes
pageSchema.index({ slug: 1 }, { unique: true });
pageSchema.index({ title: 'text', content: 'text' }, {
  collation: { locale: 'en', strength: 2 } 
});
pageSchema.index({ showInNavbar: 1, navbarOrder: 1 });

// Update the updatedAt field before saving
pageSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model("Page", pageSchema);
const express = require('express');
const router = express.Router();
const pageController = require('../controllers/pageController');

// Public routes
router.get('/navbar', pageController.getNavbarPages);
router.get('/:slug', pageController.getPageBySlug);

// Admin routes
router.get('/', pageController.getAllPages);
router.get('/id/:id', pageController.getPageById);
router.post('/', pageController.createPage);
router.put('/:id', pageController.updatePage);
router.delete('/:id', pageController.deletePage);

module.exports = router;
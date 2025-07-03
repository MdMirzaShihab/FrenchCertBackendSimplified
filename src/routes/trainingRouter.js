const express = require('express');
const router = express.Router();
const trainingController = require('../controllers/trainingController');

// Get all trainings for dropdown
router.get('/dropdown', trainingController.getAllTrainingsForDropdown);

// Get distinct training types
router.get('/types/list', trainingController.getTrainingTypes);

// Get all trainings for public
router.get('/public/list', trainingController.getPublicTrainings);

// Create a new training
router.post('/', trainingController.createTraining);

// Get all trainings (with optional filters)
router.get('/', trainingController.getAllTrainings);

// Get a single training
router.get('/:id', trainingController.getTraining);

// Update training
router.put('/:id', trainingController.updateTraining);

// Delete training
router.delete('/:id', trainingController.deleteTraining);

// Get public distinct training details
router.get('/public/:id', trainingController.getPublicTrainingDetails);

module.exports = router;
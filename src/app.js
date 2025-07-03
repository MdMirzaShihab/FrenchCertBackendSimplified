const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');

const fieldRouter = require('./routes/fieldRouter');
const certificationRouter = require('./routes/certificationRouter');
const trainingRouter = require('./routes/trainingRouter');
const companyRouter = require('./routes/companyRouter');
const companyCertificationRouter = require('./routes/companyCertificationRouter');
const companyTrainingRouter = require('./routes/companyTrainingRouter');
const dashboardRouter = require('./routes/dashboardRouter');
const authRouter = require('./routes/authRouter');
const pageRoutes = require('./routes/pageRoutes');

const app = express();

// Set security HTTP headers
app.use(helmet());

// Enable CORS
app.use(cors({
  origin: '*', 
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
}));

// Logging requests in development mode
app.use(morgan('dev'));

// Parse JSON and URL-encoded data
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Cookie parser
app.use(cookieParser());

// Rate limiter to prevent excessive requests
// const limiter = rateLimit({
//   // windowMs: 15 * 60 * 1000, // 15 minutes
//   // max: 100, // Limit each IP to 100 requests per window
//   message: { error: "Too many requests from this IP, please try again later" },
// });
// app.use('/api/', limiter);

//Rooutes
app.use('/api/fields', fieldRouter);  
app.use('/api/certifications', certificationRouter);
app.use('/api/trainings', trainingRouter);
app.use('/api/companies', companyRouter);
app.use('/api/company-certifications', companyCertificationRouter);
app.use('/api/company-trainings', companyTrainingRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/auth', authRouter);
app.use('/api/pages', pageRoutes);


// Default Route
app.get('/', (req, res) => {
  res.send('FrenchCert Backend Running');
});


module.exports = app;
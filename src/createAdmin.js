// Usage: npm run create-admin -- <email> <password>
// Creates the admin, or promotes an existing user and resets their password.
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

const [email, password] = process.argv.slice(2);
if (!email || !password || password.length < 8) {
  console.error('Usage: npm run create-admin -- <email> <password (min 8 chars)>');
  process.exit(1);
}

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const user = (await User.findOne({ email: email.toLowerCase() })) || new User({ email });
  Object.assign(user, { password, role: 'admin', isActive: true, failedLoginAttempts: 0, lockUntil: undefined });
  await user.save();
  console.log(`Admin ready: ${user.email}`);
  process.exit(0);
}).catch((err) => {
  console.error(err.message);
  process.exit(1);
});

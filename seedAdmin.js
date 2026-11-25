require('dotenv').config();
require('node:dns').setServers(['8.8.8.8', '1.1.1.1']);
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);

  const exists = await User.findOne({ email: 'admin@nexus.com' });
  if (exists) {
    console.log('Admin already exists');
  } else {
    const hashed = await bcrypt.hash('Admin1234', 10);
    await User.create({
      name: 'Evelyn Croft',
      email: 'admin@nexus.com',
      password: hashed,
      role: 'admin',
    });
    console.log('Admin created');
  }

  await mongoose.disconnect();
};

run();
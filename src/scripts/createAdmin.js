const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../../.env') });

const User = require('../models/User');

const createAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB connected');

    const adminEmail = 'laibakaimkhani2004@gmail.com';
    const adminPassword = 'Laiba15@';
    const adminName = 'Laiba Kaimkhani';

    // Check if admin exists
    const existing = await User.findOne({ email: adminEmail });
    if (existing) {
      console.log('⚠️  Admin already exists. Updating password...');
      const salt = await bcrypt.genSalt(10);
      existing.password = await bcrypt.hash(adminPassword, salt);
      existing.role = 'admin';
      existing.name = adminName;
      await existing.save();
      console.log('✅ Admin updated successfully');
    } else {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(adminPassword, salt);

      await User.create({
        name: adminName,
        email: adminEmail,
        password: hashedPassword,
        role: 'admin',
      });

      console.log('✅ Admin created successfully');
    }

    console.log(`📧 Email: ${adminEmail}`);
    console.log(`🔑 Password: ${adminPassword}`);

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

createAdmin();
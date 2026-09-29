import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from './prisma.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'bhumap_sih_2026_cadastral_jwt_secret_secure_key_token';

router.post('/signup', async (req, res) => {
  try {
    const { name, email, password, surveyorId, targetState, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });

    if (existingUser) {
      return res.status(400).json({ error: 'An account with this email already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        password: hashedPassword,
        surveyorId: surveyorId ? String(surveyorId).trim() : null,
        targetState: targetState ? String(targetState).trim() : null,
        role: role === 'ADMIN' ? 'ADMIN' : (role === 'USER' ? 'USER' : 'SURVEYOR')
      }
    });

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(201).json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        surveyorId: user.surveyorId,
        targetState: user.targetState
      }
    });
  } catch (error) {
    console.error('[Auth Signup Error]:', error);
    if (error.code === 'P1000' || error.code === 'P1001' || error.message?.includes('database server')) {
      return res.status(503).json({
        error: 'Database connection failed. Please ensure PostgreSQL is running at localhost:5432 and update DATABASE_URL in .env with your actual password.'
      });
    }
    return res.status(500).json({ error: 'Failed to create user account.' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        surveyorId: user.surveyorId,
        targetState: user.targetState
      }
    });
  } catch (error) {
    console.error('[Auth Login Error]:', error);
    if (error.code === 'P1000' || error.code === 'P1001' || error.message?.includes('database server')) {
      return res.status(503).json({
        error: 'Database connection failed. Please ensure PostgreSQL is running at localhost:5432 and update DATABASE_URL in .env with your actual password.'
      });
    }
    return res.status(500).json({ error: 'Failed to authenticate user.' });
  }
});

router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No authentication token provided.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        surveyorId: true,
        targetState: true,
        createdAt: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User account not found.' });
    }

    return res.json({ user });
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired authentication token.' });
  }
});

export default router;

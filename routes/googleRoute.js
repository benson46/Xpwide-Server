import express from 'express';
import { login } from '../controller/googleController.js';

const router = express.Router();

// ----------------------------------------------------

router.post('/login-google', login);

// ----------------------------------------------------

export default router;

/**
 * API Base URL helper
 *
 * - Local dev  → VITE_API_BASE_URL is empty  → proxy in vite.config.ts handles /api/*
 * - Production → VITE_API_BASE_URL = "https://humarapandit.onrender.com"
 *                so fetch calls become "https://humarapandit.onrender.com/api/..."
 */
export const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '';

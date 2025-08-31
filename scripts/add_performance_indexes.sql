-- Phase 5.1: Performance Optimization - Database Indexes
-- Date: August 30, 2025
-- Purpose: Add indexes to improve search and query performance

-- Index for trope name searches and ordering
CREATE INDEX IF NOT EXISTS idx_tropes_name ON tropes (name);

-- Index for case-insensitive trope name searches
CREATE INDEX IF NOT EXISTS idx_tropes_name_lower ON tropes (LOWER(name));

-- Index for category name searches and filtering  
CREATE INDEX IF NOT EXISTS idx_categories_name ON categories (name);

-- Index for trope_categories junction table foreign keys (individual indexes)
CREATE INDEX IF NOT EXISTS idx_trope_categories_trope_id ON trope_categories (trope_id);
CREATE INDEX IF NOT EXISTS idx_trope_categories_category_id ON trope_categories (category_id);

-- Analyze tables to update query planner statistics
ANALYZE;

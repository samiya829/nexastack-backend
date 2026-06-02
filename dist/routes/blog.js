"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const supabase_1 = require("../lib/supabase");
const auth_1 = require("../middleware/auth");
const utils_1 = require("../utils");
const router = (0, express_1.Router)();
const postValidation = [
    (0, express_validator_1.body)('title').trim().isLength({ min: 5, max: 200 }).withMessage('Title must be 5-200 characters'),
    (0, express_validator_1.body)('content').trim().isLength({ min: 100 }).withMessage('Content must be at least 100 characters'),
    (0, express_validator_1.body)('excerpt').trim().isLength({ min: 10, max: 500 }).withMessage('Excerpt must be 10-500 characters'),
    (0, express_validator_1.body)('tags').isArray({ max: 10 }).withMessage('Tags must be an array of up to 10 items'),
];
router.get('/', async (req, res) => {
    const { page = '1', tag, search } = req.query;
    const pageSize = 12;
    const offset = (Number(page) - 1) * pageSize;
    let query = supabase_1.supabase
        .from('posts')
        .select('id, title, slug, excerpt, tags, views, created_at, author:profiles(full_name)', { count: 'exact' })
        .eq('published', true)
        .order('created_at', { ascending: false })
        .range(offset, offset + pageSize - 1);
    if (tag) {
        query = query.contains('tags', [tag]);
    }
    if (search) {
        query = query.or(`title.ilike.%${search}%,excerpt.ilike.%${search}%`);
    }
    const { data, error, count } = await query;
    if (error) {
        return res.status(500).json({ error: 'Failed to fetch posts' });
    }
    res.json({ data, total: count, page: Number(page), pageSize });
});
router.get('/:slug', async (req, res) => {
    const { slug } = req.params;
    const { data: post, error } = await supabase_1.supabase
        .from('posts')
        .select('*, author:profiles(full_name, bio, avatar_url)')
        .eq('slug', slug)
        .eq('published', true)
        .single();
    if (error || !post) {
        return res.status(404).json({ error: 'Post not found' });
    }
    await supabase_1.supabase.from('posts').update({ views: (post.views || 0) + 1 }).eq('id', post.id);
    res.json({ data: { ...post, views: (post.views || 0) + 1 } });
});
router.post('/', auth_1.requireAuth, postValidation, async (req, res) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }
    const { title, content, excerpt, tags, published = false, cover_image } = req.body;
    const slug = (0, utils_1.slugify)(title);
    const { data: existing } = await supabase_1.supabase.from('posts').select('id').eq('slug', slug).single();
    const finalSlug = existing ? `${slug}-${Date.now()}` : slug;
    const { data, error } = await supabase_1.supabase
        .from('posts')
        .insert({
        title,
        slug: finalSlug,
        content,
        excerpt,
        tags,
        published,
        cover_image,
        author_id: req.user.id,
    })
        .select()
        .single();
    if (error) {
        return res.status(500).json({ error: 'Failed to create post' });
    }
    res.status(201).json({ data });
});
router.put('/:id', auth_1.requireAuth, async (req, res) => {
    const { id } = req.params;
    const { data: post } = await supabase_1.supabase
        .from('posts')
        .select('author_id')
        .eq('id', id)
        .single();
    if (!post)
        return res.status(404).json({ error: 'Post not found' });
    if (post.author_id !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Not authorized to edit this post' });
    }
    const { title, content, excerpt, tags, published, cover_image } = req.body;
    const updates = { updated_at: new Date().toISOString() };
    if (title) {
        updates.title = title;
        updates.slug = (0, utils_1.slugify)(title);
    }
    if (content)
        updates.content = content;
    if (excerpt)
        updates.excerpt = excerpt;
    if (tags)
        updates.tags = tags;
    if (published !== undefined)
        updates.published = published;
    if (cover_image !== undefined)
        updates.cover_image = cover_image;
    const { data, error } = await supabase_1.supabase
        .from('posts')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
    if (error)
        return res.status(500).json({ error: 'Failed to update post' });
    res.json({ data });
});
router.delete('/:id', auth_1.requireAuth, async (req, res) => {
    const { id } = req.params;
    const { data: post } = await supabase_1.supabase.from('posts').select('author_id').eq('id', id).single();
    if (!post)
        return res.status(404).json({ error: 'Post not found' });
    if (post.author_id !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Not authorized' });
    }
    const { error } = await supabase_1.supabase.from('posts').delete().eq('id', id);
    if (error)
        return res.status(500).json({ error: 'Failed to delete post' });
    res.json({ message: 'Post deleted successfully' });
});
exports.default = router;
//# sourceMappingURL=blog.js.map
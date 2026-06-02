"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = requireAuth;
exports.requireAdmin = requireAdmin;
const supabase_1 = require("../lib/supabase");
async function requireAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }
    const token = authHeader.slice(7);
    try {
        const { data: { user }, error } = await supabase_1.supabase.auth.getUser(token);
        if (error || !user) {
            return res.status(401).json({ error: 'Invalid or expired token' });
        }
        const { data: profile } = await supabase_1.supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();
        req.user = {
            id: user.id,
            email: user.email || '',
            role: profile?.role || 'user',
        };
        next();
    }
    catch {
        return res.status(401).json({ error: 'Authentication failed' });
    }
}
async function requireAdmin(req, res, next) {
    await requireAuth(req, res, () => {
        if (req.user?.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }
        next();
    });
}
//# sourceMappingURL=auth.js.map
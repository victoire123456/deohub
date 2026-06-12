import { Request, Response } from 'express';
import pool from '../db';
import { AuthRequest } from '../middleware/auth';

// Helper to seed dynamic default advertisements if database is empty
const ensureSeededAds = async () => {
  try {
    // Proactively clear existing default unsplash advertisement images from the DB if they exist
    await pool.query("UPDATE advertisements SET image_url = null WHERE image_url LIKE '%unsplash.com%'");

    const check = await pool.query('SELECT COUNT(*) FROM advertisements');
    if (parseInt(check.rows[0].count) === 0) {
      let userId: number;
      const userRes = await pool.query('SELECT id FROM users LIMIT 1');
      if (userRes.rows.length > 0) {
        userId = userRes.rows[0].id;
      } else {
        const newUser = await pool.query(
          "INSERT INTO users (username, email, password, bio, avatar_url) VALUES ('adcenter', 'ads@deohub.com', 'hashedpwd', 'The official DeoHub Ads companion 📈🎛️', 'https://api.dicebear.com/7.x/avataaars/svg?seed=adcenter') RETURNING id"
        );
        userId = newUser.rows[0].id;
      }

      const sampleAds = [
        {
          title: 'Premium Cyberpunk Streetwear 🕶️🔥',
          image_url: null,
          link_url: 'https://deohub-cyberwear.io',
          budget: 250.00,
          clicks: 142,
          impressions: 4892,
          status: 'active'
        },
        {
          title: 'Upgrade to DeoHub Pro for Unlocked AI features 🤖💜',
          image_url: null,
          link_url: 'https://ai.studio/build',
          budget: 500.00,
          clicks: 395,
          impressions: 12053,
          status: 'active'
        },
        {
          title: 'No-Code Web App Builder by Google AI Studio 🚀💻',
          image_url: null,
          link_url: 'https://ai.studio/build',
          budget: 1500.00,
          clicks: 914,
          impressions: 34102,
          status: 'active'
        }
      ];

      for (const ad of sampleAds) {
        await pool.query(
          `INSERT INTO advertisements (user_id, title, image_url, link_url, budget, clicks, impressions, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [userId, ad.title, ad.image_url, ad.link_url, ad.budget, ad.clicks, ad.impressions, ad.status]
        );
      }
      console.log('Seeded initial advertisements into database without default photos');
    }
  } catch (err) {
    console.warn('Seeding advertisements failed or was skipped:', err);
  }
};

export const createAd = async (req: AuthRequest, res: Response) => {
  const { 
    title, 
    imageUrl, 
    videoUrl, 
    linkUrl, 
    budget,
    description,
    category,
    project_files_url,
    cv_url,
    portfolio_url,
    website_url,
    social_links,
    contact_info,
    cta_text,
    is_premium,
    payment_reference,
    payment_status,
    screenshots
  } = req.body;
  const userId = req.user?.id;

  if (!title) {
    return res.status(400).json({ error: 'Title is required' });
  }

  try {
    const doubleBudget = parseFloat(budget) || 0;
    const premiumBool = is_premium === true || is_premium === 'true';
    const socialLinksJson = social_links ? (typeof social_links === 'string' ? social_links : JSON.stringify(social_links)) : '{}';
    const screenShotsArray = Array.isArray(screenshots) ? screenshots : [];

    const result = await pool.query(
      `INSERT INTO advertisements (
        user_id, title, image_url, video_url, link_url, budget, status, clicks, impressions,
        description, category, project_files_url, cv_url, portfolio_url, website_url, 
        social_links, contact_info, cta_text, is_premium, payment_reference, payment_status, screenshots
      )
      VALUES ($1, $2, $3, $4, $5, $6, 'active', 0, 0, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19) RETURNING *`,
      [
        userId, 
        title, 
        imageUrl || null, 
        videoUrl || null, 
        linkUrl || null, 
        doubleBudget,
        description || null,
        category || 'Projects',
        project_files_url || null,
        cv_url || null,
        portfolio_url || null,
        website_url || null,
        socialLinksJson,
        contact_info || null,
        cta_text || 'Learn More',
        premiumBool,
        payment_reference || null,
        payment_status || 'unpaid',
        screenShotsArray
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create advertisement campaign' });
  }
};

export const getAds = async (req: AuthRequest, res: Response) => {
  try {
    await ensureSeededAds();
    const result = await pool.query('SELECT * FROM advertisements ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch advertisements' });
  }
};

export const registerInteraction = async (req: Request, res: Response) => {
  const { adId } = req.params;
  const { type } = req.body; // 'click' | 'impression'
  
  if (type !== 'click' && type !== 'impression') {
    return res.status(400).json({ error: 'Type must be click or impression' });
  }

  try {
    if (type === 'click') {
      await pool.query('UPDATE advertisements SET clicks = clicks + 1 WHERE id = $1', [adId]);
    } else {
      await pool.query('UPDATE advertisements SET impressions = impressions + 1 WHERE id = $1', [adId]);
    }
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to record ad analytics interaction' });
  }
};

export const getPromotedPosts = async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT pp.*, p.content, p.image_url, u.username
       FROM promoted_posts pp
       JOIN posts p ON pp.post_id = p.id
       JOIN users u ON pp.user_id = u.id
       ORDER BY pp.created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch promoted posts' });
  }
};

export const promotePost = async (req: AuthRequest, res: Response) => {
  const { postId, budget } = req.body;
  const userId = req.user?.id;

  if (!postId || !budget) {
    return res.status(400).json({ error: 'Post ID and budget are required' });
  }

  try {
    // Check if post exists
    const postCheck = await pool.query('SELECT id FROM posts WHERE id = $1', [postId]);
    if (postCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const doubleBudget = parseFloat(budget) || 0.00;
    const result = await pool.query(
      `INSERT INTO promoted_posts (post_id, user_id, budget, status, clicks, impressions)
       VALUES ($1, $2, $3, 'active', 0, 0) RETURNING *`,
      [postId, userId, doubleBudget]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to promote the selected post' });
  }
};

export const updateAdStatus = async (req: AuthRequest, res: Response) => {
  const { adId } = req.params;
  const { status } = req.body; // 'active' | 'paused'
  const userId = req.user?.id;

  try {
    // admins can change any status, normal users can only change their own
    const userRoleCheck = await pool.query('SELECT role FROM users WHERE id = $1', [userId]);
    const isAdmin = userRoleCheck.rows[0]?.role === 'admin';

    let query = 'UPDATE advertisements SET status = $1 WHERE id = $2';
    let params: any[] = [status, adId];

    if (!isAdmin) {
      query += ' AND user_id = $3';
      params.push(userId);
    }

    const result = await pool.query(query + ' RETURNING *', params);
    if (result.rows.length === 0) {
      return res.status(403).json({ error: 'You do not have permission to manage this advertisement' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update advertisement status' });
  }
};

export const deleteAd = async (req: AuthRequest, res: Response) => {
  const { adId } = req.params;
  const userId = req.user?.id;

  try {
    const userRoleCheck = await pool.query('SELECT role FROM users WHERE id = $1', [userId]);
    const isAdmin = userRoleCheck.rows[0]?.role === 'admin';

    let query = 'DELETE FROM advertisements WHERE id = $1';
    let params: any[] = [adId];

    if (!isAdmin) {
      query += ' AND user_id = $2';
      params.push(userId);
    }

    const result = await pool.query(query + ' RETURNING *', params);
    if (result.rows.length === 0) {
      return res.status(403).json({ error: 'You do not have permission to delete this advertisement' });
    }
    res.json({ success: true, message: 'Advertisement deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete advertisement' });
  }
};

export const updateAd = async (req: AuthRequest, res: Response) => {
  const { adId } = req.params;
  const { title, linkUrl, cta_text, description, category, budget } = req.body;
  const userId = req.user?.id;

  try {
    const userRoleCheck = await pool.query('SELECT role FROM users WHERE id = $1', [userId]);
    const isAdmin = userRoleCheck.rows[0]?.role === 'admin';

    let query = `
      UPDATE advertisements 
      SET title = $1, link_url = $2, cta_text = $3, description = $4, category = $5, budget = $6 
      WHERE id = $7
    `;
    let params: any[] = [title, linkUrl, cta_text, description, category, parseFloat(budget) || 0, adId];

    if (!isAdmin) {
      query += ' AND user_id = $8';
      params.push(userId);
    }

    const result = await pool.query(query + ' RETURNING *', params);
    if (result.rows.length === 0) {
      return res.status(403).json({ error: 'You do not have permission to update this advertisement' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update advertisement' });
  }
};

export const adminModerateAd = async (req: AuthRequest, res: Response) => {
  const { adId } = req.params;
  const { status, remarks } = req.body; // 'active' | 'rejected' | 'pending'
  const userId = req.user?.id;

  try {
    const userRoleCheck = await pool.query('SELECT role FROM users WHERE id = $1', [userId]);
    const isAdmin = userRoleCheck.rows[0]?.role === 'admin';

    if (!isAdmin) {
      return res.status(403).json({ error: 'Only administrators can moderate advertisements manually' });
    }

    const result = await pool.query(
      "UPDATE advertisements SET status = $1, description = COALESCE($2, description) WHERE id = $3 RETURNING *",
      [status, remarks || null, adId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Advertisement not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to moderate advertisement' });
  }
};

import pool from './db';

export async function initDb() {
  try {
    console.log('Running database migrations and table initializations...');
    
    // 1. Create 'users' table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password TEXT NOT NULL,
        bio TEXT,
        avatar_url TEXT,
        is_verified BOOLEAN DEFAULT FALSE,
        role VARCHAR(20) DEFAULT 'user',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Create 'posts' table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS posts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        image_url TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 3. Create 'likes' table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS likes (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, post_id)
      );
    `);

    // 4. Create 'conversations' table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS conversations (
        id SERIAL PRIMARY KEY,
        user1_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        user2_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user1_id, user2_id)
      );
    `);

    // Create 'messages' table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        conversation_id INTEGER REFERENCES conversations(id) ON DELETE CASCADE,
        sender_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        receiver_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        message TEXT NOT NULL,
        type VARCHAR(20) DEFAULT 'text',
        attachment_url TEXT,
        reply_to_id INTEGER REFERENCES messages(id) ON DELETE SET NULL,
        is_edited BOOLEAN DEFAULT FALSE,
        is_deleted BOOLEAN DEFAULT FALSE,
        status VARCHAR(20) DEFAULT 'sent',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Alter 'messages' table compatibility helper in case it existed
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='messages' AND column_name='conversation_id') THEN
          ALTER TABLE messages ADD COLUMN conversation_id INTEGER REFERENCES conversations(id) ON DELETE CASCADE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='messages' AND column_name='type') THEN
          ALTER TABLE messages ADD COLUMN type VARCHAR(20) DEFAULT 'text';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='messages' AND column_name='attachment_url') THEN
          ALTER TABLE messages ADD COLUMN attachment_url TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='messages' AND column_name='reply_to_id') THEN
          ALTER TABLE messages ADD COLUMN reply_to_id INTEGER REFERENCES messages(id) ON DELETE SET NULL;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='messages' AND column_name='is_edited') THEN
          ALTER TABLE messages ADD COLUMN is_edited BOOLEAN DEFAULT FALSE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='messages' AND column_name='is_deleted') THEN
          ALTER TABLE messages ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='messages' AND column_name='status') THEN
          ALTER TABLE messages ADD COLUMN status VARCHAR(20) DEFAULT 'sent';
        END IF;
      END
      $$;
    `);

    // Create 'message_reactions' table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS message_reactions (
        id SERIAL PRIMARY KEY,
        message_id INTEGER REFERENCES messages(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        emoji VARCHAR(50) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(message_id, user_id, emoji)
      );
    `);

    // 5. Create 'follows' table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS follows (
        id SERIAL PRIMARY KEY,
        follower_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        following_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(follower_id, following_id)
      );
    `);

    // 6. Create 'comments' table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS comments (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Ensure 'comments' table has 'content' if it already exists from previous runs/schemas
    try {
      await pool.query(`ALTER TABLE comments ADD COLUMN IF NOT EXISTS content TEXT NOT NULL DEFAULT ''`);
      console.log('Verified column "content" exists on comments table.');
    } catch (err: any) {
      console.warn('Handled column adding for comments.content:', err.message);
    }

    // Drop the deprecated 'comment' column if it exists to avoid NOT NULL constraint violations
    try {
      await pool.query(`ALTER TABLE comments DROP COLUMN IF EXISTS comment`);
      console.log('Successfully dropped deprecated "comment" column from comments table.');
    } catch (err: any) {
      console.warn('Handled dropping deprecated "comment" column:', err.message);
    }

    // 7. Create 'notifications' table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        receiver_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        sender_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL, -- 'like', 'comment', 'follow', 'message', 'story_reaction', etc.
        post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
        message_id INTEGER DEFAULT NULL,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Ensure notifications table has message_id column and correct type length
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='message_id') THEN
          ALTER TABLE notifications ADD COLUMN message_id INTEGER DEFAULT NULL;
        END IF;
        -- Alter type length to 50 for more robust notification system
        ALTER TABLE notifications ALTER COLUMN type TYPE VARCHAR(50);
      END
      $$;
    `);

    // Create 'user_status' table if it doesn't exist to track presence
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_status (
        user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        is_online BOOLEAN DEFAULT FALSE,
        last_seen TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 8. Create 'reels' table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS reels (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        video_url TEXT NOT NULL,
        caption TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 9. Create 'reel_likes' table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS reel_likes (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        reel_id INTEGER REFERENCES reels(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, reel_id)
      );
    `);

    // 10. Create 'reel_comments' table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS reel_comments (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        reel_id INTEGER REFERENCES reels(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        like_count INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Ensure 'reel_comments' table has 'like_count' column if it already exists from previous runs/schemas
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='reel_comments' AND column_name='like_count') THEN
          ALTER TABLE reel_comments ADD COLUMN like_count INTEGER DEFAULT 0;
        END IF;
      END
      $$;
    `);

    // Create 'reel_comment_likes' table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS reel_comment_likes (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        comment_id INTEGER REFERENCES reel_comments(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, comment_id)
      );
    `);

    // 11. Create 'uploaded_videos' table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS uploaded_videos (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        video_url TEXT NOT NULL,
        title TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 12. Create 'advertisements' table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS advertisements (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        image_url TEXT,
        video_url TEXT,
        link_url TEXT,
        budget NUMERIC DEFAULT 0.0,
        status VARCHAR(50) DEFAULT 'active',
        clicks INTEGER DEFAULT 0,
        impressions INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Ensure advertisements table has all newer required columns
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='advertisements' AND column_name='video_url') THEN
          ALTER TABLE advertisements ADD COLUMN video_url TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='advertisements' AND column_name='link_url') THEN
          ALTER TABLE advertisements ADD COLUMN link_url TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='advertisements' AND column_name='clicks') THEN
          ALTER TABLE advertisements ADD COLUMN clicks INTEGER DEFAULT 0;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='advertisements' AND column_name='impressions') THEN
          ALTER TABLE advertisements ADD COLUMN impressions INTEGER DEFAULT 0;
        END IF;
      END
      $$;
    `);

    // Complete Corporate and Premium advertising requirements
    await pool.query(`
      ALTER TABLE advertisements 
      ADD COLUMN IF NOT EXISTS description TEXT,
      ADD COLUMN IF NOT EXISTS category VARCHAR(100),
      ADD COLUMN IF NOT EXISTS project_files_url TEXT,
      ADD COLUMN IF NOT EXISTS cv_url TEXT,
      ADD COLUMN IF NOT EXISTS portfolio_url TEXT,
      ADD COLUMN IF NOT EXISTS website_url TEXT,
      ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '{}',
      ADD COLUMN IF NOT EXISTS contact_info TEXT,
      ADD COLUMN IF NOT EXISTS cta_text VARCHAR(100) DEFAULT 'Learn More',
      ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS payment_reference VARCHAR(100),
      ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'unpaid',
      ADD COLUMN IF NOT EXISTS screenshots TEXT[] DEFAULT '{}',
      ADD COLUMN IF NOT EXISTS views INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS reach INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS engagement INTEGER DEFAULT 0;
    `);

    // 13. Create 'promoted_posts' table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS promoted_posts (
        id SERIAL PRIMARY KEY,
        post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        budget NUMERIC DEFAULT 0.0,
        status VARCHAR(50) DEFAULT 'active',
        clicks INTEGER DEFAULT 0,
        impressions INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Add bio to users if it doesn't exist
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='bio') THEN
          ALTER TABLE users ADD COLUMN bio TEXT;
        END IF;
      END
      $$;
    `);

    // Add password to users if it doesn't exist and copy from password_hash
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='password') THEN
          ALTER TABLE users ADD COLUMN password TEXT;
        END IF;
        
        -- Copy existing password_hash to password if password_hash exists
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='password_hash') THEN
          UPDATE users SET password = password_hash WHERE password IS NULL AND password_hash IS NOT NULL;
          -- Drop the NOT NULL constraint on the old password_hash column to prevent insertion errors
          ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;
        END IF;
      END
      $$;
    `);

    // Add avatar_url to users if it doesn't exist
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='avatar_url') THEN
          ALTER TABLE users ADD COLUMN avatar_url TEXT;
        END IF;
      END
      $$;
    `);

    // Add e2ee_public_key to users if it doesn't exist
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='e2ee_public_key') THEN
          ALTER TABLE users ADD COLUMN e2ee_public_key TEXT;
        END IF;
      END
      $$;
    `);

    // Add is_verified to users if it doesn't exist
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='is_verified') THEN
          ALTER TABLE users ADD COLUMN is_verified BOOLEAN DEFAULT FALSE;
        END IF;
      END
      $$;
    `);

    // Add verification_code to users if it doesn't exist
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='verification_code') THEN
          ALTER TABLE users ADD COLUMN verification_code VARCHAR(20) DEFAULT NULL;
        END IF;
      END
      $$;
    `);

    // Add verification_expires to users if it doesn't exist
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='verification_expires') THEN
          ALTER TABLE users ADD COLUMN verification_expires TIMESTAMP WITH TIME ZONE DEFAULT NULL;
        END IF;
      END
      $$;
    `);

    // Add role to users if it doesn't exist
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='role') THEN
          ALTER TABLE users ADD COLUMN role VARCHAR(20) DEFAULT 'user';
        END IF;
      END
      $$;
    `);

    // Ensure 'posts' table has 'content' if it already exists from previous runs/schemas
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='posts' AND column_name='content') THEN
          ALTER TABLE posts ADD COLUMN content TEXT DEFAULT '';
        END IF;
      END
      $$;
    `);

    // Ensure 'posts' table has 'image_url' if it already exists from previous runs/schemas
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='posts' AND column_name='image_url') THEN
          ALTER TABLE posts ADD COLUMN image_url TEXT;
        END IF;
      END
      $$;
    `);

    // Ensure 'notifications' table columns if it existed prior
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='receiver_id') THEN
          ALTER TABLE notifications ADD COLUMN receiver_id INTEGER REFERENCES users(id) ON DELETE CASCADE;
        END IF;
      END
      $$;
    `);

    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='sender_id') THEN
          ALTER TABLE notifications ADD COLUMN sender_id INTEGER REFERENCES users(id) ON DELETE CASCADE;
        END IF;
      END
      $$;
    `);

    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='type') THEN
          ALTER TABLE notifications ADD COLUMN type VARCHAR(20) NOT NULL DEFAULT 'like';
        END IF;
      END
      $$;
    `);

    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='post_id') THEN
          ALTER TABLE notifications ADD COLUMN post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE;
        END IF;
      END
      $$;
    `);

    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='is_read') THEN
          ALTER TABLE notifications ADD COLUMN is_read BOOLEAN DEFAULT FALSE;
        END IF;
      END
      $$;
    `);

    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='created_at') THEN
          ALTER TABLE notifications ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
        END IF;
      END
      $$;
    `);

    // Inspect the actual columns of the 'posts' and 'notifications' table for diagnosis
    try {
      const columnsRes = await pool.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'posts'
      `);
      console.log('Actual columns in "posts" table:', columnsRes.rows);
    } catch (inspectErr) {
      console.warn('Failed to inspect posts table columns:', inspectErr);
    }

    // --- Live Streaming Tables Extension ---
    console.log('Setting up Live Streaming database tables...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS live_streams (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        status VARCHAR(20) DEFAULT 'active', -- 'active' or 'ended'
        viewer_count INTEGER DEFAULT 0,
        stream_key VARCHAR(100),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        ended_at TIMESTAMP WITH TIME ZONE
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS live_comments (
        id SERIAL PRIMARY KEY,
        live_stream_id INTEGER REFERENCES live_streams(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS live_reactions (
        id SERIAL PRIMARY KEY,
        live_stream_id INTEGER REFERENCES live_streams(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        reaction_type VARCHAR(50) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('Live Streaming database tables setup completed successfully.');

    // --- AI System Tables Extension ---
    console.log('Setting up AI System database tables...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_ai_profiles (
        user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        interest_profile JSONB DEFAULT '{}',
        creator_score INTEGER DEFAULT 50,
        trust_score INTEGER DEFAULT 100,
        community_score INTEGER DEFAULT 100,
        posting_habits JSONB DEFAULT '{}',
        privacy_config JSONB DEFAULT '{}',
        last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS post_ai_features (
        post_id INTEGER PRIMARY KEY REFERENCES posts(id) ON DELETE CASCADE,
        category VARCHAR(50) DEFAULT 'General',
        hashtags TEXT[] DEFAULT '{}',
        quality_score INTEGER DEFAULT 80,
        safety_status VARCHAR(20) DEFAULT 'safe',
        safety_reason TEXT,
        last_analyzed TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS reel_ai_features (
        reel_id INTEGER PRIMARY KEY REFERENCES reels(id) ON DELETE CASCADE,
        category VARCHAR(50) DEFAULT 'General',
        subtitles JSONB DEFAULT '[]',
        translated_subtitles JSONB DEFAULT '[]',
        important_moments JSONB DEFAULT '[]',
        quality_analysis JSONB DEFAULT '{}',
        duplicate_hash VARCHAR(255),
        last_analyzed TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('AI System database tables setup completed successfully.');

    console.log('Database migrations and table initializations completed successfully.');
  } catch (err) {
    console.error('Database migration failed:', err);
    // Don't throw error here to allow server to start, 
    // but the app might fail later if columns are missing.
  }
}

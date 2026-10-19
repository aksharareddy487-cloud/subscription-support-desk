import session from 'express-session';
import MongoStore from 'connect-mongo';

export const configureSession = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  const cookieSecure = process.env.COOKIE_SECURE === 'true' || isProduction;
  const maxAge = Number(process.env.SESSION_MAX_AGE_MS) || 1000 * 60 * 60 * 24; // 24 hours

  return session({
    secret: process.env.SESSION_SECRET || 'fallback_default_session_secret_replace_in_prod',
    resave: false,
    saveUninitialized: false,
    name: 'support_desk.sid',
    cookie: {
      httpOnly: true, // Prevents client-side JS from reading cookie
      secure: cookieSecure, // Requires HTTPS in production
      sameSite: isProduction ? 'strict' : 'lax', // CSRF protection
      maxAge: maxAge, // Expiring session
    },
    store: MongoStore.create({
      mongoUrl: process.env.MONGODB_URI,
      collectionName: 'sessions',
      ttl: maxAge / 1000,
      autoRemove: 'native',
      touchAfter: 24 * 3600, // Lazy session update every 24 hours unless modified
    }),
  });
};

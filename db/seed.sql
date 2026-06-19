-- Sample bilingual content
insert into pages (slug, locale, meta_title, meta_description, h1, body, status) values
  ('home', 'en', 'SEO Agent — Home', 'Manage your site content and meta tags in one place.', 'Welcome to SEO Agent', 'This page content is served from the Neon database.', 'published'),
  ('home', 'ru', 'SEO Agent — Главная', 'Управляйте контентом сайта и мета-тегами в одном месте.', 'Добро пожаловать в SEO Agent', 'Контент этой страницы отдаётся из базы Neon.', 'published')
on conflict (slug, locale) do nothing;

-- Seed 15 mock jobs
INSERT INTO jobs (id, title, company, location, remote, description, requirements, salary_min, salary_max) VALUES
('job-1', 'Senior Frontend Engineer', 'TechCorp', 'San Francisco, CA', 1,
  'Build amazing user interfaces with React and TypeScript. Work with a talented team on cutting-edge products. We offer competitive salary, equity, and full benefits.',
  '["5+ years experience", "React", "TypeScript", "Tailwind CSS", "Leadership skills"]',
  140000, 180000),

('job-2', 'Full Stack Developer', 'StartupXYZ', 'Remote', 1,
  'Join our fast-growing startup. Build features end-to-end from database to UI. We move fast and ship daily.',
  '["3+ years experience", "Node.js", "React", "PostgreSQL", "API design"]',
  120000, 160000),

('job-3', 'Backend Engineer', 'DataCo', 'New York, NY', 0,
  'Build scalable APIs and data pipelines. Work with large-scale distributed systems processing millions of events per day.',
  '["Python", "Go", "Kubernetes", "AWS", "Microservices"]',
  130000, 170000),

('job-4', 'DevOps Engineer', 'CloudSoft', 'Austin, TX', 1,
  'Manage infrastructure and CI/CD pipelines. Cloudflare Workers and Terraform experience highly valued.',
  '["Docker", "Kubernetes", "Terraform", "CI/CD", "Monitoring"]',
  125000, 165000),

('job-5', 'Product Designer', 'DesignHub', 'Los Angeles, CA', 1,
  'Design beautiful, user-centered products. Collaborate closely with engineers and product managers to ship delightful experiences.',
  '["Figma", "UI/UX", "User Research", "Prototyping", "Design systems"]',
  110000, 150000),

('job-6', 'Mobile Engineer (React Native)', 'AppWorks', 'Remote', 1,
  'Build cross-platform mobile apps used by millions. Experience with iOS and Android deployment required.',
  '["React Native", "TypeScript", "Mobile UI", "App Store deployment"]',
  115000, 155000),

('job-7', 'Data Engineer', 'Analytics Inc', 'Seattle, WA', 0,
  'Build data pipelines and warehouses. Experience with Snowflake, dbt, and Airflow preferred.',
  '["SQL", "Python", "dbt", "Airflow", "Data modeling"]',
  135000, 175000),

('job-8', 'Security Engineer', 'SecureTech', 'Boston, MA', 1,
  'Implement security best practices across our infrastructure. Conduct security audits and vulnerability assessments.',
  '["Security", "Penetration testing", "OWASP", "Cloud security"]',
  140000, 185000),

('job-9', 'Machine Learning Engineer', 'AI Labs', 'Remote', 1,
  'Train and deploy ML models at scale. Experience with PyTorch and production ML pipelines required.',
  '["Python", "PyTorch", "ML Ops", "Model deployment", "Statistics"]',
  145000, 190000),

('job-10', 'Frontend Engineer', 'E-commerce Co', 'Chicago, IL', 0,
  'Build lightning-fast e-commerce experiences. Performance optimization and A/B testing experience valued.',
  '["React", "Next.js", "Performance optimization", "E-commerce"]',
  110000, 145000),

('job-11', 'Platform Engineer', 'InfraCo', 'Denver, CO', 1,
  'Build internal developer platforms and tools. Make engineering teams more productive.',
  '["Kubernetes", "Go", "Platform engineering", "Developer tools"]',
  130000, 170000),

('job-12', 'QA Engineer', 'QualityFirst', 'Portland, OR', 1,
  'Build automated test suites. Work closely with developers to ensure quality releases.',
  '["Playwright", "Test automation", "CI/CD", "Quality processes"]',
  95000, 130000),

('job-13', 'Solutions Architect', 'EnterpriseTech', 'Atlanta, GA', 0,
  'Design technical solutions for enterprise clients. Strong communication and system design skills required.',
  '["System design", "AWS", "Enterprise architecture", "Client facing"]',
  150000, 195000),

('job-14', 'API Developer', 'APIFirst', 'Remote', 1,
  'Design and build RESTful and GraphQL APIs. Focus on developer experience and documentation.',
  '["Node.js", "GraphQL", "API design", "Documentation", "OpenAPI"]',
  115000, 150000),

('job-15', 'Engineering Manager', 'GrowthCo', 'San Diego, CA', 1,
  'Lead a team of 5-8 engineers. Balance technical excellence with team development and delivery.',
  '["Leadership", "Team management", "Technical background", "Agile"]',
  160000, 210000);
